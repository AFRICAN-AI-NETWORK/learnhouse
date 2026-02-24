
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def check_activity_data():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        print("--- Activity Content Check (Course 15) ---")
        # Get count per activity type
        types = session.execute(text("SELECT activity_type, COUNT(*) FROM activity WHERE course_id = 15 GROUP BY activity_type")).all()
        for t, count in types:
            print(f"Type {t}: {count} records")
            
        # Inspect content of first few
        res = session.execute(text("SELECT id, name, activity_type, content, details FROM activity WHERE course_id = 15 LIMIT 10")).all()
        for r in res:
            content_val = str(r[3])
            details_val = str(r[4])
            print(f"\nActivity {r[0]} ({r[1]}) - Type: {r[2]}")
            print(f"  Content: {content_val[:100]}..." if len(content_val) > 100 else f"  Content: {content_val}")
            print(f"  Details: {details_val[:100]}..." if len(details_val) > 100 else f"  Details: {details_val}")

if __name__ == "__main__":
    check_activity_data()
