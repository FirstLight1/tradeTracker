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
            'date': cardsArr[0]['date'] if 'date' in cardsArr[0] else None
        }
        cursor = db.execute(
            'INSERT INTO auctions (auction_name, auction_price, date_created) VALUES (?, ?, ?)',
            (auction['name'], auction['buy'], auction['date'])
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
    
@bp.route('/loadAuctions')
def loadAuctions():
    db = get_db()
    auctions = db.execute(
        'SELECT DISTINCT a.* FROM auctions a '
        'LEFT JOIN cards c ON a.id = c.auction_id '
        'LEFT JOIN sale_items si ON c.id = si.card_id '
        'WHERE a.id = 1 OR si.card_id IS NULL'
    ).fetchall()
    return jsonify([dict(auction) for auction in auctions])

@bp.route('/loadCards/<int:auction_id>')
def loadCards(auction_id):
    db = get_db()
    if auction_id == 1:
        cards = db.execute('SELECT * FROM cards WHERE auction_id = 1').fetchall()
        return jsonify([dict(card) for card in cards]),200
    cards = db.execute(
        'SELECT c.* FROM cards c '
        'LEFT JOIN sale_items si ON c.id = si.card_id '
        'WHERE c.auction_id = ? AND si.card_id IS NULL', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/loadAllCards/<int:auction_id>')
def loadAllCards(auction_id):
    db = get_db()
    cards = db.execute('SELECT * FROM cards WHERE auction_id = ?', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/inventoryValue')
def invertoryValue():
    db = get_db()
    cur = db.cursor()
    value = cur.execute('SELECT SUM(market_value) FROM cards').fetchone()[0]

    return jsonify({'status': 'success','value': value}),200


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
        cards = request.get_json()
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
        return jsonify({'status': 'success'}), 201

@bp.route('/loadSoldHistory')
def loadSoldHistory():
    db = get_db()
    sales = db.execute(
        'SELECT * FROM sales ORDER BY sale_date DESC'
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
    return jsonify([dict(card) for card in cards])

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
    
    # Convert to list of dicts for easier processing
    cards_list = [dict(card) for card in cards]
    
    try:
        pdf_path = generatePDF(month, year, cards_list)
        return jsonify({'status': 'success', 'pdf_path': pdf_path}), 200
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


def generatePDF(month, year, cards):
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
    pdf.cell(0, 10, f'Total Cards Sold: {len(cards)}', 0, 1)
    pdf.ln(5)
    
    # Calculate totals
    total_buy_price = sum(card['card_price'] or 0 for card in cards)
    total_sell_price = sum(card['sell_price'] or 0 for card in cards)
    total_profit = total_sell_price - total_buy_price
    
    pdf.cell(0, 8, f'Total Buy Price: {total_buy_price:.2f}', 0, 1)
    pdf.cell(0, 8, f'Total Sell Price: {total_sell_price:.2f}', 0, 1)
    pdf.cell(0, 8, f'Total Profit: {total_profit:.2f}', 0, 1)
    pdf.ln(10)
    
    # Table header
    pdf.set_font(font_family, '', 10)
    pdf.cell(50, 10, 'Card Name', 1, 0, 'C')
    pdf.cell(35, 10, 'Card Number', 1, 0, 'C')
    pdf.cell(30, 10, 'Buy Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Sell Price', 1, 0, 'C')
    pdf.cell(30, 10, 'Profit', 1, 0, 'C')
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
                count = card.get('count', 1)
                for _ in range(count):
                    marketValue = card.get('marketValue', 0)
                    marketValue = float(marketValue) if marketValue is not None else None

                    if marketValue:
                        buyPrice = round(marketValue * 0.80, 2)

                    cardsToInsert.append((
                        card.get('name', None),
                        card.get('num', None),
                        card.get('condition', None),
                        buyPrice,
                        marketValue,
                        auction_id
                    ))

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
        cards = request.get_json()
        recieverInfo = cards[len(cards)-1]
        cards.pop()
        # Generate the invoice and get the file path
        pdf_path, invoice_num = generateInvoice.generate_invoice(recieverInfo, cards)
        # Update database
        db = get_db()
        
        # Create sale record - ensure we have a valid date
        sale_date = datetime.date.today().isoformat()
        cursor = db.execute('INSERT INTO sales (invoice_number, sale_date, total_amount) VALUES (?, ?, ?)',
                   (invoice_num, sale_date, recieverInfo.get('total')))
        sale_id = cursor.lastrowid
        
        # Add sale items
        # vendor == 0 means CardMarket, vendor == 1 means other platform
        sold_cm_value = 1 if vendor == 1 else 0
        sold_value = 0 if vendor == 1 else 1
        
        for card in cards:
            sell_price = float(card.get('marketValue', 0))
            db.execute('UPDATE cards SET sold_date = ? WHERE id = ?',
                      (sale_date, card.get('cardId')))
                
            db.execute(
                'INSERT INTO sale_items (sale_id, card_id, sell_price, sold_cm, sold)'
                'VALUES (?, ?, ?, ?, ?)',
                (sale_id, card.get('cardId'), sell_price, sold_cm_value, sold_value)
            )
        
        db.commit()
        
        # Send the PDF file as a download
        return jsonify({'status': 'success', 'pdf_path': pdf_path}), 200


