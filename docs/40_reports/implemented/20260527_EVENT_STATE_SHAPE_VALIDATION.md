# Event State Shape Validation

**Date:** 2026-05-27
**Result:** Event-system save-shape validation slice closed

## Summary
- `validateGameStateShape(...)` now checks optional event decision state when present instead of only checking required container fields.
- The slice covers `pending_event_decisions`, `event_decision_log`, `event_aggression_modifiers`, `recruitment_modifiers`, and `equipment_quality_modifiers`.
- No schema version changed. No migration/default behavior, event firing, bot choice, event prose, scenario output, or GUI behavior changed.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\event_state_shape_validation.test.ts tests\state.test.ts tests\event_decisions.test.ts tests\events_evaluate.test.ts --reporter=dot` - PASS; 50/50 tests.
- `F:\A-War-Without-Victory\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_load_real_roundtrip.test.ts tests\migration_nested_ownership.test.ts tests\state.test.ts --reporter=dot` - PASS; 88/88 tests.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS.
