# Displacement Lazy Map Schema Contract

**Date:** 2026-05-26
**Run ID:** N/A
**Baseline:** `CURRENT_SCHEMA_VERSION` 17, optional-field floor 469
**Result:** `CURRENT_SCHEMA_VERSION` 18, optional-field floor 466

## Summary
- Promoted exactly three `DisplacementDomainState` lazy maps to required persisted v18 fields: `displacement.displacement_state`, `displacement.minority_flight_state`, and `displacement.sustainability_state`.
- Left `displacement.civilian_casualties` optional.
- Added migration, validator, fixture, drift-audit, and strict-null proof for the slice.

## Changes Made
### Save Schema
- Bumped `CURRENT_SCHEMA_VERSION` to 18.
- Added a v18 migration that materializes the three lazy maps with inert empty `{}` records.
- Added v18 `VERSION_REQUIRED_FIELDS` entries using `isRecord`.
- Preserved pre-v18 top-level legacy rescue for these fields while ensuring current v18 top-level residue cannot repair missing nested fields.

### Tests And Fixtures
- Added current-version rejection tests for missing and invalid nested values.
- Added v17 legacy migration proof and pre-v18 top-level rescue proof.
- Added `tests/fixtures/save_migration/v17_displacement_lazy_maps.json`.
- Aligned direct current-version CLI/UI/test literals with empty displacement lazy-map records.

### Diagnostics
- Regenerated `tools/diagnostics/output/save_migration_drift.json`.
- Updated strict-null optional-field floor from 469 to 466 and state-domain count from 163 to 160.

## Verification
- `npx.cmd vitest run tests/save_migration_validator_rejection.test.ts tests/save_migration_versioned_steps.test.ts tests/save_migration_round_trip_contract.test.ts tests/save_migration_drift_audit.test.ts tests/save_migration_counter_offers.test.ts tests/strict_null_inventory_progress.test.ts tests/state/player_faction_contract.test.ts tests/migration_nested_ownership.test.ts --reporter=dot` - passed, 8 files / 178 tests.
- `node tools/diagnostics/strict_null_inventory.cjs` - passed, optional GameState fields total 466.
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains` - passed, domain counts: derived 8, sim 298, state 160.
- `node tools/diagnostics/save_migration_drift_audit.cjs` - passed, 0 anonymous defaults.
- `npx.cmd tsc --noEmit -p tsconfig.json --pretty false` - passed.
- `git diff --check` - passed; Git reported line-ending normalization warnings only.

## Files Changed
| File | Change |
|------|--------|
| `src/state/game_state.ts` | v18 current schema and required displacement lazy maps |
| `src/state/save_migration.ts` | v18 migration |
| `src/state/serialize.ts` | pre-v18 top-level rescue gate |
| `src/state/validateGameState.ts` | v18 required-field checks |
| `tests/fixtures/save_migration/v17_displacement_lazy_maps.json` | v17 fixture |
| `tests/*`, `src/cli/*`, `src/ui/warroom/warroom.ts` | direct current-version literal alignment |
| `tools/diagnostics/output/save_migration_drift.json` | regenerated drift report |
| `docs/40_reports/*`, `docs/plans/*`, `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, `docs/PROJECT_LEDGER.md` | schema/version status updates |

## Next Steps
- Continue Optional `GameState` contract work by selecting one remaining optional-field family from the strict-null inventory.
