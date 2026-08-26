# RE — Lean Engine Integrity Execution Plan

> **Required execution skill:** `executing-plans`
> **Date:** 2026-08-26
> **Status:** PLAN — preparation-ready; behavior work blocked until RE-0 baseline and decision gates pass
> **Roadmap row:** Master Roadmap §5, `RE`
> **Owner lane:** Orchestrator / RE engine-integrity lane
> **Workstream:** RE-0 through RE-6
> **Collision rule:** Claude owns probes; active probe or overlapping engine edits stop RE
> **Current next action:** owner-resolve the probe lane, capture the integrated parent, then execute RE-0
> **Execution base:** capture the approved integrated HEAD at RE-0; do not bind this plan to the currently moving probe lane
> **Probe boundary:** probe-channel work remains Claude's separate lane and is not part of RE
> **Closeout report:** `docs/40_reports/implemented/202608XX_RE_ENGINE_INTEGRITY_IMPLEMENTATION_REPORT.md`

## Goal

Restore confidence in the engine's authority, accounting, deterministic ordering, and runtime boundaries with the smallest possible production surface. Prefer deletion, convergence on existing owners, and focused invariant tests. Do not add mechanics merely because a long-run outcome looks undesirable.

## Non-goals and forbidden scope

- No probe-channel implementation or probe rollback; Claude owns that lane.
- No calibration tuning to make the war busier or outcomes prettier.
- No unruled canon, historical-event, OOB, painted-target, or sensitive-history change.
- No new GUI panel, map layer, asset, renderer, narrative subsystem, or Lua surface.
- No save/schema change except the single optional exact exemption list if DG-1 selects Branch B and save/resume evidence proves it necessary.
- No scenario-input, fixture-manifest, checkpoint, or expected-hash refresh merely to make a gate pass. Drift requires an explained, approved behavioral packet.
- No reserve provenance, generalized matching framework, lifecycle service, operation telemetry architecture, or compatibility layer.
- No version bump, release tag, publication, deployment, or master push.

## File and collision boundaries

All paths not listed for the active packet are read-only. Test files adjacent to an owned source and the packet's ledger/report entries are allowed. Before editing, enumerate exact test targets in the packet note.

| Packet | May edit | Must not edit |
|---|---|---|
| RE-0A/B/C | this plan, `docs/40_reports/README.md`, `docs/40_reports/CALIBRATION_MASTER.md`, `docs/PROJECT_LEDGER.md`, the named RE reports; `runs/<unique-id>/` only through canonical runner | engine behavior, scenario inputs, probe files |
| RE-0D | `.github/workflows/desktop-release-guard.yml`, existing related workflow tests/docs, `tools/desktop_packaged_runtime_probe.mjs` | launchers, packaging architecture, engine behavior |
| RE-1 | `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, `src/desktop/autonomy_ipc_contract.cjs`, `src/desktop/desktop_sim.ts`, `src/ui/map/desktop/useIPC.ts`, `src/ui/map/components/army_hq/DirectiveCard.tsx`, `src/sim/combat/order_interpretation.ts`, `src/sim/combat/sector_offensive.ts`, named tests | unrelated UI, probe paths, new IPC |
| RE-2 | `src/sim/combat/attack_casualty_distribution.ts`, `src/sim/combat/battle_resolution.ts`, `src/state/casualty_ledger.ts`, `src/sim/turn_phases/war_phases.ts`, named tests | casualty constants/tuning, scenario data; inspect-only `frontline_attrition.ts` and `siege_attrition.ts` unless change control proves duplicate ownership |
| RE-3A | `src/sim/combat/commander/assess.ts` and focused tests | sector identity/probe lane, generic framework |
| RE-3B | `src/sim/combat/pre_planned_operations.ts` and focused tests | catalog order/data |
| RE-3C | `src/sim/combat/operation_opportunities.ts`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`, `src/sim/combat/sector_offensive.ts`, and—Branch B only—`src/state/game_state.ts`, `src/state/validateGameState.ts`, named tests | both branches, replacement mechanic; DG-1 must amend this list if its proved consumer set differs |
| RE-4A | `src/sim/combat/attack_retreat_displacement.ts`, `src/sim/combat/osid_adjacency.ts`, `tests/emergency_retreat_reachability.test.ts` | map data/geometry, centroid system |
| RE-4B | `src/sim/negotiation/patron_pressure.ts`, `tests/patron_active_formation_strength.test.ts` | lifecycle/schema redesign |
| RE-4C | `src/sim/combat/brigade_dissolution.ts` and its named focused test only after amendment | implementation before triage approval |
| RE-5 | evidence report and decision/ledger docs only | production code/data |
| RE-6 | closeout, canon/entrypoint docs affected by actual changes, roadmap/board/index/ledger | FORAWWV, unrelated backlog/rating files |

If source movement makes a listed owner stale, Technical Architect must identify the canonical replacement and Orchestrator must amend this table before editing.

## Non-negotiable outcome

RE must leave the engine meaner than it found it:

