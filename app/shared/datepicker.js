/* Workflow Hub — small popover calendar that can open on any month.
   openDatePicker(anchorEl, {value, openMonth, hint, onPick(iso), onClear()})
     value      'YYYY-MM-DD' currently set (opens on its month, shown selected)
     openMonth  'YYYY-MM' or 'YYYY-MM-DD' to open on when there is no value
     hint       'YYYY-MM-DD' marked with a dashed ring (e.g. the estimated date)
   Clicking the same anchor again closes it. */
(function () {
'use strict';

const WD = ['一', '二', '三', '四', '五', '六', '日'];
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
const todayISO = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };

let cur = null;

function close() {
  if (!cur) return;
  cur.el.remove();
  document.removeEventListener('mousedown', cur.onOutside, true);
  document.removeEventListener('keydown', cur.onKey, true);
  window.removeEventListener('scroll', cur.place, true);
  window.removeEventListener('resize', cur.place);
  cur = null;
}

function open(anchor, o) {
  if (cur && cur.anchor === anchor) { close(); return; }
  close();
  o = o || {};
  const start = /^\d{4}-\d{2}/.test(o.value || '') ? o.value
              : /^\d{4}-\d{2}/.test(o.openMonth || '') ? o.openMonth : todayISO();
  let y = +start.slice(0, 4), m = +start.slice(5, 7) - 1;

  const el = document.createElement('div');
  el.className = 'dp';

  function draw() {
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;          // Monday first
    const days = new Date(y, m + 1, 0).getDate();
    const today = todayISO();
    let g = WD.map(w => '<div class="dp-wd">' + w + '</div>').join('');
    for (let i = 0; i < lead; i++) g += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const v = iso(y, m, d);
      const cls = 'dp-day' + (v === o.value ? ' sel' : '') + (v === today ? ' today' : '') + (v === o.hint ? ' hint' : '');
      g += '<button type="button" class="' + cls + '" data-dp="day" data-v="' + v + '">' + d + '</button>';
    }
    el.innerHTML =
      '<div class="dp-head">' +
        '<span><button type="button" class="dp-nav" data-dp="py" title="上一年">«</button>' +
        '<button type="button" class="dp-nav" data-dp="pm" title="上个月">‹</button></span>' +
        '<span class="dp-title">' + y + '年' + (m + 1) + '月</span>' +
        '<span><button type="button" class="dp-nav" data-dp="nm" title="下个月">›</button>' +
        '<button type="button" class="dp-nav" data-dp="ny" title="下一年">»</button></span>' +
      '</div>' +
      '<div class="dp-grid">' + g + '</div>' +
      '<div class="dp-foot">' +
        (o.hint ? '<span class="dp-legend"><i></i>预计 ' + o.hint + '</span>' : '<span></span>') +
        '<span><button type="button" class="menu-link" data-dp="today">今天</button>' +
        (o.value ? '&nbsp;&nbsp;<button type="button" class="menu-link" data-dp="clear">清除</button>' : '') +
        '</span>' +
      '</div>';
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-dp]');
    if (!b) return;
    const a = b.dataset.dp;
    if (a === 'day' || a === 'today') {
      const v = a === 'day' ? b.dataset.v : todayISO();
      close();
      if (o.onPick) o.onPick(v);
      return;
    }
    if (a === 'clear') { close(); if (o.onClear) o.onClear(); return; }
    if (a === 'py') y--;
    if (a === 'ny') y++;
    if (a === 'pm') { m--; if (m < 0) { m = 11; y--; } }
    if (a === 'nm') { m++; if (m > 11) { m = 0; y++; } }
    draw();
  });

  function place() {
    const r = anchor.getBoundingClientRect();
    const h = el.offsetHeight, w = el.offsetWidth;
    let top = r.bottom + 4;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
    el.style.top = top + 'px';
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  }

  draw();
  document.body.appendChild(el);
  place();

  cur = {
    el, anchor, place,
    onOutside: e => { if (!el.contains(e.target) && !anchor.contains(e.target)) close(); },
    onKey: e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  };
  document.addEventListener('mousedown', cur.onOutside, true);
  document.addEventListener('keydown', cur.onKey, true);
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
}

window.openDatePicker = open;
window.closeDatePicker = close;
window.isDatePickerOpen = () => !!cur;
})();
