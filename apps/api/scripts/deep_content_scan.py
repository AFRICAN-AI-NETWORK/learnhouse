
from sqlmodel import create_engine, text
from config.config import get_learnhouse_config

def deep_scan():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    # Moved Chapter IDs from user logs
    chapter_ids = [7, 16, 18, 8, 17, 21, 23, 24, 25, 26, 27, 28, 29, 9, 10, 11, 12, 13, 14, 15]
    
    with engine.connect() as conn:
        print("--- Global Counts ---")
        for table in ["block", "assignment", "chapteractivity", "activity", "chapter", "auditlog"]:
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM \"{table}\"")).scalar()
                print(f"{table}: {count}")
            except Exception:
                print(f"{table}: Table not found or error")

        print("\n--- Orphan Check (Searching by Chapter ID) ---")
        for table in ["block", "chapteractivity", "assignment"]:
            try:
                result = conn.execute(text(f"SELECT COUNT(*) FROM \"{table}\" WHERE chapter_id IN :ids"), {"ids": tuple(chapter_ids)}).scalar()
                print(f"{table} records associated with moved chapters: {result}")
            except Exception as e:
                print(f"{table}: Error - {str(e).splitlines()[0]}")

        print("\n--- Content Fragments (Searching Activity Details) ---")
        # Check if activity.details or activity.content caught some of the data
        res = conn.execute(text("SELECT id, name, content, details FROM activity WHERE course_id = 15 LIMIT 5")).all()
        for r in res:
            print(f"Activity {r[0]} ({r[1]}): Content Length={len(str(r[2]))}, Details Length={len(str(r[3]))}")

if __name__ == "__main__":
    deep_scan()
