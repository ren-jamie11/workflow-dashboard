/* Workflow Hub — row model, status/journey rules, filter + sort (shared by hub and sidebar) */
(function () {
'use strict';

const STATUSES = ['未下单', '已下单', '已上架'];
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
  if (out.status === '生产中') out.status = '已下单';     // status removed 2026-09-29
  if (!STATUSES.includes(out.status)) out.status = STATUSES[0];
  return out;
}

/* each step: done | next | open | locked — see docs/README.md "Status and journey rules" */
function journey(r) {
  const rank = statusRank(r.status);
  const done = { quote: !!r.step1Confirmed, order: rank >= 1, live: r.status === '已上架' };
  const locked = { quote: false, order: !done.quote, live: !done.order };
  const next = STEPS.find(s => !done[s.key]);
  return STEPS.map(s => ({
    key: s.key, label: s.label,
    state: done[s.key] ? 'done' : (next && next.key === s.key) ? 'next' : locked[s.key] ? 'locked' : 'open'
  }));
}

/* ui = {q, status, cat} ('' = 所有); ids in `always` bypass the filters (e.g. a just-added row) */
function filterRows(rows, ui, always) {
  const q = (ui.q || '').trim().toLowerCase();
  return rows.filter(r => {
    if (always && always.has(r.id)) return true;
    if (ui.status && r.status !== ui.status) return false;
    if (ui.cat && r.category !== ui.cat) return false;
    if (q && ![r.name, r.sku, r.parentAsin].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}

/* newest first, so a row never moves after it is created or edited */
function sortRows(list) {
  return list.slice().sort((a, b) =>
    (b.createdAt || 0) - (a.createdAt || 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/* → [{cat, label, rows}]: 未分类 first, then the settings order, then unknown categories A–Z */
function groupRows(list, categories) {
  const by = new Map();
  list.forEach(r => {
    const c = r.category || '';
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(r);
  });
  const extra = [...by.keys()].filter(c => c && !categories.includes(c)).sort();
  return [''].concat(categories, extra)
    .filter(c => by.has(c))
    .map(c => ({ cat: c, label: c || '未分类', rows: sortRows(by.get(c)) }));
}

window.ROWS = { STATUSES, STEPS, statusRank, newRow, normalize, journey, filterRows, sortRows, groupRows };
})();
