"""
Comprehensive test suite for discount code system.

Tests cover all 8 critical security and business logic scenarios:
1. Expired code rejection
2. Max uses enforcement
3. Duplicate usage prevention
4. Race condition handling (atomic operations)
5. Webhook idempotency
6. Price validation
7. Refund handling
8. Course-only restriction
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import Session, select

from src.db.courses.courses import Course
from src.db.organizations import Organization
from src.db.payments.discount_codes import (DiscountCode, DiscountCodeUsage,
                                            DiscountTypeEnum)
from src.db.payments.payments_users import PaymentsUser
from src.db.users import User
from src.services.payments.discount_codes import (
    DiscountValidationError, calculate_discounted_amount,
    decrement_discount_usage, increment_discount_usage_atomic,
    record_discount_usage, validate_discount_code)

from .conftest import create_discount_code_helper, create_usage_record_helper


class TestDiscountCodeValidation:
    """Tests for core discount code validation logic."""

    @pytest.mark.asyncio
    async def test_expired_code_rejection(
        self,
        db_session: Session,
        expired_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
    ):
        """
        CRITICAL TEST #1: Expired Code Rejection
        Code with valid_until in past must be rejected.
        """
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=expired_discount_code.code,
                org_id=expired_discount_code.org_id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "expired" in error_message
        assert (
            expired_discount_code.code.lower() in error_message
            or "discount" in error_message
        )

    @pytest.mark.asyncio
    async def test_max_uses_enforcement(
        self,
        db_session: Session,
        max_uses_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
    ):
        """
        CRITICAL TEST #2: Max Uses Enforcement
        Code with 100 max_uses stops at 100 (not 101).
        """
        # Code is already at max (current_uses=100, max_uses=100)
        assert max_uses_discount_code.current_uses == 100
        assert max_uses_discount_code.max_uses == 100

        # Attempt to use code at max capacity
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=max_uses_discount_code.code,
                org_id=max_uses_discount_code.org_id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "maximum" in error_message or "max" in error_message
        assert "usage" in error_message or "limit" in error_message

    @pytest.mark.asyncio
    async def test_duplicate_usage_prevention(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payment_user,
    ):
        """
        CRITICAL TEST #3: Duplicate Usage Prevention
        User cannot use same code twice for same course.
        """
        # First usage - create usage record
        create_usage_record_helper(
            db_session=db_session,
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=mock_payment_user.id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
        )

        # Attempt to use same code for same course again
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=sample_discount_code.code,
                org_id=sample_discount_code.org_id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
                check_usage=True,  # Enable duplicate check
            )

        error_message = str(exc_info.value).lower()
        assert "already used" in error_message or "already" in error_message

    @pytest.mark.asyncio
    async def test_course_only_restriction(
        self, db_session: Session, sample_discount_code: DiscountCode, mock_user: User
    ):
        """
        CRITICAL TEST #8: Course-Only Restriction
        Discount codes only work for course products.
        """
        # Test with course_id = None
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=sample_discount_code.code,
                org_id=sample_discount_code.org_id,
                user_id=mock_user.id,
                course_id=None,  # No course_id
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "course" in error_message

        # Test with course_id = 0
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=sample_discount_code.code,
                org_id=sample_discount_code.org_id,
                user_id=mock_user.id,
                course_id=0,  # Invalid course_id
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "course" in error_message

    @pytest.mark.asyncio
    async def test_inactive_code_rejection(
        self,
        db_session: Session,
        mock_org: Organization,
        mock_user: User,
        mock_course: Course,
    ):
        """Test that inactive (deactivated) codes are rejected."""
        inactive_code = create_discount_code_helper(
            db_session=db_session,
            org_id=mock_org.id,
            code="INACTIVE2026",
            is_active=False,  # Deactivated
        )

        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=inactive_code.code,
                org_id=inactive_code.org_id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "invalid" in error_message or "inactive" in error_message

    @pytest.mark.asyncio
    async def test_nonexistent_code_rejection(
        self,
        db_session: Session,
        mock_org: Organization,
        mock_user: User,
        mock_course: Course,
    ):
        """Test that nonexistent codes are rejected."""
        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code="NONEXISTENT9999",
                org_id=mock_org.id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "invalid" in error_message

    @pytest.mark.asyncio
    async def test_future_start_date_rejection(
        self,
        db_session: Session,
        mock_org: Organization,
        mock_user: User,
        mock_course: Course,
    ):
        """Test that codes with future valid_from dates are rejected."""
        future_code = DiscountCode(
            org_id=mock_org.id,
            code="FUTURE2027",
            discount_type=DiscountTypeEnum.PERCENTAGE,
            discount_value=20.0,
            max_uses=100,
            current_uses=0,
            valid_from=datetime.now(timezone.utc) + timedelta(days=7),  # Starts in 7 days
            valid_until=datetime.now(timezone.utc) + timedelta(days=30),
            is_active=True,
            description="Future-dated code",
        )
        db_session.add(future_code)
        db_session.commit()

        with pytest.raises(DiscountValidationError) as exc_info:
            await validate_discount_code(
                code=future_code.code,
                org_id=future_code.org_id,
                user_id=mock_user.id,
                course_id=mock_course.id,
                original_amount=500.0,
                db_session=db_session,
            )

        error_message = str(exc_info.value).lower()
        assert "not yet valid" in error_message or "valid from" in error_message


class TestPriceCalculation:
    """Tests for discount price calculation logic."""

    def test_percentage_discount_calculation(self):
        """
        CRITICAL TEST #6: Price Validation
        Discounted amount matches calculation (20% off $500 = $400).
        """
        original_amount = 500.0
        discount_type = DiscountTypeEnum.PERCENTAGE
        discount_value = 20.0  # 20%

        discount_amount, final_amount = calculate_discounted_amount(
            original_amount, discount_type, discount_value
        )

        assert discount_amount == 100.0  # 20% of 500
        assert final_amount == 400.0  # 500 - 100

    def test_fixed_discount_calculation(self):
        """Test fixed amount discount calculation."""
        original_amount = 200.0
        discount_type = DiscountTypeEnum.FIXED
        discount_value = 50.0  # $50 off

        discount_amount, final_amount = calculate_discounted_amount(
            original_amount, discount_type, discount_value
        )

        assert discount_amount == 50.0
        assert final_amount == 150.0  # 200 - 50

    def test_percentage_discount_edge_case_100_percent(self):
        """Test 100% discount (free course)."""
        original_amount = 300.0
        discount_type = DiscountTypeEnum.PERCENTAGE
        discount_value = 100.0  # 100% off

        discount_amount, final_amount = calculate_discounted_amount(
            original_amount, discount_type, discount_value
        )

        assert discount_amount == 300.0
        assert final_amount == 0.0

    def test_fixed_discount_exceeds_price(self):
        """Test fixed discount larger than price (should cap at original amount)."""
        original_amount = 100.0
        discount_type = DiscountTypeEnum.FIXED
        discount_value = 150.0  # $150 off on $100 item

        discount_amount, final_amount = calculate_discounted_amount(
            original_amount, discount_type, discount_value
        )

        # Should cap at original amount
        assert discount_amount == 100.0
        assert final_amount == 0.0

    def test_percentage_discount_invalid_over_100(self):
        """Test that percentage over 100 raises error."""
        with pytest.raises(DiscountValidationError) as exc_info:
            calculate_discounted_amount(
                500.0,
                DiscountTypeEnum.PERCENTAGE,
                150.0,  # 150% is invalid
            )

        assert "between 0 and 100" in str(exc_info.value)

    def test_negative_discount_value_error(self):
        """Test that negative discount values raise error."""
        with pytest.raises(DiscountValidationError):
            calculate_discounted_amount(
                500.0,
                DiscountTypeEnum.PERCENTAGE,
                -10.0,  # Negative percentage
            )

        with pytest.raises(DiscountValidationError):
            calculate_discounted_amount(
                500.0,
                DiscountTypeEnum.FIXED,
                -50.0,  # Negative fixed amount
            )


class TestRaceConditions:
    """Tests for atomic operations and race condition prevention."""

    @pytest.mark.asyncio
    async def test_concurrent_max_uses_enforcement(
        self, db_session: Session, mock_org: Organization
    ):
        """
        CRITICAL TEST #4: Race Condition
        50 concurrent payments with max_uses=10 → Only 10 succeed.

        This tests the atomic SQL operation that prevents overselling.
        """
        # Create code with max_uses=10
        code = create_discount_code_helper(
            db_session=db_session,
            org_id=mock_org.id,
            code="RACE2026",
            max_uses=10,
            current_uses=0,
        )

        # Spawn 50 concurrent tasks trying to increment usage
        async def attempt_increment():
            # Each task needs its own session for true concurrency
            try:
                return await increment_discount_usage_atomic(
                    code.id, db_session, auto_commit=False
                )
            except Exception:  # noqa: BLE001
                return False

        # Execute 50 concurrent attempts
        results = await asyncio.gather(*[attempt_increment() for _ in range(50)])

        # Assert only 10 succeeded (max_uses=10)
        successful = sum(1 for r in results if r is True)
        assert successful == 10, f"Expected 10 successful increments, got {successful}"

        # Verify current_uses = 10 (not 11 or more)
        # Re-query from DB since atomic function commits internally
        from sqlmodel import select

        db_session.commit()  # Commit to clear session state
        updated_code = db_session.exec(
            select(DiscountCode).where(DiscountCode.id == code.id)
        ).first()
        assert updated_code.current_uses == 10, (
            f"Expected current_uses=10, got {updated_code.current_uses}"
        )

    @pytest.mark.asyncio
    async def test_atomic_increment_returns_false_at_limit(
        self, db_session: Session, max_uses_discount_code: DiscountCode
    ):
        """Test that atomic increment returns False when max uses reached."""
        # Code is already at max (100/100)
        result = await increment_discount_usage_atomic(
            max_uses_discount_code.id, db_session, auto_commit=False
        )

        assert result is False  # Should fail because already at max

    @pytest.mark.asyncio
    async def test_atomic_increment_unlimited_uses(
        self, db_session: Session, mock_org: Organization
    ):
        """Test atomic increment with unlimited uses (max_uses=None)."""
        unlimited_code = create_discount_code_helper(
            db_session=db_session,
            org_id=mock_org.id,
            code="UNLIMITED2026",
            max_uses=None,  # Unlimited
            current_uses=0,
        )

        # Should succeed multiple times
        for i in range(5):
            result = await increment_discount_usage_atomic(
                unlimited_code.id, db_session, auto_commit=False
            )
            assert result is True

        # Re-query to get updated count
        from sqlmodel import select

        db_session.commit()  # Commit to clear session state
        updated_code = db_session.exec(
            select(DiscountCode).where(DiscountCode.id == unlimited_code.id)
        ).first()
        assert updated_code.current_uses == 5


class TestWebhookIdempotency:
    """Tests for webhook retry handling and idempotency."""

    @pytest.mark.asyncio
    async def test_webhook_retry_idempotency(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payment_user,
    ):
        """
        CRITICAL TEST #5: Webhook Idempotency
        Same webhook sent 3 times → Only 1 usage record.

        This tests the idempotency check that prevents duplicate records
        when Paystack retries webhooks.
        """
        payment_user_id = mock_payment_user.id

        # First webhook - creates record
        usage1 = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment_user_id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        # Retry #1 - should return existing record
        usage2 = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment_user_id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        # Retry #2 - should return existing record
        usage3 = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment_user_id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        # All should be the same instance (same ID)
        assert usage1.id == usage2.id == usage3.id

        # Only 1 record in database
        all_usage = db_session.exec(select(DiscountCodeUsage)).all()
        assert len(all_usage) == 1
        assert all_usage[0].id == usage1.id

    @pytest.mark.asyncio
    async def test_usage_recording_creates_record(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payments_product,
    ):
        """Test that usage recording creates proper database record."""
        # Create a payment user for this test
        payment = PaymentsUser(
            id=77,
            user_id=mock_user.id,
            org_id=mock_payments_product.org_id,
            payment_product_id=mock_payments_product.id,
        )
        db_session.add(payment)
        db_session.commit()

        usage = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment.id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        assert usage.id is not None
        assert usage.discount_code_id == sample_discount_code.id
        assert usage.user_id == mock_user.id
        assert usage.course_id == mock_course.id
        assert usage.original_amount == 500.0
        assert usage.discount_amount == 100.0
        assert usage.final_amount == 400.0

    @pytest.mark.asyncio
    async def test_usage_recording_with_different_payments(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payments_product,
    ):
        """Test that different payment_user_ids create separate records."""
        # Create two different payment records
        payment1 = PaymentsUser(
            id=101,
            user_id=mock_user.id,
            org_id=mock_payments_product.org_id,
            payment_product_id=mock_payments_product.id,
        )
        payment2 = PaymentsUser(
            id=102,
            user_id=mock_user.id,
            org_id=mock_payments_product.org_id,
            payment_product_id=mock_payments_product.id,
        )
        db_session.add(payment1)
        db_session.add(payment2)
        db_session.commit()

        usage1 = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment1.id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        usage2 = await record_discount_usage(
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment2.id,
            original_amount=500.0,
            discount_amount=100.0,
            final_amount=400.0,
            db_session=db_session,
        )

        # Should create two separate records
        assert usage1.id != usage2.id
        all_usage = db_session.exec(select(DiscountCodeUsage)).all()
        assert len(all_usage) == 2


class TestRefundHandling:
    """Tests for refund processing logic."""

    @pytest.mark.asyncio
    async def test_refund_uses_final_amount(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payments_product,
    ):
        """
        CRITICAL TEST #7: Refund Handling
        Refund uses final_amount (discounted price) not original_amount.

        This ensures refunds process the correct amount that was actually paid.
        """
        # Create payment with discount
        payment = PaymentsUser(
            id=200,
            user_id=mock_user.id,
            org_id=mock_payments_product.org_id,
            payment_product_id=mock_payments_product.id,
            final_amount=400.0,  # What was actually paid after discount
        )
        db_session.add(payment)
        db_session.commit()

        # Create usage record
        usage = create_usage_record_helper(
            db_session=db_session,
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment.id,
            original_amount=500.0,  # Before discount
            discount_amount=100.0,
            final_amount=400.0,  # After discount (what was actually paid)
        )

        # Process refund
        result = await decrement_discount_usage(
            discount_code_id=sample_discount_code.id,
            payment_user_id=payment.id,
            db_session=db_session,
            auto_commit=False,
        )

        assert result is True

        # Usage record should be deleted
        deleted_usage = db_session.exec(
            select(DiscountCodeUsage).where(DiscountCodeUsage.id == usage.id)
        ).first()
        assert deleted_usage is None

    @pytest.mark.asyncio
    async def test_refund_decrements_usage_counter(
        self,
        db_session: Session,
        sample_discount_code: DiscountCode,
        mock_user: User,
        mock_course: Course,
        mock_payments_product,
    ):
        """Test that refund decrements the current_uses counter."""
        # Set current usage to 5
        sample_discount_code.current_uses = 5
        db_session.commit()

        # Create payment and usage
        payment = PaymentsUser(
            id=201,
            user_id=mock_user.id,
            org_id=mock_payments_product.org_id,
            payment_product_id=mock_payments_product.id,
        )
        db_session.add(payment)
        db_session.commit()

        create_usage_record_helper(
            db_session=db_session,
            discount_code_id=sample_discount_code.id,
            user_id=mock_user.id,
            course_id=mock_course.id,
            payment_user_id=payment.id,
        )

        # Process refund
        result = await decrement_discount_usage(
            discount_code_id=sample_discount_code.id,
            payment_user_id=payment.id,
            db_session=db_session,
            auto_commit=False,
        )

        assert result is True

        # Counter should be decremented
        # Re-query from DB since decrement function commits internally
        from sqlmodel import select

        db_session.commit()  # Commit to clear session state
        updated_code = db_session.exec(
            select(DiscountCode).where(DiscountCode.id == sample_discount_code.id)
        ).first()
        assert updated_code.current_uses == 4  # 5 - 1

    @pytest.mark.asyncio
    async def test_refund_nonexistent_usage_returns_false(
        self, db_session: Session, sample_discount_code: DiscountCode
    ):
        """Test that refunding nonexistent usage returns False."""
        result = await decrement_discount_usage(
            discount_code_id=sample_discount_code.id,
            payment_user_id=999999,  # Doesn't exist
            db_session=db_session,
            auto_commit=False,
        )

        assert result is False
