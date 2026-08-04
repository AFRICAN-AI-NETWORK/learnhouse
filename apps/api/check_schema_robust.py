import os
import sys

sys.path.append(os.getcwd())
from sqlalchemy import inspect

from src.core.events.database import engine


def check_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns("role")
    print("Columns in 'role' table:")
    for column in columns:
        print(
            f"Name: {column['name']}, Type: {column['type']}, Nullable: {column['nullable']}, Default: {column.get('default')}"
        )


if __name__ == "__main__":
    check_schema()
