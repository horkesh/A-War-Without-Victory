# Performance Wall Clock Target Truth Report

**Date:** 2026-05-18
**Lane:** performance diagnostics/scripts/reports/tests
**Result:** Added a report CLI that turns scenario `timing.json` sidecars into target-truth JSON/Markdown summaries.

## Summary

- Added `tools/perf/wall_clock_target_report.ts` to read an existing timing sidecar, compute per-turn bucket cost, identify the dominant bucket, and state the gap against a configurable target.
- Added `npm.cmd run perf:wall-clock:report -- --timing <path>` as the stable entrypoint.
- Added tests for report shape, bucket ordering, evidence table columns, and absence of timestamp-shaped output.
- No engine behavior or deterministic save/artifact schema changed.

## Evidence From Existing Timed 40w Run

Source timing sidecar: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json`

| bucket | before ms | after ms | output hash/status | evidence path |
|---|---:|---:|---|---|
| simulation | 76854.151 | n/a | 22328b81ef2cb531 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json` |
| serialization_artifacts | 9905.711 | n/a | 22328b81ef2cb531 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json` |
| setup | 2477.740 | n/a | 22328b81ef2cb531 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json` |
| diagnostics_reporting | 138.142 | n/a | 22328b81ef2cb531 | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json` |

Observed total: 93798.472ms over 40 turns = 2344.962ms/turn.

Against a 100ms/turn target, the observed full-harness mode is 23.450x over target. The dominant bucket remains `simulation`, so the next optimization lane should profile that bucket before editing engine behavior.

## Determinism

The new report consumes timing sidecars only. It does not write timing values into saves, `run_summary.json`, `weekly_report.jsonl`, final saves, replay artifacts, or scenario state.

## Files Changed

| File | Change |
|---|---|
| `tools/perf/wall_clock_target_report.ts` | New pure builder/formatter plus CLI for JSON/Markdown target-truth reports. |
| `tests/wall_clock_target_report.test.ts` | New focused report-shape tests. |
| `package.json` | Added `perf:wall-clock:report` script. |
| `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_TARGET_TRUTH_REPORT.md` | This implementation report. |

## Verification

- Red first: `npx.cmd vitest run tests\wall_clock_target_report.test.ts --reporter=dot` failed because `tools/perf/wall_clock_target_report.ts` did not exist.
- Green focused: `npx.cmd vitest run tests\wall_clock_target_report.test.ts --reporter=dot` passed 2/2.
