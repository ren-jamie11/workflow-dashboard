# Workflow Hub: Overview

One local app to track every product group (parent-ASIN group) through the three workflow steps
**报价 → 下单 → 上架**. It embeds the existing tools unchanged in look and behaviour.

Read this file first, then only the stage doc you are working on.

| Stage | Doc | Usable result after the stage |
|---|---|---|
| 1 | [stage-1-hub.md](stage-1-hub.md) | Product tracker: add/filter/delete rows; data saved to `data/` |
| 2 | [stage-2-step1.md](stage-2-step1.md) | Expand a row to price it (Step 1) and confirm the price |
| 3 | [stage-3-step2.md](stage-3-step2.md) | Workspace page; Step 2 order form per row; Excel written to `下单计划 Order Forms/` |
| 4 | [stage-4-step3.md](stage-4-step3.md) | Step 3 inventory per row; uploads set 已上架 automatically and fill 父ASIN |

## Launch
Double-click `启动.bat`. It runs `python app/server.py`, which serves `http://127.0.0.1:8765` and
opens the browser. Close the console window to stop the server. Use Chrome or Edge.

## Architecture (vanilla HTML/CSS/JS, no build step, Python stdlib server)
```
启动.bat
app/
  server.py            static files + JSON API (below)
  index.html           Hub: main table + Settings modal (tabs 通用 / 报价 / 下单 / 上架)
  workspace.html       sidebar + journey bar + <iframe> for step2 / step3     (stage 3)
  tools/step1..3.html  copies of the original tools, adapted for embedded mode   (stages 2–4)
  shared/
    theme.css          tokens and components copied from the existing tools' :root
    api.js             fetch wrapper for the API below
    sku.js             parse/normalize SKU ranges, overlap check, mskuInRow()
    rows.js            status order, journey state, filter + sort (hub and sidebar)
    embed.js           iframe ↔ parent postMessage (resize, settings-changed, events)
    datepicker.js      small popover calendar that can open on a given month
data/                  the saved data; back up this folder to back up everything
售价计算 Price Calcs/    Step 1 outputs
下单计划 Order Forms/    Step 2 outputs
Step 1/2/3 - *.html    ORIGINALS: never edit; they are the reference implementation
```

### Server API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/rows` | all `data/rows/*/meta.json`, combined into one array |
| GET / PUT | `/api/data/<path>` | read or write any JSON under `data/` (write = temp file + rename); a missing file returns `null` |
| DELETE | `/api/rows/<id>` | delete the `data/rows/<id>/` folder |
| POST | `/api/output?dir=<d>&name=<f>` | write the raw body to one of the two output folders (whitelist); if the name is taken, add ` (1)` |

Binds to `127.0.0.1` only and rejects `..` in paths. If the port is already in use, it just opens the
browser.

### Data model (`data/`)
```
settings.json         { categories:["XK","MUG"], liveOffsetDays:45,
                        step1:{shippingPrice,exchangeRate,profitMargin,storageFee,isPeak},
                        step2:{operator,store}, step3:{targetDays:90, invTargetDays:180} }
rows/<id>/meta.json   { id, name, category, sku, parentAsin, status, liveDate,
                        step1Confirmed, deliveryDate, thumb, thumbCrop, imgCount, createdAt }
rows/<id>/step1.json  { rows:[{sku,price,l,w,h}] }
rows/<id>/step2.json  Step 2's `S` without settings (images as data URLs); products[0].image = the row's main image
rows/<id>/images.json { extra:[{url,w,h}] }  up to 5 more images, shown only in the hub image viewer
rows/<id>/step3.json  { seasonality:[12 numbers] }
sales.json            Step 3 store (sales/skus/inv/manual/lastSeen/snapshotDate), keyed by MSKU
```
`sku` is normalized: `XK_012-023` or `XK_406`. `thumb` is a 320×320 square JPEG data URL cut from the
main image by `thumbCrop` — the square frame as a window onto the image: `{x, y` (its top-left, fractions of
width / height; negative when zoomed out past the image)`, s` (its side as a fraction of the short edge:
`< 1` zoomed in, `1` fills, up to long ÷ short edge = whole image with white padding)`}`. The full image is
never modified, so any earlier position can always be restored.
Rows saved before this have a ~160px thumb and no `thumbCrop`; they upgrade the first time the viewer
opens them. `imgCount` = main + extras (1–6; missing → `thumb ? 1 : 0`). The hub table reads **only**
`meta.json`; `step2.json` (several MB) and `images.json` are read only when the image viewer opens.

### Status and journey rules
- Status order: `未下单 < 已下单 < 已上架`. It changes automatically and only moves
  forward: Step 2 生成 → 已下单, first sales in the row's SKU range → 已上架. The dropdown can always
  override it. (生产中 was removed on 2026-09-29; a stored 生产中 loads as 已下单.)
- Journey steps are **报价 — 下单 — 上架**. A step is:
  - **done**: 报价 when `step1Confirmed` (set by 保存 in the 报价 panel); 下单 when status ≥ 已下单; 上架 when status = 已上架
  - **next**: the first step that isn't done
  - **locked**: 下单 until 报价 is done; 上架 until 下单 is done
