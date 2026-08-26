# RE — Lean Engine Integrity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task by task.

> **Date:** 2026-08-26
>
> **Status:** T1 IN PROGRESS; T1B then T1C are the ordered pre-S0 prerequisites
>
> **Roadmap row:** Master Roadmap §5, `RE` (order 7.5)
>
> **Owner lane:** Orchestrator / RE engine-integrity lane
>
> **Workstream:** RE-0 through RE-6
>
> **Collision rule:** probe lane closed at `b711cffa9`; any new packet-file overlap stops RE
>
> **Current next action:** close T1B, execute T1C exact final-sector fixed-point convergence, then establish S0
>
> **Execution base:** `38e65547882856fba07faab7a6dbcd4258da9607`

**Goal:** Remove confirmed engine-authority, formal-battle accounting, deterministic-ordering, and locality defects without adding engine surface area or tuning historical outcomes.

**Architecture:** Converge on existing canonical owners. Delete duplicate and unreachable paths. Correct logic at the narrowest live mutation seam. Reuse existing state, ordering, diagnostics, runners, and UI authority. Every unresolved mechanic is a decision gate or evidence-only disposition, never an invitation to invent a subsystem.

**Tech Stack:** TypeScript, React, Electron CommonJS bridges, Vitest, existing deterministic scenario harness, PowerShell, Node 22.

---

## 1. Authority, state, and non-goals

This is the sole executable RE plan. The Master Roadmap owns its slot and status. The frozen
discovery record and team-disposition report are evidence, not competing queues.

Roadmap-phase mapping:

| Roadmap phase | Executable tasks |
|---|---|
| RE-0 | T0–T3 |
| Decision gates | DG-0 closed; T1B then T1C before S0; DG-1, DG-2, DG-3 before their consumers |
| RE-1 | T4–T5 |
| RE-2 | T6 |
| RE-3 | T7–T9 |
| RE-4 | T10–T12 |
| RE-5 | T13 |
| RE-6 | T14 |

Execution checklist:

- [x] T0 — capture integrated base and isolation
- [ ] T1 — establish Node-22 S0
  - [x] T1A — freeze reproducible dependency installation
  - [ ] T1B — converge mixed-battle occupation authority
  - [ ] T1C — restore exact final-sector fixed-point convergence
- [ ] T2 — audit existing observation
- [ ] T3 — repair desktop changed-path truth
- [ ] DG-1 — APWB disposition
- [ ] DG-2 — retreat/enclave authority
- [ ] DG-3 — operation-briefing authority
- [ ] T4 — delete legacy force-launch authority
- [ ] T5 — delete duplicate briefing actions
- [ ] T6 — converge formal-battle casualty ownership
- [ ] T7 — correct threat lineage
- [ ] T8 — generalize non-starving pre-planned queues
- [ ] T9 — conditional APWB cleanup
- [ ] T10 — conditional emergency-retreat correction
- [ ] T11 — correct active-formation strength
- [ ] T12 — disposition dissolution salvage locality
- [ ] T13 — disposition evidence-only mechanics
- [ ] T14 — verify, synchronize, and close

**Planning base audited:** `9d945566170efe252e1cc4d1960bad3a655625fc`.

**Execution base:** `38e65547882856fba07faab7a6dbcd4258da9607`. The probe lane closed at
`b711cffa94029c35eac18d96db91a411eb2e7abb`: stable sector identity and
`occupies_on_victory` landed; the fixed-home exclusion was reverted. Preserve that disposition.
T0 bound that post-handoff integrated commit, revalidated every path/symbol below, and recorded
the result in `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`.

RE makes no calibration change, historical target change, combat tuning change, scenario-data
change, map-geometry change, schema expansion, release, push, PR, or publication.

Hard engine-health budget:

- zero new pipeline steps, launchers, services, modules, IPC channels, flags, or default streams;
- zero new persisted fields or defaults;
- production LOC net non-positive overall;
- RE-1 production LOC at most `-200` net;
- no new full-map/per-formation scan;
- no new generic comparator, profiler, telemetry emitter, or compatibility layer;
- no artifact-schema growth;
- no outcome, faction, formation, operation, settlement, or OSID special case;
- no performance claim from a single timing sample.

## 2. Canon and required reading

Before T0, read in order:

1. `CLAUDE.md`, `.cursor/AGENT_TEAM_ROSTER.md`,
   `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`, and
   `docs/plans/PLAN_EXECUTION_STANDARD.md`;
2. `.claude/napkin.md`, `docs/life_lessons.md`, and `docs/10_canon/context.md`;
3. `docs/plans/MASTER_ROADMAP.md`, `docs/plans/COMMAND_BOARD.md`, and this plan;
4. `docs/10_canon/Engine_Invariants_v0_9_0.md`;
5. `docs/10_canon/Phase_Specifications_v0_9_0.md`;
6. `docs/10_canon/Systems_Manual_v0_9_0.md`;
7. `docs/10_canon/War_Specification_v0_9_0.md`;
8. `docs/20_engineering/CODE_CANON.md`;
9. `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`;
10. `docs/20_engineering/INVARIANTS_IN_CODE.md`;
11. `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_TEAM_DISPOSITIONS.md`;
12. `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_DISCOVERY_RECORD.md` only for cited evidence.

The determinism role currently names `docs/PHASE_A_INVARIANTS.md`, which does not exist at the
audited base. T0 must obtain a recorded process ruling that
`docs/20_engineering/INVARIANTS_IN_CODE.md` is the approved replacement, or stop. Do not create
a duplicate invariants document merely to satisfy a stale path.

Canon constraints that govern all packets:

- same input and seed produce the same ordered output;
- `strictCompare` is the final tie-break, not a substitute for semantic routing;
- operation changes occur in the operations subsystem;
- formation creation requires an explicit directive;
- raw pool depletion and realism-scaled K/W/M are distinct accounting truths;
- the Decision Room owns presidential action; read-only surfaces do not mutate state;
- event-owned sensitive-history receipts cannot be bypassed by an accidental generic route.

## 3. Entire Pyrrhic team contract

Every active seat in the authoritative `.cursor/AGENT_TEAM_ROSTER.md` participates, but only where
its authority applies. A packet does not pass on silence.

| Seat | Required contribution |
|---|---|
| Orchestrator | owns sequence, collisions, stop/go, and completion block |
| Product Manager | guards scope, roadmap order, and explicit deferrals |
| Architect | rejects parallel owners, new services, and unnecessary state |
| Technical Architect | validates entrypoints, file boundary, ADR need, and dead exports |
| Systems Programmer | invariants, exact mutation owner, state/save implications |
| Gameplay Programmer | live phase mechanics and focused red/green implementation |
| Game Designer | rules on player agency, retreat semantics, APWB, and speculative mechanics |
| Operations Expert | mandatory owner for operation lifecycle, objectives, queues, and authority |
| War or Game | mandatory realism sign-off on every 188-week comparison |
| BB Extractor | supplies cited BB evidence to Historian when a historical ruling needs it |
| Scenario Author/Runner/Tester | runs candidates and flags ahistorical or mechanically impossible output |
| Modern Wargame Expert | command-chain and information-authority review |
| Formation Expert | casualty, readiness, retreat, dissolution, and pool ownership |
| Scenario Harness Engineer | authoritative run substrate and artifact inventory |
| Determinism Auditor | ordering, byte identity, fingerprints, save/replay |
| Performance Engineer | existing-profiler protocol and regression ruling |
| QA Engineer | red/green/adversarial matrix and regression sufficiency |
| Integration Tester | end-to-end UI + IPC + save/load verification |
| Code Reviewer | independent correctness and deletion/simplicity review |
| Canon Compliance Reviewer | checks behavior and output against canon/spec precedence |
| UI/UX Developer | Decision Room ownership and read-only briefing truth |
| Narrative Designer | confirms deletion does not create contradictory player-facing copy |
| Platform Specialist | Windows command/toolchain and packaged-runtime review |
| Data Pipeline Engineer | mandatory if a tool writes derived data; otherwise records N/A |
| Historian | Petkovci and sensitive-history boundary; no mechanics by analogy |
| Map/Geometry Reviewer | inspect-only on locality unless DG-2 opens geometry work |
| Documentation Specialist | exact owner docs, indexes, reports, no canon edits |
| Ledger/Process Scribe | two-commit discipline, ledger, evidence provenance |
| Process QA | final process pass/fail; never self-certifies technical truth |
| Retrospective Analyst | records only genuinely reusable closeout lessons |

