
import os
import shutil
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config
import json

def fix_pdf_paths():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    org_uuid = "org_daaf379c-ab58-466f-b729-e2ff6327790f"

    target_uuid = "course_3ef9cfef-c271-448f-be18-703ac4f17f05"
    base_path = f"/app/content/orgs/{org_uuid}/courses"
    target_course_path = os.path.join(base_path, target_uuid)
    
    with Session(engine) as session:
        # Get all activities for course 15 that are documents
        # We also need to search the disk to find where they currently are
        activities = session.execute(text("SELECT id, name, activity_uuid, content FROM activity WHERE course_id = 15")).all()
        
        folders = os.listdir(base_path) if os.path.exists(base_path) else []
        
        moved_count = 0
        updated_count = 0
        
        for act_id, name, act_uuid, cur_content in activities:
            print(f"\nProcessing Activity {act_id}: {name}")
            
            # The frontend expects: content/orgs/{orgUUID}/courses/{courseUUID}/activities/{activityUUID}/documentpdf/{fileId}
            expected_relative_dir = f"activities/{act_uuid}/documentpdf"
            expected_dir = os.path.join(target_course_path, expected_relative_dir)
            os.makedirs(expected_dir, exist_ok=True)
            
            # Search for the PDF in the old or new structure
            found_path = None
            found_filename = None
            
            # Check if it's already in the "correct" expected dir
            if os.path.exists(expected_dir):
                files = [f for f in os.listdir(expected_dir) if f.endswith(".pdf")]
                if files:
                    found_path = os.path.join(expected_dir, files[0])
                    found_filename = files[0]
                    print(f"  Already in correct location: {found_filename}")

            if not found_path:
                # Search across all course folders
                for course_folder in folders:
                    search_root = os.path.join(base_path, course_folder, "activities", act_uuid)
                    if os.path.exists(search_root):
                        for root, dirs, f in os.walk(search_root):
                            for file in f:
                                if file.endswith(".pdf"):
                                    found_path = os.path.join(root, file)
                                    found_filename = file
                                    break
                            if found_path: 
                                break
                    if found_path: 
                        break

            if found_path:
                # Move to the expected location if it's not there
                target_path = os.path.join(expected_dir, found_filename)
                if found_path != target_path:
                    try:
                        shutil.copy2(found_path, target_path)
                        print(f"  Copied {found_filename} to {target_path}")
                        moved_count += 1
                    except Exception as e:
                        print(f"  Failed to copy: {e}")
                
                # Update activity content to include the filename (frontend needs this)
                content_dict = json.loads(cur_content) if isinstance(cur_content, str) else (cur_content or {})
                if content_dict.get("filename") != found_filename:
                    content_dict["filename"] = found_filename
                    session.execute(text("UPDATE activity SET content = :cnt WHERE id = :id"), {
                        "cnt": json.dumps(content_dict),
                        "id": act_id
                    })
                    updated_count += 1
                    print(f"  Updated database content with filename: {found_filename}")
            else:
                 print("  No PDF found for this activity on disk.")

        session.commit()
        print(f"\nFINISH: Moved {moved_count} files and updated {updated_count} database records.")

if __name__ == "__main__":
    fix_pdf_paths()
