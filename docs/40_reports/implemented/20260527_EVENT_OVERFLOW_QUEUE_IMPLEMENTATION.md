# Event Overflow Queue Implementation

**Date:** 2026-05-27
**Owner lane:** Event-system product/engine lane
**Status:** Implemented

## Summary

Persisted event overflow queueing is now implemented as save schema v22. Events delayed only by the four-event-per-turn cap are stored as `military.event_overflow_queue` ids, then re-enter normal event evaluation on later turns instead of disappearing after one crowded turn.

This slice implements the prior schema packet at `docs/40_reports/proposals/20260527_EVENT_OVERFLOW_QUEUE_SCHEMA_PACKET.md`.

## Behavior

- `CURRENT_SCHEMA_VERSION` is now 22.
- Migration v22 materializes `military.event_overflow_queue = []` for older saves.
- Current-version validation requires `military.event_overflow_queue` and rejects malformed arrays.
- `evaluateEvents(...)` de-duplicates queued ids, resolves them through the current registry, re-runs normal eligibility gates, combines them with newly eligible candidates, sorts all candidates canonically, applies same-turn mutex filtering, applies the four-event cap, and replaces the queue with the new post-cap overflow ids.
- Non-war event evaluation clears the queue.
- Stale ids, mutex-suppressed ids, phase-blocked ids, trigger-blocked ids, recurrence/cooldown-blocked ids, and probability-failed ids are not retained.

## Scope Boundaries

No event JSON, historical prose, GUI ownership, modal copy, bot historical-default policy, operation tuning, or calibration logic changed.

`MilitaryState.event_overflow_queue` remains optional in TypeScript to avoid broad legacy/in-memory builder churn, while current-version serialized saves are strict through `validateGameStateShape(...)`.

## Baseline Impact

Baseline hashes were refreshed because persisted save bytes now include schema v22 and the empty `military.event_overflow_queue` default. The latest preserved 52-week baseline comparison showed unchanged event firing sequence; the new final save has schema v22, an empty overflow queue, 42 fired events, and 11 decision-log entries.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\events_evaluate.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\state\serialize.notifications.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts --reporter=dot`
- `node node_modules\vitest\vitest.mjs run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot`
- `node node_modules\vitest\vitest.mjs run tests\events_evaluate.test.ts tests\event_state_shape_validation.test.ts tests\event_decisions.test.ts tests\event_effects.test.ts tests\event_timeline_integrity.test.ts tests\consequence_chains.test.ts --reporter=dot`
- `node node_modules\vitest\vitest.mjs run tests\events_evaluate.test.ts tests\save_migration_counter_offers.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts --reporter=dot`
- `npm.cmd run desktop:startup-snapshot:build`
- `npm.cmd run typecheck`
- `npm.cmd run test:baselines`
- `git diff --check`

## Next Step

Workstream B's next executable event-system slice is semantic catalog validation. Further prose/content authoring remains gated by `docs/40_reports/proposals/20260526_EVENT_MODAL_GATED_DECISION_PACKET.md`.
