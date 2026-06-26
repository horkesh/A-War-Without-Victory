# P10 Player-Polish Batch

**Date:** 2026-06-26  
**Branch:** `codex/p10-supply-autonomy-polish`  
**Status:** implemented locally; PR/merge closeout pending

## Summary

P10 closes the deferred supply/autonomy queue from the D2 owner-playthrough information-quality sweep. Sparse Supply Intelligence / Economy forecast data now preserves missing source fields as `Unreported` instead of converting absence into exact zero/depleted truth, and the stale `autonomy_panel` App/registry/inbox route is retired now that generated proposal reviews route through Decision Room command cards.

This packet is not packaging work, not calibration work, and not a save-schema or scenario-data change. Srebrenica/Zepa fall receipts remain event-owned.

## Implemented

- `GameStateAdapter` preserves partial faction reserve records. Missing general/heavy reserve fields remain absent; explicit reported zero remains zero.
- `EconomyPanel` renders missing reserve fields as `Unreported` and does not count absent reserve data as strained.
- `buildSupplyGeoJSON` only uses faction reserve fallback when general supply is actually reported.
- `playerSupplyVisibility` preserves partial supply-summary warning fields while marking missing fields as `Unreported`; a partial brittle/cut corridor warning no longer disappears.
- `SupplyIntelligence` marks heavy-equipment drain unreported when any fielded formation lacks composition, while preserving explicit reported zeroes and rendering zero heavy drain as `0`, not `-0`.
- Active legacy `autonomy_panel` routing is removed from `App`, `decisionSurfaceRegistry`, and `inboxItems`; the helper component remains for read-only/tested usage.

## Review Correction

Epicurus caught a real P1 issue in the initial P10 patch: incomplete supply-summary rows were being discarded entirely, which protected against invented zeroes but could hide a reported nonzero brittle/cut corridor warning. The fix changed the projection from row-completeness gating to per-field reported flags, with focused red/green coverage.

## Verification

- Red proof before review fix: `npm.cmd exec -- vitest run tests/ui_player_supply_visibility.test.ts tests/ui_decision_room_supply_visibility.test.ts tests/ui/supply_intelligence_mobilization.test.ts --pool=forks --reporter=dot` failed 3 expected tests.
- Green proof after review fix: same command passed 3 files / 24 tests.
- Combined P10 focused proof passed 10 files / 113 tests with `npm.cmd exec -- vitest run tests/player_knowledge_integrity.test.ts tests/ui/supply_fallbacks.test.ts tests/ui_player_supply_visibility.test.ts tests/ui_decision_room_supply_visibility.test.ts tests/ui/supply_intelligence_mobilization.test.ts tests/ui/autonomy_panel_route_retirement.test.ts tests/ui/decision_surface_registry.test.ts tests/ui/inbox_items.test.ts tests/ui/decision_room_review_proposal.test.ts tests/autonomy_panel_player_faction_truth.test.ts --pool=forks --reporter=dot`.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 654 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- Manual in-app browser reload at `http://127.0.0.1:3003/` rendered the side picker with no alert banners, no console errors, and no `autonomy_panel` / `Autonomy Panel` text.
- `git diff --check` passed.
- Generated browser evidence folders were removed after recording proof; only `.tmp_dev_server` remains for the active local dev-server session.

## Scope And Determinism

UI/read-model/routing/test/docs polish only. No packaging, no calibration, no simulation logic, no event evaluator mechanics, no scenario data, no startup snapshot construction, no save schema, no baseline/golden manifest, no structural fingerprint artifact, no Srebrenica/Zepa event ownership change, no randomness, timestamps, locale sorting, or persisted output ordering changed. Srebrenica/Zepa fall receipts remain event-owned.
