
from sqlmodel import Session, create_engine, select
from src.db.courses.chapter_activities import ChapterActivity
from config.config import get_learnhouse_config
import datetime

def relink():
    config = get_learnhouse_config()
    engine = create_engine(config.database_config.sql_connection_string)
    
    target_id = 15
    org_id = 1
    now = datetime.datetime.now().isoformat()
    
    # Mapping based on name analysis
    # [ChapterID, [ActivityIDs in order]]
    mapping = {
        7: [13, 14, 15, 16, 17, 32], # Loops
        18: [21, 22],                  # Python Programming
        8: [18],                       # DSA
        17: [31],                      # Modules & Libraries
        21: [34],                      # Linear Algebra
        23: [37],                      # Embracing Uncertainty
        24: [40],                      # Basics of Probability
        25: [41],                      # Conditional Probability
        26: [42],                      # Prediction Engine
        27: [43],                      # Calculus
        28: [44],                      # Gradient Descent
        9: [23],                       # Understanding Data
        10: [24],                      # Data Processing
        11: [25],                      # Feature Engineering
        12: [26],                      # Linear Regression
        13: [27],                      # Housing Price
        14: [28],                      # Key Takeaways
        15: [29],                      # From Statistics
    }
    
    # Extra/Misc mapping logic for some orphans
    # A20, A38, A39 (Python for Data analysis) might belong to C17 or a separate one.
    # C17 is "UNDERSTANDING MODULES AND LIBRARIES"
    mapping[17].extend([20, 38, 39, 45])

    with Session(engine) as session:
        added = 0
        for chap_id, act_ids in mapping.items():
            for i, act_id in enumerate(act_ids):
                # Check for existing link using raw SQL
                check_stmt = text("""
                    SELECT 1 FROM "chapteractivity" 
                    WHERE chapter_id = :cid AND activity_id = :aid
                """)
                exists = session.execute(check_stmt, {"cid": chap_id, "aid": act_id}).first()
                
                if not exists:
                    insert_stmt = text("""
                        INSERT INTO "chapteractivity" 
                        (chapter_id, activity_id, course_id, org_id, "order", creation_date, update_date)
                        VALUES (:cid, :aid, :tid, :oid, :ord, :now, :now)
                    """)
                    session.execute(insert_stmt, {
                        "cid": chap_id,
                        "aid": act_id,
                        "tid": target_id,
                        "oid": org_id,
                        "ord": i + 1,
                        "now": now
                    })
                    added += 1
        
        session.commit()
        print(f"SUCCESS: Re-linked {added} activities to their chapters using raw SQL.")

if __name__ == "__main__":
    relink()
