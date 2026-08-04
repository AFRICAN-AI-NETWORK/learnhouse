"""
Aggregation service for the centralized student dashboard.

Design notes:
- All metrics are computed with grouped SQL aggregates (never per-student Python
  loops issuing per-row queries), so the number of database round-trips is
  constant regardless of how many students are on the page.
- Course completion is derived from completed ``TrailStep`` rows against the
  course's activity count rather than from the stored ``TrailRun.status``. This
  is authoritative and avoids running the per-student status reconciliation on
  every list load.
"""

from datetime import datetime, timedelta
from typing import Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlmodel import Session, select

from src.db.courses.activities import Activity
from src.db.courses.certifications import CertificateUser, Certifications
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.chapters import Chapter
from src.db.courses.courses import Course
from src.db.roles import Role
from src.db.trail_runs import TrailRun
from src.db.trail_sessions import TrailActivitySession
from src.db.trail_steps import TrailStep
from src.db.user_organizations import UserOrganization
from src.db.users import AnonymousUser, PublicUser, User
from src.security.dashboard_security import verify_student_dashboard_access
from src.services.admin_analytics.schemas import (OrgAnalyticsSummary,
                                                  StudentActivityProgress,
                                                  StudentChapterProgress,
                                                  StudentCourseDetail,
                                                  StudentCourseProgress,
                                                  StudentDetail,
                                                  StudentListResponse,
                                                  StudentRoleInfo,
                                                  StudentSummary,
                                                  TopStudentsResponse)

STATUS_COMPLETED = "completed"
STATUS_IN_PROGRESS = "in_progress"


