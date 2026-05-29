# Army Command Schema Contract

**Date:** 2026-05-26
**Lane:** Optional `GameState` schema contract / strict-null Phase 2
**Classification:** Persisted contract

## Summary
- Promoted the A2/C1 army-command observability records from optional `MilitaryState` fields to required persisted v10 contract fields:
  - `military.army_co_decision_traces`
  - `military.army_corps_directives_by_faction`
- Kept existing v10 migration defaults as empty records and added current-version validator enforcement.
- Left nested directive and trace metadata optional; this slice does not change command behavior, event behavior, scenario content, UI behavior, or generated combat output.

## Changes Made
### Schema Contract
- `MilitaryState.army_co_decision_traces` is now required at the top level.
- `MilitaryState.army_corps_directives_by_faction` is now required at the top level.
- `VERSION_REQUIRED_FIELDS` now treats both records as required as of schema v10.
- The existing v10 migration continues to materialize both records as `{}` for legacy saves.

### Fixture Alignment
- Current-version synthetic `GameState` and `MilitaryState` literals now include the two empty records.
- Legacy pre-v10 migration fixtures intentionally omit the fields where the test proves migration materialization.
- Save migration drift output now records 25 strict required fields, including both promoted v10 military paths.

## Determinism
- Determinism impact is schema-only. Empty-record defaults are inert, and no new randomness, timestamps, iteration order, scenario data, event timing, command decision logic, or combat path changed.
- Baseline regression stayed byte-identical: all scenarios match.
- The low-level `serializeGameState(...)` deterministic serializer remains a compatibility serializer for minimal fixtures; the persisted save/load boundary remains `serializeState(...)` / `deserializeState(...)`, with required-field validation on deserialize.

## Strict-Null Inventory
- Counted escape categories remain zero:
  - `as_factionid_casts 0`
  - `as_unknown_casts 0`
  - `as_any_casts 0`
  - `non_null_assertions_dot 0`
  - `non_null_assertions_index 0`
- Optional `GameState` fields now report `492`.
- Domain split from `strict_null_inventory.cjs --field-domains`:
  - `sim 305`
  - `state 179`
  - `derived 8`
  - `unknown 0`

## Files Changed
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Promoted the two command observability records to required `MilitaryState` fields |
| `src/state/validateGameState.ts` | Added v10 required-field validation |
| `tests/save_migration_validator_rejection.test.ts` | Added current-version rejection tests and legacy migration assertions |
| `tests/save_migration_versioned_steps.test.ts` | Added v10 default materialization assertions |
| `tests/migration_nested_ownership.test.ts` | Added required records to current-version synthetic fixtures |
| `tools/diagnostics/output/save_migration_drift.json` | Updated strict required-field audit output |
| CLI/UI/test fixture files | Added empty records to direct current-version `MilitaryState` literals |

## Verification
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; `optional_fields_game_state 492`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` - PASS; `sim 305`, `state 179`, `derived 8`, `unknown 0`.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `0 anonymous defaults`.
- `npx.cmd vitest run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\a2_army_co_substrate.test.ts tests\a3_army_order_interpretation.test.ts tests\c1_corps_directive_consumer.test.ts tests\corps_front_sector_corps_ownership.test.ts tests\emergency_retreat_reachability.test.ts tests\final_sector_reserve_band_truth.test.ts tests\final_sector_truth_reconciliation.test.ts tests\final_sector_truth_reconciliation_cache.test.ts tests\hvo_central_bosnia_sectors.test.ts tests\sector_split_brigade_assignment.test.ts tests\sector_truth_audit.test.ts --reporter=dot` - PASS; 107/107 tests.
- `npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts --reporter=dot` - PASS; 37/37 tests.
- `npx.cmd vitest run tests\serialize_gamestate_stability.test.ts tests\serialize_gamestate_rejects_wrappers.test.ts tests\serialize_gamestate_no_derived_fields.test.ts tests\integration_save_load.test.ts --reporter=dot` - PASS; 14/14 tests.
- `npm.cmd run typecheck` - PASS after installing the nested tactical-map package in the worktree, matching CI dependency ownership.
- `npm.cmd run test:baselines` - PASS; baseline regression all scenarios match.
- `git diff --check` - PASS.

## Reviewer Notes
- Determinism/schema review found no scenario or ordering risk. It noted a non-blocking direct `serializeGameState(...)` boundary gap; broad serializer enforcement was rejected because existing tests intentionally use it for minimal deterministic fixture serialization. Persisted save/load validation remains enforced through `deserializeState(...)`.
- QA/process review initially blocked on missing `migration_nested_ownership` fixture updates and documentation. Both were remediated before closeout.

## Next Steps
- Continue Phase 2 with another optional-field family only after classification and migration/default/validator proof.
- Do not promote nested `raw_directive_id`, `directive_magnitude`, `permission_flags`, or `deviation_reason` in this lane without separate lifecycle evidence.
