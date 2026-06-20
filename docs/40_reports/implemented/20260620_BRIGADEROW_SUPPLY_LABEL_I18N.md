# BrigadeRow Supply Label I18n

**Date:** 2026-06-20  
**Type:** UI/read-model i18n copy polish  
**Branch:** `codex/brigaderow-supply-labels`

## Summary

BrigadeRow supply dots and row tooltips now render localized player-facing supply labels instead of raw derived state ids. The row title now says `Supply: Supply strained` / `Supply: Cut off` rather than `STRAINED` / `CUTOFF`, and the supply dot accessibility label uses the same localized copy rather than lowercase enum ids.

## Implementation

- Added explicit BrigadeRow supply label keys for `supplied`, `strained`, and `cutoff` in EN and BCS dictionaries.
- Added a typed `SupplyState` label-key map inside `BrigadeRow`.
- Reused the resolved localized label for both `title` interpolation and the supply-dot `aria-label`.
- Added `tests/ui/brigade_row_supply_labels.test.ts` and enrolled it in `qa:player-journeys`.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/brigade_row_supply_labels.test.ts --pool=forks --reporter=dot` failed on `Supply: STRAINED | Fatigue: 35 | Cohesion: 62%`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/brigade_row_supply_labels.test.ts --pool=forks --reporter=dot` passed 1/1.
- `npm.cmd exec -- vitest run tests/ui/brigade_row_supply_labels.test.ts tests/ui_i18n.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/settlement_supply_status.test.ts --pool=forks --reporter=dot` passed 4 files / 30 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 26 files / 222 tests.
- `npm.cmd run qa:live-surface:browser` passed (`live surface browser sweep ok`); temp evidence was deleted.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
