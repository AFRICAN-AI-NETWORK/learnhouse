"""Unit tests for waitlist database models"""

import pytest
from datetime import datetime, timezone
from src.db.waitlist import (
    UserStatusEnum,
    WaitlistStatusEnum,
    WaitlistConfig,
    WaitlistEmailLog,
    WaitlistCoursePreference,
    WaitlistConfigCreate,
    WaitlistConfigUpdate,
)


class TestUserStatusEnum:
    """Test UserStatusEnum enumeration"""
    
    def test_all_status_values_exist(self):
        """Test that all expected status values are defined"""
        assert UserStatusEnum.ACTIVE.value == "ACTIVE"
        assert UserStatusEnum.WAITLIST.value == "WAITLIST"
        assert UserStatusEnum.WAITLIST_ACTIVATED.value == "WAITLIST_ACTIVATED"
        assert UserStatusEnum.SUSPENDED.value == "SUSPENDED"
        assert UserStatusEnum.PENDING_VERIFICATION.value == "PENDING_VERIFICATION"
    
    def test_enum_is_string_type(self):
        """Test that enum inherits from str"""
        assert isinstance(UserStatusEnum.ACTIVE.value, str)
        assert isinstance(UserStatusEnum.WAITLIST.value, str)


class TestWaitlistStatusEnum:
    """Test WaitlistStatusEnum enumeration"""
    
    def test_all_status_values_exist(self):
        """Test that all expected status values are defined"""
        assert WaitlistStatusEnum.ACTIVE.value == "ACTIVE"
        assert WaitlistStatusEnum.COMPLETED.value == "COMPLETED"
        assert WaitlistStatusEnum.CANCELLED.value == "CANCELLED"
        assert WaitlistStatusEnum.SCHEDULED.value == "SCHEDULED"
    
    def test_enum_is_string_type(self):
        """Test that enum inherits from str"""
        assert isinstance(WaitlistStatusEnum.ACTIVE.value, str)


class TestWaitlistConfigModel:
    """Test WaitlistConfig database model"""
    
    def test_create_waitlist_config(self, db_session, sample_org, sample_user):
        """Test creating a waitlist configuration"""
        future_date = datetime.now(timezone.utc).isoformat()
        
        config = WaitlistConfig(
            waitlist_uuid="test-uuid-123",
            org_id=sample_org.id,
            created_by_user_id=sample_user.id,
            name="Test Campaign",
            description="Test description",
            interest_category="Technology",
            launch_datetime=future_date,
            status=WaitlistStatusEnum.ACTIVE.value,
            batch_size=100,
            batch_delay_seconds=5,
            creation_date=future_date,
            update_date=future_date
        )
        
        db_session.add(config)
        db_session.commit()
        db_session.refresh(config)
        
        assert config.id is not None
        assert config.waitlist_uuid == "test-uuid-123"
        assert config.org_id == sample_org.id
        assert config.name == "Test Campaign"
        assert config.batch_size == 100
        assert config.total_registrations == 0
        assert config.emails_sent_count == 0
    
    def test_waitlist_config_default_values(self, db_session, sample_org):
        """Test default values for waitlist configuration"""
        config = WaitlistConfig(
            waitlist_uuid="uuid-with-defaults",
            org_id=sample_org.id,
            name="Default Test",
            interest_category="Category",
            launch_datetime=datetime.now(timezone.utc).isoformat(),
            creation_date=datetime.now(timezone.utc).isoformat(),
            update_date=datetime.now(timezone.utc).isoformat()
        )
        
        db_session.add(config)
        db_session.commit()
        db_session.refresh(config)
        
        assert config.batch_size == 50
        assert config.batch_delay_seconds == 2
        assert config.status == WaitlistStatusEnum.ACTIVE.value
        assert config.total_registrations == 0
        assert config.emails_sent_count == 0
    
    def test_waitlist_config_unique_uuid(self, db_session, sample_org):
        """Test that waitlist_uuid must be unique"""
        uuid = "duplicate-uuid"
        now = datetime.now(timezone.utc).isoformat()
        
        config1 = WaitlistConfig(
            waitlist_uuid=uuid,
            org_id=sample_org.id,
            name="First",
            interest_category="Cat",
            launch_datetime=now,
            creation_date=now,
            update_date=now
        )
        db_session.add(config1)
        db_session.commit()
        
        config2 = WaitlistConfig(
            waitlist_uuid=uuid,
            org_id=sample_org.id,
            name="Second",
            interest_category="Cat",
            launch_datetime=now,
            creation_date=now,
            update_date=now
        )
        
        with pytest.raises(Exception):  # IntegrityError
            db_session.add(config2)
            db_session.commit()


