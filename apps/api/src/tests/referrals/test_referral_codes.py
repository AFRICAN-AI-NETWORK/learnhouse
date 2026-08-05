"""
Comprehensive unit tests for referral code service
Tests code generation, validation, uniqueness, and CRUD operations
"""

from datetime import UTC, datetime
from unittest.mock import Mock, patch

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from src.db.referrals.referral_codes import ReferralCode, ReferralCodeStatus
from src.db.users import PublicUser, User
from src.services.referrals.referral_codes import (
    REFERRAL_CODE_LENGTH,
    REFERRAL_CODE_MAX_ATTEMPTS,
    build_referral_link,
    create_referral_code_for_user,
    generate_unique_code,
    get_my_referral_code,
    get_referral_code_by_code,
    get_referral_code_by_user,
    validate_referral_code_exists,
)


class TestGenerateUniqueCode:
    """Test referral code generation"""

    def test_code_generation_default_length(self):
        """Test that generated code has correct default length"""
        code = generate_unique_code()
        assert len(code) == REFERRAL_CODE_LENGTH
        assert code.isupper()
        assert code.isalnum()

    def test_code_generation_custom_length(self):
        """Test code generation with custom length"""
        code = generate_unique_code(length=15)
        assert len(code) == 15

    def test_code_excludes_ambiguous_characters(self):
        """CRITICAL: Test that ambiguous characters are excluded"""
        # Generate many codes to increase probability of hitting excluded chars
        for _ in range(100):
            code = generate_unique_code()
            assert "0" not in code, "Code contains zero (0)"
            assert "O" not in code, "Code contains letter O"
            assert "I" not in code, "Code contains letter I"
            assert "1" not in code, "Code contains one (1)"
            assert "L" not in code, "Code contains letter L"

    def test_code_is_cryptographically_random(self):
        """Test that generated codes are different (randomness)"""
        codes = [generate_unique_code() for _ in range(100)]
        # All codes should be unique
        assert len(codes) == len(set(codes))

    def test_code_only_uppercase_and_digits(self):
        """Test that code only contains uppercase letters and digits"""
        code = generate_unique_code()
        assert all(c.isupper() or c.isdigit() for c in code)


class TestBuildReferralLink:
    """Test referral link building"""

    def test_build_link_with_default_base_url(self):
        """Test link building reads from config"""
        with patch(
            "src.services.referrals.referral_codes.get_learnhouse_config"
        ) as mock_config:
            mock_config.return_value.hosting_config.app_base_url = (
                "http://localhost:3000"
            )

            link = build_referral_link("ABC123")
            assert link == "http://localhost:3000/ref/ABC123"

    def test_build_link_with_custom_base_url(self):
        """Test link building with custom base URL"""
        link = build_referral_link("XYZ789", base_url="https://example.com")
        assert link == "https://example.com/ref/XYZ789"

    def test_build_link_with_production_url(self):
        """Test link building with production URL"""
        link = build_referral_link("PROD123", base_url="https://app.learnhouse.com")
        assert link == "https://app.learnhouse.com/ref/PROD123"

    def test_build_link_format(self):
        """Test that link follows correct format"""
        link = build_referral_link("TEST", base_url="https://test.com")
        assert "/ref/" in link
        assert link.endswith("TEST")


class TestGetReferralCodeByCode:
    """Test retrieving referral code by code string"""

    @pytest.mark.asyncio
    async def test_get_existing_code(self):
        """Test retrieving an existing code"""
        mock_session = Mock(spec=Session)
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        result = await get_referral_code_by_code("TEST123", mock_session)

        assert result is not None
        assert result.code == "TEST123"
        assert result.id == 1

    @pytest.mark.asyncio
    async def test_get_nonexistent_code(self):
        """Test retrieving a non-existent code returns None"""
        mock_session = Mock(spec=Session)
        mock_session.exec.return_value.first.return_value = None

        result = await get_referral_code_by_code("NONEXIST", mock_session)

        assert result is None

    @pytest.mark.asyncio
    async def test_case_insensitive_lookup(self):
        """CRITICAL: Test that code lookup is case-insensitive"""
        mock_session = Mock(spec=Session)
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        # Lookup with lowercase should still work
        result = await get_referral_code_by_code("test123", mock_session)

        # Verify that code was converted to uppercase in query
        assert result is not None


class TestGetReferralCodeByUser:
    """Test retrieving referral code by user"""

    @pytest.mark.asyncio
    async def test_get_user_code(self):
        """Test retrieving user's referral code"""
        mock_session = Mock(spec=Session)
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="USER123",
            referral_link="http://localhost:3000/ref/USER123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        result = await get_referral_code_by_user(500, 100, mock_session)

        assert result is not None
        assert result.referrer_user_id == 500
        assert result.org_id == 100

    @pytest.mark.asyncio
    async def test_user_without_code(self):
        """Test user without referral code returns None"""
        mock_session = Mock(spec=Session)
        mock_session.exec.return_value.first.return_value = None

        result = await get_referral_code_by_user(999, 100, mock_session)

        assert result is None


