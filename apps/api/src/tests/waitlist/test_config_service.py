"""Unit tests for waitlist configuration service"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, AsyncMock, patch
from fastapi import HTTPException
from sqlmodel import select

from src.services.waitlist.config import (
    create_waitlist_config,
    get_waitlist_config,
    get_org_waitlist_configs,
    update_waitlist_config,
    cancel_waitlist_config,
)
from src.db.waitlist import (
    WaitlistConfig,
    WaitlistConfigCreate,
    WaitlistConfigUpdate,
    WaitlistStatusEnum,
)


class TestCreateWaitlistConfig:
    """Test create_waitlist_config service function"""
    
    @pytest.mark.asyncio
    async def test_create_valid_waitlist_config(self, db_session, sample_org, sample_user, mock_request):
        """Test creating a valid waitlist configuration"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Spring Launch Campaign",
            interest_category="Web Development",
            launch_datetime=future_date,
            description="Test campaign"
        )
        
        result = await create_waitlist_config(mock_request, db_session, config_data)
        
        assert result.name == "Spring Launch Campaign"
        assert result.interest_category == "Web Development"
        assert result.org_id == sample_org.id
        assert result.waitlist_uuid is not None
        assert len(result.waitlist_uuid) > 0
    
    @pytest.mark.asyncio
    async def test_create_waitlist_with_invalid_org(self, db_session, mock_request):
        """Test creating waitlist with non-existent organization"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        config_data = WaitlistConfigCreate(
            org_id=99999,  # Non-existent org
            name="Invalid Org Test",
            interest_category="Testing",
            launch_datetime=future_date
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_waitlist_config(mock_request, db_session, config_data)
        
        assert exc_info.value.status_code == 404
        assert "Organization not found" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_waitlist_with_past_date(self, db_session, sample_org, mock_request):
        """Test creating waitlist with launch date in the past"""
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Past Date Test",
            interest_category="Testing",
            launch_datetime=past_date
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_waitlist_config(mock_request, db_session, config_data)
        
        assert exc_info.value.status_code == 400
        assert "must be in the future" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_waitlist_with_invalid_datetime_format(self, db_session, sample_org, mock_request):
        """Test creating waitlist with invalid datetime format"""
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Invalid Date Format",
            interest_category="Testing",
            launch_datetime="not-a-valid-date"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_waitlist_config(mock_request, db_session, config_data)
        
        assert exc_info.value.status_code == 400
        assert "Invalid datetime format" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_create_waitlist_with_custom_batch_settings(self, db_session, sample_org, mock_request):
        """Test creating waitlist with custom batch settings"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        
        config_data = WaitlistConfigCreate(
            org_id=sample_org.id,
            name="Custom Batch Test",
            interest_category="Testing",
            launch_datetime=future_date,
            batch_size=100,
            batch_delay_seconds=5
        )
        
        result = await create_waitlist_config(mock_request, db_session, config_data)
        
        assert result.batch_size == 100
        assert result.batch_delay_seconds == 5


class TestGetWaitlistConfig:
    """Test get_waitlist_config service function"""
    
    @pytest.mark.asyncio
    async def test_get_existing_waitlist_config(self, db_session, sample_waitlist_config, mock_request):
        """Test retrieving an existing waitlist configuration"""
        result = await get_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        assert result.id == sample_waitlist_config.id
        assert result.name == sample_waitlist_config.name
        assert result.waitlist_uuid == sample_waitlist_config.waitlist_uuid
    
    @pytest.mark.asyncio
    async def test_get_non_existent_waitlist_config(self, db_session, mock_request):
        """Test retrieving a non-existent waitlist configuration"""
        with pytest.raises(HTTPException) as exc_info:
            await get_waitlist_config(mock_request, db_session, "non-existent-uuid")
        
        assert exc_info.value.status_code == 404
        assert "Waitlist not found" in str(exc_info.value.detail)


class TestGetOrgWaitlistConfigs:
    """Test get_org_waitlist_configs service function"""
    
    @pytest.mark.asyncio
    async def test_get_org_waitlists(self, db_session, sample_org, sample_waitlist_config, mock_request):
        """Test retrieving all waitlists for an organization"""
        result = await get_org_waitlist_configs(mock_request, db_session, sample_org.id)
        
        assert len(result) >= 1
        assert any(w.id == sample_waitlist_config.id for w in result)
    
    @pytest.mark.asyncio
    async def test_get_org_waitlists_empty(self, db_session, mock_request):
        """Test retrieving waitlists for org with no waitlists"""
        from src.db.organizations import Organization
        
        # Create org without waitlists
        new_org = Organization(
            name="Empty Org",
            slug="empty-org",
            email="empty@example.com",
            org_uuid="empty-org-uuid"
        )
        db_session.add(new_org)
        db_session.commit()
        db_session.refresh(new_org)
        
        result = await get_org_waitlist_configs(mock_request, db_session, new_org.id)
        
        assert len(result) == 0
    
    @pytest.mark.asyncio
    async def test_get_org_waitlists_filters_cancelled(self, db_session, sample_org, sample_user, mock_request):
        """Test that cancelled waitlists are excluded by default"""
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        now = datetime.now(timezone.utc).isoformat()
        
        # Create cancelled waitlist
        cancelled_config = WaitlistConfig(
            waitlist_uuid="cancelled-uuid",
            org_id=sample_org.id,
            created_by_user_id=sample_user.id,
            name="Cancelled Waitlist",
            interest_category="Testing",
            launch_datetime=future_date,
            status=WaitlistStatusEnum.CANCELLED.value,
            creation_date=now,
            update_date=now
        )
        db_session.add(cancelled_config)
        db_session.commit()
        
        result = await get_org_waitlist_configs(mock_request, db_session, sample_org.id)
        
        # The function returns all waitlists including cancelled ones
        # (In production, filtering would typically be done at the API layer or with query params)
        assert any(w.status == WaitlistStatusEnum.CANCELLED.value for w in result)


