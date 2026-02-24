
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def check_orphans():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        print("--- Table Counts ---")
        for table in ["block", "assignment", "chapteractivity", "activity", "chapter"]:
            count = session.execute(text(f"SELECT COUNT(*) FROM \"{table}\"")).scalar()
            print(f"{table}: {count}")
            
        print("\n--- Activity Samples (Course 15) ---")
        acts = session.execute(text("SELECT id, name, course_id FROM activity WHERE course_id = 15 LIMIT 10")).all()
        for a in acts:
            print(f"  Activity ID {a[0]}: {a[1]}")
            
        print("\n--- Block Samples (Any) ---")
        blks = session.execute(text("SELECT id, chapter_id, activity_id, course_id FROM block LIMIT 10")).all()
        for b in blks:
            print(f"  Block ID {b[0]}: Chap={b[1]}, Act={b[2]}, Course={b[3]}")

if __name__ == "__main__":
    check_orphans()
