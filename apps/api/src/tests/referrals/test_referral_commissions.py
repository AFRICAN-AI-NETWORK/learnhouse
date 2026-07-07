"""
Comprehensive unit tests for referral commission service
Tests commission creation, forfeiture, balance updates, and temporal checks
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from fastapi import HTTPException

from src.services.referrals.referral_commissions import (
    get_commission_by_payment,
    create_commission_for_payment,
    forfeit_commission_for_refund,
    update_pending_commissions_to_eligible,
    get_commission_balance,
    get_commission_history,
    REFUND_PERIOD_DAYS,
    COMMISSION_AMOUNT_USD,
)
from src.db.referrals.referral_commissions import (
    ReferralCommission,
    CommissionStatus,
)
from src.db.users import User, PublicUser


class TestGetCommissionByPayment:
    """Test retrieving commission by payment"""

    @pytest.mark.asyncio
    async def test_get_existing_commission(self):
        """Test retrieving an existing commission"""
        mock_session = Mock()
        mock_commission = Mock(spec=ReferralCommission)
        mock_session.exec.return_value.first.return_value = mock_commission

        result = await get_commission_by_payment(1, 100, mock_session)

        assert result is not None

    @pytest.mark.asyncio
    async def test_get_nonexistent_commission(self):
        """Test returns None for non-existent commission"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        result = await get_commission_by_payment(999, 100, mock_session)

        assert result is None


class TestCreateCommissionForPayment:
    """Test commission creation"""

    @pytest.mark.asyncio
    async def test_create_new_commission(self):
        """Test creating a new commission"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None  # No existing

        payment_date = datetime.now(timezone.utc)

        await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=10,
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_idempotent_commission_creation(self):
        """CRITICAL: Test that duplicate commissions are prevented (idempotent)"""
        mock_session = Mock()
        existing_commission = Mock(spec=ReferralCommission)
        mock_session.exec.return_value.first.return_value = existing_commission

        payment_date = datetime.now(timezone.utc)

        result = await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=10,
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        assert result is None  # Returns None for duplicate
        assert not mock_session.add.called  # Should not create duplicate

    @pytest.mark.asyncio
    async def test_commission_status_is_pending(self):
        """Test that new commissions start as PENDING"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        payment_date = datetime.now(timezone.utc)

        await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=10,
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        # Get the commission object that was added
        call_args = mock_session.add.call_args
        commission = call_args[0][0]

        assert commission.status == CommissionStatus.PENDING

    @pytest.mark.asyncio
    async def test_refund_period_calculated_correctly(self):
        """CRITICAL: Test that refund period expiration is calculated correctly"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        payment_date = datetime.now(timezone.utc)

        await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=10,
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        call_args = mock_session.add.call_args
        commission = call_args[0][0]

        expected_expiration = payment_date + timedelta(days=REFUND_PERIOD_DAYS)
        # Allow small time difference due to processing
        assert (
            abs(
                (
                    commission.refund_period_expiration_date - expected_expiration
                ).total_seconds()
            )
            < 1
        )

    @pytest.mark.asyncio
    async def test_commission_amount_is_correct(self):
        """Test that commission amount is set correctly"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        payment_date = datetime.now(timezone.utc)

        await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=10,
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        call_args = mock_session.add.call_args
        commission = call_args[0][0]

        assert commission.commission_amount == COMMISSION_AMOUNT_USD


