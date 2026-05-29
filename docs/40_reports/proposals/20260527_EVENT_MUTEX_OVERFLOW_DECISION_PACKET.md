# Event Mutex and Overflow Queue Decision Packet

**Date:** 2026-05-27
**Owner lane:** Event-system product/engine lane
**Status:** Proposal / implementation gate

## Problem

Canon currently says:

- Rulebook v0.9.0: maximum 3 events per turn; overflow queued to next turn by priority.
- Systems Manual v0.9.0: maximum 3 events per turn, priority-sorted overflow queue, and `mutex_group` prevents same-group co-fire; mutex was deferred.

Live code currently says:

- `evaluateEvents` caps at 4 events per turn.
- Candidates are canonically sorted by `priority`, `trigger.turn_min`, and event id.
- Overflow is visible through additive report fields only: `candidates_considered`, `overflowed`, `overflowed_ids`.
- Overflow is not persisted or replayed next turn.
- `mutex_group` exists on event definitions but is not enforced.

This mismatch is now visible and documented. The next behavior-changing slice needs an explicit decision because it can move scenario hashes and player event timing.

## Recommendation

Adopt a two-step bridge:

1. Keep the live cap at 4 for the next implementation slice, and update canon docs to describe the current cap as the accepted tactical cap.
2. Implement mutex filtering before the cap, but keep overflow queue persistence as a separate save-schema slice.

Rationale:

- The 4-event cap is already protecting the JNA withdrawal / Drina / Srebrenica / Corridor cascade from being crowded out.
- Dropping immediately to 3 risks historical-chain regressions for no player-experience gain.
- Mutex enforcement is behavior-changing but does not require new save shape if it only filters same-turn candidates.
- Persisted overflow queue requires a new state field, migration/default/validator tests, and scenario hash proof; it should not be bundled with mutex filtering.

## Proposed Semantics

### Candidate Collection

- Preserve current candidate eligibility and probability gates.
- Preserve canonical candidate order: `(priority ?? 100, trigger.turn_min ?? MAX_SAFE_INTEGER, id)`.

### Mutex Filtering

- Iterate candidates in canonical order.
- If a candidate has no `mutex_group`, keep it.
- If a candidate has `mutex_group` and that group has not been seen this turn, keep it and mark the group as seen.
- If a candidate has `mutex_group` and that group has already been kept this turn, suppress it for this turn.
- Report suppressed mutex ids separately from overflow ids.

### Per-Turn Cap

- Keep `MAX_EVENTS_PER_TURN = 4` until a fresh scenario proof shows a 3-event cap does not regress historical chains.
- Apply the cap after mutex filtering.

### Overflow Queue

- Do not persist overflow in the mutex slice.
- Leave current overflow report fields in place.
- Future queue slice should add a state field only after naming its owner, schema version, migration default, validator shape, replay behavior, and save-roundtrip proof.

## Required Tests for Mutex Slice

- Two eligible events in the same `mutex_group` keep the canonical first and suppress the second.
- A suppressed mutex event does not count toward the four-event cap.
- Overflow ids are calculated after mutex filtering.
- Same-registry shuffled input yields the same fired ids, suppressed mutex ids, and overflow ids.
- Existing event evaluator tests remain green.

## Required Tests for Future Queue Slice

- Legacy saves materialize an empty queue/default.
- Current-version saves reject malformed queue shape.
- Overflowed ids persist in canonical order.
- Next-turn queue candidates are considered before newly eligible candidates unless a canon decision says otherwise.
- Replayed save/load preserves queued overflow byte-identically.
- Scenario/baseline proof explains any hash drift.

## Stop Gates

- Do not implement persisted overflow queue without schema/migration/validator proof.
- Do not drop the cap from 4 to 3 without a scenario proof that the historical cascade remains intact.
- Do not use mutex to hide sensitive-history or source-blocked authoring problems.
- Do not author new event prose as part of the mutex/overflow slice.