- no new pipeline steps;
- no new flags, services, launchers, render layers, map systems, Lua APIs, or default artifact streams;
- no new default fields, rows, streams, or structural payload on an identical-state fixture;
- production LOC net non-positive across RE;
- no compatibility aliases after a path is dispositioned;
- no full-map scan or BFS per brigade/objective;
- no more than one persisted field, only through DG-1, with a target of zero;
- no affected-phase runtime regression above 2% without a controlled benchmark, profiling evidence, and explicit Performance/Orchestrator approval;
- every behavior change has a red test, positive control, adversarial or mutation test, liveness count, focused rerun, `/simplify` gate, and independent review.

If a proposed fix cannot fit this budget, stop and return it to design.

## Architecture

The engine remains a deterministic state-transition pipeline with one owner per mutation:

```text
intent / scenario input
        |
        v
canonical authority seam ---- refusal before debit/mutation
        |
        v
canonical resolver ---------- exact per-formation result
        |
        v
single accounting seam ------ K/W/M, equipment, pools, receipts
        |
        v
existing weekly diagnostics / AAR / save
```

RE corrects seams; it does not create a second observation or orchestration architecture.

## Source authority and required reading

Before execution, read these in order and record the exact commit in the execution report:

1. `CLAUDE.md`
2. `.claude/AGENT_TEAM_ROSTER.md`
3. `docs/20_engineering/PYRRHIC_RULES.md`
4. `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`
5. `docs/plans/PLAN_EXECUTION_STANDARD.md`
6. `docs/10_canon/Engine_Invariants_v0_9_0.md`
7. `docs/10_canon/Systems_Manual_v0_9_0.md`
8. `docs/20_engineering/CODE_CANON.md`
9. `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
10. `docs/plans/MASTER_ROADMAP.md` and `docs/plans/COMMAND_BOARD.md`
11. `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_PACKET.md`
12. `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_DISCOVERY_RECORD.md`
13. `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md`
14. `docs/40_reports/audits/20260521_APWB_CUT_SUBSTRATE_CONSUMER_PRECLEAR.md`
15. `docs/40_reports/CALIBRATION_MASTER.md`
16. `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`
17. `.claude/napkin.md`, `docs/life_lessons.md`, current `docs/PROJECT_LEDGER.md` tail, and `docs/PROJECT_LEDGER_KNOWLEDGE.md`
18. `docs/20_engineering/VERSIONING.md` (version bump/tag are N/A: RE is not a version milestone)

Where documents disagree, do not select the convenient answer. Open a named decision gate below.

## External-agent session start

```powershell
git status --short
git rev-parse HEAD
git worktree list
node --version
npm.cmd --version
git ls-files | Measure-Object
```

After owner approval, set `$env:RE_EXECUTION_PARENT` to the approved `git rev-parse HEAD`, confirm `F:\AWWV-worktrees\re-engine-integrity` does not exist, then create the isolated branch/worktree with `git worktree add -b codex/re-engine-integrity-execution F:\AWWV-worktrees\re-engine-integrity $env:RE_EXECUTION_PARENT`. Stop instead of reusing or deleting an existing target.

## Options considered

1. **Execute the old investigation sequentially — rejected.** It is a valuable discovery record, but its stale commit binding, contradictory status, broad hypotheses, and absent simplify gates make it unsafe as execution authority.
2. **Treat calibration symptoms as a mechanics redesign — rejected.** Reserve decay, rebuild delay, garrison fallback, predictor retuning, and dissolution immunity are not established engine-integrity fixes.
3. **Lean seam correction — selected.** Prove reachability and liveness; delete duplicate/dead paths; converge authority; consolidate accounting; run one behavioral packet at a time.

## Full Pyrrhic team contract

The entire roster was consulted during planning. Execution uses the following seats; “consult” means a written disposition in the packet or closeout report, including **NO IMPACT**.

Planning dispositions are indexed in `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_TEAM_DISPOSITIONS.md`; the source investigation remains in the discovery record and evidence packet.

| Seat | Required responsibility |
|---|---|
| Orchestrator | scope, ordering, stop/go, roadmap and Command Board |
| Technical Architect | single-owner seams, entrypoints, CODE_CANON |
| Architect | cross-system impact and complexity budget |
| Product Manager | pre-1.0 cutoff and deferred backlog |
| Systems Programmer | invariants, state writers, deterministic implementation |
| Gameplay Programmer | phase/resolver correctness |
| Formation Expert | formation lifecycle, pools, retreat/dissolution |
| Performance Engineer | profile, artifact/runtime budget |
| Game Designer | mechanic-vs-defect classification |
| Historian | historical claim boundaries; no tuning by anecdote |
| Canon Compliance Reviewer | §6 rulings and canon propagation |
| General Code Review | correctness/security/maintainability review |
| QA Engineer | red/positive/adversarial tests and suite gates |
| Determinism Auditor | ordering, allocation, byte identity |
| Scenario Harness Engineer | clean run provenance and tooling |
| Scenario Creator/Runner/Tester | 188-week candidates and report |
| Integration perspective | cross-packet collision and merge audit |
| UI/UX Developer | refusal visibility through existing surfaces |
| Graphics Programmer | render impact; expected NO IMPACT |
| Lua Scripting | scripting impact; expected NO IMPACT |
| Asset Integration | data/asset impact; expected NO IMPACT |
| Map Geometry Reviewer | graph/geometry integrity; no new spatial system |
| Modern Wargame Expert | player intent versus institutional authority |
| Platform Specialist | Windows/Node/runtime parity |
| Build Engineer | reproducible build and worktree substrate |
| DevOps | CI path detection and actual job execution |
| Operations Expert | operation lifecycle, threat matching, queues |
| Corps/Army Commander Expert | command authority and refusal semantics |
| War-or-Game | simulation legitimacy; avoid outcome chasing |
| Narrative Designer | existing receipt/AAR language only |
| Authority Auditor | debit/mutation ordering and path convergence |
| Documentation Specialist | executable docs and propagation |
| Ledger Scribe | decision/implementation ledger entries |
| Reports Custodian | archive/index/closeout placement |
| Process QA | protocol audit at every phase exit |
| Retrospective Analyst | closeout lessons, only reusable knowledge |
| Code Simplifier | packet-level deletion and clarity gate |
| Refactor Pass | final net-complexity audit |

No seat may silently expand scope. A specialist finding becomes work only through this plan's change-control gate.

## Execution protocol

### Isolation and base

- [ ] Wait until the probe lane has an owner-approved disposition and no active overlapping engine work.
- [ ] Record `$env:RE_EXECUTION_PARENT = (git rev-parse HEAD).Trim()`; bind all evidence to that exact parent.
- [ ] Confirm the only allowed pre-existing dirt is named by the owner. Never absorb generated `data/derived/latest_run_final_save.json`.
- [ ] Create an isolated worktree and `codex/re-engine-integrity-execution` branch from the approved parent.
- [ ] Compare `git ls-files` counts between root and worktree; stop on mismatch.
- [ ] Install exactly as CI: `npm.cmd install --legacy-peer-deps`, then `npm.cmd install --legacy-peer-deps --prefix src/ui/map`.
- [ ] Use Node 22 for authoritative baseline, fingerprints, package checks, and performance evidence. Node 24 local results are exploratory only.
- [ ] Draft the PR early so required heavy jobs can be observed; branch-push success alone is not evidence.

No version bump, tag, publication, deployment, or push to master is authorized by RE.

### Per-packet micro-cycle

Every implementation packet follows this sequence:

1. Re-read the owning source and all writers/readers.
2. Record liveness/reachability and artifact evidence.
3. Add a failing focused test and a positive control.
4. Add an adversarial/mutation test that proves the test can fail.
5. Implement the minimum single-owner correction.
6. Run focused tests, typecheck, and the relevant invariant suite.
7. Run `/simplify`; delete dead paths and compatibility scaffolding.
8. Re-run the focused and balanced gates.
9. Commit only explicit packet paths.
10. Obtain owning specialist, QA, determinism, simplifier, and independent code review.
11. For behavior-changing operation/territory packets, run a fresh clean 188-week candidate and its byte-identical repeat before opening the next behavioral packet.
12. Append the slice to `docs/PROJECT_LEDGER.md`; update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for a reusable rule; scan `.claude/napkin.md` and `docs/life_lessons.md` and curate rather than append session narrative.
13. Record `/simplify: PASSED` or the fixes made in the packet commit/report before phase exit.

Execution is serial: RE-0, decision packets, RE-1, RE-2, RE-3A, RE-3B, conditional RE-3C, RE-4A, RE-4B, optional RE-4C, RE-5, RE-6. Decision research may proceed without code, but only one implementation packet owns files or produces long-run evidence at a time.

### Determinism and save/schema gate

- No timestamps, unseeded randomness, environment-dependent branches, locale ordering, or unordered iteration.
- Persisted arrays, emitted rows, queues, maps, allocation remainders, and diagnostics use explicit stable ordering.
- Any persisted field—even optional—requires load default, migration/normalization, validator, fixture update, stable-order test, old-save test, and save/load round trip.
- Scenario/checkpoint/hash or manifest refresh is forbidden unless the packet predicts and explains the behavioral drift and Orchestrator, QA, and Determinism approve it.
- Architect or Technical Architect decisions with multiple valid architectures must be flagged for user review, not silently selected.

### UI and player-truth gate

- The existing Directive/Decision Room and existing receipt/AAR are the only canonical player surfaces.
- No duplicate queue, ledger, resolver authority, hidden force ID, or newly exposed fog-sensitive formation/target detail.
- Reuse existing localized refusal vocabulary; new player text requires the repo's localization path and UI/UX plus Narrative review.
- RE-1 requires packaged Electron interaction proof and a screenshot only if visible output changes; pure deletion with identical visible behavior requires a documented visual NO CHANGE result.
- Any overlapping GUI branch stops RE-1 until its owner releases the files.

### Historical and sensitive-history gate

- Source order: canon/Rulebook and approved scenario/event records; then cited archival/scholarly sources; unsupported recollection is not authority.
- Historian and Canon Compliance assign the repo's sensitive-history ring before DG-1 or DG-2 is ruled.
- Unsupported claims are removed or explicitly marked unresolved; they never become engine predicates.
- Live-state conditions control emergence; calendar/event ownership is used only where canon explicitly requires it.
- Atrocity, protected-population status, or enclave suffering may never become a player optimization lever.

### Slice closeout documents

Every slice updates this plan's checkbox/status and `docs/PROJECT_LEDGER.md`. Update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable rules. Update `docs/plans/COMMAND_BOARD.md` at packet handoff; update `docs/plans/MASTER_ROADMAP.md` only at phase/RE closure. Append evidence to the named RE implementation report and index it in `docs/40_reports/README.md`. Touch `docs/40_reports/CONSOLIDATED_BACKLOG.md` or `docs/40_reports/GAME_STATE_RATING_MASTER.md` only if the corresponding status/rating actually changes.

### Universal stop conditions

Stop the lane immediately for:

- dirty or mismatched run provenance;
- missing checkpoints, fingerprints, or digest;
- non-byte-identical repeat candidates;
- invariant or engine-health failure;
- negative-control movement not predicted before the run;
- new default diagnostic stream or artifact-size growth;
- faction aggregate casualty totals changing during the attribution-only packet;
- command-authority cost debited on refusal;
- a schedule divergence of 20% or more being presented as attributable territory;
- production LOC becoming net positive without an approved deletion plan;
- a requested semantic ruling not answered by canon authority.

## Packet execution contracts

The implementation report is the expected durable artifact for every row; long-run rows also produce two distinct `runs/<unique-id>/` directories. “Core” verification means `typecheck` plus `test:vitest:balanced`.

| Packet | Tests written/run first | Estimated scope | Phase-local proof and handoff |
|---|---|---|---|
| RE-0A–C | `tests/scenario_operation_diagnostics.test.ts`, `tests/scenario_anchor_contract.test.ts`, `tests/desktop_calibration_compare.test.ts` | docs/run evidence; 0 production LOC | clean S0 pair, normalized fingerprint manifest, artifact inventory; Scenario Harness + Process QA sign |
| RE-0D | `tests/desktop_release_ci_guardrails.test.ts`, `tests/desktop_packaged_runtime_probe.test.ts` | 2 production/tool files + workflow/test, ≤40 LOC | focused tests, desktop build/release/package commands, synthetic changed-path proof; Build + DevOps sign |
| DG-1/2/3 | positive/negative source reachability fixtures where needed | one decision record each; 0 production LOC | source-cited ruling, consumer/writer list, `/simplify: PASSED`; Canon + Orchestrator sign |
| RE-1 | `tests/commander_override_reachability.test.ts`, `tests/commander_override.test.ts`, desktop IPC mutation/policy tests | named desktop/UI files, net deletion expected | focused tests, Core, all desktop commands, old-save disposition, packaged proof; Authority + UI/UX + independent review sign |
| RE-2 | add `tests/casualty_pool_attribution.test.ts`; run `tests/attack_casualty_distribution.test.ts`, `tests/casualty_realism_v2_gate.test.ts`, `tests/integration_pool_integrity.test.ts` | `src/sim/combat/attack_casualty_distribution.ts`, `src/sim/combat/battle_resolution.ts`, `src/state/casualty_ledger.ts`, `src/sim/turn_phases/war_phases.ts`; net deletion | focused tests, Core, 188w pair, aggregate K/W/M lock; Systems + Formation + Determinism sign |
| RE-3A | add `tests/commander/threat_predecessor_matching.test.ts` | `commander/assess.ts` + test, ≤35 production LOC | focused test, Core, 188w pair; Operations + Determinism sign |
| RE-3B | `tests/pre_planned_operations.test.ts` | one source/test; net −30 production LOC target | focused test, Core, 188w pair; Operations + QA sign |
| RE-3C | `tests/operation_objective_hostility.test.ts`, opportunity state/save tests | branch A net deletion; branch B ≤25 LOC + at most 1 field | focused/save tests, Core, 188w pair; Canon + Authority + Determinism sign |
| RE-4A | `tests/emergency_retreat_reachability.test.ts` | `attack_retreat_displacement.ts`, existing adjacency owner/test; no module, ≤60 LOC | focused test, Core, profiled search count, 188w pair if live; Formation + Map + Performance sign |
| RE-4B | add `tests/patron_active_formation_strength.test.ts` | `src/sim/negotiation/patron_pressure.ts` + existing predicate/test, ≤25 LOC | focused test, Core; 188w pair only if live; Systems + Formation sign |
| RE-4C | focused salvage locality test only if triage opens packet | decision-only or bounded reuse of RE-4A primitive | return bounded amendment before code; no implicit implementation |
| RE-5 | no production tests unless a premise probe needs one | seven one-page dispositions; 0 production LOC | Game Design/Historian/War-or-Game/Canon/Product disposition; `/simplify: PASSED` |
| RE-6 | all affected focused tests and full named gates | docs/report only | clean tree, CI jobs observed, closeout report and atomic control-plane update |

If an estimate is exceeded, stop before implementation and submit change control. Test names marked “add” are the approved new targets; do not create additional test frameworks.

For every row, the exact focused-test invocation is:

```powershell
npx.cmd vitest run <space-separated exact test paths listed in that row> --reporter=dot
```

Replace the bracketed argument only with that row's literal test paths; record the expanded command in the implementation report. Rows with no production test state that explicitly and do not run this template.

## RE-0 — Control plane, clean baseline, and observation audit

**Owners:** Orchestrator, Build, DevOps, Platform, Scenario Harness, QA, Process QA
**Behavior:** none
**Exit:** trustworthy execution substrate and exact-parent S0

### RE-0A — Documentation and provenance reconciliation

- [ ] Preserve the old investigation as the discovery record; keep this file as the only executable RE plan.
- [ ] Index the evidence packet and discovery record in `docs/40_reports/README.md`.
- [ ] Reconcile missing/recent ledger dispositions before declaring RE ready.
- [ ] Confirm the planning-sync correction remains: n374 is marked non-authoritative because its own `run_meta.json` records `b3d759a3…` and `git_dirty:true`; never rewrite raw evidence.

### RE-0B — Fresh S0

- [ ] At the exact execution parent, generate a clean 188-week baseline with required 52/104/156/188 checkpoints.
- [ ] Run an identical repeat to a distinct output directory; require identity of checkpoint saves and canonical result artifacts after excluding only documented `run_meta.out_dir`/path metadata.
- [ ] Record wall time, peak memory if available, artifact sizes, operation schedule, engine-health output, and provenance.
- [ ] Use S0 only as comparison evidence, not as permission to tune outcomes.

### RE-0C — Existing-observation audit

- [ ] Inventory weekly diagnostics, AAR, operation queue/result/warning records, and save fields across every operation constructor, including commander, probe, emergency, and `buildCorpsOperation` paths.
- [ ] Add no creation emitter. The current 188-week weekly report is already operation-heavy; measure exact bytes/rows in S0.
- [ ] If and only if a positive-controlled audit proves a lifecycle blind spot, return with a proposal for one opt-in external sidechannel covering all constructors. It is not pre-approved.

### RE-0D — Desktop CI truthfulness

Files to inspect: workflow changed-path detector, desktop build/package scripts, preload/IPC contract tests.

- [ ] Expand existing desktop changed-path prefixes to include bundled simulation/state/scenario sources where presently omitted.
- [ ] Extend the existing packaged runtime probe only enough to prove retained operation IPC contracts.
- [ ] Do not add a launcher, service, or second package probe.
- [ ] Prove a source-only change under each newly covered prefix selects the desktop jobs.

**Simplify gate:** zero new infrastructure components; reuse existing jobs and probe.

## Decision gates — no implementation before ruling

Each decision packet is source-cited, names the canon owner, states the minimal options, and records the ruling in the ledger.

### DG-1 — APWB/friendly override contradiction

The current record is contradictory: an APWB cut plan is explicitly a draft awaiting review, while ledger/docs variously describe the substrate as withdrawn and canonical.

- [ ] Prove the complete current consumer/writer set.
- [ ] Canon Compliance, Game Design, Historian, Operations, Authority Auditor, Product, and Orchestrator choose:
  - **A:** approve deletion of the shadow/fake-combat substrate and separately re-review any proposed replacement; or
  - **B:** retain the historical operation semantic and persist only an exact deterministic exemption set through operation lifecycle.
- [ ] Do not implement both. Do not invent a faction-wide debuff or provenance schema by implication.

### DG-2 — Presidential enclave authority

- [ ] Decide whether a presidential request-operation may target event-owned Srebrenica/Žepa before the fall receipt.
- [ ] Include an ordinary-enclave negative control; reject a blanket all-enclave rule.
- [ ] If prohibited, specify one shared query/consume predicate, a non-leaking refusal reason through existing UI/receipt surfaces, and refusal before debit.

### DG-3 — Stage-operation decision reachability

- [ ] Prove whether `stage-operation-decision` has a live canonical consumer.
- [ ] If noncanonical, delete it. If live, converge it onto the exact-ID canonical owner.
- [ ] Never restore stale `state.corps_command` semantics or create replacement IPC.

Unanswered decision gates do not block unrelated packets, but the dependent packet remains closed.

## RE-1 — Authority convergence and dead-path deletion

**Owners:** Authority Auditor, Operations, Corps/Army Command, UI/UX, Technical Architect, Systems, QA
**Long run:** required if a live behavior path changes

### RE-1A — Delete legacy force-launch path

Files to inspect: main-process handlers, preload exposure, `DirectiveCard`, `interpretOperationLaunch`, halt machinery, canonical exact-ID force launch.

- [ ] Prove reachability of `stage-operation-force-launch` and its name-based fallback.
- [ ] Preserve the exact-ID canonical route.
- [ ] Delete the legacy handler, preload/useIPC exposure, UI fallback, and newly unreachable interpretation/halt code.
- [ ] Audit old saves containing `halt_delay_turns_remaining` or `dig_in_on_halt`; choose tested migration/conversion or documented normalization/clearing. Do not retain live compatibility readers indefinitely.
- [ ] Test that no refusal path can charge command authority before acceptance.
- [ ] Test duplicate operation names and stale IDs; require fail-loud behavior without hidden force IDs in UI.

### RE-1B — Resolve decision path

- [ ] Execute DG-3 disposition.
- [ ] If retained, replace illegal `recovery_reason='commander_abort'` with the already canonical transition/reason; add no enum unless replacing an unvalidated string with an existing canonical value is impossible.
- [ ] Prove query and mutation share one owner.

**Exit evidence:** fewer IPC paths and production lines; all retained desktop contracts packaged and tested.

## RE-2 — One casualty accounting owner

**Owners:** Systems, Gameplay, Formation, Determinism, QA, Performance
**Files:** resolver casualty shares, `war_phases.ts`, pool exhaustion, task-group ledger
**Long run:** required

- [ ] Capture current faction aggregate K/W/M totals as a locked control.
- [ ] Add focused tests for attacker, defender, task-group anchor/donors, zero pool, exhaustion, and deterministic remainder ties.
- [ ] At one resolver allocation boundary, produce two explicitly separate outputs: raw per-formation permanent personnel loss for pool charging, and realism-scaled per-formation K/W/M for the casualty ledger.
- [ ] Never source pool exhaustion from realism-scaled casualty-ledger values. The outputs may share deterministic allocation infrastructure, but not numerical inputs.
- [ ] Allocate ledger K/W/M independently with deterministic largest remainder and `strictCompare` final tie-break.
- [ ] Record task-group casualties against the formations that actually absorb personnel loss; do not charge the anchor the full pre-redistribution casualty object.
- [ ] Delete duplicate `apply-casualty-pool-exhaustion` re-derivation and its divergent constants.
- [ ] Require exact conservation: allocated formation K/W/M equals the resolver's faction aggregate K/W/M.
- [ ] Require faction aggregate casualty totals to remain unchanged in this packet. Pool-exhaustion distribution may change and must be called out before the long run.

**Simplify gate:** one accounting owner, one allocation algorithm, net deletion.

## RE-3 — Operation ordering and queue correctness

Run RE-3A and RE-3B as separate behavioral packets and separate long-run pairs.

### RE-3A — Conserved predecessor-to-descendant threat attribution

**Owners:** Operations, Determinism, Systems, QA

- [ ] Reproduce last-loss contamination with multiple current/previous zones.
- [ ] Sort previous/current zones by `zone_id` with `strictCompare`; build the current global OSID union once.
- [ ] For each predecessor with vanished OSIDs, select at most one current descendant: exact ID only with positive overlap, otherwise maximum positive overlap, then current `zone_id` tie-break. Multiple predecessors may feed one merged current zone.
- [ ] Aggregate sorted vanished OSIDs per current zone and emit at most one loss row. Attribute every vanished OSID from a matched predecessor exactly once; zero-overlap predecessors remain unmatched.
- [ ] Use `strictCompare` only as final tie-break; zero overlap is no match.
- [ ] Test merge conservation, split single-descendant attribution, ID churn, exact-ID positive-overlap precedence, equal overlap, reordered input, unrelated-zone negative control, and flattened duplicate conservation.
- [ ] Count fully vanished zero-overlap components in S0. If live and a corps-level pressure signal is required, stop for a separate authority decision; do not invent lexical/spatial locality.
- [ ] Do not create a generic matching framework.

### RE-3B — Generic pre-planned follow-on queue

**Owners:** Operations, Gameplay, Determinism, QA

- [ ] Reproduce the five named queue branches and lock raw `ALL_PRE_PLANNED` declaration order.
- [ ] Replace named blocks with one traversal in raw declaration order.
- [ ] Validation-invalid operations do not queue.
- [ ] A declined first operation does not erase valid followers.
- [ ] Classify queued-head failure without a new state machine: unknown, resolved, declined, or permanently moot entries advance; temporarily unavailable formation/readiness entries retry.
- [ ] Prove one invalid head cannot erase or permanently starve valid followers.
- [ ] Do not sort by availability date.
- [ ] Delete named special cases and prove net code reduction.

### RE-3C — APWB branch, conditional on DG-1

- [ ] Execute exactly the approved branch.
- [ ] Branch A deletes proven-dead substrate; any replacement mechanic is a separate approved plan.
- [ ] Branch B uses one exact, sorted, persisted exemption list only if save/resume tests prove transient state insufficient.
- [ ] Run save/resume, byte-identity, non-exempt friendly control, and operation lifecycle tests.

## RE-4 — Locality and active-formation correctness

### RE-4A — Generic emergency-retreat routing

**Owners:** Formation, Map Geometry, Systems, Determinism, QA, Performance
**Long run:** required if S0 proves live

- [ ] Reproduce lexical/largest-component fallback and the BFS frontier defect.
- [ ] Reuse the existing operational contact graph/`osid_adjacency.ts`; do not add centroid or spatial systems.
- [ ] Use a bounded graph search or a reusable battle/corps/faction-scoped distance result: finite distance first, organizational validity next, `strictCompare` last.
- [ ] A per-formation full-graph BFS is forbidden unless profiling proves necessity and Performance plus Systems approve the exception.
- [ ] Test disconnected graphs, cycles, multiple valid destinations, reorder stability, and the 706th only as a regression fixture—not a hardcoded rule.
- [ ] Measure same-turn dissolution separately. Do not add immunity: a shattered remnant may legitimately dissolve.

### RE-4B — Active formation predicate

**Owners:** Systems, Formation, QA
**Long run:** conditional on S0 liveness

- [ ] Audit all readers of patron/military strength and current formation lifecycle/status rules.
- [ ] Prove whether nonzero displaced/inactive formations affect the ratio.
- [ ] If live, correct `getMilitaryStrengthRatio` in `src/sim/negotiation/patron_pressure.ts` with the canonical lifecycle-status exclusions. Add no helper unless the audit proves a second live caller needs the identical invariant; add no lifecycle.
- [ ] If byte-inert in S0, close with focused tests and a future-safety note.

### RE-4C — Dissolution salvage locality triage

- [ ] Prove whether “nearest same-corps” equipment salvage currently selects alphabetically.
- [ ] If live and invariant-relevant, return a bounded packet using the same graph primitive as RE-4A.
- [ ] Otherwise defer explicitly. Do not silently add it to RE-4A.

## RE-5 — Evidence-only mechanic triage

**Owners:** Product, Game Design, Historian, War-or-Game, Systems, Performance, Canon
**Default result:** defer

These are not implementation tasks. Each gets a one-page evidence disposition: defect/invariant, approved mechanic, post-1.0 calibration, or close.

- [ ] Garrison “minimum surplus after N” and force-creation fallback.
- [ ] Planner-estimator versus resolver mismatch; comments may be corrected, formula changes require approval.
- [ ] Strategic-reserve decay and orphan predicates.
- [ ] Rebuild/reinforcement latency. `disrupted_turns` has broad readers/writers and is forbidden as a narrow carrier; a dedicated scalar is allowed only after explicit mechanic approval.
- [ ] Dissolution floors. Audit actual runtime writers/skip paths before claiming the threshold is unreachable.
- [ ] Petkovci/enclave downstream behavior after DG-2.
- [ ] 706th same-turn dissolution after generic routing is corrected.

Quiet fronts, siege quiet, or historically surprising outputs are not engine defects by themselves. RE may close with all seven deferred.

## Verification matrix

Run commands from the isolated worktree with Node 22:

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest:balanced
npm.cmd run desktop:map:build
npm.cmd run desktop:sim:build
npm.cmd run qa:electron-runtime-contracts
npm.cmd run desktop:release:check
npm.cmd run desktop:package:probe
```

