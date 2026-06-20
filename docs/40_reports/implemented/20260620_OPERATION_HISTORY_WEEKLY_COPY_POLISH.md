# Operation History Weekly Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Operation History weekly rows now use localized player-facing labels instead of phase initials, `atk` shorthand, `OBJ`, signed casualty fragments, or raw notable-event ids.
- The nearby Army HQ corps Operations weekly log now uses the same copy discipline.

## Changes Made
- Replaced weekly phase initials with localized phase labels.
- Replaced attack, casualty, inflicted-loss, held-objective, and notable-event fragments with explicit EN/BCS labels.
- Preserved final-held wording by rendering weekly objective rows as `Held at close`.

## Tests
- Added Records Operation History weekly-row coverage in `tests/ui/operation_aar_records_review.test.ts`.
- Added Army HQ Operations weekly-log shorthand coverage in `tests/ui/army_hq_timing_copy.test.ts`.
- Added BCS coverage for the Operation History weekly row.

## Verification
- Focused worker proof: `node node_modules\vitest\vitest.mjs run tests/ui/operation_aar_records_review.test.ts tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 24/24.
- Integrated proof: `npm.cmd exec -- vitest run tests/ui/chronicle_focus_routing.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/ops_brigade_card_i18n.test.ts tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 43/43.
- Typecheck: `npm.cmd run typecheck` passed.

## Scope / Determinism
- UI/read-model copy, i18n, tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.
