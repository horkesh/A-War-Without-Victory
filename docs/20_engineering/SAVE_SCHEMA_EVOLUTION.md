# Save Schema Evolution

## v42 — `patron_pressure` → `patron_support` in pending decisions (2026-11-17, §6 E4)

`CURRENT_SCHEMA_VERSION` 41 → 42 (v40 is still reserved by batch-b and unregistered; see v41). The `patron_pressure` event effect kind is renamed `patron_support`, with one sign: positive = the patron's backing rises (pressure toward peace is the per-turn patron override). The loader rejects the old name. Migration v42 (`src/state/save_migration.ts`), on `military.pending_event_decisions[].response_options[]`:
- transforms only effects whose kind is still `patron_pressure` (in `effects[]` and a singular `effect`);
- renames them, then applies static lists embedded in the migration by `(event_id, option_id)`: DROP (16 options, including the six dropped by loader rule (a)) removes the effect; SET (18 options) writes the ruled value as an absolute delta (six of them are interim peace-plan reject carriers, the authored magnitude with the sign corrected, until E3a2 routes those cards into the plan resolution); every other option is renamed only. Every flip in the ruling is expressed as an absolute SET, so there is no separate FLIP list;
- strips the `patron_confidence` dimension shifts of `hrhb_camp_exposure_response_1993` `cooperate` and `deny` (DROP-SHIFT list; one carrier per option).

It never loads the event catalog. Forward-only, deterministic and idempotent (a second run finds no `patron_pressure` effect, and the shift strip is a no-op); no change on a clean state, and no field is added. **Known limit, accepted and recorded:** a mid-war save keeps the patron support it has already accumulated under the old pressure convention; only pending decisions are converted. No other persisted store holds inline applicable event effects (checked: `event_overflow_queue` holds ids only, `pending_event_notifications` holds text, `future_consequences` hold metadata strings, and opening and voluntary-action decisions are stored as `pending_event_decisions`). The startup snapshot's `schema_version` is 42 (no other byte change). Tests: `tests/s6_e4_patron_support.test.ts`, the `v41_patron_pressure_pending.json` round-trip fixture.

## v41 — `negotiation_capital` event effects stripped from pending decisions (2026-11-17, §6 E2)

`CURRENT_SCHEMA_VERSION` 39 → 41. **v40 is reserved by another lane (batch-b) and is not registered yet;** `applyMigrations` filters `version > current` and sorts, so the gap is tolerated. Whichever lane merges second renumbers its migration (each is a self-contained `registerMigration` call). The `negotiation_capital` event effect kind is retired (the loader rejects it; `applyEventEffects` throws on an unknown kind). Migration v41 (`src/state/save_migration.ts`):
- strips `kind === 'negotiation_capital'` entries from `military.pending_event_decisions[].response_options[].effects`;
- deletes a singular `response_options[].effect` of that kind.

Forward-only, deterministic and idempotent; no change on a clean state, and no field is added. Accepted and recorded: a decision pending at upgrade loses the dimension shift its catalog row now carries, because pending options are stored snapshots. The startup snapshot's `schema_version` is 41 (no other byte change). Tests: `tests/s6_e2_negotiation_capital_retired.test.ts`, the `v39_negotiation_capital_pending.json` round-trip fixture.

## v39 — political-directive chain retired (2026-11-16, freeze cut B3 + B2)

`CURRENT_SCHEMA_VERSION` 38 → 39. The turn pipeline no longer writes `political_directives_by_faction` or `army_corps_directives_by_faction`, and nothing reads them in a game. Migration v39 (`src/state/save_migration.ts`):
- deletes `military.political_directives_by_faction`;
- resets `military.army_corps_directives_by_faction` to `{}` (the field stays required since v10);
- drains every unacknowledged `army_directive_pushback` from `pending_officer_events` (no handler existed);
- keeps only `AUTONOMOUS_LAUNCH_PROPOSAL` rows in `army_co_decision_traces`.

The migration is forward-only, deterministic (sorted keys) and idempotent. No field is added. Fresh scenario states build at v39 with the slots already empty. The startup snapshot is rebuilt at v39. Test: `tests/b3_directive_chain_retired.test.ts`.

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

**2026-11-13 writer:** corps reorganisation events (`src/sim/corps_reorganisation.ts`,
`corps_transfer` / `corps_retire`) record their first completion turn here under their event
id. The receipt is informational: both events are standing rules re-evaluated every turn, so a
missing receipt in an old save changes nothing. No migration or schema bump.

**2026-11-15 writer (RF-1 Phase B):** the same step gains `commander_handover` and a
`corps_transfer` `transition` cost. It writes only existing fields, so there is no migration or
schema bump. The new writes are formation `cohesion` and `disrupted_turns` (the transition cost);
the `named_officers` fields `status`, `assigned_corps_id`, `turns_in_command`,
`acting_commander`, `effective_competence_penalty` and `penalty_turns_remaining` (the
handover); and, for a manually controlled player, a `replacement_suggested` entry in
`pending_officer_events`. Unlike the transfer receipt, the handover receipt is load-bearing: the
handover fires once, keyed by its receipt, so an old save without it runs the handover on its
first loaded turn. A save from before week 99 needs nothing. An old save loaded after week 99
applies the week-99 steps on its first loaded turn: the 7th Corps is created, the 12 brigades
move, and Alagić is seated unless the guards stop it. Past the window
(`trigger_turn + max_defer_turns`) the brigades pay no transition cost, and any still committed
to a live 3rd Corps operation are pulled out of it at once. This is a recorded limitation for
pre-1.0 beta saves.

**2026-11-15 writer (RF-ROSTER), no migration or schema bump:** the A4 war step
(`applyArmyCoRosterStep`) now owns `named_officer_data[].stubbornness` for every officer listed
in `data/scenarios/army_co_roster.json`: roster value, plus the one-shot overstay escalation when
`kept_past_schedule_since_turn` is set (capped). It writes this at officer initialisation and at
the start and end of the step each war turn. Migration 10 still defaults only undefined values,
so a saved value reloads unchanged. An older save, where migration 10 had written 3 on every
officer, keeps 3 until its first war turn after load, when the step corrects it. That one turn is
a recorded limitation for pre-1.0 beta saves. Other officers are untouched; values stay in the
validator range [1, 5]. Sensitive under the rule above, because it changes bot behaviour (army
compliance and corps-directive roles; in the measured 188w run no outcome moved). Sign-off: the
RF-ROSTER Pyrrhic gate (PR #677).


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
