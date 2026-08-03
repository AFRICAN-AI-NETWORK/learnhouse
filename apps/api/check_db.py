import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import Session, create_engine, text

DATABASE_URL = os.getenv("LEARNHOUSE_SQL_CONNECTION_STRING")
engine = create_engine(DATABASE_URL)

try:
    with Session(engine) as session:
        result = session.exec(text("SELECT due_date FROM chapter LIMIT 1")).all()
        print("Success:", result)
except Exception as e:
    print("Failed:", e)
