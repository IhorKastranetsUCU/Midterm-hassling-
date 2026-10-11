#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Local development server for UCU StatHustle.
Includes persistent JSON database API at /api/users/save and /api/users/list.
Automatically serves the website and opens it in your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DIRECTORY, "users_database.json")

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_db(data):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving to DB: {e}")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == "/api/users/list":
            db = load_db()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(db).encode("utf-8"))
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/users/save":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                user_data = json.loads(body.decode("utf-8"))
                email = user_data.get("email")
                if email:
                    db = load_db()
                    db[email.lower().strip()] = user_data
                    save_db(db)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "ok", "saved": email}).encode("utf-8"))
                    return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
                return
        return super().do_POST()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run():
    os.chdir(DIRECTORY)
    for p in range(PORT, PORT + 20):
        try:
            with ReusableTCPServer(("", p), Handler) as httpd:
                url = f"http://localhost:{p}"
                print("=" * 60)
                print("🚀 UCU StatHustle: Probability & Statistics Exam Platform")
                print(f"📡 Running locally at: {url}")
                print(f"📂 Serving directory:  {DIRECTORY}")
                print(f"💾 Persistent DB File: {DB_FILE}")
                print("🎯 Colloquium: Wednesday | Midterm 2: Friday")
                print("Press Ctrl+C to stop the server.")
                print("=" * 60)
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nServer stopped. Happy hustling and good luck on the exam!")
        sys.exit(0)
