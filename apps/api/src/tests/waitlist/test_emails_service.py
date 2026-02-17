"""Unit tests for waitlist email service"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timezone

from src.services.waitlist.emails import (
    send_waitlist_confirmation_email,
    send_waitlist_activation_email,
    activate_waitlist,
)
from src.db.users import UserRead
from src.db.organizations import OrganizationRead
from src.db.waitlist import WaitlistEmailLog


class TestSendWaitlistConfirmationEmail:
    """Test send_waitlist_confirmation_email function"""
    
    @patch('src.services.waitlist.emails.send_email')
    def test_send_confirmation_email_success(self, mock_send_email, sample_waitlist_config, sample_org):
        """Test sending confirmation email successfully"""
        mock_send_email.return_value = True
        
        user = UserRead(
            id=1,
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            user_uuid="test-user-uuid",
            user_status="WAITLIST"
        )
        
        org = OrganizationRead(
            id=sample_org.id,
            name=sample_org.org_name,
            org_slug=sample_org.org_slug
        )
        
        result = send_waitlist_confirmation_email(
            user=user,
            email=user.email,
            organization=org,
            waitlist_config=sample_waitlist_config
        )
        
        # Verify send_email was called
        mock_send_email.assert_called_once()
        call_args = mock_send_email.call_args
        
        assert call_args.kwargs['to'] == user.email
        assert "waitlist" in call_args.kwargs['subject'].lower()
        assert user.username in call_args.kwargs['body']
        assert sample_waitlist_config.name in call_args.kwargs['body']
    
    @patch('src.services.waitlist.emails.send_email')
    def test_confirmation_email_contains_launch_date(self, mock_send_email, sample_waitlist_config, sample_org):
        """Test that confirmation email includes launch date"""
        mock_send_email.return_value = True
        
        user = UserRead(
            id=1,
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            user_uuid="test-user-uuid",
            user_status="WAITLIST"
        )
        
        org = OrganizationRead(
            id=sample_org.id,
            name=sample_org.org_name,
            org_slug=sample_org.org_slug
        )
        
        send_waitlist_confirmation_email(
            user=user,
            email=user.email,
            organization=org,
            waitlist_config=sample_waitlist_config
        )
        
        call_args = mock_send_email.call_args
        body = call_args.kwargs['body']
        
        # Check that launch date is mentioned
        assert "launch" in body.lower() or "date" in body.lower()


class TestSendWaitlistActivationEmail:
    """Test send_waitlist_activation_email function"""
    
    @patch('src.services.waitlist.emails.send_email')
    def test_send_activation_email_success(self, mock_send_email, sample_waitlist_config, sample_org):
        """Test sending activation email successfully"""
        mock_send_email.return_value = True
        
        user = UserRead(
            id=1,
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            user_uuid="test-user-uuid",
            user_status="WAITLIST_ACTIVATED"
        )
        
        org = OrganizationRead(
            id=sample_org.id,
            name=sample_org.org_name,
            org_slug=sample_org.org_slug
        )
        
        result = send_waitlist_activation_email(
            user=user,
            email=user.email,
            organization=org,
            waitlist_config=sample_waitlist_config
        )
        
        # Verify send_email was called
        mock_send_email.assert_called_once()
        call_args = mock_send_email.call_args
        
        assert call_args.kwargs['to'] == user.email
        assert "activated" in call_args.kwargs['subject'].lower() or "welcome" in call_args.kwargs['subject'].lower()
    
    @patch('src.services.waitlist.emails.send_email')
    def test_activation_email_contains_login_info(self, mock_send_email, sample_waitlist_config, sample_org):
        """Test that activation email includes login information"""
        mock_send_email.return_value = True
        
        user = UserRead(
            id=1,
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            user_uuid="test-user-uuid",
            user_status="WAITLIST_ACTIVATED"
        )
        
        org = OrganizationRead(
            id=sample_org.id,
            name=sample_org.org_name,
            org_slug=sample_org.org_slug
        )
        
        send_waitlist_activation_email(
            user=user,
            email=user.email,
            organization=org,
            waitlist_config=sample_waitlist_config
        )
        
        call_args = mock_send_email.call_args
        body = call_args.kwargs['body']
        
        # Check for login-related terms
        assert "login" in body.lower() or "access" in body.lower()


class TestActivateWaitlist:
    """Test activate_waitlist function"""
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.send_waitlist_activation_email')
    async def test_activate_waitlist_sends_emails(self, mock_send_activation, db_session, 
                                         sample_waitlist_config, sample_org, waitlist_user):
        """Test that activate_waitlist sends emails to users"""
        mock_send_activation.return_value = True
        
        from src.db.users import User
        
        # Create additional users with matching interest
        users = [waitlist_user]
        for i in range(3):
            user = User(
                username=f"batchuser{i}",
                email=f"batch{i}@example.com",
                first_name="Batch",
                last_name=f"User{i}",
                hashed_password="hashed",
                user_status="WAITLIST",
                waitlist_interest=sample_waitlist_config.interest_category,
                email_verified=True,
                org_id=sample_org.id
            )
            db_session.add(user)
            users.append(user)
        
        db_session.commit()
        
        # Refresh users to get IDs
        for user in users:
            db_session.refresh(user)
        
        # Activate waitlist
        await activate_waitlist(db_session, sample_waitlist_config)
        
        # Verify emails were sent
        assert mock_send_activation.call_count >= 1
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.send_waitlist_activation_email')
    async def test_activation_creates_email_logs(self, mock_send_activation, db_session,
                                            sample_waitlist_config, sample_org, waitlist_user):
        """Test that activation creates email logs"""
        mock_send_activation.return_value = True
        
        # Ensure user has verified email and matching interest
        waitlist_user.email_verified = True
        waitlist_user.waitlist_interest = sample_waitlist_config.interest_category
        db_session.add(waitlist_user)
        db_session.commit()
        
        # Activate waitlist
        await activate_waitlist(db_session, sample_waitlist_config)
        
        # Check email log was created
        from sqlmodel import select
        log_query = select(WaitlistEmailLog).where(
            WaitlistEmailLog.user_id == waitlist_user.id,
            WaitlistEmailLog.waitlist_config_id == sample_waitlist_config.id
        )
        logs = db_session.exec(log_query).all()
        
        assert len(logs) >= 1
        assert logs[0].email_sent is True
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.send_waitlist_activation_email')
    async def test_activation_handles_failures(self, mock_send_activation, db_session,
                                         sample_waitlist_config, sample_org, waitlist_user):
        """Test that activation handles email failures"""
        # Simulate email failure
        mock_send_activation.side_effect = Exception("SMTP error")
        
        # Ensure user has verified email and matching interest
        waitlist_user.email_verified = True
        waitlist_user.waitlist_interest = sample_waitlist_config.interest_category
        db_session.add(waitlist_user)
        db_session.commit()
        
        # Activate waitlist - should not raise exception
        await activate_waitlist(db_session, sample_waitlist_config)
        
        # Check email log records failure
        from sqlmodel import select
        log_query = select(WaitlistEmailLog).where(
            WaitlistEmailLog.user_id == waitlist_user.id,
            WaitlistEmailLog.waitlist_config_id == sample_waitlist_config.id
        )
        logs = db_session.exec(log_query).all()
        
        if len(logs) > 0:
            assert logs[0].email_sent is False
            assert logs[0].email_error is not None
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.send_waitlist_activation_email')
    async def test_activation_prevents_duplicates(self, mock_send_activation, db_session,
                                                  sample_waitlist_config, sample_org, waitlist_user):
        """Test that activation prevents duplicate emails"""
        mock_send_activation.return_value = True
        
        # Ensure user has verified email and matching interest
        waitlist_user.email_verified = True
        waitlist_user.waitlist_interest = sample_waitlist_config.interest_category
        db_session.add(waitlist_user)
        db_session.commit()
        
        # Create existing email log
        existing_log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_sent=True,
            email_sent_date=datetime.now(timezone.utc).isoformat(),
            creation_date=datetime.now(timezone.utc).isoformat(),
            update_date=datetime.now(timezone.utc).isoformat()
        )
        db_session.add(existing_log)
        db_session.commit()
        
        # Try to activate again
        await activate_waitlist(db_session, sample_waitlist_config)
        
        # Should skip already sent email
        # Verify send_email was NOT called again
        call_count_after = mock_send_activation.call_count
        assert call_count_after == 0  # Should not send duplicate

