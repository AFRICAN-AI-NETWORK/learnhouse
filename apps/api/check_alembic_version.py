#!/usr/bin/env python3
"""Check and fix alembic_version table"""

import os
import sys

# Add the api directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

from config.config import get_learnhouse_config


def main():
    cfg = get_learnhouse_config()

    # Get database URL from config
    database_url = cfg.database_config.sql_connection_string

    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Check current revisions in database
        result = conn.execute(text("SELECT * FROM alembic_version"))
        rows = list(result)

        print(f"Found {len(rows)} revision(s) in alembic_version table:")
        for row in rows:
            print(f"  - {row[0]}")

        if rows:
            print("\nDeleting all revisions...")
            conn.execute(text("DELETE FROM alembic_version"))
            conn.commit()
            print("✓ Cleared alembic_version table")

            print("\nYou can now run: alembic stamp e8f9a0b1c2d3")
        else:
            print("\nNo revisions found in database")


if __name__ == "__main__":
    main()
