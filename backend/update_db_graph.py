import sqlite3

try:
    conn = sqlite3.connect('repowhisper.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE repository ADD COLUMN graph_json TEXT;")
    conn.commit()
    print("Column graph_json added successfully.")
except sqlite3.OperationalError as e:
    print(f"OperationalError: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
