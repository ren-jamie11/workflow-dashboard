/* Workflow Hub — client for the local server API (app/server.py) */
(function () {
'use strict';

const DEFAULT_SETTINGS = {
  categories: ['XK', 'MUG'],
  materials: ['树脂', '金属', '实木', '陶瓷', '塑料'],
  liveOffsetDays: 45,
  step1: { shippingPrice: 6, exchangeRate: 6.7, profitMargin: 50, storageFee: 0, isPeak: false },
  step2: { operator: 'Jamie', store: 'Arborus-US（店铺+国家）' },
  step3: { targetDays: 90, invTargetDays: 180 }
};

const api = {
  /* called with every failed request; pages replace it to show a toast */
  onError: err => console.error(err),

  async req(method, url, body, opts) {
    let res;
    try {
      res = await fetch(url, Object.assign({ method, body }, opts));
    } catch (e) {
      const err = new Error('未连接到本地服务，请用 启动.bat 打开');
      err.offline = true;
      api.onError(err);
      throw err;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error((data && data.error) || ('HTTP ' + res.status));
      api.onError(err);
      throw err;
    }
    return data;
  },

  rows() { return api.req('GET', '/api/rows'); },
  get(path) { return api.req('GET', '/api/data/' + encodePath(path)); },
  put(path, obj) {
    return api.req('PUT', '/api/data/' + encodePath(path), JSON.stringify(obj),
      { headers: { 'Content-Type': 'application/json' } });
  },
  saveRow(row) { return api.put('rows/' + row.id + '/meta.json', row); },
  /* for pagehide: survives the page unloading (body must stay under 64 KB) */
  saveRowBeacon(row) {
    try {
      fetch('/api/data/rows/' + row.id + '/meta.json', {
        method: 'PUT', body: JSON.stringify(row), keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {}
  },
  delRow(id) { return api.req('DELETE', '/api/rows/' + encodeURIComponent(id)); },
  /* write a file into 售价计算 Price Calcs / 下单计划 Order Forms; resolves to the final file name */
  async output(dir, name, blob) {
    const q = '?dir=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(name);
    const r = await api.req('POST', '/api/output' + q, blob);
    return r.name;
  },

  /* settings.json merged over the defaults; created on first run */
  async settings() {
    const s = await api.get('settings.json');
    if (!s) {
      const fresh = clone(DEFAULT_SETTINGS);
      await api.put('settings.json', fresh);
      return fresh;
    }
    const d = clone(DEFAULT_SETTINGS);
    return Object.assign(d, s, {
      step1: Object.assign(d.step1, s.step1),
      step2: Object.assign(d.step2, s.step2),
      step3: Object.assign(d.step3, s.step3),
      categories: Array.isArray(s.categories) ? s.categories : d.categories,
      materials: Array.isArray(s.materials) ? s.materials : d.materials
    });
  },
  saveSettings(s) { return api.put('settings.json', s); },

  DEFAULT_SETTINGS
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function encodePath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }

window.api = api;
})();
