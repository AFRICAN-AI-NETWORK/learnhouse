import json
import logging
from datetime import UTC, datetime
from io import BytesIO
from uuid import uuid4

from fastapi import HTTPException, Request, UploadFile, status
from pypdf import PdfReader
from sqlmodel import Session, select

from config.config import get_learnhouse_config
from src.db.courses.activities import (
    Activity,
    ActivityRead,
    ActivitySubTypeEnum,
    ActivityTypeEnum,
)
from src.db.courses.assignments import (
    Assignment,
    AssignmentTask,
    AssignmentTaskTypeEnum,
    GradingTypeEnum,
)
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


SYSTEM_PROMPT = """You are an expert educational content formatter for the African AI Network Academy.
Your job is to take raw text extracted from a document and structure it into a highly engaging, interactive learning journey.
Break the content into distinct, sequential learning blocks that guide the student through the material.

Rules:
1. Do not output a single wall of text. Break it into the specific logical block types listed below.
2. Preserve the core meaning and facts, but feel free to rewrite the text to be more engaging, clear, and structured.
3. Every step MUST have a 'type', 'label', 'title', and specific content fields depending on the type.
4. Output ONLY a valid JSON array of objects. No markdown formatting, no code fences (do not wrap in ```json), no explanation.

Supported Block Types and JSON Schema:
- introduction: {"type": "introduction", "label": "Start Here", "title": "...", "content": "..."}
- learning_objectives: {"type": "learning_objectives", "label": "Learning Objectives", "title": "...", "objectives": ["..."]}
- concept: {"type": "concept", "label": "Understand", "title": "...", "subsections": [{"heading": "...", "content": "..."}]}
- analogy: {"type": "analogy", "label": "Think About It", "title": "...", "content": "...", "example": "..."}
- real_world_examples: {"type": "real_world_examples", "label": "Real-World Examples", "title": "...", "examples": [{"name": "...", "description": "..."}]}
- summary: {"type": "summary", "label": "Quick Recap", "title": "...", "items": ["..."]}

Analyze the text and map it to these block types to create a comprehensive lesson. You must always start with an 'introduction' and end with a 'summary'."""


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

    # Validate PDF or JSON file
    if not pdf_file:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Smart Article: No file provided",
        )

    filename = (pdf_file.filename or "").lower()
    content_type = (pdf_file.content_type or "").lower()
    is_json_file = filename.endswith(".json") or content_type in ["application/json", "text/plain"]
    is_pdf_file = filename.endswith(".pdf") or content_type in ["application/pdf"]

    if not (is_json_file or is_pdf_file):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Smart Article: Wrong file format, expected PDF or JSON",
        )

    # Load config for AI provider
    config = get_learnhouse_config()

    # Read bytes
    file_bytes = await pdf_file.read()

    # Step 1: Extract text
    if is_json_file:
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1")
    else:
        raw_text = extract_text_from_pdf(file_bytes)

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Smart Article: Could not extract any text from the file. If PDF, it may be image-based.",
        )

    # Step 2: Check if content is already structured JSON (Option B: direct JSON)
    steps = None
    stripped = raw_text.strip()
    if (stripped.startswith("[") and stripped.endswith("]")) or (
        stripped.startswith("{") and stripped.endswith("}")
    ):
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
                steps = parsed
            elif isinstance(parsed, dict) and "steps" in parsed and isinstance(parsed["steps"], list):
                steps = parsed["steps"]
        except (json.JSONDecodeError, ValueError, TypeError):
            steps = None

    # If not valid JSON, chunk with AI (Option A: plain text PDF)
    if not steps:
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
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
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
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
        order=next_order,
    )

    db_session.add(activity_chapter)
    db_session.commit()
    db_session.refresh(activity_chapter)

    # Automatically create/sync linked Assignment if interactive steps exist
    try:
        sync_smart_article_assignment(
            activity=activity,
            steps=steps,
            chapter_id=int(chapter_id),
            db_session=db_session,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Failed to sync smart article assignment on creation for activity %s: %s",
            activity.id,
            e,
        )

    return ActivityRead.model_validate(activity)


INTERACTIVE_STEP_TYPES = {
    "CODE_EXERCISE",
    "FRONTEND_EXERCISE",
    "QUIZ",
    "CUSTOM_ANSWER",
    "FILE_SUBMISSION",
}


