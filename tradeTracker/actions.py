import sys
from flask import url_for, Flask, request, g, render_template, Blueprint, jsonify, current_app
from flask_cors import CORS
from tradeTracker.db import get_db
import datetime
import csv
from werkzeug.utils import secure_filename
import os
import sqlite3

bp = Blueprint('actions', __name__)
CORS(bp)
dictKeys = ['Product ID', 'Name', 'Condition', 'Price', 'Card Number']
li = []
dataList = []

conditionDict = {
    "MT" : "Mint",
    "NM" : "Near Mint",
    "EX" : "Excellent",
    "GD" : "Good",
    "LP" : "Light Played",
    "PL" : "Played",
    "PO" : "Poor"
}

pokemon_sets = {
    # --- Mainline Expansion Sets ---
    # Original (Wizards)
    "Base Set": "BS",
    "Jungle": "JU",
    "Fossil": "FO",
    "Base Set 2": "B2",
    "Team Rocket": "TR",
    "Gym Heroes": "G1",
    "Gym Challenge": "G2",

    # Southern Islands & Neo Series
    "Southern Islands": "SI",
    "Neo Genesis": "N1",
    "Neo Discovery": "N2",
    "Neo Revelation": "N3",
    "Neo Destiny": "N4",
    "Legendary Collection": "LC",

    # e-Card Series
    "Expedition Base Set": "EX",
    "Aquapolis": "AQ",
    "Skyridge": "SK",

    # EX Series (Post-Wizards)
    "EX Ruby & Sapphire": "RS",
    "EX Sandstorm": "SS",
    "EX Dragon": "DR",
    "EX Team Magma vs Team Aqua": "MA",
    "EX Hidden Legends": "HL",
    "EX FireRed & LeafGreen": "FRLG",
    "EX Team Rocket Returns": "TRR",
    "EX Deoxys": "DX",
    "EX Emerald": "EM",
    "EX Unseen Forces": "UF",
    "EX Delta Species": "DS",
    "EX Legend Maker": "LM",
    "EX Holon Phantoms": "HP",
    "EX Crystal Guardians": "CG",
    "EX Dragon Frontiers": "DF",
    "EX Power Keepers": "PK",

    # Diamond & Pearl Series
    "Diamond & Pearl": "DP",
    "Mysterious Treasures": "MT",
    "Secret Wonders": "SW",
    "Great Encounters": "GE",
    "Majestic Dawn": "MD",
    "Legends Awakened": "LA",
    "Stormfront": "SF",

    # Platinum Series
    "Platinum": "PL",
    "Rising Rivals": "RR",
    "Supreme Victors": "SV",
    "Arceus": "AR",

    # HeartGold & SoulSilver Series
    "HeartGold & SoulSilver": "HS",
    "Unleashed": "UL",
    "Undaunted": "UD",
    "Triumphant": "TM",

    # Call of Legends
    "Call of Legends": "CL",

    # Black & White Series
    "Black & White": "BLW",
    "Emerging Powers": "EPO",
    "Noble Victories": "NVI",
    "Next Destinies": "NXD",
    "Dark Explorers": "DEX",
    "Dragons Exalted": "DRX",
    "Dragon Vault": "DRV",
    "Boundaries Crossed": "BCR",
    "Plasma Storm": "PLS",
    "Plasma Freeze": "PLF",
    "Plasma Blast": "PLB",
    "Legendary Treasures": "LTR",

    # XY Series
    "XY": "XY",
    "Flashfire": "FLF",
    "Furious Fists": "FFI",
    "Phantom Forces": "PHF",
    "Primal Clash": "PRC",
    "Double Crisis": "DCR",
    "Roaring Skies": "ROS",
    "Ancient Origins": "AOR",
    "BREAKthrough": "BKT",
    "BREAKpoint": "BKP",
    "Generations": "GEN",
    "Fates Collide": "FCO",
    "Steam Siege": "STS",
    "Evolutions": "EVO",

    # Sun & Moon Series
    "Sun & Moon": "SM",
    "Burning Shadows": "BUS",
    "Shining Legends": "SLG",
    "Crimson Invasion": "CIN",
    "Ultra Prism": "UPR",
    "Forbidden Light": "FLI",
    "Celestial Storm": "CES",
    "Dragon Majesty": "DRM",
    "Lost Thunder": "LOT",
    "Team Up": "TEU",
    "Detective Pikachu": "DET",
    "Unbroken Bonds": "UNB",
    "Unified Minds": "UNM",
    "Hidden Fates": "HIF",
    "Cosmic Eclipse": "CEC",

    # Sword & Shield Series
    "Sword & Shield": "SSH",
    "Rebel Clash": "RCL",
    "Darkness Ablaze": "DAA",
    "Champion’s Path": "CPA",
    "Vivid Voltage": "VIV",
    "Shining Fates": "SHF",
    "Battle Styles": "BST",
    "Chilling Reign": "CRE",
    "Evolving Skies": "EVS",
    "Celebrations": "CEL",
    "Fusion Strike": "FST",
    "Brilliant Stars": "BRS",
    "Astral Radiance": "ASR",
    "Pokémon GO": "PGO",
    "Lost Origin": "LOR",
    "Silver Tempest": "SIT",
    "Crown Zenith": "CRZ",

    # Scarlet & Violet Series (through August 2025)
    "Scarlet & Violet": "SVI",
    "Scarlet & Violet Promos": "SVP",
    "Scarlet & Violet Energy": "SVE",
    "Paldea Evolved": "PAL",
    "Obsidian Flames": "OBF",
    "151 (Mew)": "MEW",
    "Paradox Rift": "PAR",
    "Paldean Fates": "PAF",
    "Temporal Forces": "TEF",
    "Twilight Masquerade": "TWM",
    "Shrouded Fable": "SFA",
    "Stellar Crown": "SCR",
    "Surging Sparks": "SSP",
    "Journey Together": "JTG",
    "Destined Rivals": "DRI",
    "Black Bolt & White Flare": "BLK/WHT",
    "Black Bolt" : "BLK",
    "White Flare": "WHT",

    # --- Promos, Seasonal, Regional & Digital Collections ---
    # Black Star Promos (by era)
    "Nintendo Black Star Promos": "NBSP",
    "DP Black Star Promos": "DP Promo",
    "HGSS Black Star Promos": "HGSS Promo",
    "BW Black Star Promos": "BW Promo",
    "XY Black Star Promos": "XY Promo",
    "SM Black Star Promos": "SM Promo",
    "SWSH Black Star Promos": "SWSH",
    "SVP Black Star Promos": "SVP Promo",

    # POP Series
    "POP Series 1": "POP1",
    "POP Series 2": "POP2",
    "POP Series 3": "POP3",
    "POP Series 4": "POP4",
    "POP Series 5": "POP5",
    "POP Series 6": "POP6",
    "POP Series 7": "POP7",
    "POP Series 8": "POP8",
    "POP Series 9": "POP9",

    # Miscellaneous, event-based exclusives
    "Miscellaneous Promotional Cards": "Misc Promo",
    "World Championships Promos": "WC Promo",
    "Paldea Collection Promos": "Paldea Promo",
    "Build & Battle Box Promos": "B&B Promo",

    # Unnumbered or early promos
    "Unnumbered Promotional Cards": "Unnumbered Promo",

    # Digital Promo Sets / Packs
    "Sword & Shield Chilling Reign Promo Set": "SWSH CR Promo",
    "Sword & Shield Evolving Skies Promo Set": "SWSH ES Promo",
    "Sword & Shield Fusion Strike Promo Set": "SWSH FS Promo",
    "Sword & Shield Brilliant Stars Promo Set": "SWSH BS Promo",
    "Sword & Shield Astral Radiance Promo Set": "SWSH AR Promo",
    "Sword & Shield Silver Tempest Promo Set": "SWSH ST Promo",
    "Sword & Shield Crown Zenith Promo Set": "SWSH CZ Promo",
    "Scarlet & Violet Promo Set": "SV Promo",
    "Scarlet & Violet Paldea Evolved Promo Set": "SV PE Promo",
    "Pokémon GO Promo Pack": "GO Promo",

    # Regional / Asian promos
    "SV-P Promotional Cards (Traditional Chinese)": "SV-P",
    "SM-P Promotional Cards (Simplified Chinese)": "SM-P",

    # TCG Pocket (digital platform)
    "TCG Pocket Promo-A Series": "Promo-A",
}

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
                'INSERT INTO cards (card_name, card_num, condition, card_price, market_value, sell_price, sold, sold_cm, profit, sold_date,auction_id) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    card.get('cardName'),
                    card.get('cardNum'),
                    card.get('condition'),
                    card.get('buyPrice'),
                    card.get('marketValue'),
                    card.get('sellPrice'),
                    card.get('checkbox', 0),
                    card.get('checkbox_cm', 0),
                    card.get('profit'),
                    card.get('soldDate'),
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
        'WHERE a.id = 1 OR (c.sold = 0 AND c.sold_cm = 0)'
    ).fetchall()
    return jsonify([dict(auction) for auction in auctions])

