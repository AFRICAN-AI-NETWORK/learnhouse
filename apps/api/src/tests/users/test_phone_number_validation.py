import pytest
from pydantic import ValidationError

from src.db.users import SignupUserCreate, UserUpdate
from src.routers.waitlist import WaitlistUserRegistration


class TestSignupUserCreatePhoneValidation:
    def test_signup_requires_phone_number(self):
        with pytest.raises(ValidationError):
            SignupUserCreate(
                username="newuser",
                first_name="New",
                last_name="User",
                email="new@example.com",
                password="StrongPassword123!",
            )

    def test_signup_phone_number_is_normalized(self):
        user = SignupUserCreate(
            username="newuser",
            first_name="New",
            last_name="User",
            email="new@example.com",
            password="StrongPassword123!",
            phone_number="+1 (415) 555-2671",
        )

        assert user.phone_number == "+14155552671"

    def test_signup_rejects_non_e164_phone_number(self):
        with pytest.raises(ValidationError):
            SignupUserCreate(
                username="newuser",
                first_name="New",
                last_name="User",
                email="new@example.com",
                password="StrongPassword123!",
                phone_number="4155552671",
            )


class TestUserUpdatePhoneValidation:
    def test_user_update_allows_missing_phone_number(self):
        user_update = UserUpdate(
            username="existinguser",
            first_name="Existing",
            last_name="User",
            email="existing@example.com",
        )

        assert user_update.phone_number is None

    def test_user_update_phone_number_is_normalized(self):
        user_update = UserUpdate(
            username="existinguser",
            first_name="Existing",
            last_name="User",
            email="existing@example.com",
            phone_number="+44 20 7946 0958",
        )

        assert user_update.phone_number == "+442079460958"


class TestWaitlistRegistrationPhoneValidation:
    def test_waitlist_registration_requires_phone_number(self):
        with pytest.raises(ValidationError):
            WaitlistUserRegistration(
                username="waitlistuser",
                email="waitlist@example.com",
                password="StrongPassword123!",
            )

    def test_waitlist_registration_rejects_non_e164_phone_number(self):
        with pytest.raises(ValidationError):
            WaitlistUserRegistration(
                username="waitlistuser",
                email="waitlist@example.com",
                password="StrongPassword123!",
                phone_number="07012345678",
            )
