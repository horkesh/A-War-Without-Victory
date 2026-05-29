# Event Overflow Queue Schema Packet

**Date:** 2026-05-27
**Owner lane:** Event-system product/engine lane
**Status:** Implemented 2026-05-27 / superseded by implementation report

## Purpose

Persisting event overflow was the remaining behavior/schema gap after mutex filtering. The 2026-05-27 implementation adds this queue as save schema v22 and follows the semantics below; see `docs/40_reports/implemented/20260527_EVENT_OVERFLOW_QUEUE_IMPLEMENTATION.md` for verification and drift proof.

## Recommended State Shape

Implemented persisted military field:

```ts
event_overflow_queue: string[];
```

Semantics:

- Stores event ids suppressed only by the per-turn cap.
- Sorted in canonical evaluator order.
- Contains no duplicates.
- Does not include same-turn `mutex_group` suppressed ids.
- Does not include events blocked by trigger, probability, recurrence, cooldown, or phase gates.

## Migration and Validation

- Increment save schema version.
- Legacy saves materialize `military.event_overflow_queue = []`.
- Current-version saves reject missing or non-string-array `military.event_overflow_queue`.
- `validateGameStateShape(...)` checks the field as a string array.
- Save round-trip fixtures and migration drift audit must be updated in the same commit.

## Re-Evaluation Semantics

Implemented first-pass semantics:

1. At event evaluation start, read queued ids.
2. Resolve ids against the current event registry.
3. Re-run normal gates for queued events before firing:
   - phase;
   - trigger;
   - recurrence/cooldown;
   - pressure readiness where applicable;
   - probability gate only if the event is still probabilistic.
4. Combine still-eligible queued candidates with newly eligible candidates.
5. Sort all candidates canonically.
6. Apply mutex filtering.
7. Apply the four-event cap.
8. Replace `event_overflow_queue` with the new post-cap overflow ids.

Rationale: queued overflow is priority memory, not a guarantee that an event fires after its live prerequisites disappear.

## Required Tests

- Legacy migration adds an empty queue.
- Current-version validator rejects missing queue field.
- Current-version validator rejects non-array or non-string entries.
- Queue ids resolve through registry and re-enter candidate selection.
- Stale queued ids that no longer exist in registry are dropped deterministically.
- Queued events still fail if trigger/cooldown/phase gates no longer match.
- Queue replacement is canonical and duplicate-free.
- Mutex-suppressed ids are not queued.
- Save/load roundtrip preserves an existing queue byte-identically.
- Replay/evaluator tests prove deterministic ordering with a shuffled registry.

## Scenario Proof

Acceptance proof used:

- Run focused evaluator/save tests.
- Run `npm.cmd run typecheck`.
- Run `git diff --check`.
- Run at least one baseline/scenario proof if current catalog creates overflow in the baseline path.
- If final hash changes, report:
  - turns where overflow queue changed firing order;
  - event ids newly delayed or recovered;
  - whether any historical chain moved;
  - whether player-facing pending decisions changed.

## Stop Gates

- Do not combine this with event prose/content authoring.
- Do not drop the cap from 4 to 3 in the same slice.
- Do not queue mutex-suppressed ids.
- Do not persist full event objects; queue ids only.
- Do not accept scenario hash drift without a turn/event explanation.
