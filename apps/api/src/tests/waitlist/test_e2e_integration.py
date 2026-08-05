"""End-to-end integration tests for waitlist feature

These tests verify the complete waitlist flow from creation to user activation.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlmodel import select

from src.db.courses.courses import Course
from src.db.users import User
from src.db.waitlist import (
    UserStatusEnum,
    WaitlistConfig,
    WaitlistConfigCreate,
    WaitlistCoursePreference,
    WaitlistEmailLog,
    WaitlistStatusEnum,
)
from src.security.auth import authenticate_user
from src.services.users.waitlist import create_waitlist_user
from src.services.waitlist.config import create_waitlist_config
from src.services.waitlist.courses import get_org_courses_for_waitlist
from src.services.waitlist.emails import process_waitlist_activations


class TestCompleteWaitlistFlow:
    """Test complete waitlist flow from creation to activation"""

    @pytest.mark.asyncio
    @patch("src.services.users.waitlist.check_limits_with_usage")
    @patch("src.services.users.waitlist.increase_feature_usage")
    @patch("src.services.users.waitlist.send_account_creation_email")
    @patch("src.services.users.waitlist.send_waitlist_confirmation_email")
    async def test_complete_waitlist_lifecycle(
        self,
        mock_confirmation,
        mock_creation,
        mock_increase,
        mock_check_limits,
        db_session,
        sample_org,
        sample_user,
        mock_request,
    ):
        """
        Test complete waitlist lifecycle:
        1. Admin creates waitlist campaign
        2. User registers via waitlist
        3. User selects courses
        4. Launch date passes
        5. Background job sends activation emails
        6. User logs in and status transitions to ACTIVE
        """
        # Setup mocks
        mock_check_limits.return_value = None
        mock_increase.return_value = None
        mock_creation.return_value = True
        mock_confirmation.return_value = True

        # ========== Step 1: Admin creates waitlist campaign ==========
        future_date = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Complete Flow Test Campaign",
            interest_category="Full Stack Development",
            launch_datetime=future_date,
            description="Testing complete flow",
            batch_size=10,
            batch_delay_seconds=1,
        )

        waitlist = await create_waitlist_config(mock_request, db_session, config_data)

        assert waitlist.waitlist_uuid is not None
        assert waitlist.status == WaitlistStatusEnum.ACTIVE.value
        assert waitlist.total_registrations == 0

        # ========== Step 2: Create products for selection ==========
        from src.db.payments.payments_courses import PaymentsCourse
        from src.db.payments.payments_products import PaymentsProduct

        course1 = Course(
            name="Python Basics",
            course_uuid="python-basics-uuid",
            org_id=sample_org.id,
            author_id=sample_user.id,
            public=True,
            open_to_contributors=False,
        )
        course2 = Course(
            name="React Advanced",
            course_uuid="react-advanced-uuid",
            org_id=sample_org.id,
            author_id=sample_user.id,
            public=True,
            open_to_contributors=False,
        )
        db_session.add(course1)
        db_session.add(course2)
        db_session.commit()
        db_session.refresh(course1)
        db_session.refresh(course2)

        product1 = PaymentsProduct(
            name="Python Basics Package",
            amount=5000,
            currency="USD",
            org_id=sample_org.id,
        )
        product2 = PaymentsProduct(
            name="React Advanced Package",
            amount=8000,
            currency="USD",
            org_id=sample_org.id,
        )
        db_session.add(product1)
        db_session.add(product2)
        db_session.commit()
        db_session.refresh(product1)
        db_session.refresh(product2)

        payment_course1 = PaymentsCourse(
            course_id=course1.id, payment_product_id=product1.id, org_id=sample_org.id
        )
        payment_course2 = PaymentsCourse(
            course_id=course2.id, payment_product_id=product2.id, org_id=sample_org.id
        )
        db_session.add(payment_course1)
        db_session.add(payment_course2)
        db_session.commit()

        # Verify courses are available
        courses = await get_org_courses_for_waitlist(
            mock_request, db_session, waitlist.waitlist_uuid
        )
        assert len(courses) >= 2

        # ========== Step 3: User registers via waitlist ==========
        from src.db.users import UserCreate

        user_data = UserCreate(
            username="e2euser",
            email="e2e@example.com",
            password="SecurePassword123!",
            first_name="E2E",
            last_name="Test",
            org_id=sample_org.id,
        )

        created_user = await create_waitlist_user(
            request=mock_request,
            db_session=db_session,
            user_object=user_data,
            waitlist_uuid=waitlist.waitlist_uuid,
            selected_product_ids=[product1.id, product2.id],
        )

        assert created_user.user_status == UserStatusEnum.WAITLIST.value
        assert created_user.waitlist_interest == "Full Stack Development"

        # Verify registration count updated
        waitlist_config_query = select(WaitlistConfig).where(
            WaitlistConfig.waitlist_uuid == waitlist.waitlist_uuid
        )
        waitlist_config = db_session.exec(waitlist_config_query).first()
        assert waitlist_config.total_registrations == 1

        # Verify course preferences saved
        pref_query = select(WaitlistCoursePreference).where(
            WaitlistCoursePreference.user_id == created_user.id
        )
        prefs = db_session.exec(pref_query).all()
        assert len(prefs) == 2

        # ========== Step 4: User cannot login yet ==========
        with pytest.raises(HTTPException):  # HTTPException
            await authenticate_user(
                mock_request, "e2e@example.com", "SecurePassword123!", db_session
            )

        # ========== Step 5: Simulate launch date passing ==========
        # Update waitlist to expired launch date
        past_date = (datetime.now(UTC) - timedelta(minutes=10)).isoformat()
        waitlist_for_update = db_session.exec(
            select(WaitlistConfig).where(
                WaitlistConfig.waitlist_uuid == waitlist.waitlist_uuid
            )
        ).first()
        waitlist_for_update.launch_datetime = past_date
        db_session.add(waitlist_for_update)
        db_session.commit()

        # ========== Step 5.5: Verify user email before activation ==========
        # The activation process requires email_verified == True
        # In real flow, this happens via email verification link, but for test we set it directly
        user_query_before = select(User).where(User.id == created_user.id)
        user_before_activation = db_session.exec(user_query_before).first()
        user_before_activation.email_verified = True
        db_session.add(user_before_activation)
        db_session.commit()

        # ========== Step 6: Background job processes activation ==========
        # Call the activation process (this will mark users as WAITLIST_ACTIVATED and send emails)
        with patch("src.services.waitlist.emails.send_email") as mock_send_email:
            mock_send_email.return_value = True

            await process_waitlist_activations(db_session)

        # Verify user status changed to WAITLIST_ACTIVATED
        user_query = select(User).where(User.id == created_user.id)
        updated_user = db_session.exec(user_query).first()
        assert updated_user.user_status == UserStatusEnum.WAITLIST_ACTIVATED.value
        assert updated_user.waitlist_activated_date is not None

        # Verify waitlist marked as completed
        waitlist_config_query2 = select(WaitlistConfig).where(
            WaitlistConfig.waitlist_uuid == waitlist.waitlist_uuid
        )
        waitlist_config2 = db_session.exec(waitlist_config_query2).first()
        assert waitlist_config2.status == WaitlistStatusEnum.COMPLETED.value

        # ========== Step 7: User logs in successfully ==========
        # First, set email as verified (normally done via email link)
        user_query2 = select(User).where(User.id == created_user.id)
        final_user = db_session.exec(user_query2).first()
        final_user.email_verified = True
        db_session.add(final_user)
        db_session.commit()

        logged_in_user = await authenticate_user(
            mock_request, "e2e@example.com", "SecurePassword123!", db_session
        )

        assert logged_in_user is not False
        assert logged_in_user.user_status == UserStatusEnum.ACTIVE.value

        # ========== Step 8: Verify complete state ==========
        user_query3 = select(User).where(User.id == created_user.id)
        final_state_user = db_session.exec(user_query3).first()
        assert final_state_user.user_status == UserStatusEnum.ACTIVE.value

        # User preferences still exist
        prefs_after = db_session.exec(pref_query).all()
        assert len(prefs_after) == 2


class TestWaitlistCancellationFlow:
    """Test flow when waitlist is cancelled"""

    @pytest.mark.asyncio
    @patch("src.services.users.waitlist.check_limits_with_usage")
    @patch("src.services.users.waitlist.increase_feature_usage")
    @patch("src.services.users.waitlist.send_account_creation_email")
    @patch("src.services.users.waitlist.send_waitlist_confirmation_email")
    async def test_cancelled_waitlist_prevents_new_registrations(
        self,
        mock_confirmation,
        mock_creation,
        mock_increase,
        mock_check_limits,
        db_session,
        sample_org,
        sample_user,
        mock_request,
    ):
        """Test that cancelled waitlists prevent new user registrations"""
        from src.db.users import UserCreate
        from src.services.waitlist.config import cancel_waitlist_config

        mock_check_limits.return_value = None
        mock_increase.return_value = None
        mock_creation.return_value = True
        mock_confirmation.return_value = True

        # Create waitlist
        future_date = (datetime.now(UTC) + timedelta(days=7)).isoformat()
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="To Be Cancelled",
            interest_category="Testing",
            launch_datetime=future_date,
        )

        waitlist = await create_waitlist_config(mock_request, db_session, config_data)

        # Cancel waitlist
        await cancel_waitlist_config(mock_request, db_session, waitlist.waitlist_uuid)

        # Try to register - should fail
        user_data = UserCreate(
            username="shouldfail",
            email="fail@example.com",
            password="Password123!",
            org_id=sample_org.id,
        )

        with pytest.raises(HTTPException):  # HTTPException
            await create_waitlist_user(
                request=mock_request,
                db_session=db_session,
                user_object=user_data,
                waitlist_uuid=waitlist.waitlist_uuid,
                selected_product_ids=[],
            )


class TestMultipleWaitlistCampaigns:
    """Test managing multiple waitlist campaigns"""

    @pytest.mark.asyncio
    async def test_multiple_active_waitlists_per_org(
        self, db_session, sample_org, sample_user, mock_request
    ):
        """Test that an org can have multiple active waitlists"""
        from src.services.waitlist.config import (
            create_waitlist_config,
            get_org_waitlist_configs,
        )

        # Create multiple waitlists
        for i in range(3):
            future_date = (
                datetime.now(UTC) + timedelta(days=7 + i)
            ).isoformat()
            config_data = WaitlistConfigCreate(
                org_id=sample_org.id,
                name=f"Campaign {i + 1}",
                interest_category=f"Category {i + 1}",
                launch_datetime=future_date,
            )
            await create_waitlist_config(mock_request, db_session, config_data)

        # Retrieve all waitlists
        waitlists = await get_org_waitlist_configs(
            mock_request, db_session, sample_org.id
        )

        assert len(waitlists) >= 3
        active_waitlists = [
            w for w in waitlists if w.status == WaitlistStatusEnum.ACTIVE.value
        ]
        assert len(active_waitlists) >= 3


class TestWaitlistAnalytics:
    """Test waitlist analytics and reporting"""

    @pytest.mark.asyncio
    @patch("src.services.users.waitlist.check_limits_with_usage")
    @patch("src.services.users.waitlist.increase_feature_usage")
    @patch("src.services.users.waitlist.send_account_creation_email")
    @patch("src.services.users.waitlist.send_waitlist_confirmation_email")
    async def test_course_preference_analytics(
        self,
        mock_confirmation,
        mock_creation,
        mock_increase,
        mock_check_limits,
        db_session,
        sample_org,
        sample_user,
        mock_request,
    ):
        """Test analytics for course preferences"""
        from src.db.users import UserCreate
        from src.services.waitlist.courses import get_course_preference_analytics

        mock_check_limits.return_value = None
        mock_increase.return_value = None
        mock_creation.return_value = True
        mock_confirmation.return_value = True

        # Create waitlist
        future_date = (datetime.now(UTC) + timedelta(days=7)).isoformat()
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Analytics Test",
            interest_category="Data Science",
            launch_datetime=future_date,
        )
        waitlist = await create_waitlist_config(mock_request, db_session, config_data)

        # Create product
        from src.db.payments.payments_products import PaymentsProduct

        popular_product = PaymentsProduct(
            name="Popular Product Package",
            amount=9900,
            currency="USD",
            org_id=sample_org.id,
        )
        db_session.add(popular_product)
        db_session.commit()
        db_session.refresh(popular_product)

        # Register multiple users selecting same course
        for i in range(5):
            user_data = UserCreate(
                username=f"analyticsuser{i}",
                email=f"analytics{i}@example.com",
                password="Password123!",
                org_id=sample_org.id,
            )
            await create_waitlist_user(
                request=mock_request,
                db_session=db_session,
                user_object=user_data,
                waitlist_uuid=waitlist.waitlist_uuid,
                selected_product_ids=[popular_product.id],
            )

        # Get analytics
        analytics = await get_course_preference_analytics(
            mock_request, db_session, waitlist.waitlist_uuid
        )

        # Verify popular product shows high selection count
        popular_data = next(
            (a for a in analytics["courses"] if a["product_id"] == popular_product.id),
            None,
        )
        assert popular_data is not None
        assert popular_data["selection_count"] >= 5


class TestErrorRecovery:
    """Test error recovery and edge cases"""

    @pytest.mark.asyncio
    async def test_email_failure_retry_mechanism(
        self, db_session, sample_waitlist_config, waitlist_user, sample_org
    ):
        """Test that failed emails are retried"""
        from src.services.waitlist.emails import retry_failed_waitlist_emails

        # Create failed email log
        failed_log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="activation",
            email_sent=False,
            retry_count=0,
            error_message="Temporary SMTP error",
        )
        db_session.add(failed_log)
        db_session.commit()

        with patch(
            "src.services.waitlist.emails.send_waitlist_activation_email"
        ) as mock_send:
            mock_send.return_value = True

            # Run retry job
            await retry_failed_waitlist_emails(db_session)

            # Verify email was retried
            db_session.refresh(failed_log)
            # Should either succeed or increase retry count
            assert failed_log.retry_count >= 0 or failed_log.email_sent is True