Supplementary technical reviewers, not current roster seats:

| Reviewer | Contribution |
|---|---|
| Build Engineer | Node/toolchain, desktop build, packaged boot |
| DevOps Specialist | changed-path detector and local workflow selection proof |
| Asset Integration | confirms no data/asset mutation entered a packet |
| Reports Custodian | report classification, move, and index discipline |
| Code Simplifier | mandatory post-green reduction pass |

Graphics Programmer and Lua Scripting are retired roles in the current roster. Closeout records
`NO IMPACT`; do not dispatch them or imply they are active seats.

Required decision panels:

- DG-0: Game Design + Gameplay + Operations + Systems + Canon + Architect + Orchestrator;
- DG-1: Game Design + Gameplay + Canon + Architect + Orchestrator;
- DG-2: Game Design + Formation + Map/Geometry + Historian when enclave authority is included;
- DG-3: Product + UI/UX + Systems + Architect + Orchestrator.

Required implementation reviews are stated per task. The implementer and independent reviewer must
be different agents.

## 4. Safe execution substrate

### T0 — Capture the integrated base and prove isolation

1. Confirm `b711cffa94029c35eac18d96db91a411eb2e7abb` is an ancestor of HEAD and the probe scope records
   its final disposition. The user's 2026-08-26 handoff satisfies the ownership prerequisite.
2. Fetch no remote and push nothing.
3. In the intended integration checkout record:

   ```powershell
   git rev-parse --show-toplevel
   git branch --show-current
   git rev-parse HEAD
   git status --short
   git worktree list --porcelain
   git show-ref --verify --quiet refs/heads/codex/re-engine-integrity-execution
   if ($LASTEXITCODE -eq 0) { throw "branch collision: codex/re-engine-integrity-execution" }
   ```

4. Stop if the tree is dirty, the branch exists, or any active worktree overlaps the next packet's
   exact file list.
5. Create an isolated branch/worktree from the approved commit:

   ```powershell
   git worktree add -b codex/re-engine-integrity-execution F:\AWWV-worktrees\re-engine-integrity <approved-commit>
   ```

   Stop if either the branch or literal target already exists; do not reuse or delete it.
6. In the worktree assert its resolved top-level, branch, and HEAD match the recorded values.
7. Run a literal `rg -n` inventory for every named symbol/path in Tasks T3–T14. Amend stale line
   references before any red test.
   For every active worktree path returned by `git worktree list --porcelain`, run
   `git -C <worktree-path> status --short` and
   `git -C <worktree-path> diff --name-only HEAD`; intersect both outputs with the next task's
   literal boundary. Any match, staged or unstaged, stops execution until that owner releases it.
8. Record the approved replacement for missing `docs/PHASE_A_INVARIANTS.md`; stop without it.
9. Inventory every `process.env` reader reachable from `src/scenario`, `src/sim`, and
   `src/state`; classify behavior, output, provenance, diagnostic, and profile gates in the
   living audit. Re-run this inventory after the final probe base lands; if it differs from the T1
   literal list, amend T1 before S0 rather than guessing.
10. Create the living audit
   `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md` with the T0 manifest,
   source inventory, and missing-invariants-path ruling. Index it in
   `docs/40_reports/README.md`; no `CONSOLIDATED_*` index applies until implementation closes.
   Commit only that report, its index entry, and any required plan line-reference amendment:
   `docs(RE-0): bind integrated execution base`.

**Worktree rule:** editing and focused tests may occur in the isolated worktree. No linked-worktree
scenario run is authoritative; repository experience shows it can resolve main-checkout
TypeScript. Authoritative long runs use an owner-approved clean main/integration checkout or an
independent clone at the packet's code commit. Never overwrite Claude's or another agent's checkout.

### T1 — Provision Node 22 and establish S0

**Execution status:** IN PROGRESS. T1A closed at
`2f3d6572300dc95eeae2bc05900744d905a9adf4`. The first Node-22 pair is reproducible pre-fix
evidence only; it exposed DG-0 and is not S0. T1B and then T1C must close before this procedure
resumes.

#### T1B — Converge mixed-battle occupation authority before S0

**Owner ruling:** ALL validated contributing attackers must permit occupation. An explicit
`occupies_on_victory:false` from any validated contributor vetoes a territorial flip. A contributor
whose matched operation has no declaration, or who has no matched operation, defaults to `true`.
This is a generic battle-authority rule, not a historical special case.

**May edit:** `src/sim/combat/attack_resolution_osid.ts`,
`tests/probe_territory_flip.test.ts`, the derivative canon description in
`docs/10_canon/Systems_Manual_v0_9_0.md` during the code packet, and evidence/control-plane docs.
Do not edit operation factories, attacker ordering, battle aggregation, scenario data, painted
references, checkpoint thresholds, manifests, or `docs/10_canon/FORAWWV.md`.

1. Extend `tests/probe_territory_flip.test.ts` with a literal three-attacker mixed-intent fixture:
   one validated operationless/default-occupying attacker and two validated attackers in an
   operation declaring `occupies_on_victory:false`, all issuing attack orders against the same
   target. Pin the Gojčin failure shape without using a place name or historical formation ID.
2. Capture RED: the winning mixed battle currently flips because lexicographic `firstAttacker`
   supplies the whole battle's occupation intent. Assert no control flip, no control event, and
   zero territory-gained counters while preserving one winning battle and its casualties.
3. Add positive controls in the same file:
   - every validated contributor explicitly `true` permits exactly one flip;
   - missing declarations and operationless contributors default to `true` and permit one flip;
   - one explicit `false` vetoes a flip regardless of attacker ID and input insertion order;
   - an inactive, missing, or non-adjacent would-be contributor is not validated and cannot veto.
   Assert the validated attacker count is greater than one in every mixed case so the test cannot
   pass on a single-attacker fixture.
4. In `resolveAttackOrdersOsid`, resolve each validated `attackerFormation` through the existing
   `findBrigadeOperationAnywhere` owner once. Reuse those matches for contributing-operation
   attribution, first-attacker reporting, and the occupation decision. Set battle occupation to
   `true` only when every validated contributor's declaration is
   `match?.op.occupies_on_victory ?? true`. Add no exported helper, second lookup path, state,
   schema, field, flag, module, history literal, attacker weight, or primary-attacker concept.
