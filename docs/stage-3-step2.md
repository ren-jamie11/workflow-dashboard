# Stage 3: 下单 (Step 2) as a pop-up over the hub

Context: [README.md](README.md). This assumes Stages 1–2 work (hub, `api.js`, `rows.js`, `embed.js`).

## Goal
Clicking **下单** in a row's journey opens that product's **list of 下单计划** (Step 2 order forms) in a pop-up
over the hub; the rest of the page is dimmed. A new 下单计划 is built from chosen images × ticked 报价 lines, so the
sizes of one parent-ASIN group can be ordered in separate Excels. ← → move to the previous / next product. 生成 writes
the Excel straight into `下单计划 Order Forms/` and sets the status to 已下单. The planned `workspace.html` (sidebar +
journey bar) was dropped in scoping on 2026-09-29.

## Scope
**In:** the 下单 pop-up in `app/index.html`, `app/tools/step2.html`, `app/shared/crop.js`, the Settings →
**下单** tab, square images with a shared position, the Step 1 → Step 2 prefill, and `deliveryDate` feeding the
上架时间 picker.
**Out:** Step 3 (the 上架 pill still shows a toast), the Excel 预览 panel (removed).

## Decisions (scoping 2026-09-29)
| # | Decision |
|---|---|
| A1 | No `workspace.html`. The 下单 pill opens a pop-up on the hub; that is the only way into Step 2 |
| A2 | Stage 4 (上架) is expected to reuse the same pop-up (not final) |
| A3 | Compact header: thumb · `下单计划` 品名 · SKU · 父ASIN · 材质 · amber `报价未完成` tag · `产品 x / y · 按 ← → 切换` · ‹ › · × |
| A4 | ×, Esc and a click on the dimmed backdrop all close it |
| B1 | ← → follow the table's visible order (filters, search, collapsed groups skipped, drafts excluded), stopping at the ends. The order is taken when the pop-up opens, so a row that leaves a filter after 生成 keeps its place |
| B2 | Rows whose 报价 isn't done open without a prompt (tag only). The soft-lock `confirm` stays on the table's 下单 pill |
| B3 | ~~A product with no 下单计划 opens a fresh form with defaults + the prefill banner~~; opening a form without editing writes nothing | *(Changed 2026-09-29: see M2)*
| B4 | ← → switch only when the cursor is not in a field; Esc always closes |
| C1 | ~~货号 #1's image = the row's main image, with one shared square position (`meta.thumbCrop`)~~ | *(Changed 2026-09-29: see M9)*
| C2 | Every row image has its own square position (`variants[j].imgCrop`); the old resize handles are gone |
| C3 | The Excel 图片 column gets exactly the square shown, with a 12px margin inside the cell |
| C4 | A plain click on a Step 2 image opens the file picker (paste / drop still work) |
| C5 | 色号 images are 60×60 squares with the same drag / Ctrl + wheel (`variants[j].colorCrop`); the Excel 色号 column gets the square |
| D1 | Settings → 下单 = 运营 + 店铺+国家 (global) |
| D2 | The suggestion lists (工厂 / 材质 / 品名 / 颜色) stay per product (`memory` inside `step2.json`) *(2026-09-29: 工厂 is a global list in `settings.factories`, F1–F7 in README)* |
| D3 | After 生成 the pop-up stays open with the `已保存：…` toast |
| D4 | ~~导入已有 Excel: the file's first image becomes the main image~~ | *(Changed 2026-09-29: see M16)*

