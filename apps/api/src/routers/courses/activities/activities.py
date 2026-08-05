
from fastapi import APIRouter, Depends, Form, Request, UploadFile

from src.core.events.database import get_db_session
from src.db.courses.activities import ActivityCreate, ActivityRead, ActivityUpdate
from src.db.users import PublicUser
from src.security.auth import get_current_user
from src.services.courses.activities.activities import (
    create_activity,
    delete_activity,
    get_activities,
    get_activity,
    get_activityby_id,
    update_activity,
)
from src.services.courses.activities.pdf import create_documentpdf_activity
from src.services.courses.activities.smart_article import create_smart_article_activity
from src.services.courses.activities.video import (
    ExternalVideo,
    create_external_video_activity,
    create_video_activity,
)

router = APIRouter()


@router.post("/")
async def api_create_activity(
    request: Request,
    activity_object: ActivityCreate,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Create new activity
    """
    return await create_activity(request, activity_object, current_user, db_session)


@router.get("/{activity_uuid}")
async def api_get_activity(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Get single activity by activity_id
    """
    return await get_activity(
        request, activity_uuid, current_user=current_user, db_session=db_session
    )


@router.get("/id/{activity_id}")
async def api_get_activityby_id(
    request: Request,
    activity_id: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Get single activity by activity_id
    """
    return await get_activityby_id(
        request, activity_id, current_user=current_user, db_session=db_session
    )


@router.get("/chapter/{chapter_id}")
async def api_get_chapter_activities(
    request: Request,
    chapter_id: int,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> list[ActivityRead]:
    """
    Get Activities for a chapter
    """
    return await get_activities(request, chapter_id, current_user, db_session)


@router.put("/{activity_uuid}")
async def api_update_activity(
    request: Request,
    activity_object: ActivityUpdate,
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Update activity by activity_id
    """
    return await update_activity(
        request, activity_object, activity_uuid, current_user, db_session
    )


@router.delete("/{activity_uuid}")
async def api_delete_activity(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    Delete activity by activity_id
    """
    return await delete_activity(request, activity_uuid, current_user, db_session)


# Video activity


@router.post("/video")
async def api_create_video_activity(
    request: Request,
    name: str = Form(),
    chapter_id: str = Form(),
    details: str = Form(default="{}"),
    current_user: PublicUser = Depends(get_current_user),
    video_file: UploadFile | None = None,
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Create new activity
    """
    return await create_video_activity(
        request,
        name,
        chapter_id,
        current_user,
        db_session,
        video_file,
        details,
    )


@router.post("/external_video")
async def api_create_external_video_activity(
    request: Request,
    external_video: ExternalVideo,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Create new activity
    """
    return await create_external_video_activity(
        request, current_user, external_video, db_session
    )


@router.post("/documentpdf")
async def api_create_documentpdf_activity(
    request: Request,
    name: str = Form(),
    chapter_id: str = Form(),
    current_user: PublicUser = Depends(get_current_user),
    pdf_file: UploadFile | None = None,
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Create new activity
    """
    return await create_documentpdf_activity(
        request, name, chapter_id, current_user, db_session, pdf_file
    )


# Smart Article activity


@router.post("/smart_article")
async def api_create_smart_article_activity(
    request: Request,
    name: str = Form(),
    chapter_id: str = Form(),
    current_user: PublicUser = Depends(get_current_user),
    pdf_file: UploadFile | None = None,
    db_session=Depends(get_db_session),
) -> ActivityRead:
    """
    Create a Smart Article activity from a PDF.
    The PDF text is extracted and chunked by AI into sequential steps.
    """
    return await create_smart_article_activity(
        request, name, chapter_id, current_user, db_session, pdf_file
    )


# AI Interact endpoint (translate / ask AI)


@router.post("/ai_interact")
async def api_ai_interact(
    request: Request,
    current_user: PublicUser = Depends(get_current_user),
    db_session=Depends(get_db_session),
):
    """
    AI interaction endpoint for Smart Article features.
    Supports 'translate' and 'ask' actions.
    """
    import json
    import os

    import httpx

    from config.config import get_learnhouse_config

    body = await request.json()
    action = body.get("action")  # 'translate' or 'ask'
    text = body.get("text", "")
    title = body.get("title", "")
    language = body.get("language", "")
    question = body.get("question", "")

    config = get_learnhouse_config()
    gemini_key = os.environ.get("LEARNHOUSE_GEMINI_API_KEY")
    openai_key = config.ai_config.openai_api_key

    if action == "translate":
        # If title is provided, translate both as JSON
        if title:
            prompt = (
                f"Translate the following JSON object into {language}. "
                f"Preserve the JSON structure exactly. Return ONLY the JSON object, nothing else.\n\n"
                f'{{ "title": "{title}", "content": "{text}" }}'
            )
        else:
            prompt = f"Translate the following text to {language}. Return ONLY the translated text, nothing else.\n\n{text}"
    elif action == "ask":
        lang_instruction = f" Please respond in {language}." if language else ""
        prompt = (
            f"You are a helpful learning assistant.{lang_instruction} "
            f"The student is reading the following content:\n\n---\n{text}\n---\n\n"
            f"The student asks: {question}\n\nProvide a clear, concise, and helpful answer."
        )
    else:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400, detail="Invalid action. Use 'translate' or 'ask'."
        )

    # Try Gemini first, then OpenAI
    result_text = None

    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4000},
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                result_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:  # noqa: BLE001
            pass

    if result_text is None and openai_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=4000,
            )
            result_text = response.choices[0].message.content
        except Exception:  # noqa: BLE001
            pass

    if result_text is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=502,
            detail="AI service unavailable. Check your API keys.",
        )

    # Handle JSON parsing for combined translation
    if action == "translate" and title:
        try:
            cleaned_text = result_text.strip()
            if "```" in cleaned_text:
                # Extract content between ```json and ``` or just ```
                import re

                match = re.search(
                    r"```(?:json)?\s*(.*?)\s*```", cleaned_text, re.DOTALL
                )
                if match:
                    cleaned_text = match.group(1)

            import json

            translated_data = json.loads(cleaned_text)
            return {
                "result": translated_data.get("content", result_text),
                "title": translated_data.get("title", ""),
            }
        except Exception:  # noqa: BLE001
            return {"result": result_text, "title": ""}

    return {"result": result_text}
