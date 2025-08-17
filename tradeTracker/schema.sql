DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS cards;

CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_name TEXT,
    auction_price REAL,
    auction_profit REAL,
    date_created TEXT
);

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    card_name TEXT NOT NULL,
    condition TEXT,
    card_price REAL,
    market_value REAL,
    sell_price REAL,
    --boolean
    sold REAL,
    profit REAL,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);