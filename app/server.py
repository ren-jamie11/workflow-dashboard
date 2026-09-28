"""Workflow Hub — local server (Python standard library only).

Serves app/ as static files and a small JSON API over data/. Binds to 127.0.0.1 only.
API (see docs/README.md):
  GET    /api/rows                   all data/rows/*/meta.json as one array
  GET    /api/data/<path>.json       file contents, or null if missing
  PUT    /api/data/<path>.json       write JSON (temp file + rename)
  DELETE /api/rows/<id>              remove data/rows/<id>/
  POST   /api/output?dir=&name=      write raw body into an allowed output folder
"""
import json
import os
import re
import shutil
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

HOST, PORT = '127.0.0.1', 8765
URL = f'http://{HOST}:{PORT}/'

ROOT = Path(__file__).resolve().parent.parent          # project folder
APP = ROOT / 'app'
DATA = ROOT / 'data'
OUTPUT_DIRS = {'售价计算 Price Calcs', '下单计划 Order Forms'}
ROW_ID = re.compile(r'^[a-z0-9]{4,40}$')
BAD_NAME_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def data_path(rel):
    """Resolve a path under data/; None if it escapes data/ or is not a .json file."""
    rel = unquote(rel).replace('\\', '/')
    if not rel or '..' in rel.split('/') or not rel.endswith('.json'):
        return None
    p = (DATA / rel).resolve()
    base = DATA.resolve()
    return p if base in p.parents else None


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_bytes(data)
    os.replace(tmp, path)


def unique_name(folder, name):
    stem, ext = os.path.splitext(name)
    candidate, n = name, 1
    while (folder / candidate).exists():
        candidate = f'{stem} ({n}){ext}'
        n += 1
    return candidate


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP), **kwargs)

    # ---------- helpers ----------
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_json(self, obj, status=200, raw=None):
        body = raw if raw is not None else json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def fail(self, status, msg):
        self.send_json({'error': msg}, status)

    def read_body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(n) if n > 0 else b''

    # ---------- routes ----------
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/rows':
            return self.list_rows()
        if path.startswith('/api/data/'):
            p = data_path(path[len('/api/data/'):])
            if not p:
                return self.fail(400, 'bad path')
            return self.send_json(None, raw=p.read_bytes() if p.is_file() else b'null')
        if path.startswith('/api/'):
            return self.fail(404, 'unknown endpoint')
        return super().do_GET()

    def do_PUT(self):
        path = urlsplit(self.path).path
        if not path.startswith('/api/data/'):
            return self.fail(404, 'unknown endpoint')
        p = data_path(path[len('/api/data/'):])
        if not p:
            return self.fail(400, 'bad path')
        body = self.read_body()
        try:
            json.loads(body.decode('utf-8'))
        except ValueError:
            return self.fail(400, 'body is not valid JSON')
        write_atomic(p, body)
        self.send_json({'ok': True})

    def do_DELETE(self):
        path = urlsplit(self.path).path
        m = re.fullmatch(r'/api/rows/([^/]+)', path)
        if not m or not ROW_ID.match(m.group(1)):
            return self.fail(400, 'bad row id')
        folder = DATA / 'rows' / m.group(1)
        if folder.is_dir():
            shutil.rmtree(folder)
        self.send_json({'ok': True})

    def do_POST(self):
        u = urlsplit(self.path)
        if u.path != '/api/output':
            return self.fail(404, 'unknown endpoint')
        q = parse_qs(u.query)
        folder_name = (q.get('dir') or [''])[0]
        name = BAD_NAME_CHARS.sub('_', os.path.basename((q.get('name') or [''])[0])).strip()
        if folder_name not in OUTPUT_DIRS:
            return self.fail(400, 'folder not allowed')
        if not name or name.startswith('.'):
            return self.fail(400, 'bad file name')
        folder = ROOT / folder_name
        folder.mkdir(exist_ok=True)
        final = unique_name(folder, name)
        write_atomic(folder / final, self.read_body())
        self.send_json({'ok': True, 'name': final})

    def list_rows(self):
        out = []
        rows_dir = DATA / 'rows'
        if rows_dir.is_dir():
            for d in rows_dir.iterdir():
                meta = d / 'meta.json'
                if d.is_dir() and meta.is_file():
                    try:
                        out.append(json.loads(meta.read_text('utf-8')))
                    except ValueError:
                        pass
        self.send_json(out)


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], ConnectionError):
            return                                      # browser closed the connection; harmless
        super().handle_error(request, client_address)


def main():
    try:
        httpd = Server((HOST, PORT), Handler)
    except OSError:
        print(f'Workflow Hub is already running at {URL} - opening the browser.')
        webbrowser.open(URL)
        return
    DATA.mkdir(exist_ok=True)
    print(f'Workflow Hub running at {URL}')
    print('Close this window to stop the server.')
    webbrowser.open(URL)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
