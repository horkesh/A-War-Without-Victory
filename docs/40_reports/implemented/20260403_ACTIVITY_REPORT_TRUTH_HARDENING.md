# 2026-04-03 - Activity report truth hardening

## Summary
- Removed the proxy-based fallback from `deriveWeeklyActivityCounts(...)` in `scenario_runner.ts`.
- Weekly activity summaries now use the canonical Phase F displacement trigger report when present and otherwise stay at zero instead of reconstructing counts from legacy proxy fields.

## Files changed
- `src/scenario/scenario_runner.ts`
- `tests/scenario_activity_truth.test.ts`

## Why
- `phase_f_displacement.trigger_report` is already the canonical owner of:
  - `front_active_set_size`
  - `pressure_eligible_size`
  - `displacement_trigger_eligible_size`
- The old fallback re-derived those values from:
  - `state.military.front_segments`
  - `turnReport.front_pressure.pressure_deltas`
  - realized municipal displacement outcomes
- That produced plausible-looking numbers from non-canonical proxies and turned stale artifacts into fake engine-health signals.

## What changed
- `deriveWeeklyActivityCounts(...)` now has a single truth contract:
  - use Phase F trigger metrics when present
  - otherwise return zeros
- The scenario activity regression now asserts that absent canonical trigger metrics do **not** trigger proxy reconstruction.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\scenario_activity_truth.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\brigade_territory_reconciliation.test.ts tests\\commander_driven_brigade_assignment.test.ts`

## Follow-up
- If a future run ever shows zeros unexpectedly again, the right fix is to restore the Phase F trigger report at production time, not to reintroduce proxy-based reconstruction in reporting.
