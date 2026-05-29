# Event Evaluator Ordering and Overflow Visibility

**Date:** 2026-05-27
**Result:** Workstream B first evaluator slice closed

## Summary
- Added a canonical event-candidate comparator before the existing four-event cap.
- Added additive overflow diagnostics to `EventsEvaluationReport` without queue/backlog persistence or new save fields.
- Corrected stale v21 save-schema test expectations and refreshed the committed save-migration drift diagnostic after `paramilitary_decision_history` became required in migrated/current saves.

## Changes Made

### Event Evaluator
- `src/sim/events/evaluate_events.ts` now exports `compareEventCandidates(...)`.
- Candidate ordering is now explicit: `priority`, then `trigger.turn_min ?? Number.MAX_SAFE_INTEGER`, then event id.
- `EventsEvaluationReport` now includes `candidates_considered`, `overflowed`, and `overflowed_ids`.
- The per-turn cap remains 4. Overflowed events are reported only; they are not fired, applied, logged, or persisted.

### Tests and Drift Artifact
- `tests/events_evaluate.test.ts` covers comparator order, deterministic shuffled same-turn firing, overflow reporting, loaded-catalog no-drift, and recurrence/cooldown gating before overflow accounting.
- `tests/save_load_real_roundtrip.test.ts`, `tests/save_migration_counter_offers.test.ts`, `tests/save_migration_drift_audit.test.ts`, and `tests/state.test.ts` now reflect schema v21 and the required migrated/current `paramilitary_decision_history` default.
- `tools/diagnostics/output/save_migration_drift.json` was regenerated for schema v21.

## Review
- Systems Programmer worker implemented the evaluator slice.
- Determinism/QA reviewer found no defects. Residual risk: probabilistic event RNG is still consumed during candidate collection in registry order before canonical sorting; that is pre-existing and acceptable while loader order is deterministic.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\events_evaluate.test.ts tests\save_load_real_roundtrip.test.ts tests\save_migration_counter_offers.test.ts tests\save_migration_drift_audit.test.ts tests\state.test.ts --reporter=dot` - PASS; 44/44 tests.
- `F:\A-War-Without-Victory\vitest.cmd run tests\determinism_static_scan_r1_5.test.ts --reporter=dot` - PASS; 1/1 test.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS with only the existing line-ending warning on `tests/events_evaluate.test.ts`.

## Files Changed

| File | Change |
| --- | --- |
| `src/sim/events/evaluate_events.ts` | Canonical comparator and additive overflow report fields. |
| `tests/events_evaluate.test.ts` | Workstream B evaluator ordering and overflow tests. |
| `tests/save_load_real_roundtrip.test.ts` | v21 migrated key expectation for real-save roundtrip. |
| `tests/save_migration_counter_offers.test.ts` | Current schema expectation updated to v21. |
| `tests/save_migration_drift_audit.test.ts` | Drift diagnostic schema expectation updated to v21. |
| `tests/state.test.ts` | Base state includes required migrated/current `paramilitary_decision_history`. |
| `tools/diagnostics/output/save_migration_drift.json` | Regenerated schema v21 drift report. |
| `docs/plans/COMMAND_BOARD.md` | Event row moved to next loader-hardening slice. |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Workstream B evaluator status and next action updated. |
| `docs/plans/MASTER_ROADMAP.md` | Short event Workstream B addendum added. |
| `docs/PROJECT_LEDGER.md` | Closeout entry. |

## Next Steps
- Implement loader fail-closed hardening for the fixed five required event files.
- Keep mutex, persisted queue/backlog, save-shape changes, and historical event prose as separate gated slices.
