# Map Runtime Contract Fixes — Implementation Report

**Date:** 2026-03-03  
**Plan:** docs/plans/2026-03-03-map-runtime-contract-fixes.md  
**Status:** Complete (Phases A–E)

---

## Summary

Resolved desktop map runtime issues: build output path, Tailwind content resolution, density-mode interactions, layer-aware interaction binding, HTTP server routes for `/data/runs` and `/data/source`, and glyph/offline documentation. No canon or simulation changes.

---

## What Was Fixed

| Phase | Deliverable | Outcome |
|-------|-------------|---------|
| **A** | Build output + Tailwind | Map Vite build outputs to `dist/tactical-map`; Tailwind `content` uses `path.join(__dirname, ...)` in `tailwind.config.ts` and explicit `config` in `postcss.config.js` so no "content missing" warning when building from root. |
| **B** | Density + layer-aware binding | `useMapInteractions.ts`: added `safeOn`/`safeOff` for `osid-density-fill` (click, mousemove, mouseleave). `MapContainer.tsx`: interactions effect depends on `loadedGameState` and runs binding after 400ms delay so front-edges/ethnic/density layers exist before handlers attach; cleanup clears timeout and runs interaction cleanup. |
| **C** | HTTP /data/runs + cleanup | `electron-main.cjs`: `getRunsDir()`, HTTP server branch for `/data/runs` with path-traversal guard and `.json`-only. Removed `tools/test_maplibre_*.cjs` and `test_maplibre_minimal.html`; added `tools/test_electron_map.cjs` harness (PMTiles, mun-borders, WebGL). |
| **D** | Glyphs doc | `TACTICAL_MAP_SYSTEM.md` §0: glyphs from `https://demotiles.maplibre.org/...`; offline/air-gapped deployments need bundled glyphs and style update. D2 (optional style contract) deferred. |
| **E** | Tests + report | Unit test `tests/ui_map_interactions.test.ts`: map null returns undefined; with mock map, osid-density-fill gets click/mousemove/mouseleave and cleanup unregisters. E2 (HTTP /data/runs automated test): verification via `tools/test_electron_map.cjs` and manual "Load run"; no separate protocol test added. Full gate: tsc, vitest, desktop:map:build pass. |

---

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/vite.config.ts` | OutDir already `dist/tactical-map` (no change). |
| `src/ui/map/tailwind.config.ts` | `content` entries use `path.join(__dirname, ...)`; `import path`, `fileURLToPath(import.meta.url)`, `__dirname` for resolution from config file. |
| `src/ui/map/postcss.config.js` | Tailwind plugin given explicit `config: path.join(__dirname, 'tailwind.config.ts')`. |
| `src/ui/map/map/useMapInteractions.ts` | Bindings for `osid-density-fill` (click, mousemove, mouseleave); matching cleanup. |
| `src/ui/map/map/MapContainer.tsx` | Interactions effect depends on `loadedGameState`; 400ms delay before `useMapInteractions`; cleanup clears timeout and runs interaction cleanup. |
| `src/desktop/electron-main.cjs` | `getRunsDir()`; in `startMapServer()`, `/data/runs` branch serving from runs dir with path-traversal guard and `.json`-only. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | §0: glyphs and offline deployment note. |
| `tools/test_electron_map.cjs` | New harness: PMTiles Range requests, both tile archives, mun-borders GeoJSON, WebGL. |
| `tools/test_maplibre_electron.cjs`, `tools/test_maplibre_file.cjs`, `tools/test_maplibre_privileges.cjs`, `tools/test_maplibre_minimal.html` | Removed. |
| `tests/ui_map_interactions.test.ts` | New: useMapInteractions null + osid-density-fill bindings and cleanup. |
| `vitest.config.ts` | Included `tests/ui_map_interactions.test.ts`. |
| `docs/plans/2026-03-03-map-runtime-contract-fixes.md` | Todos and summary checklist updated. |
| `docs/PROJECT_LEDGER.md` | Entries for Phases A–E. |

---

## Decisions

- **Build output:** Kept existing `dist/tactical-map` in map Vite config; no root vite change.
- **Tailwind:** Config-file-relative paths in `tailwind.config.ts` plus explicit PostCSS config path so `desktop:map:build` from root does not miss content.
- **Layer binding:** Delay (400ms) after `loadedGameState` before binding interactions so style/layers (front-edges, ethnic, density) are present; single effect with cleanup.
- **HTTP server:** Already in place for MapLibre workers; added only `/data/runs` route and path-traversal guard.
- **E2:** No automated HTTP test for `/data/runs`; verification by harness and manual Load run documented in report.

---

## Verification

- `npx tsc --noEmit` — pass.
- `npx vitest run` — all tests pass (including `tests/ui_map_interactions.test.ts`).
- `npm run desktop:map:build` — succeeds; output in `dist/tactical-map`; no Tailwind content warning.
- Process QA: context/napkin/ledger/commit discipline followed per plan.

---

## Decisions for Review

- **D2 (optional style contract):** Not implemented; one-time check after style load for required sources/layers could be added later.
- **E2:** Automated test for HTTP `/data/runs` with fixture could be added in a follow-up (e.g. spawn server, GET, assert 200/403).