5. Run the exact focused RED/GREEN command:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/probe_territory_flip.test.ts --reporter=dot
   ```

   Then run Core. Run the Simplifier and repeat focused + Core.
6. Adversarial mutation: temporarily replace the all-contributors decision with the prior
   first-attacker-only decision. The mixed false-veto test must fail while the all-true positive
   control still passes. Revert the mutation and rerun green. Never commit the mutation.
7. Complexity gate: one production file plus one existing test file; no new production symbol;
   no persisted/artifact/bundle field; at most 15 net added production LOC. Record production
   numstat and confirm no full-map or per-formation scan was introduced beyond the already validated
   contributors to the current battle.
8. Reviews: Game Design, Gameplay, Operations, Systems, Technical Architect, Determinism, QA, Code
   Review, Canon Compliance, Simplifier, and Process QA. The implementer and technical reviewer
   must differ.
9. Code/test/canon commit:
   `fix(RE-0C): require unanimous mixed-battle occupation intent`.
10. From an owner-approved clean authoritative checkout at that exact code commit, prove the
    Gojčin-class mixed-battle capture is absent with focused + Core evidence. Do not run or claim S0
    yet. The prior pair at `58f100f3` remains pre-fix evidence and may not be renamed or reused as
    S0. Farz remains separately classified known-red calibration evidence; do not tune it under RE
    or describe the verifier as historically green.
11. Commit report, plan/status, control-plane, and ledger evidence only:
    `docs(RE-0C): record occupation convergence`. Do not start T1C first.

**Stop:** any new/different checkpoint breach, loss of the nine-cell enclave guard, changed Farz
signature beyond removal of the mixed-battle capture, non-historical gate failure, artifact or
fingerprint drift between the fresh pair, need for a new authority surface, or production budget
breach returns to the owner. Do not weaken the verifier or refresh a reference to pass.

#### T1C / RE-0D — Restore exact final-sector fixed-point convergence before S0

**Second unanimous ruling:** the two incomplete receipt guards introduced by the same
`53889f35595c917392d02c32dcea703938802cf9` defect family are not admissible convergence proofs.
Run both `applyFinalSectorOwnerTruthPass:4` and the ordered
`sealMergedSectorTruth:3` → `pruneGhostArtifactSectors:2` → `recoverDroppedFrontEdges:2` segment
unconditionally. Delete only those guards and bookkeeping used solely by them. Preserve stable
ordering, the bodies/arguments/order of all four calls, and all existing owner surfaces. Do not add
T1D; both corrections and their performance cost are one atomic T1C candidate.

**Editable source/test boundary:** production may edit only
`src/sim/combat/corps_front_sectors.ts`. The existing property already supplies RED and coverage;
tests may edit only `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` for the
property diagnostics and `tests/sector_partition_instrumentation.test.ts` for the static
unconditional-guard contract. No other source or test file may change. No schema, persisted field,
flag, module, cache, threshold, scenario, baseline, reference, pipeline step, or canon change.

1. Preserve the captured RED from the existing optimized-versus-unconditional property at variant
   seed 31. It has exactly four semantic differences:
   - `sector:vrs_sarajevo_romanija:4.threat_ratio`: optimized `9999`, reference `0`;
   - `sector:vrs_sarajevo_romanija:7.threat_ratio`: optimized `9999`, reference `0`;
   - `arbih_1st_mountain.entrenchment_turns`: optimized `12`, reference `0`;
   - `arbih_1st_mountain.location_osid`: optimized
     `op:novi_grad_sarajevo:novi_grad_sarajevo`, reference Centar Sarajevo.
   Do not invent or hardcode a raw Centar OSID that the retained RED output did not preserve.
2. Preserve the second captured RED at deterministic seed 55. Optimized output assigns one otherwise
   content-identical sector/sub-segment identity suffix `:5`, while the unconditional reference
   assigns `:4`; all other sector content and the complete cloned `GameState` are identical. Trace
   evidence proves that skipping `sealMergedSectorTruth:3` → `pruneGhostArtifactSectors:2` →
   `recoverDroppedFrontEdges:2` lets a transient piece consume the stable ID before later deletion.
   Do not pin a sector prefix that the retained RED did not preserve.
3. In `buildCorpsFrontSectors`, remove only the conditional guards around pass 4 and the named
   three-call convergence segment. Delete `finalTerritoryRepaired`, `prunedGhostArtifacts`,
   `recoveredDroppedFrontEdges`, or equivalent local receipt bookkeeping only where it becomes dead
   after both calls are unconditional. Keep both sequences in their current positions and orders.
   Do not alter call bodies/arguments, receipt producers used elsewhere, or any other fixed-point
   logic.
4. Run focused GREEN:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_partition_instrumentation.test.ts --pool=forks --reporter=dot
   ```

   The complete recursive property must pass all 300 candidate/reference comparisons: 100
   deterministic variants in live-war, final-turn, and final-save-projection modes, comparing every
   returned sector/sub-segment field and the entire cloned `GameState`.
5. Run two separate mutation proofs and revert after each:
   - restore only the pass-4 guard; seed 31 must fail with the same four semantic differences while
     seed 55 remains green;
   - restore only the three-call segment guard; seed 55 must fail with suffix `:5` versus `:4` while
     seed 31 remains green.
   Run the focused command after each mutation; the instrumentation static contract must reject
   either guard. Never commit a mutation.
6. Run the historical seven-file convergence matrix:

   ```powershell
   npm.cmd exec -- vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_reconciliation_session.test.ts tests/sector_territory_contiguity_repair.test.ts tests/postmerge_ghost_sector_prune.test.ts --pool=forks --reporter=dot
   ```

7. Run the complete required gates without refreshing a baseline:

   ```powershell
   npm.cmd run typecheck
   npm.cmd run test:vitest:balanced
   npm.cmd run test:baselines
   ```

8. Run Simplifier, Determinism, Systems, Performance, QA, Code Review, and Process QA. Production
   scope must be a net deletion or neutral rewrite; no new scan or owner is allowed. Commit source
   and any allowed tests as
   `fix(RE-0D): restore exact final sector fixed-point convergence`.
9. Measure the combined pass-4 plus three-call correction atomically from separate clean
   authoritative checkouts at the single exact pre-T1C parent and candidate commits. Do not time,
   accept, or report either half independently. Use the same Node 22, machine, power state, and
   exclusive background-load class. Run one excluded
   warm-up per source, then three alternating 40-week pairs in this literal order:
   `parent_1, candidate_1, parent_2, candidate_2, parent_3, candidate_3`. For every run use:

   ```powershell
   node node_modules/tsx/dist/cli.mjs tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/re_0d_<source>_<n> --report data/derived/_debug/re_0d_<source>_<n>.json
   ```

   Record exact commits, Node version, command, output/report paths and hashes, every
   `totalWallMs`, affected phase totals, resolved final-save SHA-256, and
   `run_summary.json.final_state_hash`. Require exact parent/candidate scenario bytes and hashes.
   Compare paired deltas and medians; never infer a speed claim from an arithmetic mean alone.
10. Correctness is retained even if candidate median `totalWallMs` regresses by more than 2%: do not
   restore either faulty guard. A regression above 2% requires a separately approved,
   bounded performance escalation with its own owner and evidence before T2; it does not authorize
   another truth-pass skip, a cache, or a weakened test. Zero to 2% remains watch-only.
11. From the reviewed T1C code commit, execute the complete fresh paired Node-22 S0 procedure below.
    The prior `58f100f3` pair remains pre-fix evidence only. Commit evidence/control-plane/ledger
    only as `docs(RE-0D): record exact final sector convergence and S0`. Do not start T2 first.

**Stop:** any difference beyond the known pre-fix seed-31 and seed-55 REDs, any failure outside the intended
RED/mutation phase, parent/candidate output drift after the fix, test/source scope expansion, need
for a new authority surface, or unruled performance remediation returns to the owner.

1. The owner/build seat supplies an absolute path to a Node 22 installation. Do not download or
   silently switch toolchains.
2. Activate and hard-check it:

   ```powershell
   $env:RE_NODE22 = "<owner-provided absolute path to node.exe>"
   if (-not (Test-Path -LiteralPath $env:RE_NODE22)) { throw "Node 22 path missing" }
   $env:Path = "$(Split-Path -Parent $env:RE_NODE22);$env:Path"
   if ((node -p "process.versions.node.split('.')[0]") -ne "22") { throw "Node 22 required" }
   node --version
   npm.cmd --version
   npm.cmd ci --legacy-peer-deps
   if ($LASTEXITCODE -ne 0) { throw "root npm ci failed" }
   Push-Location -LiteralPath "src/ui/map"
   try {
     npm.cmd ci --legacy-peer-deps
     if ($LASTEXITCODE -ne 0) { throw "map npm ci failed" }
   } finally {
     Pop-Location
   }
   ```

