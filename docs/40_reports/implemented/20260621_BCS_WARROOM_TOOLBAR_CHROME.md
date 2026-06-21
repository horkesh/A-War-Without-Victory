# BCS Warroom Toolbar Chrome

**Date:** 2026-06-21

**Status:** Implemented

## Summary

Closed the BCS Warroom toolbar chrome leak. `WARROOM_ROUTE_ENTRIES` now keep their existing English `label` metadata while also carrying typed `labelKey` values, and `WarroomShellLayer` renders the toolbar navigation aria label and route buttons through EN/BCS i18n keys.

## Player Impact

When BCS is selected, the Warroom top toolbar now shows localized route labels for the presidential desk, command surface, diplomacy, intelligence, Army HQ, Chronicle, faction overview, war map, and advance action instead of English-only labels.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/warroom_shell_accessibility.test.ts --pool=forks --reporter=dot` failed on the hardcoded English `Warroom navigation` aria label and English toolbar buttons.
- Green proof: the same focused command passed 13/13 after the fix.

## Scope / Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, route commands, hotspot ids, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
