# CorpsDetail Brigade Drilldown

**Date:** 2026-06-20

**Type:** UI/store route-state polish.

## Summary

Corps Detail brigade clicks now route through the shared field-inspection helper with a compound `field-formation-in-corps` target. This preserves the selected corps while focusing the brigade, so the right rail opens as corps + formation instead of dropping the player into a bare formation with the parent context cleared.

## Player Impact

The player can inspect a brigade from Corps Detail combat summaries or ORBAT rows and remain anchored in the same corps command context. This makes drilldown behavior match the Army HQ field-inspection contract and avoids confusing rail ownership changes during command review.

## Verification

- Red proof first failed because a Corps Detail ORBAT brigade click cleared `selectedCorpsId`.
- `npm.cmd exec -- vitest run tests/ui/command_drilldown_routing.test.ts --pool=forks --reporter=dot`
- `npm.cmd exec -- vitest run tests/ui/command_drilldown_routing.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui/panel_rail_ownership.test.ts tests/ui_map_panel_rail.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run qa:live-surface:browser`

## Scope

UI/store route-state, focused tests, player-journey coverage, live browser QA, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
