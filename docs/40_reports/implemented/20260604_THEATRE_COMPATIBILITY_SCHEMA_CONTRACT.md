# Theatre Compatibility Schema Contract

**Date:** 2026-06-04

**Scope:** Optional `GameState` schema-contract closeout for `military.theatres` and `military.army_theatre_assignment`.

## Result

`MilitaryState` now treats the legacy theatre compatibility pair as required current-save records:

- `military.theatres: Record<string, TheatreState>`
- `military.army_theatre_assignment: Record<FormationId, string>`

This is not a new save-schema version. The pair was already introduced by the v5 migration, defaulted to `{}`, and required by `validateGameStateShape(..., { requireVersion })` for current loaded state. The slice removes stale TypeScript optionality and updates current-state test/CLI builders to carry explicit empty records.

The records remain compatibility-only. They are not live front authority, player-shell authority, or turn-pipeline truth.

## Verification

- Red proof: `npm.cmd run typecheck` failed while the new type assertion saw the theatre pair as optional.
- Focused runtime proof: `node node_modules\vitest\vitest.mjs run tests\state\player_faction_contract.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\state.test.ts tests\migration_nested_ownership.test.ts --reporter=dot` passed 155/155.
- Type proof after implementation: `npm.cmd run typecheck` passed.
- Inventory: `node tools\diagnostics\strict_null_inventory.cjs --field-domains` reports state-domain optional fields at 172 and no longer lists `MilitaryState.theatres` or `MilitaryState.army_theatre_assignment`.
