# Code Canon (AWWV)

## Canon Precedence for Code
The codebase follows the same precedence rules as canonical docs:
- Engine invariants: `docs/10_canon/Engine_Invariants_v0_9_0.md`
- Rulebook: `docs/10_canon/Rulebook_v0_9_0.md`
- Systems Manual: `docs/10_canon/Systems_Manual_v0_9_0.md`
- FORAWWV addenda: `docs/10_canon/FORAWWV.md`
- Code: this repository

When code contradicts canon, follow the contradiction protocol in this doc.

## Determinism Contract (Code-Facing)
Non-negotiables (must hold for all sim execution paths):
- No randomness unless explicitly defined in canon and deterministic.
- No timestamps or wall-clock derived values.
- Stable ordering for all collections and iterables.
- Byte-identical reruns from identical inputs.
- Derived state must not be serialized as source of truth.

Debug-only profiling exception: wall-clock probes may use monotonic process timers only when gated by an explicit profiling environment flag, kept out of game state/save state/scenario truth artifacts, and documented with a deterministic-output guard. Current example: bot-orders/commander profiling behind `PERF_PROFILE_BOT_ORDERS=true`, which writes only `data/derived/_debug/bot_orders_perf_profile.json` and may include named commander decision sub-buckets such as `assessSituation` and `emitCommanderOutput`.

If you touch determinism-sensitive areas, also read:
- `docs/20_engineering/DETERMINISM_AUDIT.md`
- `docs/20_engineering/INVARIANTS_IN_CODE.md`

## Where to Start Reading the Code (First 30 Minutes)
Read `docs/10_canon/context.md` first (workflow discipline and validation rules).

### Pre-T3 stale operation march reconciliation

Campaign qualification failed: n81 scores689/712 with14 previously correct October cells lost versus n80 703/712. The candidate is rejected and unadopted; preserved source and focused fixtures do not establish accepted calibration behavior.

`reconcileStaleOperationMarchOrders` in `commander_march_correction.ts` is a T2 command-owner prepass immediately before column consumption, separate from that module's T6 repairs. It requires unique state-wide operation/axis membership, valid effective-host ownership and completed prior-objective proof; preserves valid competing order authority and active transit; and selects only the current objective's existing friendly approach deterministically. It changes a pending destination only. T3/T6 guards, thresholds, state schema and objective identity stay unchanged. See `MOVEMENT_AUTHORITY.md` section3a and the focused stale-operation/Mistral fixtures; those do not establish campaign neutrality or calibration gain.

### Observer-only command boundaries (2026-10-21)

Topics `reconciliation_write` and `preplanned_eligibility` in `AWWV_DEBUG_REASON_CODES` emit stable schema-versioned JSON stdout through caught sinks, respectively prefixed `[reconciliation_write]` and `[preplanned_eligibility]`. They observe real reconciliation pre/post assignment, reached versus `NOT_REACHED` guards, public queued/direct preplanned caller exits, candidate commitment identities (including recovery), axis/build results and admitted/deferred return. Observation is absent when OFF, detached when ON, and adds no state/save/weekly/file-telemetry fields. The deterministic `invocation_key` is context, not a unique ID; repeated same-turn attempts remain `contiguous_unsequenced` and must be consumed as separate ordered blocks. Built is not admitted. Actual call-local turn values are logged without inferred weekly offsets. Fixtures in stale_operation_march_reconciliation, pre_planned_operations and reason_code_debug cover state/return/full-byte neutrality and selector/sink behavior; preparation does not prove campaign neutrality or historical causality.

### Personnel and probe-selection stdout observers (2026-10-21)

Topic `personnel` emits `[personnel]` schema-versioned stable stdout from `src/sim/combat/personnel_diagnostic.ts`, using independent comma-separated `AWWV_DEBUG_PERSONNEL_FORMATIONS`. It observes selected actor presence/value/delta at named-phase start/end/skip/terminal and eight routine assignment branches (pool bottom-up/regular/enclave, WIA, strategic reserve, frontline attrition, collapse/low-morale desertion). Direct write context is evaluated at the assignment; uncovered combat/lifecycle/merge/paramilitary/pool-only writers are not implied covered. A phase delta localizes a phase, not a unique writer. Gameplay exceptions propagate without false completion records. No GameState/report/save/weekly field is added; existing movement payload/selector is unchanged.

