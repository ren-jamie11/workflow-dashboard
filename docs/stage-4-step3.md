# Stage 4: 上架 (Step 3 inventory) per row

Context: [README.md](README.md). This assumes Stages 1–3 work (`embed.js`, `sku.js`, the 下单 pop-up).

> **Changed in Stage 3 (2026-09-29):** there is no `workspace.html`. The working assumption (A2, not final) is that
> 上架 opens in a pop-up over the hub like 下单 — see [stage-3-step2.md](stage-3-step2.md): one tool page loaded
> once and switched with `load-row`, ← → between products, × / Esc / backdrop close. Read "workspace.html" below as
> "the hub (`index.html`)", and "refresh the sidebar" as "re-render the table". Confirm this when scoping Stage 4.

## Goal
The **上架** step shows the Step 3 inventory dashboard filtered to that row's SKUs, with a seasonality
curve for that row. Uploading a sales export updates every row: status becomes 已上架 where sales
exist, and 父ASIN is filled in.

## Scope
**In:** `app/tools/step3.html`, the `sales-updated` handling in workspace.html, the Settings → **上架**
tab (target days and legacy backup import).
**Out:** Step 3 numbers in the main table (E2), linking Step 2 quantities to Units Ordered (D3).

## tools/step3.html: a copy of the original with these changes (mark each `/* HUB */`)
- **Keep unchanged:** `ingest()`, all compute functions (runway, reorder, seasonality maths), the
  chart, the table, filters, inline editing and the view toggle.
- **Storage split:**
  - `sales.json` (global) holds `version, sales, skus, inv, manual, lastSeen, snapshotDate,
    includeInbound, includeIncoming, runwayView`.
  - `rows/<id>/step3.json` holds `{seasonality:[12]}` (default flat).
  - `load()` becomes async: fetch both and merge into `store`. `save()` splits `store` back into the
    two files (debounced as today).
  - Keep `upgrade()` so that older shapes still load.
- **Row filter:** in `buildRows()`, keep only MSKUs where `mskuInRow(msku, row)` is true: take the
  `([A-Z]{2,3})_(\d{3})$` suffix of the MSKU (`US-AR-XK_016` → XK, 16) and check it's inside the
  range. A row without a SKU shows the message `请先在总览中填写 SKU`.
  - `allDates()` and `snapshotDate` stay global, so every row uses the same "as of" date.
  - The `gone` banner only considers the row's own SKUs.
- **Target days:** `TARGET_DAYS` / `INV_TARGET_DAYS` come from `settings.step3` and update on
  `settings-changed`.
- **Header:** remove Export backup, Import backup and Clear all data (global actions don't belong in a
  per-row view). Keep the upload drop zone. Change its hint to `上传后更新所有产品的销量`.
- **Upload:** after a successful `ingest()`, post `sales-updated` with
  `{mskus: {<msku>: {parent, hasSales}}}` built from `store.skus` and `store.sales`.
- **Seasonality presets** (flat / holiday / spring) are kept. They now edit this row's curve.

## workspace.html: `sales-updated`
For every row with a SKU range:
- If any MSKU in the range `hasSales` and `statusRank(status) < 已上架` → set status to 已上架.
- If `parentAsin` is empty → set it to the first non-empty `parent` among its MSKUs.
- Save each changed `meta.json`, refresh the sidebar, and show the toast `已更新 N 个产品的状态`.
- `liveDate` isn't touched (B4: always typed by hand).

## Settings → 上架 tab
- FBA 补货目标天数 (default 90) and 库存补货目标天数 (default 180).
- **导入旧版备份:** a file input for the JSON from the old tool's "Export backup". Validate
  `version 1–3` and run it through `upgrade()` logic. `confirm('将覆盖现有销量数据，继续？')` →
  write `sales.json` (ignore the backup's seasonality curve). Then run the same status/父ASIN update
  as `sales-updated` over all rows.

## Gotchas
- Step 3's sticky `#filterCard` and `.table-wrap` max-height use the viewport. Inside the iframe the
  viewport is the iframe, so give the iframe the full remaining height.
- `sales.json` grows with SKUs × days. The hub never loads it; only step3.html and the Settings import
  touch it.
- The MSKU regex must ignore store/country prefixes (`US-AR-`); only the suffix counts.
- Keep `applyColWidths()` working: it measures `.table-wrap.clientWidth`, which is fine inside the iframe.

## Done when
1. Settings → 上架 → 导入旧版备份 with an old Step 3 export: the history loads, and the rows whose
   SKUs have sales become 已上架 with 父ASIN filled (e.g. `XK_012-023` → `B0GH7RGM1M`).
2. Opening 上架 for row `XK_012-023` shows only `US-AR-XK_012…023`. Another row shows only its own SKUs.
3. Uploading a new `销量统计-…xlsx` from any row updates the numbers for all rows, and statuses move
   forward only.
4. Units Ordered / Inbound edits persist per MSKU after a reload.
5. Dragging a seasonality bar in one row doesn't change another row's curve.
6. Changing FBA 目标天数 to 60 in Settings changes the FBA restock numbers.
7. Runway and reorder numbers for a row equal those in the original Step 3 file for the same SKUs
   and settings (flat curve, same range).
