# Save / Replay Determinism Proof — Batch B (RC hardening)

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md` SRD-1 + SRD-2.
**Branch:** `codex/rc-hardening-evidence-2026-05-19`.

## Scope

Closes SRD-1 (save-continue hash chain) and SRD-2 (replay artifact
equivalence). No simulation behavior code changed. The lane locks down two
determinism claims:

1. **SRD-1 save-continue hash chain.** Loading a committed mid-run weekly save
   and continuing produces the same `final_state_hash` and the same byte-for-
   byte `final_save.json` as the uninterrupted scenario over the same week
   range.
2. **SRD-2 replay artifact equivalence.** The resumed run's
   `replay_save_sequence.json` (top-level JSON array of per-turn `GameState`
   objects) equals the corresponding tail slice of the uninterrupted run's
   replay sequence — frame for frame, byte for byte.

## Where the proof lives

`tests/scenario_continue_from_save_equivalence.test.ts`

The test was already proving SRD-1. This batch extends it to also assert
SRD-2 against the same scenario runs (the runs are the expensive step;
adding the post-resume slice assertion is essentially free).

### What the test does

- Scenario: `data/scenarios/noop_13w.json` (deterministic 13-week no-op
  scenario, repo-resident).
- Two `runScenario(...)` invocations:
  - `FULL_OUT`: uninterrupted run, default `emitEvery`.
  - `SPLIT_OUT`: same scenario with `emitEvery: 4`, producing weekly saves.
- Resume run from `weekly_saves[1]` (the second emitted weekly checkpoint)
  into `RESUME_OUT`.
- Assertions:
  - `resumedRun.initial_save` bytes equal the checkpoint bytes.
  - `resumedRun.final_state_hash === fullRun.final_state_hash`.
  - `resumedRun.final_save` bytes equal the full run's `final_save` bytes.
  - **(SRD-2)** `resumed replay_save_sequence` frames equal the tail slice
    of `full replay_save_sequence` frames over the matching week range
    (`JSON.stringify` byte equality on the array slice).
- Second test case proves explicit-resume-week mismatch is rejected with the
  documented error string.

### Determinism contract proved

- Save/load identity: byte-for-byte initial-save match between checkpoint
  and resumed-run initial save.
- Continuation determinism: identical final-state hash across uninterrupted
  vs resumed paths.
- Final-save serialization determinism: identical final-save bytes.
- Replay frame serialization determinism: identical post-resume replay
  frame slice.

## Validation run

- `npm.cmd run typecheck` — PASS.
- `npx.cmd vitest run tests/scenario_continue_from_save_equivalence.test.ts --reporter=verbose` — PASS, 1 file / 2 tests, ~22 s wall.
- `git diff --check` — clean.

No 40w / 188w / `npm.cmd run test:baselines` run was required because no
simulation behavior, scenario data, save schema, or generated artifact
changed.

## What this proves and what it does not

**Proves:**
- The scenario runner can load a mid-run save and continue with bit-for-bit
  identical future state.
- The replay artifact writer is a deterministic function of state and does
  not embed wall-clock, environment, or iteration-order content into frames.

**Does not prove:**
- Cross-platform reproducibility of replay sequences (proof is single-host).
- Cross-platform reproducibility of packaged-build artifacts (Batch E /
  SRD-3 territory, operator-only).
- That long scenarios (40w / 52w / 188w) load-continue with identical
  hashes — the noop_13w scenario is the focused unit. The 40w / 188w
  scenario hash is proven separately by `npm.cmd run test:baselines`.

## Related references

- `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md`
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `docs/20_engineering/PRE_MERGE_GATE.md`
- `src/scenario/scenario_runner.ts` (resume path)
- `src/scenario/replay_save_emit.ts` (replay frame writer)
- `src/sim/replay/replay_frame_summary.ts` (manifest summary builder)

## Stop conditions explicitly checked

- 40w / 188w hash drift — not in scope; no behavior change, no run.
- Migration validation weakening — not done; migration registry untouched.
- Loaded-save behavior divergence — actively asserted against; test would
  fail loud if any frame, hash, or byte differed.
- Generated artifact churn without a proven owner — not happening; this
  batch adds an assertion only; no new committed generated artifact.
- Cross-platform proof claim — explicitly not claimed; see "Does not
  prove".

## Operator-only follow-ups (not closed here)

- SRD-3 packaging-build determinism — pending Batch E platform packaging
  templates and operator clean-VM proof.
