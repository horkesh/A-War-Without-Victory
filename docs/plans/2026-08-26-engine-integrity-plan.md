# RE — 1.0 Engine Integrity Contract

**Status:** ACTIVE — owner-approved reduced scope, 2026-08-27
**Purpose:** Reach 1.0 with one truthful engine owner for each affected responsibility.
**Not the purpose:** general cleanup, optimization, calibration, or speculative mechanic design.

## 1. The plain-language contract

RE ends after seven proven outcomes delivered through eight serial packets:

1. release checks notice every desktop dependency change;
2. the player has one command authority, delivered as two deletion packets;
3. threat history survives deterministic zone splits and merges;
4. pre-planned operation queues cannot starve valid followers;
5. the broken APWB/Tigar exception is deleted, not redesigned;
6. formal-battle casualties have one accounting owner;
7. a defeated formation cannot teleport to remote friendly territory.

The earlier T0–T14 plan is superseded in full. Its unchecked tasks, decision gates, review matrix,
per-packet campaigns, and performance-remediation queue grant no execution authority. Frozen
discovery and team-disposition reports remain evidence only.

## 2. Foundation already complete

The guarded branch is `codex/re-engine-integrity-repaired`. The probe lane closed separately at
`b711cffa9`. Mixed-battle occupation authority, exact final-sector convergence, fail-closed
fingerprint truth, stale-golden reconciliation, dependency freezing, and the clean Node-22 baseline
pair/save-replay proof are complete. The pair at `177882fc2` is byte-identical outside normalized
metadata, has fingerprint `6f2b4a10126a980e`, and passes engine-only health and consistency.

The measured `+3.62853%` cost of mandatory convergence is a **watch item, not a 1.0 gate**. The owner
approved no further pre-1.0 diagnosis or optimization. The rejected SpatialContext reuse remains
rejected. Only a new unexplained regression measured from this corrected baseline can stop the final
handoff; it returns to the owner and does not authorize automatic diagnosis.

## 3. Rules for every packet

- One packet at a time. `RE_SCOPE_LOCK.json` binds its exact base and exact files. A commit never
  authorizes the next packet.
- Every implementation packet's exact allowlist is only its named production/test files plus
  `docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json` and
  `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`. Bundle the reviewed lock
  and compact audit row with that packet. Do not edit current-lane, active governance, roadmap,
  board, indexes, calibration master, or ledgers per packet; those synchronize once at final handoff.
- P2B alone may additionally allowlist the existing engineering contract
  `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` as a named contract/evidence file. This grants
  no authority for any other documentation change.
- One implementer, one relevant domain reviewer, and one independent QA reviewer. Review permits
  one consolidated correction pass and one confirmation pass. New non-critical findings go to the
  backlog.
- Start by proving the named defect on current code with the named focused RED. Finish with focused
  GREEN, `npm.cmd run typecheck`, and `npm.cmd run test:vitest:balanced`.
- Production LOC across the reduced RE rail must be net non-positive.
- Add no persisted field/default/migration, IPC channel, pipeline step, module, service, flag,
  artifact field/stream, cache, full-map or per-formation scan, compatibility layer, or historical
  special case.
- Preserve deterministic declaration order where it is authoritative; otherwise use
  `strictCompare`. Add no clock, RNG, or environment-dependent simulation branch.
- Do not touch scenarios, calibration data, references, or canon. No calibration result authorizes
  an RE change.
- Record one compact row in the existing RE audit: exact base, canonical staged implementation
  payload SHA-256 and exact payload path list, changed files and production numstat, RED/GREEN, Core
  result, reviewer verdicts, and player-visible effect. The payload includes named production/test
  paths only and excludes the lock, audit, control, and documentation files. Build a
  repository-relative byte-order-sorted UTF-8 LF manifest from Git-index values, never worktree
  bytes: each staged blob row is `<path>\t<staged-mode>\t<staged-blob-id>\n`; each staged deletion is
  `<path>\tDELETE\t-\n`. The identifier is the SHA-256 of that full manifest. The packet cannot
  record its own not-yet-created commit ID; the final documentation sync may map the digest to the
  resulting commit, but need not.