`commander_creation` generic-probe detail records actual surplus ordinals, reached eligibility stages/NOT_REACHED, fitness with nonfinite tags, actual survivor ranks and selected identity, local-occupation bypass/not-reached, and existing sector/objective/created/emitted tuples. Disabled selection retains the original expression; enabled observation preserves original helper counts, predicate stages, sort and return identity. Sinks are caught. Repeated context is not a unique invocation ID. Focused/source-review evidence is readiness, not historical cause or full-campaign neutrality. See CALIBRATION_MASTER781–784 and personnel-784 provenance.

### Regular shared-pool allocation stdout receipt (2026-10-22)

Topic `reinforcement_allocation` plus explicit comma-separated `AWWV_DEBUG_REINFORCEMENT_POOLS` (for example `pale:RS`) enables `[reinforcement_allocation]` schema1 stdout from `reinforcement_allocation_diagnostic.ts`. TopicOFF or missing selector creates no observer. `stage_open`, ordered `recipient` and `stage_close` records identify source `formation_spawn.reinforce`, branch `regular`, actual completedturn, selectedpool and globalrecipientorder. Balances and reached reserve/effective/need/rate/transfer values use explicit presence tags; early skips do not invent zeros. Optional early-skip pool association is diagnostic-only lazy/caught metadata; production eligibility/cap/key access order stays intact. Post-cap rows reuse the actual key. Stage closes before enclave reinforcement and is not a whole-pool lifecycle proof. No false close on gameplay exception; stdout/serialization failures are contained. Existing personnel `available` remains effective availability. Repeated turn/pool context is not a unique invocation ID; consume ordered stage blocks. No state/report/save/weekly/file-telemetry fields or gameplay/rate/threshold changes. Fixtures qualify preparation, not campaign neutrality or absent n80 history.

### Canonical turn pipelines (one owner per phase)
- **War-phase pipeline:** `src/sim/turn_pipeline.ts` — `runTurn()`. Sole canonical runtime for live war behavior. Steps in `src/sim/turn_phases/war_phases.ts` and `early_war_phases.ts`; types in `src/sim/turn_pipeline_types.ts`.
- **Peace/state pipeline:** `src/state/turn_pipeline.ts` — `runOneTurn()`. Sole canonical runtime for non-war weekly state progression (directives → deployments → military_interaction → fragmentation_resolution → supply_resolution → political_effects → exhaustion_update → persistence).

If you are changing war behavior, start at `src/sim/turn_pipeline.ts`. If you are changing peace/state progression, start at `src/state/turn_pipeline.ts`. Nothing else is co-equal with these two.

Opt-in movement observation: `src/sim/combat/movement_phase_diagnostic.ts` records
detached selected-actor snapshots through the canonical named-phase wrapper and
fresh terminal snapshots after the invariant result. Enable topic `movement_phase`
in `AWWV_DEBUG_REASON_CODES` and explicit comma-separated IDs in
`AWWV_DEBUG_MOVEMENT_FORMATIONS`. State and orders remain separate, with record
and context presence tagged absent/undefined/null/value. No GameState/save field
is added. Turn/weekly fields are absent by default. The reader
`tools/diagnostics/movement_phase_coverage.cjs` requires every emitted actor/turn
expectation and complete manifest continuity; phase localization is not branch
or historical causal proof. Missing selection cannot establish coverage.

Opt-in front-distribution observation: topic `front_distribution` uses the same
movement formation selector. `front_distribution_diagnostic.ts` records both
production invocations and six column-capable helper families plus Phase A direct
actions, outside GameState. Inputs are detached at post-selection/pre-write;
earlier local mutations remain possible. Main Phase B score is reconstructed
from selected locals at the hook, not a captured comparator trace. No-write
coverage is not a refusal reason; use existing `movement_reject`. The strict
`front_distribution_writer_coverage.cjs` reader requires both production calls,
complete actor manifests, global write ordinals, typed snapshots/features and
candidate/target linkage. Default report keys remain absent. Fixture proof does
not identify a historical helper or establish a gameplay defect.

