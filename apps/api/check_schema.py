"""
Check what columns are required (NOT NULL) in paymentsproduct table.
"""
import psycopg2

conn = psycopg2.connect('postgresql://learnhouse:learnhouse@localhost:5432/learnhouse')
cur = conn.cursor()

# Get column information for paymentsproduct table
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'paymentsproduct'
    ORDER BY ordinal_position
""")

print("PaymentsProduct table schema:")
print(f"{'Column':<30} {'Type':<20} {'Nullable':<10} {'Default':<20}")
print("-" * 85)
for row in cur.fetchall():
    print(f"{row[0]:<30} {row[1]:<20} {row[2]:<10} {str(row[3] or ''):<20}")

conn.close()
