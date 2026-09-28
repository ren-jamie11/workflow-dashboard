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
  then the toast `已保存：<file>`.
- **Page chrome:** hide the `h1` card header (the hub row already shows the product). Set the body
  background to `transparent` and the `.container` padding to a small value.
- On load and on every resize (ResizeObserver on `body`), post the height through `embed.js`.

## shared/embed.js
```
embed.post(type, data)     // child → parent: {src:'hub', type, row, data}
embed.on(type, fn)         // child listens for messages from the parent
embed.autoHeight()         // posts {type:'height', h} whenever the size changes
hubEmbed.broadcast(type)   // parent → every tool iframe (e.g. 'settings-changed')
```
Check `event.origin === location.origin` on every message.

## Hub changes (index.html)
- Clicking the row or the 报价 pill toggles an expand panel below the row. **Only one row is
  expanded at a time**; opening another row collapses the current one.
- The panel holds `<iframe src="tools/step1.html?row=<id>">` with its height taken from the `height`
  messages. There is no inner scrollbar; the table's own horizontal scroll still works.
- The panel footer has a **✓ 确认价格** toggle button. It sets `meta.step1Confirmed = true/false`
  and redraws the journey column (报价 done, 下单 becomes next/unlocked).
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
- Collapsing sets `xpFrame.src = 'about:blank'`. The tool's `pagehide` handler flushes its pending
  save with a keepalive `fetch`.
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
5. ✓ 确认价格 → 报价 shows done and 下单 is highlighted as next. Un-confirming reverts it.
6. Expanding a second row collapses the first.