def sync_smart_article_assignment(
    activity: Activity,
    steps: list[dict] | None = None,
    chapter_id: int | None = None,
    db_session: Session | None = None,
) -> Assignment | None:
    """
    Synchronizes an Assignment and corresponding AssignmentTasks for a Smart Article.
    When a Smart Article contains interactive steps (CODE_EXERCISE, FRONTEND_EXERCISE,
    QUIZ, CUSTOM_ANSWER, FILE_SUBMISSION), this ensures:
    1. An Assignment record exists linked to the Activity (activity_id = activity.id).
    2. An AssignmentTask record exists for each interactive step.
    3. The activity seamlessly appears in the Instructor Dashboard (/dash/assignments).
    4. Student views can grade and submit exercises.
    """
    if db_session is None:
        return None

    if steps is None:
        if isinstance(activity.content, dict):
            steps = activity.content.get("steps") or []
        else:
            steps = []

    # Find interactive steps
    interactive_steps: list[tuple[int, dict]] = []
    for idx, step in enumerate(steps):
        if not isinstance(step, dict):
            continue
        step_type = str(step.get("type", "")).upper()
        if step_type in INTERACTIVE_STEP_TYPES:
            interactive_steps.append((idx, step))

    # Resolve chapter_id if not provided
    if not chapter_id:
        statement = select(ChapterActivity).where(
            ChapterActivity.activity_id == activity.id
        )
        ca = db_session.exec(statement).first()
        if ca:
            chapter_id = ca.chapter_id
        else:
            chapter_id = 0

    # Query existing Assignment
    statement = select(Assignment).where(Assignment.activity_id == activity.id)
    assignment = db_session.exec(statement).first()

    # If no interactive steps, return existing assignment if any
    if not interactive_steps:
        return assignment

    now_str = str(datetime.now(UTC))

    if not assignment:
        assignment = Assignment(
            title=activity.name,
            description=f"Interactive exercises for {activity.name}",
            due_date="",
            published=activity.published,
            grading_type=GradingTypeEnum.NUMERIC,
            required_for_certificate=False,
            org_id=activity.org_id,
            course_id=activity.course_id or 0,
            chapter_id=chapter_id or 0,
            activity_id=activity.id,  # type: ignore
            assignment_uuid=f"assignment_{uuid4()}",
            creation_date=now_str,
            update_date=now_str,
        )
        db_session.add(assignment)
        db_session.commit()
        db_session.refresh(assignment)
    else:
        assignment.title = activity.name
        assignment.published = activity.published
        if chapter_id:
            assignment.chapter_id = chapter_id
        assignment.update_date = now_str
        db_session.add(assignment)
        db_session.commit()
        db_session.refresh(assignment)

    # Fetch existing tasks for this assignment
    task_statement = (
        select(AssignmentTask)
        .where(AssignmentTask.assignment_id == assignment.id)
        .order_by(AssignmentTask.id)  # type: ignore
    )
    existing_tasks = list(db_session.exec(task_statement).all())

    # Build tasks to match interactive_steps
    for i, (orig_idx, step) in enumerate(interactive_steps):
        step_type = str(step.get("type", "")).upper()
        task_title = step.get("title") or f"Exercise {i + 1}"
        task_description = (
            step.get("instructions")
            or step.get("content")
            or f"Task for step {orig_idx + 1}"
        )
        task_hint = step.get("hint") or ""

        if step_type == "CODE_EXERCISE":
            assignment_type = AssignmentTaskTypeEnum.CODE_EDITOR
            ex_uuid = step.get("exerciseUUID") or f"code_ex_{orig_idx}"
            contents = {
                "exercises": [
                    {
                        "exerciseUUID": ex_uuid,
                        "title": task_title,
                        "language": step.get("language", "javascript"),
                        "starterCode": step.get("startingCode") or step.get("starterCode", ""),
                        "solutionCode": step.get("solutionCode", ""),
                        "testCases": step.get("testCases", []),
                        "stepType": "CODE_EXERCISE",
                    }
                ]
            }
        elif step_type == "FRONTEND_EXERCISE":
            assignment_type = AssignmentTaskTypeEnum.CODE_EDITOR
            ex_uuid = step.get("exerciseUUID") or f"fe_ex_{orig_idx}"
            files = step.get("files") or {}
            starter_code = (
                files.get("/App.js")
                or files.get("/index.html")
                or step.get("starterCode", "")
            )
            contents = {
                "exercises": [
                    {
                        "exerciseUUID": ex_uuid,
                        "title": task_title,
                        "language": "javascript",
                        "template": step.get("template", "react"),
                        "files": files,
                        "tests": step.get("tests", []),
                        "passingScore": step.get("passingScore", 100),
                        "starterCode": starter_code,
                        "solutionCode": step.get("solutionCode", ""),
                        "stepType": "FRONTEND_EXERCISE",
                    }
                ]
            }
        elif step_type == "QUIZ":
            assignment_type = AssignmentTaskTypeEnum.QUIZ
            contents = {
                "questions": step.get("questions") or []
            }
        elif step_type == "CUSTOM_ANSWER":
            assignment_type = AssignmentTaskTypeEnum.FORM
            contents = {
                "questions": step.get("questions") or [
                    {
                        "prompt": step.get("prompt") or step.get("content", ""),
                        "expected_answers": step.get("expected_answers") or [],
                    }
                ]
            }
        elif step_type == "FILE_SUBMISSION":
            assignment_type = AssignmentTaskTypeEnum.FILE_SUBMISSION
            contents = step.get("contents") or {}
        else:
            assignment_type = AssignmentTaskTypeEnum.OTHER
            contents = {}

        if i < len(existing_tasks):
            # Update existing task
            task = existing_tasks[i]
            task.title = task_title
            task.description = task_description
            task.hint = task_hint
            task.assignment_type = assignment_type
            task.contents = contents
            task.max_grade_value = 100
            task.update_date = now_str
            db_session.add(task)
        else:
            # Create new task
            task = AssignmentTask(
                title=task_title,
                description=task_description,
                hint=task_hint,
                reference_file=None,
                assignment_type=assignment_type,
                contents=contents,
                max_grade_value=100,
                assignment_task_uuid=f"assignmenttask_{uuid4()}",
                creation_date=now_str,
                update_date=now_str,
                assignment_id=assignment.id,  # type: ignore
                org_id=assignment.org_id,
                course_id=assignment.course_id,
                chapter_id=assignment.chapter_id,
                activity_id=activity.id,  # type: ignore
            )
            db_session.add(task)

    # Delete any excess tasks if user removed interactive steps
    if len(existing_tasks) > len(interactive_steps):
        for excess_task in existing_tasks[len(interactive_steps):]:
            db_session.delete(excess_task)

    db_session.commit()
    db_session.refresh(assignment)
    return assignment