For each behavioral packet:

```powershell
$env:AWWV_S6_GRADE_RUN='true'
npm.cmd run sim:scenario:run:188w
npm.cmd run sim:scenario:run:188w
```

After each runner prints its unique output path, set `$env:RE_RUN_A` and `$env:RE_RUN_B` to the two distinct directories and execute:

```powershell
node tools/op_schedule_diff.cjs $env:RE_RUN_A $env:RE_RUN_B --list
node tools/engine_health_gate.cjs $env:RE_RUN_A --horizon 188w --strict
node tools/engine_health_gate.cjs $env:RE_RUN_B --horizon 188w --strict
node tools/validate_run_consistency.cjs $env:RE_RUN_A
node tools/validate_run_consistency.cjs $env:RE_RUN_B
node tools/verify_checkpoints.cjs $env:RE_RUN_A
node tools/verify_checkpoints.cjs $env:RE_RUN_B
node tools/diagnostics/structural_fingerprint.cjs $env:RE_RUN_A --json --full
node tools/diagnostics/structural_fingerprint.cjs $env:RE_RUN_B --json --full
$reFingerprintFiles = @('activity_summary.json','brigade_temporal_log.jsonl','control_delta.json','destroyed_brigades.json','displacement_event_log.jsonl','final_save.json','formation_delta.json','initial_save.json','operation_aars.json','replay_save_manifest.json','run_summary.json','watched_operations.json','weekly_report.jsonl')
$reHashA = $reFingerprintFiles | ForEach-Object { [pscustomobject]@{File=$_; Hash=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $env:RE_RUN_A $_)).Hash} }
$reHashB = $reFingerprintFiles | ForEach-Object { [pscustomobject]@{File=$_; Hash=(Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $env:RE_RUN_B $_)).Hash} }
Compare-Object $reHashA $reHashB -Property File,Hash
```

