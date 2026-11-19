# Save Schema Evolution

## v43 — `plan_answer` on pending peace-plan decisions (2026-11-17, §6 E3a2)

`CURRENT_SCHEMA_VERSION` 42 → 43. Migration v43 runs after v42 (§6 E4), which runs after v41 (§6 E2) and v40 (#773). The routed peace-plan cards declare `plan_answer` on every response option, and `evaluate-peace-plans` reads each side's answer from `event_decision_log` through the catalog (Systems Manual §7.10.3). A pending decision stores its options as a snapshot, so a v42 save holding one of these cards would apply its old standing shift and patron effect and would not carry the answer. Migration v43 (`src/state/save_migration.ts`), run after v42, on `military.pending_event_decisions[].response_options[]`, by static lists embedded in the migration by `(event_id, option_id)` (`S6_E3A2_PLAN_ANSWERS`, `S6_E3A2_STRIP_STANDING`, `S6_E3A2_STRIP_PATRON`, `S6_E3A2_ADD_SUPPORT`):
- adds `plan_answer` (the historian's mapping; `null` for `owen_stoltenberg_plan_1993#accept` and for both options of `contact_group_plan_1994`, now a no-choice presentation card, so a pending snapshot of it writes nothing and costs nothing);
- strips the routed options' own `international_standing` shifts (18 options): the plan record is the one carrier;
- strips the patron effects (`patron_support` effects and `patron_confidence` shifts) of every option that can be recorded rejected (13 options, the four E4 interim carriers that v42 SETs and both `contact_group_plan_1994` options included);
- adds the moved contact-group `patron_support` +10 to a pending `rbih_contact_group_response_1994#accept_51_49_plan` (only if not already present);
- filters `future_consequences[].material_effect_refs` of the stripped effects.

It never loads the event catalog (tests pin the lists equal to it). Forward-only, deterministic and idempotent; no change on a clean state. `peace_plan_history` and `pending_peace_plan` are not rewritten: a plan a v42 save already resolved keeps its row, and a later card for that plan then writes nothing and costs nothing (the resolver skips a plan with a row); a pending plan stays as the fallback pointer, answered by the modal, by the player's routed answer once it is on the log, or automatically at Observer. **Known limits, accepted and recorded:** a mid-war save keeps the standing modifier that its earlier plan rejections and card shifts already wrote, and a pending decision keeps its old copy. The startup snapshot's `schema_version` is 43 (no other byte change). Tests: `tests/s6_e3a2_save_v43.test.ts`, the `v42_plan_chain_pending.json` round-trip fixture.

## v42 — `patron_pressure` → `patron_support` in pending decisions (2026-11-17, §6 E4)

`CURRENT_SCHEMA_VERSION` 41 → 42. Migration v42 runs after v41 (§6 E2), which runs after v40 (#773); a v40 save takes v41 and then v42. The `patron_pressure` event effect kind is renamed `patron_support`, with one sign: positive = the patron's backing rises (pressure toward peace is the per-turn patron override). The loader rejects the old name. Migration v42 (`src/state/save_migration.ts`), on `military.pending_event_decisions[].response_options[]`:
- transforms only effects whose kind is still `patron_pressure` (in `effects[]` and a singular `effect`);
- renames them, then applies static lists embedded in the migration by `(event_id, option_id)`: DROP (16 options, including the six dropped by loader rule (a)) removes the effect; SET (18 options) writes the ruled value as an absolute delta (six of them are interim peace-plan reject carriers, the authored magnitude with the sign corrected, until E3a2 routes those cards into the plan resolution); every other option is renamed only. Every flip in the ruling is expressed as an absolute SET, so there is no separate FLIP list;
- strips the `patron_confidence` dimension shifts of `hrhb_camp_exposure_response_1993` `cooperate` and `deny` (DROP-SHIFT list; one carrier per option).

**Round 3 (§6 E4 rounds 3-4, same day, folded into v42; renumber if E4 merges after another schema bump).** One carrier per patron change:
- DROP grows to 26 options: the Q2 rows authored in the pressure convention (`abdic_apwb_declared_1993#federation_offer`, `hv_hvo_cooperation_1995#arbih_coordination`, the three address rows, `strategic_posture_review_rs` `negotiate_strength` and `accept_partition_framework`, `strategic_posture_review_rbih#seek_negotiation`) and the two contact-group reject cards, which leave SET (now 16 options). DROP and SET are disjoint (tested);
- the DROP-SHIFT list becomes faction-keyed (`S6_E4_PATRON_CONFIDENCE_SHIFT_DROP`, 20 options): it strips only the listed faction's `patron_confidence` shift, for the two HRHB camp options, the 16 option scopes that keep `patron_support` and lose their twin, and the two contact-group reject cards (RS −15, RBiH −25). Card-level scopes need nothing: a pending decision stores only its response options;
- `future_consequences[].material_effect_refs` follow the effects: a `patron_pressure`/`patron_support` ref of a DROP option goes, a `dimension_shift.<faction>.patron_confidence` ref of a stripped shift goes, and every other `patron_pressure` ref is renamed `patron_support`.

**P-B (2026-11-18, folded into v42).** DROP grows to 31 options: the five front-visit rows authored in the pressure convention (`visit_to_front_rbih` `visit_sarajevo`, `visit_press_rbih` and `stay_capital_rbih`; `visit_to_front_rs#stay_pale_rs`; `visit_to_front_hrhb#stay_mostar_hrhb`), dropped by the P-B panel (historian, game designer, operations/engine; 3/3, two rounds).

It never loads the event catalog. Forward-only, deterministic and idempotent (a second run finds no `patron_pressure` effect, and the shift strip and ref filter are no-ops); no change on a clean state, and no field is added. **Known limits, accepted and recorded:** a mid-war save keeps the patron support it has already accumulated under the old pressure convention, and a pending decision keeps its old copy (labels, descriptions, notifications); only pending decisions' effects, shifts and refs are converted. No other persisted store holds inline applicable event effects (checked: `event_overflow_queue` holds ids only, `pending_event_notifications` holds text, `future_consequences` hold metadata strings, and opening and voluntary-action decisions are stored as `pending_event_decisions`). The startup snapshot is rebuilt at v42 (its `schema_version` is the only byte change from v41). Tests: `tests/s6_e4_patron_support.test.ts`, `tests/s6_e4_round3_one_carrier.test.ts`, the `v41_patron_pressure_pending.json` round-trip fixture (extended in round 3 with a pending contact-group response and a strategic-posture review; a true v41 save, so it holds no `meta.peace_war_start_control_path`).

## v41 — `negotiation_capital` event effects stripped from pending decisions (2026-11-17, §6 E2)

`CURRENT_SCHEMA_VERSION` 40 → 41. Migration v41 runs after v40 (the September 1991 peace start retirement, #773); a v39 save takes v40 and then v41. The `negotiation_capital` event effect kind is retired (the loader rejects it; `applyEventEffects` throws on an unknown kind). Migration v41 (`src/state/save_migration.ts`):
- strips `kind === 'negotiation_capital'` entries from `military.pending_event_decisions[].response_options[].effects`;
- deletes a singular `response_options[].effect` of that kind.

Forward-only, deterministic and idempotent; no change on a clean state, and no field is added. Accepted and recorded: a decision pending at upgrade loses the dimension shift its catalog row now carries, because pending options are stored snapshots. The startup snapshot is rebuilt at v41 (its `schema_version` is the only byte change from v40). Tests: `tests/s6_e2_negotiation_capital_retired.test.ts`, the `v40_negotiation_capital_pending.json` round-trip fixture (a v40 save, so it exercises v41 alone).

## v40 — September 1991 peace start retired (2026-11-16)

`CURRENT_SCHEMA_VERSION` 39 → 40. The September 1991 peace start was cut as playable content by the campaign structure decision of 2026-03-23 (`PROJECT_LEDGER_KNOWLEDGE.md`); its scenario (`sep1991_to_dayton.json`), registry entry, the runner's peace-start block, the peace-to-war control-map read and the `peace_*` scenario fields are now removed, and the loader rejects `start_lifecycle_phase: "peace"`. Migration v40 (`src/state/save_migration.ts`):
- deletes `meta.peace_war_start_control_path`. Only the peace start ever set it (an absolute filesystem path, which made the state hash depend on the checkout location) and only the peace-to-war transition read it; every war-start save held `null`.

The migration is forward-only, deterministic and idempotent. No field is added. The validator no longer requires the key from v40 (`retiredAtVersion`) and rejects it if present on a v40 state. The startup snapshot is rebuilt at v40. Fixture: `tests/fixtures/save_migration/v39_peace_control_path_retired.json` (holds a legacy absolute path). Test: `tests/sep1991_peace_start_retired.test.ts`. The in-sim peace phase itself (`runOneTurn`'s peace branch, referendum and declaration logic, `peace_scheduled_*` meta) is retired separately.

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
