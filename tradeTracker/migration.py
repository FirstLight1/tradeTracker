import sqlite3
import os

def migrate_database(db_path):
    """
    Applies database migrations.
    """
    if not os.path.exists(db_path):
        print("Database not found, skipping migration.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Migration 1: Add 'sold_date' to 'cards' table
        _add_sold_date_to_cards(cursor)

        conn.commit()
        conn.close()
        print("Database migration check complete.")
    except sqlite3.Error as e:
        print(f"Database migration failed: {e}")

def _add_sold_date_to_cards(cursor):
    """
    Adds the 'sold_date' column to the 'cards' table if it doesn't exist.
    """
    try:
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(cards)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'sold_date' not in columns:
            print("Applying migration: Adding 'sold_date' to 'cards' table...")
            cursor.execute("ALTER TABLE cards ADD COLUMN sold_date TEXT")
            print("'sold_date' column added successfully.")
        else:
            print("'sold_date' column already exists in 'cards' table.")
    except sqlite3.Error as e:
        # This can happen if the table doesn't exist yet, which is fine.
        if "no such table: cards" in str(e):
            print("'cards' table not found, skipping 'sold_date' column migration.")
        else:
            raise e
