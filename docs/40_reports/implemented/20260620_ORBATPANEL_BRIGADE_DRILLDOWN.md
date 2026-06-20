# OrbatPanel Brigade Drilldown

**Date:** 2026-06-20

**Type:** UI/store route-state polish.

## Summary

OrbatPanel brigade rows now use the shared field-inspection route for corps-owned formations. Clicking a brigade transfers from the ORBAT panel into the normal corps + formation drilldown instead of using the bare formation setter that discarded parent context.

## Player Impact

The player can inspect a brigade from the order-of-battle panel without losing the command hierarchy. The map still pans and flashes the brigade location, but the right rail now opens with the corps as primary context and the brigade as the secondary detail.

## Verification

- Red proof first failed because the brigade click left `selectedCorpsId` null.
- `npm.cmd exec -- vitest run tests/ui/orbatpanel_drilldown_routing.test.ts --pool=forks --reporter=dot`
- `npm.cmd exec -- vitest run tests/ui/orbatpanel_drilldown_routing.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui_map_panel_rail.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck`
- `npm.cmd run qa:player-journeys`
- `git diff --check`

## Scope

UI/store route-state, focused tests, player-journey coverage, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
