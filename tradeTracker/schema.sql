DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS cards;

CREATE TABLE auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_name TEXT,
    auction_price REAL,
    auction_profit REAL,
    date_created TEXT
);

INSERT INTO auctions (auction_name) VALUES ('Singles')

CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    card_name TEXT NOT NULL,
    condition TEXT,
    card_price REAL,
    market_value REAL,
    sell_price REAL,
    --boolean
    sold INTEGER,
    profit REAL,
    FOREIGN KEY (auction_id) REFERENCES auctions (id)
);

CREATE INDEX idx_cards_card_name ON cards(card_name);

CREATE TABLE collection(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    card_num TEXT,
    condition TEXT,
    buy_price REAL,
    market_value REAL,
)