import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import Session, create_engine
from src.db.users import User

DATABASE_URL = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(DATABASE_URL)

try:
    with Session(engine) as session:
        admin_db = session.query(User).filter(User.email == "admin@school.dev").first()
        if admin_db:
            admin_db.email_verified = True
            session.add(admin_db)
            session.commit()
            print("Admin email verified successfully.")
        else:
            print("Admin user not found.")
except Exception as e:
    print("Failed:", e)
