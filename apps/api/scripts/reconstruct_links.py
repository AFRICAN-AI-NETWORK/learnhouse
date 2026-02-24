
from sqlmodel import Session, create_engine, select, text
from src.db.courses.chapter_activities import ChapterActivity
from config.config import get_learnhouse_config
import datetime

def reconstruct_links():
    config = get_learnhouse_config()
    print("Connecting to database to reconstruct missing links...")
    engine = create_engine(config.database_config.sql_connection_string)
    
    target_id = 15
    org_id = 1 # We'll assume the same org_id
    
    with Session(engine) as session:
        # We'll collect (chapter_id, activity_id) pairs from Block and Assignment
        found_links = set()
        
        # 1. From Block
        blocks = session.execute(text("SELECT chapter_id, activity_id FROM block WHERE course_id = :tid"), {"tid": target_id}).all()
        for row in blocks:
            if row[0] and row[1]:
                found_links.add((row[0], row[1]))
                
        # 2. From Assignment
        assignments = session.execute(text("SELECT chapter_id, activity_id FROM assignment WHERE course_id = :tid"), {"tid": target_id}).all()
        for row in assignments:
            if row[0] and row[1]:
                found_links.add((row[0], row[1]))
        
        print(f"Found {len(found_links)} unique chapter-activity associations.")
        
        # 3. Reconstruct ChapterActivity
        added_count = 0
        now_str = datetime.datetime.now().isoformat()
        
        for chap_id, act_id in found_links:
            # Check if link already exists
            existing = session.exec(select(ChapterActivity).where(
                ChapterActivity.chapter_id == chap_id,
                ChapterActivity.activity_id == act_id
            )).first()
            
            if not existing:
                # We'll need to guess the order, or just use 1 for now
                # In a real scenario we'd want to preserve order, but it might be lost.
                # Let's try to get current max order in that chapter
                stmt = text("SELECT COALESCE(MAX(\"order\"), 0) FROM chapteractivity WHERE chapter_id = :cid")
                res = session.execute(stmt, {"cid": chap_id}).first()
                max_order = res[0] if res else 0
                
                new_link = ChapterActivity(
                    chapter_id=chap_id,
                    activity_id=act_id,
                    course_id=target_id,
                    org_id=org_id,
                    order=max_order + 1,
                    creation_date=now_str,
                    update_date=now_str
                )
                session.add(new_link)
                added_count += 1
        
        session.commit()
        print(f"SUCCESS: Reconstructed {added_count} ChapterActivity links.")

if __name__ == "__main__":
    reconstruct_links()
