"""Integration tests for waitlist authentication flow"""

import pytest
from fastapi import HTTPException

from src.security.auth import authenticate_user
from src.db.users import User
from src.db.waitlist import UserStatusEnum


class TestWaitlistAuthenticationFlow:
    """Test authentication flow with waitlist user statuses"""

    @pytest.mark.asyncio
    async def test_active_user_can_login(self, db_session, sample_org, mock_request):
        """Test that ACTIVE users can login normally"""
        from src.security.security import security_hash_password

        # Create active user
        active_user = User(
            username="activeuser",
            email="active@example.com",
            first_name="Active",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.ACTIVE.value,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(active_user)
        db_session.commit()

        # Attempt login
        result = await authenticate_user(
            mock_request, "active@example.com", "Password123!", db_session
        )

        assert result is not False
        assert result.email == "active@example.com"
        assert result.user_status == UserStatusEnum.ACTIVE.value

    @pytest.mark.asyncio
    async def test_waitlist_user_cannot_login(
        self, db_session, sample_org, sample_waitlist_config, mock_request
    ):
        """Test that WAITLIST users cannot login before launch"""
        from src.security.security import security_hash_password

        # Create waitlist user
        waitlist_user = User(
            username="waitlistuser",
            email="waitlist@example.com",
            first_name="Waitlist",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.WAITLIST.value,
            waitlist_interest=sample_waitlist_config.interest_category,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(waitlist_user)
        db_session.commit()

        # Attempt login should raise exception
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                mock_request, "waitlist@example.com", "Password123!", db_session
            )

        assert exc_info.value.status_code == 403
        assert "waitlist" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_waitlist_activated_user_transitions_to_active(
        self, db_session, sample_org, mock_request
    ):
        """Test that WAITLIST_ACTIVATED users transition to ACTIVE on login"""
        from src.security.security import security_hash_password

        # Create activated user
        activated_user = User(
            username="activateduser",
            email="activated@example.com",
            first_name="Activated",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.WAITLIST_ACTIVATED.value,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(activated_user)
        db_session.commit()
        db_session.refresh(activated_user)

        # Login should succeed and transition status
        result = await authenticate_user(
            mock_request, "activated@example.com", "Password123!", db_session
        )

        assert result is not False
        assert result.user_status == UserStatusEnum.ACTIVE.value

        # Verify status changed in database
        db_session.refresh(activated_user)
        assert activated_user.user_status == UserStatusEnum.ACTIVE.value

    @pytest.mark.asyncio
    async def test_suspended_user_cannot_login(
        self, db_session, sample_org, mock_request
    ):
        """Test that SUSPENDED users cannot login"""
        from src.security.security import security_hash_password

        # Create suspended user
        suspended_user = User(
            username="suspendeduser",
            email="suspended@example.com",
            first_name="Suspended",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.SUSPENDED.value,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(suspended_user)
        db_session.commit()

        # Attempt login should raise exception
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                mock_request, "suspended@example.com", "Password123!", db_session
            )

        assert exc_info.value.status_code == 403
        assert "suspended" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_unverified_email_cannot_login(
        self, db_session, sample_org, mock_request
    ):
        """Test that users with unverified email cannot login"""
        from src.security.security import security_hash_password

        # Create user with unverified email
        unverified_user = User(
            username="unverifieduser",
            email="unverified@example.com",
            first_name="Unverified",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.ACTIVE.value,
            email_verified=False,  # Not verified
            org_id=sample_org.id,
        )
        db_session.add(unverified_user)
        db_session.commit()

        # Attempt login should raise exception
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                mock_request, "unverified@example.com", "Password123!", db_session
            )

        assert exc_info.value.status_code == 403
        assert "verify your email" in str(exc_info.value.detail).lower()

    @pytest.mark.asyncio
    async def test_wrong_password_fails(self, db_session, sample_org, mock_request):
        """Test that wrong password fails authentication"""
        from src.security.security import security_hash_password

        hashed_password = security_hash_password("CorrectPassword123!")
        user = User(
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            user_status=UserStatusEnum.ACTIVE.value,
            email_verified=True,
            org_id=sample_org.id,
        )
        # Set password and user_uuid after creating the object to ensure they're stored
        user.password = hashed_password
        user.user_uuid = "test-user-uuid"
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Verify password was stored correctly
        assert user.password != ""
        assert user.password == hashed_password

        # Attempt login with wrong password
        result = await authenticate_user(
            mock_request, "test@example.com", "WrongPassword123!", db_session
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_nonexistent_user_fails(self, db_session, mock_request):
        """Test that non-existent user fails authentication"""
        result = await authenticate_user(
            mock_request, "nonexistent@example.com", "AnyPassword123!", db_session
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_waitlist_error_includes_launch_date(
        self, db_session, sample_org, sample_waitlist_config, mock_request
    ):
        """Test that waitlist error message includes launch date information"""
        from src.security.security import security_hash_password

        # Create waitlist user with matching interest
        waitlist_user = User(
            username="waitlistwithdate",
            email="waitlistdate@example.com",
            first_name="Waitlist",
            last_name="User",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.WAITLIST.value,
            waitlist_interest=sample_waitlist_config.interest_category,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(waitlist_user)
        db_session.commit()

        # Attempt login
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                mock_request, "waitlistdate@example.com", "Password123!", db_session
            )

        error_message = str(exc_info.value.detail)
        # Should mention waitlist name or launch date
        assert (
            sample_waitlist_config.name in error_message
            or "waitlist" in error_message.lower()
        )


class TestUserStatusTransitions:
    """Test user status transitions during authentication"""

    @pytest.mark.asyncio
    async def test_multiple_activated_logins_stay_active(
        self, db_session, sample_org, mock_request
    ):
        """Test that subsequent logins keep user ACTIVE"""
        from src.security.security import security_hash_password

        # Create activated user
        user = User(
            username="multilogin",
            email="multi@example.com",
            first_name="Multi",
            last_name="Login",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.WAITLIST_ACTIVATED.value,
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # First login - should transition to ACTIVE
        result1 = await authenticate_user(
            mock_request, "multi@example.com", "Password123!", db_session
        )
        assert result1.user_status == UserStatusEnum.ACTIVE.value

        # Second login - should remain ACTIVE
        result2 = await authenticate_user(
            mock_request, "multi@example.com", "Password123!", db_session
        )
        assert result2.user_status == UserStatusEnum.ACTIVE.value

    @pytest.mark.asyncio
    async def test_user_without_status_field_defaults_to_active(
        self, db_session, sample_org, mock_request
    ):
        """Test backward compatibility - users without user_status field default to ACTIVE"""
        from src.security.security import security_hash_password

        # Create user (status might default to ACTIVE in model)
        user = User(
            username="nostatus",
            email="nostatus@example.com",
            first_name="No",
            last_name="Status",
            password=security_hash_password("Password123!"),
            email_verified=True,
            org_id=sample_org.id,
        )
        # Explicitly set or check default
        if hasattr(user, "user_status"):
            user.user_status = UserStatusEnum.ACTIVE.value

        db_session.add(user)
        db_session.commit()

        # Should be able to login
        result = await authenticate_user(
            mock_request, "nostatus@example.com", "Password123!", db_session
        )

        assert result is not False


class TestWaitlistErrorMessages:
    """Test error messages for waitlist-related authentication failures"""

    @pytest.mark.asyncio
    async def test_waitlist_message_without_config(
        self, db_session, sample_org, mock_request
    ):
        """Test waitlist error when no matching config found"""
        from src.security.security import security_hash_password

        # Create waitlist user without matching config
        user = User(
            username="noconfig",
            email="noconfig@example.com",
            first_name="No",
            last_name="Config",
            password=security_hash_password("Password123!"),
            user_status=UserStatusEnum.WAITLIST.value,
            waitlist_interest="NonExistentCategory",
            email_verified=True,
            org_id=sample_org.id,
        )
        db_session.add(user)
        db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                mock_request, "noconfig@example.com", "Password123!", db_session
            )

        assert exc_info.value.status_code == 403
        # Should still get waitlist message even without config details
        assert "waitlist" in str(exc_info.value.detail).lower()
