
from sqlmodel import create_engine, text
from config.config import get_learnhouse_config

def inspect_activities():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with engine.connect() as conn:
        print("--- Columns in activity table ---")
        columns = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'activity'"))
        for col in columns:
            print(f"  - {col[0]}")
            
        print("\n--- Sample data from activity table (first 5) ---")
        data = conn.execute(text("SELECT id, name, course_id FROM activity WHERE course_id = 15 LIMIT 5"))
        for row in data:
            print(f"  ID: {row[0]}, Name: {row[1]}, CourseID: {row[2]}")

if __name__ == "__main__":
    inspect_activities()
