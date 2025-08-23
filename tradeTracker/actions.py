from flask import url_for, Flask, request, g, render_template, Blueprint, jsonify
from tradeTracker.db import get_db

bp = Blueprint('actions', __name__)

@bp.route('/addForm')
def addForm():
    return render_template("add-auction.html")

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
                'INSERT INTO cards (card_name, condition, card_price, market_value, sell_price, sold, profit, auction_id) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    card.get('cardName'),
                    card.get('condition'),
                    card.get('buyPrice'),
                    card.get('marketValue'),
                    card.get('sellPrice'),
                    card.get('checkbox'),
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
    return jsonify([dict(card) for card in cards])

@bp.route('/deleteCard/<int:card_id>', methods=('DELETE',))
def deleteCard(card_id):
    x = type(card_id)
    print(x)
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
    return jsonify({'status': 'success'})

@bp.route('/update/<int:card_id>', methods=('PATCH',))
def update(card_id):
    db = get_db()
    data = request.get_json()
    print(data)
    field = data.get("field")
    value = data.get("value")
    print(f"Updating card {card_id}: {field} = {value}")
    allowed_fields = {"card_name", "condition", "card_price", "market_value", "sell_price", "sold", "profit"}

    if field in allowed_fields:
        db.execute(f'UPDATE cards SET {field} = ? WHERE id = ?', (value, card_id))
        db.commit()
    return jsonify({'status': 'success'})