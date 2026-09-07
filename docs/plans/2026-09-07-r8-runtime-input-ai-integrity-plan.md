# R8 Runtime Input and AI Integrity Implementation Plan

> **For implementation:** Use `executing-plans`; execute and verify one phase at a time.

**Goal:** Ensure valid production data reaches both campaign runners and optional external AI has one replay-safe command boundary.
**Architecture:** Reuse the shared turn-input loader and canonical commander. Delete duplicate assembly/direct mutation; make fixture omissions explicit, commit asynchronous results in stable order, and preserve recorded decisions on replay.
**Tech stack:** TypeScript, existing Node/Electron loaders, Vitest and recorded/fake AI clients.
**Date/status:** Updated 2026-09-08; BC09 Phase 1 AUTHORIZED/SCHEDULED, implementation not started. BC10 Phase 2 remains PLANNED.
**Owner / board row:** R8; BC09 (inputs) and BC10 (optional AI) are explicit additions to the finite behavior register, not new workstreams or a reopening of R4/R5/RE.
**Slot:** After R7 under D1. Phase 1 establishes input delivery before BC07's final stability-data disposition. Phase 2 follows BC01/BC06 command settlement and Phase 1. Both precede final calibration and final packaged acceptance.
**Next action:** Execute Phase 1.1 consumer/fixture inventory under the bounded authorization below.
**Collisions:** No simultaneous edits with BC04/05 to turn phases, BC06 to command/desktop handlers, BC07 to input assembly, or R9 preparation to dependency/build inputs. Freeze consumed data at each phase; diagnostic calibration remains open on separate identified trees.

## 1. Scope, overlap and decisions

### 2026-09-08 — Owner-delegated BC09 scheduling

The owner instructed "Resolve then authorize" after BC06 commit `491cf2110`.
The orchestrator resolved the six unauthored BC06 escalation rows as an explicit
post-1.0 scope exception in the existing R8 plan, then scheduled **Phase 1 only**.
This overrides the earlier PLANNED status for BC09; it does not activate BC10,
cleanup or build preparation. BC06 packaged acceptance remains open, but its
completed command/desktop edits no longer collide with this input packet.

Authorized work: inventory consumers and explicit production/fixture requirements;
implement the smallest shared-loader repair; prove valid-input equivalence and
required-input failure before mutation/save/broadcast; focused tests, local builds,
one independent Sol/medium review, documentation/ledger synchronization and a
separate local commit on an isolated `codex/` branch. Astra orchestrates; use one
fresh Sol/medium implementer and one independent Sol/medium reviewer with compact
briefs. Read command wrappers, state exact commands/cost/pass criteria before
dispatch, and retain logs and source/input hashes. No duplicate investigation.

The owner's no-campaign restriction persists: **do not run new campaigns or
`ci:structural-fingerprint:check`**, refresh baselines, change calibration/data,
push remotely or publish. Use existing evidence and minimal local fixtures for
the real desktop advance boundary. Section 5's applicable long-run acceptance
requirements remain **deferred, not waived**, and cannot be used to imply launch
authority. If the valid-input contract changes output, stop with exact evidence;
do not tune or regenerate data. BC09 cannot claim final acceptance without its
remaining applicable gates. Handoff delivery evidence to BC07 without deciding
stability-data retain/regenerate policy. Stop after the bounded reviewed local
commit and report residual acceptance; do not proceed into Phase 2.

Audit S4 maps to BC09: `src/scenario/turn_inputs.ts` claims one owner but the scenario runner retains inline assembly. Read/parse failures become undefined; missing population can disable brigade eligibility. Preflight does not validate these census/ethnicity inputs. BC07 separately decides stability-data provenance and retain/regenerate policy; neither row discharges the other.

Audit S5 maps to BC10: external corps stance writes precede deterministic writers that overwrite them. Army intent survives. Concurrent response callbacks append AI logs in network completion order. Only non-cadet configured modes use this external path.

