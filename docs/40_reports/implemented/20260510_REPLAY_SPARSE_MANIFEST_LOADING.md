# Replay Sparse Manifest Loading

Date: 2026-05-10

## Scope

Closed the large replay sidecar loading gap for the current replay consumer. The harness still emits the full `replay_save_sequence.json` for compatibility, but it now also emits a compact `replay_save_manifest.json` containing deterministic per-frame summaries. Desktop load prefers the manifest, so the renderer can power the endgame replay scrubber without parsing a multi-GB replay array.

## Implementation

- `src/scenario/replay_save_emit.ts` now writes `replay_save_manifest.json` beside `replay_save_sequence.json` from both finalizer paths.
- `src/sim/replay/replay_manifest.ts` defines the manifest shape.
- `src/sim/replay/replay_summary_player.ts` adds a read-only player over summary frames.
- `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, `useIPC`, `useDesktopSession`, `gameStore`, and `GameStateAdapter` now carry the manifest as an optional sidecar.
- `ReplayScrubber` renders from full frames when available and from the manifest when the full sequence is absent.

## Determinism

The manifest is read-only and derived from canonical serialized replay frames in turn order. Summary extraction uses the deterministic `buildReplayFrameSummary` path, including sorted control counts. No engine state, scenario data, OOB data, combat math, or canon files changed.

## Verification

- Red tests first:
  - `tests/replay_save_emit.test.ts` failed on missing `replay_save_manifest.json`.
  - `tests/replay_player.test.ts` failed on missing `replay_summary_player`.
  - `tests/ui/endgame_verdict_screen_mount.test.ts` failed because manifest-only replay did not render.
- Green focused replay suite:
  - `npx.cmd vitest run tests/replay_save_emit.test.ts tests/replay_player.test.ts tests/ui/endgame_verdict_screen_mount.test.ts --reporter=dot`
- Engineering-doc guard updated:
  - `npx.cmd vitest run tests/replay_surface_truth.test.ts --reporter=dot`
- Typecheck:
  - `npm.cmd run typecheck`

## Remaining Replay Work

Richer replay-map inspection remains future polish. The current closure makes replay load-safe and reviewable at summary level without treating the full replay sequence as a renderer payload requirement.
