
from sqlmodel import Session, create_engine, select, text
from config.config import get_learnhouse_config

def fix_migration_links():
    config = get_learnhouse_config()
    print("Connecting to database to fix missing content links...")
    engine = create_engine(config.database_config.sql_connection_string)
    
    source_ids = [9, 6, 8, 11, 13, 14, 10]
    target_id = 15
    
    # List of tables that have a course_id column and might need fixing
    # Based on inspection: certifications is plural
    tables_to_fix = [
        "chapteractivity",
        "assignment",
        "assignmenttask",
        "assignmenttasksubmission",
        "certifications",
        "courseupdate",
        "block",
        "trailstep",
        "trailrun",
        "collectioncourse"
    ]
    
    for table_name in tables_to_fix:
        with Session(engine) as session:
            print(f"Checking table: {table_name}...")
            # Using raw SQL to be safe and avoid model import issues
            try:
                # Update course_id for records pointing to sources
                # Note: We use individual sessions per table so one failure doesn't abort the rest
                result = session.execute(text(f"""
                    UPDATE "{table_name}" 
                    SET course_id = :target 
                    WHERE course_id IN :sources
                """), {"target": target_id, "sources": tuple(source_ids)})
                session.commit()
                print(f"   Updated {result.rowcount} records in {table_name}.")
            except Exception as e:
                session.rollback()
                print(f"   Table {table_name} skipped or error: {str(e).splitlines()[0]}")
    
    print("\nSUCCESS: All missing content links have been checked.")

if __name__ == "__main__":
    fix_migration_links()
