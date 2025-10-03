import os
import sys
import webbrowser
import threading
import time
import socket
from tradeTracker import create_app
from waitress import serve

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
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == '__main__':
    # Check if another instance is already running
    if is_port_in_use(5000):
        # If app is already running, just open the browser
        webbrowser.open('http://127.0.0.1:5000')
        sys.exit(0)
    
    threading.Thread(target=open_browser, daemon=True).start()
    app = create_app()
    
    # Override template and static folders to use bundled resources
    app.template_folder = resource_path(os.path.join('tradeTracker', 'templates'))
    app.static_folder = resource_path(os.path.join('tradeTracker', 'static'))
    
    # Use waitress as the production server
    print("TradeTracker is running. Close this window to shut down the server.")
    serve(app, host='127.0.0.1', port=5000, threads=4)