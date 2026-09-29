# Stage 1: Hub, server and main table

Context: [README.md](README.md) (architecture, data model, rules).

## Goal
A working product tracker with no tools embedded yet. You can add, edit, filter and delete
product-group rows, and everything persists to `data/`.

## Scope
**In:** `启动.bat`, `app/server.py`, `app/shared/{theme.css, api.js, sku.js, rows.js, datepicker.js}`,
`app/index.html`, and the Settings modal with the **通用** tab.
**Out:** embedded tools, the workspace page, and the 报价/下单/上架 Settings tabs (stages 2–4).

## Files
| File | Contents |
|---|---|
| `启动.bat` | `cd /d %~dp0` → `python app\server.py`; on error, `pause` so the message stays visible |
| `app/server.py` | `http.server.ThreadingHTTPServer` on 127.0.0.1:8765; serves `app/` as `/`; API from README; `webbrowser.open` on start; if the port is busy, only open the browser and exit |
| `shared/theme.css` | `:root` tokens + `.card .btn .btn-primary .btn-ghost .chip .form-control .del-btn .toast`, copied from the tools |
| `shared/api.js` | `api.rows()`, `api.get(path)`, `api.put(path,obj)`, `api.delRow(id)`, `api.output(dir,name,blob)`, `api.settings()` (with defaults merged in) |
| `shared/sku.js` | `parseSku(str) → {cat,from,to}|null`, `formatSku()`, `overlaps(a,b)`, `mskuInRow(msku,row)` |
| `shared/rows.js` | `STATUSES`, `statusRank`, `journey(row) → [{key,label,state}]`, `filterRows(rows,ui)`, `sortRows(rows)`, `groupRows(rows,categories)` |
| `shared/datepicker.js` | `openDatePicker(anchorEl, {value, openMonth, onPick, onClear})` |
| `app/index.html` | the hub page |

## Main table (index.html)
Columns: **图片 · 品名 · 类目 · 材质 · SKU (父ASIN sub-line) · 状态 · 上架时间 · 流程 · ×**
- **图片:** a 48×64 box. Click, paste (Ctrl+V while hovering) or drop an image. Store a ~160px `thumb`
  in meta. Also keep the full image (longest side ≤ 1400px, JPEG 0.85, the same as Step 2's
  `loadImageData`) in `step2.json` → `products[0].image`, creating a minimal `step2.json`
  (`{products:[{id,code:'',productName:<品名>,material:'',plant:'不含',image,imgNat,frame,variants:[]}]}`)
  if it doesn't exist.
- **品名:** required, inline text input.
- **类目:** a type-to-filter dropdown (`shared/combo.js`) over `settings.categories`. It is set automatically
  from the SKU prefix and locked (disabled) once a SKU is set.
- **材质:** (added 2026-09-29) an optional type-to-filter dropdown over `settings.materials`, `—` = none. A value
  no longer in settings still shows for the rows that use it.
- **Type-to-filter dropdowns (`combo.bind(root, getConfig)`):** focus or click opens the list; typing filters it
  (substring, case-insensitive); ↑ ↓ move; Enter / Tab pick the highlighted option; Esc reverts. Leaving
  the box keeps an exact match or the only match, and empty text means `—`. Anything else reverts, with the
  toast `没有材质「…」，请从列表中选择…`. The table's own `change` / Enter / Esc handlers skip
  `input[data-combo]`. `comboConfig(el)` in index.html builds the options for each box.
- **SKU:** inline input, parsed on blur/Enter.
  - Lenient regex: `^\s*([A-Za-z]{2,3})\s*[-_]\s*(\d{3})(?:\s*-\s*(\d{3}))?\s*$`.
  - Store it normalized (`XK_012-023` / `XK_406`); `from ≤ to`, otherwise reject.
  - If the prefix isn't a known category: `confirm('类目 "AB" 不存在，添加为新类目？')`. OK adds it to
    settings; Cancel reverts the input.
  - If the range overlaps another row: show a warning toast but still save.
  - An invalid format gets a red border, and the value isn't saved.
  - 父ASIN (read-only) shows underneath in grey when present.
- **状态:** a select with the 4 values.
- **上架时间:** click to open the datepicker. It opens on the stored value's month, or on
  `deliveryDate + liveOffsetDays` (in this stage `deliveryDate` is always empty, so the current month).
  It has a 清除 option.
- **流程:** `报价 — 下单 — 上架` pills connected by a line (done = filled, next = outlined in primary,
  locked = muted). In this stage clicking a step shows the toast "Stage 2/3/4 实现".
- **×:** `confirm('确定永久删除「品名」及其全部数据？')` → `api.delRow`. Output files in
  Price Calcs / Order Forms are **not** deleted.

