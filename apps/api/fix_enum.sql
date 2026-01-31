-- Fix paymentproviderenum to include 'paystack'
-- Run this SQL script directly on your database if migrations fail

-- Check if 'paystack' already exists in the enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'paystack' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentproviderenum')
    ) THEN
        -- Add 'paystack' to the enum
        ALTER TYPE paymentproviderenum ADD VALUE 'paystack';
    END IF;
END $$;