## 下单计划 simplification (scoping 2026-09-29)
Shared values are entered once in 订单信息; the rows keep only what differs per SKU. The Excel layout is unchanged.
| # | Decision |
|---|---|
| S1 | 订单信息 shows **品名** and **产品材质** = the hub row's `meta.name` / `meta.material`, editable in either place and synced (not stored in `step2.json`). An emptied 品名 reverts with `品名不能为空` |
| S2 | 订单名称 removed; file name = `日期_运营_品名_<表单名>_下单计划.xlsx` *(表单名 added 2026-09-29, M3)* |
| S3 | The order-level 下单数量 default is removed; a new row starts with the row above's 下单数量 |
| S4 | 订单信息 order: 工厂 · 品名 · 产品材质 · 是否含真植物 · 交货日期 · SKU 前缀 · 税率 · 运费. 交货日期 / SKU / 是否含真植物 apply to every row |
| S5 | ~~货号 card: header = grip · 产品货号 input · `N 个颜色 / 尺寸` · 复制整个货号 · ×; body = image left, table right~~ | *(Changed 2026-09-29: see M8)*
| S6 | Row columns: 图片 *(M8)* · 产品色号 · 产品尺寸 · 套数 · 单价 · 预估内盒尺寸 · 下单数量. 产品描述 is hidden and always automatic (`工厂 + 色号尺寸 + 品名`); hand edits are gone |
| S7 | Older drafts: `order.date` / `order.sku` kept when set, else the latest row date / first row SKU; `order.plant` ← 货号 #1's `plant`; per-货号 品名 / 材质 and locked descriptions are ignored |
| S8 | 从 Excel 导入 (M16): 交货日期 / SKU / 是否含真植物 = the first data row's; 品名 / 材质 stay the hub's; the file's 产品描述 is rebuilt |
| S9 | ~~报价 → 下单: a fresh form fills 货号 #1 from 报价 when it opens~~ (the picker does it, M7). **从报价更新** re-syncs (M12); nothing flows back to 报价 |

