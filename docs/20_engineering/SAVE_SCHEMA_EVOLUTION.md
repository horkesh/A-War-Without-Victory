# Save Schema Evolution

Use this procedure for every `GameState` shape change that can appear in a saved game.

1. Add the field to [game_state.ts](../../src/state/game_state.ts) as optional unless every current loaded state already materializes it through an older migration/validator contract. If an older schema version already defaults and requires the field, promote the TypeScript type without bumping `CURRENT_SCHEMA_VERSION`.
2. Register the next version in [save_migration.ts](../../src/state/save_migration.ts), bump `CURRENT_SCHEMA_VERSION`, and put the default behind a deterministic migration. Migrations must not use time, randomness, I/O, logging, environment reads, or unsorted record traversal.
3. If engine code requires the field after that version, add it to `VERSION_REQUIRED_FIELDS` in [validateGameState.ts](../../src/state/validateGameState.ts). Current-version saves missing that path must reject in [save_migration_validator_rejection.test.ts](../../tests/save_migration_validator_rejection.test.ts).
4. Add `tests/fixtures/save_migration/vNN_<feature>.json`. [save_migration_round_trip_contract.test.ts](../../tests/save_migration_round_trip_contract.test.ts) fails until every version has a fixture and the current startup artifact round-trips.

Lazy nested semantics buses, such as `military.event_constraints`, are different from already-materialized empty records. If absence is legitimate until a runtime effect first writes the bus, do not add a migration, version-required row, fixture, or required TypeScript marker. Add validate-when-present shape coverage instead, prove absent and well-formed payloads load, and record the expected strict-null inventory delta as zero.

Before shipping, run:

```powershell
node tools\diagnostics\save_migration_drift_audit.cjs
npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts
npm.cmd run typecheck
npm.cmd run desktop:startup-snapshot:build
```

If a default can influence scenario output, RNG seeding, faction choice, combat, bot, political, or calibration behavior, classify it as Sensitive in the migration description and record explicit sign-off before commit. Inert defaults are empty records, empty arrays, null not-yet-occurred turn markers, or canonicalization matching prior load behavior.
