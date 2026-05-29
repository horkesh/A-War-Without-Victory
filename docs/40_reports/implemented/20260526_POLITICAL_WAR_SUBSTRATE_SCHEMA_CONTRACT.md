# Political War Substrate Schema Contract

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** Optional `GameState` floor 487 (`sim` 304, `state` 175, `derived` 8)
**Result:** Optional `GameState` floor 481 (`sim` 304, `state` 169, `derived` 8)

## Summary
- Promoted six already-migrated political war substrate records to required persisted `PoliticalState` fields.
- Added current-version rejection coverage and legacy migration proof for the full field family.
- Kept defaults deterministic and empty; no supply, exhaustion, control-strain, scenario, event, combat, or historical-content scaling changed. The one shape change is that absent live supply condition is now represented as the required empty record `{}` instead of deleting the field.

## Changes Made

### Schema Contract
- `src/state/game_state.ts`: made `political.war_consolidation_until`, `political.war_control_strain`, `political.war_supply_pressure`, `political.war_supply_condition`, `political.war_exhaustion`, and `political.war_exhaustion_local` required records.
- `src/state/validateGameState.ts`: added required-field inventory entries at v6 for consolidation/control strain and v7 for supply/exhaustion records.
- `src/state/serialize.ts`: stopped current-version canonicalization from silently backfilling the two v6 political records after migration validation; legacy v6 migration still owns their `{}` defaults.

### Tests And Fixtures
- `tests/save_migration_validator_rejection.test.ts`: added current-version rejection coverage for missing political war substrate records.
- `tests/save_migration_versioned_steps.test.ts`: added v1 legacy migration proof that all six records materialize as `{}`.
- Updated direct minimal `PoliticalState` fixtures in CLI, smoke, warroom, and focused test mocks with empty records or explicit mock casts where the test intentionally uses narrow political state. Retained a runtime backstop in `updateSupplyPressure(...)` for intentionally narrow in-memory builders that bypass deserialization.

### Diagnostics
- `tests/strict_null_inventory_progress.test.ts`: updated optional `GameState` pin from 487 to 481 and state-domain count from 175 to 169.
- `tools/diagnostics/output/save_migration_drift.json`: regenerated required-field inventory; strict required field count is now 36.

## Files Changed
| File | Change |
| --- | --- |
| `src/state/game_state.ts` | Required six political war substrate records. |
| `src/state/validateGameState.ts` | Added v6/v7 required-field validator inventory entries. |
| `src/state/serialize.ts` | Removed serializer-side current-version backfill for promoted v6 political records. |
| `src/sim/combat/supply_pressure.ts` | Replaced required-record delete path with deterministic empty-record assignment and retained an in-memory-builder guard for `war_supply_pressure`. |
| `src/cli/*`, `src/index.ts`, `src/ui/warroom/warroom.ts` | Added empty political substrate records to direct minimal state fixtures. |
| `tests/save_migration_validator_rejection.test.ts` | Added current-version rejection cases. |
| `tests/save_migration_versioned_steps.test.ts` | Added legacy `{}` default proof. |
| `tests/strict_null_inventory_progress.test.ts` | Updated strict-null optional-field pins. |
| `tools/diagnostics/output/save_migration_drift.json` | Regenerated drift artifact. |

## Verification
- Red first: focused validator/versioned suites failed 6/24 before promotion because missing current-version political records were accepted.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` passed; total 481, state 169, sim 304, derived 8, unknown 0.
- `node tools\diagnostics\save_migration_drift_audit.cjs` passed; 0 anonymous defaults.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_drift_audit.test.ts tests\strict_null_inventory_progress.test.ts tests\supply_pressure_vs_condition_reconciliation.test.ts tests\production_facilities_a3.test.ts --reporter=dot` passed; 135/135 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\combat_supply_pressure.test.ts --reporter=dot` passed; required-record empty-condition semantics and narrow-builder pressure guard covered.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` passed after temporarily linking the worktree Map UI dependency directory to the root dependency install; the temporary junction was removed after verification.
- `git diff --check` passed.

## Next Steps
- Continue Phase 2 with another small optional-field family only after confirming migration/default/validator readiness.
- Do not broaden fixture churn beyond the selected field family.
- Keep full typecheck blocked on the local map UI dependency setup unless the worktree dependency links are restored.
