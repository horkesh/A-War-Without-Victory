# Paramilitary Truth Fixes

Date: 2026-07-13

## Scope

Corrected four related War-phase truth failures in the paramilitary sweep path:

- Civilian killings now update `civilian_casualties`, the displacement event log, and the municipality's `displacement_state.lost_population` plus `last_updated_turn`.
- Week 20 is the final active week. Week-21 formations dissolve before movement, capture, or casualty effects, and approved week-21 requests cannot spawn formations.
- Every paramilitary dissolution leaves the formation inactive, disbanded, degraded, and at zero personnel.
- Paramilitary control flips use a typed `paramilitary` mechanism and receive their own scenario attribution bucket instead of being reported as combat.

## Implementation

- Changed `PARAMILITARY_FADE_WEEK` from 28 to 20.
- Added an activity-expiry guard before the active-formation resolution path and a matching mode-aware guard when approved requests are resolved.
- Extended the existing civilian-casualty write with the canonical municipal population-loss aggregate when that municipality state exists.
- Extended the `ControlEvent` mechanism union, event consistency allowlist, attribution summaries, and scenario reporting contract with `paramilitary`.
- Synchronized Engine Invariants, Systems Manual, the determinism matrix, militia formation design, and cascade writer/consumer documentation. FORAWWV was not edited.

## Test-First Evidence

The new focused tests failed before implementation on the week-21 spawn and activity paths, stale readiness, combat attribution, missing municipal population loss, and missing attribution bucket. A separate validator test then failed until `paramilitary` was added to the accepted control-event mechanism contract.

Final focused verification:

- `npm.cmd run test:vitest -- tests/paramilitary_sweep.test.ts tests/control_change_attribution.test.ts tests/control_event_consistency.test.ts tests/scenario_operation_diagnostics.test.ts`: 4 files / 79 tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run canon:check`: stopped without a result at the user's direction to avoid further broad checks in the shared tree.
- Read-only `npm.cmd run test:baselines`: completed before that direction and stopped at `apr1992_52w/activity_summary.json`; expected hash `f70a0d2263392b810ad166dfa1e67b40872be555317412aefb1ea74f0d132b56`, actual hash `6c7af00158b5ccefd4561b685cb63f651c5a9dd5490bf85b60c21c4521e26447`. The week-20 correction intentionally changes activity, but concurrent simulation edits prevent sole attribution. No baseline or generated artifact was refreshed.

## Determinism And Risk

The changes use existing stable iteration and integer state updates and add no randomness, timestamp, locale dependence, or unordered traversal. The expected output impact is fewer post-week-20 paramilitary actions, lower population availability after paramilitary killings, and separate attribution totals. Municipality population state is updated only when its canonical row already exists; the sweep path does not fabricate missing population baselines.