@bp.route('/loadCards/<int:auction_id>')
def loadCards(auction_id):
    db = get_db()
    if auction_id == 1:
        cards = db.execute('SELECT * FROM cards WHERE auction_id = 1').fetchall()
        return jsonify([dict(card) for card in cards]),200
    cards = db.execute('SELECT * FROM cards WHERE auction_id = ? AND sold = 0 AND sold_cm = 0', (auction_id,)).fetchall()
    return jsonify([dict(card) for card in cards]),200

@bp.route('/inventoryValue')
def invertoryValue():
    db = get_db()
    cur = db.cursor()
    value = cur.execute('SELECT SUM(market_value) FROM cards WHERE sold = 0 AND sold_cm = 0').fetchone()[0]

    return jsonify({'status': 'success','value': value}),200

@bp.route('/totalProfit')
def totalProfit():
    db = get_db()
    cur = db.cursor()
    value = cur.execute('SELECT SUM(auction_profit) FROM auctions').fetchone()[0]

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
    allowed_fields = {"card_name", "card_num", "condition", "card_price", "market_value", "sell_price", "sold", "sold_cm", "profit", "sold_date"}
    print(field, value)
    if field == "sold" and value == True:
        db.execute('UPDATE cards SET sold_cm = 0 WHERE id = ?', (card_id,))
    elif field == "sold_cm" and value == True:
        db.execute('UPDATE cards SET sold = 0 WHERE id = ?', (card_id,))


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
            db.execute('INSERT INTO cards (card_name, card_num, condition, card_price, market_value, sell_price, sold, sold_cm, profit, sold_date, auction_id)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                card.get('cardName'),
                card.get('cardNum'),
                card.get('condition'),
                card.get('buyPrice'),
                card.get('marketValue'),
                card.get('sellPrice'),
                card.get('checkbox', 0),
                card.get('checkbox_cm', 0),
                card.get('profit'),
                card.get('soldDate'),
                auction_id
            )
        )
        db.commit()
        return jsonify({'status': 'success'}), 201
    
