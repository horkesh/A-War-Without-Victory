# Combat Record Ground-Copy Discipline

**Date:** 2026-06-20  
**Type:** UI/read-model copy polish  
**Scope:** Army HQ combat records and shared formation combat-summary panel

## Summary

Combat records no longer render terse capture shorthand such as `cap / lost` on player-facing Army HQ and formation detail surfaces. The UI now labels these counters as ground won/lost, preserving the real combat-history meaning of the fields without conflating them with AAR final-held objective provenance.

## Changes

- `CombatSummaryPanel` now labels the territory row as `Ground Won/Lost`.
- The shared summary detail now renders `{won} won / {lost} lost` through i18n instead of hardcoded `cap / lost`.
- Army HQ corps combat records now use the same `Ground Won/Lost` label instead of the vague `Positions` row for this counter.
- English and BCS message keys were added for the new combat-record copy.
- `gui_audit_label_discipline` now guards both shared and Army HQ combat-record surfaces against capture shorthand.

## Verification

- Red proof: `tests/ui/gui_audit_label_discipline.test.ts` failed on the old `3 cap / 1 lost` copy before implementation.
- Green proof: `npm.cmd exec -- vitest run tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot`

## Determinism

UI/read-model copy, i18n, tests, and docs only. No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
