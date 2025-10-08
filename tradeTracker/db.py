import sqlite3
import click
from flask import current_app, g

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
        return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()

def init_db():
    db = get_db()

    try:
        # Schema is included directly in the code to avoid file access issues
        schema = '''
DROP TABLE IF EXISTS info;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS collection;

CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_name TEXT,
    auction_price REAL,
    auction_profit REAL,
    date_created TEXT
);

INSERT INTO auctions (auction_name, auction_profit) VALUES ('Singles', 0);

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    card_name TEXT NOT NULL,
    card_num TEXT,
    condition TEXT,
    card_price REAL,
    market_value REAL,
    sell_price REAL,
    sold INTEGER DEFAULT 0,
    sold_cm INTEGER DEFAULT 0,
    profit REAL,
    sold_date TEXT,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);

CREATE INDEX idx_cards_card_name ON cards(card_name);
CREATE INDEX idx_cards_card_num ON cards(card_num);
CREATE INDEX idx_cards_auction_id ON cards(auction_id);

CREATE TABLE collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    card_num TEXT,
    condition TEXT,
    buy_price REAL,
    market_value REAL
);
'''
        db.executescript(schema)
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

@click.command('init-db')
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
