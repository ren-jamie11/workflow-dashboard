/* Workflow Hub — SKU ranges: `XK_012-023` (a range) or `XK_406` (a single SKU) */
(function () {
'use strict';

/* lenient input: any case, `_` or `-` after the category, spaces allowed */
const INPUT_RE = /^\s*([A-Za-z]{2,3})\s*[-_]\s*(\d{3})(?:\s*-\s*(\d{3}))?\s*$/;
/* MSKU suffix, e.g. `US-AR-XK_016` → XK, 016 */
const MSKU_RE = /([A-Za-z]{2,3})_(\d{3})$/;

const pad3 = n => String(n).padStart(3, '0');

/* → {cat, from, to} or null when the text is not a valid SKU / range */
function parse(str) {
  const m = INPUT_RE.exec(String(str || ''));
  if (!m) return null;
  const from = +m[2], to = m[3] == null ? from : +m[3];
  if (to < from) return null;
  return { cat: m[1].toUpperCase(), from, to };
}

function format(p) {
  return p.cat + '_' + pad3(p.from) + (p.to !== p.from ? '-' + pad3(p.to) : '');
}

/* normalized text, or null when invalid */
function normalize(str) {
  const p = parse(str);
  return p ? format(p) : null;
}

function overlaps(a, b) {
  return !!(a && b && a.cat === b.cat && a.from <= b.to && b.from <= a.to);
}

/* does an Amazon MSKU belong to this row's SKU range? */
function mskuInRow(msku, row) {
  const r = parse(row && row.sku);
  const m = MSKU_RE.exec(String(msku || '').trim());
  if (!r || !m) return false;
  const n = +m[2];
  return m[1].toUpperCase() === r.cat && n >= r.from && n <= r.to;
}

window.SKU = { parse, format, normalize, overlaps, mskuInRow };
})();
