# Warroom GUI Handover (AWWV)

Audience: external expert advisor continuing GUI/Warroom work.

## Scope
This handover covers:
- Warroom GUI prototype (canvas scene with map/calendar/desk props).
- Phase G dev UI map viewer changes (contested rendering, control status override).
- Asset pipeline additions used by the GUI (manifest + postprocess + validation + MCP).

It does **not** change simulation logic. All tooling is opt‑in and isolated.

**Roadmap:** For what comes after GUI MVP (validation recovery, baselines, war start, turn pipeline integration), see [docs/30_planning/EXECUTIVE_ROADMAP.md](../30_planning/EXECUTIVE_ROADMAP.md).

## Key entrypoints and scripts
- `npm run dev:warroom` → local Warroom dev server (Vite).
- `npm run warroom:build` → Warroom build + stage assets into `dist/warroom/`.
- `npm run assets:ensure` → create asset folders and manifest.
- `npm run assets:post` → deterministic PNG postprocess batch.
- `npm run assets:validate` → manifest + file integrity checks.
- `npm run assets:mcp` → start MCP server for asset tooling.

## Warroom GUI (src/ui/warroom)
Primary files:
- `src/ui/warroom/index.html` — Warroom HTML shell and canvas.
- `src/ui/warroom/warroom.ts` — main app loop, image loading, render order.
- `src/ui/warroom/components/TacticalMap.ts` — loads `data/derived/settlements_viewer_v1.geojson` and renders polygons on the wall.
- `src/ui/warroom/components/WarPlanningMap.ts` — **War Planning Map** (separate GUI system; currently opened from warroom by clicking the wall map). Uses `political_control_data.json` (including `control_status_by_settlement_id`) for political control and contested crosshatch; side panel with layer toggles (Political control, Contested outline; placeholders for Order of Battle, ethnicity, displacement).
- `src/ui/warroom/components/WallCalendar.ts` — renders calendar and highlights current week.
- `src/ui/warroom/components/DeskInstruments.ts` — desk prop placeholders and phone sprite.
- `src/ui/warroom/vite.config.ts` — Vite root and build output; build input is `src/ui/warroom/index.html`.

Render order (current):
1. HQ background image (`/assets/raw_sora/hq_base_stable_v1.png`)
2. Tactical map (settlement polygons)
3. Wall calendar
4. Desk instruments (phone + placeholders)

Static asset paths currently referenced:
- `/assets/raw_sora/hq_base_stable_v1.png`
- `/assets/raw_sora/wall_map_frame_v1.png`
- `/assets/raw_sora/wall_calendar_frame_v1.png`
- `/assets/raw_sora/phone_rotary_red_v1.png`