- No packet runs a 188-week campaign. RE gets one final clean Node-22 A/B pair after all eight
  packets are committed.
- Stop after each packet. Report the outcome plainly; do not start the next packet automatically.

## 4. Packet order

| Order | Packet | Outcome | State |
|---:|---|---|---|
| 1 | P1 | Release-path truth | Accepted / complete |
| 2 | P2A | Delete legacy force-launch authority | Accepted / complete |
| 3 | P2B | Delete Operation Briefing mutation authority | NEXT |
| 4 | P3 | Conserved threat lineage | Waiting |
| 5 | P4 | Non-starving pre-planned queues | Waiting |
| 6 | P5 | Delete APWB/Tigar exception | Waiting |
| 7 | P6 | One formal-battle casualty owner | Waiting |
| 8 | P7 | No retreat teleport | Waiting |

### P1 — Release-path truth

**Files:** `.github/scripts/detect-changed-paths.sh`,
`tests/desktop_release_ci_guardrails.test.ts`.

**Proof:** actual detector fixtures must mark changes under `src/data/`, `src/map/`,
`src/scenario/`, `src/sim/`, `src/state/`, `src/utils/`, and `src/validate/` as relevant, while an
unrelated documentation-only change remains irrelevant. Use the real script with push-event inputs;
no matcher reimplementation.

**Finish:** focused RED/GREEN, Core, `npm.cmd run desktop:sim:build`, and
`npm.cmd run desktop:package:probe`. At most one script and one existing test; no workflow or probe
change, broad `src/` catch-all, mode, or job.

### P2A — Delete legacy force-launch authority

**Production files:** `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`,
`src/desktop/autonomy_ipc_contract.cjs`, `src/desktop/desktop_sim.ts`,
`src/ui/map/desktop/useIPC.ts`, `src/ui/map/components/army_hq/DirectiveCard.tsx`,
`src/sim/combat/order_interpretation.ts`, `src/sim/combat/sector_offensive.ts`,
`src/sim/turn_phases/war_phases.ts`, `src/state/game_state.ts`,
`tools/ai_play/president_playthrough.ts`, `tools/ai_play/run_rbih_best_outcome.ts`.

**Tests:** `tests/ui/directive_card_stop_op_action.test.ts`,
`tests/ui/presidential_decision_room.test.ts`, `tests/desktop_persistence_contract.test.ts`,
`tests/back_the_officer_human_only_determinism.test.ts`,
`tests/logistics_priority_ipc_path.test.ts`, `tests/sim/combat/order_interpretation.test.ts`,
`tests/sim/combat/phase3_reliability_decay.test.ts`,
`tests/sim/command/phase2_operation_interpretation.test.ts`, `tests/sector_offensive.test.ts`,
`tests/strict_null_inventory_progress.test.ts`, `tests/ui/lever_single_host_guard.test.ts`.

**Change:** delete `stage-operation-force-launch`, `interpretOperationLaunch`,
`interpretOperationHalt`, the duplicate AI path, `dig_in_on_halt`, and
`halt_delay_turns_remaining`. Retain exact-ID `force-launch-proposal` and
`proactive-force-launch-op`. Old saves containing the deleted unknown nested keys must still load
and advance identically without a migration or compatibility reader.

**Proof:** an op-name-only force launch fails loudly and emits no IPC; exit census has no live
deleted symbol outside the named old-save fixture; current serialization contains neither old key.

### P2B — Delete Operation Briefing mutation authority

**Production files:** `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`,
`src/ui/map/desktop/useIPC.ts`, `src/ui/map/App.tsx`,
`src/ui/map/components/OperationBriefingModal.tsx`, `src/ui/map/i18n/messages.en.ts`,
`src/ui/map/i18n/messages.bcs.ts`.

**Tests:** `tests/ui/oob_operations_panel.test.ts`,
`tests/desktop_persistence_contract.test.ts`,
`tests/desktop_packaged_runtime_probe.test.ts`.

**Contract/evidence:** `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`.

