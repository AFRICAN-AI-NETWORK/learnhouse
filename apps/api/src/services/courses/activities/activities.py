import logging
import sys
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlmodel import Session, select

from src.db.courses.activities import (
    Activity,
    ActivityCreate,
    ActivityRead,
    ActivityTypeEnum,
    ActivityUpdate,
)
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.organization_config import OrganizationConfig
from src.db.organizations import Organization
from src.db.users import AnonymousUser, PublicUser
from src.security.courses_security import courses_rbac_check_for_activities
from src.services.integrations.youtube import create_automated_youtube_session
from src.services.payments import payments_access

logger = logging.getLogger(__name__)

print("[ACTIVITIES_SERVICE] Module loaded!", file=sys.stderr, flush=True)


####################################################
# CRUD
####################################################


async def create_activity(
    request: Request,
    activity_object: ActivityCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    # CHeck if org exists
    statement = select(Chapter).where(Chapter.id == activity_object.chapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(
            status_code=404,
            detail="Chapter not found",
        )

    # RBAC check
    statement = select(Course).where(Course.id == chapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "create", db_session
    )

    # Create Activity
    activity = Activity(**activity_object.model_dump())

    activity.activity_uuid = str(f"activity_{uuid4()}")
    activity.creation_date = str(datetime.now(UTC))
    activity.update_date = str(datetime.now(UTC))
    activity.org_id = chapter.org_id
    activity.course_id = chapter.course_id

    # Insert Activity in DB
    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)

    # Trigger Automated Replay (YouTube) if it's a Live Session
    if activity.activity_type == ActivityTypeEnum.TYPE_LIVE_SESSION:
        try:
            # Fetch Org Config
            statement = select(OrganizationConfig).where(
                OrganizationConfig.org_id == activity.org_id
            )
            org_config_obj = db_session.exec(statement).first()

            if org_config_obj and org_config_obj.config:
                # Expecting config['integrations']['youtube'] to contain a JSON string of credentials
                yt_config = org_config_obj.config.get("integrations", {}).get("youtube")

                if yt_config:
                    # Create the broadcast
                    yt_data = await create_automated_youtube_session(
                        org_credentials=yt_config,
                        title=f"{course.name} - {activity.name}",
                        start_time=activity.details.get("start_time")
                        if activity.details
                        else str(datetime.now(UTC)),
                    )

                    # Update activity details with the stream info
                    details = activity.details or {}
                    details.update(
                        {
                            "recording_url": yt_data["watch_url"],
                            "youtube_video_id": yt_data["video_id"],
                            "youtube_stream_key": yt_data["stream_key"],
                            "auto_stream_enabled": True,
                        }
                    )
                    activity.details = details
                    db_session.add(activity)
                    db_session.commit()
                    db_session.refresh(activity)
        except Exception as e:  # noqa: BLE001
            print(
                f"[ACTIVITIES_SERVICE] YouTube Automation Failed: {e!s}",
                file=sys.stderr,
            )
            # We don't fail the whole creation if YouTube fails, just log it.

    # Find the last activity in the Chapter and add it to the list
    statement = (
        select(ChapterActivity)
        .where(ChapterActivity.chapter_id == activity_object.chapter_id)
        .order_by(ChapterActivity.order)  # type: ignore
    )
    chapter_activities = db_session.exec(statement).all()

    last_order = chapter_activities[-1].order if chapter_activities else 0
    to_be_used_order = last_order + 1

    # Add activity to chapter
    activity_chapter = ChapterActivity(
        chapter_id=activity_object.chapter_id,
        activity_id=activity.id if activity.id else 0,
        course_id=chapter.course_id,
        org_id=chapter.org_id,
        creation_date=str(datetime.now(UTC)),
        update_date=str(datetime.now(UTC)),
        order=to_be_used_order,
    )

    # Insert ChapterActivity link in DB
    db_session.add(activity_chapter)
    db_session.commit()
    db_session.refresh(activity_chapter)

    return ActivityRead.model_validate(activity)


async def get_activity(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser,
    db_session: Session,
):
    # Optimize by joining Activity with Course and Organization via explicit ON conditions
    statement = (
        select(Activity, Course, Organization)
        .join(Course, Activity.course_id == Course.id)
        .join(Organization, Course.org_id == Organization.id)
        .where(Activity.activity_uuid == activity_uuid)
    )
    result = db_session.exec(statement).first()

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    activity, course, organization = result

    # RBAC check
    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Paid access check
    has_paid_access = await payments_access.check_activity_paid_access(
        request=request,
        activity_id=activity.id if activity.id else 0,
        user=current_user,
        db_session=db_session,
    )

    activity_read = ActivityRead.model_validate(activity)
    activity_read.course_uuid = course.course_uuid
    activity_read.org_slug = organization.slug
    activity_read.content = (
        activity_read.content if has_paid_access else {"paid_access": False}
    )

    return activity_read


async def get_activityby_id(
    request: Request,
    activity_id: str,
    current_user: PublicUser,
    db_session: Session,
):
    # Optimize by joining Activity with Course and Organization via explicit ON conditions
    statement = (
        select(Activity, Course, Organization)
        .join(Course, Activity.course_id == Course.id)
        .join(Organization, Course.org_id == Organization.id)
        .where(Activity.id == activity_id)
    )
    result = db_session.exec(statement).first()

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    activity, course, organization = result

    # RBAC check
    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "read", db_session
    )

    activity_read = ActivityRead.model_validate(activity)
    activity_read.course_uuid = course.course_uuid
    activity_read.org_slug = organization.slug
    return activity_read


