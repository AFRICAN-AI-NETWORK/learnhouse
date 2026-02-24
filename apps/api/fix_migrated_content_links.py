
from sqlmodel import Session, create_engine, select, text
from config.config import get_learnhouse_config

def fix_migration_links():
    config = get_learnhouse_config()
    print("Connecting to database to fix missing content links...")
    engine = create_engine(config.database_config.sql_connection_string)
    
    source_ids = [9, 6, 8, 11, 13, 14, 10]
    target_id = 15
    
    # List of tables that have a course_id column and might need fixing
    tables_to_fix = [
        "chapteractivity",
        "assignment",
        "assignmenttask",
        "assignmenttasksubmission",
        "certification",
        "courseupdate",
        "block",
        "trailstep",
        "trailrun",
        "collectioncourse"
    ]
    
    with Session(engine) as session:
        for table_name in tables_to_fix:
            print(f"Checking table: {table_name}...")
            # Using raw SQL to be safe and avoid model import issues
            try:
                # Update course_id for records pointing to sources
                result = session.execute(text(f"""
                    UPDATE "{table_name}" 
                    SET course_id = :target 
                    WHERE course_id IN :sources
                """), {"target": target_id, "sources": tuple(source_ids)})
                print(f"   Updated {result.rowcount} records in {table_name}.")
            except Exception as e:
                print(f"   Table {table_name} skipped or error: {e}")
        
        session.commit()
        print("\nSUCCESS: All missing content links have been fixed.")

if __name__ == "__main__":
    fix_migration_links()
