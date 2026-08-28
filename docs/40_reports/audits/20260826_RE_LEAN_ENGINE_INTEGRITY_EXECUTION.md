# RE 1.0 Engine Integrity — Living Audit

**Date:** 2026-08-26

**Status:** P1/P2A accepted; P2B HELD before implementation after packaged-probe NO VERDICT; P3
waiting; auxiliary probe instrumentation stopped at final R2 RED before production, with no R3;
alternate packaged-proof discovery queued behind a fresh docs-only lock; calibration pause and
long-run denial unchanged

**Plan:** `docs/plans/2026-08-26-engine-integrity-plan.md`

**Approved execution base:** `38e65547882856fba07faab7a6dbcd4258da9607`

**Execution branch:** `codex/re-engine-integrity-repaired`
**Execution worktree:** `F:\AWWV-worktrees\re-engine-integrity`

This is the single living RE evidence record. It is not a second queue. The plan remains the
execution authority and `docs/plans/MASTER_ROADMAP.md` remains the workstream-state authority.

## 2026-08-27 owner-approved 1.0 scope reduction

Architect and Orchestrator now own RE scope. The owner approved their binding release contract. The
old T0–T14 execution rail is superseded; its historical evidence below remains valid but grants no
future authority.

| Order | Packet | Required outcome |
|---:|---|---|
| 1 | P1 | Desktop release path detection covers all seven imported roots |
| 2 | P2A | Legacy force-launch authority and stale state are deleted |
| 3 | P2B | Operation Briefing is read-only; Decision Room solely mutates |
| 4 | P3 | Threat lineage conserves vanished OSIDs through split/merge |
| 5 | P4 | Catalogue-ordered pre-planned queues cannot starve followers |
| 6 | P5 | APWB/Tigar friendly-objective exception is deleted |
| 7 | P6 | Formal-battle casualty and pool accounting has one owner |
| 8 | P7 | No-route retreat returns `null` to existing displacement |

Each future row in this audit is compact: exact base, canonical staged implementation payload
SHA-256 plus its exact path list, changed files/production numstat, focused RED/GREEN,
typecheck/balanced, applicable save/package proof, implementer/domain/QA verdict, and player-visible
effect. The payload contains named production/test paths only, excluding lock/audit/control/docs.
Its repository-relative paths are byte-order sorted; Git-index values, not worktree bytes, produce
UTF-8 LF rows `<path>\t<staged-mode>\t<staged-blob-id>\n`, with staged deletions encoded
`<path>\tDELETE\t-\n`; SHA-256 covers the full manifest. A packet cannot record its own
not-yet-created commit ID. Final docs sync may map the digest to the resulting commit, but need not.
One correction pass and one confirmation pass are permitted. There are no per-packet campaigns or
duplicate evidence commits.

The already-measured `+3.62853%` mandatory-correctness cost is watch-only, not a 1.0 gate. No
further pre-1.0 diagnosis or optimization is authorized. Deferred: active-formation strength pending
a live artifact, dissolution salvage, enclave targeting, hostile breakout, and speculative
mechanics. Retired: broad T2 audit, T13 essays, standalone T14, repeated full-team review, and the
old performance-remediation queue.

## T0 — Integrated base and isolation

### Required reading and authority

The implementer read the complete ordered set in plan §2 before editing: repository/team/process
instructions; napkin and life-lessons index; context, roadmap, board, and plan; Engine Invariants,
Phase Specifications, Systems Manual, War Specification, CODE_CANON, Determinism Test Matrix,
Invariant Inventory, full-team dispositions, and the cited discovery evidence. The controlling
rules are deterministic ordering, one live mutation owner, no duplicate authority, no new engine
surface, and no scenario claim without clean exact-commit evidence.

### Base manifest

| Check | Result |
|---|---|
| Integration checkout | `F:/A-War-Without-Victory` |
| Integration branch | `codex/engine-integrity-docs` |
| Approved HEAD | `38e65547882856fba07faab7a6dbcd4258da9607` |
| Integration status | clean |
| Probe closeout ancestor | `b711cffa94029c35eac18d96db91a411eb2e7abb`; `merge-base --is-ancestor` exited 0 |
| Execution checkout | `F:/AWWV-worktrees/re-engine-integrity` |
| Initial execution branch | `codex/re-engine-integrity-execution` (superseded and preserved) |
| Execution HEAD before T0 docs | `38e65547882856fba07faab7a6dbcd4258da9607` |
| Execution status before edits | clean |
| Remote/network action | none |
| Push/PR/publication | none |

The first `git worktree add` tool call yielded after 30.2 seconds while Git reported 14% checkout.
The Git and Git-LFS child processes continued normally, completed the checkout, and removed the
temporary `locked initializing` marker. The final worktree was independently rechecked as unlocked,
clean, on the exact branch and approved HEAD. This was a long checkout, not a failed or recovered
checkout; no target was deleted, reused, reset, or overwritten.

### Probe handoff disposition

The integrated base preserves the closed probe lane exactly:

- stable sector identity landed;
- `occupies_on_victory` landed;
- the fixed-home exclusion was reverted after the tag was measured on 180 of 184 brigades.

Evidence is recorded in `MASTER_ROADMAP.md:19-40,65-66`, the RE plan at its execution-base block,
and closeout commit `b711cffa9`. Commits after that closeout and before the approved base are docs-only
RE handoff commits (`ccccc489d`, `38e655478`). RE does not reopen probe work.

### Active-worktree collision census

Every path returned by `git worktree list --porcelain` was checked with both
`git -C <path> status --short` and `git -C <path> diff --name-only HEAD`.

- Clean: integration checkout; `docs-sync`; `engine-truth-checkpoint`;
  `four-week-phantom-boundary`; `hv-1995-roster-calibration`; `mainstaff-fix`;
  `test-suite-recovery`; all three `upper-drina-40w` sparse/v2/v3 worktrees; `awwv-eb1`;
  `awwv-hv-data`; `awwv-instr`; this execution worktree; and `re-plan-refinement`.
- Dirty: `C:/Users/User/.codex/worktrees/awwv-upper-drina`, with 20 modified paths.
- T1 literal-boundary intersection: zero. No worktree touches this living report.
- Future collision already visible: the dirty upper-drina tree touches T6
  (`src/sim/combat/attack_resolution_osid.ts`) and T8
  (`src/sim/combat/pre_planned_operations.ts`, `tests/pre_planned_operations.test.ts`). This does
  not block T1–T3, but T6/T8 must stop unless that owner releases or rebases those exact files.

No other worktree had staged or unstaged paths. This census is point-in-time evidence; the universal
packet protocol repeats it before every packet.

## T0 source inventory — T3 through T14

All plan-named existing files were found. The three test paths explicitly described as new are
correctly absent before their packets:
`tests/commander/threat_predecessor_matching.test.ts`,
`tests/preplanned_authorization_phase_progression.test.ts`, and
`tests/patron_active_formation_strength.test.ts`.

### T3 — desktop changed-path truth

`.github/scripts/detect-changed-paths.sh:64-84` currently includes `src/desktop/`, `src/ui/`,
`src/shared/`, and `src/runtime/` in the desktop case, but omits all seven imported bundle roots
named by T3: `src/data/`, `src/map/`, `src/scenario/`, `src/sim/`, `src/state/`, `src/utils/`, and
`src/validate/`. `tests/desktop_release_ci_guardrails.test.ts:74-94` only pins the existing list.
The workflow and packaged probe remain run-only.

### T4–T5 — duplicate presidential mutation authority

- `stage-operation-force-launch`: handler `electron-main.cjs:2593`; preload `preload.cjs:82`;
  caller/export path `DirectiveCard`, `useIPC`, and `desktop_sim`; AI duplicate at
  `tools/ai_play/president_playthrough.ts:29,284,308`.
- `interpretOperationLaunch` / `interpretOperationHalt`: live exports at
  `order_interpretation.ts:584,716`; dead-state readers at `sector_offensive.ts:1259-1271`;
  fields at `game_state.ts:545,615`.
- Retained exact-ID owners: `force-launch-proposal` at `electron-main.cjs:3896` and
  `proactive-force-launch-op` at `electron-main.cjs:3974`.
- `stage-operation-decision`: handler `electron-main.cjs:3021`; preload `preload.cjs:83`;
  modal mutation props/actions `OperationBriefingModal.tsx:28,359,544-584`.
- Retained Decision Room/read-only truth: `operationBriefing.reviewReadOnly` and
  `attention.bridgeUnavailableReadOnly`; retained channels `stage-op-halt-order` and
  `stage-op-directive-order` are live in main/preload.

### T6 — formal-battle casualty ownership

- Canonical resolver: `attack_resolution_osid.ts:500` (`resolveAttackOrdersOsid`).
- Personnel mutation: `attack_retreat_displacement.ts:500` (`applyPersonnelLoss`).
- Ledger split/distribution: `attack_casualty_distribution.ts:43,166-167`.
- Morale absorption independently mutates and records at
  `attack_morale_absorption.ts:63,155-168`.
- Duplicate post-hoc owner: import `war_phases.ts:115`, phase
  `apply-casualty-pool-exhaustion` at `war_phases.ts:3092-3138`, calling
  `pool_population.ts:422` after personnel was already reduced.
- `battle_resolution.ts` has a separate SID fallback-local `applyPersonnelLoss` at line 749 and is
  not the canonical OSID owner.

