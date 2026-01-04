import sys
from flask import url_for, Flask, request, g, render_template, Blueprint, jsonify, current_app
from flask_cors import CORS
from tradeTracker.db import get_db
import datetime
import csv
from werkzeug.utils import secure_filename
import os
import sqlite3
import fpdf
import json
from . import generateInvoice

bp = Blueprint('actions', __name__)
CORS(bp)
dictKeys = ['Product ID', 'Name', 'Condition', 'Price', 'Card Number']
li = []
dataList = []

conditionDict = {
    'MT' : "Mint",
    'NM' : "Near Mint",
    'EX' : "Excellent",
    'GD' : "Good",
    'LP' : "Light Played",
    'PL' : "Played",
    'PO' : "Poor"
}

# Allowed payment types (whitelist)
ALLOWED_PAYMENT_TYPES = {
    'Hotovosť',
    'Karta',
    'Barter',
    'Bankový prevod',
    'Online platba',
    'Dobierka',
    'Online platobný systém'
}

def validate_and_sanitize_payments(payments):
    """
    Validate and sanitize payment data.
    Returns: (is_valid, sanitized_payments, error_message)
    """
    if payments is None or not isinstance(payments, list):
        return False, None, 'Invalid payments format'
    
    if len(payments) == 0:
        return False, None, 'At least one payment method required'
    
    if len(payments) > 10:  # Reasonable limit
        return False, None, 'Too many payment methods (max 10)'
    
    sanitized = []
    for payment in payments:
        if not isinstance(payment, dict):
            return False, None, 'Invalid payment object'
        
        payment_type = payment.get('type', '').strip()
        amount = payment.get('amount')
        
        # Validate payment type against whitelist
        if payment_type not in ALLOWED_PAYMENT_TYPES:
            return False, None, f'Invalid payment type: {payment_type}'
        
        # Validate amount is a number
        try:
            amount = float(amount)
            if amount < 0:
                return False, None, 'Payment amount cannot be negative'
            if amount > 1000000:  # Reasonable limit
                return False, None, 'Payment amount too large'
        except (TypeError, ValueError):
            return False, None, 'Invalid payment amount'
        
        sanitized.append({
            'type': payment_type,
            'amount': round(amount, 2)  # Ensure 2 decimal places
        })
    
    return True, sanitized, None

def loadExpansions():
    # Load expansion sets (works for both development and .exe)
    if getattr(sys, 'frozen', False):
        # Running as compiled exe - use the app data directory
        app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker')
        expansions_path = os.path.join(app_data_dir, 'setAbbs.json')
    else:
        # Running in development - use the module directory
        expansions_path = os.path.join(os.path.dirname(__file__), r'data\expansions\setAbbs.json')

    try:
        with open(expansions_path, mode='r', encoding='utf-8') as infile:
            data = json.load(infile)
            # Convert list of single-key dictionaries into one dictionary
            all_pokemon_sets = {}
            for item in data:
                for key, value in item.items():
                    all_pokemon_sets[key] = value
    except FileNotFoundError:
        print(f"Warning: Expansions file not found at {expansions_path}")
        all_pokemon_sets = {}

    return all_pokemon_sets

# Load the expansion sets at module import time
all_pokemon_sets = loadExpansions()


def migrate_payment_method(payment_method_text):
    """
    Migrate old space-separated payment method strings to JSON format.
    Returns: JSON string like '[{"type": "Hotovosť", "amount": 0}, {"type": "Barter", "amount": 0}]'
    """
    if not payment_method_text:
        return None
    
    # Check if already in JSON format
    try:
        parsed = json.loads(payment_method_text)
        if isinstance(parsed, list):
            return payment_method_text  # Already migrated
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Migrate old format (space-separated strings)
    payment_types = payment_method_text.strip().split()
    payments = [{"type": payment_type, "amount": 0} for payment_type in payment_types if payment_type]
    return json.dumps(payments)


def parse_payment_methods(payment_method_text):
    """
    Parse payment methods from database (handles both old and new formats).
    Returns: List of dicts [{"type": "...", "amount": ...}] or empty list
    """
    if not payment_method_text:
        return []
    
    try:
        parsed = json.loads(payment_method_text)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Fallback: old format - convert on the fly
    payment_types = payment_method_text.strip().split()
    return [{"type": payment_type, "amount": 0} for payment_type in payment_types if payment_type]


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


@bp.route('/sold')
def sold():
    return render_template("sold.html")

