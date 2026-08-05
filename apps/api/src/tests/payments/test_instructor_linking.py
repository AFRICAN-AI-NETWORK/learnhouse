from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from src.db.courses.courses import Course
from src.db.payments.discount_codes import (DiscountCode, DiscountCodeCreate,
                                            DiscountTypeEnum)
from src.db.resource_authors import (ResourceAuthor, ResourceAuthorshipEnum,
                                     ResourceAuthorshipStatusEnum)
from src.db.users import User
from src.services.payments.discount_codes import (DiscountValidationError,
                                                  create_discount_code,
                                                  validate_discount_code)


@pytest.fixture
def authorized_instructor(db_session: Session, mock_org) -> User:
    """Create a user with instructor role (role=3)."""
    user = User(
        username="instructor_user",
        email="instructor@example.com",
        password="hashed_password",
        user_uuid="instructor-user-uuid",
        first_name="Instructor",
        last_name="One",
        email_verified=True,
        creation_date=datetime.now(timezone.utc),
        update_date=datetime.now(timezone.utc),
        role=3,  # Instructor role
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def instructor_course(db_session: Session, mock_org, authorized_instructor) -> Course:
    """Create a course owned by the instructor."""
    course = Course(
        name="Instructor's Course",
        course_uuid="course_instructor_owned",
        org_id=mock_org.id,
        description="A course owned by an instructor",
        public=True,
        open_to_contributors=False,
        creation_date=datetime.now(timezone.utc),
        update_date=datetime.now(timezone.utc),
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Add instructor as CREATOR in ResourceAuthor
    author = ResourceAuthor(
        resource_uuid=course.course_uuid,
        user_id=authorized_instructor.id,
        authorship=ResourceAuthorshipEnum.CREATOR,
        authorship_status=ResourceAuthorshipStatusEnum.ACTIVE,
    )
    db_session.add(author)
    db_session.commit()

    return course


@pytest.mark.asyncio
async def test_instructor_can_create_code_for_owned_course(
    db_session: Session, mock_org, authorized_instructor, instructor_course
):
    # Setup
    request = MagicMock()
    discount_data = DiscountCodeCreate(
        code="INST10",
        discount_type=DiscountTypeEnum.PERCENTAGE,
        discount_value=10.0,
        valid_from=datetime.now(timezone.utc),
        course_id=instructor_course.id,
    )

    # Execute
    code = await create_discount_code(
        request, mock_org.id, discount_data, authorized_instructor, db_session
    )

    # Verify
    assert code.code == "INST10"
    assert code.course_id == instructor_course.id
    assert code.org_id == mock_org.id


@pytest.mark.asyncio
async def test_instructor_cannot_create_global_code(
    db_session: Session, mock_org, authorized_instructor
):
    # Setup
    request = MagicMock()
    discount_data = DiscountCodeCreate(
        code="GLOBAL_FAIL",
        discount_type=DiscountTypeEnum.PERCENTAGE,
        discount_value=10.0,
        valid_from=datetime.now(timezone.utc),
        # course_id is None
    )

    # Execute & Verify
    with pytest.raises(HTTPException) as excinfo:
        await create_discount_code(
            request, mock_org.id, discount_data, authorized_instructor, db_session
        )
    assert excinfo.value.status_code == 403
    assert "global" in excinfo.value.detail.lower()


@pytest.mark.asyncio
async def test_course_specific_code_enforcement(
    db_session: Session,
    mock_org,
    mock_user,
    instructor_course,
    mock_course,  # Another course not owned by instructor in this context (owned by mock_org admin by default)
):
    # Setup: Create code restricted to instructor_course
    code = DiscountCode(
        org_id=mock_org.id,
        code="COURSE_ONLY",
        discount_type=DiscountTypeEnum.FIXED,
        discount_value=50.0,
        valid_from=datetime.now(timezone.utc) - timedelta(days=1),
        course_id=instructor_course.id,
    )
    db_session.add(code)
    db_session.commit()

    # Execute & Verify: Should fail for mock_course (wrong course)
    with pytest.raises(DiscountValidationError) as excinfo:
        await validate_discount_code(
            code="COURSE_ONLY",
            org_id=mock_org.id,
            user_id=mock_user.id,
            course_id=mock_course.id,  # Wrong course
            original_amount=100.0,
            db_session=db_session,
        )
    assert "not valid for this course" in str(excinfo.value)

    # Execute & Verify: Should succeed for instructor_course (correct course)
    dc, _discount, final = await validate_discount_code(
        code="COURSE_ONLY",
        org_id=mock_org.id,
        user_id=mock_user.id,
        course_id=instructor_course.id,  # Correct course
        original_amount=100.0,
        db_session=db_session,
    )
    assert dc.id == code.id
    assert final == 50.0
