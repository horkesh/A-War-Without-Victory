# Runtime Military State Validate-When-Present

## Summary

`military.corps_equipment_reserve`, `military.militia_garrison`, and `military.unresolved_sector_brigades` are now covered by optional validate-when-present save validation.

Absence remains valid. Well-formed present payloads round-trip unchanged. Malformed present payloads now reject during save deserialization.

## Scope

- `corps_equipment_reserve` validates local per-corps equipment rows with finite non-negative `tanks`, `artillery`, and `apcs` values.
- `militia_garrison` validates local settlement-keyed finite non-negative garrison strength values.
- `unresolved_sector_brigades` validates string-array shape.

This deliberately does not materialize absent fields, add migrations, bump the save schema, refresh fixtures, resolve corps/formation/settlement ids, enforce equipment upper bounds, change militia-garrison computation, change sector reconstruction, or alter simulation/scenario/baseline outputs.

`war_jna` was excluded from this batch after classification: save compatibility already materializes absent `war_jna` to the legacy default, so it is not in the same optional-absent cleanup class.

## Verification

- Red/green `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` (new malformed optional runtime military state test failed before validation; green 183/183 after implementation).
- `npm.cmd run typecheck -- --pretty false`
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` total 507 (`state: 172`, `sim: 327`, `derived: 8`)
- `git diff --check`

No scenario or baseline regression was run because this is save-validation-only shape checking for optional present payloads and cannot change sim/output/save/scenario bytes unless malformed saves are loaded.