### T7 — threat predecessor lineage

`assess.ts:171-220` builds prior-zone sets, loops every current zone over every previous zone, and
overwrites `osidsLost` with the last non-empty predecessor loss. The current code has no positive
overlap selection, no one-descendant-per-predecessor rule, and no global vanished-OSID attribution.

### T8 — pre-planned queues

`pre_planned_operations.ts:1050` owns `ALL_PRE_PLANNED`; injection walks it at lines 1328-1497,
but still installs five name-specific queue blocks at lines 1436-1482. `injectQueuedOperation`
at lines 1508-1599 examines only the head and returns after a terminal shift, permitting starvation.
The live phase callers are `war_phases.ts:1813` and `1958`.

### T9 — APWB conditional cleanup

`targets_friendly_overrides` is defined at `operation_opportunities.ts:247-257` and applied at
`1251-1279`. Tigar and APWB definitions, predicates, constants, exports, and tests remain live in
`operation_opportunity_catalog_5th_corps.ts:441-923`; `operation_names.ts:128` retains the name.
This packet remains closed until DG-1.

### T10 — emergency retreat

`findEmergencyRetreatOsid` is live at `attack_retreat_displacement.ts:259`. The source permits every
candidate when `originComponent` is absent (`:275-281`), then falls through home, fallback, HQ,
same-component, largest-component, and any-friendly selection (`:284-340`). The current test already
asserts remote-home and largest-component behavior. Code remains closed until DG-2.

### T11 — active formation strength

`getMilitaryStrengthRatio` at `patron_pressure.ts:335-356` filters faction and brigade kind, then
excludes only destroyed/disbanded/merged/withdrawn lifecycle values. It does not require
`status === 'active'` or active lifecycle, so inactive/forming/displaced rows remain counted.

### T12 — dissolution salvage locality

`dissolveCombatIneffectiveBrigades` is live at `brigade_dissolution.ts:110`. Equipment salvage at
`:187-207` selects the first alphabetically sorted same-corps active brigade; it receives no
adjacency. The two war-phase callers are `war_phases.ts:1206-1208` and `3185-3193`; the first precedes
the spatial-cache construction. T12 therefore remains triage/default defer as planned.

### T13–T14 — evidence-only and exit owners

The garrison/fallback, prediction, strategic-reserve `committed`, five-turn reconstitution,
ordinary replenishment, dissolution thresholds, Petkovci, and enclave-request questions all have
live source evidence, but no T13 production boundary. T13 remains docs-only and decision-gated.
T14 must repeat the literal deletion census for both desktop channels, interpretation exports, and
dead state keys, plus every budget/schema/artifact check.

No named line reference in the executable steps was stale enough to change a file boundary or test
instruction. The current anchors above supersede proposal/discovery-era line numbers.

## Environment-reader inventory

The literal inventory covered `process.env`, optional-process access, aliased process objects,
computed keys, and the reachable `src/utils/routine_console_diagnostics.ts` helper. Initial T0
inspection found `AWWV_CASUALTY_REALISM_V2` at
`src/sim/combat/casualty_realism_v2_gate.ts:109`. Independent lean review then caught three more
reachable readers before S0: `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED` at
`src/sim/combat/army_order_interpretation.ts:196`, `PERF_PROFILE_SECTOR_PARTITION` at
`src/sim/combat/corps_front_sectors.ts:151`, and computed-key `PERF_PROFILE_BOT_ORDERS` in
`src/sim/combat/_perf_profile_bot_orders.ts:1,44`. Both T1 denylist copies were amended; no run was
attempted.

### Behavior/state/outcome gates

`A4_ARMY_CO_ROSTER_DISABLED`, `AWWV_ARBIH_CONTAIN_POSTURE`,
`AWWV_BRCKO_TACTICAL_GROUP`, `AWWV_CASUALTY_REALISM_FRACTION`,
`AWWV_CASUALTY_REALISM_RBIH`, `AWWV_CASUALTY_REALISM_RS`,
`AWWV_CASUALTY_REALISM_HRHB`, `AWWV_CASUALTY_REALISM_V2`,
`AWWV_COHESION_FLOOR_AT_DECREMENT`, `AWWV_COMMANDER_FRONT_GEOMETRY`,
`AWWV_ENCLAVE_COLUMN_DISPLACEMENT`, `AWWV_INTEL_AMBUSH_DEPTH`,
`AWWV_INTEL_AMBUSH_FRICTION`, `AWWV_MAINSTAFF_OP_AVAILABILITY`,
`AWWV_MAINSTAFF_OP_RETENTION`, `AWWV_PDP_COHESION_CAUTION_BIAS`,
`AWWV_PDP_INTL_STANDING_OPS_HESITATION`,
`AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS`,
`AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION`,
`AWWV_POLITICAL_DIMENSION_PROPAGATION`, `AWWV_SRK_STRANGLE_POSTURE`,
`AWWV_VRS_CONTAIN_POSTURE`, `B2_POLITICAL_LEADER_DATA_DISABLED`,
`B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED`,
`C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED`, `ENABLE_COLLAPSE`,
`ENABLE_SARAJEVO_LIFELINE`, `MORALE_OVERRIDE_ENABLED`, and
`SIEGE_MORALE_DRAIN_ENABLED`.

### Output/scoring/diagnostic/telemetry gates

`ANALYZE_FACTION_GRAPH_PARITY_CHECK`,
`ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK`, `AWWV_DEBUG_AXIS_READINESS`,
`AWWV_DEBUG_REASON_CODES`, `AWWV_FORCE_ROUTINE_DIAGNOSTICS`, `AWWV_SCORING_SIMPLE`,
`C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED`, `SUPPLY_BRIDGE_PARITY_CHECK`, and `VITEST`.

### Provenance/input gates

`AWWV_PROVENANCE_OVERRIDE` and `AWWV_STARTUP_SNAPSHOT_OVERRIDE_APR_1992`.

### Profile-only gates

`HEAP_PROFILE_188W`, `HEAP_PROFILE_TURNS`, `PERF_PROFILE_BOT_ORDERS`,
`PERF_PROFILE_SECTOR_PARTITION`, and `PERF_PROFILE_SERIALIZATION`.

Reachability, not a categorical telemetry or profile exclusion, controls the S0 denylist.
Independent lean review closed the aliased/computed-reader gap before S0. T1 must fail if any listed
variable exists; it must not clear one silently.

## Missing invariants-path ruling

`Test-Path docs/PHASE_A_INVARIANTS.md` is false at the approved base. The Systems Programmer plus
Determinism/Process seat issued **PASS with scope** at
`38e65547882856fba07faab7a6dbcd4258da9607`:

- `docs/20_engineering/INVARIANTS_IN_CODE.md` is approved only as the replacement for the stale
  required-reading reference and as a supplemental code-enforcement inventory;
- it is not a canonical Phase A replacement, creates no new canon, and never overrides live
  authority;
- ordered authority remains Engine Invariants plus Rulebook/Systems Manual/phase specs, then
  CODE_CANON, then DETERMINISM_TEST_MATRIX; INVARIANTS_IN_CODE is supplemental only.

Source anchors: `CODE_CANON.md:3-25`, `DETERMINISM_TEST_MATRIX.md:3-15,53-83`, and
`INVARIANTS_IN_CODE.md:1-18`. No duplicate `docs/PHASE_A_INVARIANTS.md` was created.

## T0 disposition

**PASS for T1.** The approved base is bound, the isolated execution branch is clean and exact,
the immediate T1 evidence boundary has no worktree collision, source anchors are live, all four
denylist discoveries are included, and the missing-doc ruling is recorded.
T1 may provision only an owner/build-supplied Node 22 and establish S0. No T1 action occurred here.

T0 changes documentation/process evidence only. It makes no gameplay, output, scenario, canon,
state, schema, default, or workflow-architecture change. T0 did make the bounded T1
execution-procedure amendment that added all four reviewed environment readers to the fail-closed
denylist; that amendment, T0 completion, and the control-plane sync are recorded in
`docs/PROJECT_LEDGER.md`. No knowledge-ledger or `docs/10_canon/FORAWWV.md` edit is required.

## T1A — Frozen dependency-install precondition

**Status:** CLOSED; T1 remains in progress and S0 has not run.

### Failure, stop, and safe recovery

The first exact T1 install attempt used the plan's then-current commands under the supplied npm
10.9.4 runtime: root `npm install --legacy-peer-deps`, followed in the same shell by
`npm install --legacy-peer-deps --prefix src/ui/map`. Both commands exited zero, but the required
clean-tree assertion then stopped T1 before any scenario or focused harness run. The mutable install
rewrote `package-lock.json` and `src/ui/map/package-lock.json`; the prefixed map install also added
`"awwv": "file:../../.."` to `src/ui/map/package.json` and created
`src/ui/map/node_modules/awwv` as a junction targeting the repository root.

Recovery was link- and file-bounded. The integration checkout top-level, detached T0 HEAD, exact
three-file dirty set, junction link type, and junction target were proved first. The junction link
alone was removed non-recursively after its target resolved exactly to the repository root; the root
and HEAD were then re-proved. Only the three task-generated tracked files were restored from HEAD.
The integration checkout returned clean at the exact T0 commit. No scenario run, source edit,
download, toolchain substitution, or destructive directory removal occurred.

### Build, platform, and architecture rulings