3. The audited-base environment variables that can change scenario behavior, output, provenance,
   diagnostics, or profiling are:
   `A4_ARMY_CO_ROSTER_DISABLED`, `ANALYZE_FACTION_GRAPH_PARITY_CHECK`,
   `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK`, `AWWV_ARBIH_CONTAIN_POSTURE`,
   `AWWV_BRCKO_TACTICAL_GROUP`, `AWWV_CASUALTY_REALISM_FRACTION`,
   `AWWV_CASUALTY_REALISM_V2`,
   `AWWV_CASUALTY_REALISM_RBIH`, `AWWV_CASUALTY_REALISM_RS`,
   `AWWV_CASUALTY_REALISM_HRHB`, `AWWV_COHESION_FLOOR_AT_DECREMENT`,
   `AWWV_COMMANDER_FRONT_GEOMETRY`, `AWWV_DEBUG_AXIS_READINESS`,
   `AWWV_DEBUG_REASON_CODES`, `AWWV_ENCLAVE_COLUMN_DISPLACEMENT`,
   `AWWV_FORCE_ROUTINE_DIAGNOSTICS`,
   `AWWV_INTEL_AMBUSH_DEPTH`, `AWWV_INTEL_AMBUSH_FRICTION`,
   `AWWV_MAINSTAFF_OP_AVAILABILITY`, `AWWV_MAINSTAFF_OP_RETENTION`,
   `AWWV_PDP_COHESION_CAUTION_BIAS`,
   `AWWV_PDP_INTL_STANDING_OPS_HESITATION`,
   `AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS`,
   `AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION`,
   `AWWV_POLITICAL_DIMENSION_PROPAGATION`, `AWWV_PROVENANCE_OVERRIDE`,
   `AWWV_SCORING_SIMPLE`, `AWWV_SRK_STRANGLE_POSTURE`,
   `AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992`, `AWWV_VRS_CONTAIN_POSTURE`,
   `B2_POLITICAL_LEADER_DATA_DISABLED`, `B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED`,
   `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED`,
   `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED`, `ENABLE_COLLAPSE`,
   `ENABLE_SARAJEVO_LIFELINE`, `HEAP_PROFILE_188W`, `HEAP_PROFILE_TURNS`,
   `MORALE_OVERRIDE_ENABLED`, `PERF_PROFILE_BOT_ORDERS`,
   `PERF_PROFILE_SECTOR_PARTITION`, `PERF_PROFILE_SERIALIZATION`,
   `SIEGE_MORALE_DRAIN_ENABLED`, `SUPPLY_BRIDGE_PARITY_CHECK`, and `VITEST`.
   Before S0, fail if any is present; do not clear it silently:

   ```powershell
   $forbiddenEnv = @(
     "A4_ARMY_CO_ROSTER_DISABLED","ANALYZE_FACTION_GRAPH_PARITY_CHECK",
     "ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK","AWWV_ARBIH_CONTAIN_POSTURE",
     "AWWV_BRCKO_TACTICAL_GROUP","AWWV_CASUALTY_REALISM_FRACTION",
     "AWWV_CASUALTY_REALISM_V2",
     "AWWV_CASUALTY_REALISM_RBIH","AWWV_CASUALTY_REALISM_RS",
     "AWWV_CASUALTY_REALISM_HRHB","AWWV_COHESION_FLOOR_AT_DECREMENT",
     "AWWV_COMMANDER_FRONT_GEOMETRY","AWWV_DEBUG_AXIS_READINESS",
     "AWWV_DEBUG_REASON_CODES","AWWV_ENCLAVE_COLUMN_DISPLACEMENT",
     "AWWV_FORCE_ROUTINE_DIAGNOSTICS",
     "AWWV_INTEL_AMBUSH_DEPTH","AWWV_INTEL_AMBUSH_FRICTION",
     "AWWV_MAINSTAFF_OP_AVAILABILITY","AWWV_MAINSTAFF_OP_RETENTION",
     "AWWV_PDP_COHESION_CAUTION_BIAS","AWWV_PDP_INTL_STANDING_OPS_HESITATION",
     "AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS",
     "AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION",
     "AWWV_POLITICAL_DIMENSION_PROPAGATION","AWWV_PROVENANCE_OVERRIDE",
     "AWWV_SCORING_SIMPLE","AWWV_SRK_STRANGLE_POSTURE",
     "AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992","AWWV_VRS_CONTAIN_POSTURE",
     "B2_POLITICAL_LEADER_DATA_DISABLED","B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED",
     "C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED",
     "C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED","ENABLE_COLLAPSE",
     "ENABLE_SARAJEVO_LIFELINE","HEAP_PROFILE_188W","HEAP_PROFILE_TURNS",
     "MORALE_OVERRIDE_ENABLED","PERF_PROFILE_BOT_ORDERS",
     "PERF_PROFILE_SECTOR_PARTITION","PERF_PROFILE_SERIALIZATION",
     "SIEGE_MORALE_DRAIN_ENABLED","SUPPLY_BRIDGE_PARITY_CHECK","VITEST"
   )
   $leaked = $forbiddenEnv | Where-Object { Test-Path "Env:$_" }
   if ($leaked) { throw "noncanonical S0 environment: $($leaked -join ', ')" }
   ```

4. From the authoritative clean checkout, run the canonical 188-week scenario twice into distinct
   roots using the installed JS entrypoint:

   ```powershell
   $env:AWWV_S6_GRADE_RUN = "true"
   if ($env:AWWV_S6_GRADE_RUN -ne "true") { throw "§6 grade gate not active" }
   try {
     node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs/re_s0_a
     if ($LASTEXITCODE -ne 0) { throw "S0 run A failed" }
     node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs/re_s0_b
     if ($LASTEXITCODE -ne 0) { throw "S0 run B failed" }
   } finally {
     Remove-Item Env:AWWV_S6_GRADE_RUN -ErrorAction SilentlyContinue
   }
   ```

5. Preserve both run logs and require each to contain
   `Tactical map copy SKIPPED (AWWV_S6_GRADE_RUN=true)`. Confirm the variable is absent from the
   current environment after the `finally` block. Do not add it to run provenance. For each
   resolved run directory:

   ```powershell
   node tools/verify_checkpoints.cjs <run-dir>
   node tools/engine_health_gate.cjs <run-dir> --horizon 188w --json
   node tools/validate_run_consistency.cjs <run-dir>
   node tools/diagnostics/structural_fingerprint.cjs <run-dir> --json --full
   ```

   Do not use `--strict`; it wrongly promotes advisory K:W evidence into a fatal gate.

6. Assert both `run_meta.json` files have the exact reviewed T1C code commit, are descendants of the
   bound T0 execution base, T1A, and T1B, and record `git_dirty:false`, Node 22, the same scenario/input
   digests, no provenance override, and `collapse_enabled:false`.
7. Compare `run_summary.json.historical_fit.checkpoints`; canonical checkpoints are weeks
   **39, 104, 156, and 188**. The runner does not emit standalone checkpoint saves.
8. The exact unconditional output set is:
   `activity_summary.json`, `brigade_temporal_log.jsonl`, `control_delta.json`,
   `destroyed_brigades.json`, `displacement_event_log.jsonl`, `final_save.json`,
   `end_report.md`, `formation_delta.json`, `initial_save.json`, `operation_aars.json`,
   `replay_save_manifest.json`, `run_meta.json`, `run_summary.json`,
   `watched_operations.json`, and `weekly_report.jsonl`. Assert this literal sorted set—15
   files—has no missing member and no extra unconditional output.
9. Resolve `$runA` and `$runB` to the two leaf run directories, then execute:

   ```powershell
   $artifacts = @(
     "activity_summary.json","brigade_temporal_log.jsonl","control_delta.json",
     "destroyed_brigades.json","displacement_event_log.jsonl","end_report.md","final_save.json",
     "formation_delta.json","initial_save.json","operation_aars.json",
     "replay_save_manifest.json","run_meta.json","run_summary.json",
     "watched_operations.json","weekly_report.jsonl"
   )
   $actualA = Get-ChildItem -LiteralPath $runA -File | ForEach-Object Name | Sort-Object
   $actualB = Get-ChildItem -LiteralPath $runB -File | ForEach-Object Name | Sort-Object
   $expected = $artifacts | Sort-Object
   if (($actualA -join "`n") -cne ($expected -join "`n")) { throw "run A file-set drift" }
   if (($actualB -join "`n") -cne ($expected -join "`n")) { throw "run B file-set drift" }
   foreach ($name in $artifacts) {
     if (-not (Test-Path (Join-Path $runA $name)) -or -not (Test-Path (Join-Path $runB $name))) {
       throw "missing artifact: $name"
     }
     if ($name -ne "run_meta.json") {
       $a = (Get-FileHash -Algorithm SHA256 (Join-Path $runA $name)).Hash
       $b = (Get-FileHash -Algorithm SHA256 (Join-Path $runB $name)).Hash
       if ($a -ne $b) { throw "byte drift: $name" }
     }
   }
   $metaA = Get-Content -Raw (Join-Path $runA "run_meta.json") | ConvertFrom-Json -AsHashtable
   $metaB = Get-Content -Raw (Join-Path $runB "run_meta.json") | ConvertFrom-Json -AsHashtable
   $metaA.Remove("out_dir"); $metaB.Remove("out_dir")
   $normA = $metaA | ConvertTo-Json -Depth 100 -Compress
   $normB = $metaB | ConvertTo-Json -Depth 100 -Compress
   if ($normA -cne $normB) { throw "normalized run_meta drift" }
   $fpA = node tools/diagnostics/structural_fingerprint.cjs $runA --json --full
   if ($LASTEXITCODE -ne 0) { throw "fingerprint A failed" }
   $fpB = node tools/diagnostics/structural_fingerprint.cjs $runB --json --full
   if ($LASTEXITCODE -ne 0) { throw "fingerprint B failed" }
   if (($fpA -join "`n") -cne ($fpB -join "`n")) { throw "fingerprint drift" }
   node tools/op_schedule_diff.cjs $runA $runB
   if ($LASTEXITCODE -ne 0) { throw "operation schedule drift" }
   ```

   A second normalized field requires separately recorded proof that it is path-derived.
10. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/scenario_harness_contracts.test.ts tests/run_provenance_stamp.test.ts tests/scenario_anchor_contract.test.ts --reporter=dot
   ```

11. Record exact commands, commit, source hashes, elapsed wall time, file/row/byte inventory,
   checkpoints, hashes, fingerprints, and gate results in the single RE implementation report.
12. Commit T1C/S0 evidence docs only:
    `docs(RE-0D): record exact final sector convergence and clean S0`.

### T2 — Audit existing observation; add nothing

1. Inventory constructors, state mutations, existing run artifacts, checkpoints, AARs, and
   diagnostics needed by T3–T14.
2. Record each packet's measurable positive fixture and pre-fix occurrence count.
3. Do not create an emitter, stream, manifest field, state field, sidechannel, timer, or generic
   comparison tool. If existing evidence cannot establish a packet's premise, return a separately
   bounded proposal; do not widen RE.
4. Commit the audit: `docs(RE-0): bind packet evidence to existing surfaces`.

### T3 — Repair desktop changed-path truth

**May edit:** `.github/scripts/detect-changed-paths.sh`,
`tests/desktop_release_ci_guardrails.test.ts`, and evidence docs. The workflow and packaged probe
are run-only unless a newly proved defect obtains separate scope.

1. Add positive tests for every currently imported desktop bundle root omitted by the detector:
   `src/data/`, `src/map/`, `src/scenario/`, `src/sim/`, `src/state/`, `src/utils/`,
   and `src/validate/`.
2. Run the focused test and capture RED.
3. Extend the existing desktop prefix case with those exact roots. Do not add a mode, env flag,
   CI job, or broad `src/` catch-all.
4. In the focused test's temporary Git repositories, make one source-only commit per new prefix
   and call the actual detector with `PATH_SET=desktop`, `GITHUB_EVENT_NAME=push`,
   `GITHUB_EVENT_BEFORE=<fixture parent>`, and `GITHUB_OUTPUT=<fixture output file>`. Assert
   stdout names the changed file, contains neither `WARN` nor `fail-safe`, and the output file
   contains `relevant=true`; add one unrelated-doc commit with the same no-warning assertions and
   `relevant=false`. Invoke
   `bash` on `.github/scripts/detect-changed-paths.sh` copied from the packet source; do not reimplement
   its matching logic in the test.
5. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/desktop_release_ci_guardrails.test.ts --reporter=dot
   npm.cmd run desktop:sim:build
   npm.cmd run desktop:package:probe
   ```

6. Complexity gate: at most one script + one existing test, no probe edit, no workflow edit unless
   the focused proof requires it, and at most 40 changed production/script LOC.
7. Code/test commit: `fix(RE-0E): make desktop dependency selection truthful`.
8. From that clean commit, repeat the focused test/build/package proof; obtain Build, DevOps,
   Platform, QA, and Simplifier reviews.
9. Evidence commit: `docs(RE-0E): record local workflow selection proof`.

No remote push or PR is authorized. Prepare a PR body locally only.

## 5. Universal behavior-packet protocol

For every implementation packet:

1. Re-check branch, HEAD, clean tree, Node 22, active worktrees, and packet file overlap.
2. Re-run its literal source inventory.
3. State one failing behavior and one non-goal.
4. Add or extend the named focused test. Run it and capture the expected RED.
5. Implement the smallest live-owner correction.
6. Run the focused set and exact Core:

   ```powershell
   npm.cmd run typecheck
   npm.cmd run test:vitest:balanced
   ```
7. Run the Code Simplifier; accept reductions that preserve behavior and budgets.
8. Run focused + Core again.
9. Record `git diff --numstat` over the named production files, persisted-key delta, artifact
   delta, and bundle delta where applicable.
10. Commit code/tests only: `fix(RE-x): ...` or `refactor(RE-x): ...`.
11. On the authoritative clean checkout at that exact commit, run the required deterministic pair
    and performance protocol.
12. Obtain the named independent specialist reviews. Fix findings through another code/test commit
    and repeat clean evidence if behavior changed.
13. Update the RE report, plan status, roadmap/board only if routing changed, and ledger.
14. Commit docs/evidence only: `docs(RE-x): record verified evidence`.
15. Do not start the next packet before the evidence commit.

Deletion-only packets need a source/reachability negative assertion, not a mutation test.
Behavior-changing fixes need one explicit one-line adversarial mutation: name the mutation, run the
exact test that fails, revert the mutation, and rerun green. Never commit the mutation.

Long-run rule:

- RE-2, RE-3A, and RE-3B each require Core plus a clean 188-week pair before the next packet.
- Conditional territory/operation packets require the same.
- RE-1 requires no 188-week pair only when literal caller census, focused exact-ID authority tests,
  the named old-save load/turn equivalence test, and an identical-state serialization comparison
  prove the deleted paths absent/inert. Otherwise run the clean 188-week pair. Desktop
  build/package proof is mandatory either way.
- RE-4B requires a pair only when T1/T2 finds excluded formations live or downstream output moves.

Same-platform same-commit runs must be byte-identical after the one allowed path normalization.
Cross-platform evidence compares the platform-stable structural fingerprint defined by the
determinism matrix, not raw bytes.

Performance protocol for a live affected phase:

1. Same Node 22, machine, power state, background-load class, scenario, and commit cleanliness.
2. One warm-up plus three measured 40-week runs before and after.
3. Use the existing profiler:

   ```powershell
   node node_modules/tsx/dist/cli.mjs tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/re_<packet>_<n> --report data/derived/_debug/re_<packet>_<n>.json
   ```

4. Record the exact pre/post commit IDs, median `totalWallMs`, affected phase totals, and
   `run_summary.json.final_state_hash` from each resolved profiler run directory. The profiler
   report itself does not own the final hash. Reports stay uncommitted.
5. More than 2% median regression stops the packet. Zero to 2% is watch-only, not an improvement
   claim. Peak memory is descriptive only if the existing profiler already emits it.

## 6. Decision gates

### DG-0 — Mixed-battle occupation authority

**CLOSED by owner ruling 2026-08-27: ALL.** Every validated contributor to one aggregated battle
must permit occupation. Any explicit `occupies_on_victory:false` vetoes the territorial flip;
missing declarations and operationless contributors default to `true`. Validation means the
attacker survived the resolver's existing active, located, and tactical-adjacency checks. The rule
is evaluated over that bounded contributor set only.

The panel rejected lexicographic `firstAttacker` authority and selected no primary, weighted,
majority, any-true, or history-specific rule. T1B implements the ruling without a new owner surface.
Decision/amendment commit: `docs(RE-0C): rule mixed-battle occupation authority`.

### DG-1 — APWB/friendly-objective contradiction

Read `src/sim/combat/operation_opportunities.ts` and the 5th Corps catalog. The field
`targets_friendly_overrides` is definition-only, while application is hardcoded to T1/5th Corps
and later friendly-objective stripping makes the operations self-cancel.

Default lean ruling for panel consideration: delete Tigar/APWB definitions, private
predicates/constants, catalog exports, field, override block, operation name, and scoped tests.
Do not implement Branch B without explicit owner approval because it threads a new exception into
live operation/save state. DG-1 must choose exactly whether an already-active normal
`CorpsOperation` from an old save finishes unchanged or is handled by a separately bounded
normalization packet. Prefer unchanged completion; do not add a compatibility reader.

Decision commit: `docs(DG-1): rule APWB friendly-objective disposition`.

### DG-2 — Retreat breakout and event-owned enclave authority

Rule retreat semantics before T10. Rule or explicitly defer the enclave sub-question before T13:

1. Emergency retreat from newly enemy territory with no adjacent friendly destination:
   - A: friendly-only traversal means no route; return `null`, then existing displacement applies;
   - B: hostile breakout is an explicit bounded raw-graph mechanic with defined legality/cost.
2. Whether president-requested ordinary operations may target event-owned Srebrenica/Žepa before
   their event receipts. If prohibited, require one generic event-ownership predicate shared with
   operation validation; no target-name literals.

Historian participates only in the enclave ruling. No code until the panel and owner decide.
Decision commit: `docs(DG-2): rule retreat and enclave authority`.

### DG-3 — Duplicate stage-operation UI authority

