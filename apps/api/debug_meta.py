import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import Session, create_engine
from src.db.users import User
from src.services.courses.courses import get_course_meta
from fastapi import Request

DATABASE_URL = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(DATABASE_URL)

async def test():
    with Session(engine) as session:
        # Mock request
        request = Request({"type": "http", "method": "GET", "url": "http://127.0.0.1:1338/"})
        # Admin user is ID 1
        current_user = session.get(User, 1)
        
        try:
            meta = await get_course_meta(
                request=request,
                course_uuid="course_cca0f4e3-4f7c-42f4-afa8-11b5c2f1946b",
                db_session=session,
                current_user=current_user,
                with_unpublished_activities=True
            )
            print("Success")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