Data inputs (canonical):
- **Political control:** `data/derived/political_control_data.json` — canonical artifact for initial political control (see `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, “Canonical data for map/warroom UI”). Produced by `npm run map:viewer:political-control-data`.
- **Geometry:** `/data/derived/settlements_viewer_v1.geojson`

Build staging:
- `tools/ui/warroom_stage_assets.ts` copies the required assets/data into `dist/warroom/`.

## Phase G Dev UI (dev_ui/phase_g.ts)
Purpose: Dev UI map viewer (Phase G prototype). This is separate from Warroom but is the active testing ground for map visualization.

Changes made:
- Contested polygons are rendered in political control color **plus** a diagonal crosshatch overlay (black lines).
- Contested tiers are simplified: both `CONTESTED` and `HIGHLY_CONTESTED` → treated as “contested” for visualization (no separate tier).

Related data files:
- `data/source/municipalities_initial_control_status.json` (built control_status per mun1990_id)
- `data/derived/mun1990_names.json` (mun1990 display names)
- `data/source/municipality_political_controllers.json` (mun controller mapping)

## Istočni Stari Grad remap fix
Issue: post‑1995 municipality **Istočni Stari Grad** was mapping to **Novi Grad Sarajevo**.

Fix applied:
- `data/source/municipality_post1995_to_mun1990.json`:
  - `post1995_code: "20206"` / `post1995_name: "Istočni Stari Grad"` → `mun1990_name: "Stari Grad Sarajevo"`
  - `index_by_post1995_code["20206"]` updated accordingly.
- Regenerated `data/derived/mun1990_names.json` via:
  - `npm run map:build:mun1990-names:h3_7`

If the UI still shows Novo Grad Sarajevo, ensure `mun1990_names.json` is reloaded (restart dev server / hard refresh).

## Control status override (Stari Grad Sarajevo)
Rationale: Stari Grad Sarajevo has a substantial Bosniak population and should not be contested by default.

Override applied:
- `scripts/map/build_initial_municipality_control_status.ts`:
  - Added `CONTROL_STATUS_OVERRIDES` with `stari_grad_sarajevo: "SECURE"`.
  - Output note records the override.
- Regenerated `data/source/municipalities_initial_control_status.json` via:
  - `npm run map:build:municipal-control-status`

Current output row (post‑override):
- `mun1990_id: stari_grad_sarajevo`
- `stability_score: 35`
- `control_status: SECURE`

## Asset worker pipeline (Phase A1.0)
Purpose: deterministic UI asset tooling without touching sim determinism.

Files:
- `tools/asset_worker/ensure_assets.ts`
- `tools/asset_worker/post/postprocess_png.ts`
- `tools/asset_worker/post/postprocess_assets.ts`
- `tools/asset_worker/validate/validate_assets.ts`
- `tools/asset_worker/mcp/server.ts`
- `tools/asset_worker/lib/manifest.ts`, `tools/asset_worker/lib/png.ts`
- `tools/asset_worker/README.md`
- `assets/manifests/assets_manifest.json`
- `assets/manifests/assets_manifest.schema.json`

Dependencies added:
- `pngjs`
- `@modelcontextprotocol/sdk`

Asset manifest entry added:
- `assets/raw_sora/hq_base_stable_v1.png` (raw_path only, no file modifications)

## Docs & ADRs
Relevant docs:
- `docs/UI_SYSTEMS_SPECIFICATION.md`
- `docs/UI_TEMPORAL_CONTRACT.md`
- `docs/SORA_ASSET_SPECIFICATION.md`
- `docs/PHOTOSHOP_TEMPLATE_SPECIFICATION.md`
- `docs/UI_DESIGNER_BRIEF.md`
- `docs/MAP_RENDERING_PIPELINE.md`

Entrypoints updated:
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` (asset tooling + warroom staging entrypoints)

ADR:
- `docs/ADR/ADR-0003-asset-worker-pipeline.md`

Ledger entries:
- `docs/PROJECT_LEDGER.md` (Phase A1.0 + Phase G notes)

## Validation notes (last run)
- `npm run assets:ensure` ✅
- `npm run assets:validate` ✅
- `npm run warroom:build` ✅
- `npm run map:build:mun1990-names:h3_7` ✅
- `npm run map:build:municipal-control-status` ✅
- `npm run build` ❌ (pre‑existing TS2352 in `src/state/political_control_init.ts`)
- `npm test` ❌ (determinism scan: Date/Math.random in core pipeline)

## War Planning Map clarification (Product Manager & Game Designer)

- The War Planning Map is a **separate GUI system** (not merely an overlay). What is necessary for it is under clarification: see [WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md](WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md). Product Manager and Game Designer are asked to discuss and produce joint recommendations.
- **Strategic direction (Orchestrator):** See [GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md](GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md). In short: (1) One **base geographical map** (not yet created), then information **layers**. (2) **War system** (orders to brigades/corps/OGs/army, order flow) is separate. (3) **Settlement click** must show layered info: settlement, municipality, side.

## Known gaps / next steps
- Warroom GUI still uses static asset paths in `assets/raw_sora/` (not yet curated into `assets/sources/`).
- The **wall** tactical map still uses a simple fill (no crosshatch on the wall). Contested crosshatch is implemented in the **War Planning Map** (separate GUI system, opened by clicking the wall map), which uses `political_control_data.json` and `control_status_by_settlement_id`.
- Consider moving Warroom asset paths to `assets/sources/` once curated.
- Consider reconciling `stability_score` if you want it to reflect the SECURE override (currently only control_status is forced).

## Quick run checklist
```
npm install
npm run assets:ensure
npm run assets:validate
npm run dev:warroom
```

Optional:
```
npm run warroom:build
```
