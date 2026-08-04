import logging
from datetime import datetime
from typing import List
from uuid import uuid4

from fastapi import HTTPException, Request, status
from sqlmodel import Session, select

from src.db.courses.activities import Activity, ActivityRead
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import (Chapter, ChapterCreate, ChapterRead,
                                     ChapterUpdate, ChapterUpdateOrder)
from src.db.courses.course_chapters import CourseChapter
from src.db.courses.courses import Course
from src.db.users import AnonymousUser, PublicUser
from src.security.courses_security import courses_rbac_check_for_chapters

logger = logging.getLogger(__name__)


####################################################
# CRUD
####################################################


async def create_chapter(
    request: Request,
    chapter_object: ChapterCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> ChapterRead:
    chapter = Chapter.model_validate(chapter_object)

    # Get COurse
    statement = select(Course).where(Course.id == chapter_object.course_id)

    course = db_session.exec(statement).one()

    # RBAC check
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "create", db_session
    )

    # complete chapter object
    chapter.course_id = chapter_object.course_id
    chapter.chapter_uuid = f"chapter_{uuid4()}"
    chapter.creation_date = str(datetime.now())
    chapter.update_date = str(datetime.now())
    chapter.org_id = course.org_id

    # Find the last chapter in the course and add it to the list
    statement = (
        select(CourseChapter)
        .where(CourseChapter.course_id == chapter.course_id)
        .order_by(CourseChapter.order)  # type: ignore
    )
    course_chapters = db_session.exec(statement).all()

    # get last chapter order
    last_order = course_chapters[-1].order if course_chapters else 0
    to_be_used_order = last_order + 1

    # Add chapter to database
    db_session.add(chapter)
    db_session.commit()
    db_session.refresh(chapter)

    chapter = ChapterRead(**chapter.model_dump(), activities=[])

    # Check if COurseChapter link exists

    statement = (
        select(CourseChapter)
        .where(CourseChapter.chapter_id == chapter.id)
        .where(CourseChapter.course_id == chapter.course_id)
        .where(CourseChapter.order == to_be_used_order)
    )
    course_chapter = db_session.exec(statement).first()

    if not course_chapter:
        # Add CourseChapter link
        course_chapter = CourseChapter(
            course_id=chapter.course_id,
            chapter_id=chapter.id,
            org_id=chapter.org_id,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
            order=to_be_used_order,
        )

        # Insert CourseChapter link in DB
        db_session.add(course_chapter)
        db_session.commit()

    return chapter


async def get_chapter(
    request: Request,
    chapter_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> ChapterRead:
    statement = select(Chapter).where(Chapter.id == chapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Chapter does not exist"
        )

    # get COurse
    statement = select(Course).where(Course.id == chapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Course does not exist"
        )

    # RBAC check
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "read", db_session
    )

    # Get activities for this chapter
    statement = (
        select(Activity)
        .join(ChapterActivity, Activity.id == ChapterActivity.activity_id)  # type: ignore
        .where(ChapterActivity.chapter_id == chapter_id)
        .distinct(Activity.id)  # type: ignore
    )

    activities = db_session.exec(statement).all()

    chapter = ChapterRead(
        **chapter.model_dump(),
        activities=[ActivityRead(**activity.model_dump()) for activity in activities],
    )

    return chapter


async def update_chapter(
    request: Request,
    chapter_object: ChapterUpdate,
    chapter_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> ChapterRead:
    statement = select(Chapter).where(Chapter.id == chapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Chapter does not exist"
        )

    # Get Course for RBAC check
    statement = select(Course).where(Course.id == chapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # RBAC check - using course_uuid so contributors are recognized
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "update", db_session
    )

    was_published = chapter.published

    # Update only the fields that were passed in
    for var, value in vars(chapter_object).items():
        if value is not None:
            setattr(chapter, var, value)

    # Publish Validation
    if chapter.published:
        statement = (
            select(Activity.points)
            .join(ChapterActivity, ChapterActivity.activity_id == Activity.id)
            .where(ChapterActivity.chapter_id == chapter.id)
        )
        activity_points = db_session.exec(statement).all()
        total_points = sum(activity_points)
        if abs(total_points - 100) > 0.000001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total points for activities in a module must equal 100. Current total: {total_points}",
            )

    chapter.update_date = str(datetime.now())

    db_session.commit()
    db_session.refresh(chapter)

    # Notify enrolled students the first time a chapter becomes published.
    # Fanned out as a background job (never inline) since course enrollment
    # can be large — see src.services.notifications.fanout_jobs. This is a
    # side effect of publishing, not part of it: a scheduling failure must
    # never turn a successful publish into an error for the instructor.
    if not was_published and chapter.published:
        try:
            from src.services.notifications.fanout_jobs import \
                sync_fanout_chapter_added
            from src.services.notifications.scheduling import enqueue_job

            enqueue_job(
                f"chapter_notif_{chapter.id}", sync_fanout_chapter_added, [chapter.id]
            )
        except Exception as e:
            logger.warning(
                "Failed to schedule chapter_added fan-out for chapter %s: %s",
                chapter.id,
                e,
            )

    if chapter:
        chapter = await get_chapter(
            request,
            chapter.id,
            current_user,
            db_session,  # type: ignore
        )

    return chapter


