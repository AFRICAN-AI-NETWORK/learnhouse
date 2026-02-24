
from sqlmodel import create_engine, text
from config.config import get_learnhouse_config

def inspect_db():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with engine.connect() as conn:
        # List all tables
        print("--- Tables in Database ---")
        result = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        tables = [row[0] for row in result]
        for t in sorted(tables):
            print(f"- {t}")
            
        # Check specific columns for chapteractivity or equivalent
        candidate = "chapteractivity" if "chapteractivity" in tables else "chapter_activity" if "chapter_activity" in tables else None
        if candidate:
            print(f"\n--- Columns in {candidate} ---")
            columns = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{candidate}'"))
            for col in columns:
                print(f"  - {col[0]}")
        else:
            print("\nWARNING: Could not find chapteractivity or chapter_activity table.")

if __name__ == "__main__":
    inspect_db()