`Compare-Object` must emit no rows. `run_meta.json` and `end_report.md` are excluded because output-path/prose metadata may differ; all state and canonical machine artifacts above remain byte-bound. If a named script or artifact no longer exists, stop and amend the plan through Technical Architect/Orchestrator review—do not substitute by guess.

Determinism uses two distinct-output 188-week candidates. Performance uses either a five-sample focused benchmark or at least three controlled timed candidates, with machine/load conditions recorded and the affected phase profiled. Two-run wall-clock medians cannot enforce the 2% budget.

“No artifact growth” means no new default field, row, stream, or structural payload on an identical-state fixture. Incidental digit/string-length movement caused by an approved behavior correction is a behavioral diff, not telemetry bloat.

### Required comparisons

| Packet | Locked positives | Allowed movement |
|---|---|---|
| RE-0 | exact parent, clean metadata, 4 checkpoints, byte identity | none |
| RE-1 | refusal before debit, exact-ID route, packaged IPC | removal of legacy path only |
| RE-2 | faction aggregate K/W/M | per-formation/pool attribution |
| RE-3A | deterministic ordering and unrelated zones | corrected threat/loss ownership |
| RE-3B | raw declaration order and valid followers | removal of named special cases |
| RE-3C | non-exempt friendly control | only approved APWB branch |
| RE-4A | graph integrity and unrelated retreats | corrected reachable destination |
| RE-4B | active formations and unrelated factions | exclusion of proven inactive strength |

