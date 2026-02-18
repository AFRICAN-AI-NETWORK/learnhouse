"""Add CODE_EDITOR to AssignmentTaskTypeEnum"""
import os
from pathlib import Path
from sqlalchemy import text
from sqlmodel import create_engine, Session
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Get database URL from environment
database_url = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
if not database_url:
    raise ValueError("LEARNHOUSE_SQL_CONNECTION_STRING environment variable not set")

# Create engine
engine = create_engine(database_url)

# Add enum value
with Session(engine) as session:
    try:
        # PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE in older versions
        # So we'll try to add it and ignore if it already exists
        session.exec(text("ALTER TYPE assignmenttasktypeenum ADD VALUE 'CODE_EDITOR'"))
        session.commit()
        print("✅ CODE_EDITOR enum value added successfully")
    except Exception as e:
        if "already exists" in str(e):
            print("✅ CODE_EDITOR enum value already exists")
        else:
            print(f"❌ Error: {e}")
            raise