- **Build/Platform — PASS:** use the existing signed runtime at
  `C:\Users\User\AppData\Local\Logi\LogiPluginService\PluginHosts\node22\node\node.exe` only.
  It reports Node `22.21.1`, npm `10.9.4`, and Node executable SHA256
  `471961CB355311C9A9DD8BA417ECA8269EAD32A2231653084112554CDA52E8B3`. No Node runtime download
  or installation was authorized.
- **Technical Architect + QA — PASS:** replace mutable installs at their existing seams with exact
  `npm ci --legacy-peer-deps`; run the map command from `working-directory: src/ui/map` in CI and
  from a literal `Push-Location` plus `try/finally` locally. Add no wrapper, dependency, config,
  cache, job, step, trigger, permission, or alternate installer.
- **Independent specification review — PASS:** the final contract enumerates every workflow, pins
  exact counts and commands, and fails if a new `.yml` or `.yaml` workflow is not covered.
- **Independent lean review — PASS:** the correction adds no engine surface or runtime code and
  rejects both `npm install` and `npm.cmd install` without a helper or dependency.

### Implementation and TDD evidence

The reviewed code/test/docs commit is
`2f3d6572300dc95eeae2bc05900744d905a9adf4` (`fix(RE-0B): freeze dependency installation`).
It covers all six workflow files and their existing 13 root/map install pairs:

| Workflow | Root/map pairs |
|---|---:|
| `baseline-regression.yml` | 5 |
| `desktop-release-guard.yml` | 2 |
| `event-system-ci.yml` | 1 |
| `full-suite-and-fingerprint.yml` | 2 |
| `release.yml` | 2 |
| `typecheck.yml` | 1 |

RED under Node 22 ran only `tests/ci_dependency_install_contract.test.ts`: both tests failed for
the intended reasons, namely mutable workflow commands and stale README convention truth. GREEN
under the same runtime ran the new owner plus
`tests/baseline_regression_ci_guardrails.test.ts`,
`tests/desktop_release_ci_guardrails.test.ts`, and `tests/test_runner_contract.test.ts`: four test
files, 13 tests, all passed. `npm.cmd run typecheck` also exited zero under Node 22.

The frozen dependency inputs remained byte-exact:

| File | SHA256 |
|---|---|
| `package-lock.json` | `0EDDD5B746F0BEE4B067F9E77CFDDCD11224FAAD2E09E64F965F696A4A6B1C3E` |
| `src/ui/map/package-lock.json` | `3A3556DC4A3DA0CCA10F14DFB328B4931129CF25A39FFE8FA8E335C33A9BC24A` |
| `package.json` | `23410F3D436F1757F2D14805195E2FEA34E1E8E48B98A94D170150A000E6BC3B` |
| `src/ui/map/package.json` | `F49DABF543AF35F4D6CE41C66624D3A7653BAE61CFDC4183798161467A127EF5` |

Parsed workflow comparison against the predecessor proved unchanged triggers, permissions, job
metadata, step counts and order, and cache definitions; only install commands and map-step working
directories changed. The final execution worktree is clean, the root-targeting map junction is
absent, locks and manifests are unchanged, and production/runtime LOC change is zero.

### T1A disposition

**PASS.** The dependency-install precondition is frozen and independently reviewed. T1 remains the
next task and is still incomplete: the fail-closed 45-variable audit, two clean exact-commit Node-22
188-week runs, 15-file manifests, checkpoint/health/consistency/fingerprint/operation-diff/byte
checks, and focused harness tests have not yet run.

T1A has no player-visible, gameplay, canon, save/schema, scenario, artifact-contract, baseline,
threshold, simulation/turn-pipeline, package-version, or runtime effect. It creates no engine module, state,
service, channel, flag, or default stream. No knowledge-ledger or `docs/10_canon/FORAWWV.md` update
is required.

## T1 pre-fix pair — reproducible evidence, not S0

**Status:** REJECTED AS S0; retained as the T1B pre-fix fixture.

The first fresh pair ran under Node `22.21.1` at documentation/infrastructure HEAD
`58f100f3f0d1dd5dcfee115ae30a316905602c9e`, with `git_dirty:false`,
`collapse_enabled:false`, no provenance override, and distinct output roots. The two runs produced
the same final hash `d71ff4ef4063f2ee`, structural fingerprint `a0eff7d861626c41`, checkpoint vector
`695 / 674 / 668 / 652`, and zero operation-schedule differences across all 48 compared operations.
Engine health and consistency passed, and the substantive artifacts were byte-identical under the
plan's sole `run_meta.out_dir` normalization.

The unmodified checkpoint verifier exited `1`. Its historical output remained RED: the nine-cell
enclave guard held, Farz retained its known early/no-late-2nd-Corps attribution failure, and one
RBiH capture appeared at `op:kalesija:gojcin_2`. The retained A log is
`F:\A-War-Without-Victory\runs\re_s0_logs\a_checkpoints.log`; an independent invocation against B
returned the same exit and signature. These ignored run files are evidence locations, not tracked
deliverables.

Source tracing found that the Gojčin capture is not solely calibration debt. The winning battle
aggregated one operationless/default-occupying contributor and two contributors in a probe declaring
`occupies_on_victory:false`. `resolveAttackOrdersOsid` sorted the validated attackers, selected
lexicographic `firstAttacker`, and used only that attacker's operation declaration for the whole
battle's occupation decision. The same mixed intents could therefore flip or withhold territory
because formation IDs changed order.

The owner ruled **ALL** on 2026-08-27: every validated contributor must permit occupation; one
explicit false vetoes; a missing declaration or operation match defaults true. The ruling creates
T1B/DG-0 before S0. It adds no primary attacker, weight, schema, field, flag, module, service,
pipeline step, or historical literal. Farz remains separate known-red calibration and is not a T1B
target.

The pre-fix pair may prove reproducibility and supply the RED fixture, but it is not the clean S0
baseline and must not be renamed, blessed, or used to start T2. T1B requires a code/test commit,
independent review, and a new exact-code-commit Node-22 pair before the evidence/docs commit closes
T1 and S0.

## T1C / RE-0D ruling — exact final-sector fixed-point convergence before S0

The unanimous review reopened one bounded correctness surface from historical R5 Phase 2b. The
existing full-state, three-mode property now exposes a deterministic seed-31 divergence when
`applyFinalSectorOwnerTruthPass:4` is conditionally skipped: two SRK sector `threat_ratio` values
remain `9999` instead of `0`, while `arbih_1st_mountain` retains entrenchment `12` instead of `0`
and remains at Novi Grad rather than the unconditional reference's Centar Sarajevo location.

The second unanimous ruling found a second deterministic RED in the same `53889f355` defect family.
At seed 55, optimized and unconditional reference output differ only in one otherwise
content-identical sector/sub-segment identity suffix, `:5` versus `:4`; the full cloned `GameState`
is identical. Trace evidence shows the skipped `sealMergedSectorTruth:3` →
`pruneGhostArtifactSectors:2` → `recoverDroppedFrontEdges:2` segment lets a transient piece consume
an ID before later deletion.

T1C therefore makes both the named three-call segment and `applyFinalSectorOwnerTruthPass:4`
unconditional, deleting their incomplete guards and guard-only bookkeeping. It remains one atomic
candidate, not a new T1D. Production ownership is only `src/sim/combat/corps_front_sectors.ts`;
allowed tests are the integration property and instrumentation static guard contract. No canon,
schema, field, flag, cache, threshold, scenario, baseline, reference, or historical literal changes.

T1B closes first. T1C then requires separate seed-31 pass-4 and seed-55 segment mutations, the
300-comparison full property, static guard contract, historical seven-file convergence matrix,
typecheck, balanced full suite, baselines without refresh, and three alternating exact-parent/
candidate 40-week performance pairs measured atomically against the one pre-T1C parent. Correctness is
retained even if median wall time regresses above 2%; that result opens a separate bounded
performance escalation before T2 and never authorizes restoring the faulty skip. Only after T1C
may a fresh exact-code-commit Node-22 pair establish S0.

### T1C one-time stale baseline reconciliation

Unanimous attribution permits one manifest-only reconciliation on the reviewed exact T1C candidate
under Node 22. The manifest predates accepted probe stable-key work. Parent/candidate comparison is
28/32 identical; every 52-week and 4-week artifact is identical. Only the 188-week
`end_report.md`, `final_save.json`, `run_summary.json`, and `weekly_report.jsonl` differ from
truthful transient HVO sector identity/location and one same-target/same-outcome battle with 15
fewer casualties. Control, 31/31 endpoint anchors, 6/6 bot benchmarks, checkpoints, watched
operations, operation schedule, and in-band KIA are unchanged. Historian has no block and makes no
claim that exact Ruda control is historical fact.

The update must replace exactly 19 existing hashes and track only the baseline manifest. It may not
change artifacts, expected files, ordering, paths, weeks, scenario keys, or schema; `_baseline_tmp`
and run outputs remain uncommitted. Two clean baseline reruns, guardrail/ownership tests, unchanged
structural fingerprint check, diff/EOL, and independent review are mandatory. The parent's 26
stranded formations are pre-existing engine-health evidence, separate from this reconciliation and
not accepted as S0.

### T1C / RE-0D2 fingerprint-contract prerequisite — fail closed before structural re-floor

