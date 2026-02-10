import psycopg2

conn = psycopg2.connect('postgresql://learnhouse:learnhouse@localhost:5432/learnhouse')
cur = conn.cursor()

# Check for paymentsproduct table
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'payments%'
    ORDER BY table_name
""")

tables = cur.fetchall()
print("Payment-related tables:")
for table in tables:
    print(f"  - {table[0]}")

# Check if paymentsproduct exists
cur.execute("""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'paymentsproduct'
    )
""")

exists = cur.fetchone()[0]
print(f"\npaymentsproduct table exists: {exists}")

conn.close()
