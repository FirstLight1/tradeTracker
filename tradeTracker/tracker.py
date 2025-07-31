from flask import url_for, Flask, request, g, render_template
import sqlite3


@app.route('/')
def index():
    return render_template("index.html")