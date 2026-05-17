# Performance Wall Clock Follow-Up Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Reduce or re-scope the current wall-clock performance gap by separating benchmark measurement cost from simulation work, then optimizing the largest verified hotspots toward the roadmap target.

## Architecture

Performance work proceeds from measured evidence. Benchmarks must separate pure simulation turn time, diagnostics/reporting overhead, UI hydration cost, and artifact serialization. Optimizations must preserve deterministic ordering and outputs.

## Tech Stack

- Existing benchmark and diagnostic scripts
- Node performance timing APIs
- Vitest or script-based regression checks
- Current determinism matrix and scenario diagnostics

## Implementation Tasks

1. Reproduce baseline
   - Run the current benchmark that reported the wall-clock residual.
   - If no single canonical benchmark exists, start with `npm.cmd run sim:scenario:run:40w` and record that limitation before adding new instrumentation.
   - Record machine, Node version, command, scenario, turn count, and output paths.
   - Confirm whether timing includes diagnostics, logging, serialization, or UI work.

2. Split benchmark phases
   - Add timing buckets for simulation, diagnostics, serialization, and reporting.
   - Ensure instrumentation is deterministic and does not alter outputs.
   - Emit machine-readable timing JSON.

3. Identify hotspots
   - Profile the highest-cost bucket first.
   - Do not optimize before one bucket is shown to dominate the residual.
   - Inspect loops for repeated sorting, geometry scans, object churn, or redundant recomputation.
   - Document any suspected bottleneck before editing.

4. Optimize in guarded batches
   - Make one optimization batch at a time.
   - Preserve stable ordering for maps, sets, arrays, and serialized output.
   - Add regression tests or snapshot comparisons where output could change.

5. Re-run determinism and scenario checks
   - Compare before/after outputs for representative seeds.
   - Verify no scenario outcome changes unless explicitly intended.
   - Record performance delta and confidence.

6. Update roadmap target status
   - If the target is achieved, move item to closed with evidence.
   - If not achieved, split remaining bottlenecks into new plans with measured estimates.
   - If the target is unrealistic for full diagnostics mode, redefine target modes clearly.

## Files To Touch

- Existing benchmark scripts under `scripts/`, `tools/`, or `tests/bench*`
- Likely profiling/diagnostic owners discovered from `package.json` benchmark scripts
- Hotspot modules only after measurement
- `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` if benchmark coverage changes
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Run benchmark before and after.
- Run determinism checks for touched simulation paths.
- Run focused tests for optimized modules.
- Run `npm.cmd run typecheck` if TypeScript changes are made.

Required evidence table: `bucket | before ms | after ms | output hash/status | evidence path`.

## Documentation And Ledger

- Record baseline, optimized result, and benchmark mode definitions.
- Add implemented report for any optimization batch.
- Add ledger entry with command evidence.

## Stop Gates

- Stop if profiling cannot reproduce the residual.
- Stop if an optimization changes deterministic output without explicit design approval.
- Stop if benchmark instrumentation dominates the timing being measured.

## Commit And Closeout

- Commit instrumentation separately from optimization.
- Stage only benchmark/profiling scripts, measured hotspot code, focused tests, determinism docs, implemented report, roadmap, and ledger files owned by this plan.
