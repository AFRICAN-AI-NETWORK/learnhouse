"""Unit tests for waitlist courses service"""

import pytest
from unittest.mock import Mock
from fastapi import HTTPException

from src.services.waitlist.courses import (
    get_org_courses_for_waitlist,
    get_course_preference_analytics,
    get_user_course_preferences,
)
from src.db.courses.courses import Course
from src.db.payments.payments_courses import PaymentsCourse
from src.db.payments.payments_products import PaymentsProduct
from src.db.waitlist import WaitlistCoursePreference


class TestGetOrgCoursesForWaitlist:
    """Test get_org_courses_for_waitlist service function"""
    
    @pytest.mark.asyncio
    async def test_get_courses_for_waitlist(self, db_session, sample_waitlist_config, sample_course, mock_request):
        """Test retrieving courses for a waitlist"""
        # Make course public
        sample_course.public = True
        db_session.add(sample_course)
        db_session.commit()
        
        result = await get_org_courses_for_waitlist(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        assert len(result) >= 1
        assert any(c["course_id"] == sample_course.id for c in result)
        
        # Check first course structure
        first_course = result[0]
        assert "course_id" in first_course
        assert "course_uuid" in first_course
        assert "name" in first_course
        assert "is_free" in first_course
        assert "price" in first_course
        assert "currency" in first_course
    
    @pytest.mark.asyncio
    async def test_free_course_pricing(self, db_session, sample_waitlist_config, sample_org, mock_request):
        """Test that free courses are correctly identified"""
        # Create a free course (no payment product)
        free_course = Course(
            name="Free Course",
            course_uuid="free-course-uuid",
            org_id=sample_org.id,
            author_id=1,
            public=True,
            open_to_contributors=False
        )
        db_session.add(free_course)
        db_session.commit()
        
        result = await get_org_courses_for_waitlist(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        free_course_data = next((c for c in result if c["course_id"] == free_course.id), None)
        assert free_course_data is not None
        assert free_course_data["is_free"] is True
        assert free_course_data["price"] is None
    
    @pytest.mark.asyncio
    async def test_paid_course_pricing(self, db_session, sample_waitlist_config, sample_org, mock_request):
        """Test that paid courses show correct pricing"""
        # Create a paid course
        paid_course = Course(
            name="Paid Course",
            course_uuid="paid-course-uuid",
            org_id=sample_org.id,
            author_id=1,
            public=True,
            open_to_contributors=False
        )
        db_session.add(paid_course)
        db_session.commit()
        db_session.refresh(paid_course)
        
        # Create payment product
        payment_product = PaymentsProduct(
            name="Course Payment",
            amount=9999,  # $99.99
            currency="USD",
            org_id=sample_org.id
        )
        db_session.add(payment_product)
        db_session.commit()
        db_session.refresh(payment_product)
        
        # Link course to payment
        payments_course = PaymentsCourse(
            course_id=paid_course.id,
            payment_product_id=payment_product.id,
            org_id=sample_org.id
        )
        db_session.add(payments_course)
        db_session.commit()
        
        result = await get_org_courses_for_waitlist(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        paid_course_data = next((c for c in result if c["course_id"] == paid_course.id), None)
        assert paid_course_data is not None
        assert paid_course_data["is_free"] is False
        assert paid_course_data["price"] == 9999
        assert paid_course_data["currency"] == "USD"
    
    @pytest.mark.asyncio
    async def test_only_public_courses_returned(self, db_session, sample_waitlist_config, sample_org, mock_request):
        """Test that only public courses are returned"""
        # Create private course
        private_course = Course(
            name="Private Course",
            course_uuid="private-course-uuid",
            org_id=sample_org.id,
            author_id=1,
            public=False,
            open_to_contributors=False
        )
        db_session.add(private_course)
        db_session.commit()
        
        result = await get_org_courses_for_waitlist(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        # Private course should not be in results
        assert not any(c["course_id"] == private_course.id for c in result)
    
    @pytest.mark.asyncio
    async def test_invalid_waitlist_uuid(self, db_session, mock_request):
        """Test with non-existent waitlist UUID"""
        with pytest.raises(HTTPException) as exc_info:
            await get_org_courses_for_waitlist(
                mock_request,
                db_session,
                "invalid-uuid"
            )
        
        assert exc_info.value.status_code == 404
        assert "Waitlist not found" in str(exc_info.value.detail)


class TestGetCoursePreferenceAnalytics:
    """Test get_course_preference_analytics service function"""
    
    @pytest.mark.asyncio
    async def test_get_preference_analytics(self, db_session, sample_waitlist_config, sample_course, 
                                            waitlist_user, mock_request):
        """Test getting course preference analytics"""
        from datetime import datetime, timezone
        
        # Create preferences
        pref1 = WaitlistCoursePreference(
            user_id=waitlist_user.id,
            course_id=sample_course.id,
            waitlist_config_id=sample_waitlist_config.id,
            org_id=sample_waitlist_config.org_id,
            creation_date=datetime.now(timezone.utc).isoformat()
        )
        db_session.add(pref1)
        db_session.commit()
        
        result = await get_course_preference_analytics(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        assert isinstance(result, dict)
        assert "courses" in result
        assert len(result["courses"]) >= 1
        
        # Check structure
        first_pref = result["courses"][0]
        assert "course_id" in first_pref
        assert "course_name" in first_pref
        assert "selection_count" in first_pref
        assert first_pref["selection_count"] >= 1
    
    @pytest.mark.asyncio
    async def test_analytics_aggregates_multiple_users(self, db_session, sample_waitlist_config, 
                                                       sample_course, sample_org, mock_request):
        """Test that analytics aggregate preferences from multiple users"""
        from datetime import datetime, timezone
        from src.db.users import User
        
        # Create multiple users with same course preference
        users = []
        for i in range(3):
            user = User(
                username=f"user{i}",
                email=f"user{i}@example.com",
                first_name="Test",
                last_name=f"User{i}",
                hashed_password="hashed",
                user_status="WAITLIST",
                org_id=sample_org.id
            )
            db_session.add(user)
            users.append(user)
        
        db_session.commit()
        
        # Create preferences for all users
        for user in users:
            pref = WaitlistCoursePreference(
                user_id=user.id,
                course_id=sample_course.id,
                waitlist_config_id=sample_waitlist_config.id,
                selected_date=datetime.now(timezone.utc).isoformat()
            )
            db_session.add(pref)
        
        db_session.commit()
        
        result = await get_course_preference_analytics(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        course_data = next((c for c in result if c["course_id"] == sample_course.id), None)
        assert course_data is not None
        assert course_data["selection_count"] >= 3
    
    @pytest.mark.asyncio
    async def test_analytics_empty_preferences(self, db_session, sample_waitlist_config, mock_request):
        """Test analytics with no course preferences"""
        result = await get_course_preference_analytics(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        # Should return dict with empty courses list
        assert isinstance(result, dict)
        assert "courses" in result
        assert len(result["courses"]) == 0


class TestGetUserCoursePreferences:
    """Test get_user_course_preferences service function"""
    
    @pytest.mark.asyncio
    async def test_get_user_preferences(self, db_session, sample_waitlist_config, sample_course,
                                       waitlist_user, mock_request):
        """Test getting a specific user's course preferences"""
        from datetime import datetime, timezone
        
        # Create preference
        pref = WaitlistCoursePreference(
            user_id=waitlist_user.id,
            course_id=sample_course.id,
            waitlist_config_id=sample_waitlist_config.id,
            selected_date=datetime.now(timezone.utc).isoformat()
        )
        db_session.add(pref)
        db_session.commit()
        
        result = await get_user_course_preferences(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            waitlist_user.id
        )
        
        assert len(result) >= 1
        assert any(p["course_id"] == sample_course.id for p in result)
    
    @pytest.mark.asyncio
    async def test_get_multiple_user_preferences(self, db_session, sample_waitlist_config, 
                                                 sample_org, waitlist_user, mock_request):
        """Test user with multiple course preferences"""
        from datetime import datetime, timezone
        
        # Create multiple courses
        courses = []
        for i in range(3):
            course = Course(
                name=f"Course {i}",
                course_uuid=f"course-{i}-uuid",
                org_id=sample_org.id,
                author_id=1,
                public=True,
                open_to_contributors=False
            )
            db_session.add(course)
            courses.append(course)
        
        db_session.commit()
        
        # Create preferences for all courses
        for course in courses:
            pref = WaitlistCoursePreference(
                user_id=waitlist_user.id,
                course_id=course.id,
                waitlist_config_id=sample_waitlist_config.id,
                selected_date=datetime.now(timezone.utc).isoformat()
            )
            db_session.add(pref)
        
        db_session.commit()
        
        result = await get_user_course_preferences(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            waitlist_user.id
        )
        
        assert len(result) >= 3
    
    @pytest.mark.asyncio
    async def test_get_preferences_no_selections(self, db_session, sample_waitlist_config, 
                                                 waitlist_user, mock_request):
        """Test user with no course preferences"""
        result = await get_user_course_preferences(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            waitlist_user.id
        )
        
        assert isinstance(result, list)
        assert len(result) == 0
    
    @pytest.mark.asyncio
    async def test_invalid_user_id(self, db_session, sample_waitlist_config, mock_request):
        """Test with non-existent user ID"""
        result = await get_user_course_preferences(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            99999  # Non-existent user
        )
        
        assert isinstance(result, list)
        assert len(result) == 0
