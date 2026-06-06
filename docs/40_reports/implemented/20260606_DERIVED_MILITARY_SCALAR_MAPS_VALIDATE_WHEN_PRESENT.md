# Derived Military Scalar Maps Validate-When-Present

## Summary

`military.brigade_encircled`, `military.battle_damage`, `military.home_distance_cache`, and `military.active_offensives_against_corps` are now covered by optional validate-when-present save validation.

Absence remains valid. Well-formed present payloads round-trip unchanged. Malformed present payloads now reject during save deserialization.

## Scope

- `brigade_encircled` validates local brigade-keyed boolean values.
- `battle_damage` validates local operation/settlement-keyed finite non-negative numeric values.
- `home_distance_cache` validates local brigade-keyed finite non-negative numeric values.
- `active_offensives_against_corps` validates local corps-keyed non-negative integer values.

This deliberately does not materialize absent fields, add migrations, bump the save schema, refresh fixtures, resolve brigade/corps/operation/settlement ids, enforce battle-damage upper bounds, change encirclement or battle-damage computation, change home-distance cache production, change active-offensive cache production, or alter simulation/scenario/baseline outputs.

`front_edges` and `war_front_edges_osid` were excluded from this batch after classification because derived front snapshots are simulation/output/UI-facing surfaces and need a separate front-snapshot contract. `assignable_front_segments` was also excluded because save compatibility already materializes it through the v5 migration.

## Verification

- Red/green `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` (new malformed optional derived military scalar maps test failed before validation; green 185/185 after implementation).
- `npm.cmd run typecheck -- --pretty false`
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` total 507 (`state: 172`, `sim: 327`, `derived: 8`)
- `git diff --check`

No scenario or baseline regression was run because this is save-validation-only shape checking for optional present payloads and cannot change sim/output/save/scenario bytes unless malformed saves are loaded.
