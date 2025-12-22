
from decimal import Decimal
import os
import sys
from datetime import date, datetime
from InvoiceGenerator.api import Invoice, Item, Client, Provider, Creator
from InvoiceGenerator.pdf import SimpleInvoice
from flask import current_app

def generate_invoice(reciever, items, bulk=None, holo=None):
    # Read invoice number from env.txt
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        env_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker')
        os.makedirs(env_dir, exist_ok=True)
        env_path = os.path.join(env_dir, 'env.txt')
        # Get the base path where PyInstaller unpacks files
        base_path = sys._MEIPASS
        logo_path = os.path.join(base_path, 'tradeTracker', 'static', 'images', 'logo.png')
    else:
        # Running in development
        env_path = os.path.join(os.path.dirname(__file__), 'env.txt')
        logo_path = os.path.join(os.path.dirname(__file__), 'static', 'images', 'logo.png')
    
    # Read or create env.txt with invoice_num
    try:
        with open(env_path, 'r') as f:
            invoice_num = f.read().strip()
            if not invoice_num:
                invoice_num = "62"
    except FileNotFoundError:
        invoice_num = "62"
    
    # Write incremented invoice number back
    with open(env_path, 'w') as f:
        f.write(str(int(invoice_num) + 1))
    
    invoice_date = date.today()
    # Set language to Slovak (or English 'en') if supported by your system locale
    os.environ["INVOICE_LANG"] = "sk"

    # 1. Define the Supplier (Dominik Forró - CARD ANVIL)
    # Data extracted from source: 39-48, 52-63
    provider = Provider(
        summary="Dominik Forró - CARD ANVIL",
        address="Vahovce 94",
        city="Váhovce",
        zip_code="92562",
        phone="0949 759 023",
        email="dominikforro95@gmail.com",
        bank_name="Tatra banka, a.s.",
        bank_account="SK9511000000002945283029",  # IBAN
        # Mapping Slovak IDs to library fields:
        ir="57310041",       # IČO
        vat_id="1130287664", # DIČ
        note="Osoba zapísaná v Živnostenskom registri pod číslom \n220-42582, vydal Okresný úrad Galanta dňa\n 5.11.2025. \nPlatiteľ DPH formou §66.",
        logo_filename=logo_path
    )

    # 2. Define the Client
    # Data extracted from source: 50-51
    client = Client(
        summary=" ".join([part.capitalize() for part in reciever.get("nameAndSurname").split(" ")]), 
        address=reciever.get("address").capitalize(), # Full street address was missing in the snippet
        city=reciever.get("city").capitalize(),
    )

    # 3. Create the Invoice
    # Data extracted from source: 48, 67-69
    invoice = Invoice(client, provider, Creator("Dominik Forró"))
    invoice.number = invoice_num                # Invoice No.
    invoice.variable_symbol = invoice_num       # VS
    invoice.currency = "EUR"
    invoice.date = invoice_date          # Date of exposure (Dátum vystavenia)
    invoice.paytype=reciever.get("paymentMethod")  # Spôsob úhrady
    
    # Convert paybackDate string to date object (HTML date input format: YYYY-MM-DD)
    payback_str = reciever.get("paybackDate")
    if payback_str:
        invoice.payback = datetime.strptime(payback_str, "%Y-%m-%d").date()
    else:
        invoice.payback = invoice_date  # Default to today if not provided

    # 4. Add Items
    # Data extracted from source: 70
    for item in items:
        print(item)
        market_value_decimal = Decimal(float(item.get("marketValue").replace("€", "")))
        invoice.add_item(Item(
            count=1,
            price=market_value_decimal,
            unit="ks",
            description=item.get("cardName") + " " + item.get("cardNum"),
            tax=Decimal("0") # Neplatiteľ DPH (Non-VAT payer)
        ))
    if bulk:
        invoice.add_item(Item(
            count=bulk.get("quantity", 0),
            price=Decimal(str(bulk.get("unit_price", 0.01))),
            unit="ks",
            description="Bulk cards purchase",
            tax=Decimal("0")
        ))
    if holo:
        invoice.add_item(Item(
            count=holo.get("quantity", 0),
            price=holo.get("unit_price", 0.03),
            unit="ks",
            description="Holo cards purchase",
            tax=Decimal("0")
        ))

    # 5. Generate PDF
    pdf = SimpleInvoice(invoice)
    
    # Determine the save path based on environment
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker', 'Invoices')
        os.makedirs(app_data_dir, exist_ok=True)
        output_filename = f"Invoice_{invoice_date.strftime('%Y%m%d')}_{reciever.get('nameAndSurname', 'client').replace(' ', '_')}.pdf"
        output_path = os.path.join(app_data_dir, output_filename)
    else:
        # Running in development
        invoices_dir = os.path.join(current_app.instance_path, 'invoices')
        os.makedirs(invoices_dir, exist_ok=True)
        output_filename = f"Invoice_{invoice_date.strftime('%Y%m%d')}_{reciever.get('nameAndSurname', 'client').replace(' ', '_')}.pdf"
        output_path = os.path.join(invoices_dir, output_filename)
    
    pdf.gen(output_path, generate_qr_code=False)

    print(f"Successfully generated: {output_path}")
    return output_path, invoice_num

if __name__ == "__main__":
    generate_invoice()