The authorized Node-22 manifest refresh and both clean baseline validations succeeded, but the
required structural-fingerprint check exposed two distinct facts. First, `8ab3e29b9` deliberately
made `apr1992_definitive_188w` the sole painted-control scorer, so the 40-week fixture correctly no
longer emits top-level or `historical_fit.anchor_checks`. Second, the v2 fingerprint reader and its
fixture retained that obsolete shape and silently converted absence to an empty `0/0` anchor map.
The fresh `c9749738d279fd4f` result is therefore inadmissible even though its 6/6 bot benchmark and
control fields are real.

RE-0D2 repairs this observer before either golden is committed. The runner emits a distinct
non-scoring `anchor_contract_evaluation` through the existing canonical anchor evaluator; it does
not restore a second calibration score. The fingerprint reader requires a non-empty, well-formed,
unique-ID contract and fails closed otherwise. A real 40-week integration test proves 31
evaluations while painted scoring fields remain absent. Only after two Node-22 passes may actual
territory drift be attributed across `7c631a95f`, `fa6357833`, and `2e9e4acd3`. T1C must remain
byte-identical through week 40. Structural and manifest goldens then receive separate review and
commits before performance and S0.

## 2026-08-27 — Scope-drift incident, non-destructive branch repair, and guardrail gate

Commit `63671dd8c` mixed two independent packets. The legitimate RE half was seven files
(`+62/-37`): the narrow first-advance planning-credit predicate, its two test owners, and four
aligned canon/process descriptions. The excluded half was four scenario/event files (`+110/-10`):
`war_1992.json`, `war_1995.json`, `event_timeline_integrity.test.ts`, and
`events_evaluate.test.ts`. Those event findings are **routed from RE — not adopted**; they authorize
no scenario, historical outcome, threshold, or calibration change.

The mixed line is preserved at `codex/re-mixed-scope-quarantine-20260827`. The authoritative branch
was reconstructed non-destructively from `037396e3c`; commit `7c472e065` applies exactly the seven
approved RE files, while all four excluded files are byte-identical to `037396e3c`. No reset,
rebase, force-move, push, PR, or merge occurred.

The guardrail packet adds an exact-file `RE_SCOPE_LOCK.json`, absolute scenario/calibration/
reference/FORAWWV deny rules, source-and-destination rename census, strict staged-lock presence,
sealed post-commit lifecycle, policy-schema checks, stable EOL rules, and an external per-worktree
hook that pins reviewed staged lock/checker hashes outside the tracked tree. The executable
`--engine-integrity-only` health-gate mode has exactly five authorizing checks; painted fit,
checkpoints, K:W, and casualties are non-authorizing observations. The inherited stranded ceiling
is non-regression evidence only, and direct consistency exit zero remains separately mandatory.

Verification before this record: 25/25 scope cases, external-hook integration, and 5/5 engine-mode
tests passed; the focused retained operation packet passed 151/151 cases. One related
`peace_plans` assertion is pre-existing red at both `63671dd8c` and the repaired tree and is queued,
not repaired in RE. Scenario/event exclusion diff is empty. At that checkpoint, the next RE change
required a newly reviewed and externally pinned exact-file lock and no long run was authorized.

## T1C exact isolated performance disposition

The retained exact Node-22 packet compares clean parent `7c631a95f` with post-T1C/pre-T1B
candidate `fa6357833`. Both used Node `v22.21.1`, scenario SHA-256 `00570a56…c0ea`, consumed-input
digest `5d70963e…273f2`, one excluded warm-up per source, and literal P1/C1/P2/C2/P3/C3 order. Every
pair has the same 15-file inventory; all 14 non-`run_meta` artifacts are byte-identical. Every final
save is SHA-256 `542dd4e…035be`, with final-state hash `542dd4e8070d9140`.

Parent wall samples are `72,110.1475 / 71,646.3147 / 72,574.3934 ms`; candidate samples are
`74,726.6835 / 77,951.5258 / 74,139.3005 ms`. The candidate median is provisionally
`+3.62853%`, and every paired delta exceeds 2%. The one permitted read-only diagnosis is consumed:
the 100-record sector sidecars rise `17,740.59 → 19,377.48 ms`; pass-4, seal-3, prune-2, and
recovery-2 account for `1,294.21 ms` (about 79%) of that increase. Candidate-only CPU evidence is
locality support, not comparative proof. Machine/power/background-load conditions were not encoded,
so the original performance packet could not claim an unconditional pass. Correctness is retained.
The 2026-08-27 owner-approved reduced contract now disposes this measured cost as watch-only for
1.0 and retires further pre-1.0 diagnosis or remediation. The separately authorized exact-commit
baseline pair subsequently ran cleanly. Future performance comparison occurs once at final RE
integration against this corrected baseline. A new unexplained regression above 2% stops for owner
disposition only when workload and output are comparable; otherwise the delta is descriptive. Only
player-visible latency in R8 may open future bounded performance work, and no result grants
automatic diagnosis.

Report SHA-256 values in P1/C1/P2/C2/P3/C3 order are
`e3f720ed03b98539eb75f4b1d73438feb624283e885498ed354e47e818db3ccb`,
`d1777fdfe8a5c2099e1d76b490969636c1e11014e6d41e48e6e0a8fdc318b21b`,
`b1adba95eb5feb5aa3ba3ae75a06def737776d67af02bde224ec27c027febbe4`,
`cb7b7acff2c2769305b8131c10785bab07b97ad122bd7c5ab13dd02bbd478314`,
`f290ef31de80c57e9afc1f444acd7fa88c060954e0ffcc0299b500cf7523205f`, and
`8c5655aece27dc3181b5f3ee9cea70a30078b78c988f9531ce831bd7bf8891df`.

## S0 clean authorization lifecycle

The reviewed run-only packet binds parent `99d7bcbb6`, changes only synchronized control docs and
the scope lock, and sets `long_run_policy.permitted:true` with maximum one pair. Its committed clean
sealed HEAD is the S0 execution commit. Before launch, the production engine tree must be
byte-identical to `99d7bcbb6`; both runs must record that authorization HEAD and `git_dirty:false`.
Only A then B may run. Any launch consumes the authorization; pass, failure, or partial/abort goes
directly to the successor no-run evidence packet, which restores permission to false. No retry,
second pair, other long run, or engine/scenario/calibration/reference change is authorized.

Preflight found preserved clean Node-22 evidence at the original `runs/re_s0_a` and `_b` roots from
commit `8511512f`. No scenario process launched, so authorization was not consumed; those roots are
not deleted or reused. The reviewed successor instead names fresh absent roots
`runs/re_s0_integrity_a` and `runs/re_s0_integrity_b`.

## S0 baseline-pair result and consumed-authorization closeout

The sole pair ran A then B at clean sealed HEAD
`177882fc28ec2eaee2d2ecdc015a5a06c99ee06b` under Node `v22.21.1`; both commands exited zero. Both
logs contain `Tactical map copy SKIPPED (AWWV_S6_GRADE_RUN=true)` and final-save seal receipts at
turn 188 with assignment `unresolved=0`; the serialized saves intentionally omit that transient
field. The grade-run variable was absent after `finally`. Observed UTC
log-write windows were `15:33:31.1396577–15:39:07.8890444` (336,749.3867 ms) for A and
`15:39:12.6779628–15:45:06.5868324` (353,908.8696 ms) for B.
The wrapper's exact pair interval was `2026-08-27T17:33:25.8006107+02:00` through
`2026-08-27T17:45:06.7258364+02:00` (700,925.2257 ms). It invoked the plan's literal
`run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique
--map --out <root>` command with the pinned Node-22 executable, first for A and then for B.

Exact launch commands were:

```powershell
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs/re_s0_integrity_a
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs/re_s0_integrity_b
```

The exact HEAD tree is `463525b4b5a14c5c7dea7aa45c52847465127f14`. Executed-source
SHA-256 values are:

| Executed source | SHA-256 |
|---|---|
| `tools/scenario_runner/run_scenario_with_preflight.ts` | `d184a0aaaa0f7ee724b8ed75f5b62dca5171d25c4c2d8fd1c2b717947816e218` |
| `tools/verify_checkpoints.cjs` | `bbaa8e0f880e48cdc6cfd91a8b550d249311398c061fb51c24426ab0e1211af8` |
| `tools/engine_health_gate.cjs` | `14998592daaec1ee4f98063f3d1d3f5b50ccff1c81a6f79cf2f4619d9eebd2a5` |
| `tools/validate_run_consistency.cjs` | `b291446215fe22752dca799c97c7d0b16a5379747ac2a3779770e4b0f28a6519` |
| `tools/diagnostics/structural_fingerprint.cjs` | `a2f94f5fbfbc75657681bb16c08585cb4265344a984824ccef0c8fcfc6e2c15b` |
| `tools/op_schedule_diff.cjs` | `43073f1196a2bc51cec798da9832060f20ef5705b4835909dedeb4841c71b50b` |
| `node_modules/tsx/dist/cli.mjs` | `8729ecfb90d9d568939e4190e6f1d3317c946583b7d37a776e0c23a21c021cf8` |
| `node_modules/vitest/vitest.mjs` | `39db22f579acf5639bbb17a261408debbde03f4692c0c439e77e7f13aeba74d6` |

