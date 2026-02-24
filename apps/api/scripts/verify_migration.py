
from sqlmodel import Session, create_engine, select
from src.db.courses.courses import Course
from src.db.courses.chapters import Chapter
from src.db.courses.activities import Activity
from src.db.courses.blocks import Block
from config.config import get_learnhouse_config

def check_migration_status():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    source_ids = [9, 6, 8, 11, 13, 14, 10]
    target_id = 15
    
    with Session(engine) as session:
        # Check target
        target = session.get(Course, target_id)
        if not target:
            print(f"ERROR: Target course {target_id} not found.")
            return
        
        target_chapters = session.exec(select(Chapter).where(Chapter.course_id == target_id)).all()
        print(f"Target Course '{target.name}' (ID {target_id}) has {len(target_chapters)} chapters.")
        
        # Check sources
        for s_id in source_ids:
            source = session.get(Course, s_id)
            if not source:
                print(f"WARNING: Source course {s_id} not found.")
                continue
            
            chapters = session.exec(select(Chapter).where(Chapter.course_id == s_id)).all()
            activities = session.exec(select(Activity).where(Activity.course_id == s_id)).all()
            blocks = session.exec(select(Block).where(Block.course_id == s_id)).all()
            
            print(f"Source Course '{source.name}' (ID {s_id}): {len(chapters)} chapters, {len(activities)} activities, {len(blocks)} blocks.")

if __name__ == "__main__":
    check_migration_status()
