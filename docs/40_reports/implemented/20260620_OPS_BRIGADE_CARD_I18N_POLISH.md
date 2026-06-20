# Ops BrigadeCard I18n Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Ops modal BrigadeCard and BrigadeTray chrome now route unit type, tooltip, march, full-assembly, assigned-count, and empty-state copy through the existing i18n system.
- EN and BCS render paths are pinned by focused tests.

## Changes Made
- Localized BrigadeCard unit-type badges.
- Localized title/tooltip labels for personnel, tanks, artillery, cohesion, fatigue, and march status.
- Localized march labels, full-assembly timing, assigned-brigade summaries, empty tray state, and locale-aware personnel formatting.

## Tests
- Added `tests/ui/ops_brigade_card_i18n.test.ts`.
- Covered both EN and BCS copy paths and rejected stale hard-coded English fragments where relevant.

## Verification
- Worker proof: `node node_modules/vitest/vitest.mjs run tests/ui/ops_brigade_card_i18n.test.ts tests/ui/ops_modal_auto_propose.test.ts tests/ui/brigade_row_supply_labels.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 26/26; `git diff --check` passed.
- Integrated proof: `npm.cmd exec -- vitest run tests/ui/chronicle_focus_routing.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/ops_brigade_card_i18n.test.ts tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 43/43.
- Typecheck: `npm.cmd run typecheck` passed after the Chronicle fixture was integrated.

## Scope / Determinism
- UI/read-model i18n, tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.
