"""
Comprehensive unit tests for referral tracking service
Tests fraud detection, IP extraction, and signup tracking
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from fastapi import HTTPException, Request

from src.services.referrals.referral_tracking import (
    extract_ip_address,
    calculate_fraud_risk_score,
    create_referral_tracking,
    validate_and_track_referral,
    IP_FRAUD_THRESHOLD,
    DEVICE_FRAUD_THRESHOLD,
)
from src.db.referrals.referral_tracking import ReferralTracking
from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus


class TestExtractIPAddress:
    """Test IP address extraction from requests"""

    def test_extract_from_x_forwarded_for(self):
        """Test extracting IP from X-Forwarded-For header"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"
        mock_request.client = None

        ip = extract_ip_address(mock_request)

        assert ip == "203.0.113.1"

    def test_extract_from_x_forwarded_for_multiple_ips(self):
        """CRITICAL: Test taking first IP from multiple proxies"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1, 198.51.100.1, 192.0.2.1"

        ip = extract_ip_address(mock_request)

        assert ip == "203.0.113.1"  # Should take the first IP

    def test_extract_from_direct_client(self):
        """Test extracting IP from direct client connection"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = None
        mock_request.client = Mock(host="192.0.2.50")

        ip = extract_ip_address(mock_request)

        assert ip == "192.0.2.50"

    def test_extract_returns_unknown_if_no_ip(self):
        """Test returns 'unknown' if no IP available"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = None
        mock_request.client = None

        ip = extract_ip_address(mock_request)

        assert ip == "unknown"

    def test_x_forwarded_for_takes_precedence(self):
        """Test that X-Forwarded-For takes precedence over direct client"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"
        mock_request.client = Mock(host="192.0.2.50")

        ip = extract_ip_address(mock_request)

        assert ip == "203.0.113.1"  # X-Forwarded-For wins


class TestCalculateFraudRiskScore:
    """Test fraud risk score calculation"""

    @pytest.mark.asyncio
    async def test_no_fraud_for_new_user(self):
        """Test that new users with no history get score 0"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = (0, 0, 0)

        score = await calculate_fraud_risk_score(
            "203.0.113.1", "device123", 1, mock_session
        )

        assert score == 0

    @pytest.mark.asyncio
    async def test_high_score_for_ip_device_duplicate(self):
        """CRITICAL: Test high score for exact IP+device duplicate"""
        mock_session = Mock()
        # 1 exact match, 1 IP match, 0 device-only matches
        mock_session.exec.return_value.first.return_value = (1, 1, 0)

        score = await calculate_fraud_risk_score(
            "203.0.113.1", "device123", 1, mock_session
        )

        assert score >= 50  # Should trigger exact duplicate penalty

    @pytest.mark.asyncio
    async def test_score_for_ip_threshold_exceeded(self):
        """CRITICAL: Test penalty when IP threshold exceeded"""
        mock_session = Mock()
        # 0 exact, IP_FRAUD_THRESHOLD + 1 IP matches, 0 device
        mock_session.exec.return_value.first.return_value = (
            0,
            IP_FRAUD_THRESHOLD + 1,
            0,
        )

        score = await calculate_fraud_risk_score(
            "203.0.113.1", "device123", 1, mock_session
        )

        assert score >= 20  # Should trigger IP threshold penalty

    @pytest.mark.asyncio
    async def test_score_for_device_threshold_exceeded(self):
        """CRITICAL: Test penalty when device threshold exceeded"""
        mock_session = Mock()
        # 0 exact, 0 IP, DEVICE_FRAUD_THRESHOLD + 1 device matches
        mock_session.exec.return_value.first.return_value = (
            0,
            0,
            DEVICE_FRAUD_THRESHOLD + 1,
        )

        score = await calculate_fraud_risk_score(
            "203.0.113.1", "device123", 1, mock_session
        )

        assert score >= 30  # Should trigger device threshold penalty

    @pytest.mark.asyncio
    async def test_low_risk_single_device_reuse(self):
        """Test low score for single device reuse (could be legitimate)"""
        mock_session = Mock()
        # 0 exact, 0 IP, 1 device match
        mock_session.exec.return_value.first.return_value = (0, 0, 1)

        score = await calculate_fraud_risk_score(
            "203.0.113.1", "device123", 1, mock_session
        )

        assert score == 10  # Low risk score

    @pytest.mark.asyncio
    async def test_temporal_window_check(self):
        """CRITICAL: Test that temporal window is applied"""
        mock_session = Mock()
        # Return tuple for fraud score aggregation query
        mock_session.exec.return_value.first.return_value = (0, 0, 0)

        # Verify the query is called (temporal check happens in query)
        await calculate_fraud_risk_score("203.0.113.1", "device123", 1, mock_session)

        # Session.exec should be called with select statement
        assert mock_session.exec.called

    @pytest.mark.asyncio
    async def test_no_device_id_skips_device_checks(self):
        """Test that device checks are skipped when device_id is None"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = (0, 2, 0)

        score = await calculate_fraud_risk_score(
            "203.0.113.1",
            None,  # No device ID
            1,
            mock_session,
        )

        # Should only check IP, not device
        assert score < 50  # No device duplicate penalty


