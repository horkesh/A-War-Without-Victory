# Displacement Event Log Schema Contract

**Date:** 2026-05-26
**Lane:** Optional `GameState` schema contract / strict-null Phase 2
**Classification:** Persisted contract

## Summary
- Promoted `displacement.displacement_event_log` from an optional `DisplacementDomainState` field to a required persisted v7 contract field.
- Kept the existing v7 migration default: legacy pre-v7 saves materialize the field as `[]`.
- Added current-version validator enforcement so missing or non-array event logs fail persisted save/load validation.
- Did not promote humanitarian aggregates, origin/destination arrivals, recent-by-turn caches, pending event notifications, event decision logs, or any derived caches.

## Changes Made
### Schema Contract
- `DisplacementDomainState.displacement_event_log` is now required.
- `VERSION_REQUIRED_FIELDS` now treats `displacement.displacement_event_log` as required as of schema v7.
- The existing v7 migration continues to materialize `displacement_event_log` with `ensureArray(...)`.

### Fixture And Artifact Alignment
- Added a current-version rejection test for a missing displacement event log.
- Extended the legacy v1 migration assertion to prove `[]` materialization before current-version validation.
- Added `displacement_event_log: []` to direct synthetic `GameState`/`DisplacementDomainState` fixtures in CLI harnesses, UI startup stubs, and focused tests.
- Regenerated `tools/diagnostics/output/save_migration_drift.json`; strict required fields now total 26.

## Determinism
- Schema/default-only change. Empty-array defaulting is inert and already existed in migration v7.
- No displacement mechanics, append ordering, event production, scenario data, event data, GUI code, baselines, randomness, timestamps, or ordering logic changed.
- Persisted save/load validation is stricter for current-version saves only; legacy saves still migrate before required-field validation.

## Strict-Null Inventory
- Counted escape categories remain zero:
  - `as_factionid_casts 0`
  - `as_unknown_casts 0`
  - `as_any_casts 0`
  - `non_null_assertions_dot 0`
  - `non_null_assertions_index 0`
- Optional `GameState` fields now report `491`.
- Domain split from `strict_null_inventory.cjs --field-domains`:
  - `sim 305`
  - `state 178`
  - `derived 8`
  - `unknown 0`

## Files Changed
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Promoted `DisplacementDomainState.displacement_event_log` to required |
| `src/state/validateGameState.ts` | Added v7 required-field validation |
| `tests/save_migration_validator_rejection.test.ts` | Added current-version rejection and legacy migration assertion |
| CLI/UI/test synthetic fixtures | Added empty displacement event logs where constructing current-version state |
| `tools/diagnostics/output/save_migration_drift.json` | Updated strict required-field audit output |

## Verification
- Red first: `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because current-version saves missing `displacement.displacement_event_log` did not throw.
- `node tools\diagnostics\strict_null_inventory.cjs` - PASS; `optional_fields_game_state 491`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` - PASS; `sim 305`, `state 178`, `derived 8`, `unknown 0`.
- `node tools\diagnostics\save_migration_drift_audit.cjs` - PASS; `0 anonymous defaults`.
- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\save_migration_validator_rejection.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\morale_displacement_schema.test.ts tests\state\displacement_event_log.test.ts tests\alliance_phase0_handoff.test.ts tests\alliance_territorial_incidents.test.ts tests\bilateral_ceasefire_redeployment.test.ts tests\bilateral_displacement_cascade.test.ts tests\bilateral_formation_diversion.test.ts tests\bilateral_front_edges.test.ts tests\consequence_breadth_v2.test.ts tests\emergency_retreat_reachability.test.ts tests\washington_joint_pressure.test.ts --reporter=dot` - PASS; 98/98 tests.
- `F:\A-War-Without-Victory\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json` - PASS after temporarily linking this dependency-light worktree to the already-installed map UI dependency folder; junction removed after the run.
- `F:\A-War-Without-Victory\node_modules\.bin\tsx.cmd tools\scenario_runner\run_baseline_regression.ts` - PASS; `Baseline regression: all scenarios match`.
- `git diff --check` - PASS.

## Next Steps
- Continue Optional `GameState` schema contract work only by selecting another bounded persisted field family with existing migration/default/validator evidence.
- Do not promote displacement aggregate/cache fields in this lane without separate lifecycle evidence.
