import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

load_dotenv()

from sqlmodel import create_engine, text

DATABASE_URL = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
# Must use isolation_level="AUTOCOMMIT" to drop database/schema if needed
engine = create_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")

try:
    with engine.connect() as conn:
        print("Dropping public schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        print("Creating public schema...")
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        print("Done!")
except Exception as e:
    print("Failed:", e)
