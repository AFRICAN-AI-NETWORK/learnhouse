
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config
import os

def find_uuids():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    # We need to find the org_uuid first
    # And the course_uuid for the target (15)
    
    with Session(engine) as session:
        org = session.execute(text("SELECT org_uuid FROM organization LIMIT 1")).first()
        org_uuid = org[0] if org else "UNKNOWN"
        
        target = session.execute(text("SELECT course_uuid FROM course WHERE id = 15")).first()
        target_uuid = target[0] if target else "UNKNOWN"
        
        print(f"Org UUID: {org_uuid}")
        print(f"Target Course (15) UUID: {target_uuid}")
        
        # Now search for ANY course folders on disk
        content_root = "/app/content/orgs" # Prod
        if os.path.exists(content_root):
            courses_path = os.path.join(content_root, org_uuid, "courses")
            if os.path.exists(courses_path):
                print(f"\nScanning directories in {courses_path}:")
                for d in os.listdir(courses_path):
                    print(f"- {d}")
            else:
                 print(f"Courses path {courses_path} not found.")
        else:
            print(f"Content root {content_root} not found.")

if __name__ == "__main__":
    find_uuids()
