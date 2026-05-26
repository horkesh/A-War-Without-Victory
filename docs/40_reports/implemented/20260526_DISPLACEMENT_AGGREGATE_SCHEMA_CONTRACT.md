# Displacement Aggregate Schema Contract

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** Optional GameState inventory 491 total / 178 state-domain fields
**Result:** Optional GameState inventory 488 total / 175 state-domain fields

## Summary
- Promoted the v8 displacement aggregate records to required persisted `DisplacementDomainState` contract fields.
- Added current-version validator rejection coverage for missing and invalid aggregate records.
- Preserved legacy compatibility by proving v1 and v7 saves materialize all three aggregate records as `{}` through migration, including legacy saves with no `displacement` root.

## Changes Made

### Save Schema Contract
- `src/state/game_state.ts`: removed optional markers from:
  - `displacement.displacement_humanitarian_aggregates`
  - `displacement.displacement_origin_dest_arrivals`
  - `displacement.displacement_recent_by_turn`
- `src/state/validateGameState.ts`: added v8 required-field checks requiring each aggregate to be a non-array record.

### Tests and Fixtures
- `tests/save_migration_validator_rejection.test.ts`: added current-version missing/invalid rejection tests for all three v8 aggregate records and expanded v1 migration proof.
- `tests/save_migration_versioned_steps.test.ts`: added v7 migration proof that all three aggregates materialize as `{}` and a no-`displacement`-root legacy migration proof for `displacement_event_log: []` plus the three v8 aggregate records.
- `tests/state/displacement_event_log.test.ts`: updated sparse empty-state expectations from absent aggregate maps to persisted empty records.
- Updated typed current-version CLI/UI/test fixtures that directly construct `DisplacementDomainState` so their empty displacement state includes the required aggregate records.
- `tests/strict_null_inventory_progress.test.ts`: pinned the confirmed inventory counts at 488 total optional GameState fields and 175 state-domain optional fields.

## Scenario Results

No scenario baseline regression was run. This slice changes only type/validator/default contract shape for already-migrated empty aggregate records; it does not change scenario data, event data, phase logic, combat logic, ordering, or generated outputs. Focused save-schema, migration, sparse-displacement, strict-null, and typecheck proof is sufficient for this contract slice.

## Lessons Learned
- The v8 aggregate maps were already migration-defaulted for saves with a displacement root; the remaining gap was the absent-root legacy path plus the TypeScript and validator contract.
- Sparse displacement behavior treated absence as empty-map behavior, so updating tests to `{}` did not expose semantic absence.
- Worktree typecheck needs the nested tactical-map package dependencies available under `src/ui/map/node_modules`; this session used a local junction to the already-installed parent dependency folder.

## Files Changed

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Required v8 displacement aggregate fields |
| `src/state/save_migration.ts` | Absent displacement root materialization for legacy saves |
| `src/state/validateGameState.ts` | v8 required-record validator checks |
| `src/cli/phase3a_ab_harness.ts` | Empty displacement fixture defaults |
| `src/cli/phase3abc_audit_harness.ts` | Empty displacement fixture defaults |
| `src/cli/phaseF0_null_political_control_settlements_report.ts` | Empty displacement fixture defaults |
| `src/cli/phaseF1_unknown_control_behavior_audit.ts` | Empty displacement fixture defaults |
| `src/cli/phaseF2_controlstatus_migration_audit.ts` | Empty displacement fixture defaults |
| `src/cli/phaseF4_unknown_control_attribution_audit.ts` | Empty displacement fixture defaults |
| `src/cli/sim_run.ts` | Empty displacement fixture defaults |
| `src/index.ts` | Empty displacement fixture defaults |
| `src/ui/warroom/warroom.ts` | Empty displacement fixture defaults |
| `tests/save_migration_validator_rejection.test.ts` | Missing/invalid current-save rejection tests and v1 migration proof |
| `tests/save_migration_versioned_steps.test.ts` | v1/v7 aggregate default proof |
| `tests/state/displacement_event_log.test.ts` | Sparse aggregate empty-state expectations |
| `tests/strict_null_inventory_progress.test.ts` | Inventory floor update |
| Focused typed test fixtures | Empty displacement fixture defaults |
| `docs/plans/COMMAND_BOARD.md` | Optional GameState row next-action update |
| `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` | Phase 2 status update |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Implemented report index update |
| `docs/40_reports/README.md` | 40_reports index update |
| `docs/PROJECT_LEDGER.md` | Ledger entry |

## Next Steps
- Continue Phase 2 with one remaining optional-field family selected from the current strict-null inventory.
- Keep the same proof shape: red current-version validator rejection, migration/default proof, sparse behavior audit, strict-null count confirmation, typecheck, and diff check.
