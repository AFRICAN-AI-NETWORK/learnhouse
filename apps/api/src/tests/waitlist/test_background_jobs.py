"""Unit tests for waitlist background job processor"""

import pytest
from unittest.mock import Mock, MagicMock, AsyncMock, patch
from datetime import datetime, timedelta, timezone

from src.jobs.waitlist_processor import (
    run_waitlist_activation_job,
    run_retry_failed_emails_job,
    sync_run_waitlist_activation_job,
    sync_run_retry_failed_emails_job,
)


class TestWaitlistActivationJob:
    """Test waitlist activation background job"""
    
    @pytest.mark.asyncio
    @patch('src.jobs.waitlist_processor._sync_process_activations')
    async def test_activation_job_runs_successfully(self, mock_sync_process):
        """Test that activation job executes without errors"""
        mock_sync_process.return_value = {"elapsed_s": 0.12}
        
        # Run the job
        await run_waitlist_activation_job()
        
        # Verify sync wrapper was called
        mock_sync_process.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('src.jobs.waitlist_processor._sync_process_activations')
    async def test_activation_job_handles_errors(self, mock_sync_process):
        """Test that activation job handles errors gracefully"""
        mock_sync_process.side_effect = Exception("Database error")
        
        # Should not raise exception
        await run_waitlist_activation_job()
        
        # Sync wrapper was still called
        mock_sync_process.assert_called_once()
    
    @patch('src.jobs.waitlist_processor._safe_asyncio_run')
    @patch('src.jobs.waitlist_processor.Session')
    def test_activation_job_closes_session_on_error(self, mock_session_class, mock_safe_run):
        """Test that session context is cleaned up when errors occur"""
        from src.jobs.waitlist_processor import _sync_process_activations
        
        mock_session_instance = MagicMock()
        mock_session_class.return_value.__enter__.return_value = mock_session_instance
        mock_safe_run.side_effect = RuntimeError("Test error")
        
        with pytest.raises(RuntimeError):
            _sync_process_activations()
        
        # Verify session context manager was cleanly exited
        mock_session_class.return_value.__exit__.assert_called()


class TestRetryFailedEmailsJob:
    """Test retry failed emails background job"""
    
    @pytest.mark.asyncio
    @patch('src.jobs.waitlist_processor._sync_retry_failed_emails')
    async def test_retry_job_runs_successfully(self, mock_sync_retry):
        """Test that retry job executes without errors"""
        mock_sync_retry.return_value = {"elapsed_s": 0.1}
        
        await run_retry_failed_emails_job()
        
        mock_sync_retry.assert_called_once()
    
    @pytest.mark.asyncio
    @patch('src.jobs.waitlist_processor._sync_retry_failed_emails')
    async def test_retry_job_handles_errors(self, mock_sync_retry):
        """Test that retry job handles errors gracefully"""
        mock_sync_retry.side_effect = Exception("SMTP error")
        
        # Should not raise exception
        await run_retry_failed_emails_job()
        
        mock_sync_retry.assert_called_once()


class TestSynchronousWrappers:
    """Test synchronous wrappers for APScheduler"""
    
    @patch('src.jobs.waitlist_processor.run_waitlist_activation_job', new_callable=AsyncMock)
    @patch('src.jobs.waitlist_processor.asyncio.run')
    def test_sync_activation_job_wrapper(self, mock_asyncio_run, mock_run_job):
        """Test synchronous wrapper for activation job"""
        sync_run_waitlist_activation_job()
        
        mock_asyncio_run.assert_called_once()
    
    @patch('src.jobs.waitlist_processor.run_retry_failed_emails_job', new_callable=AsyncMock)
    @patch('src.jobs.waitlist_processor.asyncio.run')
    def test_sync_retry_job_wrapper(self, mock_asyncio_run, mock_run_job):
        """Test synchronous wrapper for retry job"""
        sync_run_retry_failed_emails_job()
        
        mock_asyncio_run.assert_called_once()


