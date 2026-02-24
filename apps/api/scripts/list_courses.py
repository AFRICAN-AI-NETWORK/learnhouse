
from sqlmodel import Session, create_engine, select
from src.db.courses.courses import Course
from config.config import get_learnhouse_config
import os

def list_courses():
    config = get_learnhouse_config()
    print(f"Connecting to: {config.database_config.sql_connection_string}")
    engine = create_engine(config.database_config.sql_connection_string)
    
    with Session(engine) as session:
        courses = session.exec(select(Course)).all()
        print(f"Total courses: {len(courses)}")
        for c in courses:
            print(f"- ID: {c.id}, Name: {c.name}")

if __name__ == "__main__":
    list_courses()
