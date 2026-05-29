# Event Mutex Filtering

**Date:** 2026-05-27
**Result:** Workstream B mutex-filtering slice closed

## Summary
- `evaluateEvents(...)` now enforces same-turn `mutex_group` filtering after canonical candidate sorting and before the unchanged four-event cap.
- Later candidates in an already-kept mutex group are suppressed for that turn and reported through additive `mutex_suppressed_ids`.
- Persisted overflow queueing remains intentionally unimplemented and still requires a save-schema/migration slice.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\events_evaluate.test.ts tests\event_timeline_integrity.test.ts tests\consequence_chains.test.ts tests\event_state_shape_validation.test.ts --reporter=dot` - PASS; 98/98 tests.
- `npm.cmd run typecheck` - PASS.

## Notes
- Current catalog scan found no authored `mutex_group` rows in `data/scenarios/events`, so this is a substrate hardening slice with no current catalog behavior drift.
- The event cap remains 4 pending scenario proof for any future cap reduction.
