# Movement observer numeric-schema correction

## Result

The strict reader now requires positive safe-integer `week_index`, phase-receipt `completed_turn`, and terminal-receipt `completed_turn` values. Receipt and terminal phase indexes must be integers, while manifest indexes remain the exact zero-based ordered sequence. CLI expectations accept only canonical positive decimal turns such as `actor:21`; zero, decimal, signed, scientific, and nonnumeric spellings fail at the argument boundary.

The real production movement fixture now explicitly asserts that both observer-OFF and observer-ON `runTurn` results have `status === 'success'` before using their reports and states as weekly-emittable evidence. No observer, pipeline, reporting, gameplay, or state source was changed in this correction.

## Exact evidence

- Numeric RED command: `node node_modules/vitest/vitest.mjs run tests/movement_phase_coverage_diagnostic.test.ts tests/movement_phase_diagnostic.test.ts`.
- Numeric RED result: exit `1`; 1 failed and 18 passed tests. The exact string-turn artifact expected exit `1`, but the old reader returned exit `0`. Evidence: `continuation4_movement_observer_20261004_numeric_red.log` and `.exit.txt`.
- Numeric GREEN command: the same two-file command.
- Numeric GREEN result: exit `0`; 2 files passed, 20 tests passed. This includes the exact string `"21"` weekly/receipt/terminal negative, malformed CLI turn spellings, malformed artifact indexes, and explicit OFF/ON success status assertions. Evidence: `continuation4_movement_observer_20261004_numeric_green.log` and `.exit.txt`.
- Current reader syntax command: `node --check tools/diagnostics/movement_phase_coverage.cjs`.
- Current reader syntax result: exit `0`. Evidence: `continuation4_movement_observer_20261004_numeric_syntax.log` and `.exit.txt`.
- No typecheck, campaign, prefix, replay, full suite, unaffected dispatcher/topic check, or observer/pipeline rewrite was run.

## Current hashes

```text
bb0a61a449e86304bfaa2fb8306a7082ef9c963ca10e51712175d5742788a6a9  tools/diagnostics/movement_phase_coverage.cjs
166406a0451e9e655aa7cb4a43b9e1023f75ff3b134b99fdc3a18d58a7b9cdd1  tests/movement_phase_coverage_diagnostic.test.ts
4e8bcd9b72153c3d66300a79f8c326cad086d947884387a42287f14710793d8c  tests/movement_phase_diagnostic.test.ts
```

## Preserved limitations

The initial untracked execution summary was overwritten during the prior correction and has no byte-for-byte backup. The labeled tool readback retained by root is not recovery of those original bytes. The earlier correction RED remains incomplete for the reader because its reader fixture had a syntax error; no retrospective reader RED is claimed. The new numeric RED independently and meaningfully proves this specific fail-open against the pre-correction reader.

The accepted structural observer still prepares future measurement only. It does not establish a historical writer, reconstruct turns 137–139 or turn 517, close campaign acceptance gaps, or authorize gameplay correction.