Source evidence fixes the disposition: Decision Room is the only action surface. The Operation
Briefing modal describes itself as read-only but exposes Launch/Probe/Postpone/Abort through a
name-keyed IPC that mutates state, including illegal recovery/probe writes. Panel records DELETE:
remove handler, bridge, App callback, action props/buttons; retain the modal as read-only. Do not
replace it with an exact-ID channel, service, or enum.

Decision commit: `docs(DG-3): confirm read-only operation briefing`.

## 7. Implementation tasks

### T4 — RE-1A delete legacy force-launch authority

**Production boundary:** `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`,
`src/desktop/autonomy_ipc_contract.cjs`, `src/desktop/desktop_sim.ts`,
`src/ui/map/desktop/useIPC.ts`,
`src/ui/map/components/army_hq/DirectiveCard.tsx`,
`src/sim/combat/order_interpretation.ts`, `src/sim/combat/sector_offensive.ts`,
`src/sim/turn_phases/war_phases.ts`, `src/state/game_state.ts`,
`tools/ai_play/president_playthrough.ts`, and
`tools/ai_play/run_rbih_best_outcome.ts`.

1. Extend `tests/ui/directive_card_stop_op_action.test.ts`: an opName-only force-launch must fail
   loud and invoke no IPC. Capture RED.
2. Delete `stage-operation-force-launch` handler, preload exposure, useIPC declaration/wrapper,
   DirectiveCard fallback, and stale autonomy-contract comment.
3. Preserve exact-ID owners `force-launch-proposal` and `proactive-force-launch-op`.
4. Delete the duplicate `forceLaunch` function in the AI playthrough and its unused import.
5. Repair `tests/logistics_priority_ipc_path.test.ts` so it no longer uses the deleted handler as
   a source-slice delimiter.
6. Re-run literal caller census. If no production caller remains, delete
   `interpretOperationLaunch`, `interpretOperationHalt`, their result types/export, and the
   obsolete `tests/sim/command/phase2_operation_interpretation.test.ts`. Retain
   `tests/sim/combat/order_interpretation.test.ts`, `recordPresidentialOverride`, and
   `overrideInterpretation`.
7. Delete dead `dig_in_on_halt` and `halt_delay_turns_remaining` state fields, the
   `src/sim/combat/sector_offensive.ts` reader, and stale comment/test sections. Extend
   `tests/sector_offensive.test.ts` with two otherwise identical operations, one deserialized
   with both old keys. Assert deserialization succeeds; advance both through the same turn; compare
   return values and every canonical operation/state field after removing only
   `dig_in_on_halt` and `halt_delay_turns_remaining` from the comparison projection. Assert
   production never reads or rewrites those keys. The current-state serialization fixture must
   contain neither key and gain no new key/default byte. Do not add a migration merely to strip
   inert unknown nested input.
8. Focused command:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/ui/directive_card_stop_op_action.test.ts tests/ui/presidential_decision_room.test.ts tests/desktop_persistence_contract.test.ts tests/back_the_officer_human_only_determinism.test.ts tests/logistics_priority_ipc_path.test.ts tests/sim/combat/order_interpretation.test.ts tests/sector_offensive.test.ts --reporter=dot
   ```

9. Exit census must show zero live hits under `src tools tests` for
   `stage-operation-force-launch|interpretOperationLaunch|interpretOperationHalt|halt_delay_turns_remaining|dig_in_on_halt`,
   except the named old-save fixture in `tests/sector_offensive.test.ts`. Stale production comments
   are not exempt.
10. Reviews: Technical Architect, Systems, UI/UX authority perspective, QA, Determinism,
    independent Code Review, and Simplifier.

### T5 — RE-1B delete duplicate briefing actions

**Additional boundary:** `src/ui/map/App.tsx`,
`src/ui/map/components/OperationBriefingModal.tsx`, `src/ui/map/i18n/messages.en.ts`,
`src/ui/map/i18n/messages.bcs.ts`, `tests/ui/oob_operations_panel.test.ts`, and
`tests/desktop_persistence_contract.test.ts`.

1. Complete DG-3.
2. Extend `tests/ui/oob_operations_panel.test.ts` to prove neither decision-ready nor review state
   renders Launch, Probe, Postpone, or Abort controls. Extend
   `tests/desktop_persistence_contract.test.ts` to prove main/preload/useIPC/App expose no
   `stage-operation-decision` surface. Capture RED.
3. Delete `stage-operation-decision` handler and bridge, App mutation callback, modal action props,
   `commandBridgeAvailable` prop/branch, and the Launch/Probe/Postpone/Abort action footer.
   Delete only the now-single-use paired i18n keys `operationBriefing.launchOperation`,
   `orderProbe`, `postpone`, `maxReached`, and `abortOperation`. Retain
   `reviewReadOnly` and shared `attention.bridgeUnavailableReadOnly`.
4. Keep inspection content unchanged; intentionally remove the action footer and update the stale
   modal comment that calls the callbacks passive.
5. Run T4 focused set plus:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/ui/oob_operations_panel.test.ts tests/desktop_persistence_contract.test.ts tests/desktop_packaged_runtime_probe.test.ts --reporter=dot
   ```

   Then run Core, `desktop:sim:build`, and the unchanged packaged probe. Obtain one screenshot of
   the existing real Electron QA/harness showing the decision-ready modal without the action
   footer, or a UI/UX visual sign-off on that live surface. Add no screenshot/probe harness.
6. Exit census: zero live `stage-operation-decision`; retained channels are explicitly inventoried
   (`force-launch-proposal`, `proactive-force-launch-op`, `stage-op-halt-order`,
   `stage-op-directive-order`, subject to recorded rulings).
7. Assert no new serialized keys/default bytes, no bundle growth, no new channel/module, and RE-1
   production delta at most `-200` LOC.
8. Reviews: Architect, Systems, UI/UX, Modern Wargame, Build, QA, Code Review, Simplifier.

### T6 — RE-2 formal-battle casualty ownership

**Code/test boundary:** `src/sim/combat/attack_resolution_osid.ts`,
`src/sim/combat/attack_casualty_distribution.ts`,
`src/sim/combat/tactical_group_casualties.ts`,
`src/sim/combat/attack_morale_absorption.ts`,
`src/sim/combat/attack_retreat_displacement.ts`,
`src/state/casualty_ledger.ts`, `src/sim/early_war/pool_population.ts`,
`src/sim/turn_phases/war_phases.ts`, and named tests.
`src/sim/combat/battle_resolution.ts` is a SID
compatibility fallback, not the canonical owner; do not center or casually edit it. Frontline and
siege attrition remain separate legitimate owners and are inspect-only.

**Evidence/docs boundary:** `docs/10_canon/PLAYER_TURN_GUIDE.md`, the single RE report, this plan,
roadmap/board only if routing changes, and ledgers. The Player Turn Guide is derivative pipeline
documentation, not authority to alter canon mechanics; Canon Compliance must approve that its
evidence-commit edit only removes a deleted step.

1. Add `tests/casualty_pool_attribution.test.ts` with a TG anchor and donors from different
   `origin_mun` pools plus a primary defender and distributed sector defenders from distinct
   pools. Cover present, zero, and missing pools on both sides. Capture RED.
2. Tighten attacker share conservation from ±1 to exact deterministic conservation.
3. At `resolveAttackOrdersOsid`, measure each absorber's actual loss as pre-personnel minus
   post-personnel. Requested TG shares are not authoritative because `applyPersonnelLoss` clamps
   at minimum personnel.
4. “Absorber” means attacker anchor, TG donor, primary defender, and distributed sector defender.
   For each original attacker or defender casualty group, sort positive-loss absorbers by formation
   ID with `strictCompare`; the row sum for each absorber is its actual personnel delta.
5. Derive one raw group K/W/M column total by calling `splitKiaWiaMia` once on the group's total
   actual loss. Allocate raw KIA first across absorber rows in proportion to original row loss
   using deterministic largest remainder, capped by each row's remaining capacity; allocate raw
   MIA next in proportion to remaining row capacity with the same tie rule; set each row's WIA to
   its remaining capacity. This fixes every row sum and all three raw column totals exactly.
6. Derive each pre-fix realism-scaled K/W/M column total by summing what the current code would
   record at its existing rounding boundaries: per original attacker anchor/share, per existing
   defender share, and per existing morale-absorption row. This preserves current multi-defender
   rounding. Allocate each scaled KIA, WIA, and MIA column independently across positive
   actual-loss absorbers using actual-loss weights and deterministic largest remainder with
   `strictCompare` ties. Do not capacity-cap scaled ledger rows: supported realism overrides may
   exceed 1, and ledger reporting truth is distinct from raw personnel capacity. Never reapply
   realism scaling to the newly attributed rows.
