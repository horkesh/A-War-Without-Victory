# Save Schema Evolution

## Optional subordinate preparation-probe fields (October 2026 — no schema version change)

`CorpsOperation.preparation_probe_delivery` and `CorpsOperation.preparation_probe_link` are optional persisted fields. The capability accepts only `'subordinate'`; the link records the exact parent instance, request turn/target, source axes, execution/order receipts, and restoration state. They are authored only for Southern Move and its live subordinate child. Legacy and non-opted operations omit both keys, so no migration, version bump, required-field row, or fixture is added. `validateGameStateShape` rejects unknown capability values and malformed link ownership when present.

## Optional lifecycle directive receipts (2026-10-09)

`MilitaryState.formation_lifecycle_events_fired` is an optional persisted map from stable
directive id to firing turn. Its absence means that no directive receipt has yet been stored,
so legacy saves need no migration or schema-version bump. The turn value binds prerequisite
delays after save/load and prevents a completed lifecycle directive from firing twice.

**341 isolation status:** the experimental directive writer and authored cadre events are
withdrawn from the active recovery candidate. The optional declaration, validation and field
classification remain for retained candidate-save compatibility; the restored lifecycle does
not emit these receipts. Earlier cadence/conservation coverage is archived with the candidate
under `logs/claude-channel-20261004/341-candidate-archive/`. No migration or schema bump is
introduced by the withdrawal.


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

## Opt-in operation phase gate fields (October 2026 — no schema version change)

`OperationAxis.late_phase` and the `military.brigade_attack_order_owners` sidecar are OPTIONAL
fields (`src/state/game_state.ts`), written only for operations that carry an authored `phase_gate`
and absent everywhere else, so older saves and non-opted operations round-trip unchanged. No
`CURRENT_SCHEMA_VERSION` bump, migration, version-required row or fixture was added, and none is
claimed; `src/state/validateGameState.ts` validates the shape only when the field is present. The
sidecar is deleted when pending orders are consumed. Real-serializer coverage:
`tests/operation_capture_order_ownership.test.ts`, `tests/sector_offensive_phase_gate.test.ts`.
The owner-approved named Sana and Southern Move extensions add optional `OperationAxis.late_phase.handoff` with
`brigade_id` and `source_axis_id`. It is present only on those opted-in destination axes; legacy,
ordinary, and other phase-gated operations omit it. Catalog-authored brigade identity resolves by exact
runtime key first or one unique `oob:<authored id>` alias, and the resolved runtime ID is persisted;
missing or ambiguous bindings reject the gated axis. The existing `phase` plus axis membership is the
persisted exact-once application truth, so no new receipt, migration default, or transient ownership
field is introduced. Validation rejects a non-object payload, empty brigade/source IDs, a source that
differs from `main_axis_id`, and a missing/self destination relationship. Real-serializer coverage
proves pending and applied handoffs round-trip without changing the schema version or required-field
inventory. This runtime normalization adds no schema/version bump, migration, or campaign-preservation claim.
This note is not a save-compatibility claim for every unsaved turn: the 176 resumed-from-save
continuation was NOT byte-equivalent to the continuous run (58 first-turn paths at turn 179; 616 semantic differences in total across the seven
saved turns 179..185 as 58/61/65/68/74/127/163; UNBOUND, cause unmeasured; 177 localized only a readiness/eligibility chain), so continuation-from-save is
not used as determinism proof here.

## Dispatcher `sector_march` observation (October 2026 — not a save field)

The opt-in `sector_march` observation is a detached scalar record on the weekly `bot_order_diagnostics.dispatcher_decision_details` rows
only; it is never written to GameState or a saved artifact, adds no field, migration, validator row, fixture or schema version, and is absent
when `dispatcher_decision` is off.