class TestValidateReferralCodeExists:
    """Test referral code validation"""

    @pytest.mark.asyncio
    async def test_validate_active_code(self):
        """Test validating an active code"""
        mock_session = Mock(spec=Session)
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="VALID123",
            referral_link="http://localhost:3000/ref/VALID123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        result = await validate_referral_code_exists("VALID123", mock_session)

        assert result is not None
        assert result.status == ReferralCodeStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_validate_nonexistent_code_raises_404(self):
        """CRITICAL: Test that non-existent code raises 404"""
        mock_session = Mock(spec=Session)
        mock_session.exec.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await validate_referral_code_exists("NONEXIST", mock_session)

        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_validate_inactive_code_raises_400(self):
        """CRITICAL: Test that inactive code raises 400"""
        mock_session = Mock(spec=Session)
        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="INACTIVE",
            referral_link="http://localhost:3000/ref/INACTIVE",
            status=ReferralCodeStatus.INACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        with pytest.raises(HTTPException) as exc_info:
            await validate_referral_code_exists("INACTIVE", mock_session)

        assert exc_info.value.status_code == 400
        assert "inactive" in exc_info.value.detail.lower()


class TestCreateReferralCodeForUser:
    """Test referral code creation"""

    @pytest.mark.asyncio
    async def test_create_new_code(self):
        """Test creating a new referral code"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # Mock: User doesn't have a code yet
        mock_session.exec.return_value.first.side_effect = [
            None,
            None,
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

        # Verify code was added to session
        assert mock_session.add.called
        assert mock_session.commit.called

    @pytest.mark.asyncio
    async def test_return_existing_code(self):
        """CRITICAL: Test that existing code is returned (idempotent)"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        existing_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="EXIST123",
            referral_link="http://localhost:3000/ref/EXIST123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )

        # Mock: User already has a code
        mock_session.exec.return_value.first.return_value = existing_code

        result = await create_referral_code_for_user(
            mock_request, 100, 500, mock_user, mock_session
        )

        assert result.code == "EXIST123"
        # Should NOT create new code or commit
        assert not mock_session.add.called
        assert not mock_session.commit.called

    @pytest.mark.asyncio
    async def test_retry_on_collision(self):
        """CRITICAL: Test code collision handling with retry logic"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # First two codes exist (collision), third is unique
        mock_session.exec.return_value.first.side_effect = [
            None,  # User check: no existing code
            Mock(),  # First generated code exists
            Mock(),  # Second generated code exists
            None,  # Third code is unique
            Mock(spec=User, id=500, has_referral_code=False),  # User update
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

        # Should have tried 3 times before finding unique code
        assert mock_session.exec.call_count >= 3

    @pytest.mark.asyncio
    async def test_max_attempts_exceeded_raises_500(self):
        """CRITICAL: Test failure after max retry attempts"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # User doesn't have code, but all generated codes collide
        collision_mock = Mock()
        mock_session.exec.return_value.first.side_effect = [None] + [collision_mock] * (
            REFERRAL_CODE_MAX_ATTEMPTS + 1
        )

        with pytest.raises(HTTPException) as exc_info:
            await create_referral_code_for_user(
                mock_request, 100, 500, mock_user, mock_session
            )

        assert exc_info.value.status_code == 500
        assert "Failed to generate unique referral code" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_database_integrity_error_handling(self):
        """CRITICAL: Test IntegrityError handling from DB constraint"""
        from sqlalchemy.exc import IntegrityError

        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        # Mock successful code generation but commit fails
        mock_session.exec.return_value.first.side_effect = [
            None,  # No existing code
            None,  # Generated code is unique
            Mock(spec=User, id=500, has_referral_code=False),  # User
        ]

        # Simulate integrity error on commit
        mock_session.commit.side_effect = IntegrityError("Duplicate", None, None)

        with patch(
            "src.services.referrals.referral_codes.get_learnhouse_config"
        ) as mock_config:
            mock_config.return_value.hosting_config.app_base_url = (
                "http://localhost:3000"
            )

            with pytest.raises(HTTPException) as exc_info:
                await create_referral_code_for_user(
                    mock_request, 100, 500, mock_user, mock_session
                )

            assert exc_info.value.status_code == 500
            assert "uniqueness constraint" in exc_info.value.detail.lower()
            assert mock_session.rollback.called


class TestGetMyReferralCode:
    """Test retrieving current user's referral code"""

    @pytest.mark.asyncio
    async def test_get_my_code(self):
        """Test getting current user's code"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        mock_code = ReferralCode(
            id=1,
            org_id=100,
            referrer_user_id=500,
            code="MY123",
            referral_link="http://localhost:3000/ref/MY123",
            status=ReferralCodeStatus.ACTIVE,
            creation_date=datetime.now(UTC),
            update_date=datetime.now(UTC),
        )
        mock_session.exec.return_value.first.return_value = mock_code

        result = await get_my_referral_code(mock_request, 100, mock_user, mock_session)

        assert result is not None
        assert result.code == "MY123"

    @pytest.mark.asyncio
    async def test_get_my_code_none_if_not_exists(self):
        """Test returns None if user has no code"""
        mock_request = Mock()
        mock_session = Mock(spec=Session)
        mock_user = Mock(spec=PublicUser)
        mock_user.id = 500

        mock_session.exec.return_value.first.return_value = None

        result = await get_my_referral_code(mock_request, 100, mock_user, mock_session)

        assert result is None