@bp.route('/loadSoldCards')
def loadSoldCards():
    db = get_db()
    cards = db.execute('SELECT * FROM cards WHERE sold = 1 OR sold_cm = 1').fetchall()
    return jsonify([dict(card) for card in cards])

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
        profit = {
            'profit': data[0]['profit'] if 'profit' in data[0] else None,
        }

        db.execute('UPDATE auctions SET auction_profit = auction_profit + ? WHERE id = 1',(profit['profit'],))
        for card in data[1:]:
            db.execute('INSERT INTO cards (card_name, card_num, condition, card_price, market_value, sell_price, sold, sold_cm, profit, sold_date, auction_id)'
                    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        card.get('cardName'),
                        card.get('cardNum'),
                        card.get('condition'),
                        card.get('buyPrice'),
                        card.get('marketValue'),
                        card.get('sellPrice'),
                        card.get('checkbox', 0),
                        card.get('checkbox_cm', 0),
                        card.get('profit'),
                        card.get('soldDate'),
                        auction_id
                    )
            )
        db.commit()
    return jsonify({'status': 'success'}), 201

#deprecated
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
    field = data.get('field')
    db.execute(f'UPDATE auctions SET {field} = ? WHERE id = ?', (profit, auction_id))
    db.commit()
    return jsonify({'status': 'success'}), 200


