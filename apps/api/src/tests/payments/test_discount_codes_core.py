"""
Simplified test suite for core discount code logic.

This test suite focuses on testing the critical discount code functionality
that doesn't require complex Payment User schema dependencies:
- Price calculations (CRITICAL TEST #6)
- Code validation (expiry, max uses, etc.)
- Atomic operations for race conditions (CRITICAL TEST #4)

Tests requiring PaymentsProduct/PaymentsUser integration will be added
after those schema issues are resolved.
"""

import asyncio

import pytest
from sqlmodel import Session

from src.db.organizations import Organization
from src.db.payments.discount_codes import DiscountCode, DiscountTypeEnum
from src.services.payments.discount_codes import (
    DiscountValidationError,
    calculate_discounted_amount,
    increment_discount_usage_atomic,
)

from .conftest import create_discount_code_helper


class TestPriceCalculation:
    """Tests for discount price calculation logic - CRITICAL TEST #6."""

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
    """Tests for atomic operations and race condition prevention - CRITICAL TEST #4."""

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
        """CRITICAL TEST #2: Max Uses Enforcement - Atomic operation test."""
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
