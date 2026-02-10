"""
Check what columns are in the paymentsuser table and add missing ones.
"""
import psycopg2

conn = psycopg2.connect('postgresql://learnhouse:learnhouse@localhost:5432/learnhouse')
cur = conn.cursor()

try:
    print("Step 1: Checking current paymentsuser columns...")
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'paymentsuser'
        ORDER BY ordinal_position
    """)
    
    columns = cur.fetchall()
    print("Current columns:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    column_names = [col[0] for col in columns]
    
    # Check for missing columns
    missing_columns = []
    if 'discount_code_id' not in column_names:
        missing_columns.append('discount_code_id')
    if 'original_amount' not in column_names:
        missing_columns.append('original_amount')
    if 'discount_amount' not in column_names:
        missing_columns.append('discount_amount')
    if 'final_amount' not in column_names:
        missing_columns.append('final_amount')
    
    if missing_columns:
        print(f"\n⚠️  Missing columns: {', '.join(missing_columns)}")
        print("\nStep 2: Adding missing columns...")
        
        if 'discount_code_id' not in column_names:
            print("  Adding discount_code_id...")
            cur.execute("""
                ALTER TABLE paymentsuser
                ADD COLUMN discount_code_id BIGINT,
                ADD CONSTRAINT paymentsuser_discount_code_id_fkey
                FOREIGN KEY (discount_code_id)
                REFERENCES discountcode(id)
                ON DELETE SET NULL
            """)
            print("  ✓ discount_code_id added")
        
        if 'original_amount' not in column_names:
            print("  Adding original_amount...")
            cur.execute("""
                ALTER TABLE paymentsuser
                ADD COLUMN original_amount FLOAT
            """)
            print("  ✓ original_amount added")
        
        if 'discount_amount' not in column_names:
            print("  Adding discount_amount...")
            cur.execute("""
                ALTER TABLE paymentsuser
                ADD COLUMN discount_amount FLOAT
            """)
            print("  ✓ discount_amount added")
        
        if 'final_amount' not in column_names:
            print("  Adding final_amount...")
            cur.execute("""
                ALTER TABLE paymentsuser
                ADD COLUMN final_amount FLOAT
            """)
            print("  ✓ final_amount added")
        
        conn.commit()
        print("\n✅ All missing columns added successfully!")
    else:
        print("\n✅ All required columns already exist!")
    
except Exception as e:
    conn.rollback()
    print(f"\n❌ Error: {e}")
    raise
finally:
    cur.close()
    conn.close()
