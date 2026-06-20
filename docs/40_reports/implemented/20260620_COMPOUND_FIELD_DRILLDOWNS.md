# Compound Field Drilldowns

**Date:** 2026-06-20

## Summary

Settlement formation clicks, Formation Detail location clicks, and OOB sector rows now preserve the player-relevant parent context when routing through the tactical field inspection helper.

## Changes

- Added `field-formation-at-settlement` to preserve `selectedFormationId` plus `selectedOsid`.
- Added `field-sector-in-corps` to preserve `selectedCorpsFrontSectorId` plus `selectedCorpsId`.
- Routed Settlement Detail formation rows and Formation Detail location links through the formation-at-settlement target.
- Routed OOB sector rows through the sector-in-corps target instead of the bare sector setter.
- Added store and OOB routing tests, and included `tests/ui/gamestore_field_inspection.test.ts` in `qa:player-journeys`.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/gamestore_field_inspection.test.ts tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` failed before implementation on missing compound context / bare OOB sector routing.
- Green proof: same command passed 7/7 after implementation.
- Focused route pack: `npm.cmd exec -- vitest run tests/ui/gamestore_field_inspection.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui_map_panel_rail.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/orbatpanel_drilldown_routing.test.ts --pool=forks --reporter=dot` passed 15/15.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 25 files / 221 tests.
- `npm.cmd run qa:live-surface:browser` passed; transient evidence was deleted.
- `git diff --check` passed.

## Scope

UI/store route-state/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, installer artifact, randomness, timestamps, or persisted output ordering changed.
