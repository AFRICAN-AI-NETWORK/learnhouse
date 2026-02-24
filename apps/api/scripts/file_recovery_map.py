
import os
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def map_files():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    content_path = "/app/content" # Production path
    
    print(f"Scanning {content_path} for matches...")
    
    with Session(engine) as session:
        activities = session.execute(text("SELECT id, name, activity_uuid, content FROM activity WHERE course_id = 15")).all()
        
        for act_id, name, uuid, content in activities:
            print(f"\nChecking Activity {act_id}: {name} ({uuid})")
            
            # Common LearnHouse patterns:
            # 1. /app/content/activities/<uuid>/<filename>
            # 2. /app/content/<uuid>/<filename>
            
            potential_paths = [
                os.path.join(content_path, "activities", uuid),
                os.path.join(content_path, uuid),
            ]
            
            found = False
            for p in potential_paths:
                if os.path.exists(p):
                    files = os.listdir(p)
                    print(f"  MATCH FOUND in {p}: {files}")
                    found = True
                    break
            
            if not found:
                print("  No directory found matching this UUID.")

if __name__ == "__main__":
    map_files()
