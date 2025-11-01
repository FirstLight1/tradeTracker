import os
import sys
import webbrowser
import threading
import time
import socket
import shutil
import updater
from tradeTracker import create_app
from waitress import serve

def setup_expansion_files():
    """Copy expansion JSON files to AppData on first run (for .exe only)"""
    if getattr(sys, 'frozen', False):
        app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker')
        os.makedirs(app_data_dir, exist_ok=True)
        
        en_expansions_path = os.path.join(app_data_dir, 'enExpansions.json')
        jp_expansions_path = os.path.join(app_data_dir, 'jpExpansions.json')
        
        # Copy English expansions if it doesn't exist
        if not os.path.exists(en_expansions_path):
            try:
                source = os.path.join(sys._MEIPASS, 'enExpansions.json')
                shutil.copy(source, en_expansions_path)
                print(f"Copied English expansions to {en_expansions_path}")
            except Exception as e:
                print(f"Error copying English expansions: {e}")

        # Copy Japanese expansions if it doesn't exist
        if not os.path.exists(jp_expansions_path):
            try:
                source = os.path.join(sys._MEIPASS, 'jpExpansions.json')
                shutil.copy(source, jp_expansions_path)
                print(f"Copied Japanese expansions to {jp_expansions_path}")
            except Exception as e:
                print(f"Error copying Japanese expansions: {e}")

# Setup expansion files before anything else
setup_expansion_files()

# Run the updater check
updater.check_version()

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def open_browser():
    time.sleep(1.5)  # Wait for the server to start
    webbrowser.open('http://127.0.0.1:420')

if __name__ == '__main__':
    # Check if another instance is already running
    if is_port_in_use(420):
        # If app is already running, just open the browser
        webbrowser.open('http://127.0.0.1:420')
        sys.exit(0)
    
    threading.Thread(target=open_browser, daemon=True).start()
    app = create_app()
    
    # Override template and static folders to use bundled resources
    app.template_folder = resource_path(os.path.join('tradeTracker', 'templates'))
    app.static_folder = resource_path(os.path.join('tradeTracker', 'static'))
    
    # Use waitress as the production server
    print("TradeTracker is running. Close this window to shut down the server.")
    serve(app, host='127.0.0.1', port=420, threads=4)