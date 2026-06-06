# Warroom Native Overlay And Residue Batch

**Date:** 2026-06-06
**Lane:** P0 Presidential Command Surface
**Type:** UI shell / route contract hardening

## Summary

The Warroom command surface now treats Intelligence, Staff, and Faction as the only native preview overlays, with explicit drill-ins to their existing owner surfaces. Diplomacy and Chronicle remain direct mature panels through the Warroom dispatcher. The retired StrategicDashboard and flat EventLog local command variants are removed from the live Warroom local-command union and i18n surface.

This is UI shell/read-model routing only. It does not change simulation behavior, save schema, migrations, scenario data, baseline manifests, generated artifacts, randomness, timestamps, or persisted output ordering.

## Changes

- Narrowed `WarroomNativeOverlay` to `intelligence`, `staff`, and `faction`.
- Added explicit native-overlay drill-ins:
  - Staff -> Army HQ Personnel.
  - Intelligence -> Army HQ Records / AAR.
  - Faction -> Army HQ Summary.
- Removed retired `strategic-overview` and `event-log` Warroom local command variants.
- Removed the orphan `statusStrip.openStrategicDashboard` i18n key.
- Updated active source comments so current ownership points to The War's Record / Army HQ Records rather than retired StrategicDashboard or flat EventLog surfaces.
- Added focused route/static tests proving native overlay routing, drill-in destinations, and retirement of the legacy command variants.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\warroom_shell_ownership.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\ui\warroom_priority_docket.test.ts tests\warroom_shell_layer.test.ts tests\ui_shell_navigation.test.ts --reporter=dot` PASS, 79/79.
- `npm.cmd run typecheck -- --pretty false` PASS.

Scenario/baseline regression was not run because this is UI shell/read-model routing only and does not change sim, save, scenario, generated artifact, or baseline bytes.
