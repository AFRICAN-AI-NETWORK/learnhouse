from datetime import UTC, datetime

from fastapi import HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from src.db.courses.course_prerequisites import CoursePrerequisite
from src.db.courses.courses import Course
from src.db.users import AnonymousUser, PublicUser
from src.security.rbac.rbac import authorization_verify_based_on_org_admin_status


class PrerequisiteCreate(BaseModel):
    """Request body for setting prerequisites on a course."""

    prerequisite_course_ids: list[int]  # Ordered list of prerequisite course IDs


class PrerequisiteRead(BaseModel):
    """Read model for a single prerequisite entry."""

    id: int
    course_id: int
    prerequisite_course_id: int
    prerequisite_course_name: str
    prerequisite_course_uuid: str
    order: int


async def get_course_prerequisites(
    request: Request,
    course_uuid: str,
    db_session: Session,
) -> list[PrerequisiteRead]:
    """Get all prerequisites for a course, ordered by sequence."""
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    prereqs = db_session.exec(
        select(CoursePrerequisite)
        .where(CoursePrerequisite.course_id == course.id)
        .order_by(CoursePrerequisite.order)  # type: ignore
    ).all()

    result = []
    for prereq in prereqs:
        prereq_course = db_session.exec(
            select(Course).where(Course.id == prereq.prerequisite_course_id)
        ).first()
        if prereq_course:
            result.append(
                PrerequisiteRead(
                    id=prereq.id if prereq.id else 0,
                    course_id=prereq.course_id,
                    prerequisite_course_id=prereq.prerequisite_course_id,
                    prerequisite_course_name=prereq_course.name,
                    prerequisite_course_uuid=prereq_course.course_uuid,
                    order=prereq.order,
                )
            )

    return result


async def set_course_prerequisites(
    request: Request,
    course_uuid: str,
    prereq_data: PrerequisiteCreate,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> list[PrerequisiteRead]:
    """
    Set prerequisites for a course. Replaces any existing prerequisites.
    Only admins, maintainers, and instructors (course owners) can do this.
    """
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    # RBAC: require admin/maintainer role
    is_authorized = await authorization_verify_based_on_org_admin_status(
        request, current_user.id, "update", course_uuid, db_session
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage course prerequisites.",
        )

    # Validate: course can't be its own prerequisite
    if course.id in prereq_data.prerequisite_course_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A course cannot be a prerequisite of itself.",
        )

    # Validate: all prerequisite course IDs exist
    for prereq_id in prereq_data.prerequisite_course_ids:
        prereq_course = db_session.exec(
            select(Course).where(Course.id == prereq_id)
        ).first()
        if not prereq_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prerequisite course with id {prereq_id} not found.",
            )

    # Delete existing prerequisites for this course
    existing = db_session.exec(
        select(CoursePrerequisite).where(CoursePrerequisite.course_id == course.id)
    ).all()
    for ex in existing:
        db_session.delete(ex)
    db_session.commit()

    # Create new prerequisites in order
    for order, prereq_course_id in enumerate(prereq_data.prerequisite_course_ids):
        new_prereq = CoursePrerequisite(
            course_id=course.id if course.id else 0,
            prerequisite_course_id=prereq_course_id,
            org_id=course.org_id,
            order=order,
            creation_date=str(datetime.now(UTC)),
            update_date=str(datetime.now(UTC)),
        )
        db_session.add(new_prereq)

    db_session.commit()

    return await get_course_prerequisites(request, course_uuid, db_session)


async def delete_course_prerequisites(
    request: Request,
    course_uuid: str,
    current_user: PublicUser | AnonymousUser,
    db_session: Session,
) -> dict:
    """Remove all prerequisites from a course."""
    statement = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(statement).first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    is_authorized = await authorization_verify_based_on_org_admin_status(
        request, current_user.id, "update", course_uuid, db_session
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage course prerequisites.",
        )

    existing = db_session.exec(
        select(CoursePrerequisite).where(CoursePrerequisite.course_id == course.id)
    ).all()
    for ex in existing:
        db_session.delete(ex)
    db_session.commit()

    return {"detail": "All prerequisites removed."}
