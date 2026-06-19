# Owner Journey Browser Gate

**Date:** 2026-06-19

**Type:** UI/test-readiness and live browser QA gate.

## Summary

`qa:live-surface:browser` now proves the owner journey beyond top-level shell reachability. The live Puppeteer/Vite sweep covers:

- Desk -> Command Surface -> Warroom Decision Room.
- War Map OOB sector selection -> Corps Front sector overview/logistics/ops/forces tabs.
- Corps Front brigade selection -> Formation Detail record/orders/overview tabs.
- Formation location link -> Settlement Detail overview/municipality/timeline tabs.
- Records route -> Aftermath/AAR/Ops/Decisions/Opportunities archive subtabs.

The branch adds stable browser-test hooks for top toolbar routes, modal close controls, OOB sector rows, Corps Front brigade rows with settlement locations, Formation Detail/location, and Records subtabs. These hooks are automation/read-model affordances only.

## Player Impact

The first-hour command map can now be checked as a playable drilldown rather than only a collection of reachable panels. A player can enter the presidential command surface, inspect a sector, open a unit, follow it to its settlement, and return to Records without hidden shell stacking or stale overlay ownership.

This closes the tactical settlement/sector/unit interaction-panel slice of the owner-journey residual. Inbox action routing remains open and is intentionally not claimed here.

## Verification

Passed:

- `npm.cmd run qa:live-surface:browser`
- `node .\node_modules\vitest\vitest.mjs run tests\ui\first_hour_browser_gate_contract.test.ts tests\ui_map_panel_rail.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

Live evidence:

- `.tmp_live_surface_browser_sweep/live_surface_browser_sweep.json`
- Screenshots `01_main_menu.png` through `16_owner_journey_records_tabs.png`
- Summary fields: `ok: true`, `ownerJourneyDrilldown: true`, `ownerJourneySectorIndex: 0`, `serverPortCleanupVerified: true`

## Scope

Changed UI hooks, live browser QA tooling, focused static contract tests, and docs only. No simulation logic, scenario data, save schema, generated calibration artifacts, structural fingerprint, golden manifest, packaged installer artifact, random source, timestamp source, or persisted output ordering changed.

## Residuals

- Inbox action routing follow-up remains active.
- Browser-gate CI wiring remains active.
- This gate does not validate every possible sector or every formation; it validates the owner-critical drilldown path with a location-backed Corps Front brigade row.