Opt-in subordinate preparation-probe delivery (October 2026): `OperationOpportunityDef.preparation_probe_delivery`
propagates through the canonical `buildCorpsOperation` seam into optional persisted
`CorpsOperation.preparation_probe_delivery`. Only Southern Move authors `'subordinate'`; code does not infer the
mode from name, date, tier, family, or outcome. The child uses ordinary planning, order, resolver, recovery, and
AAR ownership. Its exact parent slot and selected brigade ownership are shared/exclusive only while the persisted
link matches the live parent request. The parent clock advances once at its deferred visit, while request mutation,
readiness assessment, and launch remain paused until ownership restoration. Absent capability preserves the legacy
request/auto-resolution path and serialization shape. Proof: `tests/subordinate_preparation_probe.test.ts`.

Opt-in operation axis phasing (reviewed, October 2026): an authored `phase_gate` on a
multi-axis opportunity axis becomes `OperationAxis.late_phase` (`src/state/game_state.ts`;
gate logic in `src/sim/combat/operation_phase_gate.ts`). While `holding` the axis may approach/hold
but may not capture any `gated_objectives` (complete held target set; enforced at the final
attack consumer, `sector_offensive.ts`/`attack_resolution_osid.ts`); it activates once, only after
the same operation instance's main axis has produced owned, still-held capture receipts
(`OperationCaptureReceipt`, written by the resolver from the surviving emitted order's
instance/axis/lead-brigade/target attribution). `brigade_attack_order_owners` is a real persisted
sidecar holding pending emitted-order ownership for one turn, present only while a gated
operation has pending orders. A late TG is formed and engaged for the axis (`formTgForAxis`
returns the formed TgId; finite lifetime via the TG lifecycle). Absent opt-in, no field is written
and behavior is the pre-existing path (compatibility proven through the real serializer, not
only unit fixtures). Proof: `tests/sector_offensive_phase_gate.test.ts`,
`tests/operation_capture_order_ownership.test.ts` plus the 168 full-suite pass (exit 0, 1419 files,
14415 passed / 33 skipped). No save-schema version change, global TG clock reset or global
empirical determinism claim; unit/serializer proof is distinct from measured campaign gaps (actual TG
activation exit and Barevo/Lupnica emitted ownership remain UNMEASURED); the inherited 122
retention/startup STOP stays open.

The owner-approved named Sana and Southern Move extensions add optional `late_phase.handoff` to that same persisted gate.
Its destination axis is constructed empty, so the transferred brigade is admitted and reserved only
once on the source axis. Activation first verifies exact source membership, active/faction eligibility,
single operation participation and absence from every other live operation; only then does it replace
source/destination membership and recompute both axes' main/support roles atomically. Gate phase and
the resulting memberships are the exact-once truth; there is no parallel transient owner. The transfer
does not touch formation location, movement, orders, control, force, confidence, preparation, dates or
thresholds. Only the named `sana_95` and `southern_move_95` destination axes author this capability.
Catalog-authored formation IDs normalize to the live runtime ID by exact key first or one unique
`oob:<authored id>` alias; missing or ambiguous bindings reject the gated axis, and the resolved ID is
persisted in `late_phase.handoff`. This changes neither schema shape/version nor migration rules. Proof includes construction, malformed-save,
save/load pending/applied, reversed-order, conflict no-op, and real resolver ownership cases in
`tests/operation_opportunities_substrate.test.ts`, `tests/operation_opportunities_catalog.test.ts`,
`tests/sector_offensive_phase_gate.test.ts`, `tests/operation_capture_order_ownership.test.ts`, and
`tests/operation_opportunities_federation_western_bosnia_catalog.test.ts`. Focused proof is not campaign proof.

