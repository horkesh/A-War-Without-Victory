# TG schema-freeze failure diagnosis

## Verdict

This is a stale expected-key sentinel, not schema drift from the local-occupation change.

`tests/tg_schema_freeze.test.ts` compares the canonical startup artifact's sorted `military` key set with a literal frozen list. The artifact now contains `military.brigade_movement_orders`, while the literal omits it. Political and displacement keys still match.

## Provenance

- `brigade_movement_orders` is an established optional `MilitaryState` field at `src/state/game_state.ts:2638`. Git blame traces the field to pre-existing brigade-movement work (`b1a5c5ccf0`, later touched by `bc15b4e82c`), months before this branch.
- `validateGameState` already validates the field when present (`src/state/validateGameState.ts:1877-1882` and `4009-4010`). Its presence therefore does not introduce an unknown persisted key.
- Commit `c126ddec333a190101475a9d2c34fc6888192767` deliberately regenerated `data/derived/startup/apr_1992_initial_save.json`. Its committed `startup-diff.json` records `.military.brigade_movement_orders` changing from absent to two authored preplanned column orders (`rs_bilea_brigade` and `rs_gacko_brigade`) and records normalized artifact SHA-256 `45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf`.
- The startup artifact, `src/state/game_state.ts`, `src/state/save_migration.ts`, and `tests/tg_schema_freeze.test.ts` have no diff between the authorized base `9ac9f11da` and candidate `8db305596`. Commit `c126ddec3` is an ancestor of `9ac9f11da`.
- The current canonical startup builder/byte contract is unaffected; the failing sentinel reads that already accepted artifact and compares it to a literal last updated before the September snapshot regeneration.

The freeze test's own history corroborates the staleness. Its military literal originated with the June C3 sentinel and was not updated by `c126ddec3`, although that commit added the supported field to the canonical artifact. The test title also still says “schema 37” while it asserts current schema 38, but that wording does not cause this failure.

## Smallest legitimate correction

Edit only the expected military-key literal in `tests/tg_schema_freeze.test.ts`, inserting `brigade_movement_orders` in sorted order immediately after `brigade_front_assignment`. Keep the exact string equality assertion and all schema-version, political-key, and displacement-key guards unchanged. Do not regenerate or edit the startup snapshot, state types, schema version, or migrations.

No source or test file was changed during this diagnosis.
