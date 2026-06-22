# Surface Truth and Routing Polish

Date: 2026-06-22

## Summary

Closed the next non-BCS surface-polish batch from live Pyrrhic scout findings. The patch keeps sector, brigade, OOB, Corps Front, map context-menu, and settlement timeline behavior aligned with the shared field-inspection contract and with player-visible truth.

## Changes

- Corps Front no longer renders a zero-friendly-line sector as a favorable force-balance advantage; uncovered sectors show explicit `No friendly line` copy instead of `SUPERIOR / clear advantage`.
- Army HQ sector brigade inspect buttons now preserve the parent corps id.
- Corps Front brigade rows now route through `inspectOnField(...)`, clearing stale Codex/Chronicle/record focus state like the other field drilldowns.
- OOB HQ reserve brigade chips now route through `inspectOnField(...)` and expose stable `data-formation-id` / `data-army-hq-id` attributes.
- Tactical map context-menu handling now uses the Deck formation fallback before falling through to front/OSID/empty menus, so visible Deck counters can be right-clicked.
- Settlement timeline memoization now includes per-OSID battle, movement, supply-transition, and historical-event sources, so reload/advance updates refresh the visible timeline.

## Verification

- Red/green focused tests:
  - `tests/ui/gui_audit_label_discipline.test.ts`
  - `tests/ui/corps_front_panel_routing.test.ts`
  - `tests/ui/settlement_supply_status.test.ts`
  - `tests/ui_map_interactions.test.ts`
  - `tests/ui/oob_drilldown_routing.test.ts`
- Combined focused pack passed: `node node_modules\vitest\vitest.mjs run tests\ui_map_interactions.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\settlement_supply_status.test.ts tests\ui\oob_drilldown_routing.test.ts --pool=forks --reporter=dot` (51/51).
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed; dev-server cleanup on port 3239 was verified and `.tmp_live_surface_browser_sweep` was removed.

## Scope

UI/read-model/store-route/test/docs polish only. No simulation logic, scenario source data, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, or installer packaging changed.
