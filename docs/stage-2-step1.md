# Stage 2: 报价 (Step 1) inside the expanded row

Context: [README.md](README.md). This assumes Stage 1 (hub, server, `api.js`, `rows.js`) works.

## Goal
Clicking **报价** in a row's journey (or expanding the row) shows that product's price table inline.
It is the same table and the same calculation as `Step 1 - Price Quotes.html`. Confirming the price
unlocks 下单.

## Scope
**In:** `app/tools/step1.html`, `app/shared/embed.js`, the row expand panel in `index.html`, the
Settings → **报价** tab, and journey step 报价.
**Out:** the Step 2 and Step 3 steps (still placeholders; 下单 now shows as unlocked).

## tools/step1.html: a copy of the original with these changes (mark each `/* HUB */`)
- **Keep unchanged:** `computeRow()`, `calcAll()`, the table markup and CSS, add/clear rows,
  Enter-to-calculate, the yellow warning rows.
- **Remove:** the `details.params` panel, the ⚙ `gearDd` menu (defaults, export, import), and the
  `topbar` (table name, 打开, 新建). Also remove the Save split-menu and `pricer.*` localStorage use.
- **Parameters:** `getParams()` reads `settings.step1` (loaded through `api.settings()`) instead of
  DOM inputs. When `embed.js` receives `settings-changed`, reload the settings and run `calcAll()`.
- **Storage:** load `rows/<id>/step1.json` on start, falling back to 6 empty rows as today. Autosave
  on `input` (debounced 400ms) with `readTable().rows`. Params are **not** saved per row (C2).
- **Buttons in `.actions`:** 计算售价 · + 添加行 · 清空 · **导入** (loads a `售价…json`: accept
  `{rows:[…]}`, or the old export shape `{name:{rows}}` using its first table) · **保存**.
  保存 → `api.output('售价计算 Price Calcs', '<品名>_<SKU>_售价.json', {name, sku, savedAt, params, rows})`,
  then the button reads **✓** (the file name is in its tooltip) and the tool posts `step1-saved`.
  The `黄色行 = …` legend under the table is removed; the `⚠ 未覆盖` badge's tooltip explains yellow rows.
- **Page chrome:** hide the `h1` card header (the hub row already shows the product). Set the body
  background to `transparent` and the `.container` padding to a small value.
- Once the rows are loaded, and on every resize after that (ResizeObserver on `body`), post the height
  through `embed.js`. `autoHeight()` starts only after `writeRows()` + `calcAll()`, so the hub gets one
  real first height instead of the 6-empty-rows height followed by a second one.

## shared/embed.js
```
embed.post(type, data)     // child → parent: {src:'hub', type, row, data}
embed.on(type, fn)         // child listens for messages from the parent
embed.autoHeight()         // posts {type:'height', h} whenever the size changes
hubEmbed.broadcast(type)   // parent → every tool iframe (e.g. 'settings-changed')
```
Check `event.origin === location.origin` on every message.

## Hub changes (index.html)
- Clicking the 报价 pill toggles an expand panel below the row. **Only one row is
  expanded at a time**; opening another row collapses the current one.
- A click on the row's blank space toggles it too (changed 2026-09-29, README G7). `hitRow(target, x, y)` rejects
  points within `HIT_PAD` (1px) of any field, button, `.sub-asin` or `.draft-tag` in that cell, so near misses
  don't count. A `pointerdown` capture listener records `rowPress` only when no date picker / combo is open and no
  text box has focus; the `click` toggles only if `hitRow` gives the same row, it moved < 5px and `e.detail <= 1`.
- The panel holds `<iframe src="tools/step1.html?row=<id>">` with its height taken from the `height`
  messages. There is no inner scrollbar; the table's own horizontal scroll still works.
- **保存** in the tool completes 报价 (this replaced the ✓ 确认价格 button on 2026-09-29): after the file is written the tool posts `step1-saved`, and the hub sets `meta.step1Confirmed = true`
  (no undo) and redraws the journey column (报价 done, 下单 becomes next). The button then shows **✓** until
  the next change (typing, + 添加行, row ×, 清空, 导入, or a 设置 → 报价 change); the ✓ isn't remembered
  after a collapse or reload. 保存 on an empty table only shows 表格为空.
- **Settings → 报价 tab:** 头程运费 (￥/kg), 汇率, 毛利率 %, 入库配置费 $, 旺季 toggle. The defaults
  are the original's values (6 / 6.7 / 50 / 0 / 非旺季). On save, PUT `settings.json` and then
  `broadcast('settings-changed')`.

