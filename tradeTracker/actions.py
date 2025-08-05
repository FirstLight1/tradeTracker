from flask import url_for, Flask, request, g, render_template, Blueprint, jsonify
from tradeTracker.db import get_db

bp = Blueprint('actions', __name__)


@bp.route('/addForm')
def addForm():
    #create new auction
    #export auction_id
    return render_template("add-auction.html")

@bp.route('/add', methods=('GET', 'POST'))
def add():
    if request.method == 'POST':
        cardsArr = request.get_json()
        db = get_db()
        auction = {
            'name': cardsArr[0]['name'],
            'buy': cardsArr[0]['buy'],
            'profit': cardsArr[0]['profit']
        }
        cursor = db.execute(
            'INSERT INTO auctions (auction_name, auction_price, auction_profit) VALUES (?, ?, ?)',
            (auction['name'], auction['buy'], auction['profit'])
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