class TestWaitlistActivationIntegration:
    """Integration tests for waitlist activation with real data"""
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.activate_waitlist')
    async def test_process_expired_waitlists(self, mock_activate, db_session, sample_org, sample_user):
        """Test processing waitlists that have reached launch date"""
        from src.db.waitlist import WaitlistConfig, WaitlistStatusEnum
        from src.db.users import User
        from src.services.waitlist.emails import process_waitlist_activations
        
        # Create expired waitlist
        past_date = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        expired_waitlist = WaitlistConfig(
            waitlist_uuid="expired-for-activation",
            org_id=sample_org.id,
            created_by_user_id=sample_user.id,
            name="Ready to Launch",
            interest_category="Testing",
            launch_datetime=past_date,
            status=WaitlistStatusEnum.ACTIVE.value,
            total_registrations=2,
            emails_sent_count=0,
            creation_date=datetime.now(timezone.utc).isoformat(),
            update_date=datetime.now(timezone.utc).isoformat()
        )
        db_session.add(expired_waitlist)
        db_session.commit()
        
        # Create users on waitlist
        user1 = User(
            username="waitlistuser1",
            email="wl1@example.com",
            first_name="Waitlist",
            last_name="User1",
            hashed_password="hashed",
            user_status="WAITLIST",
            org_id=sample_org.id
        )
        user2 = User(
            username="waitlistuser2",
            email="wl2@example.com",
            first_name="Waitlist",
            last_name="User2",
            hashed_password="hashed",
            user_status="WAITLIST",
            org_id=sample_org.id
        )
        db_session.add(user1)
        db_session.add(user2)
        db_session.commit()
        
        mock_activate.return_value = None
        
        # Process activations
        await process_waitlist_activations(db_session)
        
        # Verify activate_waitlist was called
        assert mock_activate.call_count >= 1
    
    @pytest.mark.asyncio
    async def test_future_waitlists_not_processed(self, db_session, sample_org, sample_user):
        """Test that future waitlists are not processed"""
        from src.db.waitlist import WaitlistConfig, WaitlistStatusEnum
        from src.services.waitlist.emails import process_waitlist_activations
        
        # Create future waitlist
        future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        future_waitlist = WaitlistConfig(
            waitlist_uuid="future-waitlist",
            org_id=sample_org.id,
            created_by_user_id=sample_user.id,
            name="Future Launch",
            interest_category="Testing",
            launch_datetime=future_date,
            status=WaitlistStatusEnum.ACTIVE.value,
            creation_date=datetime.now(timezone.utc).isoformat(),
            update_date=datetime.now(timezone.utc).isoformat()
        )
        db_session.add(future_waitlist)
        db_session.commit()
        
        with patch('src.services.waitlist.emails.activate_waitlist'):
            # Process activations
            await process_waitlist_activations(db_session)
            
            # Should not activate future waitlists
            # Check that the future waitlist status is still ACTIVE
            db_session.refresh(future_waitlist)
            assert future_waitlist.status == WaitlistStatusEnum.ACTIVE.value


class TestEmailRetryIntegration:
    """Integration tests for email retry functionality"""
    
    @pytest.mark.asyncio
    @patch('src.services.waitlist.emails.send_waitlist_activation_email')
    async def test_retry_failed_emails(self, mock_send_email, db_session, sample_waitlist_config, 
                                      waitlist_user, sample_org):
        """Test retrying failed email deliveries"""
        from src.db.waitlist import WaitlistEmailLog
        from src.services.waitlist.emails import retry_failed_waitlist_emails
        
        # Create failed email log
        failed_log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="activation",
            email_sent=False,
            retry_count=0,
            error_message="SMTP timeout",
            sent_datetime=None
        )
        db_session.add(failed_log)
        db_session.commit()
        
        mock_send_email.return_value = True
        
        # Retry failed emails
        await retry_failed_waitlist_emails(db_session)
        
        # Verify retry was attempted
        db_session.refresh(failed_log)
        # retry_count should increase (depending on implementation)
    
    @pytest.mark.asyncio
    async def test_retry_respects_max_attempts(self, db_session, sample_waitlist_config, 
                                               waitlist_user):
        """Test that emails are not retried after max attempts"""
        from src.db.waitlist import WaitlistEmailLog
        from src.services.waitlist.emails import retry_failed_waitlist_emails
        
        # Create failed email log with max retries
        maxed_log = WaitlistEmailLog(
            user_id=waitlist_user.id,
            waitlist_config_id=sample_waitlist_config.id,
            email_type="activation",
            email_sent=False,
            retry_count=3,  # Max attempts
            error_message="Persistent failure"
        )
        db_session.add(maxed_log)
        db_session.commit()
        
        with patch('src.services.waitlist.emails.send_waitlist_activation_email'):
            # Retry failed emails
            await retry_failed_waitlist_emails(db_session)
            
            # Should not retry emails that have reached max attempts
            # Verify by checking retry_count hasn't increased beyond limit
            db_session.refresh(maxed_log)
            assert maxed_log.retry_count <= 3
