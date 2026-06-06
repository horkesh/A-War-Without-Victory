# Supply / Production Economy State Validate-When-Present

## Summary

`military.general_supply_reserve`, `military.heavy_munitions_reserve`, `military.strategic_reserves`, and `military.production_facilities` are now closed as optional validate-when-present supply/production economy state. Absence remains valid, and well-formed present payloads round-trip unchanged. Malformed present reserve maps and production facility rows now reject during save deserialization after migration.

## Scope

- Reserve maps must be objects keyed by canonical player faction id with finite non-negative numeric values.
- `production_facilities` must be an object keyed by facility id.
- Each production facility row must use a matching non-empty `facility_id`, non-empty `name`, non-empty `municipality_id`, a known production type (`ammunition`, `heavy_equipment`, `small_arms`), finite non-negative `base_capacity`, finite non-negative `current_condition`, and boolean `required_inputs` flags for electricity, raw materials, and skilled labor.

## Non-Goals

This batch does not materialize absent fields, bump save schema, add migrations, refresh fixtures, enforce reserve-map upper bounds, enforce production condition/capacity upper bounds, resolve municipality ids, require production facility catalog membership, or change supply/production runtime behavior. Accepted tests intentionally preserve values above 100 to prove this remains shape validation, not the deferred reserve-bound policy.

## Validation

- Red focused validator run before implementation: new malformed-present tests failed as expected.
- Green focused validator run: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 181/181.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` passed, total 507 (`state: 172`, `sim: 327`, `derived: 8`).
- `git diff --check` passed.
