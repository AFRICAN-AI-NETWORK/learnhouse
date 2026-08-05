import json
import logging
from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, Request, UploadFile, status
from pypdf import PdfReader
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.courses.activities import (Activity, ActivityRead,
                                       ActivitySubTypeEnum, ActivityTypeEnum)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.course_chapters import CourseChapter
from src.db.courses.courses import Course
from src.db.users import AnonymousUser, PublicUser
from src.security.courses_security import courses_rbac_check_for_activities

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file using pypdf."""
    reader = PdfReader(BytesIO(pdf_bytes))
    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text.strip())
    return "\n\n".join(text_parts)


SYSTEM_PROMPT = """You are an expert educational content formatter.
Your job is to take raw text extracted from a PDF document and break it into
logical, sequential "steps" (like pages in a book) that a student can read
one at a time on a screen without scrolling.

Rules:
1. Each step should contain roughly 150-300 words (enough to fill a readable card).
2. Never split a paragraph mid-sentence.
3. Give each step a short, descriptive title.
4. Preserve the original meaning and content exactly — do NOT summarize or omit information.
5. Return ONLY a valid JSON array. No markdown, no code fences, no explanation.

Output format (strict JSON):
[
  {"title": "Step title here", "content": "The actual readable text for this step..."},
  {"title": "Another step title", "content": "More text..."}
]"""


def _parse_ai_response(result_text: str, raw_text: str) -> list[dict]:
    """Parse the AI response, stripping markdown code fences if present."""
    result_text = result_text.strip()
    if result_text.startswith("```"):
        lines = result_text.split("\n")
        result_text = "\n".join(lines[1:-1])

    try:
        steps = json.loads(result_text)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI response as JSON: {result_text[:200]}")
        steps = [{"title": "Full Document", "content": raw_text[:5000]}]

    return steps


async def chunk_text_with_openai(raw_text: str, api_key: str) -> list[dict]:
    """Chunk text using OpenAI's API."""
    from openai import APIError, OpenAI, RateLimitError

    client = OpenAI(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Please chunk the following document text into steps:\n\n{raw_text[:60000]}",
                },
            ],
            temperature=0.3,
            max_tokens=16000,
        )
    except RateLimitError as e:
        logger.error(f"OpenAI rate limit: {e}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Smart Article: OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing or switch to Gemini by setting LEARNHOUSE_AI_PROVIDER=gemini.",
        )
    except APIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Smart Article: OpenAI API error — {str(e)[:200]}",
        )

    result_text = response.choices[0].message.content or "[]"
    return _parse_ai_response(result_text, raw_text)


async def chunk_text_with_gemini(raw_text: str, api_key: str) -> list[dict]:
    """Chunk text using the Gemini REST API directly (no deprecated SDK)."""
    import httpx

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": SYSTEM_PROMPT
                        + "\n\nPlease chunk the following document text into steps:\n\n"
                        + raw_text[:60000]
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 16000,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)

        if response.status_code != 200:
            error_detail = response.text[:200]
            logger.error(f"Gemini API error {response.status_code}: {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Smart Article: Gemini API error ({response.status_code}) — {error_detail}",
            )

        data = response.json()
        result_text = data["candidates"][0]["content"]["parts"][0]["text"]

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Smart Article: Gemini API error — {str(e)[:200]}",
        )

    return _parse_ai_response(result_text, raw_text)