async def update_activity(
    request: Request,
    activity_object: ActivityUpdate,
    activity_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # RBAC check
    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "update", db_session
    )

    was_published = activity.published

    # Update only the fields that were passed in
    for var, value in vars(activity_object).items():
        if value is not None:
            setattr(activity, var, value)

    db_session.add(activity)
    db_session.commit()
    db_session.refresh(activity)

    # Notify enrolled students the first time an activity becomes published.
    # Fanned out as a background job (never inline) since course enrollment
    # can be large — see src.services.notifications.fanout_jobs. This is a
    # side effect of publishing, not part of it: a scheduling failure must
    # never turn a successful publish into an error for the instructor.
    if not was_published and activity.published:
        try:
            from src.services.notifications.fanout_jobs import (
                sync_fanout_activity_added,
            )
            from src.services.notifications.scheduling import enqueue_job

            enqueue_job(
                f"activity_notif_{activity.id}",
                sync_fanout_activity_added,
                [activity.id],
            )
        except Exception as e:  # noqa: BLE001
            logger.warning(
                "Failed to schedule activity_added fan-out for activity %s: %s",
                activity.id,
                e,
            )

    activity = ActivityRead.model_validate(activity)

    return activity


async def delete_activity(
    request: Request,
    activity_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity not found",
        )

    # RBAC check
    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Delete activity from chapter
    statement = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity.id
    )
    activity_chapter = db_session.exec(statement).first()

    if not activity_chapter:
        raise HTTPException(
            status_code=404,
            detail="Activity not found in chapter",
        )

    db_session.delete(activity_chapter)
    db_session.delete(activity)
    db_session.commit()

    return {"detail": "Activity deleted"}


####################################################
# Misc
####################################################


async def get_activities(
    request: Request,
    coursechapter_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[ActivityRead]:
    # Get activities that are published and belong to the chapter
    statement = (
        select(Activity)
        .join(ChapterActivity)
        .where(
            ChapterActivity.chapter_id == coursechapter_id, Activity.published == True
        )
    )
    activities = db_session.exec(statement).all()

    if not activities:
        raise HTTPException(
            status_code=404,
            detail="No published activities found",
        )

    # RBAC check
    statement = select(Chapter).where(Chapter.id == coursechapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(
            status_code=404,
            detail="Chapter not found",
        )

    statement = select(Course).where(Course.id == chapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found",
        )

    await courses_rbac_check_for_activities(
        request, course.course_uuid, current_user, "read", db_session
    )

    activities = [ActivityRead.model_validate(activity) for activity in activities]

    return activities
