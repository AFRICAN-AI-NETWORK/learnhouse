
from sqlmodel import Session, create_engine, select, text
from src.db.courses.courses import Course
from src.db.courses.chapters import Chapter
from src.db.courses.activities import Activity
from src.db.courses.chapter_activities import ChapterActivity
from config.config import get_learnhouse_config

def diagnose_content():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    target_id = 15
    
    with Session(engine) as session:
        # 1. Count survivors
        chapters = session.exec(select(Chapter).where(Chapter.course_id == target_id)).all()
        activities = session.exec(select(Activity).where(Activity.course_id == target_id)).all()
        links = session.exec(select(ChapterActivity).where(ChapterActivity.course_id == target_id)).all()
        
        print(f"--- CONTENT FOR COURSE {target_id} ---")
        print(f"Chapters: {len(chapters)}")
        print(f"Activities: {len(activities)}")
        print(f"ChapterActivity Links: {len(links)}")
        
        # 2. Check for orphaned activities? (No course_id or old course_id)
        # We can't check for old course_id as they were deleted from course table if the FK is enforced.
        
        if len(activities) > 0 and len(links) == 0:
            print("\nCRITICAL: Activities exist but the links (ChapterActivity) are missing.")
            print("The deletion of the old course records likely triggered a CASCADE delete on the links.")

if __name__ == "__main__":
    diagnose_content()
