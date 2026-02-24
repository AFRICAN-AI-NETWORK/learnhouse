
from sqlmodel import Session, create_engine, select
from src.db.courses.chapters import Chapter
from src.db.courses.activities import Activity
from config.config import get_learnhouse_config

def map_names():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        # Get all chapters for course 15
        chapters = session.exec(select(Chapter).where(Chapter.course_id == 15)).all()
        # Get all activities for course 15
        activities = session.exec(select(Activity).where(Activity.course_id == 15)).all()
        
        print("--- ALL CHAPTERS ---")
        for c in chapters:
            print(f"C{c.id}: {c.name}")
            
        print("\n--- ALL ACTIVITIES ---")
        for a in activities:
            print(f"A{a.id}: {a.name}")

if __name__ == "__main__":
    map_names()