Opt-in dispatcher observation: topic `dispatcher_decision` (`AWWV_DEBUG_REASON_CODES`) adds
per-formation detached records (`first_handler`, directive/axis/objective context, pre-cap and
final generated orders) to the weekly `bot_order_diagnostics` only. Records carry completed-turn
labels (`turn` equals the weekly `week_index`); they are observation, not a simulation decision,
and are not written to GameState. A source audit found no reference mutation, in-place sort or
cache effect in the detail builder; 180/n46 (topic on) reproduced ten selected n44 artifacts byte
for byte (a qualified replication, not neutrality at every unsaved turn).

Opt-in `sector_march` observer (reviewed, October 2026): when `dispatcher_decision` is enabled, a detail row may carry an
optional detached scalar `sector_march` record (`SectorMarchObservation`, `bot_brigade_eval_types.ts`) naming the ACTUAL terminal
exit of `evaluateSectorMarch` (`bot_brigade_eval_front.ts`; wrapper over the unchanged body) and its branch-local inputs
(operation commitment, routine-scope source/sub-segment/size, requested reassignment including a same-sector id, scoped/allowed front
sizes, selected destination and its scoped-front membership). Labels are set only where the function returns, so an inner lambda that
returns false never masks the later exit; `first_handler` stays the first TRUE evaluator. Default-off: no observer callback/context property, no observation allocation, no diagnostic key.
No GameState/save/schema/version change. The record is evaluator-time and not an order authority. Proof: `tests/bot_dispatcher_sector_march_observer.test.ts`
(17 tests: real dispatcher path, topic-off absence, identical orders and `serializeState`, copy and reversed-insertion-order fixtures, scoped march,
same-sector reassignment, trap reroute, retroactive tooth, overstack, defend/enclave exits, tooth-blocked fall-through). The local fail-closed
reader `logs/claude-channel-20261004/192-sector-march-reader.cjs` (exact id x completed-turn inventory, embedded-turn binding, legitimate
skips, baseline comparator) is evidence tooling, not a simulation authority. Reviews: 189 source review, 191 targeted verification, 192/193 final
verification; 188 focused 75 tests + typecheck, 190 17 tests + 26 reader controls, 192 31 controls (each at its own date/scope; no combined rerun count,
no global empirical determinism claim).

Opt-in scenario-read provenance observation (October 2026): `src/scenario/scenario_read_context.ts`
owns one per-run receipt context for the existing `loadScenario` read. Literal
`AWWV_SCENARIO_READ_RECEIPT=1` causes `runScenario` to compare the decoded text actually parsed,
its lexical path identity, and its normalized hash with the matching consumed-input stamp row,
then emit exactly one `[input-read-receipt]` line. The observer is default-off, contains its own
failures, performs no second read, and changes no state, save, `run_meta`, stamp, or gameplay
artifact. It covers only this loader call and therefore is not evidence that every consumed input
was actually read. `data/source/formation_lifecycle_events.json` is now a named fixed input, making
the current authoritative stamp 32 rows. Proof: `tests/scenario_read_context.test.ts`,
`tests/scenario_runner_read_context_gate.test.ts`, `tests/scenario_runner_read_context_wiring.test.ts`,
`tests/run_provenance_stamp.test.ts`, and `tests/run_provenance_input_surface_scan.test.ts`.

