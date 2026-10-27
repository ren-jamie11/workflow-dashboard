/* Workflow Hub — client for the local server API (app/server.py) */
(function () {
'use strict';

const DEFAULT_SETTINGS = {
  categories: ['XK', 'MUG'],
  materials: ['树脂', '金属', '实木', '陶瓷', '塑料'],
  /* 工厂 list (设置 → 工厂), in a fixed order; taxRate '' = unknown */
  factories: [{ name: '博罗', taxRate: '专票13%' }, { name: '华智', taxRate: '专票1%' }, { name: '合兴', taxRate: '专票13%' },
              { name: '莱伯特', taxRate: '专票13%' }, { name: '佰利源', taxRate: '' }],
  /* 报价 assumptions, as in Pricer Updated.html: 汇率 · 头程 ￥/kg · FBA 燃油附加费 (% of the FBA fee) · 佣金 / 广告 / 仓储退货 / 目标毛利率 (%).
     旺季 is per product (step1.json's peak), not here */
  step1: { fx: 6.7, shipRmbKg: 6, fuel: 3.5, comm: 15, ads: 12, wh: 5, target: 18 },
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
  del(path) { return api.req('DELETE', '/api/data/' + encodePath(path)); },
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
  /* write a file into 售价计算 Price Calcs / 下单计划 (sub: the product's folder in it); resolves to the final file name.
     replace: a file in that folder to write over (if it is gone, `name` is used as usual) */
  async output(dir, name, blob, sub, replace) {
    const q = '?dir=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(name) +
      (sub ? '&sub=' + encodeURIComponent(sub) : '') + (replace ? '&replace=' + encodeURIComponent(replace) : '');
    const r = await api.req('POST', '/api/output' + q, blob);
    return r.name;
  },
  /* a product's 下单计划/<folder>/*.xlsx (oldest first) → {files:[{name, created, modified}], draft, draftFile}
     draftFile = the Excel the row's form last made ('' while it is only a draft) */
  orderFiles(folder, rowId) {
    return api.req('GET', '/api/orderfiles?folder=' + encodeURIComponent(folder) + '&row=' + encodeURIComponent(rowId));
  },
  /* open one file in Excel, or the folder in Explorer (no name); resolves to false if the file is gone */
  async openOrderFile(folder, name) {
    const q = '?folder=' + encodeURIComponent(folder) + (name ? '&name=' + encodeURIComponent(name) : '');
    let res;
    try { res = await fetch('/api/open' + q, { method: 'POST' }); }
    catch (e) { return api.req('POST', '/api/open' + q); }      // offline: the usual error
    if (res.status === 404) return false;
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const err = new Error((data && data.error) || ('HTTP ' + res.status));
      api.onError(err);
      throw err;
    }
    return true;
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
      step1: step1Of(d.step1, s.step1),
      step2: Object.assign(d.step2, s.step2),
      step3: Object.assign(d.step3, s.step3),
      categories: Array.isArray(s.categories) ? s.categories : d.categories,
      materials: Array.isArray(s.materials) ? s.materials : d.materials,
      factories: Array.isArray(s.factories) ? s.factories : d.factories
    });
  },
  saveSettings(s) { return api.put('settings.json', s); },
  /* 工厂 names match ignoring case and spaces (Huazhi = huazhi ) */
  factoryKey(name) { return String(name == null ? '' : name).replace(/\s+/g, '').toLowerCase(); },

  DEFAULT_SETTINGS
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }
/* saved step1 over the defaults, current keys only. Settings from before Updated Pricing (2026-10-14) keep their
   汇率 (exchangeRate) and 头程 (shippingPrice); 毛利率 / 入库配置费 / 旺季 are dropped (target starts at the default) */
function step1Of(def, saved) {
  const s = Object.assign({}, saved);
  if (s.fx == null && s.exchangeRate != null) s.fx = s.exchangeRate;
  if (s.shipRmbKg == null && s.shippingPrice != null) s.shipRmbKg = s.shippingPrice;
  const out = {};
  for (const k in def) out[k] = typeof s[k] === 'number' && isFinite(s[k]) ? s[k] : def[k];
  return out;
}
function encodePath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }

window.api = api;
})();
