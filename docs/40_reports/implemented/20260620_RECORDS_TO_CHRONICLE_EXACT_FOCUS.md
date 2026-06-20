# Records To Chronicle Exact Focus

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Chronicle-filed decision consequence rows in Army HQ Records now route back to the exact Chronicle decision entry instead of opening Chronicle broadly.
- The Chronicle view marks and focuses the matching decision record even when multiple entries share the same turn.

## Changes Made
- Added `focusedChronicleDecisionRecordId` to the game store.
- Added `openChronicleDecisionRecord(...)` to shared shell navigation.
- Updated Decision Consequence Records to route Chronicle-filed rows through the focused helper.
- Updated Chronicle rendering to select the matching turn, expand it, scroll to it, and mark/focus the exact entry by decision-record id.

## Tests
- Added `tests/ui/chronicle_focus_routing.test.ts` for same-turn decision disambiguation.
- Updated Decision Consequence Records and shell-navigation ownership tests for the focused route.

## Verification
- Worker proof: focused red proof first failed on missing focused Chronicle state/entry, then passed `tests/ui/decision_consequence_records_panel.test.ts` + `tests/ui/chronicle_focus_routing.test.ts` 6/6; adjacent routing/source-contract pack passed 21/21; typecheck passed.
- Integrated proof: `npm.cmd exec -- vitest run tests/ui/chronicle_focus_routing.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/ops_brigade_card_i18n.test.ts tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 43/43.
- Typecheck: `npm.cmd run typecheck` passed.

## Scope / Determinism
- UI route-state, read-model focus, tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.
