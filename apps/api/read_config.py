
import psycopg2
import json

try:
    conn = psycopg2.connect(
        dbname="learnhouse",
        user="postgres",
        password="postgres",
        host="localhost"
    )
    cur = conn.cursor()
    cur.execute("SELECT o.id, o.name, c.config FROM organization o JOIN organizationconfig c ON o.id = c.org_id WHERE o.name ILIKE '%African AI%';")
    rows = cur.fetchall()
    for row in rows:
        print(f"Org ID: {row[0]}")
        print(f"Org Name: {row[1]}")
        print("Config:")
        print(json.dumps(row[2], indent=2))
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
