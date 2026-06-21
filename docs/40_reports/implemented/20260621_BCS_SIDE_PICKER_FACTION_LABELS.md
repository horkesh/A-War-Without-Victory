# BCS Side Picker Faction Labels

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed the BCS New Game faction-picker label leak. `MainMenu` and `SidePickerOverlay` now render faction names through picker-domain EN/BCS i18n keys via `sidePickerFactionLabel(...)` instead of using the English-only player-safe political-name helper directly.

## Player Impact

When BCS is selected, the RBiH start button now reads `Republika Bosna i Hercegovina` in both New Game picker surfaces. The existing army abbreviations (`ARBiH`, `VRS`, `HVO`) remain unchanged.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/side_picker_i18n.test.ts tests/ui/main_menu_i18n.test.ts --pool=forks --reporter=dot` failed on the English `Republic of Bosnia and Herzegovina` picker label under BCS.
- Green proof: the same focused command passed 7/7 after the fix.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, response ids, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
