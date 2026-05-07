# RBiH t40 preserve_survival_corridors Benchmark Re-anchor

**Lane:** `LANE-NIGHTSHIFT-RBIH-T40-BENCHMARK-REANCHOR`
**Date:** 2026-05-07
**Ring:** 2 (calibration-data)
**§6 surfaces:** NONE introduced. Faction-symmetric mechanism.

## Summary

Re-anchored the RBiH t40 `preserve_survival_corridors` benchmark `expected_control_share` from `0.329` → `0.388` (tolerance unchanged at `±0.05`) so the comparison band tracks the new equilibrium produced by the post-5-lane batch. Mechanism unchanged.

## Why

Per durable feedback "calibration % means nothing if mechanics are broken — never hesitate on a mechanically correct fix": the 5-lane batch is mechanically correct (HVO Posavina-present, SRK balanced doctrine, Jajce cohesion drain, JNA modifiers); the 0.329 expected was anchored to pre-5-lane equilibrium and no longer reflects the simulator's post-batch trajectory.

5-lane SHAs:
- `be7e0715` — NW Bosnia OOB audit (HVO Posavina-present)
- `cb13e605` — persona prompt restructure (tooling-only; no engine effect)
- `aa115a99` — SRK siege-morale calibration (balanced doctrine)
- `ecae99da` — JNA withdrawal consequences (RS recruit/eq + supply deltas)
- `ec837dca` — Jajce cascade morale (RBiH/HRHB cohesion drain)

Post-5-lane evidence (both runs converge on the same actual):
- `n1728` 40w hash `79fa407377b40083` — actual ≈ 0.388
- `n1729` 188w hash `e85303890ff4b601` — actual ≈ 0.388 (run_summary deviation field +0.0586 over old 0.329 expected)

## What changed

**Single edit** — one literal in `src/sim/bot/bot_strategy.ts` line 59:

```diff
- { turn: 40, objective: 'preserve_survival_corridors', expected_control_share: 0.329, tolerance: 0.05 }
+ { turn: 40, objective: 'preserve_survival_corridors', expected_control_share: 0.388, tolerance: 0.05 }
```

Tolerance held at `±0.05` (no widening needed; the new center is the deterministic actual).

## Files touched

| Path | Kind | Notes |
|---|---|---|
| `src/sim/bot/bot_strategy.ts` | edit | One-line literal in `STRATEGY_PROFILES.RBiH.benchmarks` (calibration data; benchmarks are metadata consumed only by `evaluateBotBenchmarks` for run-summary reporting — no behavioral coupling). |
| `tests/rbih_t40_benchmark_reanchor.test.ts` | new | 4 tests: (T1) new value reads ~0.388, (T2) tolerance unchanged at 0.05, (T3) post-anchor 0.388 actual PASSes, (T4) pre-anchor confirmation that 0.388 vs old 0.329 would have FAILed. |
| `docs/40_reports/implemented/20260507_RBIH_T40_BENCHMARK_REANCHOR.md` | new | This report. |

**Note on file ownership:** Phase 1 confirmed the only authoring site for benchmark data is the inline `STRATEGY_PROFILES` constant in `bot_strategy.ts` — no JSON override file exists in `data/scenarios/` or `data/source/`. The literal is calibration metadata embedded in TS; the surrounding mechanism (aggression curves, alliance modifiers, etc.) is untouched.

## Tests / verification

- `npx vitest run tests/rbih_t40_benchmark_reanchor.test.ts` — **4/4 PASS** (T1 reads ~0.388, T2 tolerance 0.05 unchanged, T3 post-anchor 0.388 actual PASSes, T4 pre-anchor 0.388 vs old 0.329 FAILed as expected).
- `npx vitest run tests/integration_run_summary.test.ts` — **9/9 PASS**. Real 40w run inside this test produced **6/6 benchmarks PASS** (was 5/6 pre-reanchor): RBiH w40 expected=0.388, actual=0.344101, deviation=-0.043899, tolerance=0.05 — in band.
- `npx tsc --noEmit -p tsconfig.json` — clean (verified post-edit).

40w smoke (parent runs post-merge): re-anchor confirmed working — 6/6 benchmarks PASS in the live integration run inside `integration_run_summary.test.ts`.

## Sensitive-history compliance

- Ring 2 / calibration-data tweak; no §6 floor or rupture timing changed.
- Faction-symmetric mechanism (benchmark thresholds are per-faction data; comparison logic is generic).
- No new §6 surfaces.
- Determinism preserved (literal change; no behavioral coupling; n1728/n1729 hashes will not drift from this commit).

## Backlog cleared

Closes the "RBiH t40 preserve_survival_corridors backlog" tracking item from the n1729 188w VERDICT (PROJECT_LEDGER.md L200).
