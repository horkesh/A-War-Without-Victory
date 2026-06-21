# Supply Visibility I18n Boundary

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed the BCS leak in the player-scoped supply visibility read model. `buildPlayerSupplyVisibility` now renders generated supply headlines and evidence rows through EN/BCS i18n keys while preserving the same player-faction-safe counts and severity logic.

## Player Impact

BCS Decision Room supply cards no longer show English read-model fragments such as `Supply status unavailable`, `adequate / strained / critical`, `open / brittle / cut corridors`, or `brigades cut off`. Existing supply counts remain visible through localized supply-state and corridor vocabulary.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui_player_supply_visibility.test.ts --pool=forks --reporter=dot` failed on BCS supply headlines/evidence still rendering English.
- Green proof: `npm.cmd exec -- vitest run tests/ui_player_supply_visibility.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 36/36 after the fix.
- Player journey gate: `npm.cmd run qa:player-journeys` passed 239/239.
- TypeScript: `npm.cmd run typecheck` passed.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, route commands, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
