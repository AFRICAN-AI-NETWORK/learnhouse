import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use the test database URL from the user's environment or default
DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/learnhouse")

def run_migration():
    print(f"Connecting to database: {DATABASE_URL}")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Add course_id column to discountcode table if it doesn't exist
        print("Checking for course_id column in discountcode table...")
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='discountcode' AND column_name='course_id';
        """)
        
        if not cur.fetchone():
            print("Adding course_id column to discountcode table...")
            cur.execute("""
                ALTER TABLE discountcode 
                ADD COLUMN course_id BIGINT;
                
                ALTER TABLE discountcode
                ADD CONSTRAINT discountcode_course_id_fkey 
                FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE;
            """)
            print("Successfully added course_id column.")
        else:
            print("course_id column already exists.")

        conn.commit()
        cur.close()
        conn.close()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Error running migration: {e}")

if __name__ == "__main__":
    run_migration()
