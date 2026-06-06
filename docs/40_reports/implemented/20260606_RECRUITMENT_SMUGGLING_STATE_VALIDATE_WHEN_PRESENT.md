# Recruitment / Smuggling Economy State Validate-When-Present

## Summary

`military.recruitment_state` and `military.smuggling_routes` are now closed as optional validate-when-present economy state. Absence remains valid, and well-formed present payloads round-trip unchanged. Malformed present recruitment pools, trickle maps, recruited brigade id arrays, smuggling route rows, and route scalars now reject during save deserialization after migration.

## Scope

- `military.recruitment_state.recruitment_capital` and `equipment_pools` must be faction-keyed objects whose rows use canonical player faction ids, match their faction key, and carry finite non-negative `points` and `points_initial`.
- `recruited_brigade_ids` must be a string array.
- Optional recruitment/equipment trickle maps must be faction-keyed finite non-negative number records.
- Optional `max_recruits_per_faction_per_turn` must be a non-negative integer.
- `military.smuggling_routes` must be an array of route rows with non-empty string `id`, finite non-negative numeric `capacity`, boolean `disrupted`, and non-negative integer `active_turns`.

## Non-Goals

This batch does not materialize absent fields, bump save schema, add migrations, refresh fixtures, resolve brigade ids, validate route catalog membership, enforce route capacity upper bounds, enforce reserve-map upper bounds, or change recruitment/smuggling runtime behavior. It also does not touch scenario data, baseline manifests, generated artifacts, replay writers, UI, randomness, timestamps, or persisted output ordering.

## Validation

- Red focused validator run before implementation: new malformed-present tests failed as expected.
- Green focused validator run: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 178/178.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` passed, total 507 (`state: 172`, `sim: 327`, `derived: 8`).
- `git diff --check` passed.
