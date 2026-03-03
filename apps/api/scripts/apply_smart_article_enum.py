"""Apply Smart Article enum values directly to Postgres."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
db_url = os.environ.get("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(db_url)

with engine.connect() as conn:
    # Check existing activity types
    result = conn.execute(text(
        "SELECT enumlabel FROM pg_enum "
        "WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitytypeenum')"
    ))
    existing = [r[0] for r in result]
    print("Existing activity types:", existing)

    if "TYPE_SMART_ARTICLE" not in existing:
        conn.execute(text("ALTER TYPE activitytypeenum ADD VALUE 'TYPE_SMART_ARTICLE'"))
        conn.commit()
        print(">> Added TYPE_SMART_ARTICLE")
    else:
        print(">> TYPE_SMART_ARTICLE already exists")

    # Check existing sub types
    result2 = conn.execute(text(
        "SELECT enumlabel FROM pg_enum "
        "WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activitysubtypeenum')"
    ))
    existing2 = [r[0] for r in result2]
    print("Existing sub types:", existing2)

    if "SUBTYPE_SMART_ARTICLE_PDF" not in existing2:
        conn.execute(text("ALTER TYPE activitysubtypeenum ADD VALUE 'SUBTYPE_SMART_ARTICLE_PDF'"))
        conn.commit()
        print(">> Added SUBTYPE_SMART_ARTICLE_PDF")
    else:
        print(">> SUBTYPE_SMART_ARTICLE_PDF already exists")

print("Done! Enum values are ready.")
