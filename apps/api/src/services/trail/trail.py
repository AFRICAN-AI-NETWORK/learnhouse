from datetime import datetime
from uuid import uuid4
from src.db.courses.chapter_activities import ChapterActivity
from fastapi import HTTPException, Request, status
from sqlmodel import Session, select
from sqlalchemy import func
from src.db.courses.activities import Activity
from src.db.courses.courses import Course
from src.db.trail_runs import TrailRun, TrailRunRead
from src.db.trail_steps import TrailStep
from src.db.trails import Trail, TrailCreate, TrailRead
from src.db.users import AnonymousUser, PublicUser
from src.services.courses.certifications import (
    check_course_completion_and_create_certificate,
)
from src.db.courses.course_prerequisites import CoursePrerequisite
from src.db.trail_runs import StatusEnum
from src.db.courses.chapters import Chapter
from src.db.courses.course_chapters import CourseChapter
from dateutil import parser


async def create_user_trail(
    request: Request,
    user: PublicUser,
    trail_object: TrailCreate,
    db_session: Session,
) -> Trail:
    statement = select(Trail).where(
        Trail.org_id == trail_object.org_id, Trail.user_id == user.id
    )
    trail = db_session.exec(statement).first()

    if trail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trail already exists",
        )

    trail = Trail.model_validate(trail_object)

    trail.creation_date = str(datetime.now())
    trail.update_date = str(datetime.now())
    trail.org_id = trail_object.org_id
    trail.trail_uuid = str(f"trail_{uuid4()}")

    # create trail
    db_session.add(trail)
    db_session.commit()
    db_session.refresh(trail)

    return trail


async def get_user_trails(
    request: Request,
    user: PublicUser,
    db_session: Session,
) -> TrailRead:
    statement = select(Trail).where(Trail.user_id == user.id)
    trail = db_session.exec(statement).first()

    if not trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trail not found"
        )

    statement = select(TrailRun).where(TrailRun.trail_id == trail.id)
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    # Add course object and total activities in a course to trail runs
    for trail_run in trail_runs:
        statement = select(Course).where(Course.id == trail_run.course_id)
        course = db_session.exec(statement).first()
        trail_run.course = course.model_dump() if course else {}

        # Add number of activities (steps) in a course
        count_statement = (
            select(func.count())
            .select_from(ChapterActivity)
            .where(ChapterActivity.course_id == trail_run.course_id)
        )
        trail_run.course_total_steps = db_session.exec(count_statement).one()

    for trail_run in trail_runs:
        statement = select(TrailStep).where(TrailStep.trailrun_id == trail_run.id)
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read


async def check_trail_presence(
    org_id: int,
    user_id: int,
    request: Request,
    user: PublicUser,
    db_session: Session,
):
    statement = select(Trail).where(Trail.org_id == org_id, Trail.user_id == user_id)
    trail = db_session.exec(statement).first()

    if not trail:
        trail = await create_user_trail(
            request,
            user,
            TrailCreate(
                org_id=org_id,
                user_id=user.id,
            ),
            db_session,
        )
        return trail

    return trail


async def get_user_trail_with_orgid(
    request: Request, user: PublicUser | AnonymousUser, org_id: int, db_session: Session
) -> TrailRead:
    if isinstance(user, AnonymousUser):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Anonymous users cannot access this endpoint",
        )

    trail = await check_trail_presence(
        org_id=org_id,
        user_id=user.id,
        request=request,
        user=user,
        db_session=db_session,
    )

    statement = select(TrailRun).where(TrailRun.trail_id == trail.id)
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    # Add course object and total activities in a course to trail runs
    for trail_run in trail_runs:
        statement = select(Course).where(Course.id == trail_run.course_id)
        course = db_session.exec(statement).first()
        trail_run.course = course.model_dump() if course else {}

        # Add number of activities (steps) in a course
        count_statement = (
            select(func.count())
            .select_from(ChapterActivity)
            .where(ChapterActivity.course_id == trail_run.course_id)
        )
        trail_run.course_total_steps = db_session.exec(count_statement).one()

    for trail_run in trail_runs:
        statement = select(TrailStep).where(TrailStep.trailrun_id == trail_run.id)
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read


