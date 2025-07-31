DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS cards;

CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_price INTEGER,
    auction_profit INTEGER
);

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    card_name TEXT NOT NULL,
    condition TEXT,
    buy INTEGER,
    market_value INTEGER,
    sell INTEGER,
    profit INTEGER,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);