import os
import sys

sys.path.append(os.getcwd())
from sqlmodel import Session, text

from src.core.events.database import engine


def check_schema():
    with Session(engine) as session:
        # Check if SQLite or Postgres
        try:
            result = session.execute(text("PRAGMA table_info(role)"))
            columns = result.all()
            if columns:
                print("Role table columns (SQLite):")
                for col in columns:
                    print(col)
        except Exception:
            result = session.execute(
                text(
                    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'role'"
                )
            )
            columns = result.all()
            if columns:
                print("Role table columns (Postgres):")
                for col in columns:
                    print(col)


if __name__ == "__main__":
    check_schema()
