# Replay Autoplay Controls

Date: 2026-05-10

## Scope

Closed the basic playback-control gap in the endgame replay consumer. This is UI/read-model work only: it does not advance turns, run simulation phases, mutate saves, or write replay artifacts.

## Implementation

- Added read-only Play/Pause, previous-frame, and next-frame controls to `ReplayScrubber`.
- Playback advances the component-local cursor at a fixed interval and stops on the final frame.
- Manual scrub, first/last jump, and one-frame step actions pause playback.
- Sparse manifest summaries and full replay sequences use the same local control path; full replay sequences still retain the existing `Inspect Map` action.

## Verification

- Red interaction proof first:
  - `npx.cmd vitest run tests/ui/replay_scrubber_autoplay.test.ts --reporter=dot` failed on missing playback controls.
- Green focused proof:
  - `npx.cmd vitest run tests/ui/replay_scrubber_autoplay.test.ts --reporter=dot` passed 3/3 after wiring controls.

## Canon And Roadmap

`MASTER_ROADMAP.md`, `Systems_Manual_v0_9_0.md`, and `TACTICAL_MAP_SYSTEM.md` now record that the replay scrubber has basic read-only playback controls. Remaining replay work is richer cinematic presentation and fixture-backed visual QA, not absence of a product-shell replay consumer.