async def delete_chapter(
    request: Request,
    chapter_id: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
):
    statement = select(Chapter).where(Chapter.id == chapter_id)
    chapter = db_session.exec(statement).first()

    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Chapter does not exist"
        )

    # Get Course for RBAC check
    statement = select(Course).where(Course.id == chapter.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # RBAC check - using course_uuid so contributors are recognized
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "delete", db_session
    )

    # Remove all linked chapter activities
    statement = select(ChapterActivity).where(ChapterActivity.chapter_id == chapter.id)
    chapter_activities = db_session.exec(statement).all()

    for chapter_activity in chapter_activities:
        db_session.delete(chapter_activity)

    # Delete the chapter
    db_session.delete(chapter)
    db_session.commit()

    return {"detail": "chapter deleted"}


async def get_course_chapters(
    request: Request,
    course_id: int,
    db_session: Session,
    current_user: PublicUser | AnonymousUser,
    with_unpublished_activities: bool = False,
    page: int = 1,
    limit: int = 10,
) -> List[ChapterRead]:
    statement = select(Course).where(Course.id == course_id)
    course = db_session.exec(statement).first()

    statement = (
        select(Chapter)
        .join(CourseChapter, Chapter.id == CourseChapter.chapter_id)  # type: ignore
        .where(CourseChapter.course_id == course_id)
        .where(Chapter.course_id == course_id)
        .order_by(CourseChapter.order)  # type: ignore
        .group_by(Chapter.id, CourseChapter.order)  # type: ignore
    )
    chapters = db_session.exec(statement).all()

    chapters = [
        ChapterRead(**chapter.model_dump(), activities=[]) for chapter in chapters
    ]

    # RBAC check
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "read", db_session
    )  # type: ignore

    # Get activities for each chapter
    for chapter in chapters:
        statement = (
            select(ChapterActivity)
            .where(ChapterActivity.chapter_id == chapter.id)
            .order_by(ChapterActivity.order)  # type: ignore
            .distinct(ChapterActivity.id, ChapterActivity.order)  # type: ignore
        )
        chapter_activities = db_session.exec(statement).all()

        for chapter_activity in chapter_activities:
            statement = (
                select(Activity)
                .where(
                    Activity.id == chapter_activity.activity_id,
                    with_unpublished_activities or Activity.published == True,
                )
                .distinct(Activity.id)  # type: ignore
            )
            activity = db_session.exec(statement).first()

            if activity:
                chapter.activities.append(ActivityRead(**activity.model_dump()))

    # Determine if user is editor (admin/maintainer/instructor)
    is_editor = False
    if current_user and current_user.id != 0:
        try:
            from src.security.courses_security import courses_rbac_check

            is_editor = await courses_rbac_check(
                request, course.course_uuid, current_user, "update", db_session
            )
        except Exception:
            is_editor = False

    # Get completed activity ids if user is enrolled
    completed_activity_ids = set()
    has_trail_run = False
    if not is_editor and current_user and current_user.id != 0:
        from src.db.trail_runs import TrailRun
        from src.db.trail_steps import TrailStep

        # Get trail run
        trail_run = db_session.exec(
            select(TrailRun).where(
                TrailRun.course_id == course.id, TrailRun.user_id == current_user.id
            )
        ).first()
        if trail_run:
            has_trail_run = True
            completed_steps = db_session.exec(
                select(TrailStep.activity_id).where(
                    TrailStep.trailrun_id == trail_run.id, TrailStep.complete == True
                )
            ).all()
            completed_activity_ids = set(completed_steps)

    # Compute locking state sequentially
    all_previous_completed = True
    for i, chapter in enumerate(chapters):
        if is_editor:
            chapter.is_locked = False
            for activity in chapter.activities:
                activity.is_locked = False
        else:
            # Chapter N is locked if not all previous chapters' activities are completed
            chapter.is_locked = not all_previous_completed

            for activity in chapter.activities:
                # Activity is locked if we haven't completed all previous activities
                activity.is_locked = not all_previous_completed

                # If they don't have a trail run, only the very first activity of the course is unlocked
                if not has_trail_run:
                    if i == 0 and activity.id == chapter.activities[0].id:
                        activity.is_locked = False

                # Update all_previous_completed for the NEXT activity
                is_completed = activity.id in completed_activity_ids
                all_previous_completed = all_previous_completed and is_completed

    return chapters


