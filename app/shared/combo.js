/* Workflow Hub — type-to-filter dropdown on a text input (existing values only).
   combo.bind(root, getConfig)   delegated: every <input data-combo> inside root opens a list on focus / click.
   getConfig(input) → {
     value      the current value ('' = none)
     options    [{value, label?, note?}]   note = small grey text on the right (e.g. a count)
     empty      label of the '' option shown first ('—', '全部'); null = no empty option
     onPick(v)  called when the value changes
     onReject(text)  optional: typed text that matches nothing (the input reverts)
   }
   Keys: typing filters · ↑ ↓ move · Enter / Tab pick the highlighted option · Esc reverts.
   Leaving the box keeps an exact (or the only) match; anything else reverts. */
(function () {
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s == null ? '' : s).trim().toLowerCase();
const labelOf = o => o.label != null ? o.label : o.value;

let cur = null;             // {input, cfg, el, typed, hi, list}

function open(input, cfg) {
  if (!cfg || (cur && cur.input === input)) return;
  close();
  const el = document.createElement('div');
  el.className = 'cb-pop';
  el.setAttribute('role', 'listbox');
  el.addEventListener('mousedown', e => {           // keep the focus in the input
    e.preventDefault();
    const o = e.target.closest('.cb-opt');
    if (o && cur) pick(cur.list[+o.dataset.i]);
  });
  cur = { input, cfg, el, typed: false, hi: -1, list: [] };
  document.body.appendChild(el);
  draw();
  cur.hi = cur.list.findIndex(o => o.value === (cfg.value || ''));
  draw();
  place();
  input.setAttribute('aria-expanded', 'true');
  input.select();
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
}

function close() {
  if (!cur) return;
  cur.el.remove();
  cur.input.setAttribute('aria-expanded', 'false');
  window.removeEventListener('scroll', place, true);
  window.removeEventListener('resize', place);
  cur = null;
}

/* the options to show: all of them (with the empty one first) until the user types, then the matches */
function draw() {
  const c = cur, q = c.typed ? norm(c.input.value) : '';
  let list = c.cfg.options.slice();
  if (q) list = list.filter(o => norm(labelOf(o)).includes(q));
  else if (c.cfg.empty != null) list.unshift({ value: '', label: c.cfg.empty, none: true });
  c.list = list;
  c.hi = Math.min(c.hi, list.length - 1);
  c.el.innerHTML = list.length
    ? list.map((o, i) =>
        '<div class="cb-opt' + (i === c.hi ? ' hi' : '') + (o.value === (c.cfg.value || '') ? ' sel' : '') + (o.none ? ' none' : '') +
        '" role="option" data-i="' + i + '">' + esc(labelOf(o)) +
        (o.note != null ? '<span class="n">' + esc(o.note) + '</span>' : '') + '</div>').join('')
    : '<div class="cb-empty">无匹配项</div>';
  const h = c.el.querySelector('.cb-opt.hi');
  if (h) h.scrollIntoView({ block: 'nearest' });
}

function place() {
  if (!cur) return;
  const { input, el } = cur;
  if (!document.contains(input)) return close();    // the table was redrawn under it
  const r = input.getBoundingClientRect();
  el.style.minWidth = Math.max(120, r.width) + 'px';
  const h = el.offsetHeight;
  let top = r.bottom + 4;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
  el.style.top = top + 'px';
  el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + 'px';
}

/* set the value, close, and leave the box (so a table redraw doesn't reopen it) */
function pick(o, keepFocus) {
  const c = cur;
  if (!c || !o) return;
  close();
  set(c, o.value);
  if (!keepFocus) c.input.blur();
}
function set(c, v) {
  c.input.value = v ? labelOf(c.cfg.options.find(o => o.value === v) || { value: v }) : '';
  if (v !== (c.cfg.value || '')) c.cfg.onPick(v);
}
function revert(c) { c.input.value = c.cfg.value ? labelOf(c.cfg.options.find(o => o.value === c.cfg.value) || { value: c.cfg.value }) : ''; }

/* leaving the box: an exact match, the only match, or '' (when allowed) is kept; anything else reverts */
function commit() {
  const c = cur;
  if (!c) return;
  close();
  if (!c.typed) return revert(c);
  const q = norm(c.input.value);
  if (!q) return c.cfg.empty != null ? set(c, '') : revert(c);
  const exact = c.cfg.options.find(o => norm(labelOf(o)) === q);
  const m = exact || (c.list.length === 1 ? c.list[0] : null);
  if (m) return set(c, m.value);
  const text = c.input.value.trim();
  revert(c);
  if (c.cfg.onReject) c.cfg.onReject(text);
}

function bind(root, getConfig) {
  const isCombo = t => t && t.matches && t.matches('input[data-combo]') && !t.disabled;
  root.addEventListener('focusin', e => { if (isCombo(e.target)) open(e.target, getConfig(e.target)); });
  root.addEventListener('mousedown', e => {           // a click on a focused box whose list was closed
    if (isCombo(e.target) && document.activeElement === e.target && !cur) open(e.target, getConfig(e.target));
  });
  root.addEventListener('focusout', e => { if (cur && e.target === cur.input) commit(); });
  root.addEventListener('input', e => {
    if (!isCombo(e.target)) return;
    if (!cur || cur.input !== e.target) open(e.target, getConfig(e.target));
    if (!cur) return;
    cur.typed = true;
    cur.hi = 0;
    draw(); place();
  });
  root.addEventListener('keydown', e => {
    const t = e.target;
    if (!isCombo(t)) return;
    const c = cur && cur.input === t ? cur : null;
    switch (e.key) {
      case 'ArrowDown': case 'ArrowUp':
        e.preventDefault(); e.stopPropagation();
        if (!c) return open(t, getConfig(t));
        if (c.list.length) {
          c.hi = c.hi < 0 ? 0 : (c.hi + (e.key === 'ArrowDown' ? 1 : -1) + c.list.length) % c.list.length;
          draw();
        }
        break;
      case 'Enter':
        e.preventDefault(); e.stopPropagation();
        if (c && c.hi >= 0 && c.list[c.hi]) pick(c.list[c.hi]);
        else { commit(); t.blur(); }
        break;
      case 'Tab':                                      // pick what was typed, then let the focus move on
        if (c && c.typed && c.hi >= 0 && c.list[c.hi]) pick(c.list[c.hi], true);
        break;
      case 'Escape':
        e.preventDefault(); e.stopPropagation();
        if (c) { close(); revert(c); }
        t.blur();
        break;
    }
  });
}

window.combo = { bind, close, isOpen: () => !!cur };
})();
