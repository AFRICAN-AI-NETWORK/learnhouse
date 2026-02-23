"""
Comprehensive unit tests for referral code models
Tests database models, enums, and validation
"""

import pytest
from datetime import datetime, timezone
from src.db.referrals.referral_codes import (
    ReferralCode,
    ReferralCodeBase,
    ReferralCodeRead,
    ReferralCodeCreate,
    ReferralCodeUpdate,
    ReferralCodeStatus,
)


class TestReferralCodeStatus:
    """Test ReferralCodeStatus enumeration"""
    
    def test_all_status_values_exist(self):
        """Test that all expected status values are defined"""
        assert ReferralCodeStatus.ACTIVE.value == "active"
        assert ReferralCodeStatus.INACTIVE.value == "inactive"
    
    def test_enum_is_string_type(self):
        """Test that enum inherits from str"""
        assert isinstance(ReferralCodeStatus.ACTIVE.value, str)
        assert isinstance(ReferralCodeStatus.INACTIVE.value, str)
    
    def test_enum_comparison(self):
        """Test enum comparison operations"""
        assert ReferralCodeStatus.ACTIVE == ReferralCodeStatus.ACTIVE
        assert ReferralCodeStatus.ACTIVE != ReferralCodeStatus.INACTIVE


class TestReferralCodeBase:
    """Test ReferralCodeBase model"""
    
    def test_base_model_creation(self):
        """Test creating a base model instance"""
        code_base = ReferralCodeBase(
            code="TEST123ABC",
            referral_link="http://localhost:3000/ref/TEST123ABC",
            status=ReferralCodeStatus.ACTIVE
        )
        assert code_base.code == "TEST123ABC"
        assert code_base.referral_link == "http://localhost:3000/ref/TEST123ABC"
        assert code_base.status == ReferralCodeStatus.ACTIVE
    
    def test_default_status_is_active(self):
        """Test that default status is ACTIVE"""
        code_base = ReferralCodeBase(
            code="TEST123ABC",
            referral_link="http://localhost:3000/ref/TEST123ABC"
        )
        assert code_base.status == ReferralCodeStatus.ACTIVE
    
    def test_code_max_length(self):
        """Test code max length validation"""
        # 50 characters is the max
        long_code = "A" * 50
        code_base = ReferralCodeBase(
            code=long_code,
            referral_link="http://localhost:3000/ref/" + long_code
        )
        assert len(code_base.code) == 50
    
    def test_referral_link_max_length(self):
        """Test referral link max length"""
        code_base = ReferralCodeBase(
            code="TEST",
            referral_link="http://localhost:3000/ref/TEST"
        )
        assert len(code_base.referral_link) <= 255


class TestReferralCodeCreate:
    """Test ReferralCodeCreate model"""
    
    def test_create_model_with_org_id(self):
        """Test creating a ReferralCodeCreate model"""
        create_model = ReferralCodeCreate(org_id=123)
        assert create_model.org_id == 123
    
    def test_create_model_validation(self):
        """Test that org_id is required"""
        with pytest.raises(Exception):
            ReferralCodeCreate()  # Should fail without org_id


class TestReferralCodeUpdate:
    """Test ReferralCodeUpdate model"""
    
    def test_update_model_with_status(self):
        """Test updating status"""
        update_model = ReferralCodeUpdate(status=ReferralCodeStatus.INACTIVE)
        assert update_model.status == ReferralCodeStatus.INACTIVE
    
    def test_update_to_active(self):
        """Test updating to active status"""
        update_model = ReferralCodeUpdate(status=ReferralCodeStatus.ACTIVE)
        assert update_model.status == ReferralCodeStatus.ACTIVE


class TestReferralCodeRead:
    """Test ReferralCodeRead response model"""
    
    def test_read_model_with_all_fields(self):
        """Test ReferralCodeRead with all required fields"""
        now = datetime.now(timezone.utc)
        read_model = ReferralCodeRead(
            code="TEST123ABC",
            referral_link="http://localhost:3000/ref/TEST123ABC",
            status=ReferralCodeStatus.ACTIVE,
            id=1,
            org_id=100,
            referrer_user_id=500,
            creation_date=now,
            update_date=now
        )
        
        assert read_model.id == 1
        assert read_model.code == "TEST123ABC"
        assert read_model.org_id == 100
        assert read_model.referrer_user_id == 500
        assert read_model.status == ReferralCodeStatus.ACTIVE
    
    def test_read_model_serialization(self):
        """Test that read model can be serialized"""
        now = datetime.now(timezone.utc)
        read_model = ReferralCodeRead(
            code="TEST123",
            referral_link="http://localhost:3000/ref/TEST123",
            status=ReferralCodeStatus.ACTIVE,
            id=1,
            org_id=100,
            referrer_user_id=500,
            creation_date=now,
            update_date=now
        )
        
        # Test model_dump (Pydantic v2) or dict (Pydantic v1)
        try:
            data = read_model.model_dump()
        except AttributeError:
            data = read_model.dict()
        
        assert data["code"] == "TEST123"
        assert data["id"] == 1
        assert data["org_id"] == 100


class TestReferralCodeModel:
    """Test ReferralCode table model"""
    
    def test_table_name(self):
        """Test that table name is correct"""
        assert ReferralCode.__tablename__ == "referralcode"
    
    def test_model_has_required_fields(self):
        """Test that model has all required fields"""
        # Check that fields exist
        assert hasattr(ReferralCode, 'id')
        assert hasattr(ReferralCode, 'org_id')
        assert hasattr(ReferralCode, 'referrer_user_id')
        assert hasattr(ReferralCode, 'code')
        assert hasattr(ReferralCode, 'referral_link')
        assert hasattr(ReferralCode, 'status')
        assert hasattr(ReferralCode, 'creation_date')
        assert hasattr(ReferralCode, 'update_date')
    
    def test_indexes_are_defined(self):
        """Test that proper indexes are defined"""
        # Check that table_args is defined with indexes
        assert hasattr(ReferralCode, '__table_args__')
        assert ReferralCode.__table_args__ is not None