- Soft lock: clicking a locked step shows `confirm('前一步未完成，仍要打开？')` and then opens it.
- The 上架时间 date is always typed by hand. The picker opens on `deliveryDate + liveOffsetDays`, or
  the current month if there's no delivery date.

### Conventions
- The tools in `app/tools/` are **copies**. Change as little as possible and mark each change with
  `/* HUB */` or `<!-- HUB -->`. Calculation, rendering and Excel logic stay identical to the originals.
- Tools read their row from `?row=<id>`. They use `api.js` for storage and `embed.js` to talk to the
  parent page.
- All hub UI text is Chinese. Styles come from `theme.css` so pages look like the existing tools.

## Decisions (from scoping, 2026-09-28)
| # | Decision |
|---|---|
| A1 | Column **SKU** (`XK_012-023`); real 父ASIN auto-filled from Step 3 uploads, shown as a grey sub-line |
| A2 | Required **品名** column |
| A3 | Lenient SKU input (`xk-012-023`, single `XK_406`), normalized; overlap = warning only; unknown prefix → "添加新类目？" or cancel |
| A4 | One shared image: row image = Step 2 first 货号 image |
| B1 | Status changes automatically (forward only) with manual override (see rules above) |
| B2 | Step 1 is done when you click **保存** in the 报价 panel; it stays done after later edits (no undo). *(Changed 2026-09-29: replaced the ✓ 确认价格 button)* |
| B3 | Soft lock on later steps |
| B4 | 上架时间 typed by hand; picker opens on the estimated month |
| C1 | One Step 1 table per row, autosaved; Open/Save-as/New menu removed |
| C2 | 参数设置 global and live (Settings → 报价); changes recalculate every row |
| C3 | Collapsed row shows no price summary (possible later) |
| C4 | First open of Step 2 offers a one-click prefill from Step 1 (empty fields only) |
| D1 | One row = one Step 2 draft = one Excel; several 货号 = several cards in the same row |
| D2 | Categories = SKU 前缀 list (`XK` ↔ `XK_`) |
| D3 | Step 2 quantities do **not** fill Step 3 Units Ordered |
| D4 | Rows created by hand; no bulk seed import |
| E1 | Step 3 always filtered to one row; uploads merge every SKU into `sales.json` |
| E2 | Main table shows no Step 3 numbers |
| E3 | Seasonality curve per **row** (starts flat, presets available); target days global in Settings |
| F1 | `启动.bat` + Python server; all data saved as files |
| F2 | Step 1 保存 → `售价计算 Price Calcs/<品名>_<SKU>_售价.json`; Step 2 生成 → `下单计划 Order Forms/` (no dialog) |
| F3 | Files load back per row (Step 1 导入 JSON; Step 2 导入已有 Excel) |
| F4 | Migrate only Step 3 history (old backup JSON → Settings → 上架) |
| G1 | Search + one-choice 状态 / 类目 chips (each with 所有); categories always grouped; within a group newest first (`createdAt`); no column sorting. *(Changed 2026-09-29)* |
| G2 | Hub UI in Chinese |
| G3 | One workspace page: sidebar + journey bar + tool |
| G4 | Journey column 报价 — 下单 — 上架 in every row |

### Row images (scoping, 2026-09-28)
| # | Decision |
|---|---|
| I1 | Row thumb is a 96×96 square, filled (cover/crop); stored thumb is a 320 square |
| I2 | Clicking a thumb with an image opens the **image viewer**; without one it opens the file picker. Hover ×, paste and drop on the row thumb still work (× deletes the main image, paste/drop replace it) |
| I3 | Viewer: big image with < > (images of this row), side panel with 品名/SKU, `产品 x / y`, `图片 n / N`, thumbnail grid + one "+" tile. ← → move through the table's visible rows that have an image. Everything stops at the ends. × / Esc / backdrop close |
| I4 | Up to 6 images per row (main + 5 extras in `images.json`). Add with "+" (multi-select), paste or drop in the viewer. Per-image delete only; deleting the main image promotes the next one |
| I5 | Every row must have an image: the last one can't be deleted, only replaced (替换主图) |
| I6 | New rows are **drafts** (shown, not saved) until they have an image **and** 品名; a draft is lost on reload |
| I7 | Reposition as in `collage-app.html`: the square frame stays still and the image moves inside it. Press + drag to move, Ctrl + wheel to zoom around the pointer (≈ 4% per notch; zoom out down to the whole image). Works on the row thumb, including a new product's draft row before it is saved (a click without moving still opens the viewer, or the file picker on a draft) and on the viewer's main image, which is shown in a large square frame identical to the row thumb. Saves automatically; the table and the 主图 tile update at once. 重置位置 = centred fill. Changes only `thumb`/`thumbCrop`, never Step 2's image or `frame` |

**Out of scope for now:** Amazon upload templates, price preview in the collapsed row, bundling
several rows into one Excel, Step 3 numbers in the main table.