Long runs are serial. Never combine two behavior changes into one attribution candidate.

## Phase-exit review

At every phase exit:

- [ ] Owning domain specialist signs the semantic result.
- [ ] QA supplies red/positive/adversarial evidence.
- [ ] Determinism Auditor signs ordering and byte evidence.
- [ ] Performance signs runtime/artifact deltas where relevant.
- [ ] Code Simplifier confirms no avoidable layer or abstraction.
- [ ] Process QA confirms plan protocol, assignments, commits, and evidence.
- [ ] Orchestrator records GO, REWORK, DEFER, or STOP.

## RE-6 — Closeout and propagation

- [ ] Run all verification gates from a clean tree.
- [ ] Confirm production LOC net non-positive, no new default stream, and no unapproved persisted field.
- [ ] Confirm required PR jobs actually ran, not merely that the workflow passed.
- [ ] Run independent General Code Review, Canon Compliance, Refactor Pass, and retrospective.
- [ ] Update CODE_CANON/entrypoint docs only for changed ownership or deleted paths.
- [ ] Update Master Roadmap, Command Board, report indexes, ledger, and governance references atomically.
- [ ] Publish the implementation report at the path named in this plan.
- [ ] Put only durable reusable rules in repo knowledge; keep run narrative in the report.
- [ ] Do not edit FORAWWV.