## Multiple 下单计划 per row (scoping 2026-09-29)
One parent-ASIN group can be ordered in several Excels (e.g. XK_012-023: 4x6 + 5x7 now, 8x10 later).
| # | Decision |
|---|---|
| M1 | ~~下单 opens the row's **list**: one line per form = name · 创建日期 · 已生成 / 未生成; click = open, 重命名 (inline), × 删除. Buttons `+ 新下单计划` and `从 Excel 导入`~~ *(Superseded 2026-09-29 by X1–X7)* |
| M2 | A row with no 下单计划 goes straight to the picker; 取消 there shows the (empty) list |
| M3 | ~~Name = the ticked 报价 sizes (`4x6 · 5x7`, at most 4, else `下单计划 N`), editable in the list or by clicking it in the header. Excel = `日期_运营_品名_<表单名>_下单计划.xlsx`~~ *(Superseded 2026-09-29 by X1–X7)* |
| M4 | Picker images = the row's images (main + ≤ 8 extras, tiles at their own square position) + a '+' tile; paste / drop also add. A new image joins the row's images (9-image limit, as in the viewer) and starts selected |
| M5 | The main image is preselected; selected tiles get a thick border and ✓. ≥ 1 image, else 确认 is disabled (`请至少选择一张图片`). Rows follow the row's image order |
| M6 | 报价 lines: ☑ · 尺寸 / 规格 · 工厂价 · 内盒尺寸 · 建议售价 (display only, `shared/pricing.js`); all ticked, header ☑ toggles all; empty lines are skipped. The 报价 column 商品名 / SKU is renamed **尺寸 / 规格** |
| M7 | 确认 builds **one 货号 card**: rows = selected images × ticked lines, image first, then 报价 order (img1: 4x6, 5x7; img2: 4x6, 5x7). Every row's **图片 = the row's 主图** (at `meta.thumbCrop`); each selected image is the **产品色号 image** of its rows. 尺寸 ← 尺寸/规格, 单价 ← 工厂价, 预估内盒尺寸 ← L x W x H cm. No ticked line → one blank row per image |
| M8 | The card has no grip / 复制整个货号 / × and there is no + 添加产品货号. Header = one 产品货号 (written on every row) + `N 行`. Each row has its own square **图片** (72px; click / paste / drop replace; drag / Ctrl + wheel reposition) instead of the card's big image; 色号 / 颜色名 is about as wide as 产品尺寸; fixed, evenly spaced columns |
| M9 | Forms are independent snapshots: each keeps its own copies of the images; editing a form never changes the table thumb or the viewer. A new form starts the main image at `meta.thumbCrop`, others at their own `crop` from `images.json` (centred if never moved) |
| M10 | Excel layout unchanged: every row gets its own 图片 and 色号 image; the thick group border is drawn where either image changes |
| M11 | After creation rows are added with + 添加一行 only (copies the row above's image, position and 下单数量); ⧉ copies a row |
| M12 | 从报价更新: rows whose 尺寸 equals a 报价 line get its 单价 / 内盒尺寸 (撤销 as before); lines are never added, unlabelled lines are skipped |
| M13 | ~~First 生成 of any form → status ≥ 已下单. `meta.deliveryDate` = the earliest 交货日期 among generated forms, recomputed on 生成 and when a generated form is deleted (no longer live while typing)~~ *(Superseded 2026-09-29 by X1–X7)* |
| M14 | ← → always switch product and show its list (its picker if it has none), also from inside a form. In a form the header shows `‹ 全部下单计划` + the form name. The 下单 pill is unchanged |
| M15 | ~~Every existing `step2.json` becomes the row's first form (flattened to one card: each row keeps its old 货号 image; the old 货号 #1 image starts at `thumbCrop`), 已生成 when the status is ≥ 已下单. `step2.json` stays on disk as a backup~~ *(Superseded 2026-09-29 by X1–X7)* |
| M16 | ~~从 Excel 导入 creates a new form named after the file (every 货号 of the file goes into the one card; the first 产品货号 is kept) and never touches the row's images; a failed import removes the new entry. 删除 asks `删除下单计划「…」？已生成的 Excel 文件不会删除`; status is not rolled back~~ *(Superseded 2026-09-29 by X1–X7)* |

## Files, not forms (scoping 2026-09-29)
The Excel file is the only record of a 下单计划: users edit, rename and delete it in Excel / Explorer, so a saved form could
only go stale. This supersedes **M1, M3, M13, M15, M16** and the storage notes below (marked).

| # | Decision |
|---|---|
| X1 | Files go to `下单计划/<product folder>/` (project root). The folder is named after the product the first time it is needed and saved as `meta.orderFolder`; renaming the product never renames it (a clash with another row adds " 2"). `下单计划 Order Forms/` is left as examples and no longer used |
| X2 | 下单 opens the row's **files**, Explorer style: an Excel icon + the wrapped file name, oldest first (creation time), `.xlsx` only (no `~$` lock files); date modified in the tooltip. Click = open in Excel (`/api/open`). The panel is view-only: no rename / delete. `打开文件夹` opens the product folder. The list re-reads the folder when the pop-up opens and when the window regains focus; a file that is gone when clicked → toast `文件已不存在` + re-read |
| X3 | One draft per row, `rows/<id>/orders/draft.json`, shown as the first tile `草稿 · 继续编辑`. `+ 新下单计划` / `从 Excel 导入` with a draft ask `已有草稿，将被替换？`. A successful 生成 deletes the draft and returns to the files with the new tile highlighted |
| X4 | No form name: Excel = `日期_运营_品名_<尺寸>_下单计划.xlsx`, `<尺寸>` = the form's sizes when 生成 is clicked (at most 4; omitted when none). A taken name gets ` (1)`; nothing is overwritten. 从 Excel 导入 always writes a new file (the source is never touched) |
| X5 | Each file has a small corner tick **已提交** (grey ○ / green ✓), stored by file name in `rows/<id>/order-files.json {files:{<name>:{submitted, deliveryDate}}}`; a new file starts unticked; a file renamed in Explorer loses its tick |
| X6 | Status follows the ticks (only when a tick changes): any ticked file → 已下单; none and the status is 已下单 → 未下单; 已上架 is never touched. 生成 no longer changes the status. `meta.deliveryDate` = the earliest 交货日期 (recorded at 生成) among ticked files, '' when none |
| X7 | Clean slate: every row's `orders.json`, `orders/` and `step2.json` were moved to `data/_backup-orders-2026-09-29/`. The one-time 工厂 fill (F12) was removed |
| X8 | *(2026-10-01, supersedes the image-only parts of M4 / M5 / M7 / M10)* The picker's tiles are **色号 slots**: an optional image + a `色号 / 颜色名` box under it; a slot with only a name is its own 产品色号. Every product image starts as a slot (主图 first); there is no ✓ selection: every filled slot counts and each slot (主图 too) has × to remove it (its image stays with the product). `+` adds an empty slot (≤ 9 slots in all); clicking an empty slot's tile uploads into it, paste / drop fill the hovered (dropped-on) empty slot, then other image-less slots, then new ones; uploaded images still join the row's images. **Double-click + hold** an image tile and drag it onto another slot (empty or not) to copy the image there (same position; the name is kept), as in collage-app.html; a single click on an image does nothing. 确认 skips blank slots (`请至少添加一个色号（图片或色号名）`); rows = filled slots × ticked lines, `colorCode` = the name. Names live in the draft only. Excel E = the name always (under the image when both: image top-anchored, text bottom-aligned, row +40px); group border also where the 色号名 changes |

## Hub: the pop-up (`index.html`, section `下单 pop-up`)
- `#s2Back` (the `.iv-back` backdrop) > `.s2`: the header, then one of three views: `#s2List` (the row's list),
  `#s2Pick` (the picker) or `<iframe id="s2Frame">` (the form). `order.view` = `list | pick | form`; the list and the
  picker are drawn by the hub, so they show without waiting for the tool.
- *(Superseded by X1–X7: the files are the record; the only form is `rows/<id>/orders/draft.json`.)*
  **Storage (before X):** `rows/<id>/orders.json {forms:[{id, name, createdAt, generatedAt, deliveryDate}]}` (only the hub writes it),
  each form `rows/<id>/orders/<fid>.json` (only the tool writes it after creation), the row's images `images.json {main, extra}`.
  `ensureOrders(r)` reads the list once per row (a promise per row, so fast ← → can't migrate twice); a row without
  `orders.json` gets one, and its old `step2.json` (if any) is copied to `orders/<fid>.json` with `hub.legacy` (M15) and its
  `memory` to `order-memory.json`. `loadRowImages()` moves an old main image from `step2.json` into `images.json` once.
- **Picker:** `openPicker(r)` loads `loadRowImages(r)` + `step1.json`; `pickAdd()` reuses the viewer's `addRowImages()`.
  确认 writes the form file (`{order:{}, products:[one card], images: {the 主图}, hub:{}}`; each row `img` = the 主图,
  `colorImage` = its selected image, main at `thumbCrop`, others at their `crop`), appends the entry, then opens the form.
- **Views:** leaving the form view (list, ← →, close) sends `unload`: the tool saves at once and forgets the form, so a
  later 删除 can't be re-created by a pending save. `从 Excel 导入` reads the file in the hub (a file dialog can't be opened
  from a postMessage) and sends the `File` in `load-row`.
- **One tool page, loaded once.** ExcelJS makes Step 2 about 1 MB, so the iframe loads `tools/step2.html` on the
  first open and is never reloaded: opening a form sends `load-row {id, form, name, file?}`
  (`hubEmbed.send(frame, type, data)`, added to `embed.js`). The tool posts `ready` once it listens. Closing
  sends `flush` and hides the pop-up; the page stays loaded with the last product.
- `stepClick(r, 'order')`: a draft → toast `请先填写品名并添加图片`; a locked 下单 → `confirm('前一步未完成，仍要打开？')`.
- `tableOrder()` is the visible order; `viewerOrder()` is now `tableOrder()` filtered to rows with an image.
- Keys: the tool forwards Esc (always) and ← → (outside fields, no modifier) as `key` messages, since focus is
  usually inside the iframe; the hub's own `keydown` does the same when focus is in the header.
- Messages from the tool:
  | Message | Hub action |
  |---|---|
  | `step2-generated {row, form, deliveryDate}` | status → at least 已下单; the entry gets `generatedAt` + `deliveryDate`; `meta.deliveryDate` = the earliest generated (M13) |
  | `import-failed {form}` | removes the entry (and file) created for 从 Excel 导入, back to the list |
  | `meta-changed {name, material, factory, category}` | 品名 / 产品材质 / 工厂 edited in 订单信息 → `meta.name` (if not empty) / `meta.material` (if empty or in `settings.materials`) / `meta.factory` / `meta.category` (only without SKU, if in `settings.categories`), `saveRow`, re-render the table and header |
  | `factory-used {name, taxRate?, add?, imported?}` | a new 工厂 (with `add`) is appended to `settings.factories`, saved, `broadcast('settings-changed')`; known ones change nothing; `imported` → toast `已新增工厂「X」` |
  | `key`, `ready`, `loaded` | close / switch; send the pending `load-row`; focus the tool |
  Hub → tool: `load-row`, `unload`, `flush`, `form-renamed {form, name}` (the file-name hint follows), `settings-changed`.
  `main-changed` / `delivery-changed` were removed with M9 / M13.
- **Settings → 下单:** `settings.step2.operator/store`; an empty field goes back to the default. Saved, then
  `broadcast('settings-changed')` (after the PUT, so the tool reads the new file).

## Tool: `app/tools/step2.html` (a copy of the original; every change marked `/* HUB */`)
- **ExcelJS** is moved unchanged into `app/tools/vendor/exceljs.min.js` (the original has it inline), so the copy
  is ~80 KB of readable code.
- **Unchanged:** the form and variant table, validation, row select / copy / paste / marquee / move, drag-sorting
  货号, `importWorkbook()`, the ExcelJS layout and styles.
- **Removed:** the `details.params` 设置 panel (运营 / 店铺 / SKU-prefix chips), the Excel 预览 block
  (`renderPreview` is a no-op), the `h1` (now `订单信息`), IndexedDB / localStorage, the save dialog.
- **Storage:** `save()` → `api.put('rows/<id>/orders/<form>.json', {order, products, images, hub})`, debounced 400ms;
  `images` keeps only the ids some row uses. `memory` goes to `rows/<id>/order-memory.json` when it changed.
  Only user actions call `save()`, and it does nothing while a row is loading, so the defaults shown on open are
  never written by themselves. `settings` is never saved per row. Flushed on `load-row`, `flush` and (best effort)
  `pagehide`.
- **Form switching:** `loadRow(id, form, name, file)` saves the previous form's pending edits, dims the page
  (`body.loading`), reads settings, `meta.json`, the form, `order-memory.json` and `step1.json`, rebuilds `S`, resets the
  selection / clipboard state, then renders. `loadSeq` drops a load that a newer one overtook. `embed.row` is reassigned.
  `flatten()` turns a legacy draft / an import into one card (each row: `imgOverride` or its card's image → `v.img`).
- **Order fields (S1–S4):** `S.order = {factory, date, sku, plant, taxRate, freight}`. 工厂 is a `combo.js` dropdown of
  `S.settings.factories` (`pickFactory` fills 税率 and sets `META.factory` / 材质 / 类目); `syncFactoryFromRow()` shows the row's
  工厂 on load, 清空全部 and import (README F10); `taxRate` defaults to `''` and an empty one leaves the Excel cell blank. 品名 / 材质 are read from `META`
  and posted with `meta-changed`; `autoDesc`, the file name and the Excel 产品材质 column use them. `buildRows()` writes
  T/U/W from `S.order` and Y from `META.material` on every row; `latestDate()` = `S.order.date`.
- **Defaults (`applyDefaults`)**: an empty order SKU = `<category>_`, an empty order date = today + 2 months,
  `plant` = 不含, and every 货号 has at least one variant. `foldOldDraft()` applies S7 before that.
- **Settings:** `S.settings.operator/store` from `settings.step2`; `skuPrefixes = categories.map(c => c+'_')`. An
  imported SKU prefix that isn't a category only shows in that form's dropdowns; import never changes the global
  运营 / 店铺.
- **报价 → 下单:** the rows come from the hub's picker (M7); `autoFillFromStep1` / `prefillDone` are gone.
- **从报价更新** (`syncFromStep1()`, shown while 报价 has lines): a labelled line updates every row whose 尺寸 equals the
  label (trimmed, case-insensitive); 单价 (clears `gRaw`) and 内盒尺寸 are overwritten when 报价 has a value. Nothing is
  added (M12). Toast `已从报价更新 N 行` with 撤销, or `已与报价一致`.
- **Square images:** `squareImg()` places the full image inside the square from its crop (`shared/crop.js` math).
  `pointerdown/move/up` on `.imgbox.has` pans (4px threshold; a click without movement opens the picker),
  Ctrl + wheel zooms and saves 400ms after the wheel stops. A new image gets `CROP.centerCrop`. The old `frame`
  field is ignored (older drafts show the centred square). `ensureNat()` measures images that miss `imgNat` /
  `colorNat`, in memory only.
- **Row images (M8, M9):** a slot (`rowSlot(v)` / `colorSlot(v)` = `{url, nat, crop, set, setNat}`) drives the square
  box, drag / Ctrl + wheel and `ensureNat()`. `S.images[id] = {url, w, h}` stores each picture once (`addImage()` reuses
  an equal URL). A new row copies the row above's `img` / `imgCrop`. 清空全部 keeps one row with the first row's image.
  Nothing is posted to the hub about images; the table thumb never follows a form.
- **Excel:** `squareForExport(url, crop)` renders the 900px square (`CROP.renderSquare`) for the 图片 (each row's
  `v.img` / `v.imgCrop`) and 色号 columns (配件 `accImg` stays a whole image); `groupStart` = first row or the image changes. `IMG_BOX =
  266 − 2×12 = 242`, `ROW_PAD = 24`, 色号 = 140px square. 生成 → `api.output('下单计划 Order Forms', fname, blob)`
  → `savedToast(name)` → `step2-generated {row, form, deliveryDate: 订单信息 交货日期}`. The button reads `生成 Excel`.

## `app/shared/crop.js`
`CROP.centerCrop, clampCrop, cropOf(c, W, H), panCrop, zoomCrop, wheelFactor, layoutFrame, renderSquare(img, c, size, quality)`,
moved out of `index.html` unchanged (`makeThumb(img, c)` = `renderSquare(img, c, 320, 0.8)`).

## Gotchas
- `step2.json` can be several MB (images). `keepalive` only takes bodies under 64 KB, so a pending save when the
  whole hub page is closed within 400ms of an edit may be lost; closing the pop-up or switching rows always saves.
- Step 2 listens on `document` for paste, drag and keys; the hub focuses the iframe on `loaded`.
- A file dropped next to an image box is swallowed so it can't replace the tool page.
- The pop-up covers the table, so the hub's own image actions (which also write `step2.json`) can't run while the
  tool has unsaved edits. The tool re-reads everything on each `load-row`.

## As built (2026-09-29)
**Status: done.** Checked in headless Edge against a scratch copy of `data/` (38 checks):
opening without editing writes nothing; Esc / × / backdrop close; ← → follow the table order, stop at the ends,
do nothing inside a field, and fast presses land on the right row with no data leaking between rows; the prefill
banner imports the 报价 lines once; typing autosaves; Ctrl + wheel and drag on 货号 #1 update `meta.thumbCrop` and
the table thumb, and `step2.json`'s crop matches; 生成 on an unconfirmed 未下单 row asks first, writes the file,
sets 已下单 and 交货日期; the Excel image is a 242px square whose pixels match the table thumb; a new 运营 in
Settings shows in the file-name hint; importing an existing order form replaces the main image (centred) and
leaves the global 运营 alone; 清空全部 keeps 货号 #1's image; deleting 货号 #1 with an image-less 货号 #2 is
blocked. The hub's row-thumb drag / zoom, image viewer and 报价 panel still work after the `crop.js` move.

### As built: multiple 下单计划 (2026-09-29)
Checked in headless Edge against scratch copies of `data/`: an old 12-row `step2.json` migrates to one form (one card,
12 rows each with its image), the main image moves to `images.json`, and opening the form writes nothing; the picker
preselects the main image, ticks every 报价 line, disables 确认 without an image, and 2 images × 2 sizes gives
img1 4x6, 5x7, img2 4x6, 5x7 with 报价 prices and two stored images; 建议售价 equals the 报价 panel's; Ctrl + wheel / drag
move one row only and never the table thumb; 生成 writes `…_4x6 · 5x7_下单计划.xlsx` (4 rows, one image each), marks
the entry 已生成 and keeps the earliest 交货日期; rename in the header updates the list and the file-name hint;
deleting a form updates the list and `deliveryDate`; → inside a form lands on the next product's list; a row without
forms opens the picker, '+' adds an image to the row (viewer shows it), 取消 shows the empty list; 从报价更新 updates
the matching row and adds nothing; 从 Excel 导入 creates a flattened form and leaves the main image and thumb alone;
a new product stores its main image in `images.json`, and deleting it in the viewer promotes the next one.