@bp.route('/CardMarketTable', methods=('GET', 'POST'))
def cardMarketTable():
    if request.method == 'POST':
        db = get_db()
        cards = request.get_json()
        date = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        auction = {
            'name': None,
            'buy': None,
            'profit': None,
            'date': date
        }

        auction["buy"] = sum((float(card.get('marketValue', 0)) * 0.8) for card in cards)
        auction["buy"] = round(auction["buy"], 2)
        try:
            cursor = db.execute(
                'INSERT INTO auctions (auction_name, auction_price, auction_profit, date_created) VALUES (?, ?, ?, ?)',
                (auction['name'], auction['buy'], auction['profit'], auction['date'])
            )
            auction_id = cursor.lastrowid
            cardsToInsert = []
            for card in cards:
                count = card.get('count', 1)
                marketValue = card.get('marketValue', 0)
                marketValue = float(marketValue) if marketValue is not None else None

                if marketValue:
                    sellPrice = marketValue
                    buyPrice = round(marketValue * 0.80, 2)
                for _ in range(int(count)):
                    cardsToInsert.append((
                        card.get('name', None),
                        card.get('num', None),
                        card.get('condition', None),
                        buyPrice,
                        marketValue,
                        sellPrice,
                        auction_id
                    ))

            db.executemany(
                'INSERT INTO cards (card_name, card_num, condition, card_price, market_value, sell_price, auction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
        condition = conditionDict.get(condition)
        price = float(list(d.values())[columns['Expansion'] + 1])
        expansion = list(d.values())[columns['Expansion']]
        expansion = pokemon_sets.get(expansion)
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
    cardId = db.execute("SELECT id FROM cards WHERE card_name = ? AND card_num = ? AND condition = ? AND sold = 0 AND sold_cm = 0 LIMIT 1", (name, num, condition)).fetchone()
    if cardId:
        date = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        db.execute("UPDATE cards SET sell_price = ?, sold_cm = ?, sold_date = ? WHERE id = ?", (sellPrice, 1, date, cardId['id']))
        card = db.execute("SELECT auction_id," \
                    "CASE WHEN auction_id = 1 THEN card_price END AS price," \
                    "sold," \
                    "sold_cm FROM cards WHERE id = ?", (cardId['id'],)).fetchone()
        if(card['auction_id']) == 1:
            profit = (sellPrice * 0.95) - card['price']
            profit = round(profit, 2)
            db.execute("UPDATE cards SET profit = ? WHERE id = ?", (profit, cardId['id']))
        else:
            cards = db.execute(
                "SELECT c.sell_price, c.sold, c.sold_cm, a.auction_price FROM cards c " \
            "JOIN auctions a ON c.auction_id = a.id " \
            "WHERE a.id = ?", (card['auction_id'], )).fetchall()
            totalSellPrice = 0
            for item in cards:
                if(item['sold_cm'] == 1):
                    totalSellPrice += item['sell_price'] * 0.95
                else:
                    totalSellPrice += item['sell_price']
            totalProfit = round(totalSellPrice - cards[0]['auction_price'], 2)
            db.execute("UPDATE auctions SET auction_profit = ? WHERE id = ?", (totalProfit, card['auction_id']))
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
                updateOneCard(db, item.get('Name'), item.get('Card Number'), item.get('condition'), item.get('Price'))

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
        db = get_db()
        if card.get('cardName') == None:
            matches = db.execute('SELECT c.card_name, c.card_num, c.condition, c.market_value,c.id,c.auction_id ,a.auction_name FROM cards c JOIN auctions a ON c.auction_id = a.id WHERE card_name LIKE ? OR card_num LIKE ? AND sold=0 AND sold_cm = 0 LIMIT 10',(f'{card.get('cardNum')}%',
                                                                                                     f'{card.get('cardNum')}%')).fetchmany(10)
        else:
            matches = db.execute('SELECT c.card_name, c.card_num, c.condition, c.market_value,c.id,c.auction_id ,a.auction_name FROM cards c JOIN auctions a ON c.auction_id = a.id WHERE card_name LIKE ? OR card_num LIKE ? AND sold=0 AND sold_cm = 0 LIMIT 10',(f'{card.get('cardName')}%',
                                                                                                     f'{card.get('cardNum')}%')).fetchmany()
        if matches == None:
            return jsonify({'status': 'success','value': None}),200
        else:
            return jsonify({'status': 'success','value': [dict(m) for m in matches]}),200



