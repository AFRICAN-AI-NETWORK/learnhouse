"""
Fix the foreign key constraint on paymentsproduct table.
Update it to reference payments_config instead of paymentsconfig.
"""
import psycopg2

conn = psycopg2.connect('postgresql://learnhouse:learnhouse@localhost:5432/learnhouse')
cur = conn.cursor()

try:
    print("Step 1: Checking current foreign key constraint...")
    cur.execute("""
        SELECT con.conname, con.contype
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'paymentsproduct'
        AND con.contype = 'f'
        AND con.conname LIKE '%payments_config%'
    """)
    
    current_constraints = cur.fetchall()
    print(f"Current constraints: {current_constraints}")
    
    print("\nStep 2: Dropping old foreign key constraint...")
    cur.execute("""
        ALTER TABLE paymentsproduct
        DROP CONSTRAINT IF EXISTS paymentsproduct_payments_config_id_fkey
    """)
    print("✓ Old constraint dropped")
    
    print("\nStep 3: Creating new foreign key constraint to payments_config table...")
    cur.execute("""
        ALTER TABLE paymentsproduct
        ADD CONSTRAINT paymentsproduct_payments_config_id_fkey
        FOREIGN KEY (payments_config_id)
        REFERENCES payments_config(id)
        ON DELETE CASCADE
    """)
    print("✓ New constraint created")
    
    conn.commit()
    print("\n✅ Foreign key constraint successfully updated!")
    print("   paymentsproduct.payments_config_id now references payments_config(id)")
    
except Exception as e:
    conn.rollback()
    print(f"\n❌ Error: {e}")
    raise
finally:
    cur.close()
    conn.close()