## Minimum viable RE cutoff

RE is complete when:

1. RE-0 proves a clean exact-parent baseline and truthful CI/runtime substrate;
2. authority has one canonical route and dead legacy paths are removed;
3. casualty accounting has one owner with exact conservation;
4. threat matching and pre-planned queues are deterministic and generic;
5. live routing/active-formation defects are corrected or evidence-closed;
6. all decision gates have recorded dispositions;
7. speculative mechanics are either separately approved or explicitly deferred;
8. all universal budgets and closeout gates pass.

The cutoff does **not** require prettier 188-week outcomes. It requires a smaller, more trustworthy engine.

## Change control

New evidence may alter sequencing, not silently broaden scope. Any new task must state:

- violated invariant or proven blind spot;
- exact owner and consumer set;
- deletion/convergence alternative considered;
- production LOC, state, artifact, and runtime cost;
- tests and negative controls;
- owning Pyrrhic seats;
- Orchestrator approval.

Absent those fields, the finding goes to the future backlog, not RE.

## Copy-ready execution prompt

> **Role and objective:** You are the implementation agent for RE engine integrity. Execute `docs/plans/2026-08-26-engine-integrity-plan.md` with the `executing-plans` skill, one checked packet and one commit at a time, starting with the next unfinished Command Board phase.
>
> **Canon and process:** Read `CLAUDE.md`, `.claude/napkin.md`, `docs/20_engineering/PYRRHIC_RULES.md`, `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`, `docs/plans/PLAN_EXECUTION_STANDARD.md`, `docs/10_canon/Engine_Invariants_v0_9_0.md`, `docs/10_canon/Systems_Manual_v0_9_0.md`, `docs/20_engineering/CODE_CANON.md`, `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, the Master Roadmap/Command Board, and this plan's evidence records before editing.
>
> **Start contract:** Start only after the probe lane is owner-resolved. Capture the approved integrated HEAD, create the named isolated worktree, verify tracked-file parity, and use Node 22 for authoritative evidence. Complete RE-0 before behavior changes. Claude-owned probe files and unrelated dirty `data/derived/latest_run_final_save.json` are forbidden.
>
> **Determinism and ledger:** No timestamps, randomness, environment-dependent behavior, unordered output, unexplained hash drift, or save field without migration/default/validator/fixture/round-trip tests. Append `docs/PROJECT_LEDGER.md` for each behavior/output slice; update `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable rules. Do not edit `docs/10_canon/FORAWWV.md`.
>
> **Lean-engine constraint:** Zero new pipeline steps, flags, default streams, services, or compatibility layers; target zero persisted fields; production LOC net non-positive. Work serially, one behavioral long-run pair at a time. Do not implement unresolved decision gates or RE-5 mechanics.
>
> **STOP AND ASK:** Stop for any universal stop condition; canon conflict/silence; sensitive-history judgment without a ruling; branch/file collision; unapproved schema or GUI expansion; nondeterministic ordering; unexplained scenario/hash drift; scope/estimate overrun; or an Architect choice with multiple valid architectures.
>
> **Handoff format:** Report packet/commit, exact changed files, tests and commands with pass/fail, `/simplify` result, liveness/mutation evidence, distinct run directories and fingerprints, runtime/artifact deltas, drift explanation, specialist/reviewer sign-offs, ledger/docs updates, deferred findings, and the next unfinished phase.