Each leaf has the literal 15-file inventory. All 14 non-`run_meta` artifacts are byte-identical;
metadata differs only at path-derived `out_dir` and is otherwise identical. Shared final-save
SHA-256 is `75eb15152c7bde318a6ecf2befba1b9b3e62e3f85e3161dc89cff3b7774b7556`; shared fingerprint is
`6f2b4a10126a980e`; all 40 operation schedules match at all five rungs. Metadata proves the full
authorization commit, `git_dirty:false`, Node 22, `collapse_enabled:false`, and identical consumed
input digest `95628a5bd1c4096ad95c63bda2fe60be5b970f10cfca8c5fe225420962ea53d6`.

| Artifact | bytes | JSONL rows | A SHA-256 | B SHA-256 |
|---|---:|---:|---|---|
| `activity_summary.json` | 453 | — | `92bb49101d4aed98b2a300b1b16460c82b4f44850c500b361917b5b1ded2d4aa` | same |
| `brigade_temporal_log.jsonl` | 23,665,845 | 44,533 | `e273021eebfcd4bbb4171d678eb81082ec49ad58bc8f52975c97aed404346189` | same |
| `control_delta.json` | 27,734 | — | `0f074c4c3c4fd0da577822b03f387dabbc3f1efcea696483b35aa78ef2de4dc9` | same |
| `destroyed_brigades.json` | 10,733 | — | `8d11887a1198ef5a4a09c32d3876f297801b81eacd2aed3359e6d409e887e1c2` | same |
| `displacement_event_log.jsonl` | 15,262,075 | 86,385 | `2900ada9e5793b2ad0226d1e227501dc177744f61d99e633cce226cbc080de8a` | same |
| `end_report.md` | 48,915 | — | `42c29742e302dd9b4745cc3ab36c65b67fa7b2ae60edc906020d143747ffa507` | same |
| `final_save.json` | 10,056,229 | — | `75eb15152c7bde318a6ecf2befba1b9b3e62e3f85e3161dc89cff3b7774b7556` | same |
| `formation_delta.json` | 3,805 | — | `2df3cd806c94a579cb677728f852d5d4bb4447979849547c479d8f161184ee50` | same |
| `initial_save.json` | 1,353,384 | — | `e7b678524962ec0256a66a6a0fbc3b0950ee5cd63a2b6929c087922289c17b11` | same |
| `operation_aars.json` | 499,062 | — | `17f2adc3d23d439c3e6bd3c41dbe62ad55c2e6ff6b8b33f0b8c02441a670f0aa` | same |
| `replay_save_manifest.json` | 37,184 | — | `2cb28d9842d186e32577813324d90f5afd41888e243824b882f393feac328c0f` | same |
| `run_meta.json` | 10,489 | — | `83b1fad662b302f1f4ba92693c72441a73935f26f5940764effe931efe5b3bad` | `7d12a074f4685a612161b72ab913112b68c2eb87bc2b643ceec6dbe31e84ae31` |
| `run_summary.json` | 623,618 | — | `ee18ccc0e44b286502fcdda0d14ba281baa7aedf30d9ccba59d9cd6b21da1eed` | same |
| `watched_operations.json` | 6,895 | — | `82bed205e765a3efeb9348111fc251aa13e1166d9e24fbb74567a0fd2aa39a48` | same |
| `weekly_report.jsonl` | 2,276,423 | 188 | `d71d03425c5575323fc15aa8a0877580bcc355568a9ba71bb4d0a7c04ce9c911` | same |

The preserved console logs are each 145,554 bytes; A SHA-256 is
`71283a65466e524b94b97ab089f28c4c049a63665ba005ca019ef5edf4c2480b`, and B SHA-256 is
`685172a8fc4744a7f167e865120105d4523294077e8e10cd64e13f67c4089519`.

Both engine-only gates pass all five authorizing checks with identical measurements:
zero-eligible `0`, invalid operation-weeks `0`, ghost-destroyed `1`, stranded `18`, consistency
failures `0`. Both direct consistency commands pass. The focused harness/provenance/anchor pack
passes 3 files / 55 tests. The Node-22 save/replay compatibility pack passes 7 files / 68 tests with
2 intentional skips: continue-from-save equivalence, real-save deterministic roundtrip, adapter
parity/boundary, and replay emit/consume are green. The checkpoint verifier identically reports `688 / 656 / 654 / 633` and
exits one only for the existing Farz late-capture timing discriminator (capture turn 62 versus its
late-window expectation). That is non-authorizing calibration evidence; it triggers no RE tuning.

The save/replay command was:

```powershell
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" node_modules/vitest/vitest.mjs run tests/scenario_continue_from_save_equivalence.test.ts tests/save_load_real_roundtrip.test.ts tests/save_load_real_roundtrip_adapter.test.ts tests/adapter_field_completeness.test.ts tests/ui_adapter_boundary.test.ts tests/replay_save_emit.test.ts tests/replay_player.test.ts
```

The exact resolved post-run verification commands were:

```powershell
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/verify_checkpoints.cjs runs/re_s0_integrity_a/apr1992_definitive_188w__46834a3b41033bff__w188_n0
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/engine_health_gate.cjs runs/re_s0_integrity_a/apr1992_definitive_188w__46834a3b41033bff__w188_n0 --horizon 188w --engine-integrity-only --json
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/validate_run_consistency.cjs runs/re_s0_integrity_a/apr1992_definitive_188w__46834a3b41033bff__w188_n0
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/diagnostics/structural_fingerprint.cjs runs/re_s0_integrity_a/apr1992_definitive_188w__46834a3b41033bff__w188_n0 --json --full
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/verify_checkpoints.cjs runs/re_s0_integrity_b/apr1992_definitive_188w__46834a3b41033bff__w188_n0
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/engine_health_gate.cjs runs/re_s0_integrity_b/apr1992_definitive_188w__46834a3b41033bff__w188_n0 --horizon 188w --engine-integrity-only --json
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/validate_run_consistency.cjs runs/re_s0_integrity_b/apr1992_definitive_188w__46834a3b41033bff__w188_n0
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/diagnostics/structural_fingerprint.cjs runs/re_s0_integrity_b/apr1992_definitive_188w__46834a3b41033bff__w188_n0 --json --full
```

The cross-run schedule command was:

```powershell
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" tools/op_schedule_diff.cjs runs/re_s0_integrity_a/apr1992_definitive_188w__46834a3b41033bff__w188_n0 runs/re_s0_integrity_b/apr1992_definitive_188w__46834a3b41033bff__w188_n0
```

The focused 55-test command was:

```powershell
& "C:/Users/User/AppData/Local/Logi/LogiPluginService/PluginHosts/node22/node/node.exe" node_modules/vitest/vitest.mjs run tests/scenario_harness_contracts.test.ts tests/run_provenance_stamp.test.ts tests/scenario_anchor_contract.test.ts
```

The clean deterministic/correctness baseline pair and save/replay gate are captured, and the one-pair
authorization is consumed. Long-run permission is false. The `+3.62853%` performance disposition is
accepted as a watch item for the corrected baseline and no longer blocks 1.0. The proposed SpatialContext reuse
cannot recover the required `1,174.3330 ms`: its consumed-profile ceiling is `320.931 ms`, or
`628.100 ms` even under an unrealistically broad deletion assumption. It is rejected as the S0
remedy and remains retired. Follow-up code review found several safe small deletions, but even pretending their whole
containing labels cost zero totals only `975.466 ms`, still `198.867 ms` short. Larger stages cross
real bucket, territory, sector-key, and formation-location mutation barriers; consumed evidence
does not justify consolidating them. No guard restoration, cache/state/flag/module/service/scan/
threshold/history special case, additional diagnosis, retry, or second pair is authorized before
the reduced rail's single final A/B closeout.

## P1 — release-path truth implementation evidence

Base `34373d5ba1e75c1099042ea9167175c3b5fdca0f`; canonical staged implementation payload SHA-256
`9043eb89018b9d669354875ce46e412f98815f4d5948120d4c787f4bc33d2e5e` over byte-order-sorted
Git-index rows for `.github/scripts/detect-changed-paths.sh` and
`tests/desktop_release_ci_guardrails.test.ts`. The packet changes those two paths plus
`docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json` and this audit. Production numstat is
`.github/scripts/detect-changed-paths.sh +9/-2` (P1 and cumulative reduced-RE production net
`+7`; later deletion packets must bring the final rail to net non-positive).

After correcting Windows-only test-harness cleanup/path/environment failures, the valid RED named
the real push-range `src/data/release-path-fixture.ts` with no warning or fail-safe but received
`relevant=false` instead of `relevant=true`. Minimal GREEN adds only the seven literal imported
roots; the real-detector suite passes 8/8, including seven independent positive Git repositories
and one docs-only negative. `npm.cmd run typecheck` and `npm.cmd run desktop:sim:build` pass.
`npm.cmd run test:vitest:balanced` exits one only on two matching 40-week empty-large-sector
assertions (`integration_deployment_health`, `integration_run_diagnostics`) and the already queued
Cutileiro assertion in `peace_plans`; the P1 file passes 8/8 inside that run. No out-of-scope
diagnosis or edit followed. `npm.cmd run desktop:package:probe` completed its map/sim/Warroom
release builds, Windows x64 packaging, and packaged-executable launch, but emitted no verdict or
manifest before the coordinator's approximately 15-minute live-probe cutoff; it is recorded as
unresolved, was not rerun, and all probe processes were terminated. No generated build artifact is
tracked. Player-visible effect: changes beneath every source root imported by the packaged desktop
simulation can no longer silently skip desktop release/package CI; gameplay and engine execution
are unchanged. Build implementer verdict: the P1 change is minimal and focused proof is green, but
final packet disposition remains with independent review because Core is not all-green and the
packaged-runtime probe produced no verdict.

