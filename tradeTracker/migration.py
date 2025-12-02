import sqlite3
import os
import sys

# Import the sales history migration logic
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)
from migrate_to_sales_history import migrate_to_sales_history

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
        
        # Migration 2: Migrate to sales history structure (checks if sales table exists)
        _migrate_to_sales_history_wrapper(db_path)
        
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

def _migrate_to_sales_history_wrapper(db_path):
    """
    Wrapper to check if sales table exists and run migration if needed.
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if sales table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='sales'
        """)
        sales_table_exists = cursor.fetchone() is not None
        
        conn.close()
        
        if not sales_table_exists:
            print("Sales table not found, running sales history migration...")
            migrate_to_sales_history(db_path)
        else:
            print("Sales table already exists, skipping sales history migration.")
            
    except sqlite3.Error as e:
        print(f"Error checking for sales table: {e}")
