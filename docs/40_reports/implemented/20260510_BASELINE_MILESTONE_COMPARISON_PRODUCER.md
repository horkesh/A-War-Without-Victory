# Baseline Milestone Comparison Producer

**Date:** 2026-05-10  
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison  
**Scope:** Historical baseline data + comparison producer

## Summary

The milestone comparison UI now has authored producer data. `data/reference/historical_baseline.json` includes the first two historical milestone rows:

- Srebrenica Genocide, week 171, resolved from the matching rupture consequence.
- Dayton Accords, week 182, resolved from the player run's war duration.

`compareToHistorical(...)` emits `milestone_comparison` directly from that baseline, sorted by historical week and id. `buildCostLedger(...)` now preserves `recorded_turn` on rupture consequence summaries so Srebrenica can compare player week against historical week when the rupture occurs.

## Implementation

- Added `HistoricalBaselineMilestone` to the baseline type.
- Added `recorded_turn?: number` to Cost Ledger rupture summaries.
- Added milestone-row production to `compareToHistorical(...)`.
- Authored Srebrenica and Dayton rows in `historical_baseline.json`.

## Tests

Red-first failures proved the missing producer:

- Cost Ledger dropped `recorded_turn`.
- `compareToHistorical(...)` emitted no milestone rows.
- Avoided ruptures had no absent milestone row.

Focused green suite: `tests/cost_ledger_comparison.test.ts` passed 16/16.

## Canon Posture

Ring 2 downstream comparison only. No rupture trigger, scoring rule, termination rule, or player lever changed. The comparison producer records timing differences; it does not make timing a score.
