
from sqlmodel import Session, create_engine, select
from src.db.courses.courses import Course
from src.db.courses.chapters import Chapter
from src.db.courses.activities import Activity
from src.db.courses.blocks import Block
from src.db.courses.course_chapters import CourseChapter
from config.config import get_learnhouse_config
import datetime

def run_migration():
    config = get_learnhouse_config()
    print(f"Connecting to database to perform migration...")
    engine = create_engine(config.database_config.sql_connection_string)
    
    source_ids = [9, 6, 8, 11, 13, 14, 10]
    target_id = 15
    
    with Session(engine) as session:
        # 1. Verify target course
        target_course = session.get(Course, target_id)
        if not target_course:
            print(f"ERROR: Target course with ID {target_id} not found. Please verify the ID.")
            return

        print(f"Target Course found: {target_course.name} (ID: {target_id})")
        
        # Determine starting order for new chapters in the target course
        existing_chapters = session.exec(
            select(CourseChapter).where(CourseChapter.course_id == target_id)
        ).all()
        current_max_order = max([c.order for c in existing_chapters]) if existing_chapters else 0
        print(f"Current highest chapter order in target course: {current_max_order}")

        order_offset = current_max_order + 1

        for s_id in source_ids:
            source_course = session.get(Course, s_id)
            if not source_course:
                print(f"WARNING: Source course with ID {s_id} not found. Skipping...")
                continue
            
            print(f"-- Processing Course: {source_course.name} (ID: {s_id}) --")
            
            # A. Update Chapters
            chapters = session.exec(select(Chapter).where(Chapter.course_id == s_id)).all()
            for chapter in chapters:
                print(f"   Moving Chapter: {chapter.name} (ID: {chapter.id})")
                chapter.course_id = target_id
                session.add(chapter)
                
                # Update CourseChapter link
                course_chapters = session.exec(
                    select(CourseChapter).where(CourseChapter.chapter_id == chapter.id)
                ).all()
                for cc in course_chapters:
                    cc.course_id = target_id
                    cc.order += order_offset # Offset order to append to target course
                    session.add(cc)
            
            # B. Update Activities
            activities = session.exec(select(Activity).where(Activity.course_id == s_id)).all()
            for activity in activities:
                activity.course_id = target_id
                session.add(activity)

            # C. Update Blocks
            blocks = session.exec(select(Block).where(Block.course_id == s_id)).all()
            for block in blocks:
                block.course_id = target_id
                session.add(block)
            
            # D. Delete the old course record as all content has been moved
            print(f"   Deleting old standalone course record {s_id}...")
            session.delete(source_course)
            
            # Increment order offset for the next source course modules
            order_offset += len(chapters) if chapters else 1

        session.commit()
        print("\nSUCCESS: All content has been migrated to 'AAN Fundamentals'.")

if __name__ == "__main__":
    run_migration()
