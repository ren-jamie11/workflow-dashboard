/* Workflow Hub — row model, status/journey rules, filter + sort (shared by hub and sidebar) */
(function () {
'use strict';

const STATUSES = ['未下单', '已下单', '生产中', '已上架'];
const STEPS = [
  { key: 'quote', label: '报价' },
  { key: 'order', label: '下单' },
  { key: 'live',  label: '上架' }
];

function statusRank(s) { const i = STATUSES.indexOf(s); return i < 0 ? 0 : i; }

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function newRow(category) {
  return {
    id: newId(), name: '', category: category || '', sku: '', parentAsin: '',
    status: STATUSES[0], liveDate: '', step1Confirmed: false, deliveryDate: '',
    thumb: null, createdAt: Date.now()
  };
}

/* fill in any field an older meta.json is missing */
function normalize(r) {
  const d = newRow();
  const out = Object.assign(d, r);
  if (!STATUSES.includes(out.status)) out.status = STATUSES[0];
  return out;
}

/* each step: done | next | open | locked — see docs/README.md "Status and journey rules" */
function journey(r) {
  const rank = statusRank(r.status);
  const done = { quote: !!r.step1Confirmed, order: rank >= 1, live: rank === 3 };
  const locked = { quote: false, order: !done.quote, live: !done.order };
  const next = STEPS.find(s => !done[s.key]);
  return STEPS.map(s => ({
    key: s.key, label: s.label,
    state: done[s.key] ? 'done' : (next && next.key === s.key) ? 'next' : locked[s.key] ? 'locked' : 'open'
  }));
}

/* ui = {q, statuses:[], cats:[]}; ids in `always` bypass the filters (e.g. a just-added row) */
function filterRows(rows, ui, always) {
  const q = (ui.q || '').trim().toLowerCase();
  return rows.filter(r => {
    if (always && always.has(r.id)) return true;
    if (ui.statuses.length && !ui.statuses.includes(r.status)) return false;
    if (ui.cats.length && !ui.cats.includes(r.category)) return false;
    if (q && ![r.name, r.sku, r.parentAsin].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}

const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

/* sort = {key: 'liveDate'|'name'|'sku'|'status', dir: 1|-1}; empty values always sort last */
function sortRows(list, sort) {
  const key = sort.key, dir = sort.dir;
  return list.slice().sort((a, b) => {
    let c = 0;
    if (key === 'status') {
      c = (statusRank(a.status) - statusRank(b.status)) * dir;
    } else {
      const va = a[key] || '', vb = b[key] || '';
      if (!va !== !vb) return va ? -1 : 1;
      if (va) c = collator.compare(va, vb) * dir;
    }
    return c || (a.createdAt || 0) - (b.createdAt || 0);
  });
}

/* → [{cat, label, rows}]: 未分类 first, then the settings order, then unknown categories A–Z */
function groupRows(list, categories, sort) {
  const by = new Map();
  list.forEach(r => {
    const c = r.category || '';
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(r);
  });
  const extra = [...by.keys()].filter(c => c && !categories.includes(c)).sort();
  return [''].concat(categories, extra)
    .filter(c => by.has(c))
    .map(c => ({ cat: c, label: c || '未分类', rows: sortRows(by.get(c), sort) }));
}

window.ROWS = { STATUSES, STEPS, statusRank, newRow, normalize, journey, filterRows, sortRows, groupRows };
})();
