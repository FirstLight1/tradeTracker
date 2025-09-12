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
    sold INTEGER DEFAULT 0, -- boolean (0 = false, 1 = true)
    sold_cm INTEGER DEFAULT 0, -- boolean (0 = false, 1 = true)
    profit REAL,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);

CREATE INDEX idx_cards_card_name ON cards(card_name);
-- index number row
-- index foreign key

CREATE TABLE collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    card_num TEXT,
    condition TEXT,
    buy_price REAL,
    market_value REAL
);