7. Change `evaluateAndApplyMoraleAbsorption` to return its local actual personnel-loss rows in
   addition to its existing result. Include those rows in resolver-side raw K/M pool charges,
   while preserving its current aggregate ledger K/W/M exactly. Add no state or report field.
8. Call the existing pool-exhaustion owner once from the live resolver using every ordinary and
   morale-absorption row's raw KIA + MIA. Sort rows by formation ID before the helper. Never charge
   pools from scaled ledger values. Do not touch ordinary frontline or siege attrition.
9. Delete the post-hoc `apply-casualty-pool-exhaustion` phase/import in
   `src/sim/turn_phases/war_phases.ts`, which
   re-derives losses from post-loss personnel and stale constants.
10. Focused command:

    ```powershell
    node node_modules/vitest/vitest.mjs run tests/casualty_pool_attribution.test.ts tests/attack_casualty_distribution.test.ts tests/tg_casualty_distribution.test.ts tests/casualty_realism_v2_gate.test.ts tests/integration_pool_integrity.test.ts --reporter=dot
    ```

11. Positive counts: actual-loss sum equals personnel delta on both sides; pool charges conserve raw
    ownership; ledger categories conserve the pre-fix faction totals. Target duplicate post-hoc
    charges: zero. Include a realism override greater than 1 and a multi-defender rounding case.
12. Code/test commit first. During the later T6 evidence commit, remove only the deleted named
    pipeline step from `docs/10_canon/PLAYER_TURN_GUIDE.md`.
13. Reviews: Systems, Formation, Gameplay, Determinism, QA, Code Review, Canon, Simplifier.

### T7 — RE-3A conserved threat lineage

**Boundary:** `src/sim/combat/commander/assess.ts` and new
`tests/commander/threat_predecessor_matching.test.ts`.

1. Add merge, split, equal-overlap tie, reordered-input, and zero-overlap fixtures. Capture the
   current last-loss overwrite RED.
2. For each previous zone, select at most one current descendant: exact ID only with positive
   overlap; otherwise maximum positive OSID overlap; `strictCompare` last.
3. Allow multiple predecessors to feed one merged current zone.
4. Attribute every vanished previous OSID at most once globally; aggregate one loss row per current
   zone. Zero-overlap losses remain unlocalized.
5. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/commander/threat_predecessor_matching.test.ts --reporter=dot
   ```

   Then run Core, adversarial mutation, clean 188-week pair, and phase performance
   protocol if T2 proves the path live.
6. Reviews: Gameplay, Operations, Determinism, Performance, QA, Simplifier.

### T8 — RE-3B generic, non-starving pre-planned queues

**Boundary:** `src/sim/combat/pre_planned_operations.ts`,
`src/sim/turn_phases/war_phases.ts`, `tests/pre_planned_operations.test.ts`, and new
`tests/preplanned_authorization_phase_progression.test.ts`.

1. Extend the existing test with two declaration-order assertions: output chains exactly equal raw
   `ALL_PRE_PLANNED` filtering, and reordering formation/corps-state insertion does not change
   them. Also cover first-decline preserves followers, permanent structural invalidity advances,
   transient conditions retain, and moot/unknown advances in the same bounded call. Capture RED.
2. For each corps derive `defsForCorps = ALL_PRE_PLANNED.filter(...)` in raw declaration order.
   Never sort by name or availability. Delete the five hardcoded named blocks and redundant
   deferred append. Add no state machine.
3. During initial injection, walk that fixed list at most once:
   - resolved, all-owned, declined, and proved `staging_adjacency` invalid are consumed and scan
     continues;
   - pending stops with no persisted future-name queue; reconstruct followers from the catalog
     after the pending decision is accepted or declined;
   - pre-availability becomes the queued head with every later definition behind it;
   - `objective_overlap`, probe overlap, temporarily missing/ineligible/committed formations,
     participant floor, and cause-dependent `op_empty` retain the head and all followers;
   - the first accepted injectable definition becomes active and every unconsumed later name
     becomes `queued_operations`.
4. Treat `staging_adjacency` as terminal only when adjacency data exists and the authored staging
   to first-objective edge is absent. Treat no-hostile-objective as terminal only through the
   existing explicit all-objectives-owned check. Unknown control retains the head. Do not infer
   terminality from a generic `op_empty`.
5. In `injectQueuedOperation`, capture queue length on entry and loop no more than that count.
   Terminal heads shift and continue in the same call; a retained head returns false; the first
   successful injection returns true.
6. Pending hides future operation names. Declined consumes its head and makes the next definition
   eligible on the next bounded reconstruction/injection.
7. In the existing `inject-player-pre-planned-operations` war-phase step, replace the
   accepted-only gate with a resolved historical-preplanned-authorization gate: player faction,
   `isHistoricalOperationAuthorizationReview(review)`,
   `review.proposed_action.startsWith('HISTORICAL_OP:preplanned:')`, and
   `accepted === true || accepted === false`. Do not trigger on unresolved, nonhistorical,
   triggered-operation, or Army-HQ reviews.
8. Add `tests/preplanned_authorization_phase_progression.test.ts` as a live phase/caller proof:
   decline the first head; on the next turn expose only the next authorization review with no
   future-name queue; accept that review; on the following turn inject it and queue the remaining
   names in raw declaration order.
9. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/pre_planned_operations.test.ts tests/preplanned_authorization_phase_progression.test.ts --reporter=dot
   ```

   Then run Core, adversarial mutation, clean 188-week pair, and performance protocol if live.
10. Net production target: at least 30 LOC deleted.
11. Reviews: Operations, Gameplay, Determinism, QA, Code Review, Simplifier.

### T9 — RE-3C conditional APWB cleanup

Open only if DG-1 approves deletion.

**Production boundary:** `src/sim/combat/operation_opportunities.ts`,
`src/sim/combat/operation_opportunity_catalog_5th_corps.ts`,
`src/sim/combat/operation_names.ts`, and only the four tests below.

1. Extend:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/operation_objective_hostility.test.ts tests/operation_opportunities_substrate.test.ts tests/operation_opportunities_catalog.test.ts tests/operation_opportunity_state_validation.test.ts --reporter=dot
   ```

2. Delete the two dead/self-cancelling definitions, private predicates/constants, exports,
   `targets_friendly_overrides`, override block, operation name, and scoped expectations.
3. Keep a positive generic hostility test. Add no replacement mechanic or compatibility reader.
4. Run focused, Core, clean 188-week pair, and normal packet reviews.

### T10 — RE-4A conditional emergency-retreat correction

**Boundary:** `src/sim/combat/attack_retreat_displacement.ts` and
`tests/emergency_retreat_reachability.test.ts`.
`src/sim/combat/osid_adjacency.ts` is inspect-only unless the
approved DG-2 algorithm proves a change necessary.

1. Complete DG-2. Do not “fix” the current BFS by merely populating `next`: friendly-only
   traversal cannot leave an enemy source with no adjacent friendly cell.
2. Extend the existing test with enemy source/no adjacent friendly, configured remote home,
   configured remote HQ, disconnected graph, cycle, deterministic equal candidates, and the 706th
   topology. Capture RED.
3. If ruling A: this helper is reached only after adjacent-friendly retreat already failed, so
   return `null` before home/fallback, attempted BFS, HQ, same-component, largest-component, or
   any-friendly selection. Remove the `originComponent === undefined => true` reachability rule.
   Existing inactive/displaced handling remains the sole result.
4. If ruling B: return for a bounded plan amendment defining raw-graph hostile-route legality,
   maximum hops, penalties, organizational validity, and complexity. Do not infer them.
5. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/emergency_retreat_reachability.test.ts --reporter=dot
   ```

   Then run Core, adversarial mutation, candidate/search counts, clean 188-week pair if live,
   and performance protocol.
6. Observe the 706th's later dissolution separately; add no immunity.
7. Reviews: Formation, Gameplay, Map/Geometry, Determinism, Performance, QA, Simplifier.

### T11 — RE-4B active formation strength

**Boundary:** `src/sim/negotiation/patron_pressure.ts`,
`tests/negotiation_patron_pressure.test.ts`, and new
`tests/patron_active_formation_strength.test.ts`.