def _progress_pct(completed: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(min(completed, total) / total * 100, 1)


def _course_activity_totals(org_id: int, db_session: Session) -> dict[int, int]:
    """Map of course_id -> number of activities, for every course in the org."""
    rows = db_session.exec(
        select(ChapterActivity.course_id, func.count())
        .where(ChapterActivity.org_id == org_id)
        .group_by(ChapterActivity.course_id)
    ).all()
    return {course_id: count for course_id, count in rows}


def _completed_steps_by_user_course(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[tuple[int, int], int]:
    """Map of (user_id, course_id) -> count of completed activities."""
    rows = db_session.exec(
        select(TrailStep.user_id, TrailStep.course_id, func.count())
        .where(
            TrailStep.org_id == org_id,
            TrailStep.user_id.in_(user_ids),  # type: ignore[attr-defined]
            TrailStep.complete == True,  # noqa: E712
        )
        .group_by(TrailStep.user_id, TrailStep.course_id)
    ).all()
    return {(user_id, course_id): count for user_id, course_id, count in rows}


def _points_by_user(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[int, float]:
    rows = db_session.exec(
        select(TrailStep.user_id, func.sum(TrailStep.points_earned))
        .where(
            TrailStep.org_id == org_id,
            TrailStep.user_id.in_(user_ids),  # type: ignore[attr-defined]
            TrailStep.complete == True,  # noqa: E712
        )
        .group_by(TrailStep.user_id)
    ).all()
    return {user_id: round(float(total or 0), 1) for user_id, total in rows}


def _time_by_user(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[int, int]:
    rows = db_session.exec(
        select(
            TrailActivitySession.user_id,
            func.sum(TrailActivitySession.seconds_spent),
        )
        .where(
            TrailActivitySession.org_id == org_id,
            TrailActivitySession.user_id.in_(user_ids),  # type: ignore[attr-defined]
        )
        .group_by(TrailActivitySession.user_id)
    ).all()
    return {user_id: int(total or 0) for user_id, total in rows}


def _last_active_by_user(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[int, Optional[str]]:
    rows = db_session.exec(
        select(
            TrailActivitySession.user_id,
            func.max(TrailActivitySession.last_heartbeat_at),
        )
        .where(
            TrailActivitySession.org_id == org_id,
            TrailActivitySession.user_id.in_(user_ids),  # type: ignore[attr-defined]
        )
        .group_by(TrailActivitySession.user_id)
    ).all()
    return {user_id: last for user_id, last in rows}


def _certificates_by_user(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[int, int]:
    rows = db_session.exec(
        select(CertificateUser.user_id, func.count())
        .join(Certifications, Certifications.id == CertificateUser.certification_id)
        .join(Course, Course.id == Certifications.course_id)
        .where(
            Course.org_id == org_id,
            CertificateUser.user_id.in_(user_ids),  # type: ignore[attr-defined]
        )
        .group_by(CertificateUser.user_id)
    ).all()
    return {user_id: count for user_id, count in rows}


def _runs_by_user(
    org_id: int, user_ids: Sequence[int], db_session: Session
) -> dict[int, list[int]]:
    """Map of user_id -> list of course_ids the user has a trail run for."""
    rows = db_session.exec(
        select(TrailRun.user_id, TrailRun.course_id).where(
            TrailRun.org_id == org_id,
            TrailRun.user_id.in_(user_ids),  # type: ignore[attr-defined]
        )
    ).all()
    runs: dict[int, list[int]] = {}
    for user_id, course_id in rows:
        runs.setdefault(user_id, []).append(course_id)
    return runs


async def list_org_students(
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    sort_by: Optional[str] = None,
) -> StudentListResponse:
    """Paginated, searchable list of org members with their progress metrics."""
    await verify_student_dashboard_access(current_user, db_session)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    members = (
        select(User)
        .join(UserOrganization, UserOrganization.user_id == User.id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(
            UserOrganization.org_id == org_id,
            or_(Role.name.ilike("user"), Role.name.ilike("student")),
        )
    )
    if search:
        like = f"%{search.strip()}%"
        members = members.where(
            or_(
                User.username.ilike(like),  # type: ignore[attr-defined]
                User.email.ilike(like),  # type: ignore[attr-defined]
                User.first_name.ilike(like),  # type: ignore[attr-defined]
                User.last_name.ilike(like),  # type: ignore[attr-defined]
            )
        )

    total = db_session.exec(select(func.count()).select_from(members.subquery())).one()

    is_progress_sort = sort_by and sort_by.startswith("progress_")

    if is_progress_sort:
        # Fetch all matching users to sort them in memory
        users = db_session.exec(members).all()
    else:
        # Paginate at DB level
        users = db_session.exec(
            members.order_by(User.id).offset((page - 1) * page_size).limit(page_size)
        ).all()

    if not users:
        return StudentListResponse(
            total=total, page=page, page_size=page_size, students=[]
        )

    user_ids = [u.id for u in users]
    course_totals = _course_activity_totals(org_id, db_session)
    runs = _runs_by_user(org_id, user_ids, db_session)
    completed = _completed_steps_by_user_course(org_id, user_ids, db_session)
    points = _points_by_user(org_id, user_ids, db_session)
    time_spent = _time_by_user(org_id, user_ids, db_session)
    last_active = _last_active_by_user(org_id, user_ids, db_session)
    certificates = _certificates_by_user(org_id, user_ids, db_session)

    students: list[StudentSummary] = []
    for user in users:
        course_ids = runs.get(user.id, [])
        progresses: list[float] = []
        completed_count = 0
        for course_id in course_ids:
            total_acts = course_totals.get(course_id, 0)
            done = completed.get((user.id, course_id), 0)
            progresses.append(_progress_pct(done, total_acts))
            if total_acts > 0 and done >= total_acts:
                completed_count += 1

        avg_progress = (
            round(sum(progresses) / len(progresses), 1) if progresses else 0.0
        )
        students.append(
            StudentSummary(
                user_id=user.id,
                user_uuid=user.user_uuid,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                avatar_image=user.avatar_image,
                courses_enrolled=len(course_ids),
                courses_in_progress=len(course_ids) - completed_count,
                courses_completed=completed_count,
                average_progress=avg_progress,
                total_time_spent_seconds=time_spent.get(user.id, 0),
                total_points=points.get(user.id, 0.0),
                certificates_count=certificates.get(user.id, 0),
                last_active=last_active.get(user.id),
            )
        )

    if is_progress_sort:
        students.sort(
            key=lambda s: s.average_progress, reverse=(sort_by == "progress_desc")
        )
        start = (page - 1) * page_size
        end = start + page_size
        students = students[start:end]

    return StudentListResponse(
        total=total, page=page, page_size=page_size, students=students
    )


def _fetch_org_member(org_id: int, user_id: int, db_session: Session) -> User:
    user = db_session.exec(
        select(User)
        .join(UserOrganization, UserOrganization.user_id == User.id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(
            UserOrganization.org_id == org_id,
            User.id == user_id,
            or_(Role.name.ilike("user"), Role.name.ilike("student")),
        )
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found in this organization",
        )
    return user


async def get_student_detail(
    org_id: int,
    user_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> StudentDetail:
    """Full profile plus per-course progress for one student."""
    await verify_student_dashboard_access(current_user, db_session)

    user = _fetch_org_member(org_id, user_id, db_session)

    roles = db_session.exec(
        select(Role.id, Role.name)
        .join(UserOrganization, UserOrganization.role_id == Role.id)
        .where(UserOrganization.user_id == user_id, UserOrganization.org_id == org_id)
    ).all()

    course_totals = _course_activity_totals(org_id, db_session)
    completed = _completed_steps_by_user_course(org_id, [user_id], db_session)
    time_by_course = dict(
        db_session.exec(
            select(
                TrailActivitySession.course_id,
                func.sum(TrailActivitySession.seconds_spent),
            )
            .where(
                TrailActivitySession.org_id == org_id,
                TrailActivitySession.user_id == user_id,
            )
            .group_by(TrailActivitySession.course_id)
        ).all()
    )
    points_by_course = dict(
        db_session.exec(
            select(TrailStep.course_id, func.sum(TrailStep.points_earned))
            .where(
                TrailStep.org_id == org_id,
                TrailStep.user_id == user_id,
                TrailStep.complete == True,  # noqa: E712
            )
            .group_by(TrailStep.course_id)
        ).all()
    )
    completed_at_by_course = dict(
        db_session.exec(
            select(TrailStep.course_id, func.max(TrailStep.update_date))
            .where(
                TrailStep.org_id == org_id,
                TrailStep.user_id == user_id,
                TrailStep.complete == True,  # noqa: E712
            )
            .group_by(TrailStep.course_id)
        ).all()
    )

    runs = db_session.exec(
        select(TrailRun.course_id, TrailRun.creation_date).where(
            TrailRun.org_id == org_id, TrailRun.user_id == user_id
        )
    ).all()
    course_ids = [course_id for course_id, _ in runs]
    started_by_course = {course_id: started for course_id, started in runs}

    courses = (
        db_session.exec(select(Course).where(Course.id.in_(course_ids))).all()  # type: ignore[attr-defined]
        if course_ids
        else []
    )
    certified_course_ids = set(
        db_session.exec(
            select(Certifications.course_id)
            .join(
                CertificateUser, CertificateUser.certification_id == Certifications.id
            )
            .where(
                CertificateUser.user_id == user_id,
                Certifications.course_id.in_(course_ids or [0]),  # type: ignore[attr-defined]
            )
        ).all()
    )

    course_progress: list[StudentCourseProgress] = []
    progresses: list[float] = []
    completed_count = 0
    for course in courses:
        total_acts = course_totals.get(course.id, 0)
        done = completed.get((user_id, course.id), 0)
        pct = _progress_pct(done, total_acts)
        progresses.append(pct)
        is_done = total_acts > 0 and done >= total_acts
        if is_done:
            completed_count += 1
        course_progress.append(
            StudentCourseProgress(
                course_id=course.id,
                course_uuid=course.course_uuid,
                course_name=course.name,
                thumbnail_image=course.thumbnail_image,
                status=STATUS_COMPLETED if is_done else STATUS_IN_PROGRESS,
                total_activities=total_acts,
                completed_activities=done,
                progress_percentage=pct,
                points_earned=round(float(points_by_course.get(course.id, 0) or 0), 1),
                time_spent_seconds=int(time_by_course.get(course.id, 0) or 0),
                is_certified=course.id in certified_course_ids,
                started_at=started_by_course.get(course.id),
                completed_at=completed_at_by_course.get(course.id) if is_done else None,
            )
        )

    avg_progress = round(sum(progresses) / len(progresses), 1) if progresses else 0.0
    total_time = int(sum(time_by_course.values()))
    total_points = round(float(sum(points_by_course.values())), 1)
    last_active = db_session.exec(
        select(func.max(TrailActivitySession.last_heartbeat_at)).where(
            TrailActivitySession.org_id == org_id,
            TrailActivitySession.user_id == user_id,
        )
    ).first()

    return StudentDetail(
        user_id=user.id,
        user_uuid=user.user_uuid,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone_number=user.phone_number,
        avatar_image=user.avatar_image,
        bio=user.bio,
        details=user.details,
        profile=user.profile,
        user_status=user.user_status,
        creation_date=user.creation_date,
        roles=[StudentRoleInfo(role_id=role_id, name=name) for role_id, name in roles],
        courses_enrolled=len(course_ids),
        courses_in_progress=len(course_ids) - completed_count,
        courses_completed=completed_count,
        average_progress=avg_progress,
        total_time_spent_seconds=total_time,
        total_points=total_points,
        certificates_count=len(certified_course_ids),
        last_active=last_active,
        courses=course_progress,
    )


async def get_student_course_detail(
    org_id: int,
    user_id: int,
    course_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> StudentCourseDetail:
    """Chapter -> activity drilldown for one student in one course."""
    await verify_student_dashboard_access(current_user, db_session)

    _fetch_org_member(org_id, user_id, db_session)

    course = db_session.exec(
        select(Course).where(Course.id == course_id, Course.org_id == org_id)
    ).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found in this organization",
        )

    # Course structure: chapter -> activities (ordered).
    structure = db_session.exec(
        select(ChapterActivity, Activity, Chapter)
        .join(Activity, Activity.id == ChapterActivity.activity_id)
        .join(Chapter, Chapter.id == ChapterActivity.chapter_id)
        .where(ChapterActivity.course_id == course_id)
        .order_by(ChapterActivity.chapter_id, ChapterActivity.order)
    ).all()

    steps = {
        step.activity_id: step
        for step in db_session.exec(
            select(TrailStep).where(
                TrailStep.user_id == user_id, TrailStep.course_id == course_id
            )
        ).all()
    }
    time_by_activity = dict(
        db_session.exec(
            select(
                TrailActivitySession.activity_id,
                func.sum(TrailActivitySession.seconds_spent),
            )
            .where(
                TrailActivitySession.user_id == user_id,
                TrailActivitySession.course_id == course_id,
            )
            .group_by(TrailActivitySession.activity_id)
        ).all()
    )

    chapters: dict[int, StudentChapterProgress] = {}
    total_completed = 0
    total_points = 0.0
    for chapter_activity, activity, chapter in structure:
        bucket = chapters.get(chapter.id)
        if bucket is None:
            bucket = StudentChapterProgress(
                chapter_id=chapter.id,
                name=chapter.name,
                total_activities=0,
                completed_activities=0,
                activities=[],
            )
            chapters[chapter.id] = bucket

        step = steps.get(activity.id)
        is_complete = bool(step and step.complete)
        points = float(step.points_earned) if step else 0.0
        total_points += points
        if is_complete:
            total_completed += 1
            bucket.completed_activities += 1
        bucket.total_activities += 1
        bucket.activities.append(
            StudentActivityProgress(
                activity_id=activity.id,
                activity_uuid=activity.activity_uuid,
                name=activity.name,
                order=chapter_activity.order,
                complete=is_complete,
                teacher_verified=bool(step.teacher_verified) if step else False,
                grade=step.grade if step else "",
                points_earned=points,
                is_late=bool(step.is_late) if step else False,
                time_spent_seconds=int(time_by_activity.get(activity.id, 0) or 0),
                completed_at=step.update_date if (step and step.complete) else None,
            )
        )

    total_activities = len(structure)
    total_time = int(sum(time_by_activity.values()))
    is_done = total_activities > 0 and total_completed >= total_activities

    return StudentCourseDetail(
        course_id=course.id,
        course_uuid=course.course_uuid,
        course_name=course.name,
        status=STATUS_COMPLETED if is_done else STATUS_IN_PROGRESS,
        total_activities=total_activities,
        completed_activities=total_completed,
        progress_percentage=_progress_pct(total_completed, total_activities),
        points_earned=round(total_points, 1),
        time_spent_seconds=total_time,
        chapters=list(chapters.values()),
    )


async def get_org_analytics_summary(
    org_id: int,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> OrgAnalyticsSummary:
    """Org-wide headline metrics for the dashboard top cards."""
    await verify_student_dashboard_access(current_user, db_session)

    total_students = db_session.exec(
        select(func.count()).select_from(
            select(UserOrganization.user_id)
            .join(Role, UserOrganization.role_id == Role.id)
            .where(
                UserOrganization.org_id == org_id,
                or_(Role.name.ilike("user"), Role.name.ilike("student")),
            )
            .subquery()
        )
    ).one()

    course_totals = _course_activity_totals(org_id, db_session)

    runs = db_session.exec(
        select(TrailRun.user_id, TrailRun.course_id)
        .join(UserOrganization, UserOrganization.user_id == TrailRun.user_id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(
            TrailRun.org_id == org_id,
            UserOrganization.org_id == org_id,
            or_(Role.name.ilike("user"), Role.name.ilike("student")),
        )
    ).all()
    completed = _completed_steps_by_user_course(
        org_id, list({user_id for user_id, _ in runs}) or [0], db_session
    )

    active_students = len({user_id for user_id, _ in runs})
    total_enrollments = len(runs)
    progresses: list[float] = []
    total_completions = 0
    for user_id, course_id in runs:
        total_acts = course_totals.get(course_id, 0)
        done = completed.get((user_id, course_id), 0)
        progresses.append(_progress_pct(done, total_acts))
        if total_acts > 0 and done >= total_acts:
            total_completions += 1

    total_learning_seconds = db_session.exec(
        select(func.sum(TrailActivitySession.seconds_spent))
        .join(
            UserOrganization, UserOrganization.user_id == TrailActivitySession.user_id
        )
        .join(Role, UserOrganization.role_id == Role.id)
        .where(
            TrailActivitySession.org_id == org_id,
            UserOrganization.org_id == org_id,
            or_(Role.name.ilike("user"), Role.name.ilike("student")),
        )
    ).first()

    return OrgAnalyticsSummary(
        total_students=total_students,
        active_students=active_students,
        total_enrollments=total_enrollments,
        total_completions=total_completions,
        average_completion=round(sum(progresses) / len(progresses), 1)
        if progresses
        else 0.0,
        total_learning_seconds=int(total_learning_seconds or 0),
    )


async def get_top_org_students(
    org_id: int,
    limit: int,
    days: Optional[int],
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> TopStudentsResponse:
    """Fetch all students, calculate their progress, and return the absolute top N."""
    await verify_student_dashboard_access(current_user, db_session)

    members = (
        select(User)
        .join(UserOrganization, UserOrganization.user_id == User.id)
        .join(Role, UserOrganization.role_id == Role.id)
        .where(
            UserOrganization.org_id == org_id,
            or_(Role.name.ilike("user"), Role.name.ilike("student")),
        )
    )

    if days is not None and days > 0:
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
        members = members.where(UserOrganization.creation_date >= cutoff_date)

    users = db_session.exec(members).all()

    if not users:
        return TopStudentsResponse(students=[])

    user_ids = [u.id for u in users]
    course_totals = _course_activity_totals(org_id, db_session)
    runs = _runs_by_user(org_id, user_ids, db_session)
    completed = _completed_steps_by_user_course(org_id, user_ids, db_session)
    points = _points_by_user(org_id, user_ids, db_session)
    time_spent = _time_by_user(org_id, user_ids, db_session)
    last_active = _last_active_by_user(org_id, user_ids, db_session)
    certificates = _certificates_by_user(org_id, user_ids, db_session)

    students: list[StudentSummary] = []
    for user in users:
        course_ids = runs.get(user.id, [])
        progresses: list[float] = []
        completed_count = 0
        for course_id in course_ids:
            total_acts = course_totals.get(course_id, 0)
            done = completed.get((user.id, course_id), 0)
            progresses.append(_progress_pct(done, total_acts))
            if total_acts > 0 and done >= total_acts:
                completed_count += 1

        avg_progress = (
            round(sum(progresses) / len(progresses), 1) if progresses else 0.0
        )
        students.append(
            StudentSummary(
                user_id=user.id,
                user_uuid=user.user_uuid,
                username=user.username,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                avatar_image=user.avatar_image,
                courses_enrolled=len(course_ids),
                courses_in_progress=len(course_ids) - completed_count,
                courses_completed=completed_count,
                average_progress=avg_progress,
                total_time_spent_seconds=time_spent.get(user.id, 0),
                total_points=points.get(user.id, 0.0),
                certificates_count=certificates.get(user.id, 0),
                last_active=last_active.get(user.id),
            )
        )

    # Sort natively in Python: by average_progress DESC, then total_points DESC
    students.sort(key=lambda s: (s.average_progress, s.total_points), reverse=True)

    return TopStudentsResponse(students=students[:limit])