async def chunk_text_with_ai(raw_text: str, config) -> list[dict]:
    """
    Try the preferred AI provider first. If it fails (quota/rate-limit),
    automatically fall back to the other provider.

    Priority is set by LEARNHOUSE_AI_PROVIDER (default: 'openai').
    Both keys can be set in .env for seamless fallback:
      - LEARNHOUSE_OPENAI_API_KEY
      - LEARNHOUSE_GEMINI_API_KEY
    """
    import os

    preferred = os.environ.get("LEARNHOUSE_AI_PROVIDER", "openai").lower()
    gemini_key = os.environ.get("LEARNHOUSE_GEMINI_API_KEY")
    openai_key = config.ai_config.openai_api_key

    # Build ordered list of providers to try
    providers = []
    if preferred == "gemini":
        if gemini_key:
            providers.append(("gemini", gemini_key))
        if openai_key:
            providers.append(("openai", openai_key))
    else:
        if openai_key:
            providers.append(("openai", openai_key))
        if gemini_key:
            providers.append(("gemini", gemini_key))

    if not providers:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Smart Article: No AI provider configured. Set LEARNHOUSE_OPENAI_API_KEY or LEARNHOUSE_GEMINI_API_KEY in your .env file.",
        )

    last_error = None
    for provider_name, api_key in providers:
        try:
            logger.info(f"Smart Article: Trying {provider_name}...")
            if provider_name == "openai":
                return await chunk_text_with_openai(raw_text, api_key)
            else:
                return await chunk_text_with_gemini(raw_text, api_key)
        except HTTPException as e:
            last_error = e
            if e.status_code in (429, 502):
                logger.warning(
                    f"Smart Article: {provider_name} failed ({e.detail}), trying next provider..."
                )
                continue
            raise  # Re-raise non-recoverable errors
        except Exception as e:  # noqa: BLE001
            last_error = e
            logger.warning(
                f"Smart Article: {provider_name} failed ({str(e)[:100]}), trying next provider..."
            )
            continue

    # All providers failed
    if isinstance(last_error, HTTPException):
        raise last_error
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Smart Article: All AI providers failed. Last error: {str(last_error)[:200]}",
    )


async def create_smart_article_activity(
    request: Request,
    name: str,
    chapter_id: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    pdf_file: UploadFile | None = None,
):
    """
    Create a Smart Article activity by:
    1. Receiving a PDF upload
    2. Extracting the text
    3. Sending it to OpenAI for chunking
    4. Saving the steps array to the activity content
    """

    # Get chapter
    statement = select(Chapter).where(Chapter.id == chapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Get course chapter link
    statement = select(CourseChapter).where(CourseChapter.chapter_id == chapter_id)
    coursechapter = db_session.exec(statement).first()

    if not coursechapter:
        raise HTTPException(status_code=404, detail="CourseChapter not found")

    # Get course for RBAC
    statement = select(Course).where(Course.id == coursechapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # RBAC check
    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "create", db_session
    )

    # Validate PDF
    if not pdf_file:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Smart Article: No PDF file provided",
        )

    if pdf_file.content_type not in ["application/pdf"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Smart Article: Wrong file format, expected PDF",
        )

    # Load config for AI provider
    config = get_learnhouse_config()

    # Read PDF bytes
    pdf_bytes = await pdf_file.read()

    # Step 1: Extract text
    raw_text = extract_text_from_pdf(pdf_bytes)

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Smart Article: Could not extract any text from the PDF. It may be image-based.",
        )

    # Step 2: Chunk with AI (supports OpenAI and Gemini)
    steps = await chunk_text_with_ai(raw_text, config)

    # Step 3: Create activity
    activity_uuid = f"activity_{uuid4()}"
    org_id = coursechapter.org_id

    activity = Activity(
        name=name,
        activity_type=ActivityTypeEnum.TYPE_SMART_ARTICLE,
        activity_sub_type=ActivitySubTypeEnum.SUBTYPE_SMART_ARTICLE_PDF,
        content={
            "filename": pdf_file.filename or "document.pdf",
            "activity_uuid": activity_uuid,
            "steps": steps,
            "total_steps": len(steps),
        },
        org_id=org_id if org_id else 0,
        course_id=coursechapter.course_id,
        activity_uuid=activity_uuid,
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )

    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)

    # Find the last activity order in the chapter
    statement = (
        select(ChapterActivity)
        .where(ChapterActivity.chapter_id == int(chapter_id))
        .order_by(ChapterActivity.order)  # type: ignore
    )
    chapter_activities = db_session.exec(statement).all()
    last_order = chapter_activities[-1].order if chapter_activities else 0
    next_order = last_order + 1

    # Link activity to chapter
    activity_chapter = ChapterActivity(
        chapter_id=int(chapter_id),
        activity_id=activity.id,  # type: ignore
        course_id=coursechapter.course_id,
        org_id=coursechapter.org_id,
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
        order=next_order,
    )

    db_session.add(activity_chapter)
    db_session.commit()
    db_session.refresh(activity_chapter)

    return ActivityRead.model_validate(activity)
