"""Workflow Hub — local server (Python standard library only).

Serves app/ as static files and a small JSON API over data/. Binds to 127.0.0.1 only.
API (see docs/README.md):
  GET    /api/rows                   all data/rows/*/meta.json as one array
  GET    /api/data/<path>.json       file contents, or null if missing
  PUT    /api/data/<path>.json       write JSON (temp file + rename)
  DELETE /api/data/<path>.json       remove one JSON file (e.g. a 下单计划 form)
  DELETE /api/rows/<id>              remove data/rows/<id>/
  POST   /api/output?dir=&name=[&sub=]  write raw body into an allowed output folder (sub: one product folder in it)
  GET    /api/orderfiles?folder=&row=   a product's 下单计划/<folder>/*.xlsx, and whether the row has a draft form
  POST   /api/open?folder=[&name=]      open a 下单计划 file (or the product folder) in its Windows app
"""
import json
import os
import re
import shutil
import sys
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

HOST, PORT = '127.0.0.1', 8765
URL = f'http://{HOST}:{PORT}/'

ROOT = Path(__file__).resolve().parent.parent          # project folder
APP = ROOT / 'app'
DATA = ROOT / 'data'
ORDERS = '下单计划'                                       # one folder per product; the Excel files are the record
OUTPUT_DIRS = {'售价计算 Price Calcs', ORDERS}
ROW_ID = re.compile(r'^[a-z0-9]{4,40}$')
BAD_NAME_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')


def safe_segment(name):
    """One file or folder name, or None: no separators / reserved characters, not '.', '..' or hidden."""
    name = (name or '').strip()
    if not name or name.startswith('.') or BAD_NAME_CHARS.search(name):
        return None
    return name


def order_path(folder, name=None):
    """下单计划/<folder>[/<name>]; None if either part is not a plain name."""
    folder = safe_segment(folder)
    if not folder or (name is not None and not safe_segment(name)):
        return None
    p = ROOT / ORDERS / folder
    return p / name.strip() if name is not None else p


def data_path(rel):
    """Resolve a path under data/; None if it escapes data/ or is not a .json file."""
    rel = unquote(rel).replace('\\', '/')
    if not rel or '..' in rel.split('/') or not rel.endswith('.json'):
        return None
    p = (DATA / rel).resolve()
    base = DATA.resolve()
    return p if base in p.parents else None


def retry(fn, tries=5, wait=0.02):
    """Windows locks a file while another request reads or replaces it; wait briefly and try again."""
    for i in range(tries):
        try:
            return fn()
        except PermissionError:
            if i == tries - 1:
                raise
            time.sleep(wait)


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_bytes(data)
    retry(lambda: os.replace(tmp, path))


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
        if path == '/api/orderfiles':
            return self.list_order_files()
        if path.startswith('/api/data/'):
            p = data_path(path[len('/api/data/'):])
            if not p:
                return self.fail(400, 'bad path')
            try:
                raw = retry(p.read_bytes) if p.is_file() else b'null'
            except PermissionError:
                return self.fail(503, 'busy')
            return self.send_json(None, raw=raw)
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
        if path.startswith('/api/data/'):
            p = data_path(path[len('/api/data/'):])
            if not p:
                return self.fail(400, 'bad path')
            if p.is_file():
                p.unlink()
            return self.send_json({'ok': True})
        m = re.fullmatch(r'/api/rows/([^/]+)', path)
        if not m or not ROW_ID.match(m.group(1)):
            return self.fail(400, 'bad row id')
        folder = DATA / 'rows' / m.group(1)
        if folder.is_dir():
            shutil.rmtree(folder)
        self.send_json({'ok': True})

    def do_POST(self):
        u = urlsplit(self.path)
        if u.path == '/api/open':
            return self.open_order_file(parse_qs(u.query))
        if u.path != '/api/output':
            return self.fail(404, 'unknown endpoint')
        q = parse_qs(u.query)
        folder_name = (q.get('dir') or [''])[0]
        name = BAD_NAME_CHARS.sub('_', os.path.basename((q.get('name') or [''])[0])).strip()
        sub = (q.get('sub') or [None])[0]
        if folder_name not in OUTPUT_DIRS:
            return self.fail(400, 'folder not allowed')
        if not name or name.startswith('.'):
            return self.fail(400, 'bad file name')
        if sub is not None and not safe_segment(sub):
            return self.fail(400, 'bad folder name')
        folder = ROOT / folder_name / sub.strip() if sub is not None else ROOT / folder_name
        folder.mkdir(parents=True, exist_ok=True)
        final = unique_name(folder, name)
        write_atomic(folder / final, self.read_body())
        self.send_json({'ok': True, 'name': final})

    def list_order_files(self):
        q = parse_qs(urlsplit(self.path).query)
        folder = order_path((q.get('folder') or [''])[0])
        row = (q.get('row') or [''])[0]
        if not folder or (row and not ROW_ID.match(row)):
            return self.fail(400, 'bad folder name')
        files = []
        if folder.is_dir():
            for p in folder.iterdir():
                if p.is_file() and p.suffix.lower() == '.xlsx' and not p.name.startswith('~$'):
                    st = p.stat()
                    files.append({'name': p.name, 'created': st.st_ctime * 1000, 'modified': st.st_mtime * 1000})
        files.sort(key=lambda f: (f['created'], f['name']))   # oldest first; st_ctime = creation time on Windows
        draft = bool(row) and (DATA / 'rows' / row / 'orders' / 'draft.json').is_file()
        self.send_json({'files': files, 'draft': draft})

    def open_order_file(self, q):
        name = (q.get('name') or [None])[0]
        p = order_path((q.get('folder') or [''])[0], name)
        if not p:
            return self.fail(400, 'bad file name')
        if name is None:
            p.mkdir(parents=True, exist_ok=True)            # 打开文件夹 before the first file
        elif not p.is_file():
            return self.fail(404, 'missing')
        try:
            os.startfile(str(p))                            # Windows: Excel for .xlsx, Explorer for a folder
        except OSError as e:
            return self.fail(500, str(e))
        self.send_json({'ok': True})

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
