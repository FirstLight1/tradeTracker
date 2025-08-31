from flask import url_for, Flask, request, g, render_template, Blueprint, jsonify
from tradeTracker.db import get_db
import datetime

bp = Blueprint('actions', __name__)

@bp.route('/addAuction')
def addAuction():
    return render_template("add-auction.html")

@bp.route('/addSingles')
def addSingles():
    return render_template("add-singles.html")

@bp.route('/collection')
def renderCollection():
    return render_template("collection.html")

@bp.route('/')
def renderAuctions():
    return render_template("index.html")

@bp.route('/renderAddCardsToCollection')
def renderAddCardsToCollection():
    return render_template("addCardsToCollection.html")

@bp.route('/add', methods=('GET', 'POST'))
def add():
    if request.method == 'POST':
        cardsArr = request.get_json()
        db = get_db()
        auction = {
            'name': cardsArr[0]['name'] if 'name' in cardsArr[0] else None,
            'buy': cardsArr[0]['buy'] if 'buy' in cardsArr[0] else None,
            'profit': cardsArr[0]['profit'] if 'profit' in cardsArr[0] else None,
            'date': cardsArr[0]['date'] if 'date' in cardsArr[0] else None
        }
        cursor = db.execute(
            'INSERT INTO auctions (auction_name, auction_price, auction_profit, date_created) VALUES (?, ?, ?, ?)',
            (auction['name'], auction['buy'], auction['profit'], auction['date'])
        )
        auction_id = cursor.lastrowid
        for card in cardsArr[1:]:
            db.execute(
                'INSERT INTO cards (card_name, condition, card_price, market_value, sell_price, sold, sold_cm, profit, auction_id) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    card.get('cardName'),
                    card.get('condition'),
                    card.get('buyPrice'),
                    card.get('marketValue'),
                    card.get('sellPrice'),
                    card.get('checkbox', 0),
                    card.get('checkbox_cm', 0),
                    card.get('profit'),
                    auction_id
                )
            )
        db.commit()
        return jsonify({'status': 'success', 'auction_id': auction_id}), 201
    
@bp.route('/loadAuctions')
def loadAuctions():
    db = get_db()
    auctions = db.execute('SELECT * FROM auctions').fetchall()
    return jsonify([dict(auction) for auction in auctions])