# Important Note : this is legacy code that has been used because
# the frontend is still not adapted for the new data structure, this implementation is absolutely not the best one
# and should not be used for future features
async def DEPRECEATED_get_course_chapters(
    request: Request,
    course_uuid: str,
    current_user: PublicUser,
    db_session: Session,
):
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Course does not exist"
        )

    # RBAC check
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "read", db_session
    )

    chapters_in_db = await get_course_chapters(
        request, course.id, db_session, current_user
    )  # type: ignore

    # activities

    # chapters
    chapters = {}

    for chapter in chapters_in_db:
        chapter_activityIds = []

        for activity in chapter.activities:
            print("test", activity)
            chapter_activityIds.append(activity.activity_uuid)

        chapters[chapter.chapter_uuid] = {
            "uuid": chapter.chapter_uuid,
            "id": chapter.id,
            "name": chapter.name,
            "activityIds": chapter_activityIds,
        }

    # activities
    activities_list = {}
    statement = (
        select(Activity)
        .join(ChapterActivity, ChapterActivity.activity_id == Activity.id)  # type: ignore
        .where(ChapterActivity.activity_id == Activity.id)
        .group_by(Activity.id)  # type: ignore
    )
    activities_in_db = db_session.exec(statement).all()

    for activity in activities_in_db:
        activities_list[activity.activity_uuid] = {
            "uuid": activity.activity_uuid,
            "id": activity.id,
            "name": activity.name,
            "type": activity.activity_type,
            "content": activity.content,
        }

    # get chapter order
    statement = (
        select(Chapter)
        .join(CourseChapter, CourseChapter.chapter_id == Chapter.id)  # type: ignore
        .where(CourseChapter.chapter_id == Chapter.id)
        .group_by(Chapter.id, CourseChapter.order)  # type: ignore
        .order_by(CourseChapter.order)  # type: ignore
    )
    chapters_in_db = db_session.exec(statement).all()

    chapterOrder = []

    for chapter in chapters_in_db:
        chapterOrder.append(chapter.chapter_uuid)

    final = {
        "chapters": chapters,
        "chapterOrder": chapterOrder,
        "activities": activities_list,
    }

    return final


async def reorder_chapters_and_activities(
    request: Request,
    course_uuid: str,
    chapters_order: ChapterUpdateOrder,
    current_user: PublicUser,
    db_session: Session,
):
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Course does not exist"
        )

    # RBAC check
    await courses_rbac_check_for_chapters(
        request, course.course_uuid, current_user, "update", db_session
    )

    ###########
    # Chapters
    ###########

    # Get all existing course chapters
    statement = select(CourseChapter).where(
        CourseChapter.course_id == course.id, CourseChapter.org_id == course.org_id
    )
    existing_course_chapters = db_session.exec(statement).all()

    # Create a map of existing chapters for faster lookup
    existing_chapter_map = {cc.chapter_id: cc for cc in existing_course_chapters}

    # Update or create course chapters based on new order
    for index, chapter_order in enumerate(chapters_order.chapter_order_by_ids):
        if chapter_order.chapter_id in existing_chapter_map:
            # Update existing chapter order
            course_chapter = existing_chapter_map[chapter_order.chapter_id]
            course_chapter.order = index
            db_session.add(course_chapter)
        else:
            # Create new course chapter
            course_chapter = CourseChapter(
                chapter_id=chapter_order.chapter_id,
                course_id=course.id,  # type: ignore
                org_id=course.org_id,
                creation_date=str(datetime.now()),
                update_date=str(datetime.now()),
                order=index,
            )
            db_session.add(course_chapter)

        db_session.commit()

    # Remove chapters that are no longer in the order
    chapter_ids_to_keep = {co.chapter_id for co in chapters_order.chapter_order_by_ids}
    for cc in existing_course_chapters:
        if cc.chapter_id not in chapter_ids_to_keep:
            db_session.delete(cc)
    db_session.commit()

    ###########
    # Activities
    ###########

    # Get all existing chapter activities
    statement = select(ChapterActivity).where(
        ChapterActivity.course_id == course.id, ChapterActivity.org_id == course.org_id
    )
    existing_chapter_activities = db_session.exec(statement).all()

    # Create a map for faster lookup
    existing_activity_map = {
        (ca.chapter_id, ca.activity_id): ca for ca in existing_chapter_activities
    }

    # Track which activities we want to keep
    activities_to_keep = set()

    # Update or create chapter activities based on new order
    for chapter_order in chapters_order.chapter_order_by_ids:
        for index, activity_order in enumerate(chapter_order.activities_order_by_ids):
            activity_key = (chapter_order.chapter_id, activity_order.activity_id)
            activities_to_keep.add(activity_key)

            if activity_key in existing_activity_map:
                # Update existing activity order
                chapter_activity = existing_activity_map[activity_key]
                chapter_activity.order = index
                db_session.add(chapter_activity)
            else:
                # Create new chapter activity
                chapter_activity = ChapterActivity(
                    chapter_id=chapter_order.chapter_id,
                    activity_id=activity_order.activity_id,
                    org_id=course.org_id,
                    course_id=course.id,  # type: ignore
                    creation_date=str(datetime.now()),
                    update_date=str(datetime.now()),
                    order=index,
                )
                db_session.add(chapter_activity)

            db_session.commit()

    # Remove activities that are no longer in any chapter
    for ca in existing_chapter_activities:
        if (ca.chapter_id, ca.activity_id) not in activities_to_keep:
            db_session.delete(ca)
    db_session.commit()

    return {"detail": "Chapters and activities reordered successfully"}
