# Stage 3: Workspace page and 下单 (Step 2)

Context: [README.md](README.md). This assumes Stages 1–2 work (hub, `api.js`, `rows.js`, `embed.js`).

## Goal
Clicking **下单** opens the workspace for that row, with the Step 2 order form scoped to it.
生成 writes the Excel straight into `下单计划 Order Forms/` and sets the status to 已下单.

## Scope
**In:** `app/workspace.html`, `app/tools/step2.html`, the Settings → **下单** tab, image sync, the
Step 1 → Step 2 prefill, and `deliveryDate` feeding the 上架时间 picker.
**Out:** Step 3 (the 上架 tab shows a placeholder).

## workspace.html
- **Layout:** a left sidebar (~260px, its own scroll) and a main area.
  - **Sidebar:** `← 总览` link, search, status and category chips (reusing `rows.js`), then rows
    grouped by category: thumb, 品名, SKU and a status dot. The selected row is highlighted.
  - **Main area:** a journey bar at the top (`报价 — 下单 — 上架` for the selected row, with 品名/SKU
    title), then an `<iframe>` that fills the remaining viewport height and scrolls internally.
- **URL:** `workspace.html?row=<id>&step=2|3`. Selecting a sidebar row keeps the current step. Use
  `history.replaceState` rather than a full reload of the workspace.
- **Journey bar:** 报价 → `index.html?expand=<id>` (the hub supports this parameter to expand and
  scroll to the row). 下单/上架 swap the iframe source. A locked step uses the soft-lock `confirm`.
- In the hub, the 下单/上架 pills now link to `workspace.html?row=<id>&step=2|3`.

## tools/step2.html: a copy of the original with these changes (mark each `/* HUB */`)
- **Keep unchanged:** the rendering, validation, row selection/copy/paste, image crop frame,
  `importWorkbook()`, `buildRows()` and all ExcelJS generation code.
- **Storage:** replace `openDB/dbPut/dbGet` with `api.get/put('rows/<id>/step2.json')`. Drop the
  localStorage fallback and the `orderPlanSettings` key. Save `S` **without** `settings`.
- **Settings:**
  - Remove the `details.params` 设置 panel.
  - `S.settings.operator/store` come from `settings.step2`.
  - `S.settings.skuPrefixes = settings.categories.map(c => c + '_')`.
  - If the row has a category, default `S.order.sku` to `<category>_`.
  - A new SKU prefix found by the Excel import is **not** added to settings; it only shows in that
    variant's dropdown (the existing `skuOptions` already handles values not in the list).
- **Defaults on a new draft:** `S.order.orderName = 品名`, and the first product's `productName = 品名`.
- **Prefill banner (C4):** when the draft has no filled variants and `step1.json` has rows, show
  `从报价表导入 N 个尺寸？ [导入] [忽略]`. Import fills the first product's variants, one per Step 1
  line: `size ← sku`, `price ← price`, `boxSize ← l+'x'+w+'x'+h+'cm'` (empty fields only). Remember
  that the banner was dismissed (`S.hub.prefillDone = true`).
- **Image sync (A4):** after any change to `products[0].image`, post `image-changed`. The parent makes
  a ~160px thumb and saves `meta.thumb`.
- **生成:** replace the `showSaveFilePicker` and `<a download>` block with
  `api.output('下单计划 Order Forms', fname, blob)`, then `savedToast(returnedName)` and
  `embed.post('step2-generated', {deliveryDate})`, where `deliveryDate` is the latest variant
  `date`. The parent sets `status = max(status, 已下单)` and `meta.deliveryDate`.
- **deliveryDate while editing:** also send `delivery-changed` on each save, so the 上架时间 estimate
  follows edits even before 生成.
- 清空全部 keeps its behaviour (it clears only this row's draft).

## Settings → 下单 tab
运营 (default `Jamie`) and 店铺 + 国家 (default `Arborus-US（店铺+国家）`). SKU 前缀 isn't edited
here; show the note `SKU 前缀 = 类目（在「通用」中管理）`.

## Gotchas
- `step2.json` can be several MB (images). Save it at most every 400ms (as today). Neither the hub
  nor the sidebar reads it (they use `meta.thumb`).
- Step 2 uses global `document` listeners for paste, drag and keys. Inside the iframe this is fine,
  but the iframe must have focus. Clicking into it gives it focus.
- Canvas export needs images from the same origin: the stored data URLs are fine.
- Pasting an image in the hub while the workspace is open in another tab means the last write wins.
  That's acceptable for a single user.

## Done when
1. From the hub, 下单 on a confirmed row opens the workspace with that row selected and Step 2 loaded.
   On an unconfirmed row it first asks for confirmation.
2. The image pasted in the hub appears as the 货号 image. Replacing it in Step 2 updates the sidebar
   and hub thumbnails.
3. The prefill banner imports the Step 1 lines as variants. Reloading doesn't show it again.
4. The SKU 前缀 dropdown lists the categories and preselects the row's category.
5. 生成 writes `下单计划 Order Forms/<date>_Jamie_<name>_下单计划.xlsx` with no dialog. The file
   opens in Excel exactly like one made by the original tool (images, styles, notes).
6. After 生成 the row's status is 已下单 (it doesn't go back if it was 已上架). The 上架时间
   picker opens on 交货日期 + 45 days.
7. 导入已有 Excel with one of the existing order forms loads correctly into a row.
8. Switching rows in the sidebar loads each row's own draft, and data doesn't leak between rows.