The current canon does not authorize treating external AI as a new autonomous authority: the commander remains the single final writer; recorded autonomous decisions cannot be changed on replay (Game Bible §24.5, Systems Manual §7.9 and v0.8.4 summary). Systems Manual §7.9 also explicitly describes assisted army/corps decisions and retained token/latency metadata. Therefore do not reinterpret the audit as authority to delete paid modes, delete all AI decisions, or remove latency fields from existing saves. Initial acquisition and replay are different contracts.

**Chosen implementation direction:** validated external corps stance proposals become scoped per-turn inputs to the existing deterministic commander, before its final safety/authority checks and emit. Delete the competing direct stance writer. Preserve player order priority, autonomy approvals, historical/event constraints and fallback behavior. No new operations, movements or decision fields are activated merely because an API type contains them.

Non-goals: changes to census/OOB/map/catalog bytes, historical timelines, combat math, AI model/provider selection, costs/caps, real API spending, new player levers, AI narrative rewriting, migration redesign, event quotas, or baseline refresh. Keep the optional event-definition omission contract handled by the separate cleanup packet.

## 2. Execution and review contract

Read `AGENTS.md`, napkin, master §§4/6/8/11, R8 controlling plan, `PLAN_EXECUTION_STANDARD.md`, `CODE_CANON.md`, Engine Invariants, Game Bible §24 and Systems Manual §7.9. The older `2026-03-24-v082-autonomy-api-plan.md` supplies context, not a second active roadmap. Preserve BC04's existing panel conditions and the owner's retired extra P1 runs.

```powershell
git status --short --branch
git worktree list --porcelain
node --version
rg -n 'loadSharedTurnInputs|eventDefinitions|municipalityPopulation1991' src/scenario src/desktop/desktop_sim.ts src/sim/turn_pipeline_types.ts
rg -n 'logDecision|applyCorpsDecisionToState|ai_decided|ai_army_decisions' src/sim/ai_commander src/sim/combat src/sim/turn_phases/war_phases.ts
```

Use an isolated `codex/` implementation branch. One Sol/medium implementer and independent Sol/medium reviewer normally suffice. **Before Phase 2 code**, honor Game Bible §24.6's Phase 0 panel for changes crossing commander/combat/political surfaces: affected Game Designer/commander, Systems/determinism and QA experts adjudicate the exact precedence/recording boundary. Preserve any required distinct canon seats, sequencing to fit the worker cap. Their task is to verify this bounded contract against current canon, not reopen the whole AI design. A conflict produces the exact conflicting clauses and decision needed; no inferred canon edit.

Stop on input policy that requires historical-data changes, changed default-mode output, unauthorized player orders, unsupported command fields, ambiguous replay identity, or unexplained hashes. Do not tune mechanics or generate new content to clear a gate.

## 3. Phase 1 — Shared validated production inputs (BC09)

**Owner/reviewer:** Systems implementer; independent Systems/QA reviewer.
**Files:** `src/scenario/turn_inputs.ts`, `src/scenario/scenario_runner.ts`, `src/desktop/desktop_sim.ts`, `src/data_prereq/data_prereq_registry.ts`, `src/data_prereq/check_data_prereqs.ts`; targeted input types if needed. Create `tests/shared_turn_inputs_contract.test.ts`; extend `tests/data_prereq_check_h1_2.test.ts` and existing desktop/scenario boundary tests found by the named-loader search.

### 1.1 Characterize the valid and intentionally incomplete inputs

1. Inventory consumers of municipality population, census-by-SID, ethnicity, OOB ordinal lookups and HQ mappings. Identify which supported scenarios intentionally omit each input; record that finite matrix here before editing.
2. Add tests comparing desktop/scenario prepared inputs from the same valid fixture: both census key schemes, sorted SID iteration, historical-name/corps/OOB lookup results, and unchanged input source objects. Include explicit minimal-fixture omission cases.
3. Add failing boundary cases for missing required file, malformed JSON and structurally invalid required data. Prove that rejection occurs before turn increment, canonical save write or broadcast; use a valid positive control so an always-throw implementation cannot pass.

### 1.2 Delete duplicate assembly and fail closed where required

