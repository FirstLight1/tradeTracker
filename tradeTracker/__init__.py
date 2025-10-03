import os
import sys
from flask import Flask

from . import actions

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)

def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    
    # Use AppData for database storage in production (when frozen)
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        app_data_dir = os.path.join(os.environ['APPDATA'], 'TradeTracker')
        os.makedirs(app_data_dir, exist_ok=True)
        db_path = os.path.join(app_data_dir, 'tradeTracker.sqlite')
    else:
        # Running in development
        db_path = os.path.join(app.instance_path, 'tradeTracker.sqlite')
    
    app.config.from_mapping(
        DATABASE=db_path,
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from . import db, tracker, actions
    db.init_app(app)
    
    # Initialize the database if it doesn't exist
    if not os.path.exists(app.config['DATABASE']):
        with app.app_context():
            db.init_db()
            print("Database initialized automatically on first run")
    
    app.register_blueprint(tracker.bp)
    app.register_blueprint(actions.bp)

    return app