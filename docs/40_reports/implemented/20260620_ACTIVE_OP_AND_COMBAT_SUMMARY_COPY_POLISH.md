# Active Operation And Combat Summary Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Active Operation History cards no longer render `Obj ... | ... atk` shorthand.
- Shared combat summaries no longer render battle-role counts as `att / def`.
- Shared combat summaries also avoid compact `W/L/D`, `active / total`, and raw narrative-arc ids.
- Settlement timeline casualty rows now spell out attacker/defender roles instead of `att / def` or `nap / odb`.

## Changes Made
- Replaced `operationHistory.activeProgress` copy with explicit held-objective and attack wording.
- Replaced active-operation brigade metadata `bdes` / `brig.` shorthand with full brigade wording.
- Added `combatRecord.battleRoleBreakdown`, `combatRecord.recordBreakdown`, and `combatRecord.brigadeBreakdown` for attacker/defender battle-role counts, win/loss/stalemate records, and brigade totals.
- Routed combat-summary narrative-arc counts through the existing player-safe narrative-arc label helper.
- Replaced settlement timeline casualty role shorthand with full attacker/defender labels.
- Added EN/BCS message coverage for both surfaces.

## Tests
- Extended `tests/ui/operation_aar_records_review.test.ts` to reject active-operation `Obj` / `atk` copy.
- Extended `tests/ui/gui_audit_label_discipline.test.ts` to reject `att / def`, `W/L/D`, `active / total`, and raw arc ids in shared combat summaries.
- Extended `tests/ui/settlement_timeline_i18n.test.ts` to reject casualty-role shorthand in BCS settlement timeline rows.

## Verification
- Red proof: focused tests first failed on `Obj 1/3 | 2 atk`, `3 att / 1 def`, and then caught remaining compact combat-record fragments.
- Focused green: `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 45/45.
- Typecheck: `npm.cmd run typecheck` passed.
- Diff hygiene: `git diff --check` passed.

## Scope / Determinism
- UI/read-model copy, i18n, focused tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.
