#!/usr/bin/env python3
"""
Fix missing user_status column in the user table.
This script checks if the column exists and adds it if missing.
"""
from sqlalchemy import create_engine, text, inspect
from config.config import get_learnhouse_config

def fix_user_status_column():
    """Add user_status column if it doesn't exist."""
    learnhouse_config = get_learnhouse_config()
    engine = create_engine(
        learnhouse_config.database_config.sql_connection_string,
        echo=True,
    )
    
    with engine.connect() as conn:
        # Check if column exists
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('user')]
        
        print(f"Current columns in 'user' table: {columns}")
        
        # Check for all waitlist-related columns
        missing_columns = []
        if 'user_status' not in columns:
            missing_columns.append('user_status')
        if 'waitlist_interest' not in columns:
            missing_columns.append('waitlist_interest')
        if 'waitlist_joined_date' not in columns:
            missing_columns.append('waitlist_joined_date')
        if 'waitlist_activated_date' not in columns:
            missing_columns.append('waitlist_activated_date')
        
        if not missing_columns:
            print("[OK] All waitlist columns already exist!")
            return
        
        print(f"[WARNING] Missing columns: {', '.join(missing_columns)}. Adding them...")
        
        # Start a transaction
        trans = conn.begin()
        try:
            # Add user_status column with default value
            if 'user_status' not in columns:
                conn.execute(text("""
                    ALTER TABLE "user" 
                    ADD COLUMN user_status VARCHAR NOT NULL DEFAULT 'ACTIVE'
                """))
                print("  Added user_status column")
            
            # Add waitlist_interest column
            if 'waitlist_interest' not in columns:
                conn.execute(text("""
                    ALTER TABLE "user" 
                    ADD COLUMN waitlist_interest VARCHAR
                """))
                print("  Added waitlist_interest column")
            
            # Add waitlist_joined_date column
            if 'waitlist_joined_date' not in columns:
                conn.execute(text("""
                    ALTER TABLE "user" 
                    ADD COLUMN waitlist_joined_date VARCHAR
                """))
                print("  Added waitlist_joined_date column")
            
            # Add waitlist_activated_date column
            if 'waitlist_activated_date' not in columns:
                conn.execute(text("""
                    ALTER TABLE "user" 
                    ADD COLUMN waitlist_activated_date VARCHAR
                """))
                print("  Added waitlist_activated_date column")
            
            # Create index on user_status
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_user_user_status ON "user" (user_status)
            """))
            print("  Created index on user_status")
            
            # Set all existing users to ACTIVE if they don't have a status
            conn.execute(text("""
                UPDATE "user" SET user_status = 'ACTIVE' WHERE user_status IS NULL
            """))
            
            trans.commit()
            print(f"[SUCCESS] Successfully added {len(missing_columns)} column(s) and index!")
            
        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Error: {e}")
            raise
        finally:
            conn.close()

if __name__ == "__main__":
    fix_user_status_column()