async def add_activity_to_trail(
    request: Request,
    user: PublicUser,
    activity_uuid: str,
    db_session: Session,
) -> TrailRead:
    # Look for the activity
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found"
        )

    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    trail = await check_trail_presence(
        org_id=course.org_id,
        user_id=user.id,
        request=request,
        user=user,
        db_session=db_session,
    )

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id,
        TrailRun.course_id == course.id,
        TrailRun.user_id == user.id,
    )
    trailrun = db_session.exec(statement).first()

    if not trailrun:
        trailrun = TrailRun(
            trail_id=trail.id if trail.id is not None else 0,
            course_id=course.id if course.id is not None else 0,
            org_id=course.org_id,
            user_id=user.id,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(trailrun)
        db_session.commit()
        db_session.refresh(trailrun)

    statement = select(TrailStep).where(
        TrailStep.trailrun_id == trailrun.id,
        TrailStep.activity_id == activity.id,
        TrailStep.user_id == user.id,
    )
    trailstep = db_session.exec(statement).first()

    is_late = False

    # Check Sequential Access and Due Dates
    statement = select(ChapterActivity).where(ChapterActivity.activity_id == activity.id)
    chapter_activity = db_session.exec(statement).first()

    if chapter_activity:
        chapter = db_session.exec(select(Chapter).where(Chapter.id == chapter_activity.chapter_id)).first()
        if chapter and chapter.due_date:
            try:
                due_date = parser.isoparse(chapter.due_date)
                # handle timezone naive or aware comparison by replacing tzinfo if needed, 
                # but simplest is just checking if current time is greater:
                now_tz = datetime.now(due_date.tzinfo)
                if now_tz > due_date:
                    is_late = True
            except ValueError:
                pass

        # Activity Sequencing
        prev_activity = db_session.exec(
            select(ChapterActivity).where(
                ChapterActivity.chapter_id == chapter_activity.chapter_id,
                ChapterActivity.order < chapter_activity.order
            ).order_by(ChapterActivity.order.desc())
        ).first()

        if prev_activity:
            prev_step = db_session.exec(
                select(TrailStep).where(
                    TrailStep.trailrun_id == trailrun.id,
                    TrailStep.activity_id == prev_activity.activity_id,
                    TrailStep.complete == True
                )
            ).first()
            if not prev_step:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must complete the previous activity before accessing this one."
                )
        else:
            # Chapter Sequencing
            course_chapter = db_session.exec(
                select(CourseChapter).where(CourseChapter.chapter_id == chapter_activity.chapter_id)
            ).first()
            if course_chapter:
                prev_course_chapter = db_session.exec(
                    select(CourseChapter).where(
                        CourseChapter.course_id == course_chapter.course_id,
                        CourseChapter.order < course_chapter.order
                    ).order_by(CourseChapter.order.desc())
                ).first()
                if prev_course_chapter:
                    last_activity_prev_chapter = db_session.exec(
                        select(ChapterActivity).where(
                            ChapterActivity.chapter_id == prev_course_chapter.chapter_id
                        ).order_by(ChapterActivity.order.desc())
                    ).first()
                    if last_activity_prev_chapter:
                        prev_chap_step = db_session.exec(
                            select(TrailStep).where(
                                TrailStep.trailrun_id == trailrun.id,
                                TrailStep.activity_id == last_activity_prev_chapter.activity_id,
                                TrailStep.complete == True
                            )
                        ).first()
                        if not prev_chap_step:
                            raise HTTPException(
                                status_code=status.HTTP_403_FORBIDDEN,
                                detail="You must complete the previous module before accessing this one."
                            )

    if not trailstep:
        trailstep = TrailStep(
            trailrun_id=trailrun.id if trailrun.id is not None else 0,
            activity_id=activity.id if activity.id is not None else 0,
            course_id=course.id if course.id is not None else 0,
            trail_id=trail.id if trail.id is not None else 0,
            org_id=course.org_id,
            complete=True,
            teacher_verified=False,
            grade="",
            user_id=user.id,
            points_earned=activity.points if not is_late else int(activity.points * 0.8), # 20% late penalty
            is_late=is_late,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(trailstep)
        db_session.commit()
        db_session.refresh(trailstep)

    # Check if all activities in the course are completed and create certificate if so
    if course and course.id:
        await check_course_completion_and_create_certificate(
            request, user.id, course.id, db_session
        )

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id, TrailRun.user_id == user.id
    )
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    for trail_run in trail_runs:
        statement = select(TrailStep).where(
            TrailStep.trailrun_id == trail_run.id, TrailStep.user_id == user.id
        )
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read


async def remove_activity_from_trail(
    request: Request,
    user: PublicUser,
    activity_uuid: str,
    db_session: Session,
) -> TrailRead:
    # Look for the activity
    statement = select(Activity).where(Activity.activity_uuid == activity_uuid)
    activity = db_session.exec(statement).first()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found"
        )

    statement = select(Course).where(Course.id == activity.course_id)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    statement = select(Trail).where(
        Trail.org_id == course.org_id, Trail.user_id == user.id
    )
    trail = db_session.exec(statement).first()

    if not trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trail not found"
        )

    # Delete the trail step for this activity
    statement = select(TrailStep).where(
        TrailStep.activity_id == activity.id,
        TrailStep.user_id == user.id,
        TrailStep.trail_id == trail.id,
    )
    trail_step = db_session.exec(statement).first()

    if trail_step:
        db_session.delete(trail_step)
        db_session.commit()

    # Get updated trail data
    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id, TrailRun.user_id == user.id
    )
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    for trail_run in trail_runs:
        statement = select(TrailStep).where(
            TrailStep.trailrun_id == trail_run.id, TrailStep.user_id == user.id
        )
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read