## Gotchas
- A deleted or empty row gives `step1.json` = `null`; handle it the same as a new table.
- The 品名/SKU in the output filename can contain `/\:*?"<>|`, which must be replaced with `_`
  (the same regex Step 2 uses).
- Leave `beforeunload`'s dirty prompt out of the copy, since autosave makes it unnecessary.

## As built (2026-09-28): notes for later stages
- **Status: done.** Every check below passes in headless Chrome. Prices were compared line by line
  against the original `Step 1 - Price Quotes.html`, with the default parameters and with 旺季 + 汇率 7.2.
- **The expanded panel never moves in the DOM.** Moving an iframe reloads it. `#xpPanel` is
  absolutely positioned inside `.table-card`, over a `tr.xp-spacer` row that `renderBody()` inserts.
  `placePanel()` runs after every render, on resize and on `height` messages. If the expanded row is
  filtered out, the panel is hidden, not destroyed.
- Collapsing sets `xpFrame.src = 'about:blank'` once the close animation ends. The tool's `pagehide`
  handler flushes its pending save with a keepalive `fetch`.
- **Smooth expand / collapse (2026-09-29).** The spacer holds a `.xp-gap` div. The gap and `#xpPanel`
  (`overflow:hidden`) share one `height` transition (220ms), so the rows below move with the panel's
  edge. `gapT` holds each spacer's target height: the open row, plus a `closingId` row while its gap
  closes. `renderBody()` redraws each gap at its current animated height and `xpSync()` then sends it on
  to its target, so a redraw mid-animation doesn't jump. `panelId` is the row the panel sits over, which
  can be the closing row during a plain collapse. Opening uses `xpHeights[id]` (the last measured height)
  when known. Otherwise the row opens in **one move**: the spacer stays at 0 (`xpPending`) until the
  tool's first `height` message, then `openPending(h)` grows it 0 → h, or to 360px if no message arrives
  within 700ms. The iframe fades in on that message. `pinRow()` runs a
  rAF loop during the animation that scrolls the page to keep the clicked row still (for example while a
  row above it closes) and keeps the panel on its spacer. `.table-card` has `overflow-anchor:none` so the
  browser's scroll anchoring doesn't interfere.
- **The page never scrolls by itself (2026-09-29),** not even when the clicked row is cut off. The only
  exception is `?expand=`. A closing spacer would shorten the page and, near the bottom, make the browser clamp
  the scroll. `holdScroll()` prevents this by setting `body.style.minHeight` to the current viewport bottom
  on collapse and on a row switch. A `scroll` listener lowers that value as the user scrolls up and clears
  it once the content fills the page again; `resize` clears it too. Known limit: switching to a row below
  while the open row sits near the very top of the page can't scroll above 0, so the new row may move up.
- **Click the grey margins to collapse (2026-09-29).** A click whose press and release both land on
  `html`, `body` or `.container` (the grey space outside the cards) collapses the open panel. A click
  doesn't count if it only closes an open date picker or 材质/类目 dropdown. Clicks on cards, rows, chips,
  modals and inside the iframe never collapse it.
- `embed.js` messages carry `{src:'workflow-hub', dir:'up'|'down', type, row, data}`. The height is
  measured from `body.getBoundingClientRect()`, not `scrollHeight`, so the panel can shrink as well
  as grow.
- The hub already supports `index.html?expand=<id>`, which Stage 3's 报价 step needs.
- `openSettings(tab)` opens a given tab. Tab bodies use `data-body="<tab>"` and tab buttons use
  `data-tab`. Enable the 下单 and 上架 tabs by removing `disabled` and adding a body.
- The 保存 file is `{name, sku, savedAt, params, rows}`. 导入 accepts that file or the old 导出全部
  backup (it asks which table to use when there are several).

## Done when
1. Expanding a row shows the Step 1 table, which looks the same as the original minus the removed
   parts. Entering the same numbers gives the **same prices as the original file**.
2. Edit a few lines, collapse, reload: the values are still there (`data/rows/<id>/step1.json`).
3. Changing 汇率 in Settings → 报价 immediately recalculates the expanded table.
4. 保存 writes `售价计算 Price Calcs/<品名>_<SKU>_售价.json`. 导入 of that file into another row
   restores the lines.
5. 保存 → the button shows ✓, 报价 shows done and 下单 is highlighted as next. Editing a cell turns the
   button back to 保存; 报价 stays done.
6. Expanding a second row collapses the first.
