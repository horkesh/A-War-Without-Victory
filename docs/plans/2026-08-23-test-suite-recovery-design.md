# Test Suite Recovery and Acceleration Design

**Status:** Approved for implementation by owner on 2026-08-23.

## Problem

The complete Vitest suite takes roughly 62 minutes on the current Windows machine and is red. A clean isolated checkout reproduces 15 failures in seven files. The dirty primary checkout reports four additional collapse failures because those tests discover untracked/local `runs/` artifacts. Test outcomes therefore depend on ambient checkout contents.

The runner also forces every file through one worker. One sector-partition property file consumes roughly 34 minutes, repeated source-inventory scans consume roughly 50 seconds, and multiple scenario suites independently rebuild equivalent campaign fixtures.

## Design

Correctness recovery and acceleration are separate stages. First, every failing contract is traced to its owning source and repaired without changing simulation truth or baseline pins. Collapse verdict tests are split into a hermetic unit contract and an explicit evidence gate: normal Vitest validates selection/refusal behavior against temporary fixtures, while verdict-grade runs require caller-supplied artifact directories and fail closed when evidence is absent or incomparable.

Second, a deterministic test-inventory tool classifies files by shared-state hazards and records measured durations. Parallel execution is enabled only through isolated Vitest processes receiving disjoint, duration-balanced manifests. Tests that write tracked files, use fixed ports, select ambient run directories, or mutate shared process configuration remain in a serial lane until individually isolated.

Expensive tests retain their discriminating power. Performance work removes repeated fixture loading, source scans, and uncontrolled logging before reducing any trial count. Exhaustive property ranges may be partitioned across processes, but the union must equal the existing seed/mode space.

## Non-negotiable constraints

- Do not modify `data/derived/scenario/baselines/manifest.json`.
- Do not change engine/calibration behavior while repairing stale test contracts.
- No randomness, timestamps, filesystem-order dependence, or wall-clock data in persisted outputs.
- Every verification parser gets a known-failure positive control.
- A clean checkout and a checkout containing unrelated `runs/` directories must produce the same ordinary-suite result.
- Verdict-grade collapse checks must reject missing, dirty, overridden, or cross-commit evidence.
- Test acceleration must preserve the complete test/file inventory and deterministic outputs.

## Success criteria

1. All known focused failures pass for reasons tied to authoritative source contracts.
2. Ordinary Vitest is independent of ambient `runs/` contents.
3. The full suite passes twice from a clean worktree with no tracked-file changes.
4. Parallel and serial runs report the same discovered files, tests, outcomes, and deterministic artifact hashes.
5. Measured full-suite wall time is materially lower, with timing evidence committed as a report rather than asserted from expectation.
