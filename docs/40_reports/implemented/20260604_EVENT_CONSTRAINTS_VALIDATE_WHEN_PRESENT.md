# Event Constraints Validate-When-Present Contract

**Date:** 2026-06-04

**Lane:** Optional `GameState` schema contract / engine health.

## Summary

`state.military.event_constraints` is now validated when present. This closes the classification slice for the event-constraint bus without promoting it to a required current-save field.

The field remains optional because it is lazily created by event effects and can legitimately be absent in saves that have not received a doctrine/scope/operation-blocking event. No save-schema version bump, migration, fixture, simulation logic, event catalog behavior, UI routing, scenario data, or TypeScript optionality changed.

## Contract

When present, `military.event_constraints` must be an object with optional array members:

- `operation_blocks[]`: canonical faction, non-negative integer `expires_turn`, non-empty `reason`.
- `doctrine_overrides[]`: canonical faction, non-empty `forced_stance`, non-negative integer `expires_turn`, non-empty `reason`.
- `scope_restrictions[]`: canonical faction, optional string-array `allowed_municipalities`, optional string-array `blocked_municipalities`, optional non-negative integer `expires_turn`, non-empty `reason`.

The optional `scope_restrictions[].expires_turn` is intentional: the runtime consumers already allow open-ended scope restrictions.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed only on malformed `event_constraints` passing validation after the current-state fixture was updated with required `meta.decision_mode`.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 110/110.
- `node node_modules\vitest\vitest.mjs run tests\ai_commander_validation.test.ts tests\ai_commander_prompt.test.ts tests\consequence_effects.test.ts tests\consequence_chains.test.ts tests\consequence_consumers.test.ts --reporter=dot` passed 114/114.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_versioned_steps.test.ts tests\save_migration_round_trip_contract.test.ts tests\save_migration_validator_rejection.test.ts tests\state\player_faction_contract.test.ts tests\validate_game_state_shape.test.ts tests\state.test.ts --reporter=dot` passed 201/201.
- `npm.cmd run typecheck` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` remained count-neutral at total 507, with `state: 172` and `sim: 327`.

## Follow-Up

The next optional `GameState` schema slice should remain one family at a time. Required promotion is appropriate only for already-materialized current-save records; lazily created nested semantics buses should use this validate-when-present pattern unless a later migration intentionally materializes them.
