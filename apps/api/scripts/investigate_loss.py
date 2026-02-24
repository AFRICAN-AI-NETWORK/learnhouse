
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config
import os

def check_loss():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        print("--- DATABASE COUNTS ---")
        tables = ["assignment", "assignmenttask", "assignmenttasksubmission", "block", "activity"]
        for table in tables:
            try:
                count = session.execute(text(f"SELECT COUNT(*) FROM \"{table}\"")).scalar()
                print(f"{table}: {count}")
            except Exception as e:
                print(f"{table}: Error {str(e).splitlines()[0]}")
        
        # Check assigned course_id for the surviving assignment
        print("\n--- SURVIVING ASSIGNMENTS ---")
        try:
            res = session.execute(text("SELECT id, title, course_id, chapter_id, activity_id FROM assignment")).all()
            for r in res:
                print(f"ID {r[0]}: {r[1]} (Course={r[2]}, Chap={r[3]}, Act={r[4]})")
        except:
             print("Error or no records in assignment.")

    print("\n--- PHYSICAL DISK CHECK ---")
    # Usually files are in content/ folder in LearnHouse
    content_path = "/app/content" # Adjust based on your setup, usually /app/content
    if os.path.exists(content_path):
        print(f"Directory {content_path} found.")
        # List files recursively but limited
        file_count = 0
        for root, dirs, files in os.walk(content_path):
            file_count += len(files)
        print(f"Total files in storage: {file_count}")
        
        # Show a few samples
        for root, dirs, files in os.walk(content_path):
            for name in files[:10]:
                print(f"  Sample: {name}")
            break
    else:
        print(f"Directory {content_path} NOT found.")

if __name__ == "__main__":
    check_loss()