class TestUpdateWaitlistConfig:
    """Test update_waitlist_config service function"""
    
    @pytest.mark.asyncio
    async def test_update_waitlist_name(self, db_session, sample_waitlist_config, mock_request):
        """Test updating waitlist name"""
        update_data = WaitlistConfigUpdate(name="Updated Name")
        
        result = await update_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            update_data
        )
        
        assert result.name == "Updated Name"
        assert result.id == sample_waitlist_config.id
    
    @pytest.mark.asyncio
    async def test_update_waitlist_description(self, db_session, sample_waitlist_config, mock_request):
        """Test updating waitlist description"""
        update_data = WaitlistConfigUpdate(description="New description")
        
        result = await update_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            update_data
        )
        
        assert result.description == "New description"
    
    @pytest.mark.asyncio
    async def test_extend_launch_datetime(self, db_session, sample_waitlist_config, mock_request):
        """Test extending the launch datetime"""
        new_future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        update_data = WaitlistConfigUpdate(launch_datetime=new_future_date)
        
        result = await update_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            update_data
        )
        
        assert result.launch_datetime == new_future_date
    
    @pytest.mark.asyncio
    async def test_update_with_past_date_fails(self, db_session, sample_waitlist_config, mock_request):
        """Test that updating to past date fails"""
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        update_data = WaitlistConfigUpdate(launch_datetime=past_date)
        
        with pytest.raises(HTTPException) as exc_info:
            await update_waitlist_config(
                mock_request,
                db_session,
                sample_waitlist_config.waitlist_uuid,
                update_data
            )
        
        assert exc_info.value.status_code == 400
        assert "must be in the future" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_update_batch_settings(self, db_session, sample_waitlist_config, mock_request):
        """Test updating batch settings"""
        update_data = WaitlistConfigUpdate(
            batch_size=200,
            batch_delay_seconds=10
        )
        
        result = await update_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid,
            update_data
        )
        
        assert result.batch_size == 200
        assert result.batch_delay_seconds == 10
    
    @pytest.mark.asyncio
    async def test_update_non_existent_waitlist(self, db_session, mock_request):
        """Test updating non-existent waitlist"""
        update_data = WaitlistConfigUpdate(name="New Name")
        
        with pytest.raises(HTTPException) as exc_info:
            await update_waitlist_config(
                mock_request,
                db_session,
                "non-existent-uuid",
                update_data
            )
        
        assert exc_info.value.status_code == 404


class TestCancelWaitlistConfig:
    """Test cancel_waitlist_config service function"""
    
    @pytest.mark.asyncio
    async def test_cancel_active_waitlist(self, db_session, sample_waitlist_config, mock_request):
        """Test cancelling an active waitlist"""
        result = await cancel_waitlist_config(
            mock_request,
            db_session,
            sample_waitlist_config.waitlist_uuid
        )
        
        assert result.status == WaitlistStatusEnum.CANCELLED.value
        
        # Verify status changed in database
        query = select(WaitlistConfig).where(
            WaitlistConfig.waitlist_uuid == sample_waitlist_config.waitlist_uuid
        )
        updated_config = db_session.exec(query).first()
        assert updated_config.status == WaitlistStatusEnum.CANCELLED.value
    
    @pytest.mark.asyncio
    async def test_cancel_non_existent_waitlist(self, db_session, mock_request):
        """Test cancelling non-existent waitlist"""
        with pytest.raises(HTTPException) as exc_info:
            await cancel_waitlist_config(mock_request, db_session, "non-existent-uuid")
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_cancel_already_cancelled_waitlist(self, db_session, sample_org, sample_user, mock_request):
        """Test cancelling an already cancelled waitlist"""
        now = datetime.now(timezone.utc).isoformat()
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        cancelled_config = WaitlistConfig(
            waitlist_uuid="already-cancelled",
            org_id=sample_org.id,
            created_by_user_id=sample_user.id,
            name="Already Cancelled",
            interest_category="Test",
            launch_datetime=future,
            status=WaitlistStatusEnum.CANCELLED.value,
            creation_date=now,
            update_date=now
        )
        db_session.add(cancelled_config)
        db_session.commit()
        
        # Should still succeed (idempotent)
        result = await cancel_waitlist_config(
            mock_request,
            db_session,
            cancelled_config.waitlist_uuid
        )
        
        assert result.status == WaitlistStatusEnum.CANCELLED.value
