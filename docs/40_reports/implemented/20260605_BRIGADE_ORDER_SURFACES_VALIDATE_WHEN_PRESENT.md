# Brigade Order Surfaces Validate-When-Present

## Summary

The optional brigade order/movement surface batch is closed as validate-when-present state:

- `military.brigade_movement_state`
- `military.brigade_movement_orders`
- `military.brigade_reposition_orders`
- `military.brigade_deploy_orders`
- `military.brigade_posture_orders`
- `military.brigade_attack_orders`
- `military.brigade_sector_override`

Absence remains valid. Well-formed present payloads round-trip unchanged. Malformed present payloads now reject during save validation.

## Contract

These fields are optional order, movement, player-override, or retired compatibility surfaces. The validator checks only local shape:

- movement statuses use `deployed`, `packing`, `in_transit`, or `unpacking`;
- movement/deploy stances use `combat` or `column`;
- deploy actions use `deploy` or `undeploy`;
- brigade posture orders use the canonical `BrigadePosture` vocabulary;
- movement/reposition destinations are non-empty string arrays when required;
- attack orders are string OSIDs or `null`;
- sector overrides are string sector ids.

This does not materialize absent fields, resolve brigade ids, resolve OSIDs, enforce route/path reachability, change order consumption, bump save schema, add migrations, refresh fixtures, or change scenario/baseline outputs.

## Verification

- Red/green `npx.cmd vitest run tests\save_migration_validator_rejection.test.ts --reporter=dot` (175/175 after implementation)
- `npm.cmd run typecheck -- --pretty false`
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains` (total 507; `state 172`, `sim 327`, `derived 8`)