1. Add table cases: active; inactive status; forming, displaced, destroyed, disbanded, merged,
   withdrawn lifecycle; absent lifecycle as legacy-active; wrong faction; wrong kind. Assert
   downstream override authority. Capture RED.
2. Use the minimal local predicate:
   `status === 'active' && (lifecycle_status ?? 'active') === 'active'`, retaining existing
   faction and brigade-kind filters.
3. Update old fixtures to explicit active status and delete the unused local.
4. Run:

   ```powershell
   node node_modules/vitest/vitest.mjs run tests/patron_active_formation_strength.test.ts tests/negotiation_patron_pressure.test.ts --reporter=dot
   ```

   Then run Core and the liveness-conditioned pair.
5. Reviews: Systems, Formation, Gameplay, Determinism, QA, Simplifier.

### T12 — RE-4C dissolution salvage triage only

Read `src/sim/combat/brigade_dissolution.ts` and both war-phase call sites. The current caller has no adjacency
and its first call precedes spatial-cache construction, so RE-4A reuse is not free.

Default disposition: defer. If evidence opens it, stop and amend this plan with signature/call-site
ownership, an adjacency source, a red test in `tests/brigade_dissolution_paths.test.ts`, budgets,
and long-run gates before code.

### T13 — RE-5 evidence-only mechanics dispositions

Write seven short, source-cited dispositions in the single RE report. Production code/data remains
untouched.

1. Garrison timer/fallback formation creation: reject/defer; no current mechanic and formation
   creation requires a directive.
2. Planner estimator: defer formula; live canonical prediction already aggregates participants.
   A stale comment is a separate docs/code-comment correction only with authority.
3. Strategic reserve orphan: record that `committed` is cumulative, not current ownership;
   redesign is gameplay/reinforcement scope and needs separate 188-week evidence.
4. Rebuild/reinforcement latency: distinguish five-turn reconstitution from same-turn ordinary
   replenishment; disruption gating is a new mechanic, so defer.
5. Dissolution floors: audit all writers and observed paths; do not tune thresholds.
6. Petkovci: route to operation-authoring/historian decision; no engine or place-name special case.
7. Presidential enclave requests: close only through DG-2; if prohibited, schedule the generic
   authority predicate as a separately bounded conditional packet.

Reviews: Product, Game Design, Gameplay, Formation, Historian, Canon, Architect, Orchestrator.
Commit: `docs(RE-5): disposition speculative mechanics without engine growth`.

## 8. Per-packet evidence record

Use one living report:
`docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`. At T14, after every
implementation gate passes, move that same file to
`docs/40_reports/implemented/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`; update
`docs/40_reports/README.md` and `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` atomically.
Do not create a second RE report.

Each section contains:

- packet and exact code commit;
- branch, clean status, Node/npm, OS, machine/power/load class;
- changed files and `git diff --numstat`;
- pre-fix positive-fixture occurrence count and post-fix target count;
- RED command/result, implementation summary, focused/Core results;
- adversarial mutation or deletion census;
- serialized-key/default-byte and artifact field/row/byte deltas;
- same-platform pair manifest, normalized-meta rule, hashes, checkpoints, health results;
- performance samples/median when applicable;
- Simplifier result and independent specialist rulings;
- player-visible/UI effect or explicit “none”;
- deviations, stop decisions, and follow-up authority.

## 9. T14 — Closeout and synchronization

1. Re-run every affected focused test, Core, final clean 188-week pair, checkpoint verifier, and
   health gate without `--strict`.
2. Re-run source census for every deleted symbol and budget check for every changed production
   file.
3. Confirm no new persisted fields, artifacts, channels, modules, services, flags, pipeline steps,
   or default streams.
4. Run final same-platform determinism and applicable performance protocol.
5. Obtain final reviews from every Pyrrhic seat in §3; seats may mark N/A only with one sentence of
   authority reasoning.
6. Process QA verifies context/napkin reading, two-commit packet discipline, ledger, canon and
   determinism treatment, clean evidence, and that `docs/10_canon/FORAWWV.md` was not edited.
7. Update atomically:
   - this plan;
   - `docs/plans/MASTER_ROADMAP.md`;
   - `docs/plans/COMMAND_BOARD.md`;
   - `docs/plans/README.md`;
   - `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md`;
   - `docs/00_start_here/docs_index.md`;
   - report indexes/calibration pause status if their truth changed;
   - `docs/PROJECT_LEDGER.md`;
   - `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for a reusable lesson.
8. Move the living audit from `audits/` to `implemented/`; update the reports README and
   consolidated implemented index in the same change.
9. Commit docs/control plane only: `docs(RE-6): close lean engine integrity rail`.
10. Push, PR creation, merge, tag, publication, and release remain separately authorized actions.

## 10. Stop conditions

Stop immediately when:

- probe or another worktree overlaps the next packet;
- execution HEAD differs from the recorded approved base without amendment;
- Node major is not 22;
- an authoritative scenario resolves sources outside the packet commit;
- tree/run metadata is dirty or commit/input digests disagree;
- a decision-gated mechanic lacks its ruling;
- the proposed fix needs a new state field, stream, service, module, flag, pipeline step, or
  special case;
- aggregate casualty truth, byte identity, checkpoint structure, save compatibility, package boot,
  or player authority regresses;
- median affected-phase runtime regresses by more than 2%;
- scope needs canon modification beyond T1B's named derivative Systems Manual propagation;
- an evidence report attempts to become a second execution queue.

Return a source-cited bounded amendment. Do not improvise.

## 11. Completion block

**Canonical owner:** `docs/plans/MASTER_ROADMAP.md` for workstream state; this file for execution.

**Demoted paths:** frozen discovery, team dispositions, historical ledger entries, and evidence
reports are inputs only.

**Player-visible truth:** RE deletes duplicate presidential mutation routes and preserves the
Decision Room as the action owner. Other packets change internal correctness only unless their
verified report states otherwise.

**Canonical UI surface:** Decision Room for presidential action; Operation Briefing for read-only
inspection; existing deterministic receipts for outcomes/refusals.

**Done means:** every T0–T14 task is closed or explicitly deferred by its allowed gate; all code
packets have separate clean evidence commits; focused/Core/determinism/performance/package gates
applicable to each packet pass; all specialists sign or record N/A; budgets hold; control-plane
docs and ledger agree; no probe work or speculative mechanic entered RE.

## 12. Copy-ready external-agent execution prompt

```text
Role: You are the RE Lean Engine Integrity implementing agent, coordinated by the Orchestrator and
reviewed by the full active Pyrrhic roster.

Objective: Execute exactly one unchecked task from
docs/plans/2026-08-26-engine-integrity-plan.md. Start with T0 unless the plan and living RE audit
prove an earlier task closed. The probe lane closed at b711cffa9; preserve its landed/reverted
disposition and do not reopen probe work under RE.

Required method:
1. Read every document in plan §2 and record the execution commit.
2. Use the plan's exact file boundary, RED test, command, complexity budget, specialist reviews,
   and stop conditions. Do not substitute a legacy owner or invent a mechanism.
3. Apply Engine Invariants, Phase Specifications, Systems Manual, CODE_CANON, and the determinism
   matrix in precedence order. Use Node 22 and the plan's exact Core commands.
4. For a behavior packet, commit code/tests first. Run authoritative clean evidence at that exact
   commit. Then commit report/ledger/control-plane evidence separately.
5. Preserve deterministic ordering, same-platform byte identity, save compatibility, player
   authority, and engine-health/performance budgets. Update docs/PROJECT_LEDGER.md; update
   PROJECT_LEDGER_KNOWLEDGE.md only for a reusable rule. Never edit FORAWWV.md.
6. STOP AND ASK with a source-cited bounded amendment if any decision gate is unresolved, a named
   owner/path moved, another worktree overlaps, Node/provenance is wrong, a new field/channel/
   service/module/flag/stream/pipeline step appears necessary, canon would change, or a gate fails.

Required output:
- task and exact commit;
- files changed and production numstat;
- RED and GREEN commands/results;
- Core, determinism, save/schema, package/UI, long-run, and performance evidence as applicable;
- Simplifier and independent specialist verdicts;
- code/test commit and evidence/docs commit;
- player-visible impact or explicit none;
- ledger/report/control-plane updates;
- remaining stop, decision, or next unchecked task.

Do not push, create a PR, merge, tag, publish, or start the next packet.
```
