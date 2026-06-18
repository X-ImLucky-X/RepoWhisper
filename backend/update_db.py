import sqlite3

try:
    conn = sqlite3.connect('repowhisper.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE repository ADD COLUMN tree TEXT;")
    conn.commit()
    print("Column added successfully.")
except sqlite3.OperationalError as e:
    print(f"OperationalError: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
