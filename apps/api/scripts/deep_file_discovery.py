
import os
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def find_missing_content():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    org_uuid = "org_daaf379c-ab58-466f-b729-e2ff6327790f"
    base_path = f"/app/content/orgs/{org_uuid}/courses"
    
    with Session(engine) as session:
        activities = session.execute(text("SELECT id, name, activity_uuid, activity_type FROM activity WHERE course_id = 15")).all()
        
        matches = {} # {activity_id: (found_course_uuid, sub_path, files)}
        
        folders = os.listdir(base_path) if os.path.exists(base_path) else []
        
        for act_id, name, act_uuid, act_type in activities:
            print(f"Searching for Activity {act_id}: {name} ({act_uuid})")
            found = False
            for course_folder in folders:
                # Check path pattern: courses/<course_uuid>/activities/<activity_uuid>
                search_path = os.path.join(base_path, course_folder, "activities", act_uuid)
                if os.path.exists(search_path):
                    # Find any files in dynamic/blocks/pdfBlock... or similar
                    # Actually let's just list what's inside
                    files = []
                    for root, dirs, f in os.walk(search_path):
                        for file in f:
                            files.append(os.path.join(root, file).replace(search_path, ""))
                    
                    matches[act_id] = (course_folder, search_path, files)
                    print(f"  FOUND in {course_folder}: {len(files)} files")
                    found = True
                    break
            if not found:
                 print("  NOT FOUND on disk.")

        print("\n--- SUMMARY OF DISCOVERIES ---")
        for aid, (c_uuid, path, files) in matches.items():
            print(f"Activity {aid} -> Course Folder {c_uuid} ({len(files)} files)")

if __name__ == "__main__":
    find_missing_content()