The preceding `npm.cmd` results used the machine-default Node 24 runtime and are supplemental, not
the Node-22 contract proof. `npx.cmd --yes node@22` resolved Node `v22.23.2`; under that executable,
the focused real-detector suite passed 8/8, the TypeScript no-emit typecheck exited zero, and
`tools/desktop_bundle_sim.mjs` exited zero. The code/test payload is unchanged and retains staged
implementation digest `9043eb89018b9d669354875ce46e412f98815f4d5948120d4c787f4bc33d2e5e`.

Architect/domain review: **GO**. A real esbuild metafile trace contains 492 inputs across source
roots `data`, `desktop`, `map`, `scenario`, `shared`, `sim`, `state`, `ui`, `utils`, and `validate`;
the prior detector covered `desktop`, `ui`, and `shared`, and P1 adds exactly the seven missing
roots. Exact lock, staged digest, TDD sequence, and minimality are verified. The balanced failures
are unrelated. The packaged-runtime probe remains unresolved and is not a PASS, but does not block
this CI-selection-only packet. P1's production net `+7` remains a final-rail obligation. No probe
repair, rerun, or scope expansion is authorized.

Independent Process QA: **GO**. Exact base, four-file lock, denylist, staged-index digest,
real-detector TDD, focused GREEN, typecheck, and desktop build are verified. The unrelated balanced
failures remain recorded debt. Probe build, package, and executable launch completed, but the probe
produced no verdict and remains unresolved—not PASS. No diagnosis, rerun campaign, or P1 expansion
is authorized.

## P2A boundary correction

P1 is accepted and complete; P2A is next. Architect review found two existing deletion-surface
tests omitted from P2A's named test boundary: `tests/sim/combat/phase3_reliability_decay.test.ts`
preserves `halt_delay_turns_remaining`, and `tests/ui/lever_single_host_guard.test.ts` preserves
`stageOperationForceLaunch`. They are added to P2A so its deletion proof covers the existing
behavioral surface without widening production scope. The three known balanced-suite failures and
the unresolved packaged-runtime probe remain frozen evidence: neither authorizes diagnosis,
repair, reruns, or any expansion of P2A.

## P2A strict-null proof-surface correction

Architect review found that deleting the two optional simulation fields changes the strict-null
inventory by construction: `optional_fields_game_state` moves from 539 to 537, the optional-domain
total moves from 539 to 537, and the `sim` domain moves from 342 to 340; every other domain is
unchanged. `tests/strict_null_inventory_progress.test.ts` is therefore added to P2A's named tests.
This is a proof-surface correction, not production-scope expansion. In the full balanced run, that
strict-null expectation requires the bounded amendment, the exact frozen failures remain the two
40-week empty-large-sector assertions in `integration_deployment_health` and
`integration_run_diagnostics` plus the queued Cutileiro assertion in `peace_plans`, and all other
tests passed. No failure diagnosis or unrelated repair is authorized.

## P2A — legacy force-launch and halt-authority deletion evidence

Base `5b8ad68f606499459d591b1528e83bd07455f021`; canonical staged implementation
payload SHA-256 `c713c5800e7d717ba45d5abec29f6ae09be31f67ea76b2a7cbb039e91c8e004c`
over 20 byte-order-sorted Git-index rows for the twelve changed production paths
`src/desktop/autonomy_ipc_contract.cjs`, `src/desktop/desktop_sim.ts`,
`src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`,
`src/sim/combat/order_interpretation.ts`, `src/sim/combat/sector_offensive.ts`,
`src/sim/turn_phases/war_phases.ts`, `src/state/game_state.ts`,
`src/ui/map/components/army_hq/DirectiveCard.tsx`, `src/ui/map/desktop/useIPC.ts`,
`tools/ai_play/president_playthrough.ts`, and `tools/ai_play/run_rbih_best_outcome.ts`;
and the eight changed test paths `tests/desktop_persistence_contract.test.ts`,
`tests/logistics_priority_ipc_path.test.ts`, `tests/sector_offensive.test.ts`,
`tests/sim/combat/phase3_reliability_decay.test.ts`,
`tests/sim/command/phase2_operation_interpretation.test.ts`,
`tests/strict_null_inventory_progress.test.ts`,
`tests/ui/directive_card_stop_op_action.test.ts`,
and `tests/ui/lever_single_host_guard.test.ts`. Focused verification also covered the three named,
unchanged files `tests/back_the_officer_human_only_determinism.test.ts`,
`tests/sim/combat/order_interpretation.test.ts`, and
`tests/ui/presidential_decision_room.test.ts`; unchanged files are excluded from the staged
implementation payload. Production numstat is `+13/-445`, net
`-432`; cumulative reduced-RE production is net `-425` after P1's `+7`.

The valid tests-first RED passed 73 assertions and failed five deletion-authority/state
expectations: the legacy desktop handler/bridge/export remained, op-name-only UI still emitted
IPC and reported success, the launch/halt interpreters and stale state remained, and injected
old-save keys changed advance behavior. Minimal production deletion then produced Node-22 focused
GREEN for all 11 named files, 248/248 tests. The Node-22 no-emit typecheck and desktop simulation
build both exit zero. The Node-22 balanced run exits one only on the frozen failures:
`integration_deployment_health` empty large sectors `3 > 2`,
`integration_run_diagnostics` empty large sectors `3 > 2`, and `peace_plans` Cutileiro RBiH
expected `rejected` but actual `accepted`; no other test fails.

Exit census finds no live `stage-operation-force-launch`, `stageOperationForceLaunch`,
`interpretOperationLaunch`, `interpretOperationHalt`, `dig_in_on_halt`, or
`halt_delay_turns_remaining` authority/state symbol in production or tools; the two retired field
names remain only in the approved strict-null historical explanation. Generic `forceLaunch`
localization/read-model references are the preserved exact-ID proposal authority, not the deleted
op-name path. The real startup-save proof injects the two retired unknown nested keys, advances
both forms identically after removing those unknown keys, and current clean serialization omits
both. Directive-card proof shows an op-name-only request fails locally with
`Force launch requires an exact operation ID` and emits no IPC. Exact-ID
`force-launch-proposal` and `proactive-force-launch-op` remain green. Player-visible effect: a
stale operation-name-only force-launch attempt is rejected locally instead of invoking ambiguous
desktop authority; valid exact-ID force-launch decisions are unchanged. Systems implementer
verdict: **GO** — the packet is deletion-only, deterministic, materially shrinks production, adds
no replacement API/state/flag/module/service/scan/migration/history case, and has no new balanced
failure.

Architect review: **GO** after the two exact provenance corrections. The packet restores one
exact-ID authority for force launch, keeps old saves absent-safe without a compatibility reader,
preserves the `force-launch-proposal` and `proactive-force-launch-op` paths, introduces no
replacement authority or state, and delivers the required net production deletion.

Independent code-quality review: **GO**. The deletion is coherent across desktop, preload, UI,
simulation, state, and AI tooling; no dangling caller or accidental exact-ID authority loss
remains, and the focused structural and behavioral tests adequately cover the removed surface.

Independent Process QA and determinism review: **GO; commit authorized**. Fresh Node-22 evidence
passes all 11 focused files (248/248), the no-emit typecheck, and the desktop simulation build.
The exact base, 20-row staged implementation digest, 25-path lock, staged scope, forbidden-path
exclusion, production LOC reduction, old-save/current-serialization determinism proof, and exit
census are verified. The balanced receipt contains exactly the frozen three failures:
`integration_deployment_health` `3 > 2`, `integration_run_diagnostics` `3 > 2`, and the Cutileiro
RBiH response mismatch in `peace_plans`; it contains no new failure.

## P2B boundary correction

P2A is accepted and complete; P2B is next. Architect review found that P2B must name the existing
`docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` as an exact contract/evidence file so removal of
the Operation Briefing mutation authority cannot leave the engineering contract stale. This is a
P2B-only documentation exception and authorizes no other document.

The packaged-runtime precondition is binding. Following the separate provenance-rule correction,
run the unchanged packaged probe once on exact clean P2B base
`bd61a37a3d5eff89613f171edb23496d11fd06f3` before implementation. A missing verdict stops P2B
without rerun, diagnosis, repair, or implementation. Only a green base verdict permits the
candidate: it receives one unchanged packaged probe and one bounded live visual session, with no
retry campaign or probe modification.

## P2B — packaged-runtime precondition evidence

The one authorized unchanged clean-base probe was consumed on exact P2B base
`bd61a37a3d5eff89613f171edb23496d11fd06f3`. `npx.cmd -y node@22.23.0` resolved the executable and
the invoking process confirmed Node `v22.23.0` before starting
`npm.cmd run desktop:package:probe` exactly once. The wrapper command started at
`2026-08-27T23:05:17.6646476Z`; packaging time was excluded from the runtime limit. The packaged
executable `F:\AWWV-worktrees\re-engine-integrity\dist-packaged\win-unpacked\A War Without Victory.exe`
launched at `2026-08-27T23:12:41.1986877Z` as PID `21136`, starting the hard 15-minute clock.

