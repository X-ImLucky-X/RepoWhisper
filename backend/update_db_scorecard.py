import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'repowhisper.db')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE repository ADD COLUMN scorecard TEXT;")
    conn.commit()
    print("Column 'scorecard' added successfully to repository table.")
except sqlite3.OperationalError as e:
    print(f"OperationalError: {e} (The column might already exist)")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
