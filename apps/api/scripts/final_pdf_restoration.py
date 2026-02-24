
import os
import shutil
import uuid
from datetime import datetime
from sqlmodel import Session, create_engine, text
from config.config import get_learnhouse_config

def restore_docs():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    org_uuid = "org_daaf379c-ab58-466f-b729-e2ff6327790f"
    target_id = 15
    target_uuid = "course_3ef9cfef-c271-448f-be18-703ac4f17f05"
    base_path = f"/app/content/orgs/{org_uuid}/courses"
    target_course_path = os.path.join(base_path, target_uuid)
    
    with Session(engine) as session:
        # Get activities for course 15
        # We need their chapter IDs too to populate the Block table correctly
        stmt = text("""
            SELECT a.id, a.activity_uuid, a.name, ca.chapter_id, a.content
            FROM activity a
            JOIN chapteractivity ca ON a.id = ca.activity_id
            WHERE a.course_id = :tid
        """)
        activities = session.execute(stmt, {"tid": target_id}).all()
        
        folders = os.listdir(base_path) if os.path.exists(base_path) else []
        
        restored_count = 0
        
        for act_id, act_uuid, name, chap_id, cur_content in activities:
            print(f"Checking Activity {act_id}: {name}")
            
            # 1. Search for the file on disk (same logic as discovery)
            found_path = None
            found_filename = None
            
            for course_folder in folders:
                if course_folder == target_uuid:
                    continue # Already in target? Let's check anyway
                    
                search_path = os.path.join(base_path, course_folder, "activities", act_uuid)
                if os.path.exists(search_path):
                    # Walk to find the actual PDF
                    for root, dirs, files in os.walk(search_path):
                        for f in files:
                            if f.endswith(".pdf"):
                                found_path = os.path.join(root, f)
                                found_filename = f
                                break
                        if found_path: break
                if found_path: break
            
            if found_path:
                print(f"  Source file found: {found_filename}")
                
                # 2. Prepare new location
                block_uuid = f"block_{uuid.uuid4()}"
                # Path: orgs/{org_uuid}/courses/{course_uuid}/activities/{activity_uuid}/dynamic/blocks/pdfBlock/{block_uuid}/{filename}
                relative_dir = f"activities/{act_uuid}/dynamic/blocks/pdfBlock/{block_uuid}"
                new_dir = os.path.join(target_course_path, relative_dir)
                os.makedirs(new_dir, exist_ok=True)
                
                new_path = os.path.join(new_dir, found_filename)
                
                # 3. Copy file
                try:
                    shutil.copy2(found_path, new_path)
                    print(f"  File copied to new course structure.")
                except Exception as e:
                    print(f"  Copy failed: {e}")
                    continue

                # 4. Create Block record
                # We'll use raw SQL to avoid ORM issues
                block_content = {
                    "file_id": block_uuid.replace("block_", ""),
                    "file_format": "pdf",
                    "file_name": found_filename,
                    "file_size": os.path.getsize(new_path),
                    "file_type": "application/pdf",
                    "activity_uuid": act_uuid
                }
                
                import json
                now = datetime.now().isoformat()
                
                insert_block = text("""
                    INSERT INTO "block" 
                    (block_uuid, block_type, content, org_id, course_id, chapter_id, activity_id, creation_date, update_date)
                    VALUES (:buuid, 'BLOCK_DOCUMENT_PDF', :content, 1, :tid, :cid, :aid, :now, :now)
                """)
                
                session.execute(insert_block, {
                    "buuid": block_uuid,
                    "content": json.dumps(block_content),
                    "tid": target_id,
                    "cid": chap_id,
                    "aid": act_id,
                    "now": now
                })
                
                restored_count += 1
                print(f"  BLOCK RESTORED.")
            else:
                print(f"  No source file found for this activity.")
        
        session.commit()
        print(f"\nFINISH: Successfully restored {restored_count} PDF lessons.")

if __name__ == "__main__":
    restore_docs()