**Change:** delete `stage-operation-decision`, its bridge/callback/action props, and the
Launch/Probe/Postpone/Abort footer. Retain the read-only modal and Decision Room as the sole action
owner. Delete only action strings that become unused.

**Proof:** neither decision-ready nor review state renders action controls; main/preload/useIPC/App
expose no deleted surface; Core, desktop sim build, unchanged packaged probe, and one live visual
confirmation pass. No replacement channel or service.

### P3 — Conserved threat lineage

**Files:** `src/sim/combat/commander/assess.ts`,
`tests/commander/threat_predecessor_matching.test.ts`.

**Change:** each previous zone selects at most one current descendant: exact ID with positive
overlap, otherwise greatest positive OSID overlap, then `strictCompare`. Multiple predecessors may
feed one merge. Attribute each globally vanished OSID once. Zero-overlap losses stay unlocalized.

**Proof:** merge, split, equal-overlap tie, reordered input, zero overlap, and the observed
final-save failure fixture. Mutation restoring last-loop overwrite must fail.

### P4 — Non-starving pre-planned queues

**Files:** `src/sim/combat/pre_planned_operations.ts`,
`src/sim/turn_phases/war_phases.ts`, `tests/pre_planned_operations.test.ts`,
`tests/preplanned_authorization_phase_progression.test.ts`.

**Change:** derive each corps chain from `ALL_PRE_PLANNED` declaration order; delete the five named
chains. All objectives already owned, moot, declined, and proved staging-adjacency invalid advance
to the next definition. Unknown control and every transient eligibility/availability condition
retain the head. Future names remain hidden until authorization resolves. Bound each scan by the
existing catalogue or entry queue length. Add no state machine or persisted future-name queue.

**Proof:** declaration order, reordered state, decline, terminal advancement, transient retention,
unknown-control retention, moot advancement, future-name hiding, and live phase progression.
Mutations sorting by name/availability or restoring single-head starvation must fail. Target at
least 30 production LOC deleted.

### P5 — Delete APWB/Tigar exception

**Files:** `src/sim/combat/operation_opportunities.ts`,
`src/sim/combat/operation_opportunity_catalog_5th_corps.ts`,
`src/sim/combat/operation_names.ts`, `tests/operation_objective_hostility.test.ts`,
`tests/operation_opportunities_substrate.test.ts`,
`tests/operation_opportunities_catalog.test.ts`,
`tests/operation_opportunity_state_validation.test.ts`.

**Change:** delete both self-cancelling definitions, `targets_friendly_overrides`, their private
predicates/constants/exports, override block, operation names, and scoped expectations. An already
active ordinary `CorpsOperation` from an old save finishes under normal rules; add no migration or
special reader.

**Proof:** positive generic hostility behavior remains; exit census finds no exception symbol or
operation name. This retires the feature and builds no replacement.

### P6 — One formal-battle casualty owner

**Production files:** `src/sim/combat/attack_resolution_osid.ts`,
`src/sim/combat/attack_casualty_distribution.ts`,
`src/sim/combat/tactical_group_casualties.ts`,
`src/sim/combat/attack_morale_absorption.ts`,
`src/sim/combat/attack_retreat_displacement.ts`, `src/state/casualty_ledger.ts`,
`src/sim/early_war/pool_population.ts`, `src/sim/turn_phases/war_phases.ts`.

**Tests:** `tests/casualty_pool_attribution.test.ts`,
`tests/attack_casualty_distribution.test.ts`, `tests/tg_casualty_distribution.test.ts`,
`tests/casualty_realism_v2_gate.test.ts`, `tests/integration_pool_integrity.test.ts`, plus the
existing save/replay compatibility suite.

**Change:** the live resolver owns actual attacker anchor, TG donor, primary defender, distributed
defender, and morale-absorption personnel deltas after the existing minimum-personnel clamp. Charge
each origin pool once from raw KIA+MIA.
Preserve the existing faction-level realism-scaled K/W/M totals exactly. Delete the approximate
post-hoc `apply-casualty-pool-exhaustion` phase. Add no ledger or artifact field.

