import sqlite3
from datetime import datetime
from database import DB_NAME

def view_database():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 80)
    print(f"DATABASE: {DB_NAME}")
    print("=" * 80)
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = cursor.fetchall()
    
    for table in tables:
        table_name = table[0]
        print(f"\n{'=' * 80}")
        print(f"TABLE: {table_name.upper()}")
        print('=' * 80)
        
        # Get table structure
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        col_names = [col[1] for col in columns]
        
        print(f"\nColumns: {', '.join(col_names)}")
        print("-" * 80)
        
        # Get all data
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            print("(No data)")
        else:
            print(f"\nTotal records: {len(rows)}\n")
            for idx, row in enumerate(rows, 1):
                print(f"Record #{idx}:")
                for col_name in col_names:
                    value = row[col_name]
                    # Show password hash fully (it's already secure)
                    if col_name == 'password' and value:
                        print(f"  {col_name:20s}: {value}")
                        print(f"  {'(hash type)':20s}: PBKDF2-SHA256 (secure)")
                    else:
                        print(f"  {col_name:20s}: {value}")
                print()
    
    conn.close()
    print("=" * 80)

if __name__ == "__main__":
    view_database()

