# Stage 3: 下单 (Step 2) as a pop-up over the hub

Context: [README.md](README.md). This assumes Stages 1–2 work (hub, `api.js`, `rows.js`, `embed.js`).

## Goal
Clicking **下单** in a row's journey opens that product's 下单计划 (the Step 2 order form) in a pop-up
over the hub; the rest of the page is dimmed. ← → move to the previous / next product. 生成 writes the Excel
straight into `下单计划 Order Forms/` and sets the status to 已下单. The planned `workspace.html` (sidebar +
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
| B3 | A product with no 下单计划 opens a fresh form with defaults + the prefill banner; nothing is written until the first real edit |
| B4 | ← → switch only when the cursor is not in a field; Esc always closes |
| C1 | 货号 #1's image = the row's main image, with **one shared square position** (`meta.thumbCrop`) for the table thumb, the image viewer, Step 2 and the Excel |
| C2 | Every other 货号 has its own square position (`products[i].crop`); the old resize handles are gone |
| C3 | The Excel 图片 column gets exactly the square shown, with a 12px margin inside the cell |
| C4 | A plain click on a Step 2 image opens the file picker (paste / drop still work). 货号 #1 can't be emptied |
| C5 | 色号 images are 60×60 squares with the same drag / Ctrl + wheel (`variants[j].colorCrop`); the Excel 色号 column gets the square |
| D1 | Settings → 下单 = 运营 + 店铺+国家 (global) |
| D2 | The suggestion lists (工厂 / 材质 / 品名 / 颜色) stay per product (`memory` inside `step2.json`) |
| D3 | After 生成 the pop-up stays open with the `已保存：…` toast |
| D4 | 导入已有 Excel: the file's first image becomes the main image (centred); without one, the current image stays |

## Hub: the pop-up (`index.html`, section `下单 pop-up`)
- `#s2Back` (the `.iv-back` backdrop) > `.s2`: the header, then `<iframe id="s2Frame">` filling the rest.
- **One tool page, loaded once.** ExcelJS makes Step 2 about 1 MB, so the iframe loads `tools/step2.html` on the
  first open and is never reloaded: `openOrder(r)` / `orderStep(d)` send `load-row {id}`
  (`hubEmbed.send(frame, type, data)`, added to `embed.js`). The tool posts `ready` once it listens. Closing
  sends `flush` and hides the pop-up; the page stays loaded with the last product.
- `stepClick(r, 'order')`: a draft → toast `请先填写品名并添加图片`; a locked 下单 → `confirm('前一步未完成，仍要打开？')`.
- `tableOrder()` is the visible order; `viewerOrder()` is now `tableOrder()` filtered to rows with an image.
- Keys: the tool forwards Esc (always) and ← → (outside fields, no modifier) as `key` messages, since focus is
  usually inside the iframe; the hub's own `keydown` does the same when focus is in the header.
- Messages from the tool:
  | Message | Hub action |
  |---|---|
  | `main-changed {image?:{url,w,h}, crop}` | 货号 #1's image or position changed: `thumbCrop = crop`, rebuild `thumb` (`CROP.renderSquare`), update `imgCache[0]` when the image changed, `saveRow` |
  | `delivery-changed {deliveryDate}` | the latest variant 交货日期 → `meta.deliveryDate` (the 上架时间 picker opens on it + `liveOffsetDays`) |
  | `step2-generated {deliveryDate}` | status → at least 已下单, `meta.deliveryDate` |
  | `key`, `ready`, `loaded` | close / switch; send the pending `load-row`; focus the tool |
- **Settings → 下单:** `settings.step2.operator/store`; an empty field goes back to the default. Saved, then
  `broadcast('settings-changed')` (after the PUT, so the tool reads the new file).

## Tool: `app/tools/step2.html` (a copy of the original; every change marked `/* HUB */`)
- **ExcelJS** is moved unchanged into `app/tools/vendor/exceljs.min.js` (the original has it inline), so the copy
  is ~80 KB of readable code.
- **Unchanged:** the form and variant table, validation, row select / copy / paste / marquee / move, drag-sorting
  货号, `importWorkbook()`, the ExcelJS layout and styles.
- **Removed:** the `details.params` 设置 panel (运营 / 店铺 / SKU-prefix chips), the Excel 预览 block
  (`renderPreview` is a no-op), the `h1` (now `订单信息`), IndexedDB / localStorage, the save dialog.
- **Storage:** `save()` → `api.put('rows/<id>/step2.json', {order, products, memory, hub})`, debounced 400ms.
  Only user actions call `save()`, and it does nothing while a row is loading, so the defaults shown on open are
  never written by themselves. `settings` is never saved per row. Flushed on `load-row`, `flush` and (best effort)
  `pagehide`.
- **Row switching:** `loadRow(id)` saves the previous row's pending edits, dims the page (`body.loading`), reads
  settings, `meta.json`, `step2.json` and `step1.json`, rebuilds `S`, resets the selection / clipboard / drag state,
  then renders. `loadSeq` drops a load that a newer one overtook. `embed.row` is reassigned.
- **Defaults (`applyDefaults`)**: a fresh draft (no `order` saved yet) gets 订单名称 and 货号 #1 产品名称 = 品名.
  Always: an empty order SKU = `<category>_`, an empty order date = today + 2 months, an empty 货号 材质 = the row's
  材质 (M4), and every 货号 has at least one variant.
- **Settings:** `S.settings.operator/store` from `settings.step2`; `skuPrefixes = categories.map(c => c+'_')`. An
  imported SKU prefix that isn't a category only shows in that form's dropdowns; import never changes the global
  运营 / 店铺.
- **Prefill banner:** shown while `!S.hub.prefillDone`, no variant is filled in, and `step1.json` has lines:
  `从报价表导入 N 个尺寸？ [导入] [忽略]`. Import fills 货号 #1's variants one per line (`size ← sku`,
  `price ← price`, `boxSize ← l x w x h cm` when all three are set), empty fields only. Both buttons set `prefillDone`.
- **Square images:** `squareImg()` places the full image inside the square from its crop (`shared/crop.js` math).
  `pointerdown/move/up` on `.imgbox.has` pans (4px threshold; a click without movement opens the picker),
  Ctrl + wheel zooms and saves 400ms after the wheel stops. A new image gets `CROP.centerCrop`. The old `frame`
  field is ignored (older drafts show the centred square). `ensureNat()` measures images that miss `imgNat` /
  `colorNat`, in memory only.
- **货号 #1:** its crop is set from `meta.thumbCrop` on every load; `tellHub()` (run by `save()`) posts
  `main-changed` whenever its image or crop differs from what was last sent (replace, paste, drop, drag, zoom,
  import, reorder). No × on 货号 #1; 清空全部 keeps its image and crop; deleting or reordering 货号 so the new
  first one has no image is blocked with `货号 #1 的图片即产品主图，不能为空`.
- **Excel:** `squareForExport(url, crop)` renders the 900px square (`CROP.renderSquare`) for the 图片 and 色号
  columns (`imgOverride` from an import uses the centred square; 配件 `accImg` stays a whole image). `IMG_BOX =
  266 − 2×12 = 242`, `ROW_PAD = 24`, 色号 = 140px square. 生成 → `api.output('下单计划 Order Forms', fname, blob)`
  → `savedToast(name)` → `step2-generated {deliveryDate: latest variant date}`. The button reads `生成 Excel`.

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