**Proof:** cover present, zero, and missing origin pools on both attacker and defender sides.
Absorber row sums equal clamped actual personnel loss; raw pool charges conserve ownership;
scaled faction totals equal pre-fix totals, including realism greater than 1 and multi-defender
rounding; duplicate post-hoc charges are zero; save/load/resume/replay remain green. Adversarially
restore the post-hoc charge or substitute requested shares for clamped actual loss; the attribution
test must fail. Revert the mutation and rerun green.

### P7 — No retreat teleport

**Files:** `src/sim/combat/attack_retreat_displacement.ts`,
`tests/emergency_retreat_reachability.test.ts`. `src/sim/combat/osid_adjacency.ts` is inspect-only.

**Change:** this helper is reached after adjacent-friendly retreat has failed. If no friendly route
exists, return `null` and let existing displacement own the outcome. Remove remote home/HQ,
largest-component, or any-friendly fallthrough for that case. Do not add hostile breakout,
lifecycles, enclave logic, or immunity.

**Proof:** enemy source/no adjacent friendly, remote home, remote HQ, disconnected graph, cycle,
equal deterministic candidates, and the 706th topology. Mutation restoring remote fallback must
fail. A deterministic integration assertion must prove the returned `null` reaches the existing
displacement owner and produces its existing result.

## 5. Explicitly deferred or retired

Deferred beyond 1.0 unless a later owner-approved packet proves release necessity:

- active-formation patron strength (former T11), pending a live artifact;
- dissolution-salvage locality (former T12);
- presidential targeting of event-owned enclaves;
- hostile-breakout retreat mechanics;
- garrison creation, planner formula changes, reserve redesign, reinforcement latency,
  dissolution thresholds, Petkovci special handling, and every other speculative mechanic.

Retired as execution authority:

- the 2% performance threshold as a gate on the already-corrected baseline;
- further pre-1.0 performance diagnosis or SpatialContext optimization;
- the broad observation audit (former T2);
- the seven disposition essays (former T13);
- standalone T14, full-team per-packet review, duplicate evidence commits, and per-packet campaigns.

## 6. Final verification and R8 handoff

After all eight packets are committed on a clean tree:

1. Run every retained focused suite, typecheck, balanced tests, and save/replay compatibility.
2. Run desktop simulation build and packaged-runtime probe.
3. Confirm production LOC across reduced RE is net non-positive and every forbidden-growth census
   is zero.
4. Authorize exactly one final clean same-commit Node-22 188-week A/B pair. Require byte identity
   after the existing path-only normalization, engine-only health, direct consistency, and matching
   structural fingerprint/operation schedule.
5. Run the exact final performance protocol against comparator
   `bc3cdf4e8d69a4d5caf9b97f936f6d52fc370da3`, the corrected docs-only baseline whose production
   tree produced the captured pair. Use exact Node 22, the same machine, power state, background-load
   class, scenario, and consumed inputs for both sources. Run one excluded warm-up per source, then
   three alternating measured pairs in literal order comparator-1/candidate-1,
   comparator-2/candidate-2, comparator-3/candidate-3. Require repeatable output within comparator
   runs and independently within candidate runs under the existing path-only normalization; approved
   behavior changes need not be byte-identical across the two sources. Record all samples, medians,
   and paired deltas. The accepted `+3.62853%` correction cost remains watch-only. Apply the 2% stop
   only when workload and output remain comparable; otherwise the delta is descriptive. Only
   player-visible latency observed in R8 may open future bounded performance work. No result here
   authorizes diagnosis.
6. Synchronize the roadmap, command board, plan index, active governance, audit, calibration pause,
   and ledgers once.
7. Hand the clean commit to R8 for the three full packaged campaigns.

R8 bugs receive their own bounded packet. They never reopen RE wholesale.

## 7. Stop conditions

Stop on a stale lock/base, file overlap, wrong Node major for proof, dirty or mismatched provenance,
scope outside a packet boundary, forbidden growth, nondeterminism, save/replay failure, casualty
non-conservation, duplicate player authority, or need for canon/scenario/calibration/reference
changes. Return one bounded, source-cited amendment. Do not improvise or continue into another
packet.
