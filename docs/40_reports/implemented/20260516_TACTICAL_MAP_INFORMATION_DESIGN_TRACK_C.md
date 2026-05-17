# Tactical Map Information Design Track C

**Date:** 2026-05-16
**Run ID:** N/A
**Baseline:** AAA+++ Phase 1 Track C open in `docs/plans/2026-05-16-aaa-triple-plus-shipping-plan.md`
**Result:** Track C C1-C4 implemented as UI-only deterministic map read models and overlays; browser visual validation closed on 2026-05-17.

## Summary

- Added contested/disputed OSID bands, front-stability styling, supply-reach/isolation overlay, and separate authority/legitimacy map modes.
- Exposed current per-OSID supply state and political metrics through `GameStateAdapter` without mutating or serializing simulation state.
- Preserved deterministic output ordering with `strictCompare`-sorted builders and focused regression coverage.

## Changes Made

### C1 Contested Bands

- Added `buildContestedBandsGeoJSON(...)`, deriving contested OSIDs from recent control flips and adjacent hostile formation pressure.
- Wired `contested-bands-fill` and `contested-bands-outline` into political and ethnic map modes.

### C2 Front Stability

- Added `buildFrontStabilityGeoJSON(...)`, classifying front features as `static`, `fluid`, `oscillating`, or `support`.
- Wrapped initial and live front-line GeoJSON with the stability classifier and applied dash styling to the front stripe layer.

### C3 Supply Reach

- Added player-scoped `supplyStateByOsid` to `LoadedGameState`.
- Added `buildSupplyReachGeoJSON(...)` and map layers for supply reach and critical isolated pockets in supply mode.

### C4 Authority And Legitimacy

- Added `politicalMetricsByOsid` to `LoadedGameState`, normalized to 0-100 from controller faction authority and settlement legitimacy state.
- Added `buildPoliticalMetricGeoJSON(...)`, `authority`, and `legitimacy` map modes, including legends and keyboard shortcuts 8/9.

## Determinism

- UI-only read models and renderer layers. No combat rule, scenario data, random path, save schema, serialization, or scenario artifact changed.
- New builders sort emitted features by OSID with `strictCompare`.
- Adapter projections normalize existing saved state fields only; no simulation state is recomputed or written.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/map/MapContainer.tsx` | Wires contested, front-stability, supply-reach, authority, and legitimacy overlays |
| `src/ui/map/map/builders/buildContestedBandsGeoJSON.ts` | New contested-band pure builder |
| `src/ui/map/map/builders/buildFrontStabilityGeoJSON.ts` | New front-stability pure builder |
| `src/ui/map/map/builders/buildSupplyReachGeoJSON.ts` | New supply-reach pure builder |
| `src/ui/map/map/builders/buildPoliticalMetricGeoJSON.ts` | New authority/legitimacy pure builder |
| `src/ui/map/data/GameStateAdapter.ts` | Exposes supply and political metric read models |
| `src/ui/map/data/types.ts` | Adds read-model types |
| `src/ui/map/store/gameStore.ts` | Extends map-mode union |
| `src/ui/map/utils/mapModes.ts` | Registers Authority and Legitimacy modes |
| `src/ui/map/hooks/useKeyboardShortcuts.ts` | Adds shortcuts 8 and 9 |
| `src/ui/map/components/MapModeLegend.tsx` | Adds Authority and Legitimacy legends |
| `tests/ui_map_*.test.ts`, `tests/ui/bottom_status_strip_labels.test.ts` | Focused regressions |

## Verification

- `npx.cmd vitest run tests/ui_map_contested_bands.test.ts tests/ui_map_front_stability.test.ts tests/ui_map_supply_reach.test.ts tests/ui_map_political_metrics.test.ts tests/ui_map_modes.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui_map_front_lines_phase_a.test.ts tests/ui_map_render_smoke.test.ts tests/ui_map_no_corridor_heartbeat_default_overlay.test.ts tests/ui/bottom_status_strip_labels.test.ts tests/ui/supply_fallbacks.test.ts` passed 58/58.
- `npx.cmd tsc --noEmit` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite externalization/chunk-size warnings.
- `Invoke-WebRequest http://127.0.0.1:3002/?dev=1` returned HTTP 200 and the tactical root HTML.
- Browser validation report: `docs/40_reports/implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md`. Supply, Authority, and Legitimacy modes rendered in the Turn 40 tactical shell without modal blockers; screenshots are stored under `docs/40_reports/implemented/visual_validation/`.

## Next Steps

- Decide whether front oscillation needs a richer geometric treatment than dash classification.
- Keep future map-information overlays in pure builders with explicit sorted output.