1. Extract one preparation contract in the existing `turn_inputs.ts`, accepting already-loaded graph/OOB values where the scenario runner owns them. Delete corresponding inline assembly from `scenario_runner.ts`; desktop and scenario pass the same prepared fields. Do not add a new loader framework, global cache or repeated disk read inside the turn loop.
2. Make production-vs-fixture requirements explicit at entrypoint construction. Valid production campaign inputs are required and structurally checked; intentionally minimal scenarios use the inventoried explicit fixture contract. Do not globally make every optional simulation input mandatory.
3. Preserve both census key schemes and stable ASCII ordering. Preserve current source values and historical lookups exactly. Avoid silent empty-object/undefined fallback for a file the selected production contract requires.
4. Surface a file-specific failure through existing scenario errors and desktop error responses. A failed advance leaves state/save unchanged. No network repair/download or replacement data generation.

### 1.3 Acceptance and handoff

```powershell
npx.cmd vitest run tests/shared_turn_inputs_contract.test.ts tests/data_prereq_check_h1_2.test.ts tests/turn_pipeline.test.ts
npm.cmd run typecheck
npm.cmd run desktop:sim:build
```

Valid-data behavior must be unchanged; all required-data negative controls fail at the boundary; minimal fixtures remain supported explicitly. Record a clean source/input fingerprint and production/fixture policy. Hand that evidence to BC07; BC09 does not choose stability-score regeneration and BC07 does not waive BC09 failure handling. Commit Phase 1 separately before Phase 2 or a BC07 data edit.

## 4. Phase 2 — One optional-AI command and replay boundary (BC10)

**Owner/reviewer:** commander/systems implementer; independent reviewer plus required Phase 0 seats above.
**Files:** `src/sim/ai_commander/corps_commander_ai.ts`, `army_commander_ai.ts`, `decision_log.ts`, existing `decision_validator.ts`/`ai_types.ts`; `src/sim/turn_phases/war_phases.ts`, `src/sim/turn_pipeline_types.ts`; canonical `src/sim/combat/bot_corps_stance.ts`, `bot_corps_ai.ts`, `commander/commander_loop.ts` only for the named input/emit boundary. Tests: create `tests/ai_commander_execution_ownership.test.ts`, `tests/ai_commander_replay_order.test.ts`; extend `tests/ai_commander_validation.test.ts` and `tests/ai_commander_ipc.test.ts` where needed.

### 2.1 Prove current write order and lock precedence

1. Use fake/recorded clients to trace a legal corps stance proposal from response through final command output in a real turn. Add a failing case showing the overwritten legal proposal, plus illegal/enemy-sector, critical-reorganize, player-order, event-constraint, and autonomy-level controls.
2. In the Phase 0 review, pin explicit ordering: existing player authorization and hard constraints win; valid external proposals inform the canonical commander; formula fallback handles absent/failed/invalid proposals; final emit remains the only stance writer. Do not bypass the named officer's lawful interpretation or add a second writer after emit.
3. Confirm the patch need not activate API operation/brigade movement fields. If it does, stop at a scoped decision rather than enlarge this task.

### 2.2 Delete the competing mutation and order acquisition results

1. Make external acquisition return validated proposals/results without appending state inside unresolved callbacks. After collection, apply/log in stable faction/corps order through the single turn boundary. Keep concurrency for acquisition; do not add queues/services.
2. Pass the accepted stance input transiently to the canonical commander and remove `applyCorpsDecisionToState`'s competing stance mutation. Preserve assessment text through its existing owner and army-level intent. Do not persist a second command object or set a broad `ai_decided` bypass around safety checks.
3. Pin one new army/corps record per logical `(turn, level, faction, corps_id)` acquisition. Do not impose that uniqueness on advisor/event records, which may represent multiple actions. Existing log prefixes remain untouched; new batches have stable ordering. Do not sort or silently reinterpret legacy duplicate records on load.
4. Replay uses recorded responses/metadata with zero API calls and reproduces the same command/saved output. Retain existing token/latency fields and their recorded values. Compare identical complete recorded inputs when asserting byte identity; fresh network latency is not a deterministic input and independent live requests are not a valid same-input comparison. No schema/default/migration change is presumed; any necessary persisted contract change needs its explicit migration tests and required canon review.

### 2.3 Acceptance

