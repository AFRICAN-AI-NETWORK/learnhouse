"""add_referral_system_simple

Revision ID: 09b336cb18f2
Revises: 52b824c8811e
Create Date: 2026-02-21 15:18:47.758710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa # noqa: F401
import sqlmodel # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '09b336cb18f2'
down_revision: Union[str, None] = '52b824c8811e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user referral fields with defaults
    op.execute("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS referral_commission_balance FLOAT NOT NULL DEFAULT 0.0")
    op.execute("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS has_referral_code BOOLEAN NOT NULL DEFAULT false")
    
    # Create enums (use DO block to check if exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE referralcodestatus AS ENUM ('ACTIVE', 'INACTIVE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE commissionstatus AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'FORFEITED', 'PENDING_REVIEW');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE payoutstatus AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE domainlisttype AS ENUM ('DISPOSABLE', 'LEGITIMATE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create referral code table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referralcode (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            referrer_user_id BIGINT NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE,
            referral_link VARCHAR(255) NOT NULL,
            status referralcodestatus NOT NULL DEFAULT 'ACTIVE',
            creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES \"user\"(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_referralcode_code ON referralcode(code)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referralcode_referrer_org ON referralcode(referrer_user_id, org_id)")
    
    # Create referral tracking table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referraltracking (
            id SERIAL PRIMARY KEY,
            referral_code_id BIGINT NOT NULL,
            referred_user_id BIGINT NOT NULL UNIQUE,
            ip_address VARCHAR(50),
            device_id VARCHAR(255),
            browser_fingerprint JSON,
            signup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            registration_complete BOOLEAN NOT NULL DEFAULT false,
            fraud_score INT NOT NULL DEFAULT 0,
            FOREIGN KEY (referral_code_id) REFERENCES referralcode(id) ON DELETE CASCADE,
            FOREIGN KEY (referred_user_id) REFERENCES \"user\"(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_referraltracking_code ON referraltracking(referral_code_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referraltracking_referred ON referraltracking(referred_user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referraltracking_ip ON referraltracking(ip_address)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referraltracking_device ON referraltracking(device_id)")
    
    # Create referral commission table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referralcommission (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            referral_code_id BIGINT NOT NULL,
            referrer_user_id BIGINT NOT NULL,
            referred_user_id BIGINT NOT NULL,
            payment_user_id BIGINT,
            course_id BIGINT,
            commission_amount FLOAT NOT NULL,
            status commissionstatus NOT NULL DEFAULT 'PENDING',
            payment_date TIMESTAMP,
            refund_period_end TIMESTAMP NOT NULL,
            creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            refund_reason TEXT,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
            FOREIGN KEY (referral_code_id) REFERENCES referralcode(id) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES \"user\"(id) ON DELETE CASCADE,
            FOREIGN KEY (referred_user_id) REFERENCES \"user\"(id) ON DELETE CASCADE,
            UNIQUE (payment_user_id, referral_code_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_referralcommission_referrer_status ON referralcommission(referrer_user_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referralcommission_referred ON referralcommission(referred_user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_referralcommission_org ON referralcommission(org_id)")
    
    # Create payout request table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referrerpayoutrequest (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            referrer_user_id BIGINT NOT NULL,
            amount FLOAT NOT NULL,
            status payoutstatus NOT NULL DEFAULT 'REQUESTED',
            bank_account_id BIGINT,
            provider_reference VARCHAR(255),
            provider_response JSON,
            requested_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processed_date TIMESTAMP,
            creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES \"user\"(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_payoutrequest_referrer_status ON referrerpayoutrequest(referrer_user_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_payoutrequest_org ON referrerpayoutrequest(org_id)")
    
    # Create email domain list table
    op.execute("""
        CREATE TABLE IF NOT EXISTS emaildomainlist (
            id SERIAL PRIMARY KEY,
            domain VARCHAR(255) NOT NULL,
            list_type domainlisttype NOT NULL,
            source VARCHAR(100) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_verified_at TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_emaildomainlist_domain ON emaildomainlist(domain)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_emaildomainlist_list_type ON emaildomainlist(list_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_emaildomainlist_is_active ON emaildomainlist(is_active)")
    
    # Add referral_code_id to paymentsuser
    op.execute("ALTER TABLE paymentsuser ADD COLUMN IF NOT EXISTS referral_code_id BIGINT")


def downgrade() -> None:
    # Drop tables in reverse order
    op.execute("DROP TABLE IF EXISTS emaildomainlist CASCADE")
    op.execute("DROP TABLE IF EXISTS referrerpayoutrequest CASCADE")
    op.execute("DROP TABLE IF NOT EXISTS referralcommission CASCADE")
    op.execute("DROP TABLE IF EXISTS referraltracking CASCADE")
    op.execute("DROP TABLE IF EXISTS referralcode CASCADE")
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS domainlisttype CASCADE")
    op.execute("DROP TYPE IF EXISTS payoutstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS commissionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS referralcodestatus CASCADE")
    
    # Drop user columns
    op.execute("ALTER TABLE \"user\" DROP COLUMN IF EXISTS has_referral_code")
    op.execute("ALTER TABLE \"user\" DROP COLUMN IF EXISTS referral_commission_balance")
    
    # Drop paymentsuser column
    op.execute("ALTER TABLE paymentsuser DROP COLUMN IF EXISTS referral_code_id")