@bp.route('/add', methods=('GET', 'POST'))
def add():
    if request.method == 'POST':
        cardsArr = request.get_json()
        db = get_db()
        auction = {
            'name': cardsArr[0]['name'] if 'name' in cardsArr[0] else None,
            'buy': cardsArr[0]['buy'] if 'buy' in cardsArr[0] else None,
            'date': cardsArr[0]['date'] if 'date' in cardsArr[0] else None,
            'payments': cardsArr[0]['payments'] if 'payments' in cardsArr[0] else None
        }
        
        # Validate and sanitize payments if provided
        payment_method_json = None
        if auction['payments']:
            is_valid, sanitized_payments, error_msg = validate_and_sanitize_payments(auction['payments'])
            if not is_valid:
                return jsonify({'status': 'error', 'message': error_msg}), 400
            payment_method_json = json.dumps(sanitized_payments)
        
        cursor = db.execute(
            'INSERT INTO auctions (auction_name, auction_price, date_created, payment_method) VALUES (?, ?, ?, ?)',
            (auction['name'], auction['buy'], auction['date'], payment_method_json)
        )
        auction_id = cursor.lastrowid
        for card in cardsArr[1:]:
            db.execute(
                'INSERT INTO cards (card_name, card_num, condition, card_price, market_value, auction_id) '
                'VALUES (?, ?, ?, ?, ?, ?)',
                (
                    card.get('cardName'),
                    card.get('cardNum'),
                    card.get('condition'),
                    card.get('buyPrice'),
                    card.get('marketValue'),
                    auction_id
                )
            )
        db.commit()
        return jsonify({'status': 'success', 'auction_id': auction_id}), 201
    
def _check_bulk_inventory(db, item_type, quantity_needed):
    """Check if sufficient inventory exists for the given item type."""
    result = db.execute(
        'SELECT SUM(quantity) FROM bulk_items WHERE item_type = ?',
        (item_type,)
    ).fetchone()
    available = result[0] if result[0] is not None else 0
    return available >= quantity_needed

def _deduct_bulk_items_fifo(db, item_type, quantity_to_deduct):
    """Deduct bulk/holo items using FIFO (First In, First Out) from auctions."""
    remaining = quantity_to_deduct
    
    # Get all bulk_items for this type, ordered by auction_id (FIFO)
    items = db.execute(
        'SELECT id, auction_id, quantity FROM bulk_items '
        'WHERE item_type = ? ORDER BY auction_id ASC',
        (item_type,)
    ).fetchall()
    
    for item in items:
        if remaining <= 0:
            break
            
        item_id = item['id']
        current_quantity = item['quantity']
        
        if current_quantity <= remaining:
            # Delete this item entirely
            db.execute('DELETE FROM bulk_items WHERE id = ?', (item_id,))
            remaining -= current_quantity
        else:
            # Reduce quantity
            new_quantity = current_quantity - remaining
            db.execute(
                'UPDATE bulk_items SET quantity = ?, total_price = quantity * unit_price '
                'WHERE id = ?',
                (new_quantity, item_id)
            )
            remaining = 0

def _add_bulk_items_helper(db, auction_id, bulk=None, holo=None):
    """Helper function to add bulk items. Requires db connection to be passed in."""
    items = [dict(bulk) if bulk is not None else None, dict(holo) if holo is not None else None]
    
    for item in items:
        print(item)
        if item is None:
            continue
        db.execute(
            'INSERT INTO bulk_items (auction_id, item_type, quantity, unit_price, total_price) '
            'VALUES (?, ?, ?, ?, ?) ON CONFLICT(auction_id, item_type) DO UPDATE SET '
            'quantity = quantity + excluded.quantity, '
            'total_price = total_price + excluded.total_price, '
            'unit_price = (total_price + excluded.total_price) / (quantity + excluded.quantity)',
            (
                auction_id,
                item.get('item_type'),
                item.get('quantity'),
                item.get('unit_price') if item.get('unit_price') is not None else (item.get('total_price') / item.get('quantity')),
                item.get('total_price')
            )
        )
    db.commit()
    return jsonify({'status': 'success'}), 201

@bp.route('/addBulkItems/<int:auction_id>', methods=('POST',))
def addBulkItems(auction_id):
    """Route handler for adding bulk items."""
    data = request.get_json()
    bulk = data.get('bulk')
    holo = data.get('holo')
    db = get_db()
    _add_bulk_items_helper(db, auction_id, bulk, holo)
    db.commit()
    return jsonify({'status': 'success'}), 201

@bp.route('/loadAuctions')
def loadAuctions():
    db = get_db()
    auctions = db.execute(
        'SELECT DISTINCT a.* FROM auctions a '
        'LEFT JOIN cards c ON a.id = c.auction_id '
        'LEFT JOIN sale_items si ON c.id = si.card_id '
        'WHERE a.id = 1 OR si.card_id IS NULL'
    ).fetchall()
    
    # Auto-migrate payment_method data on load
    auctions_list = []
    for auction in auctions:
        auction_dict = dict(auction)
        if auction_dict.get('payment_method'):
            # Check if migration needed
            migrated = migrate_payment_method(auction_dict['payment_method'])
            if migrated != auction_dict['payment_method']:
                # Update database with migrated value
                db.execute('UPDATE auctions SET payment_method = ? WHERE id = ?', 
                          (migrated, auction_dict['id']))
                auction_dict['payment_method'] = migrated
        auctions_list.append(auction_dict)
    
    db.commit()
    return jsonify(auctions_list)

