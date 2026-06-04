# Sector Stance And Municipality Support Validate-When-Present

**Date:** 2026-06-04  
**Branch:** `codex/optional-state-orders-contract`  
**Lane:** Optional `GameState` schema contract  
**Type:** Save/schema validator hardening

## Summary

`state.military.sector_stance_orders` and `state.military.municipality_support_orders` remain optional player/order surfaces, but malformed present payloads now fail save validation.

This is a validate-when-present contract only. The slice does not add a save-schema version, migration, fixture default, TypeScript required-field promotion, simulation behavior change, scenario data change, UI routing change, or player-facing command change.

## Contract

`military.sector_stance_orders` is optional because it is a pending player/order queue consumed by `applySectorStanceOrders(...)`. When present it must be an array of objects with:

- `sector_id`: non-empty string.
- `stance`: one of `fortify`, `defend`, `elastic`, `active_defense`, `screening`.

The validator does not require the referenced sector to exist and does not enforce corps-stance semantic eligibility. Runtime application already sorts orders, rejects unknown sectors, rejects stance/corps-stance mismatches, derives brigade posture orders, and clears the queue.

`military.municipality_support_orders` is optional because it is a one-turn player/order map consumed by mobilization and reinforcement paths. When present it must be an object keyed by canonical faction id. Each value must be an object with:

- `faction`: matching the enclosing key.
- `mun_id`: non-empty string.
- `type`: matching the faction support path: `RBiH -> weapons_shipment`, `RS -> staff_priority`, `HRHB -> croatian_support_package`.
- `staged_turn`: non-negative integer.

Rejecting faction/type mismatches prevents save-load preservation of effect-dead player orders.

## Verification

Focused validation and consumers passed:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` - 140/140.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts tests\phase_e_municipality_support.test.ts tests\ongoing_mobilization.test.ts tests\ui_map_game_state_adapter.test.ts --reporter=dot` - 174/174.
- `node node_modules\vitest\vitest.mjs run tests\sector_stance_orders.test.ts --reporter=dot` - 1/1.
- `npm.cmd run typecheck -- --pretty false`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`).

Baseline regression is not required for this slice because it only rejects malformed present saves and does not change turn execution for valid states.

## GitHub Sweep Note

The parallel GitHub sweep found no deployments, no open PRs, and no failed post-#159 checks on `main`. It found two stale unresolved non-outdated Codex review threads from PRs #150 and #151 that were already fixed by current main; both threads were resolved in GitHub after verification.
