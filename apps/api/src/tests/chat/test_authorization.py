"""Unit tests for chat authorization service."""
import pytest
from fastapi import HTTPException
from sqlmodel import Session

from src.services.chat.authorization import (
    verify_chat_permission,
    get_user_role_in_org,
    get_chatable_users_for_user
)
from src.db.users import User
from src.db.organizations import Organization
from src.db.roles import Role


class TestVerifyChatPermission:
    """Test chat permission verification."""
    
    @pytest.mark.asyncio
    async def test_student_can_chat_with_instructor(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test that student can chat with instructor."""
        # Should not raise exception
        result = await verify_chat_permission(
            db=session,
            current_user_id=student_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        assert result is True
    
    @pytest.mark.asyncio
    async def test_instructor_can_chat_with_student(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User
    ):
        """Test that instructor can chat with student."""
        result = await verify_chat_permission(
            db=session,
            current_user_id=instructor_user.id,
            target_user_id=student_user.id,
            org_id=org.id
        )
        assert result is True
    
    @pytest.mark.asyncio
    async def test_student_cannot_chat_with_student(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        student_user_two: User
    ):
        """Test that student cannot chat with another student."""
        with pytest.raises(HTTPException) as exc_info:
            await verify_chat_permission(
                db=session,
                current_user_id=student_user.id,
                target_user_id=student_user_two.id,
                org_id=org.id
            )
        
        assert exc_info.value.status_code == 403
        assert "cannot chat" in str(exc_info.value.detail).lower()
    
    @pytest.mark.asyncio
    async def test_admin_can_chat_with_everyone(
        self,
        session: Session,
        org: Organization,
        admin_user: User,
        student_user: User,
        instructor_user: User
    ):
        """Test that admin can chat with all user types."""
        # Admin to student
        result1 = await verify_chat_permission(
            db=session,
            current_user_id=admin_user.id,
            target_user_id=student_user.id,
            org_id=org.id
        )
        assert result1 is True
        
        # Admin to instructor
        result2 = await verify_chat_permission(
            db=session,
            current_user_id=admin_user.id,
            target_user_id=instructor_user.id,
            org_id=org.id
        )
        assert result2 is True
    
    @pytest.mark.asyncio
    async def test_instructor_can_chat_with_instructor(
        self,
        session: Session,
        org: Organization,
        instructor_user: User,
        instructor_role: Role
    ):
        """Test that instructors can chat with each other."""
        from src.db.users import User
        from src.db.user_organizations import UserOrganization
        from uuid import uuid4
        from datetime import datetime
        
        # Create second instructor
        instructor2 = User(
            user_uuid=f"usr_{uuid4()}",
            username="instructor_two",
            email="instructor2@test.com",
            password="hashed_password",
            first_name="Instructor",
            last_name="Two",
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow())
        )
        session.add(instructor2)
        session.commit()
        session.refresh(instructor2)
        
        user_org = UserOrganization(
            user_id=instructor2.id,
            org_id=org.id,
            role_id=instructor_role.id,
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow())
        )
        session.add(user_org)
        session.commit()
        
        result = await verify_chat_permission(
            db=session,
            current_user_id=instructor_user.id,
            target_user_id=instructor2.id,
            org_id=org.id
        )
        assert result is True
    
    @pytest.mark.asyncio
    async def test_user_not_in_org_raises_error(
        self,
        session: Session,
        org: Organization,
        student_user: User
    ):
        """Test that user not in organization raises error."""
        from src.db.users import User
        from uuid import uuid4
        from datetime import datetime
        
        # Create user not in org
        external_user = User(
            user_uuid=f"usr_{uuid4()}",
            username="external_user",
            email="external@test.com",
            password="hashed_password",
            first_name="External",
            last_name="User",
            creation_date=str(datetime.utcnow()),
            update_date=str(datetime.utcnow())
        )
        session.add(external_user)
        session.commit()
        session.refresh(external_user)
        
        with pytest.raises(HTTPException) as exc_info:
            await verify_chat_permission(
                db=session,
                current_user_id=student_user.id,
                target_user_id=external_user.id,
                org_id=org.id
            )
        
        assert exc_info.value.status_code == 403
        assert "not members" in str(exc_info.value.detail).lower()


class TestGetUserRoleInOrg:
    """Test getting user role in organization."""
    
    @pytest.mark.asyncio
    async def test_get_student_role(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        student_role: Role
    ):
        """Test getting student role."""
        role = await get_user_role_in_org(
            db=session,
            user_id=student_user.id,
            org_id=org.id
        )
        
        assert role is not None
        assert role.id == student_role.id
        assert role.name.lower() == "student"
    
    @pytest.mark.asyncio
    async def test_get_instructor_role(
        self,
        session: Session,
        org: Organization,
        instructor_user: User,
        instructor_role: Role
    ):
        """Test getting instructor role."""
        role = await get_user_role_in_org(
            db=session,
            user_id=instructor_user.id,
            org_id=org.id
        )
        
        assert role is not None
        assert role.id == instructor_role.id
        assert role.name.lower() == "instructor"
    
    @pytest.mark.asyncio
    async def test_user_not_in_org_returns_none(
        self,
        session: Session,
        org: Organization
    ):
        """Test that user not in org returns None."""
        role = await get_user_role_in_org(
            db=session,
            user_id=99999,  # Non-existent user
            org_id=org.id
        )
        
        assert role is None


class TestGetChatableUsersForUser:
    """Test getting list of users current user can chat with."""
    
    @pytest.mark.asyncio
    async def test_student_sees_only_instructors(
        self,
        session: Session,
        org: Organization,
        student_user: User,
        instructor_user: User,
        student_user_two: User,
        admin_user: User
    ):
        """Test that student can only see instructors (per permission rules)."""
        users = await get_chatable_users_for_user(
            db=session,
            current_user_id=student_user.id,
            org_id=org.id
        )
        
        user_ids = [u.id for u in users]
        
        # Should include instructor
        assert instructor_user.id in user_ids
        
        # Should NOT include admin (students can only chat with instructors)
        assert admin_user.id not in user_ids
        
        # Should NOT include other students
        assert student_user_two.id not in user_ids
        
        # Should NOT include self
        assert student_user.id not in user_ids
    
    @pytest.mark.asyncio
    async def test_instructor_sees_everyone(
        self,
        session: Session,
        org: Organization,
        instructor_user: User,
        student_user: User,
        student_user_two: User,
        admin_user: User
    ):
        """Test that instructor can see all organization members."""
        users = await get_chatable_users_for_user(
            db=session,
            current_user_id=instructor_user.id,
            org_id=org.id
        )
        
        user_ids = [u.id for u in users]
        
        # Should include students and admins
        assert student_user.id in user_ids
        assert student_user_two.id in user_ids
        assert admin_user.id in user_ids
        
        # Should NOT include self
        assert instructor_user.id not in user_ids
    
    @pytest.mark.asyncio
    async def test_admin_sees_everyone(
        self,
        session: Session,
        org: Organization,
        admin_user: User,
        student_user: User,
        instructor_user: User
    ):
        """Test that admin can see all organization members."""
        users = await get_chatable_users_for_user(
            db=session,
            current_user_id=admin_user.id,
            org_id=org.id
        )
        
        user_ids = [u.id for u in users]
        
        # Should include all users
        assert student_user.id in user_ids
        assert instructor_user.id in user_ids
        
        # Should NOT include self
        assert admin_user.id not in user_ids
    
    @pytest.mark.asyncio
    async def test_empty_list_for_user_not_in_org(
        self,
        session: Session,
        org: Organization
    ):
        """Test that user not in org gets empty list."""
        users = await get_chatable_users_for_user(
            db=session,
            current_user_id=99999,  # Non-existent user
            org_id=org.id
        )
        
        assert users == []