async def add_course_to_trail(
    request: Request,
    user: PublicUser,
    course_uuid: str,
    db_session: Session,
) -> TrailRead:
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # check if run already exists
    statement = select(TrailRun).where(
        TrailRun.course_id == course.id, TrailRun.user_id == user.id
    )
    trailrun = db_session.exec(statement).first()

    if trailrun:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="TrailRun already exists"
        )

    # Check prerequisites
    is_editor = False
    if user and user.id != 0:
        try:
            from src.security.courses_security import courses_rbac_check
            is_editor = await courses_rbac_check(
                request, course.course_uuid, user, "update", db_session
            )
        except Exception:
            is_editor = False

    if not is_editor:
        prereqs = db_session.exec(
            select(CoursePrerequisite).where(CoursePrerequisite.course_id == course.id)
        ).all()
        if prereqs:
            for prereq in prereqs:
                prereq_run = db_session.exec(
                    select(TrailRun).where(
                        TrailRun.course_id == prereq.prerequisite_course_id,
                        TrailRun.user_id == user.id,
                        TrailRun.status == StatusEnum.STATUS_COMPLETED
                    )
                ).first()
                if not prereq_run:
                    prereq_course = db_session.exec(
                        select(Course).where(Course.id == prereq.prerequisite_course_id)
                    ).first()
                    course_name = prereq_course.name if prereq_course else "a prerequisite course"
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"You must complete {course_name} before starting this course."
                    )

    statement = select(Trail).where(
        Trail.org_id == course.org_id, Trail.user_id == user.id
    )
    trail = db_session.exec(statement).first()

    if not trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trail not found"
        )

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id,
        TrailRun.course_id == course.id,
        TrailRun.user_id == user.id,
    )
    trail_run = db_session.exec(statement).first()

    if not trail_run:
        trail_run = TrailRun(
            trail_id=trail.id if trail.id is not None else 0,
            course_id=course.id if course.id is not None else 0,
            org_id=course.org_id,
            user_id=user.id,
            creation_date=str(datetime.now()),
            update_date=str(datetime.now()),
        )
        db_session.add(trail_run)
        db_session.commit()
        db_session.refresh(trail_run)

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id, TrailRun.user_id == user.id
    )
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    for trail_run in trail_runs:
        statement = select(TrailStep).where(
            TrailStep.trailrun_id == trail_run.id, TrailStep.user_id == user.id
        )
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read


async def remove_course_from_trail(
    request: Request,
    user: PublicUser,
    course_uuid: str,
    db_session: Session,
) -> TrailRead:
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    statement = select(Trail).where(
        Trail.org_id == course.org_id, Trail.user_id == user.id
    )
    trail = db_session.exec(statement).first()

    if not trail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trail not found"
        )

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id,
        TrailRun.course_id == course.id,
        TrailRun.user_id == user.id,
    )
    trail_run = db_session.exec(statement).first()

    if trail_run:
        db_session.delete(trail_run)
        db_session.commit()

    # Delete all trail steps for this course
    statement = select(TrailStep).where(
        TrailStep.course_id == course.id, TrailStep.user_id == user.id
    )
    trail_steps = db_session.exec(statement).all()

    for trail_step in trail_steps:
        db_session.delete(trail_step)
        db_session.commit()

    statement = select(TrailRun).where(
        TrailRun.trail_id == trail.id, TrailRun.user_id == user.id
    )
    trail_runs = db_session.exec(statement).all()

    trail_runs = [
        TrailRunRead(**trail_run.__dict__, course={}, steps=[], course_total_steps=0)
        for trail_run in trail_runs
    ]

    for trail_run in trail_runs:
        statement = select(TrailStep).where(
            TrailStep.trailrun_id == trail_run.id, TrailStep.user_id == user.id
        )
        trail_steps = db_session.exec(statement).all()

        trail_steps = [TrailStep(**trail_step.__dict__) for trail_step in trail_steps]
        trail_run.steps = trail_steps

        for trail_step in trail_steps:
            statement = select(Course).where(Course.id == trail_step.course_id)
            course = db_session.exec(statement).first()
            trail_step.data = dict(course=course)

    trail_read = TrailRead(
        **trail.model_dump(),
        runs=trail_runs,
    )

    return trail_read
