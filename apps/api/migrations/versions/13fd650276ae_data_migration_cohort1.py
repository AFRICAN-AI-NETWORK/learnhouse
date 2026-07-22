"""data_migration_cohort1

Revision ID: 13fd650276ae
Revises: a357f4d8baae
Create Date: 2026-07-08 23:07:36.811615

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = "13fd650276ae"
down_revision: Union[str, None] = "a357f4d8baae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlmodel import Session, select
    from datetime import datetime, timezone
    from src.db.trail_runs import TrailRun
    from src.db.payments.payments_courses import PaymentsCourse
    from src.db.cohorts import Cohort, CohortEnrollment, CohortStatusEnum

    bind = op.get_bind()
    session = Session(bind=bind)

    # Check if Cohort 1 already exists
    cohort1 = session.exec(select(Cohort).where(Cohort.name == "Cohort 1")).first()

    if not cohort1:
        print("Creating Cohort 1...")
        trail_run = session.exec(select(TrailRun)).first()
        org_id = trail_run.org_id if trail_run else 1

        cohort1 = Cohort(
            org_id=org_id,
            name="Cohort 1",
            cohort_number=1,
            start_date=str(datetime.now(timezone.utc)),
            status=CohortStatusEnum.ACTIVE,
            creation_date=str(datetime.now(timezone.utc)),
            update_date=str(datetime.now(timezone.utc)),
        )
        session.add(cohort1)
        session.flush()

    paid_course_links = session.exec(select(PaymentsCourse)).all()
    paid_course_ids = set([p.course_id for p in paid_course_links if p.course_id])

    if not paid_course_ids:
        return

    trail_runs = session.exec(
        select(TrailRun).where(TrailRun.course_id.in_(list(paid_course_ids)))
    ).all()

    for run in trail_runs:
        existing = session.exec(
            select(CohortEnrollment).where(
                CohortEnrollment.user_id == run.user_id,
                CohortEnrollment.course_id == run.course_id,
            )
        ).first()

        if not existing:
            enrollment = CohortEnrollment(
                cohort_id=cohort1.id,
                user_id=run.user_id,
                course_id=run.course_id,
                org_id=run.org_id,
                is_locked=False,
                enrolled_date=str(datetime.now(timezone.utc)),
                creation_date=str(datetime.now(timezone.utc)),
                update_date=str(datetime.now(timezone.utc)),
            )
            session.add(enrollment)

    session.flush()


def downgrade() -> None:
    pass
