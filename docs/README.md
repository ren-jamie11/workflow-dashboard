# Workflow Hub: Overview

One local app to track every product group (parent-ASIN group) through the three workflow steps
**报价 → 下单 → 上架**. It embeds the existing tools unchanged in look and behaviour.

Read this file first, then only the stage doc you are working on.

| Stage | Doc | Usable result after the stage |
|---|---|---|
| 1 | [stage-1-hub.md](stage-1-hub.md) | Product tracker: add/filter/delete rows; data saved to `data/` |
| 2 | [stage-2-step1.md](stage-2-step1.md) | Expand a row to price it (Step 1) and confirm the price |
| 3 | [stage-3-step2.md](stage-3-step2.md) | 下单 pop-up over the hub (← → between products); several 下单计划 per row, each built from chosen images × 报价 lines; Excel written to `下单计划 Order Forms/` |
| 4 | [stage-4-step3.md](stage-4-step3.md) | Step 3 inventory per row; uploads set 已上架 automatically and fill 父ASIN |

## Launch
Double-click `启动.bat`. It runs `python app/server.py`, which serves `http://127.0.0.1:8765` and
opens the browser. Close the console window to stop the server. Use Chrome or Edge.

## Architecture (vanilla HTML/CSS/JS, no build step, Python stdlib server)
```
启动.bat
app/
  server.py            static files + JSON API (below)
  index.html           Hub: main table, 报价 panel, 下单 pop-up, image viewer, Settings modal (tabs 通用 / 报价 / 下单 / 工厂 / 上架)
  tools/step1..3.html  copies of the original tools, adapted for embedded mode   (stages 2–4)
  tools/vendor/        exceljs.min.js, moved out of the Step 2 original unchanged
  shared/
    theme.css          tokens and components copied from the existing tools' :root
    api.js             fetch wrapper for the API below
    sku.js             parse/normalize SKU ranges, overlap check, mskuInRow()
    rows.js            status order, journey state, stage() sort tier, filter + sort (hub and sidebar)
    embed.js           iframe ↔ parent postMessage (resize, settings-changed, load-row, events)
    crop.js            square image positions (thumbCrop / crop): pan, zoom, render — hub and Step 2
    pricing.js         报价 price calculation (computeRow, moved unchanged from Step 1) — Step 1 and the 下单计划 picker
    datepicker.js      small popover calendar that can open on a given month
    combo.js           type-to-filter dropdown on a text input (existing values only; optional '+ 添加「X」' for 工厂)
    pinyin.js          pinyin matching for combo.js (shi / shimu / sm → 实木), ~5 KB, no dictionary
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
| DELETE | `/api/data/<path>` | delete one JSON file under `data/` (a 下单计划 form) |
| POST | `/api/output?dir=<d>&name=<f>` | write the raw body to one of the two output folders (whitelist); if the name is taken, add ` (1)` |

Binds to `127.0.0.1` only and rejects `..` in paths. If the port is already in use, it just opens the
browser.

### Data model (`data/`)
```
settings.json         { categories:["XK","MUG"], materials:["树脂","金属","实木","陶瓷","塑料"], liveOffsetDays:45,
                        factories:[{name, taxRate, category, material}]   (工厂 list in a fixed order, new ones at the end; '' = not set),
                        rowFactoriesFilled   (the one-time 工厂 fill of existing rows has run)
                        step1:{shippingPrice,exchangeRate,profitMargin,storageFee,isPeak},
                        step2:{operator,store}, step3:{targetDays:90, invTargetDays:180} }
rows/<id>/meta.json   { id, name, factory, category, material, sku, parentAsin, status, liveDate,
                        step1Confirmed, deliveryDate, thumb, thumbCrop, imgCount, createdAt }
rows/<id>/step1.json  { rows:[{sku,price,l,w,h}] }
rows/<id>/images.json { main:{url,w,h}, extra:[{url,w,h,crop}] }  the row's images: main + up to 8 more (image viewer,
                      下单计划 picker). Rows from before 2026-09-29 kept `main` in step2.json; it moves here on first read
rows/<id>/orders.json { forms:[{id, name, createdAt, generatedAt|null, deliveryDate}] }  the row's 下单计划 list (hub writes it)
rows/<id>/orders/<fid>.json  one 下单计划 (Step 2 writes it): {order, products:[ONE 货号 card], images:{<imgId>:{url,w,h}}, hub}.
                      Each row: variants[j].img = an id in `images` (each picture stored once) + its own square position
                      variants[j].imgCrop; 色号 variants[j].colorImage / colorCrop. order = {factory, date, sku, plant, taxRate,
                      freight}: 交货日期 / SKU / 是否含真植物 are order-wide; 品名 / 材质 are never stored here (meta.json).
                      Created by the picker's 确认 (or 从 Excel 导入); changed only by edits. Independent of the row's images