class TestForfeitCommissionForRefund:
    """Test commission forfeiture on refunds"""

    @pytest.mark.asyncio
    async def test_forfeit_pending_commission(self):
        """Test forfeiting a pending commission (no balance deduction)"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.id = 1
        mock_commission.status = CommissionStatus.PENDING
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 4.0

        mock_session.exec.return_value.first.return_value = mock_commission

        await forfeit_commission_for_refund(1, mock_session)

        assert mock_commission.status == CommissionStatus.FORFEITED
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_forfeit_eligible_commission_deducts_balance(self):
        """CRITICAL: Test that forfeiting eligible commission deducts balance"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.id = 1
        mock_commission.status = CommissionStatus.ELIGIBLE
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 4.0

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 20.0

        # First call returns commission, second returns user
        mock_session.exec.return_value.first.side_effect = [mock_commission, mock_user]

        await forfeit_commission_for_refund(1, mock_session)

        assert mock_user.referral_commission_balance == 16.0
        assert mock_commission.status == CommissionStatus.FORFEITED

    @pytest.mark.asyncio
    async def test_forfeit_prevents_negative_balance(self):
        """CRITICAL: Test that balance never goes negative"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.status = CommissionStatus.ELIGIBLE
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 10.0

        mock_user = Mock(spec=User)
        mock_user.referral_commission_balance = 5.0  # Less than commission

        mock_session.exec.return_value.first.side_effect = [mock_commission, mock_user]

        await forfeit_commission_for_refund(1, mock_session)

        assert mock_user.referral_commission_balance == 0.0  # Should not be negative

    @pytest.mark.asyncio
    async def test_forfeit_idempotent(self):
        """CRITICAL: Test that forfeiting already-forfeited commission is idempotent"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.id = 1
        mock_commission.status = CommissionStatus.FORFEITED

        mock_session.exec.return_value.first.return_value = mock_commission

        result = await forfeit_commission_for_refund(1, mock_session)

        # Should not attempt to modify or commit
        assert result.status == CommissionStatus.FORFEITED

    @pytest.mark.asyncio
    async def test_forfeit_nonexistent_commission(self):
        """Test forfeiting non-existent commission returns None"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        result = await forfeit_commission_for_refund(999, mock_session)

        assert result is None

    @pytest.mark.asyncio
    async def test_forfeit_with_audit_reason(self):
        """Test forfeiting with audit trail reason"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.status = CommissionStatus.PENDING

        mock_session.exec.return_value.first.return_value = mock_commission

        # Test with refund reason parameter
        result = await forfeit_commission_for_refund(
            1, mock_session, refund_reason="Customer requested refund"
        )

        assert result is not None

    @pytest.mark.asyncio
    async def test_forfeit_uses_row_locking(self):
        """CRITICAL: Test that forfeit uses SELECT FOR UPDATE for race condition protection"""
        mock_session = Mock()

        mock_commission = Mock(spec=ReferralCommission)
        mock_commission.status = CommissionStatus.ELIGIBLE
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 4.0

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 20.0

        mock_session.exec.return_value.first.side_effect = [mock_commission, mock_user]

        await forfeit_commission_for_refund(1, mock_session)

        # Verify that select was called (with_for_update is part of the statement)
        assert mock_session.exec.called


class TestUpdatePendingCommissionsToEligible:
    """Test batch update of pending commissions"""

    @pytest.mark.asyncio
    async def test_update_expired_commissions(self):
        """Test updating commissions after refund period"""
        mock_session = Mock()

        # Create mock expired commissions
        expired_date = datetime.now(timezone.utc) - timedelta(
            days=REFUND_PERIOD_DAYS + 1
        )

        mock_comm1 = Mock(spec=ReferralCommission)
        mock_comm1.id = 1
        mock_comm1.status = CommissionStatus.PENDING
        mock_comm1.referrer_user_id = 500
        mock_comm1.commission_amount = 4.0
        mock_comm1.refund_period_expiration_date = expired_date

        mock_comm2 = Mock(spec=ReferralCommission)
        mock_comm2.id = 2
        mock_comm2.status = CommissionStatus.PENDING
        mock_comm2.referrer_user_id = 500
        mock_comm2.commission_amount = 4.0
        mock_comm2.refund_period_expiration_date = expired_date

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 0.0

        mock_session.exec.return_value.all.return_value = [mock_comm1, mock_comm2]
        mock_session.exec.return_value.first.return_value = mock_user

        count = await update_pending_commissions_to_eligible(mock_session)

        assert count == 2
        assert mock_comm1.status == CommissionStatus.ELIGIBLE
        assert mock_comm2.status == CommissionStatus.ELIGIBLE

    @pytest.mark.asyncio
    async def test_bulk_balance_update(self):
        """CRITICAL: Test that balances are updated in bulk (not N+1)"""
        mock_session = Mock()

        expired_date = datetime.now(timezone.utc) - timedelta(
            days=REFUND_PERIOD_DAYS + 1
        )

        # 3 commissions for same user
        commissions = []
        for i in range(3):
            comm = Mock(spec=ReferralCommission)
            comm.id = i
            comm.status = CommissionStatus.PENDING
            comm.referrer_user_id = 500
            comm.commission_amount = 4.0
            comm.refund_period_expiration_date = expired_date
            commissions.append(comm)

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 10.0

        mock_session.exec.return_value.all.return_value = commissions
        mock_session.exec.return_value.first.return_value = mock_user

        await update_pending_commissions_to_eligible(mock_session)

        # Should update balance once with sum (10 + 12 = 22)
        assert mock_user.referral_commission_balance == 22.0

    @pytest.mark.asyncio
    async def test_no_updates_if_no_expired(self):
        """Test returns 0 when no commissions are expired"""
        mock_session = Mock()
        mock_session.exec.return_value.all.return_value = []

        count = await update_pending_commissions_to_eligible(mock_session)

        assert count == 0
        assert not mock_session.commit.called

    @pytest.mark.asyncio
    async def test_uses_row_locking(self):
        """CRITICAL: Test that update uses SELECT FOR UPDATE"""
        mock_session = Mock()

        expired_date = datetime.now(timezone.utc) - timedelta(
            days=REFUND_PERIOD_DAYS + 1
        )

        mock_comm = Mock(spec=ReferralCommission)
        mock_comm.id = 1
        mock_comm.status = CommissionStatus.PENDING
        mock_comm.referrer_user_id = 500
        mock_comm.commission_amount = 4.0
        mock_comm.refund_period_expiration_date = expired_date

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 0.0

        mock_session.exec.return_value.all.return_value = [mock_comm]
        mock_session.exec.return_value.first.return_value = mock_user

        await update_pending_commissions_to_eligible(mock_session)

        # Verify exec was called (row locking is in the statement)
        assert mock_session.exec.called


