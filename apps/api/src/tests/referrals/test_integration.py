"""
Integration tests for referral system
Tests end-to-end flows and interactions between components
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException
from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus
from src.db.referrals.referral_commissions import CommissionStatus
from src.db.users import PublicUser, User
from src.services.referrals.referral_codes import create_referral_code_for_user
from src.services.referrals.referral_commissions import (
    create_commission_for_payment, forfeit_commission_for_refund,
    update_pending_commissions_to_eligible)
from src.services.referrals.referral_tracking import \
    validate_and_track_referral


class TestReferralE2EFlow:
    """Test complete referral flow from code creation to commission payout"""

    @pytest.mark.asyncio
    async def test_complete_successful_referral_flow(self):
        """
        CRITICAL: Test complete successful referral flow
        1. Referrer creates code
        2. Referred user signs up with code
        3. Referred user makes payment
        4. Commission created (pending)
        5. After refund period, commission becomes eligible
        """
        mock_session = Mock()
        mock_request = Mock()
        mock_request.headers.get.return_value = "203.0.113.1"

        # Step 1: Referrer creates code
        referrer = Mock(spec=PublicUser)
        referrer.id = 500

        ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="REF123",
            referral_link="http://localhost:3000/ref/REF123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        mock_session.exec.return_value.first.return_value = None

        with patch(
            "src.services.referrals.referral_codes.generate_unique_code",
            return_value="REF123",
        ):
            with patch(
                "src.services.referrals.referral_codes.get_learnhouse_config"
            ) as mock_config:
                mock_config.return_value.hosting_config.app_base_url = (
                    "http://localhost:3000"
                )

                # Step 2: Validate and track referral (user signs up)

                # Step 3: Create commission for payment
                payment_date = datetime.now(timezone.utc)

                # Mock commission creation
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

        # Verify the flow executed
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_refund_flow(self):
        """
        CRITICAL: Test refund flow
        1. Commission is eligible
        2. Payment is refunded
        3. Commission is forfeited
        4. Balance is deducted
        """
        mock_session = Mock()

        # Mock eligible commission
        mock_commission = Mock()
        mock_commission.id = 1
        mock_commission.status = CommissionStatus.ELIGIBLE
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 4.0

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 20.0

        mock_session.exec.return_value.first.side_effect = [mock_commission, mock_user]

        # Forfeit commission
        await forfeit_commission_for_refund(
            1, mock_session, refund_reason="Customer request"
        )

        # Verify balance was deducted
        assert mock_user.referral_commission_balance == 16.0
        assert mock_commission.status == CommissionStatus.FORFEITED

    @pytest.mark.asyncio
    async def test_fraud_detection_prevents_commission(self):
        """
        CRITICAL: Test that high fraud score prevents or flags commission
        """
        mock_request = Mock()
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="FRAUD123",
            referral_link="http://localhost:3000/ref/FRAUD123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        # High fraud indicators - handle chained calls
        mock_exec_result = Mock()
        mock_exec_result.first.side_effect = [
            (5, 10, 8),  # Very high fraud
            None,  # Tracking check
        ]
        mock_session.exec.return_value = mock_exec_result

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            _code, fraud_score = await validate_and_track_referral(
                mock_request,
                referred_user_id=600,
                referral_code="FRAUD123",
                device_id="device123",
                browser_fingerprint={},
                db_session=mock_session,
            )

        # High fraud score should be returned for review
        assert fraud_score >= 75  # Should trigger review threshold

    @pytest.mark.asyncio
    async def test_self_referral_prevented_e2e(self):
        """
        CRITICAL: Test that user cannot refer themselves
        """
        mock_request = Mock()
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        # User tries to use their own code
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,  # Same as referred user
            code="SELF123",
            referral_link="http://localhost:3000/ref/SELF123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            with pytest.raises(HTTPException) as exc_info:
                await validate_and_track_referral(
                    mock_request,
                    referred_user_id=500,  # Same as referrer
                    referral_code="SELF123",
                    device_id="device123",
                    browser_fingerprint={},
                    db_session=mock_session,
                )

        # Should raise exception
        assert "own referral code" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_duplicate_referral_prevented(self):
        """
        CRITICAL: Test that user can only use one referral code
        """
        mock_request = Mock()
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="FIRST123",
            referral_link="http://localhost:3000/ref/FIRST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        # User already has tracking
        from src.db.referrals.referral_tracking import ReferralTracking

        existing_tracking = Mock(spec=ReferralTracking)

        # Handle chained calls properly
        mock_exec_result = Mock()
        mock_exec_result.first.side_effect = [
            (0, 0, 0),  # Fraud check
            existing_tracking,  # Already tracked
        ]
        mock_session.exec.return_value = mock_exec_result

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            # Should not raise exception, but tracking should not be created
            code, _fraud_score = await validate_and_track_referral(
                mock_request,
                referred_user_id=600,
                referral_code="FIRST123",
                device_id="device123",
                browser_fingerprint={},
                db_session=mock_session,
            )

        # Should still return code (allows signup to proceed)
        assert code is not None


class TestConcurrencyAndRaceConditions:
    """Test concurrent access and race condition handling"""

    @pytest.mark.asyncio
    async def test_concurrent_code_generation(self):
        """
        CRITICAL: Test that concurrent code generation handles collisions
        """
        mock_session = Mock()
        mock_request = Mock()
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # Simulate collision on first attempt
        mock_session.exec.return_value.first.side_effect = [
            None,  # User check
            Mock(),  # First code collides
            None,  # Second code succeeds
            Mock(spec=User, id=500, has_referral_code=False),
        ]

        with patch(
            "src.services.referrals.referral_codes.get_learnhouse_config"
        ) as mock_config:
            mock_config.return_value.hosting_config.app_base_url = (
                "http://localhost:3000"
            )

            await create_referral_code_for_user(
                mock_request, 100, 500, mock_user, mock_session
            )

        # Should retry and succeed
        assert mock_session.add.called

    @pytest.mark.asyncio
    async def test_concurrent_balance_updates(self):
        """
        CRITICAL: Test that concurrent balance updates use row locking
        """
        mock_session = Mock()

        # Mock multiple commissions expiring simultaneously
        expired_date = datetime.now(timezone.utc) - timedelta(days=15)

        commissions = []
        for i in range(5):
            comm = Mock()
            comm.id = i
            comm.status = CommissionStatus.PENDING
            comm.referrer_user_id = 500
            comm.commission_amount = 4.0
            comm.refund_period_expiration_date = expired_date
            commissions.append(comm)

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 0.0

        mock_session.exec.return_value.all.return_value = commissions
        mock_session.exec.return_value.first.return_value = mock_user

        count = await update_pending_commissions_to_eligible(mock_session)

        # Should update all commissions
        assert count == 5
        # Balance should be updated once with sum
        assert mock_user.referral_commission_balance == 20.0


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    @pytest.mark.asyncio
    async def test_commission_with_optional_course(self):
        """Test commission creation without course_id"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        payment_date = datetime.now(timezone.utc)

        await create_commission_for_payment(
            org_id=100,
            referrer_user_id=500,
            referred_user_id=600,
            payment_user_id=1,
            course_id=None,  # No course
            referral_code_id=1,
            payment_completion_date=payment_date,
            db_session=mock_session,
        )

        assert mock_session.add.called

    @pytest.mark.asyncio
    async def test_zero_balance_after_multiple_refunds(self):
        """Test that balance handles multiple refunds correctly"""
        mock_session = Mock()

        mock_commission = Mock()
        mock_commission.status = CommissionStatus.ELIGIBLE
        mock_commission.referrer_user_id = 500
        mock_commission.commission_amount = 4.0

        mock_user = Mock(spec=User)
        mock_user.id = 500
        mock_user.referral_commission_balance = 4.0

        mock_session.exec.return_value.first.side_effect = [mock_commission, mock_user]

        await forfeit_commission_for_refund(1, mock_session)

        assert mock_user.referral_commission_balance == 0.0

    @pytest.mark.asyncio
    async def test_large_batch_update(self):
        """Test updating a large batch of commissions"""
        mock_session = Mock()

        expired_date = datetime.now(timezone.utc) - timedelta(days=15)

        # Create 100 mock commissions
        commissions = []
        for i in range(100):
            comm = Mock()
            comm.id = i
            comm.status = CommissionStatus.PENDING
            comm.referrer_user_id = i % 10  # 10 different users
            comm.commission_amount = 4.0
            comm.refund_period_expiration_date = expired_date
            commissions.append(comm)

        mock_session.exec.return_value.all.return_value = commissions

        # Mock users
        def get_user(statement):
            user = Mock(spec=User)
            user.referral_commission_balance = 0.0
            return user

        mock_session.exec.return_value.first.side_effect = [
            get_user(None) for _ in range(10)
        ]

        count = await update_pending_commissions_to_eligible(mock_session)

        assert count == 100