rows/<id>/order-memory.json { factories, materials, productNames, colorNames }  suggestion lists shared by the row's forms
                      (`factories` is no longer used: 工厂 comes from settings.factories)
rows/<id>/step2.json  legacy (one draft per row): copied once into the row's first form (`hub.legacy`), then only a backup
rows/<id>/step3.json  { seasonality:[12 numbers] }
sales.json            Step 3 store (sales/skus/inv/manual/lastSeen/snapshotDate), keyed by MSKU
```
`sku` is normalized: `XK_012-023` or `XK_406`. `thumb` is a 320×320 square JPEG data URL cut from the
main image by `thumbCrop` — the square frame as a window onto the image: `{x, y` (its top-left, fractions of
width / height; negative when zoomed out past the image)`, s` (its side as a fraction of the short edge:
`< 1` zoomed in, `1` fills, up to long ÷ short edge = whole image with white padding)`}`. The full image is
never modified, so any earlier position can always be restored.
Rows saved before this have a ~160px thumb and no `thumbCrop`; they upgrade the first time the viewer
opens them. `imgCount` = main + extras (1–9; missing → `thumb ? 1 : 0`). The hub table reads **only**
`meta.json`; `images.json` (several MB) is read only when the image viewer or the 下单计划 picker opens, `orders.json`
when the 下单 pop-up opens.

### Status and journey rules
- Status order: `未下单 < 已下单 < 已上架`. It changes automatically and only moves
  forward: 生成 of any 下单计划 → 已下单, first sales in the row's SKU range → 已上架. The dropdown can always
  override it. (生产中 was removed on 2026-09-29; a stored 生产中 loads as 已下单.)
- Journey steps are **报价 — 下单 — 上架**. A step is:
  - **done**: 报价 when `step1Confirmed` (set by 保存 in the 报价 panel); 下单 when status ≥ 已下单; 上架 when status = 已上架
  - **next**: the first step that isn't done
  - **locked**: 下单 until 报价 is done; 上架 until 下单 is done
- Sort tier `ROWS.stage(r)` = furthest step reached: 0 待报价 · 1 报价✓ · 2 已下单 · 3 已上架 (status wins, so
  已下单 without 报价 is tier 2). Within a tier a row that skipped 报价 sorts first (less progress): the sort key
  is `ROWS.progress(r)` = stage × 2 + (报价 done ? 1 : 0).
- Soft lock: clicking a locked step shows `confirm('前一步未完成，仍要打开？')` and then opens it. The 下单
  pop-up's ← → don't ask; its header shows `报价未完成` instead.
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
| A4 | ~~One shared image: row image = Step 2 first 货号 image~~ *(Changed 2026-09-29: the row's images live in `images.json`; each 下单计划 copies the images it uses — M-series in [stage-3-step2.md](stage-3-step2.md))* |
| B1 | Status changes automatically (forward only) with manual override (see rules above) |
| B2 | Step 1 is done when you click **保存** in the 报价 panel; it stays done after later edits (no undo). *(Changed 2026-09-29: replaced the ✓ 确认价格 button)* |
| B3 | Soft lock on later steps |
| B4 | 上架时间 typed by hand; picker opens on the estimated month |
| C1 | One Step 1 table per row, autosaved; Open/Save-as/New menu removed |
| C2 | 参数设置 global and live (Settings → 报价); changes recalculate every row |
| C3 | Collapsed row shows no price summary (possible later) |
| C4 | ~~First open of Step 2 offers a one-click prefill from Step 1 (empty fields only)~~ *(Changed 2026-09-29: a new 下单计划 is built in a picker from chosen images × ticked 报价 lines)* |
| D1 | ~~One row = one Step 2 draft = one Excel; several 货号 = several cards in the same row~~ *(Changed 2026-09-29: a row has any number of 下单计划, one Excel each; each has one 货号 card with an image per row)* |
| D2 | Categories = SKU 前缀 list (`XK` ↔ `XK_`) |
| D3 | Step 2 quantities do **not** fill Step 3 Units Ordered |
| D4 | Rows created by hand; no bulk seed import |
| E1 | Step 3 always filtered to one row; uploads merge every SKU into `sales.json` |
| E2 | Main table shows no Step 3 numbers |
| E3 | Seasonality curve per **row** (starts flat, presets available); target days global in Settings |
| F1 | `启动.bat` + Python server; all data saved as files |
| F2 | Step 1 保存 → `售价计算 Price Calcs/<品名>_<SKU>_售价.json`; Step 2 生成 → `下单计划 Order Forms/` (no dialog) |
| F3 | Files load back per row (Step 1 导入 JSON; 下单计划 list → 从 Excel 导入 creates a new form) |
| F4 | Migrate only Step 3 history (old backup JSON → Settings → 上架) |
| G1 | Search + 状态 / 类目 chips, at most one per group (click the active chip again to clear it) + a 材质 dropdown; categories always grouped; no column sorting. *(Changed 2026-09-29: within a group rows sort by stage 待报价 → 报价✓ → 已下单 → 已上架 (within a stage, 报价 skipped first), then 上架时间 earliest first (blank last), then newest first (`createdAt`))* |
| G2 | Hub UI in Chinese |
| G3 | ~~One workspace page: sidebar + journey bar + tool~~ *(Changed 2026-09-29: no workspace page; 下单 opens in a pop-up over the hub, see [stage-3-step2.md](stage-3-step2.md))* |
| G4 | Journey column 报价 — 下单 — 上架 in every row |
| G5 | 报价 panel expand / collapse keeps the page still: it never auto-scrolls, and the clicked row doesn't move. Clicking the grey page margins collapses it. *(2026-09-29)* |
| G6 | Clicking a category header (`XK 5 个`) collapses / expands its rows; **全部收起 / 全部展开** at the right of the filter bar does all groups. Session only (a reload shows everything). Filters and search don't auto-expand (the header count still shows the matches). Collapsing a group closes a 报价 panel open inside it; adding a row, or a SKU / 类目 change that moves a row into a collapsed group, expands that group. The image viewer's ← → skip collapsed groups. *(2026-09-29)* |
| G7 | A click on a row's blank space toggles 报价, except within 1px of a field, button or sub-line (near misses), and only when press and release are on the same spot, once per double-click, and not when the click only closes a date picker / dropdown or leaves a text box. The 报价 pill always toggles. *(2026-09-29)* |
| G8 | A row whose 报价 panel is open keeps its sort position until the panel has closed, then moves. A row that lands in a new spot after a stage / 上架时间 change flashes briefly (`moveRow` / `flashRow` in index.html). *(2026-09-29)* |

### 材质 (2026-09-29)
| # | Decision |
|---|---|
| M1 | Column **材质** between 类目 and SKU: an optional dropdown (`—` = none) from `settings.materials`, default 树脂 / 金属 / 实木 / 陶瓷 / 塑料 |
| M1b | The 类目 and 材质 cells are type-to-filter dropdowns (`combo.js`). Only existing values can be chosen; other text reverts with a toast. New values are added in Settings (or, for 类目, by typing a new SKU prefix) |
| M2 | Settings → 通用 adds and removes 材质 values; removing one that a row uses is blocked (`仍有 N 个产品使用材质「…」`) |
| M3 | The 材质 filter is a type-to-filter dropdown (全部 + each 材质 with its count), not chips |
| M4 | ~~Stage 3: Step 2's per-货号 产品材质 starts with the row's 材质 when empty~~ *(Changed 2026-09-29: 下单计划 订单信息 shows the row's own 品名 / 材质, synced both ways — S1 in [stage-3-step2.md](stage-3-step2.md))* |

### Row images (scoping, 2026-09-28)
| # | Decision |
|---|---|
| I1 | Row thumb is a 96×96 square, filled (cover/crop); stored thumb is a 320 square |
| I2 | Clicking a thumb with an image opens the **image viewer**; without one it opens the file picker. Hover ×, paste and drop on the row thumb still work (× deletes the main image, paste/drop replace it) |
| I3 | Viewer: big square frame with < > (images of this row), side panel with 品名/SKU, `产品 x / y`, `图片 n / N`, thumbnail grid (3 across) + one "+" tile. ← → move through the table's visible rows that have an image. Everything stops at the ends. × / Esc / backdrop close. *(2026-09-29: the "按 ← → 切换" and 主图方框 hints were removed)* |
| I4 | Up to 9 images per row (main + 8 extras in `images.json`). Add with "+" (multi-select), paste or drop in the viewer. Per-image delete; deleting the main image promotes the next one (keeping its position). **设为主图** (shown on any other image) swaps that image with the 主图; each keeps its own position *(2026-09-29)* |
| I5 | Every row must have an image: the last one can't be deleted, only replaced. Replace the 主图 by clicking its tile while it is already selected (the first click selects it), or by pasting / dropping an image onto the 主图 tile; paste / drop anywhere else adds an image. 替换主图 was removed *(2026-09-29)* |
| I6 | New rows are **drafts** (shown, not saved) until they have an image **and** 品名; a draft is lost on reload |
| I7 | Reposition as in `collage-app.html`: the square frame stays still and the image moves inside it. Press + drag to move, Ctrl + wheel to zoom around the pointer (≈ 4% per notch; zoom out down to the whole image). Works on the row thumb, including a new product's draft row before it is saved (a click without moving still opens the viewer, or the file picker on a draft), and on **every image** in the viewer, each shown in a large square frame. Saves automatically. The 主图's position is `meta.thumbCrop` (the table thumb and the 主图 tile update at once); every other image keeps its own `extra[i].crop` in `images.json` (missing = centred), and its tile shows that square. 重置位置 was removed *(2026-09-29)*. Never changes a 下单计划's images. *(A new 下单计划 starts each image at its own position; after that the form's positions are its own — M9 in stage-3-step2.md)* |

### 下单 pop-up (scoping, 2026-09-29)
Decisions are listed in [stage-3-step2.md](stage-3-step2.md). In short: a pop-up instead of the workspace page;
← → through the table's visible rows; every Step 2 image is a 1:1 square, and the Excel gets exactly that square
(12px margin); 运营 / 店铺 in Settings → 下单. Since 2026-09-29 (M1–M16) the pop-up opens the row's **list of 下单计划**;
a new one is built in a picker (images × 报价 lines) as one 货号 card with an image on every row.

### 工厂 / 税率 (scoping, 2026-09-29)
| # | Decision |
|---|---|
| F1 | One global list `settings.factories [{name, taxRate}]`, seeded with 博罗 专票13% · 华智 专票1% · 合兴 专票13% · 莱伯特 专票13% · 佰利源 (none). 税率 is one string (`专票13%`, 对私 …); `''` = unknown. Names match ignoring case and spaces (`api.factoryKey`) |
| F2 | 下单计划 工厂 = a `combo.js` dropdown (pinyin). Text with no exact match shows `+ 添加「X」` (click / Enter; Tab never adds) which adds X without 税率; other unknown text reverts with a toast |
| F3 | Picking a 工厂 always replaces the form's 税率; no 税率 → empty, placeholder `该工厂未设税率`. A hand-typed 税率 is form-only |
| F4 | Settings → **工厂**: name · 税率 · × per line, add line below, saves at once. Rename / delete (with confirm) change the list only, never saved forms |
| F5 | ~~Most recently used first~~ *(Changed 2026-09-29)* Every 工厂 dropdown uses the Settings order, which never changes by use; new factories (Settings, `+ 添加`, import) go at the end. The tool posts `factory-used` for a new one; only the hub writes `settings.json` |
| F6 | 从 Excel 导入: an unknown 工厂 is added with the file's 税率 (toast `已新增工厂「X」`) |
| F7 | New forms start with 工厂 and 税率 empty; an empty 税率 leaves the Excel 税率 cell blank (was `专票1%`). Saved forms keep their 工厂 / 税率 (e.g. "Huazhi") *(a row's 工厂 now overrides them, F10)* |
| F8 | Main table column **工厂** between 品名 and 类目 (`meta.factory`), optional (`—`), also for new products; the same dropdown with `+ 添加「X」`. The search box matches it |
| F9 | Each factory has optional 类目 · 材质 · 税率 (Settings → 工厂). Picking a factory (table or form) always overwrites the row's 材质 and 类目, except that a row with a SKU keeps its SKU-prefix 类目 (silently); fields left `—` change nothing |
| F10 | Row ↔ 下单计划 synced both ways: a row with a 工厂 shows it in all its forms (a form saved with another one takes it and that factory's 税率, in memory until the next edit); picking one in a form sets the row's 工厂 / 类目 / 材质 (`meta-changed`). A row without 工厂 leaves its forms' own. 从 Excel 导入: the row's 工厂 wins; an empty row takes the file's |
| F11 | Renaming a factory renames it in every row using it; deleting leaves the rows' text. Deleting a 类目 / 材质 clears it from the factories |
| F12 | One-time fill: each row without 工厂 takes it from its most recent 下单计划 (or old `step2.json`), 'Huazhi' → 华智; 类目 / 材质 unchanged |

**Out of scope for now:** Amazon upload templates, price preview in the collapsed row, bundling
several rows into one Excel, Step 3 numbers in the main table.