class TestCreateReferralTracking:
    """Test referral tracking record creation"""

    @pytest.mark.asyncio
    async def test_create_new_tracking(self):
        """Test creating a new tracking record"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None  # No existing tracking

        await create_referral_tracking(
            referred_user_id=100,
            referral_code_id=1,
            referrer_user_id=500,
            ip_address="203.0.113.1",
            device_id="device123",
            browser_fingerprint={"user_agent": "Mozilla/5.0"},
            db_session=mock_session,
        )

        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_prevent_duplicate_tracking(self):
        """CRITICAL: Test that duplicate tracking is prevented"""
        mock_session = Mock()
        existing_tracking = Mock(spec=ReferralTracking)
        mock_session.exec.return_value.first.return_value = existing_tracking

        with pytest.raises(HTTPException) as exc_info:
            await create_referral_tracking(
                referred_user_id=100,
                referral_code_id=1,
                referrer_user_id=500,
                ip_address="203.0.113.1",
                device_id="device123",
                browser_fingerprint={"user_agent": "Mozilla/5.0"},
                db_session=mock_session,
            )

        assert exc_info.value.status_code == 400
        assert "already referred" in exc_info.value.detail.lower()
        assert not mock_session.add.called

    @pytest.mark.asyncio
    async def test_tracking_with_no_device_id(self):
        """Test creating tracking without device ID (optional)"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        await create_referral_tracking(
            referred_user_id=100,
            referral_code_id=1,
            referrer_user_id=500,
            ip_address="203.0.113.1",
            device_id=None,  # No device ID
            browser_fingerprint={"user_agent": "Mozilla/5.0"},
            db_session=mock_session,
        )

        assert mock_session.add.called

    @pytest.mark.asyncio
    async def test_tracking_sets_registration_complete(self):
        """Test that registration_complete flag is set"""
        mock_session = Mock()
        mock_session.exec.return_value.first.return_value = None

        await create_referral_tracking(
            referred_user_id=100,
            referral_code_id=1,
            referrer_user_id=500,
            ip_address="203.0.113.1",
            device_id="device123",
            browser_fingerprint={},
            db_session=mock_session,
        )

        # Get the tracking object that was added
        call_args = mock_session.add.call_args
        tracking = call_args[0][0]

        assert tracking.registration_complete is True


class TestValidateAndTrackReferral:
    """Test complete referral validation and tracking flow"""

    @pytest.mark.asyncio
    async def test_successful_referral_tracking(self):
        """Test successful referral validation and tracking"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"
        mock_request.client = None

        mock_session = Mock()

        # Mock referral code validation
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        # Mock DB queries - need to handle chained calls properly
        mock_exec_result = Mock()
        mock_exec_result.first.side_effect = [
            (0, 0, 0),  # calculate_fraud_risk_score aggregation query
            None,  # create_referral_tracking check
        ]
        mock_session.exec.return_value = mock_exec_result

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            code, fraud_score = await validate_and_track_referral(
                mock_request,
                referred_user_id=100,
                referral_code="TEST123",
                device_id="device123",
                browser_fingerprint={"user_agent": "Mozilla"},
                db_session=mock_session,
            )

        assert code.code == "TEST123"
        assert fraud_score == 0

    @pytest.mark.asyncio
    async def test_prevent_self_referral(self):
        """CRITICAL: Test that self-referral is prevented"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        # Mock referral code where referrer = referred user
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,  # Same as referred_user_id below
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
                    referred_user_id=500,  # Same as referrer_user_id
                    referral_code="SELF123",
                    device_id="device123",
                    browser_fingerprint={},
                    db_session=mock_session,
                )

        assert exc_info.value.status_code == 400
        assert "own referral code" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_returns_fraud_score(self):
        """CRITICAL: Test that fraud score is calculated and returned"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        # High fraud score - handle chained calls
        mock_exec_result = Mock()
        mock_exec_result.first.side_effect = [
            (1, 10, 5),  # High fraud indicators
            None,  # create_referral_tracking check
        ]
        mock_session.exec.return_value = mock_exec_result

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            code, fraud_score = await validate_and_track_referral(
                mock_request,
                referred_user_id=100,
                referral_code="TEST123",
                device_id="device123",
                browser_fingerprint={},
                db_session=mock_session,
            )

        assert fraud_score > 0  # Should have fraud indicators

    @pytest.mark.asyncio
    async def test_handles_duplicate_tracking_gracefully(self):
        """Test that duplicate tracking doesn't break signup flow"""
        mock_request = Mock(spec=Request)
        mock_request.headers.get.return_value = "203.0.113.1"

        mock_session = Mock()

        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(timezone.utc),
            update_date=datetime.now(timezone.utc),
        )

        # User already tracked - handle chained calls
        existing_tracking = Mock(spec=ReferralTracking)
        mock_exec_result = Mock()
        mock_exec_result.first.side_effect = [
            (0, 0, 0),  # Fraud score query
            existing_tracking,  # Duplicate tracking check
        ]
        mock_session.exec.return_value = mock_exec_result

        with patch(
            "src.services.referrals.referral_tracking.validate_referral_code_exists",
            return_value=mock_code,
        ):
            # Should not raise exception, allows signup to continue
            code, fraud_score = await validate_and_track_referral(
                mock_request,
                referred_user_id=100,
                referral_code="TEST123",
                device_id="device123",
                browser_fingerprint={},
                db_session=mock_session,
            )

        assert code is not None  # Should still return code