class TestWaitlistEmailLogModel:
    """Test WaitlistEmailLog database model"""
    
    def test_create_email_log(self, db_session, waitlist_user, sample_waitlist_config):
        """Test creating an email log entry"""
        log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="activation",
            email_sent=True,
            sent_datetime=datetime.now(timezone.utc).isoformat(),
            retry_count=0
        )
        
        db_session.add(log)
        db_session.commit()
        db_session.refresh(log)
        
        assert log.id is not None
        assert log.user_id == waitlist_user.id
        assert log.waitlist_config_id == sample_waitlist_config.id
        assert log.email_type == "activation"
        assert log.email_sent is True
        assert log.retry_count == 0
    
    def test_email_log_default_values(self, db_session, waitlist_user, sample_waitlist_config):
        """Test default values for email log"""
        log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="confirmation"
        )
        
        db_session.add(log)
        db_session.commit()
        db_session.refresh(log)
        
        assert log.email_sent is False
        assert log.retry_count == 0
        assert log.sent_datetime is None
        assert log.error_message is None
    
    def test_email_log_with_error(self, db_session, waitlist_user, sample_waitlist_config):
        """Test creating email log with error"""
        log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="activation",
            email_sent=False,
            retry_count=1,
            error_message="SMTP connection failed"
        )
        
        db_session.add(log)
        db_session.commit()
        db_session.refresh(log)
        
        assert log.email_sent is False
        assert log.retry_count == 1
        assert log.error_message == "SMTP connection failed"


class TestWaitlistCoursePreferenceModel:
    """Test WaitlistCoursePreference database model"""
    
    def test_create_course_preference(self, db_session, waitlist_user, sample_course, sample_waitlist_config):
        """Test creating a course preference"""
        preference = WaitlistCoursePreference(
            user_id=waitlist_user.id,
            course_id=sample_course.id,
            waitlist_config_id=sample_waitlist_config.id,
            selected_date=datetime.now(timezone.utc).isoformat()
        )
        
        db_session.add(preference)
        db_session.commit()
        db_session.refresh(preference)
        
        assert preference.id is not None
        assert preference.user_id == waitlist_user.id
        assert preference.course_id == sample_course.id
        assert preference.waitlist_config_id == sample_waitlist_config.id
    
    def test_multiple_preferences_same_user(self, db_session, waitlist_user, sample_waitlist_config):
        """Test that a user can have multiple course preferences"""
        from src.db.courses import Course
        
        # Create multiple courses
        course1 = Course(
            id=10,
            name="Course 1",
            course_uuid="course-1-uuid",
            org_id=waitlist_user.org_id,
            author_id=1
        )
        course2 = Course(
            id=11,
            name="Course 2",
            course_uuid="course-2-uuid",
            org_id=waitlist_user.org_id,
            author_id=1
        )
        db_session.add(course1)
        db_session.add(course2)
        db_session.commit()
        
        now = datetime.now(timezone.utc).isoformat()
        
        pref1 = WaitlistCoursePreference(
            user_id=waitlist_user.id,
            course_id=course1.id,
            waitlist_config_id=sample_waitlist_config.id,
            selected_date=now
        )
        pref2 = WaitlistCoursePreference(
            user_id=waitlist_user.id,
            course_id=course2.id,
            waitlist_config_id=sample_waitlist_config.id,
            selected_date=now
        )
        
        db_session.add(pref1)
        db_session.add(pref2)
        db_session.commit()
        
        db_session.refresh(pref1)
        db_session.refresh(pref2)
        
        assert pref1.id != pref2.id
        assert pref1.course_id == course1.id
        assert pref2.course_id == course2.id


class TestWaitlistConfigCreate:
    """Test WaitlistConfigCreate request model"""
    
    def test_valid_create_model(self):
        """Test creating valid WaitlistConfigCreate instance"""
        data = WaitlistConfigCreate(
            org_id=1,
            name="New Campaign",
            interest_category="AI/ML",
            launch_datetime="2026-12-31T00:00:00Z"
        )
        
        assert data.org_id == 1
        assert data.name == "New Campaign"
        assert data.interest_category == "AI/ML"
        assert data.launch_datetime == "2026-12-31T00:00:00Z"
        assert data.batch_size == 50
        assert data.batch_delay_seconds == 2
    
    def test_create_model_with_custom_batch_settings(self):
        """Test creating WaitlistConfigCreate with custom batch settings"""
        data = WaitlistConfigCreate(
            org_id=1,
            name="Custom Batch",
            interest_category="Testing",
            launch_datetime="2026-12-31T00:00:00Z",
            batch_size=100,
            batch_delay_seconds=5
        )
        
        assert data.batch_size == 100
        assert data.batch_delay_seconds == 5


class TestWaitlistConfigUpdate:
    """Test WaitlistConfigUpdate request model"""
    
    def test_partial_update_model(self):
        """Test creating partial update model"""
        data = WaitlistConfigUpdate(
            name="Updated Name"
        )
        
        assert data.name == "Updated Name"
        assert data.description is None
        assert data.launch_datetime is None
    
    def test_update_launch_datetime(self):
        """Test updating launch datetime"""
        new_date = "2027-01-01T00:00:00Z"
        data = WaitlistConfigUpdate(
            launch_datetime=new_date
        )
        
        assert data.launch_datetime == new_date
    
    def test_update_status(self):
        """Test updating status"""
        data = WaitlistConfigUpdate(
            status=WaitlistStatusEnum.COMPLETED.value
        )
        
        assert data.status == WaitlistStatusEnum.COMPLETED.value
