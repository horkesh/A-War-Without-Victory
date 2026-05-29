# Phantom-Spawn Marker Schema Contract

**Date:** 2026-05-26
**Result:** Implemented v20 save-schema slice for `military.phantoms_spawned`.

## Summary
- Promoted `military.phantoms_spawned` from optional to required persisted `string[]`.
- Added deterministic v20 migration default `[]` for v19 saves while preserving existing array order and duplicate entries.
- Added current-version validator coverage for missing and malformed marker arrays.

## Changes Made

### Save Schema
- `CURRENT_SCHEMA_VERSION` is now 20.
- `MilitaryState.phantoms_spawned` is required.
- `save_migration.ts` registers v20 with an inert `[]` default via the existing array helper.
- `validateGameState.ts` requires a string-array shape for current v20 saves.

### Tests And Fixtures
- Added v19 round-trip fixture coverage.
- Added migration tests for default materialization and order/content preservation.
- Added validator rejection tests for missing and non-string marker entries.
- Updated current-version fixtures that directly instantiate `MilitaryState`.

## Determinism
- Migration uses a fixed empty array and does not sort, dedupe, clear, inspect environment, read time, read files, or use randomness.
- Existing arrays are left in their serialized order and with their existing contents.
- No phantom brigade runtime logic, definitions, scenario data, calibration files, event content, or generated scenario artifacts changed.

## Files Changed
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Bumped schema version and made `phantoms_spawned` required. |
| `src/state/save_migration.ts` | Added v20 migration default. |
| `src/state/validateGameState.ts` | Added current-version string-array validation. |
| `tests/fixtures/save_migration/v19_phantoms_spawned.json` | Added v19 legacy fixture. |
| `tests/*` / `src/cli/*` scaffolds | Added required empty array to direct current-version literals. |
| `tools/diagnostics/output/save_migration_drift.json` | Refreshed schema drift diagnostic. |

## Verification
- `node tools\diagnostics\strict_null_inventory.cjs`
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains`
- `node tools\diagnostics\save_migration_drift_audit.cjs`
- Focused migration/validator/state suites during implementation.
- Full requested verification recorded in `docs/PROJECT_LEDGER.md`.

## Next Steps
- Continue the optional `GameState` schema-contract lane from strict-null floor 464 (`sim` 297, `state` 159, `derived` 8).
