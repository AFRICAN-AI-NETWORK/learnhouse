
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def diagnose():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        # Find the activity
        res = session.execute(text("SELECT id, name, activity_uuid FROM activity WHERE name ILIKE '%Python Loop%' AND course_id = 15")).all()
        print("--- ACTIVITY CHECK ---")
        for r in res:
            aid, name, auuid = r
            print(f"ID: {aid}, Name: {name}, UUID: {auuid}")
            
            # Check for linked blocks
            blocks = session.execute(text("SELECT id, block_uuid, block_type FROM block WHERE activity_id = :aid"), {"aid": aid}).all()
            print(f"  Blocks found: {len(blocks)}")
            for b in blocks:
                print(f"    Block ID: {b[0]}, UUID: {b[1]}, Type: {b[2]}")

if __name__ == "__main__":
    diagnose()
