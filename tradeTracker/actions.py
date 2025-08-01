from flask import url_for, Flask, request, g, render_template, Blueprint
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
        cardName = request.form['cardName']
        condition = request.form['condition']
        buyPrice = request.form['buyPrice']
        marketValue = request.form['marketValue']
        sellPrice = request.form['sellPrice']
        profit = sellPrice - buyPrice
        db = get_db()
        db.execute(
            'INSERT INTO cards (cardName, condition, buyPrice, marketValue, sellPrice, profit)'
            'VALUES (?, ?, ? ,? ,?, ?)',(cardName, condition, buyPrice, marketValue, sellPrice, profit)
        )
    #if nothing added delete auction_id
    return