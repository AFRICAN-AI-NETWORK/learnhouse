"""add referral user fields

Revision ID: add_referral_user_fields
Revises: 52b824c8811e
Create Date: 2026-02-21 15:30:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'add_referral_user_fields'
down_revision = '52b824c8811e'
branch_labels = None
depends_on = None


def upgrade():
    # Add referral_commission_balance column with default value
    op.execute("""
        ALTER TABLE "user" 
        ADD COLUMN IF NOT EXISTS referral_commission_balance FLOAT NOT NULL DEFAULT 0.0
    """)
    
    # Add has_referral_code column with default value
    op.execute("""
        ALTER TABLE "user" 
        ADD COLUMN IF NOT EXISTS has_referral_code BOOLEAN NOT NULL DEFAULT false
    """)
    
    # Create enum types for referral system
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
    
    # Create referralcode table
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
            FOREIGN KEY (referrer_user_id) REFERENCES "user"(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for referralcode
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcode_code ON referralcode(code)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcode_link ON referralcode(referral_link)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcode_referrer_org ON referralcode(referrer_user_id, org_id)')
    
    # Create referraltracking table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referraltracking (
            id SERIAL PRIMARY KEY,
            referral_code_id BIGINT NOT NULL,
            referred_user_id BIGINT NOT NULL,
            ip_address VARCHAR(45),
            device_id VARCHAR(255),
            browser_fingerprint JSON,
            signup_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            registration_complete BOOLEAN NOT NULL DEFAULT true,
            fraud_score INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (referral_code_id) REFERENCES referralcode(id) ON DELETE CASCADE,
            FOREIGN KEY (referred_user_id) REFERENCES "user"(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for referraltracking
    op.execute('CREATE INDEX IF NOT EXISTS idx_referraltracking_code ON referraltracking(referral_code_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referraltracking_referred ON referraltracking(referred_user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referraltracking_ip ON referraltracking(ip_address)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referraltracking_device ON referraltracking(device_id)')
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_referraltracking_unique_user ON referraltracking(referred_user_id)')
    
    # Create referralcommission table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referralcommission (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            referral_code_id BIGINT NOT NULL,
            referrer_user_id BIGINT NOT NULL,
            referred_user_id BIGINT NOT NULL,
            payment_user_id BIGINT NOT NULL,
            course_id BIGINT,
            commission_amount FLOAT NOT NULL,
            original_amount FLOAT NOT NULL,
            commission_percentage FLOAT NOT NULL,
            status commissionstatus NOT NULL DEFAULT 'PENDING',
            payment_date TIMESTAMP NOT NULL,
            eligible_date TIMESTAMP,
            paid_date TIMESTAMP,
            refund_period_days INTEGER NOT NULL DEFAULT 14,
            notes TEXT,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
            FOREIGN KEY (referral_code_id) REFERENCES referralcode(id) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
            FOREIGN KEY (referred_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
            FOREIGN KEY (payment_user_id) REFERENCES paymentsuser(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for referralcommission
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcommission_org ON referralcommission(org_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcommission_referred ON referralcommission(referred_user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcommission_payment_user ON referralcommission(payment_user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_referralcommission_referrer_status ON referralcommission(referrer_user_id, status)')
    op.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_referralcommission_unique ON referralcommission(payment_user_id, referral_code_id)')
    
    # Create referrerpayoutrequest table
    op.execute("""
        CREATE TABLE IF NOT EXISTS referrerpayoutrequest (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            referrer_user_id BIGINT NOT NULL,
            amount FLOAT NOT NULL,
            status payoutstatus NOT NULL DEFAULT 'REQUESTED',
            payout_method VARCHAR(50) NOT NULL,
            payout_details JSON NOT NULL,
            request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processed_date TIMESTAMP,
            completed_date TIMESTAMP,
            payment_reference VARCHAR(255),
            notes TEXT,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES "user"(id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for referrerpayoutrequest
    op.execute('CREATE INDEX IF NOT EXISTS idx_payoutrequest_org ON referrerpayoutrequest(org_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_payoutrequest_referrer_status ON referrerpayoutrequest(referrer_user_id, status)')
    
    # Create emaildomainlist table
    op.execute("""
        CREATE TABLE IF NOT EXISTS emaildomainlist (
            id SERIAL PRIMARY KEY,
            domain VARCHAR(255) NOT NULL UNIQUE,
            list_type domainlisttype NOT NULL,
            source VARCHAR(100) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_verified_at TIMESTAMP
        )
    """)
    
    # Create indexes for emaildomainlist
    op.execute('CREATE INDEX IF NOT EXISTS ix_emaildomainlist_domain ON emaildomainlist(domain)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_emaildomainlist_list_type ON emaildomainlist(list_type)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_emaildomainlist_is_active ON emaildomainlist(is_active)')
    
    # Create payments_config table
    op.execute("""
        CREATE TABLE IF NOT EXISTS payments_config (
            id SERIAL PRIMARY KEY,
            org_id BIGINT,
            enabled BOOLEAN NOT NULL DEFAULT false,
            active BOOLEAN NOT NULL DEFAULT false,
            provider VARCHAR(50) NOT NULL,
            provider_specific_id VARCHAR(255),
            provider_config JSON,
            creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE CASCADE
        )
    """)
    
    # Add referral_code_id to paymentsuser if not exists
    op.execute("""
        ALTER TABLE paymentsuser 
        ADD COLUMN IF NOT EXISTS referral_code_id BIGINT
    """)


def downgrade():
    # Drop tables in reverse order
    op.execute('DROP TABLE IF EXISTS emaildomainlist CASCADE')
    op.execute('DROP TABLE IF EXISTS payments_config CASCADE')
    op.execute('DROP TABLE IF EXISTS referrerpayoutrequest CASCADE')
    op.execute('DROP TABLE IF EXISTS referralcommission CASCADE')
    op.execute('DROP TABLE IF EXISTS referraltracking CASCADE')
    op.execute('DROP TABLE IF EXISTS referralcode CASCADE')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS domainlisttype CASCADE')
    op.execute('DROP TYPE IF EXISTS payoutstatus CASCADE')
    op.execute('DROP TYPE IF EXISTS commissionstatus CASCADE')
    op.execute('DROP TYPE IF EXISTS referralcodestatus CASCADE')
    
    # Drop user columns
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS has_referral_code')
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS referral_commission_balance')
    
    # Drop paymentsuser column
    op.execute('ALTER TABLE paymentsuser DROP COLUMN IF EXISTS referral_code_id')
