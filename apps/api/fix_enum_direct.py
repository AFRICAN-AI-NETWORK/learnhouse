#!/usr/bin/env python3
"""
Direct script to add 'paystack' to the paymentproviderenum in PostgreSQL.
Run this script to fix the enum issue immediately.

Usage:
    cd apps/api
    uv run python fix_enum_direct.py
"""
import os
from sqlalchemy import create_engine, text
from config.config import get_learnhouse_config

def fix_enum():
    """Add 'paystack' to the paymentproviderenum if it doesn't exist."""
    learnhouse_config = get_learnhouse_config()
    engine = create_engine(
        learnhouse_config.database_config.sql_connection_string,
        echo=False,
        isolation_level="AUTOCOMMIT"  # Required for ALTER TYPE
    )
    
    with engine.connect() as conn:
        # Check if 'paystack' already exists
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'paystack' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentproviderenum')
            )
        """))
        exists = result.scalar()
        
        # Show current enum values first
        result = conn.execute(text("""
            SELECT 
                n.nspname as schema_name,
                t.typname as type_name,
                e.enumlabel as enum_value
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'paymentproviderenum'
            ORDER BY e.enumsortorder
        """))
        enum_info = result.fetchall()
        print("Enum information:")
        for row in enum_info:
            print(f"  Schema: {row[0]}, Type: {row[1]}, Value: {row[2]}")
        
        values = [row[2] for row in enum_info]
        print(f"\nCurrent enum values: {values}")
        
        if exists:
            print("[OK] 'paystack' already exists in paymentproviderenum")
            return
        
        # Add 'paystack' to the enum
        print("Adding 'paystack' to paymentproviderenum...")
        try:
            conn.execute(text("ALTER TYPE paymentproviderenum ADD VALUE 'paystack'"))
            conn.commit()
            print("[OK] Successfully added 'paystack' to paymentproviderenum")
        except Exception as e:
            print(f"[ERROR] Error adding 'paystack': {e}")
            # Try with IF NOT EXISTS (PostgreSQL 9.5+)
            try:
                conn.execute(text("""
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_enum 
                            WHERE enumlabel = 'paystack' 
                            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentproviderenum')
                        ) THEN
                            ALTER TYPE paymentproviderenum ADD VALUE 'paystack';
                        END IF;
                    END $$;
                """))
                conn.commit()
                print("[OK] Successfully added 'paystack' to paymentproviderenum (using DO block)")
            except Exception as e2:
                print(f"[ERROR] Error with DO block: {e2}")
                raise
        
        # Verify it was added
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentproviderenum')
            ORDER BY enumsortorder
        """))
        values = [row[0] for row in result.fetchall()]
        print(f"Updated enum values: {values}")

if __name__ == "__main__":
    fix_enum()
