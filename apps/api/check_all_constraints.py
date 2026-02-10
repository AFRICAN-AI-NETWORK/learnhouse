"""
Check schema for all payment-related tables to identify NOT NULL constraints.
"""
import psycopg2

conn = psycopg2.connect('postgresql://learnhouse:learnhouse@localhost:5432/learnhouse')
cur = conn.cursor()

tables = ['user', 'organization', 'course', 'paymentsproduct', 'paymentsuser', 'payments_config', 'discountcode']

for table in tables:
    print(f"\n{'='*80}")
    print(f"Table: {table}")
    print(f"{'='*80}")
    
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = %s
        AND is_nullable = 'NO'
        ORDER BY ordinal_position
    """, (table,))
    
    rows = cur.fetchall()
    if rows:
        print(f"{'Column':<40} {'Type':<30}")
        print("-" * 70)
        for row in rows:
            print(f"{row[0]:<40} {row[1]:<30}")
    else:
        print("No NOT NULL columns found (table might not exist)")

conn.close()