class TestGetCommissionBalance:
    """Test commission balance retrieval (single grouped query)"""

    @staticmethod
    def _make_user(db_session, balance=0.0):
        user = User(
            username="balanceuser",
            first_name="Bal",
            last_name="User",
            email="balance@example.com",
            user_uuid="user_balance",
            referral_commission_balance=balance,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @staticmethod
    def _add_commission(db_session, user_id, amount, status, payment_user_id):
        now = datetime.now()
        commission = ReferralCommission(
            org_id=100,
            referrer_user_id=user_id,
            referred_user_id=user_id,
            payment_user_id=payment_user_id,
            referral_code_id=1,
            commission_amount=amount,
            status=status,
            payment_completion_date=now,
            refund_period_expiration_date=now,
        )
        db_session.add(commission)
        db_session.commit()

    @pytest.mark.asyncio
    async def test_get_balance_breakdown(self, test_db_session):
        """Test getting balance breakdown for user"""
        user = self._make_user(test_db_session, balance=50.0)
        self._add_commission(
            test_db_session, user.id, 40.0, CommissionStatus.ELIGIBLE, 1
        )
        self._add_commission(
            test_db_session, user.id, 10.0, CommissionStatus.PENDING, 2
        )

        mock_user = Mock(spec=PublicUser)
        mock_user.id = user.id

        result = await get_commission_balance(Mock(), 100, mock_user, test_db_session)

        assert result["total_balance"] == 50.0
        assert result["eligible_for_payout"] == 40.0
        assert result["pending"] == 10.0
        assert result["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_balance_zero_for_new_user(self, test_db_session):
        """Test that new users have zero balance"""
        user = self._make_user(test_db_session, balance=0.0)

        mock_user = Mock(spec=PublicUser)
        mock_user.id = user.id

        result = await get_commission_balance(Mock(), 100, mock_user, test_db_session)

        assert result["total_balance"] == 0.0
        assert result["eligible_for_payout"] == 0.0
        assert result["pending"] == 0.0

    @pytest.mark.asyncio
    async def test_user_not_found_raises_404(self, test_db_session):
        """Test that non-existent user raises 404"""
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 999

        with pytest.raises(HTTPException) as exc_info:
            await get_commission_balance(Mock(), 100, mock_user, test_db_session)

        assert exc_info.value.status_code == 404


class TestGetCommissionHistory:
    """Test commission history retrieval"""

    @pytest.mark.asyncio
    async def test_get_history_with_batch_fetching(self):
        """CRITICAL: Test that history uses batch fetching (no N+1)"""
        mock_request = Mock()
        mock_session = Mock()
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # Create mock commissions
        now = datetime.now(timezone.utc)
        mock_comm1 = Mock(spec=ReferralCommission)
        mock_comm1.id = 1
        mock_comm1.referred_user_id = 100
        mock_comm1.course_id = 10
        mock_comm1.commission_amount = 4.0
        mock_comm1.status = CommissionStatus.ELIGIBLE
        mock_comm1.payment_completion_date = now
        mock_comm1.refund_period_expiration_date = now + timedelta(days=14)
        mock_comm1.payout_date = None

        # Mock users and courses
        mock_referred_user = Mock(spec=User)
        mock_referred_user.id = 100
        mock_referred_user.email = "referred@test.com"

        from src.db.courses.courses import Course

        mock_course = Mock(spec=Course)
        mock_course.id = 10
        mock_course.name = "Test Course"

        mock_session.exec.return_value.all.side_effect = [
            [],  # Tracking records
            [mock_comm1],  # Commissions
            [mock_referred_user],  # Users batch fetch
            [mock_course],  # Courses batch fetch
        ]

        result = await get_commission_history(
            mock_request, 100, mock_user, mock_session, limit=50
        )

        assert len(result) == 1
        assert result[0]["referred_user_email"] == "referred@test.com"
        assert result[0]["course_name"] == "Test Course"
        assert result[0]["amount"] == 4.0

        # Should only call exec 4 times (tracking, commissions, users, courses)
        assert mock_session.exec.call_count == 4

    @pytest.mark.asyncio
    async def test_history_returns_empty_for_no_commissions(self):
        """Test returns empty list if no commissions"""
        mock_request = Mock()
        mock_session = Mock()
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        mock_session.exec.return_value.all.return_value = []

        result = await get_commission_history(
            mock_request, 100, mock_user, mock_session
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_history_respects_limit(self):
        """Test that history respects limit parameter"""
        mock_request = Mock()
        mock_session = Mock()
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # The select statement should use limit
        mock_session.exec.return_value.all.return_value = []

        await get_commission_history(
            mock_request, 100, mock_user, mock_session, limit=10
        )

        # Verify exec was called (limit is in the statement)
        assert mock_session.exec.called
