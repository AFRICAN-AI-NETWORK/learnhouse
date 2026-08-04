import os
import sys

sys.path.append(os.getcwd())
try:
    from sqlalchemy import inspect

    from src.core.events.database import engine

    inspector = inspect(engine)
    columns = inspector.get_columns("role")
    print("START_COLUMNS")
    for column in columns:
        print(f"COL: {column['name']} | {column['type']} | {column['nullable']}")
    print("END_COLUMNS")
except Exception as e:
    print(f"ERROR: {e}")