@bp.route('/loadCards/<int:auction_id>')
def loadCards(auction_id):
    db = get_db()
    cards = db.execute('SELECT * FROM cards WHERE auction_id = ?', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/deleteCard/<int:card_id>', methods=('DELETE',))
def deleteCard(card_id):
    db = get_db()
    db.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    db.commit()
    return jsonify({'status' : 'success'})

@bp.route('/deleteAuction/<int:auction_id>', methods=('DELETE',))
def deleteAuction(auction_id):
    db = get_db()
    db.execute('DELETE FROM cards WHERE auction_id = ?', (auction_id,))
    db.execute('DELETE FROM auctions WHERE id = ?', (auction_id,))
    db.commit()
    return jsonify({'status': 'success'}),200

@bp.route('/update/<int:card_id>', methods=('PATCH',))
def update(card_id):
    db = get_db()
    data = request.get_json()
    field = data.get("field")
    value = data.get("value")
    allowed_fields = {"card_name", "condition", "card_price", "market_value", "sell_price", "sold", "sold_cm", "profit"}

    if field in allowed_fields:
        db.execute(f'UPDATE cards SET {field} = ? WHERE id = ?', (value, card_id))
        db.commit()
    return jsonify({'status': 'success'}),200

@bp.route('/addToCollecton', methods=('GET','POST'))
def addToCollection():
    if request.method == 'POST':
        cards = request.get_json()
        #print(cards)
        db = get_db()
        for card in cards:
            db.execute('INSERT INTO collection (card_name, card_num, condition, buy_price, market_value)'
            ' VALUES (?, ?, ?, ?, ?)',
            (
                card.get('cardName'),
                card.get('cardNum'),
                card.get('condition'),
                card.get('buyPrice'),
                card.get('marketValue'),
            )
        )
        db.commit()
    return jsonify({'status': 'success'}), 201

@bp.route('/loadCollection')
def loadCollection():
    db = get_db()
    cards = db.execute('SELECT * FROM collection').fetchall()
    return jsonify([dict(card) for card in cards])

@bp.route('/deleteFromCollection/<int:card_id>', methods=('DELETE',))
def deleteFromCollection(card_id):
    db = get_db()
    db.execute('DELETE FROM collection WHERE id = ?', (card_id, ))
    db.commit()
    return jsonify({'status': 'success'}), 200

@bp.route('/updateCollection/<int:card_id>', methods=('PATCH',))
def updateCollection(card_id):
    db = get_db()
    data = request.get_json()
    field = data.get("field")
    value = data.get("value")
    allowed_fields = {"card_name", "card_num", "condition", "buy_price","market_value"}

    if field in allowed_fields:
        db.execute(f'UPDATE collection SET {field} = ? WHERE id = ?', (value, card_id))
        db.commit()
    return jsonify({'status': 'success'}),200

@bp.route('/addToSingles', methods=('POST', 'GET'))
def addToSingles():
    if request.method == 'POST':
        db = get_db()
        auction_id = 1
        data = request.get_json()
        profit = {
            'profit': data[0]['profit'] if 'profit' in data[0] else None,
        }

        db.execute('UPDATE auctions SET auction_profit = auction_profit + ? WHERE id = 1',(profit['profit'],))
        for card in data[1:]:
            db.execute('INSERT INTO cards (card_name, condition, card_price, market_value, sell_price, sold, sold_cm, profit, auction_id)'
                    'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        card.get('cardName'),
                        card.get('condition'),
                        card.get('buyPrice'),
                        card.get('marketValue'),
                        card.get('sellPrice'),
                        card.get('checkbox', 0),
                        card.get('checkbox_cm', 0),
                        card.get('profit'),
                        auction_id
                    )
            )
        db.commit()
    return jsonify({'status': 'success'}), 201

@bp.route('/updateAuctionProfit/<int:auction_id>', methods=('PATCH',))
def updateAuctionProfit(auction_id):
    db = get_db()
    data = request.get_json()
    profit = data.get('value')
    db.execute('UPDATE auctions SET auction_profit = ? WHERE id = ?', (profit, auction_id))
    db.commit()
    return jsonify({'status': 'success'}), 200

@bp.route('/updateAuction/<int:auction_id>', methods=('PATCH',))
def updateAuction(auction_id):
    db = get_db()
    data = request.get_json()
    profit = data.get('value')
    db.execute('UPDATE auctions SET auction_profit = ? WHERE id = ?', (profit, auction_id))
    db.commit()
    return jsonify({'status': 'success'}), 200


@bp.route('/CardMarketTable', methods=('GET', 'POST'))
def cardMarketTable():
    if request.method == 'POST':
        db = get_db()
        cards = request.get_json()
        date = datetime.datetime.now(datetime.timezone.utc).isoformat()
        date = date + "Z"
        auction = {
            'name' : None,
            'buy' : None,
            'profit' : None,
            'date' : date
        }
        cursor = db.execute(
                'INSERT INTO auctions (auction_name, auction_price, auction_profit, date_created) VALUES (?, ?, ?, ?)',
                (auction['name'], auction['buy'], auction['profit'], auction['date'])
            )
        auction_id = cursor.lastrowid
        cardsToInsert = []
        for card in cards:
            count = card.get('count', 1)
            for _ in range(count):
                cardsToInsert.append((
                card.get('name', None),       # default to None if missing
                card.get('condition', None),  # default to None if missing
                card.get('price', None),      # default to None if missing
                auction_id
            ))
                
        db.executemany(
        'INSERT INTO cards (card_name, condition, market_value, auction_id) VALUES (?, ?, ?, ?)',
        cardsToInsert
        )

        db.commit()

    return jsonify({'status': 'success', 'auction_id': auction_id}), 201