The packaged runtime remained alive at the cutoff and emitted no wrapper verdict. At
`2026-08-27T23:27:42.6202593Z`, the coordinator issued the single permitted full-process-tree
termination; the wrapper ended at `2026-08-27T23:27:43.3372027Z` with recorded exit code `124`.
The expected manifest was absent at
`F:\AWWV-worktrees\re-engine-integrity\dist-packaged\win-unpacked\awwv_desktop_runtime_probe_manifest.json`.
The last captured stdout line was electron-builder's
`updating asar integrity executable resource` line for the packaged executable; the captured
stderr ended with the existing Vite circular-chunk warning for
`map-rendering -> feature-army-hq -> feature-army-hq-records -> map-rendering`. No stable receipt,
manifest, route/window/state-push/turn-report/endgame proof, or ignorable-failure evaluation was
available, so this result is **NO VERDICT**, never PASS.

Per the binding precondition, P2B stops before implementation. There is no RED/GREEN cycle,
production/test/IPC-contract edit, candidate probe, live visual session, payload digest, or player-
visible change. No rerun, diagnosis, probe repair, or reinterpretation is authorized. The generated
ignored `dist/` and `dist-packaged/` trees were removed after process termination; no generated
probe/build artifact is tracked. Only the P2B scope lock and this evidence row are staged for the
coordinator's disposition.

## 2026-08-28 — owner-authorized auxiliary packaged-probe recovery transition

P2B remains **HELD** before implementation. The owner accepted the Orchestrator/Architect
recommendation to open a bounded packaged-probe recovery lane while remaining AFK; this is not an
ordinary owner checkpoint. The transition is recorded under the RE safety-control namespace only
so one lock continues to prevent overlap. Recovery is outside the seven RE outcomes and eight RE
packets, earns no RE completion credit, and cannot automatically or retroactively satisfy P2B's
clean-base or candidate probe. P3 remains waiting. A successful recovery closes only the auxiliary
packet. Fresh P2B drafting remains governed by the QA + Architect + Orchestrator acceptance rule
below; no recovery result reopens RE automatically.

The preserved P2B receipt above is unchanged and remains authoritative: one invocation on exact
base `bd61a37a3d5eff89613f171edb23496d11fd06f3`, executable launch at
`2026-08-27T23:12:41.1986877Z`, one full-tree termination at
`2026-08-27T23:27:42.6202593Z`, wrapper end at `2026-08-27T23:27:43.3372027Z`, exit `124`, expected
manifest absent, classification **NO VERDICT**, and no P2B code/test/contract edit or rerun.

Specialist findings bound the recovery plan:

- **Platform Specialist:** the current wrapper has no timeout, full-tree termination, live output
  forwarding, phase receipt, or partial manifest; the manifest is written only at the end. The
  exact base also emits the Army-HQ manual-chunk cycle warning. Non-ancestor commit `98f54ccb4`
  records packaged `Cannot access 'ir' before initialization`, which is the leading trigger
  hypothesis but is **not proof** of this hang and grants no chunk/UI/build repair authority.
- **Build Engineer:** the live chain is `desktop:package:probe` → `desktop:package:dir` →
  `tools/desktop_packaged_runtime_probe.mjs`. Unbounded observation boundaries include
  `sim.startNewCampaign`, `startMapServer`/`server.listen`,
  `waitForTacticalMapInteraction` renderer execution/IPC, and the wrapper's wait for child close.
  Current tests are source-contract tests and cannot identify the last reached packaged phase.
- **Technical Architect:** Electron changes are limited to one guarded emitter adjacent to
  `getRuntimeProbeManifestPath` plus literal calls inside `runPackagedRuntimeProbe`; no wait/arm/
  collect helper, constructor, app branch, IPC, state, lifecycle, map-server implementation, UI, or
  build-config hunk is allowed. The wrapper becomes import-safe in place and exposes behavioral
  supervisor/parser/classifier/unchanged-validator seams to its existing test. Exact-file locking
  is insufficient: Architect must approve the symbol/hunk map and independent LOC caps.

Lock 1 is `RE-PROBE-RECOVERY-TRANSITION` / `authorize-auxiliary-packaged-probe-recovery` on exact
base `c57ecffaf4774b9801d8ef6f4774463f7c0ef52e`, with exactly 14 synchronized control documents:
current lane, lock, RE plan, recovery plan, living audit, calibration master, reports index, master
roadmap, command board, plans index, docs index, active-task governance, project ledger, and
knowledge ledger. Long runs remain false and
out-of-scope work remains stop-and-queue. Orchestrator, Architect, Process QA, and Reports
Custodian review this transition.
Lock 1 bootstraps by staging all 14 synchronized documents, reviewing their exact staged bytes and
hashes, re-pinning the existing hook, passing working/staged checks, and only then committing.
After it is accepted and committed, Product Manager installs Lock 2 exactly as
`RE-PROBE-RECOVERY-INSTRUMENTATION` / `one-shot-packaged-runtime-phase-localization` on that exact
commit, with only `src/desktop/electron-main.cjs`, `tools/desktop_packaged_runtime_probe.mjs`,
`tests/desktop_packaged_runtime_probe.test.ts`, the lock, recovery plan, and this audit. Platform
Specialist is the sole implementer; Build Engineer, Architect, and QA are independent reviewers.
No implementation begins under Lock 1. Every successor lock is drafted by Product Manager at clean
HEAD, reviewed by Orchestrator/Architect/Process QA as exact bytes and SHA-256, re-pinned into the
existing hook, and passed through working/staged checks before any payload edit.

The executable recovery authority is
`docs/plans/2026-08-28-packaged-probe-recovery-plan.md`. Its direct-main wrapper first emits exact
sentinel `AWWV_DESKTOP_RUNTIME_PROBE_WRAPPER_STARTED {"schema_version":1}` with LF. The external
coordinator owns 1,200,000 ms from npm-root start to sentinel and a 960,000 ms post-sentinel
fail-safe; the wrapper arms its 900,000 ms watchdog only from the child process `'spawn'` event,
never from `spawn()` return. A valid wrapper terminal freezes its class and cancels classification;
the coordinator records it without reclassification, allows 5,000 ms natural npm-root close, then
kills the root tree once if needed and verifies exit under a separate 5,000 ms bound. Forced or
failed cleanup records `post_terminal_cleanup_forced` / `post_terminal_cleanup_failure` and is
custody evidence, not a new class. If no wrapper terminal exists, drained npm
close or the 960,000 ms fail-safe settles one coordinator receipt; the fail-safe kills the npm tree
once and records `wrapper_terminal_present: false` and `coordinator_fail_safe_triggered: true`.
It requires 43 exact
deterministic `{ sequence, phase }` marker rows from `probe-enter` through
`probe-body-complete`, live stdout/stderr, and one owning full-process-tree kill without extension,
race, or retry. Its exact classes are `PACKAGE_FAILURE`, `PACKAGE_NO_VERDICT`,
`NONREPRODUCIBLE_GREEN`, `LOCALIZED_FAILURE`, `PRE_MARKER_FAILURE`, `LOCALIZED_NO_VERDICT`,
`PRE_MARKER_NO_VERDICT`, and `INSTRUMENTATION_INVALID`. Every class stops. Only after QA accepts
the Lock-3 receipt and both Architect and Orchestrator explicitly accept
`NONREPRODUCIBLE_GREEN` may Product Manager draft a fresh exact-base P2B lock through ordinary
review/re-pin/check custody; this is not retroactive proof. The other seven cannot open P2B, keep it
held, and allow one bounded proposal after receipt closeout. Verification is bounded to provisioned
Node `v22.23.0`, one focused RED, one focused GREEN, `node --check` on both JavaScript files, and
`git diff --check`; no `npx`, typecheck, desktop
sim build, balanced run, duplicate focused run, or campaign is authorized. The checker-required
maximum-clean-pairs value `1` is inert while long-run `permitted` is false; actual campaign
runs/pairs are zero and the one packaged invocation is not a clean pair.

`PACKAGE_FAILURE` requires captured npm output/exit positively proving
`desktop:package:dir` failed before wrapper entry. Packaging-complete or wrapper-entered output with
missing sentinel is `INSTRUMENTATION_INVALID`, even on npm nonzero. `PACKAGE_NO_VERDICT` records the
last proven npm stage at 1,200,000 ms and makes no unsupported package-hang claim. Build Engineer,
Architect, and QA independently review the coordinator attribution and race/cleanup tests.

After the one shot and cleanup, Product Manager must install Lock 3 exactly as
`RE-PROBE-RECOVERY-RECEIPT` / `record-one-shot-packaged-probe-recovery-result` on the exact
candidate commit, allowlisting exactly the lock, recovery plan, this audit,
`src/desktop/README.md`, and `docs/PROJECT_LEDGER.md`. Its lock is reviewed/re-pinned before any
receipt edit. The receipt records ordered marker rows, sequence validity, `last_observed_marker`,
`last_completed_stage`, `next_expected_marker`, exact package/child/wrapper/coordinator results,
manifest validation, sentinel/package attribution, terminal owner/presence and settlement event,
classification fail-safe state, 5,000 ms natural-close grace, forced cleanup and separate 5,000 ms
verification, timeout/kill evidence, invocation count, and final immutable class. Lock 3
is mandatory, docs-only, and authorizes no second probe or remediation.

This 14-document transition synchronizes current lane, calibration pause, roadmap, board, indexes,
governance, and both ledgers.
It changes operator control and reusable custody rules only; there is no product behavior, canon,
scenario, calibration, reference, or historical-target change. The original probe channel remains
closed at `b711cffa9`; the auxiliary recovery is a distinct active safety-control lane and this
living audit remains its single evidence record.