@bp.route('/loadCards/<int:auction_id>')
def loadCards(auction_id):
    db = get_db()
    cards = db.execute(
        'SELECT c.* FROM cards c '
        'LEFT JOIN sale_items si ON c.id = si.card_id '
        'WHERE c.auction_id = ? AND si.card_id IS NULL', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/loadBulk/<int:auction_id>')
def loadBulk(auction_id):
    db = get_db()

    bulk_items = db.execute(
        'SELECT bi.* FROM bulk_items bi '
        'WHERE bi.auction_id = ?', (auction_id,)).fetchall()
    return jsonify([dict(item) for item in bulk_items]),200

@bp.route('/loadAllCards/<int:auction_id>')
def loadAllCards(auction_id):
    db = get_db()
    cards = db.execute('SELECT * FROM cards WHERE auction_id = ?', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/inventoryValue')
def invertoryValue():
    db = get_db()
    cur = db.cursor()
    cardMarketValue = cur.execute('SELECT SUM(market_value) FROM cards c LEFT JOIN sale_items si ON c.id = si.card_id WHERE si.card_id IS NULL').fetchone()[0]
    bulkValue = cur.execute('SELECT SUM(bi.total_price) FROM bulk_items bi LEFT JOIN bulk_sales bs ON bi.id = bs.id WHERE bs.id IS NULL').fetchone()[0]
    value = (cardMarketValue if cardMarketValue is not None else 0) + (bulkValue if bulkValue is not None else 0)

    return jsonify({'status': 'success','value': value}),200


@bp.route('/deleteCard/<int:card_id>', methods=('DELETE',))
def deleteCard(card_id):
    db = get_db()
    db.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    db.commit()
    return jsonify({'status' : 'success'})

@bp.route('/deleteBulkItem/<int:item_id>', methods=('DELETE',))
def deleteBulkItem(item_id):
    db = get_db()
    db.execute('DELETE FROM bulk_items WHERE id = ?', (item_id,))
    db.commit()
    return jsonify({'status' : 'success'})

@bp.route('/deleteAuction/<int:auction_id>', methods=('DELETE',))
def deleteAuction(auction_id):
    db = get_db()
    db.execute('DELETE FROM bulk_items WHERE auction_id = ?', (auction_id,))
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
    allowed_fields = {"card_name", "card_num", "condition", "card_price", "market_value"}

    if field == 'sold' or field == 'sold_cm':
        db.execute(f'UPDATE sale_items SET {field} = ? WHERE card_id = ?', (value, card_id))
        db.commit()
        return jsonify({'status': 'success'}),200

    if field in allowed_fields:
        db.execute(f'UPDATE cards SET {field} = ? WHERE id = ?', (value, card_id))
        db.commit()
    return jsonify({'status': 'success'}),200

@bp.route('/addToExistingAuction/<int:auction_id>', methods=('POST',))
def addToExistingAuction(auction_id):
    if request.method == 'POST':
        data = request.get_json()
        cards = data.get('cards', [])
        db = get_db()
        for card in cards:
            db.execute('INSERT INTO cards (card_name, card_num, condition, card_price, market_value, auction_id)'
            ' VALUES (?, ?, ?, ?, ?, ?)',
            (
                card.get('cardName'),
                card.get('cardNum'),
                card.get('condition'),
                card.get('buyPrice'),
                card.get('marketValue'),
                auction_id
            )
        )
        db.commit()

        bulk = data.get('bulk')
        holo = data.get('holo')
        print(type(bulk), type(holo))
        _add_bulk_items_helper(db, auction_id, bulk, holo)
        db.commit()
        return jsonify({'status': 'success'}), 201

@bp.route('/bulkCounterValue')
def bulkCounterValue():
    db = get_db()
    cur = db.cursor()
    counters = cur.execute('SELECT sum(quantity) FROM bulk_items GROUP BY item_type').fetchall()
    bulk_counter = counters[0][0] if len(counters) > 0 else 0
    holo_counter = counters[1][0] if len(counters) > 1 else 0
    
    return jsonify({'status': 'success','bulk_counter': bulk_counter, 'holo_counter': holo_counter}),200

@bp.route('/loadSoldHistory')
def loadSoldHistory():
    db = get_db()
    sales = db.execute(
        'SELECT s.*, '
        '(COALESCE((SELECT SUM(si.profit) FROM sale_items si WHERE si.sale_id = s.id), 0) + '
        'COALESCE((SELECT SUM(bs.total_price - bs.quantity * bs.unit_price) FROM bulk_sales bs WHERE bs.sale_id = s.id), 0)) as total_profit '
        'FROM sales s '
        'ORDER BY sale_date DESC'
    ).fetchall()
    return jsonify([dict(sale) for sale in sales])
    
@bp.route('/loadSoldCards/<int:sale_id>')
def loadSoldCards(sale_id):
    db = get_db()
    cards = db.execute(
        'SELECT c.*, si.sell_price, si.sold_cm, si.sold, s.sale_date, s.invoice_number '
        'FROM cards c '
        'JOIN sale_items si ON c.id = si.card_id '
        'JOIN sales s ON si.sale_id = s.id '
        'WHERE si.sale_id = ?',
        (sale_id,)
    ).fetchall()
    bulk_sales = db.execute(
        'SELECT * FROM bulk_sales WHERE sale_id = ?', (sale_id,))
    bulk_sales_list = [dict(bulk) for bulk in bulk_sales]
    response = {
        "cards": [dict(card) for card in cards],
        "bulk_sales": bulk_sales_list
    }

    return jsonify(response)

@bp.route('/generateSoldReport', methods=('GET',))
def generateSoldReport():
    db = get_db()
    month = request.args.get('month')
    year = request.args.get('year')
    cards = db.execute(
        'SELECT c.card_name, c.card_num, c.card_price, si.sell_price '
        'FROM cards c '
        'JOIN sale_items si ON c.id = si.card_id '
        'JOIN sales s ON si.sale_id = s.id '
        'WHERE strftime("%Y", s.sale_date) = ? AND strftime("%m", s.sale_date) = ?', 
        (year, month)).fetchall()
    
    bulkHolo = db.execute(
        'SELECT item_type, SUM(bs.quantity) as quantity, SUM(bs.total_price) as total_price FROM bulk_sales bs '
        'JOIN sales s ON bs.sale_id = s.id '
        'WHERE strftime("%Y", s.sale_date) = ? AND strftime("%m", s.sale_date) = ?'
        ' GROUP BY bs.item_type',
        (year, month)).fetchall()
    
    # Convert to list of dicts for easier processing
    cards_list = [dict(card) for card in cards]

    bulkAndHoloList = []
    i = 0
    for item_type in bulkHolo:
        print(dict(item_type))
        bulkAndHoloList.append(dict(item_type))
        bulkAndHoloList[i].update({'buy_price': 0.01} if item_type['item_type'] == 'bulk' else {'buy_price': 0.03})
        i += 1


    try:
        pdf_path = generatePDF(month, year, cards_list, bulkAndHoloList)
        return jsonify({'status': 'success', 'pdf_path': pdf_path}), 200
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


def generatePDF(month, year, cards, bulkAndHoloList):
    # Determine the save path based on environment
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker', 'Reports')
        os.makedirs(app_data_dir, exist_ok=True)
        pdf_path = os.path.join(app_data_dir, f'Report_{month}_{year}.pdf')
    else:
        # Running in development
        reports_dir = os.path.join(current_app.instance_path, 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        pdf_path = os.path.join(reports_dir, f'Report_{month}_{year}.pdf')
    
    # Create PDF
    pdf = fpdf.FPDF()
    pdf.add_page()
    
    font_family = 'Courier'  # Default font

    # Set title
    pdf.set_font(font_family, '', 16)
    pdf.cell(0, 10, f'Sales Report - {month}/{year}', 0, 1, 'C')
    pdf.ln(10)
    
    # Add summary
    pdf.set_font(font_family, '', 12)
    pdf.cell(0, 10, f'Total Cards Sold: {len(cards) + sum(item["quantity"] for item in bulkAndHoloList)}', 0, 1)
    pdf.ln(5)
    
    # Calculate totals
    total_buy_price = sum(card['card_price'] or 0 for card in cards)
    total_sell_price = sum(card['sell_price'] or 0 for card in cards)
    total_profit = total_sell_price - total_buy_price
    
    pdf.cell(0, 8, f'Total Buy Price: {total_buy_price:.2f}', 0, 1)
    pdf.cell(0, 8, f'Total Sell Price: {total_sell_price:.2f}', 0, 1)
    pdf.cell(0, 8, f'Total Profit: {total_profit:.2f}', 0, 1)
    pdf.ln(10)

    # Add bulk and holo summary
    # Table header for bulk and holo
    pdf.set_font(font_family, '', 10)
    pdf.cell(50, 10, 'Item type', 1, 0, 'C')
    pdf.cell(35, 10, 'Quantity', 1, 0, 'C')
    pdf.cell(30, 10, 'Buy Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Total Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Margin', 1, 0, 'C')
    pdf.ln()

    # Table content for bulk and holo
    pdf.set_font(font_family, '', 9)
    for item in bulkAndHoloList:
        item_type = item['item_type'] or 'N/A'
        quantity = str(item['quantity']) if item['quantity'] else 'N/A'
        buy_price = f"{item['buy_price']:.2f}" if item['buy_price'] else 'N/A'
        total_price = f"{item['total_price']:.2f}" if item['total_price'] else 'N/A'
        margin = f"{(item['total_price'] - (item['quantity'] * item['buy_price'])):.2f}" if item['total_price'] and item['buy_price'] else 'N/A'

        pdf.cell(50, 8, item_type, 1, 0, 'L')
        pdf.cell(35, 8, quantity, 1, 0, 'C')
        pdf.cell(30, 8, buy_price, 1, 0, 'R')
        pdf.cell(30, 8, total_price, 1, 0, 'R')
        pdf.cell(30, 8, margin, 1, 0, 'R')
        pdf.ln()

    
    # Table header
    pdf.set_font(font_family, '', 10)
    pdf.cell(50, 10, 'Card Name', 1, 0, 'C')
    pdf.cell(35, 10, 'Card Number', 1, 0, 'C')
    pdf.cell(30, 10, 'Buy Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Sell Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Margin', 1, 0, 'C')
    pdf.ln()
    
    # Table content
    pdf.set_font(font_family, '', 9)
    for card in cards:
        card_name = card['card_name'] or 'N/A'
        card_num = card['card_num'] or 'N/A'
        buy_price = f"{card['card_price']:.2f}" if card['card_price'] else 'N/A'
        sell_price = f"{card['sell_price']:.2f}" if card['sell_price'] else 'N/A'
        card_profit = f"{(card['sell_price'] - card['card_price']):.2f}" if card['sell_price'] and card['card_price'] else 'N/A'
        
        # Truncate long card names to fit
        if len(card_name) > 45:
            card_name = card_name[:42] + '...'

        pdf.cell(50, 8, card_name, 1, 0, 'L')
        pdf.cell(35, 8, card_num, 1, 0, 'C')
        pdf.cell(30, 8, buy_price, 1, 0, 'R')
        pdf.cell(30, 8, sell_price, 1, 0, 'R')
        pdf.cell(30, 8, card_profit, 1, 0, 'R')
        pdf.ln()
    
    # Save PDF
    pdf.output(pdf_path)
    return pdf_path


@bp.route('/addToCollecton', methods=('GET','POST'))
def addToCollection():
    if request.method == 'POST':
        cards = request.get_json()
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

@bp.route('/collectionValue')
def collectionValue():
    db = get_db()
    cur = db.cursor()
    value = cur.execute('SELECT SUM(market_value) FROM collection').fetchone()[0]
    return jsonify({'status': 'success','value': value}),200

@bp.route('/addToSingles', methods=('POST', 'GET'))
def addToSingles():
    if request.method == 'POST':
        db = get_db()
        auction_id = 1
        data = request.get_json()

        for card in data[1:]:
            db.execute('INSERT INTO cards (card_name, card_num, condition, card_price, market_value, auction_id)'
                    'VALUES (?, ?, ?, ?, ?, ?)',
                    (
                        card.get('cardName'),
                        card.get('cardNum'),
                        card.get('condition'),
                        card.get('buyPrice'),
                        card.get('marketValue'),
                        auction_id
                    )
            )
        db.commit()
    return jsonify({'status': 'success'}), 201

@bp.route('/updateAuction/<int:auction_id>', methods=('PATCH',))
def updateAuction(auction_id):
    db = get_db()
    data = request.get_json()
    value = data.get('value')
    field = data.get('field')
    db.execute(f'UPDATE auctions SET {field} = ? WHERE id = ?', (value, auction_id))
    db.commit()
    return jsonify({'status': 'success'}), 200

@bp.route('/updatePaymentMethod/<int:auction_id>', methods=('PATCH',))
def updatePaymentMethod(auction_id):
    db = get_db()
    data = request.get_json()
    payments = data.get('payments')  # Expecting array of {type, amount} objects
    
    # Validate and sanitize input
    is_valid, sanitized_payments, error_msg = validate_and_sanitize_payments(payments)
    if not is_valid:
        return jsonify({'status': 'error', 'message': error_msg}), 400
    
    # Store as JSON string
    payment_method_json = json.dumps(sanitized_payments)
    db.execute('UPDATE auctions SET payment_method = ? WHERE id = ?', (payment_method_json, auction_id))
    db.commit()

    return jsonify({'status': 'success'}), 200



@bp.route('/recalculateCardPrices/<int:auction_id>/<string:new_auction_price>', methods=('GET',))
def recalculateCardPrices(auction_id, new_auction_price):
    db = get_db()
    new_auction_price = float(new_auction_price)
    # Get unsold cards from the auction
    cards = db.execute(
        'SELECT c.id, c.market_value, si.card_id '
        'FROM cards c '
        'LEFT JOIN sale_items si ON c.id = si.card_id '
        'WHERE c.auction_id = ? AND si.card_id IS NULL',
        (auction_id,)
    ).fetchall()

    if not cards:
        return jsonify({'status': 'error', 'message': 'No unsold cards found'}), 400

    for card in cards:
        if card["card_id"] is not None:
            return jsonify({'status': 'error', 'message': 'Some cards have already been sold'}), 400

    # Calculate total market value of unsold cards
    total_market_value = sum(card['market_value'] or 0 for card in cards)
    
    if total_market_value == 0:
        return jsonify({'status': 'error', 'message': 'Total market value is zero'}), 400

    priceDiff = total_market_value - new_auction_price
    
    # Update each card proportionally
    for card in cards:
        if card['market_value'] is not None and card['market_value'] > 0:
            discount = (card['market_value'] / total_market_value) * priceDiff
            new_price = round(card['market_value'] - discount, 2)
            db.execute('UPDATE cards SET card_price = ? WHERE id = ?', (new_price, card['id']))
    
    db.commit()
    return jsonify({'status': 'success'}), 200

@bp.route('/groupUnnamed', methods=('GET', 'POST'))
def groupUnnamed():
    if request.method == 'GET':
        db = get_db()
        cursor = db.cursor()
        id = cursor.execute("SELECT id FROM auctions WHERE auction_name IS NULL ORDER BY id ASC LIMIT 1").fetchone()[0]
        db.execute("UPDATE cards SET auction_id = ? FROM cards c JOIN auctions a ON c.auction_id = a.id WHERE a.auction_name IS NULL", (id,))
        db.execute("UPDATE auctions SET auction_price = (SELECT SUM(market_value) FROM cards WHERE auction_id = ?) WHERE id = ?", (id, id, ))
        db.commit()
        return jsonify({'status': 'success'}), 200

#Gets rows of CM table using chrome extension and save them to the datasabe
@bp.route('/CardMarketTable', methods=('GET', 'POST'))
def cardMarketTable():
    if request.method == 'POST':
        db = get_db()
        cards = request.get_json()
        date = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        auction = {
            'name': None,
            'buy': None,
            'date': date
        }

        auction["buy"] = sum((float(card.get('marketValue', 0)) * 0.8) for card in cards)
        auction["buy"] = round(auction["buy"], 2)
        try:
            cursor = db.execute(
                'INSERT INTO auctions (auction_name, auction_price, date_created) VALUES (?, ?, ?)',
                (auction['name'], auction['buy'], auction['date'])
            )
            auction_id = cursor.lastrowid
            cardsToInsert = []
            
            for card in cards:
                # Safely convert count to integer
                try:
                    count = int(card.get('count', 1))
                except (ValueError, TypeError):
                    count = 1
                    
                for _ in range(count):
                    marketValue = card.get('marketValue', 0)
                    marketValue = float(marketValue) if marketValue is not None else None

                    if marketValue:
                        buyPrice = round(marketValue * 0.80, 2)
                    else:
                        buyPrice = 0

                    cardsToInsert.append((
                        card.get('name', None),
                        card.get('num', None),
                        card.get('condition', None),
                        buyPrice,
                        marketValue,
                        auction_id
                    ))
            
            # Execute the insert ONCE after building the full list
            db.executemany(
                'INSERT INTO cards (card_name, card_num, condition, card_price, market_value, auction_id) VALUES (?, ?, ?, ?, ?, ?)',
                cardsToInsert
            )            
            db.commit()
            return jsonify({'status': 'success'}), 201

        except Exception as e:
            print("DB error:", e)
            return jsonify({'status': 'error'}), 500

def createDicts(lines):
    zipped = list(zip(*[line.split(';') for line in lines]))

    dictsNum = len(zipped[0]) - 1
    dicts = [{} for _ in range(dictsNum)]

    for row in zipped:
        key = row[0].strip()
        for i in range(dictsNum):
            dicts[i][key] = row[i + 1].strip()

    return dicts
    
def getImportantCollums(cards, columns):
    data = []
    for d in cards:
        order_id = list(d.values())[columns['Order ID']].upper()
        count = int(list(d.values())[columns['Product ID'] + 1])
        name = list(d.values())[columns['Product ID'] + 2].upper()
        number = list(d.values())[columns['Collector Number']].upper()
        condition = list(d.values())[columns['Condition']]
        #print("Condition:", condition)
        condition = conditionDict.get(condition)
        #print("Mapped Condition:", condition)
        price = float(list(d.values())[columns['Expansion'] + 1])
        language = list(d.values())[columns['Language']]
        expansion = list(d.values())[columns['Expansion']]
        if language:
            expansion = all_pokemon_sets.get(expansion)
        else:
            expansion = None
        #print("Expansion:", expansion)
        #print("Number:", number)
        if expansion != None and number != None:
            card_num = expansion +" "+ number
        elif expansion == None:
            card_num = number
        else:
            card_num = expansion
        for _ in range(count):
            filteredRow = [order_id, name, condition, price, card_num]
            temp = zip(dictKeys, filteredRow)
            data.append(dict(temp))
    return data

def updateOneCard(db, name, num, condition, sellPrice):
    #print(name, num, condition, sellPrice)
    cardId = db.execute(
        "SELECT c.id FROM cards c "
        "LEFT JOIN sale_items si ON c.id = si.card_id "
        "WHERE c.card_name = ? AND c.card_num LIKE ? AND c.condition = ? AND si.card_id IS NULL "
        "LIMIT 1", (name, f'%{num}', condition)).fetchone()
    if cardId:
        date = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        card = db.execute("SELECT auction_id, card_price FROM cards WHERE id = ?", (cardId['id'],)).fetchone()
        
        # Create a sale for this card
        invoice_number = f"CSV-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}-{cardId['id']}"
        db.execute(
            "INSERT INTO sales (invoice_number, sale_date, total_amount) VALUES (?, ?, ?)",
            (invoice_number, date, sellPrice)
        )
        sale_id = db.cursor().lastrowid
        
        # Add sale item
        db.execute(
            "INSERT INTO sale_items (sale_id, card_id, sell_price, sold_cm) VALUES (?, ?, ?, ?)",
            (sale_id, cardId['id'], sellPrice, 1)
        )
        db.commit()
        return
    else:
        db.commit()
        return
    
def allowedFile(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in "csv"

@bp.route('/importSoldCSV', methods=('POST',))
def importSoldCSV():
    if request.method == 'POST':
        # Use the same folder as the database
        if getattr(sys, 'frozen', False):
            # Running as compiled exe
            app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker')
            os.makedirs(app_data_dir, exist_ok=True)
            check_file_path = os.path.join(app_data_dir, 'checkFile.csv')
        else:
            # Running in development
            check_file_path = os.path.join(current_app.instance_path, 'checkFile.csv')
            os.makedirs(os.path.dirname(check_file_path), exist_ok=True)
        
        if 'csv-upload' not in request.files:
            return jsonify({'status': 'missing'}), 400
        
        file = request.files['csv-upload']
        if file.filename == '':
            return jsonify({'status': 'file'}), 400
        if not allowedFile(file.filename):
            return jsonify({'status': 'extension'}), 400
        
        lines = []
        existingOrderID = set()

        CHECK_PATH = check_file_path
        try:
            # Read existing order IDs
            if os.path.exists(CHECK_PATH):
                with open(CHECK_PATH, 'r', encoding='utf-8') as checkFile:
                    existingLines = checkFile.read().splitlines()
            else:
                existingLines = []

            # Process new file
            for line in file.stream:
                try:
                    decoded = line.decode("utf-8").strip()
                    if decoded == "":
                        continue
                    
                    # Ensure we have enough columns
                    columns = decoded.split(';')
                    if len(columns) <= 12:
                        continue
                        
                    orderId = columns[12].strip()
                    if any(orderId in existingLine for existingLine in existingLines):
                        continue
                    lines.append(decoded)
                    existingOrderID.add(orderId)
                except UnicodeDecodeError:
                    print(f"Warning: Skipping line due to encoding issues")
                    continue

            # Remove header if present
            if "Order ID" in existingOrderID:
                existingOrderID.remove("Order ID")
            
            if not lines:
                return jsonify({'status': 'duplicate'}), 400

            # Process cards
            cards = createDicts(lines)
            try:
                columns = {name: key for key, name in enumerate(cards[0].keys())}
            except (IndexError, KeyError) as e:
                print(f"Error processing CSV structure: {e}")
                return jsonify({'status': 'invalid_format'}), 400

            dataList = getImportantCollums(cards, columns)

            # Update database
            db = get_db()
            for item in dataList:
                updateOneCard(db, item.get('Name'), item.get('Card Number'), item.get('Condition'), item.get('Price'))

            # Save updated check file
            existingOrderID = sorted(existingOrderID, key=int)
            with open(CHECK_PATH, 'w', encoding='utf-8') as checkFile:
                for orderId in existingOrderID:
                    checkFile.write(orderId + '\n')

        except Exception as e:
            print(f"Error processing CSV file: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500


    return jsonify({'status': 'success'}), 201

@bp.route('/searchCard', methods=('POST',))
def search():
    if request.method == 'POST':
        card = request.get_json()
        placeholders = ",".join(["?"] * len(card.get('cartIds', [])))
        db = get_db()
        matches = db.execute(
                "SELECT c.card_name, c.card_num, c.condition, c.market_value, c.id, c.auction_id, a.auction_name FROM cards c "
                "JOIN auctions a ON c.auction_id = a.id "
                "LEFT JOIN sale_items si ON c.id = si.card_id "
                "WHERE UPPER(COALESCE(c.card_name, '') || ' ' || COALESCE(c.card_num, '')) LIKE UPPER(?) AND si.card_id IS NULL "
                f"AND c.id NOT IN ({placeholders}) "
                "GROUP BY UPPER(c.card_name), UPPER(c.card_num), UPPER(c.condition) ORDER BY c.id ASC LIMIT 10",
                (f'%{card.get("query")}%', *card.get('cartIds', []))).fetchall()
        if matches == None or len(matches) == 0:
            return jsonify({'status': 'success','value': None}),200
        else:
            return jsonify({'status': 'success','value': [dict(m) for m in matches]}),200

@bp.route('/invoice/<int:vendor>', methods=('GET', 'POST'))
def invoice(vendor):
    if request.method == 'POST':
        cartContent = request.get_json()
        recieverInfo = cartContent['recieverInfo']
        bulk = cartContent.get('bulkItem')
        holo = cartContent.get('holoItem')
        
        # Validate inventory before processing
        db = get_db()
        if bulk and bulk.get('quantity', 0) > 0:
            if not _check_bulk_inventory(db, 'bulk', bulk.get('quantity', 0)):
                return jsonify({
                    'status': 'error',
                    'message': f'Insufficient bulk inventory. Requested: {bulk.get("quantity", 0)}'
                }), 400
        
        if holo and holo.get('quantity', 0) > 0:
            if not _check_bulk_inventory(db, 'holo', holo.get('quantity', 0)):
                return jsonify({
                    'status': 'error',
                    'message': f'Insufficient holo inventory. Requested: {holo.get("quantity", 0)}'
                }), 400
        
        # Generate the invoice and get the file path
        pdf_path, invoice_num = generateInvoice.generate_invoice(recieverInfo, cartContent.get('cards', []), bulk, holo)
        
        # Create sale record - ensure we have a valid date
        sale_date = datetime.date.today().isoformat()
        cursor = db.execute('INSERT INTO sales (invoice_number, sale_date, total_amount, notes) VALUES (?, ?, ?, ?)',
                   (invoice_num, sale_date, recieverInfo.get('total'), recieverInfo.get('nameAndSurname')))
        sale_id = cursor.lastrowid
        
        # Add sale items
        # vendor == 0 means CardMarket, vendor == 1 means other platform
        sold_cm_value = 1 if vendor == 1 else 0
        sold_value = 0 if vendor == 1 else 1
        
        if cartContent.get('cards', [])[0].get('marketValue') != '':
            for card in cartContent.get('cards', []):
                sell_price = float(card.get('marketValue', 0))
                db.execute('UPDATE cards SET sold_date = ? WHERE id = ?',
                        (sale_date, card.get('cardId')))
                    
                db.execute(
                    'INSERT INTO sale_items (sale_id, card_id, sell_price, sold_cm, sold, profit) '
                    'VALUES (?, ?, ?, ?, ?, ? - (SELECT card_price FROM cards WHERE id = ?))',
                    (sale_id, card.get('cardId'), sell_price, sold_cm_value, sold_value, sell_price, card.get('cardId'))
                )

        if bulk:
            db.execute('INSERT INTO bulk_sales (sale_id, item_type, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                   (sale_id, 'bulk', bulk.get('quantity', 0), bulk.get('unit_price', 0.01), bulk.get('sell_price', 0)))
            db.execute('UPDATE bulk_counter SET counter = counter - ? WHERE counter_name = "bulk"', (bulk.get('quantity', 0),))
            # Deduct from bulk_items using FIFO
            _deduct_bulk_items_fifo(db, 'bulk', bulk.get('quantity', 0))
            
        if holo:
            db.execute('INSERT INTO bulk_sales (sale_id, item_type, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                   (sale_id, 'holo', holo.get('quantity', 0), holo.get('unit_price', 0.03), holo.get('sell_price', 0)))
            db.execute('UPDATE bulk_counter SET counter = counter - ? WHERE counter_name = "holo"', (holo.get('quantity', 0),))
            # Deduct from bulk_items using FIFO
            _deduct_bulk_items_fifo(db, 'holo', holo.get('quantity', 0))

        db.commit()
        
        # Send the PDF file as a download
        return jsonify({'status': 'success', 'pdf_path': pdf_path}), 200


