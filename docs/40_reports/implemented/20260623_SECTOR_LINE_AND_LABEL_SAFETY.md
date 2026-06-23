# Sector Line and Label Safety

**Date:** 2026-06-23
**Run ID:** N/A
**Baseline:** `main` after `fix(ui): harden player-facing command surfaces`
**Result:** UI/read-model sector-line and player-facing label polish implemented on `codex/sector-line-label-safety`

## Summary
- Reserve-only sector assignments no longer count as friendly front-line truth in Corps Front, tactical tooltips, or defense-preview surfaces.
- Sector assignment read models now distinguish line-holding brigades from reserve/member brigades while preserving reserve membership for navigation and logistics context.
- Player-facing sector names now fall back to neutral command copy when source display names are raw ids such as `sector:arbih_1st_corps:0`, instead of deriving visible labels from internal ids.

## Changes Made

### Line-Holding Boundary
- `src/ui/map/utils/sectorUtils.ts` now exposes `lineHoldingIds` alongside `frontlineIds`, `reserveIds`, `overrideIds`, and `allCurrentIds`.
- `getSectorCoverageTier(...)` treats sectors with no line-holding formations as uncovered even if reserve formations are associated with the sector.
- `src/ui/map/components/CorpsFrontPanel.tsx` computes friendly line, displayed strength, threat, force balance, and fallback readiness from line-holding formations instead of reserve membership.
- `src/ui/map/components/tooltipPlayerSafe.ts` and `src/ui/map/components/Tooltip.tsx` use line-holding formations for own-front truth and defense previews.

### Sector Label Boundary
- `src/ui/shared/playerFacingLabels.ts` now refuses to humanize raw sector ids that contain `:` or `_`; it returns the neutral fallback instead.
- Corps Front, Corps Detail, OOB, Selection Panel, Situation OPSEC, Army HQ threat assessment, and tooltip read models route sector labels through `getPlayerFacingSectorName(...)`.
- Internal ids remain available for data attributes, routing, tests, and diagnostics; only rendered player copy is sanitized.

## Tests Added
- `tests/ui_map_render_smoke.test.ts` pins raw-sector fallback behavior.
- `tests/ui_map_tooltip_player_visibility.test.ts` pins reserve-only sector tooltip behavior and raw-sector tooltip labels.
- `tests/ui/corps_front_panel_routing.test.ts` pins reserve-only Corps Front line truth and sanitized sector labels.
- `tests/ui/corps_detail_sector_truth.test.ts` pins Corps Detail sector-label sanitization.
- `tests/ui/oob_drilldown_routing.test.ts` pins OOB sector-label sanitization.

## Verification
- Red proof first failed 7 expected assertions across the focused sector-label and reserve-line pack.
- `npm.cmd run typecheck` passed.
- Focused green pack passed 85/85:
  `.\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\gui_audit_label_discipline.test.ts`
- `npm.cmd run qa:player-journeys` passed 43 files / 527 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified; `.tmp_first_hour_browser_gate` was removed.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified; `.tmp_live_surface_browser_sweep` was removed.

## Determinism and Scope
- UI/read-model/test/docs polish only.
- No simulation logic, scenario data, startup artifact, sector builder, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.

## Next Steps
- Continue broad player-surface scout work with the same batching discipline: collect several independent UI/read-model polish fixes, prove them locally, then push once the packet is substantial enough to justify CI time.