### Canonical harnesses and surfaces (callers of the pipelines)
- Scenario harness: `src/scenario/scenario_runner.ts` — routes to peace vs war runner based on `state.meta.phase`.
- Scenario CLI: `src/cli/sim_scenario.ts`.
- Single-turn sim CLI: `src/cli/sim_run.ts`.
- Event framework (B1): `src/sim/events/`.
- Serialization core: `src/state/serialize.ts` and `src/state/serializeGameState.ts`.
- Map pipeline: `docs/20_engineering/MAP_BUILD_SYSTEM.md` (scripts under `scripts/map/`).
- Tactical Map (canonical map GUI): `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §0 and `docs/20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md` — React + MapLibre app in `src/ui/map/`; `npm run dev:map`.
- Product architecture authority: `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`.
- Complete-suite test runner: `tools/test/run_vitest_balanced.mjs` (`npm run test:vitest:balanced`), backed by the deterministic hazard inventory in `tools/test/test_suite_inventory.mjs`. Fast/scenario slices are diagnostic subsets, not complete pre-merge proof.

The balanced harness uses versioned measured weights in `tools/test/test_duration_baseline.json`; missing measurements retain prior weights or the deterministic default. It does not learn weights during a run. Generated configs install `tools/test/vitest_receipt_runner.mjs` (Vitest 2.1.9), which persists collection/execution starts and finishes with native finalization before finish. `tools/test/vitest_file_receipts.mjs` allocates unique manifests and per-worker lane JSONL files under `.tmp_vitest_balanced_receipts` (override `AWWV_VITEST_RECEIPT_ROOT`), outside generated-config cleanup. Nested children receive no inherited receipt context by default; explicit planner-owned context, monotonic lane sequences and intrinsic clocks preserve attribution. Receipt IDs and clocks are harness diagnostics only, never simulation state or artifacts. Focused tests do not replace complete-suite acceptance.

### Master calibration contract

- Sole scoring scenario: `data/scenarios/apr1992_definitive_188w.json`.
- Checkpoints: week 39 January 1993, week 104 April 1994, week 156 April 1995, and week 188
  October 1995, each scored against `data/source/calibration/painted_control_<key>.json`.
- `tests/historical_checkpoints_contract.test.ts` enforces checkpoint availability, loader
  preservation of `calibration_scenario`, and exactly one scoring scenario.
- The 40-week scenario family and `tools/calibrate_40w.cjs` are RETIRED (2026-09-19): the
  scenario files are deleted and short diagnostics run the canonical 188w scenario with a
  `--weeks 40` duration override. No separate short scenario definition may be reintroduced.
- Current accepted evidence and debt: `docs/40_reports/CALIBRATION_MASTER.md`.

### Bounded variant (not co-equal with canonical pipelines)
- `src/sim/run_early_war_browser.ts` — the existing bounded `runPhaseITurn()` fallback in Warroom. Desktop advance uses its IPC bridge and the canonical simulation owner. The unused increment-only browser combat runner was removed in cleanup Task 1 (2026-09-08); no fallback behavior changed.

### Demoted / legacy-only (do not treat as canonical)
- `src/scenario/aor_init.ts` — deprecated (AoR removed in n344). Do not use for war-phase state; war phase uses `location_osid` only.

## Single Source of Truth for Entry Points
Only the entrypoints listed in `docs/20_engineering/REPO_MAP.md` and `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`,
and approved in ADRs, are canonical.
Do not add or use shadow entrypoints.
Do not treat historical root summaries or handoff memos as co-equal architecture authority; use `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md` to resolve doc-era conflicts.

## Contradiction and Change Protocol
If code conflicts with canon:
1) Do not edit canon docs to match code.
2) Record the conflict in `docs/PROJECT_LEDGER.md`.
3) Create an ADR under `docs/ADR/` referencing the conflicting canon docs.
4) Resolve by changing code or by issuing a FORAWWV addendum.

## How to Propose Code Canon Changes
Use the ADR template in `docs/ADR/ADR-0001-template.md`.
Ledger entries are required for any change to:
- Determinism contract
- Canon precedence or doc roles
- Canonical entrypoints
See `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` for the current enforcement coverage.

## Development Cycle

Code changes are implemented either during day shift (user + Claude interactive) or night shift (autonomous Claude executing prepared plans). The night shift enforces all Code Canon rules — determinism contract, canon precedence, entrypoint discipline — without human oversight. See `.claude/skills/nightshift/SKILL.md`.

## Assumptions
- Assumption: There is a single canonical scenario runner.
  - How to verify: Use the discovery checklist in `docs/20_engineering/REPO_MAP.md`.
- Assumption: Derived state is not serialized as source of truth.
  - How to verify: Inspect serialization code and compare to derived list.
