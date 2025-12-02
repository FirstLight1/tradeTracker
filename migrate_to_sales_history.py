"""
Migration script to convert existing sold cards data to the new sales history structure.
This script:
1. Backs up the existing database
2. Creates a temporary table with old cards data
3. Migrates sold cards to sales and sale_items tables
4. Updates the cards table structure
"""

import sqlite3
import os
from datetime import datetime
import shutil

def migrate_to_sales_history(db_path):
    """
    Migrates existing sold cards to the new sales history structure.
    """
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    # Create backup
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(db_path, backup_path)
    print(f"Database backed up to: {backup_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if migration is needed by checking if sales table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='sales'
        """)
        sales_table_exists = cursor.fetchone() is not None
        
        if sales_table_exists:
            print("Migration already completed - sales table exists.")
            conn.close()
            return True
        
        print("Starting migration to sales history structure...")
        
        # Step 1: Create temporary backup of cards table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cards_backup AS 
            SELECT * FROM cards
        """)
        print("Created backup of cards table")
        
        # Step 2: Create new sales and sale_items tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE NOT NULL,
                sale_date TEXT NOT NULL,
                total_amount REAL,
                notes TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                sell_price REAL NOT NULL,
                sold_cm INTEGER DEFAULT 0,
                sold INTEGER DEFAULT 0,
                profit REAL,
                FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
                FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
            )
        """)
        print("Created sales and sale_items tables")

        # Create indexes for new tables
        cursor.execute("CREATE INDEX idx_sales_invoice ON sales(invoice_number)")
        cursor.execute("CREATE INDEX idx_sales_date ON sales(sale_date)")
        cursor.execute("CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id)")
        cursor.execute("CREATE INDEX idx_sale_items_card_id ON sale_items(card_id)")
        
        print("Updated cards table structure and created indexes")
        
        # Drop backup table
        cursor.execute("DROP TABLE cards_backup")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        print(f"✓ Database backup available at: {backup_path}")
        print("You can restore the backup if needed.")
        return False

if __name__ == "__main__":
    # Default database path - adjust if needed
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'tracker.db')

    migrate_to_sales_history(db_path)