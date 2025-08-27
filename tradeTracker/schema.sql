DROP TABLE IF EXISTS info;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS collection;

CREATE TABLE info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_value TEXT,
    total_profit TEXT
);

CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_name TEXT,
    auction_price REAL,
    auction_profit REAL,
    date_created TEXT
);

INSERT INTO auctions (auction_name) VALUES ('Singles');

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    card_name TEXT NOT NULL,
    condition TEXT,
    card_price REAL,
    market_value REAL,
    sell_price REAL,
    sold INTEGER DEFAULT 0, -- boolean (0 = false, 1 = true)
    profit REAL,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);

CREATE INDEX idx_cards_card_name ON cards(card_name);

CREATE TABLE collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    card_num TEXT,
    condition TEXT,
    buy_price REAL,
    market_value REAL
);