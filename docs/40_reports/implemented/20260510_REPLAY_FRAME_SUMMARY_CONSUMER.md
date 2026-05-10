# Replay Frame Summary Consumer

Date: 2026-05-10

## Scope

Closed the obvious product-shell gap in the replay consumer by adding deterministic selected-frame summary data to the existing `VerdictScreen` replay scrubber.

The replay consumer remains read-only:

- no turn advancement
- no engine mutation
- no scenario data changes
- no canon, OOB, operation, or political-controller mutation

## Implementation

- Added `src/sim/replay/replay_frame_summary.ts`.
- Extended `ReplayScrubber` with summary cards for active formations, casualties, displaced population, and control counts by faction.
- Added a replay-player regression test proving the summary is deterministic and non-mutating.

The summary reader sorts object keys with `strictCompare`, does not use randomness, wall-clock time, or locale formatting, and tolerates absent/legacy replay shapes.

## Verification

- Red test first: `npx.cmd vitest run tests/replay_player.test.ts --reporter=dot` failed on the missing `replay_frame_summary` module.
- Green replay regression: `npx.cmd vitest run tests/replay_player.test.ts --reporter=dot` passed 7/7.
- Typecheck: `npm.cmd run typecheck` passed after tightening the replay summary cast.

## Remaining Replay Work

- Richer map-state inspection inside the replay view.
- Sparse or streaming UI loading for very large replay sidecars.
- Optional visual QA against a loaded replay fixture once a representative local replay artifact is available.