## 2026-08-28 — Lock 2 rejection and terminal recovery amendment

The attempted Lock 2 instrumentation is rejected on frozen base and HEAD
`9d23044e1253bbd0d5b66e2ee45cb7081d7e884d`. Its external, non-candidate metadata copy is
`F:\A-War-Without-Victory\.git\worktrees\re-engine-integrity\rejected-lock2-20260828.patch`,
49,583 bytes, SHA-256
`37e242835941acb379445e4f1bfd869b0c6f4f017229954355d89ffb7344535d`. The patch contains exactly
`docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json` `+6/-14`,
`src/desktop/electron-main.cjs` `+48/-0`,
`tests/desktop_packaged_runtime_probe.test.ts` `+337/-0`, and
`tools/desktop_packaged_runtime_probe.mjs` `+225/-37`. Initial QA under exact Node `v22.23.0`
reported focused 20/20 GREEN, both JavaScript syntax checks GREEN, and `git diff --check` GREEN.
Those results do not overcome the independent Architect and specification-review **NO-GO**.

The first specification review found behavioral, not cosmetic, defects in coordinator settlement,
tree-kill custody, validation failure exits/diagnostics, marker tracking, package attribution,
emitter shape, and their tests. One allowed correction fixed the emitter boundary, last-valid/
stdout-only/`probe-body` tracking, late child-event ownership, non-green exit computation, and part
of async kill settlement. Final Architect and specification review still found the candidate
invalid: post-sentinel fail-safe attribution and timeout/close cleanup actions were wrong; package
contradictions and wrapper-terminal class exclusions were incomplete; synchronous and nonzero
`taskkill` failures were unsafe; direct execution suppressed validation diagnostics; exact marker
object shape/key order was not enforced; and real-validator plus one-launch/no-retry behavioral
proof remained absent. Those remaining gaps control the rejection.

After review confirmation, the specification reviewer accidentally repeated read-only
`git diff --check` and cached diff-check inspection. Both are excluded from acceptance evidence.
They caused no mutation and no test, build, package, probe, or Electron execution. Process QA's
disposition is **PASS WITH EXCEPTION** for that redundant inspection only. There were zero packaged
invocations: the authorized one-shot remains unconsumed but is nontransferable from rejected Lock
2. All rejected files were restored clean to HEAD. Lock 2 produced no candidate, commit, recovery
credit, or P2B proof. P2B remains **HELD** and P3 remains waiting.

Orchestrator authorizes one final behavior-first attempt only after this amendment commits. Product
Manager must then install and obtain exact-byte review/re-pin acceptance for
`RE-PROBE-RECOVERY-INSTRUMENTATION-R2` / `behavior-first-coordinator-and-wrapper-settlement`, with
the same six paths as Lock 2: the lock, recovery plan, this living audit, Electron main, wrapper,
and existing packaged-probe test. The same denylist, failure policy, no-credit rule, false long-run
permission, clocks, eight classes, narrow Electron boundary, and LOC caps remain binding. No
package execution is permitted before a reviewed clean candidate.

Before production code, Architect and the original specification reviewer jointly freeze an exact
behavioral matrix covering atomic coordinator ownership/precedence; the 1,200,000/960,000 ms
clocks; 5,000 ms natural-close grace plus separate 5,000 ms cleanup verification; positive package
attribution and contradictory evidence; exclusion of package classes after wrapper terminal;
awaited tree-kill success, nonzero result, synchronous error, and late close; validation diagnostics
with nonzero exit; exact marker key order, shape, valid-only and stdout-only tracking; exact emitter
and bracketing; real-validator present, malformed, success, and failure cases; terminal order; and
no retry. The implementer edits only the existing test and runs one focused RED under exact Node
`v22.23.0`; inherited tests must remain green, and Architect plus the reviewer inspect that RED
before any production edit. The implementer then rebuilds production from clean HEAD design—never
by applying the rejected patch—and may edit only Electron main and the wrapper within the existing
caps. Verification is exactly one focused GREEN, two `node --check` commands, and one
`git diff --check`, followed by fresh read-only specification, Architect, Build, QA, and Process QA
review. Acceptance requires unanimous GO.

There is no correction pass or rerun. Any RED mismatch or regression, GREEN/static failure,
boundary/cap/class/clock/manifest/normal-runtime violation, second edit or run, or final NO-GO
abandons instrumentation and closes recovery to a receipt lock plus an alternate packaged-proof
strategy. There is no R3, no package/probe execution, and no P2B resumption from a failed R2.

### R2 terminal receipt — NO-GO before production

Final R2 closes as `R2_TERMINAL_NO_GO_BEFORE_PRODUCTION`, a process disposition outside the eight
packaged-runtime diagnostic classes. The exact base was
`f674ff0efe663432628a44b9134070fca5bd608e`; the reviewed R2 lock SHA-256 was
`3c376c51e1a4cf36e3cd336daa866ef0ab0515dfab19d474089aeadc28bfbe16`; and the pre-RED staged control
manifest SHA-256 was `241e46b669e468babd2ea9427fe39305e7fac944988a28dcf2b79e35126b4f85`.
The staged blobs were lock `f66f1755e93da04bdf45d6a0044e82cba4ef4a00`, audit
`d81237420ff739104248fa3664eb73a23d7b3295`, and plan
`2d27213e43ca8e808b63e5260eaa0a16ad2c8930`; the test remained at index/base blob
`29194ca0844acb8ac6cfb7dff6f1cb17f9513157` before its tests-only worktree edit.

The sole authorized command was
`node node_modules/vitest/vitest.mjs run tests/desktop_packaged_runtime_probe.test.ts` under exact
Node `v22.23.0` and Vitest `2.1.9`. It exited `1` after `1.05s`: 11 tests comprised seven inherited
passes and four intentional new failures:

- `R2 tracker and classifier implement every frozen MKR and CLS row`;
- `R2 coordinator reducer implements every frozen COR and race row`;
- `R2 supervisor, import, main, and manifest matrix is behaviorally frozen`;
- `R2 Electron marker helper, ordering, and diff confinement are frozen`.

The tests-only worktree delta was `+215/-0`, blob
`5ac145657a5b538e3aee44110568e26ab10357a0`. The RED is valid but insufficient: it omitted material
rows of the jointly frozen matrix. Architect's **NO-GO** census found incomplete coordinator
reverse-fail-safe race, duplicate-event ownership/progress/root-state assertions; `SUP-09` lacked a
controllable pending-kill promise, terminal-absence proof, and late-close ownership; stderr/live
forwarding and terminal/CLI order were incomplete; `SUP-01` did not use the real validator;
`MAN-01` did not prove filesystem/spawn/timer side-effect absence; `MAN-07` did not prove direct
failure order, exit 124, one write, and green direct behavior; and Electron row-2 placement was
absent.

The original specification reviewer's **NO-GO** census independently identified: `COR-03`
fail-safe-false; `COR-04` error class, no-grace, and late-event single-settlement omissions;
`COR-05` flags/class/progress; `COR-06` count/class/progress and sticky later-clear handling;
`COR-07` repeat handling; `COR-08` terminal absence, no grace, and immutability; `COR-09`
owner/terminal/no-grace; `COR-10` owner/terminal/root/error/no-grace/immutability; `R02` close/cancel;
`R03` reverse ordering; `R04` reverse invariants; and `R05` no-second-terminal/count. Supervisor
coverage also omitted forwarding, `SUP-02/03` terminal/clear behavior, `SUP-05` through `SUP-08`
progress, `SUP-09` pending settlement, and `SUP-11` LF/once; manifest/main coverage omitted
`MAN-01` import side effects, `MAN-08` timeout launch/no-retry, and `MAN-07` direct behavior; and
Electron proof omitted row 2 and the complete send/collect push brackets.

No correction or rerun was permitted. There was no production edit, GREEN, syntax check, diff
check, package, packaged probe, or Electron execution. The full raw test output is unavailable: it
was truncated at 50,027 tokens after including the complete Electron source; only this retained
receipt is authoritative. No runtime/package artifact or live process remained; the two preserved
negative-evidence patches are custody artifacts outside the checkout.

The rejected R2 negative patch is retained outside the checkout at
`F:\A-War-Without-Victory\.git\worktrees\re-engine-integrity\rejected-r2-red-20260828.patch`,
56,104 bytes, SHA-256
`a258b5f36543a303442c2cd2ac2b297df562e579e4882fd265fbe027d9ddde0e`. Its exact numstat is lock
`+36/-7`, audit `+17/-0`, recovery plan `+204/-3`, and test `+215/-0`. The four paths were restored
clean to exact HEAD; the earlier rejected-Lock2 patch remains separately preserved.

Instrumentation is stopped and there is no R3. The auxiliary lane remains active only to close
this stop receipt; read-only alternate packaged-proof discovery is queued and unauthorized until
its fresh exact-base docs-only lock is reviewed, pinned, and accepted. P2B stays **HELD**, P3 waits, calibration remains
paused, recovery earns no RE credit, and packaged-probe invocation count remains `0`.

During stop-receipt review, Process QA ran one unauthorized read-only
`git diff --cached --check`. It is excluded from acceptance evidence; it caused no mutation, test,
build, package, probe, or Electron execution and does not change the terminal disposition.