```powershell
npx.cmd vitest run tests/ai_commander_execution_ownership.test.ts tests/ai_commander_replay_order.test.ts tests/ai_commander_validation.test.ts tests/ai_commander_parser.test.ts tests/ai_commander_ipc.test.ts tests/ai_commander_event_decision.test.ts
npm.cmd run typecheck
npm.cmd run desktop:release:check
```

Reverse fake response completion order and require identical final directives and newly recorded batches for identical full inputs. Exercise all four AI modes and autonomy levels 0–3 without real API calls; cadet and unavailable-client paths preserve formula behavior and make no unexpected calls. Verify missing key/error fallback, immutable recorded metadata, save/resume replay and legacy-log compatibility. A mocked unit test alone cannot close live pipeline ownership; use the actual pipeline and packaged settings/advance/replay surface with recorded inputs.

## 5. Campaign evidence, cost and stopping rule

Focused suites/builds are expected to take minutes to tens of minutes; measured cost is not yet known. Keep output in `logs/r8-runtime-integrity/` with command/exit code/tree/input hashes. Use Node 22 and the supported child-scoped Git Bash environment.

Each phase has a distinct commit and controlled PRE/POST attribution. Preserve master §11 and applicable §6 checks: when production simulation/output changes, two byte-identical long POST scenarios remain required, with an admissible PRE comparison. Reuse an existing run only when its exact source, inputs, mode and output contract match; do not use a combined BC09+BC10 run to claim separate causes. Plan at most one PRE (reuse if admissible) and two POST 188-week runs per affected default-mode phase, not iterative tuning. Expected long-run cost is tens of minutes per run or longer on the host; record the current estimate before launch.

For the optional-mode territory-writing repair, use one fixed complete response tape for a paired 188-week replay proof with the same scenario and required historical/safety guards; no paid network campaign. If no admissible tape exists, author a bounded deterministic test fixture as part of Phase 2 and label it synthetic. This proves replay and constraints, not historical calibration of LLM policy. Do not weaken a gate to accept synthetic policy behavior. A failed criterion stops the candidate; further campaigns need a new concrete question and owner decision. Previously retired BC04 P1 repeats/ON companions stay retired.

The separate R9 dependency preparation must land before final calibration acceptance: any affected source/lockfile change invalidates evidence only for the contracts it changes, and that impact must be stated. Final R8 still performs its required fresh packaged three-faction acceptance; headless/tape results are not player diaries. No baseline refresh, scoring-floor change, or canon change is automatic.

## 6. Closeout and prompt

BC09 and BC10 close independently with exact files, positive/negative tests, source/input identity, scenario evidence and residuals. Update this plan, R8 controlling plan, master §4.1/4.2, command board and dated ledger. Reuse existing R8 report/evidence; do not create per-check reports. Knowledge updates are only for new reusable lessons. No rating or retired-lane status changes.

**Planning evidence (2026-09-07):** documentation suites 9/9, exit 0; 163 local file links and 22 section anchors resolve; `git diff --check` exit 0. Logs: `logs/repository-audit-planning/{docs-tests.log,links.json,anchors.json,diff-check.log}`. Independent Sol/medium review found one missing alias disposition; cleanup Task 5 now explicitly owns `test:ui` retirement/compatibility and its public documentation. No other material coverage, ordering, canon or validation issues were found. **Implementation (2026-09-08):** both phases NOT STARTED; Phase 1 is now authorized as bounded above, Phase 2 remains planned.

```text
Execute the next scheduled phase of docs/plans/2026-09-07-r8-runtime-input-ai-integrity-plan.md under R8. Read its canon/authority references and preserve BC04 conditions. BC09 owns validated shared inputs, not BC07 stability-data policy. BC10 owns scoped external proposals and replay, not new AI features. Honor the Phase 0 affected-expert requirement before BC10 code. Preserve source data, FOW, autonomy, historical constraints and existing log compatibility; stop on canon conflict, unexplained drift, new command fields or ownership collision. Use fake/recorded clients; no paid API calls. Commit phases separately, run only the checks allowed by the 2026-09-08 Phase 1 authorization; campaign and final packaged acceptance remain deferred, not waived, preserve attribution and retired-run decisions, and return exit codes, evidence paths, residuals and ledger updates.
```
