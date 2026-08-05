from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException
from sqlmodel import Session, desc, select

from src.db.cohorts import (Cohort, CohortCreate, CohortEnrollment,
                            CohortStatusEnum)


async def create_cohort(cohort_data: CohortCreate, db_session: Session) -> Cohort:
    # Auto-increment cohort number
    statement = (
        select(Cohort)
        .where(Cohort.org_id == cohort_data.org_id)
        .order_by(desc(Cohort.cohort_number))
    )
    last_cohort = db_session.exec(statement).first()

    cohort_num = (last_cohort.cohort_number + 1) if last_cohort else 1

    # If name not provided, auto-generate it
    name = cohort_data.name if cohort_data.name else f"Cohort {cohort_num}"

    cohort = Cohort(
        cohort_uuid=str(uuid4()),
        org_id=cohort_data.org_id,
        name=name,
        cohort_number=cohort_num,
        start_date=cohort_data.start_date,
        end_date=cohort_data.end_date,
        status=cohort_data.status,
        creation_date=str(datetime.now(timezone.utc)),
        update_date=str(datetime.now(timezone.utc)),
    )

    db_session.add(cohort)
    db_session.commit()
    db_session.refresh(cohort)
    return cohort


async def get_org_cohorts(org_id: int, db_session: Session) -> List[Cohort]:
    statement = (
        select(Cohort)
        .where(Cohort.org_id == org_id)
        .order_by(desc(Cohort.cohort_number))
    )
    return db_session.exec(statement).all()


async def get_current_cohort(org_id: int, db_session: Session) -> Optional[Cohort]:
    # Try to find the first UPCOMING or ACTIVE cohort
    statement = (
        select(Cohort)
        .where(
            Cohort.org_id == org_id,
            Cohort.status.in_([CohortStatusEnum.UPCOMING, CohortStatusEnum.ACTIVE]),
        )
        .order_by(Cohort.cohort_number.desc())
    )

    cohort = db_session.exec(statement).first()
    if not cohort:
        # Fallback to the latest one
        statement = (
            select(Cohort)
            .where(Cohort.org_id == org_id)
            .order_by(Cohort.cohort_number.desc())
        )
        cohort = db_session.exec(statement).first()

    return cohort


async def enroll_user_in_cohort(
    user_id: int,
    org_id: int,
    course_id: int,
    db_session: Session,
    payment_user_id: Optional[int] = None,
) -> CohortEnrollment:
    cohort = await get_current_cohort(org_id, db_session)
    if not cohort:
        raise HTTPException(
            status_code=400, detail="No active cohort available for enrollment."
        )

    # Check if already enrolled in this cohort for this course
    statement = select(CohortEnrollment).where(
        CohortEnrollment.cohort_id == cohort.id,
        CohortEnrollment.user_id == user_id,
        CohortEnrollment.course_id == course_id,
    )
    existing = db_session.exec(statement).first()
    if existing:
        return existing

    enrollment = CohortEnrollment(
        cohort_id=cohort.id,
        user_id=user_id,
        course_id=course_id,
        payment_user_id=payment_user_id,
        enrollment_type="paid" if payment_user_id else "free",
        enrolled_date=str(datetime.now(timezone.utc)),
        is_locked=(cohort.status == CohortStatusEnum.UPCOMING),
    )

    db_session.add(enrollment)
    db_session.commit()
    db_session.refresh(enrollment)
    return enrollment


async def unlock_cohort(cohort_id: int, db_session: Session) -> Cohort:
    cohort = db_session.exec(select(Cohort).where(Cohort.id == cohort_id)).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")

    cohort.status = CohortStatusEnum.ACTIVE
    cohort.update_date = str(datetime.now(timezone.utc))
    db_session.add(cohort)

    # Unlock all enrollments
    statement = select(CohortEnrollment).where(CohortEnrollment.cohort_id == cohort.id)
    enrollments = db_session.exec(statement).all()
    for enrollment in enrollments:
        enrollment.is_locked = False
        db_session.add(enrollment)

    db_session.commit()
    db_session.refresh(cohort)
    return cohort