**Toolbar:** `+ 新建产品` (adds an empty row with 状态 未下单 and focuses 品名) · status chips
(未下单 / 已下单 / 已上架) · category chips · 材质 dropdown (type to filter; 全部 + each 材质 with its count;
highlighted while set) · search (品名/SKU/父ASIN) · ⚙ at the top right.
Each chip group allows at most one active chip; clicking the active chip again clears that filter.
`ui = {q, status, cat, mat}`, `''` = no filter.

**Grouping and order:** rows are always grouped by category, each group with a header row
`XK · 12 个`, and groups ordered as in the settings list. Within a group rows are newest first
(`createdAt` descending), so a row never moves after it is created or edited. Column headers are not
sortable (changed 2026-09-29).

**Saving:** each edit PUTs that row's `meta.json` (debounced ~300ms). There is no Save button.

## Settings modal (⚙): 通用 tab
- **类目:** chips with × and an add input (uppercase, 2–3 letters). Removing a category used by any row
  is blocked with the toast `仍有 N 个产品使用该类目`.
- **材质:** (added 2026-09-29) chips with × and an add input (any text up to 10 characters, no duplicates).
  Removing a 材质 used by any row is blocked with the toast `仍有 N 个产品使用材质「…」，无法删除`.
- **上架预估天数** (`liveOffsetDays`, default 45).
- Tabs 报价/下单/上架 appear greyed out ("后续阶段").

## Gotchas
- `api.put` must handle a server that isn't running: show a toast `未连接到本地服务，请用 启动.bat 打开`.
- Keep the table responsive at 100 rows. Build it with a single `innerHTML` string, as the tools do.
  Use event delegation, and don't re-render the table while an input has focus.
- Chinese file and folder names: the server must decode `%`-escaped UTF-8 paths.

## As built (2026-09-28): notes for later stages
- **Status: done.** All 10 checks below pass in headless Chrome, against a server pointed at a
  scratch data folder.
- `index.html` redraws the table from one `render()` call. It keeps focus by re-focusing
  `[data-id][data-f]` after the redraw. Commits happen on `change`, with `renderSoon()` running after
  Tab has moved focus.
- New rows go into the set `justAdded` and stay visible whatever the filters are, until the page is
  reloaded. A row without a category appears in a **未分类** group at the top.
- The 类目 select is disabled once a SKU is set, because the SKU prefix decides the category.
- `saveRow()` waits 300ms per row. On `pagehide` it flushes through `api.saveRowBeacon` (keepalive).
- Journey pills (`data-act="step"`) call `stepClick(row, step)`, which is only a toast for now.
  Stages 2–4 replace it.
- **Row images (added 2026-09-28, decisions I1–I7 in README):** all in `index.html`, sections
  `images` and `image viewer`. `makeThumb(img, crop)` / `centerCrop(w,h)` build the 320 square thumb;
  `setRowImage` replaces the main image, `deleteMainImage` promotes the next one, `loadRowImages` returns
  `[main, ...extras]` and is cached per session (`imgCache`). Section `reposition`: `clampCrop`,
  `panCrop`, `zoomCrop`, `layoutFrame` (full image inside a square frame), `openFrame` (decoded main
  image, preloaded on thumb hover), `commitCrop` (rebuilds the thumb). `render()` is deferred while a
  row-thumb drag is in progress (rebuilding the table would detach the dragged element), and a pending
  Ctrl+wheel zoom is saved when a drag starts. `clampCrop` replaces non-finite values; on load, rows
  with a broken `thumbCrop` are repaired. Drafts live in the `drafts` Set;
  `saveRow()` on a draft calls `commitDraft()` instead of writing, and the draft's full image waits in
  `draftImg` until then.
- **For Stage 3:** the sidebar should reuse `meta.thumb`. When Step 2 posts `image-changed`, the parent
  must rebuild a centred thumb, reset `thumbCrop`, and drop that row from `imgCache` (move
  `makeThumb`/`centerCrop` into a shared file then).
- Testing without touching real data: import `app/server.py` and override `ROOT`, `DATA`, `PORT`,
  and `webbrowser.open` before calling `main()`.

## Done when
1. Double-clicking `启动.bat` opens the hub, and `data/settings.json` is created with categories `XK, MUG`.
2. Add 3 rows (2×XK, 1×MUG). Typing `xk-12-23` is rejected; `xk-012-023` becomes `XK_012-023`.
3. Typing SKU `VS_001-004` asks to add category VS. OK creates it and the row moves to a new VS group.
4. Overlapping `XK_020-030` shows the warning toast and is still saved.
5. Paste an image into a row. Restart the server and reload: the image and all fields are still there.
6. Filter to 状态=未下单 plus 类目=XK, and search "相框": only the matching rows show, still grouped.
7. A new product appears at the top of its group; setting its SKU moves it to the top of that category, and
   editing 上架时间 doesn't move it.
8. The 上架时间 picker opens, picks a date and clears it.
9. Delete a row and confirm: it disappears and `data/rows/<id>/` is gone.
10. Removing a category that is in use is blocked.
