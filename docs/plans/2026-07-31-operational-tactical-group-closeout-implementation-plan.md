# Operational/Tactical Group Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-07-31
**Status:** IN PROGRESS — Phases 0–5 complete; execute Phase 6 integration/closeout
**Overseer:** Orchestrator
**Owner lane:** Systems Programmer + Gameplay Programmer
**Independent reviewers:** QA Engineer, Determinism Auditor, Historian, Canon Compliance Reviewer where named
**Related command-board row:** `Operational/Tactical Group lifecycle and convergence closeout`
**Phase/workstream covered:** ADR-0005 temporary offensive Tactical Groups, Army-HQ operation lifecycle, legacy `kind: 'og'` convergence, ADR-0006/0007 standing-OG truth
**Current next action:** Integrate Phase 5, then execute Phase 6 full proof and closeout
**Collision rule:** Do not edit or clean the user's current dirty workspace. If another active branch owns a Phase 1–4 source file, sequence this packet after it and rebase on its completed work.

**Goal:** Close the lifecycle, telemetry, and duplicate-path gaps in the operational/tactical-group system while preserving the already-live donor selection, combat synthesis, casualty distribution, cooldown, recovery-suppression, and promotion substrate.

**Architecture:** `CorpsOperation` remains the sole offensive-operation clock. A live `TacticalGroup` mirrors that operation's active phase, Army-HQ operation records follow the same transition chokepoints, and dissolution finalizes per-brigade telemetry before removing the live TG. The older formation-based `kind: 'og'` path becomes compatibility-only once a clean-run proof shows the Tactical Group path owns new offensive task organization. Corps sectors remain the standing-OG spatial entity. ADR-0007 Phase C remains retired; Phase 5 aligns the ADR and canon wording to the narrower live contribution/primary-aftermath model without changing combat behavior.

**Tech Stack:** TypeScript, Vitest, deterministic scenario runner, save migration/validation, Markdown governance docs.

---

## 1. Current Truth and Why This Lane Exists

### 1.1 Verified live behavior

- All Tactical Group and Army-HQ feature flags are enabled.
- Eligible donor-backed operations form TGs at the ready/planning-to-execution boundary.
- Donors are same-faction, own/adjacent corps for regular TGs or faction-wide for Army-HQ operations, bounded to six BFS hops and three donors.
- Donor personnel/equipment contributes to attack power; at least half of attacker casualties remain with the anchor and the donor share is deterministic/pro-rata.
- Donors pay cohesion bleed, eight-turn positive-recovery suppression, a six-turn dissolution cooldown, and a per-scenario donation cap.
- Anchor loss can dissolve a TG immediately.
- Focused verification passed 20 files / 195 tests on 2026-07-31.

### 1.2 Verified closeout gaps

- `TacticalGroup.status` is created as `forming`, but no production transition writes `engaged`; the live record's `cohesion` does not drain and the ADR's 12-turn maximum lifecycle is not enforced.
- `ArmyHqOperation.status` is created as `planning`, but no production transition writes `executing`, `recovering`, or `completed`. A stale planning record therefore keeps reducing the faction TG cap.
- `ArmyHqOperation.tg_id` can point to a TG that has already been deleted.
- `TgParticipationRecord` promises dissolution fields in its comment but does not define or populate them.
- The formation-based `operational_groups.ts` pipeline remains wired alongside Tactical Groups. It debits donor personnel directly and returns survivors without exact donor identity; current 80/188-week evidence contains no live legacy `kind: 'og'` formations.
- Zero-donor operations intentionally fall back to the lone-anchor operation path, and `none` donor policy intentionally forms no TG. Older “every offensive forms a TG” wording is therefore too broad.
- Promotion currently assigns ordinal `1` to every eligible RBiH corps; multiple corps can project the same default `21. Division` identity.
- Standing-OG Phase B reserve commitment is live, while the broader shared-defense Phase C was retired. Canon still says the standing OG shares defensive fatigue and casualties, creating a governance conflict that must be resolved before new combat code.

### 1.3 Long-run evidence to preserve

Use the existing final save as a characterization fixture input, never as a file to edit:

`runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json`

Observed at turn 188:

- one active Sana TG, formed on turn 180, still `forming` with cohesion `100`;
- nine total TG formations across the per-corps counters;
- Farz Army-HQ record formed on turn 163, still `planning`, with a stale `tg_id`;
- 19 live TG-participation records plus archived records;
- no live legacy `kind: 'og'` formations;
- duplicate default promotion identity (`21. Division`) on more than one corps.

---

## 2. Locked Scope Decisions

1. **Do not rebuild working TG combat math.** Donor selection, effective personnel, combat synthesis, casualty split, cooldown, recovery suppression, and Army-HQ donor scope stay unchanged unless a new red test proves a defect.
2. **Codify donor-backed semantics.** `full` and `limited` policies may form a TG only when at least one legal donor exists. `none` policy and a zero-donor result continue through the ordinary operation path without a phantom/empty TG.
3. **One lifecycle authority.** `CorpsOperation.phase` owns the clock. TG and Army-HQ status synchronization must happen at the existing operation transition chokepoints, not in an independent second scheduler.
4. **Live TG storage stays bounded.** A TG is present while forming/engaged. On execution-to-recovery it is finalized and removed, matching ADR-0005 trickle-back. `recovering`/`dissolved` may be used during finalization but are not retained as an unbounded second archive; per-brigade participation records own historical truth.
5. **Army-HQ records are durable receipts.** They remain after completion, but completed records must not reduce TG concurrency and must not retain a live `tg_id`.
6. **Standing-OG disposition is decided.** Do not edit `docs/10_canon/FORAWWV.md`. Phase 5 aligns ADR-0006/0007, the Systems Manual, and the Rulebook to the narrower live model: sectors are standing OGs; actual contributors share the immediate combat cost; downstream aftermath remains primarily owned by the primary defender; retired ADR-0007 Phase C is not resurrected.
7. **No baseline refresh by default.** Any scenario/hash drift must be explained and accepted under the master roadmap's behavior criteria. Never run an update/re-bless command merely to make a verification barrier green.
8. **No release mutation.** This maintenance packet does not authorize a version bump, tag, push, PR, signing, upload, installer publication, or release-state change. Those actions remain under the master-roadmap publication boundary.

---

## 3. Purpose and Non-Goals

### In scope

- Deterministic TG and Army-HQ lifecycle status transitions.
- Stale Army-HQ cap/tg-reference repair for live and loaded state.
- Dissolution telemetry on live and archived brigade participation records.
- A deterministic audit tool for current/future saves.
- Canonical TG cohesion/max-lifecycle enforcement using the locked constants in Phase 3.
- Retirement of new legacy-OG production while retaining bounded old-save cleanup.
- Prevention of new unmapped/duplicate promotion identities.
- Standing-OG ADR/canon convergence to the decided narrower live model.
- Focused, migration, full-suite, baseline, and 40/188-week proof.

### Non-goals

- No changes to donor power, casualty percentages, BFS range, caps, recovery suppression, or historical operation targets.
- No cross-faction HVO↔RBiH donations.
- No new offensive operation, Army-HQ operation, scenario event, OOB unit, map geometry, GUI surface, or presidential lever.
- No resurrection of retired ADR-0007 Phase C code.
- No automatic correction of historically ambiguous existing promotion records.
- No calibration tuning to recover territory counts.
- No baseline-manifest or startup-snapshot edit unless the locked behavior criteria justify the drift; no package-version, installer, tag, or release edit under this packet.

---

## 4. External-Agent Execution Contract

### 4.1 Session start

Run from `F:\A-War-Without-Victory`:

```powershell
git status --short
git rev-parse --short HEAD
git branch --list codex/op-tg-closeout
git worktree list
```

If `codex/op-tg-closeout` and its worktree do not exist:

```powershell
git worktree add -b codex/op-tg-closeout ..\AWWV-op-tg-closeout
Set-Location ..\AWWV-op-tg-closeout
```

If they already exist, inspect and reuse them. Do not delete, reset, clean, stash, or alter the owner's original worktree.

### 4.2 Required reading before editing

- `.claude/napkin.md`
- `docs/00_start_here/docs_index.md`
- `docs/10_canon/context.md`
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §§6.3, 11, 14.7
- `docs/10_canon/Systems_Manual_v0_9_0.md` §§5, 6.3, 6.7
- `docs/10_canon/Rulebook_v0_9_0.md` operational/standing-OG sections
- `docs/20_engineering/ADR/ADR-0005-tactical-groups-as-primary-ops-path.md`
- `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`
- `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`
- `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- this plan, `docs/plans/COMMAND_BOARD.md`, and `docs/plans/MASTER_ROADMAP.md`

### 4.3 Initial characterization barrier

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- tests/tg_casualty_distribution.test.ts tests/tg_determinism.test.ts tests/tg_donation_readiness_fallback.test.ts tests/tg_effective_personnel.test.ts tests/tg_fidelity.test.ts tests/tg_identity_commander.test.ts tests/tg_inv6_zombie_hold.test.ts tests/tg_invariants.test.ts tests/tg_lifecycle.test.ts tests/tg_migration_recon.test.ts tests/tg_og_promotion.test.ts tests/tg_pre_planned_reservation.test.ts tests/tg_recovery_suppression.test.ts tests/tg_routing.test.ts tests/tg_schema_freeze.test.ts tests/tg_telemetry.test.ts tests/operation_aar_army_hq_telemetry.test.ts tests/standing_og_defense.test.ts tests/corps_command.test.ts tests/triggered_operations.test.ts --pool=forks --reporter=dot
```

If this barrier fails for a reason unrelated to the lane, record the exact prerequisite failure and continue only with focused commands that isolate this packet. Do not repair unrelated user work; the global barrier must be rechecked before R3 closes.

### 4.4 Commit and review discipline

- Execute sequentially; Phases 1–4 overlap lifecycle files and are not parallel-safe.
- One logical phase per commit using conventional messages.
- Run `/simplify`, fix its findings, then run verification before each commit.
- Record commands and exact pass counts in the plan's Execution Log.
- Independent QA/determinism review is required after Phases 2, 4, and 6.

---

## 5. Phase Sequence

## Phase 0 — Reproducible lifecycle audit

**Assigned to:** QA Engineer / Systems Programmer
**Estimated scope:** 1 small tool, 1 test file, no simulation behavior change

### Task 0.1 — Write the audit contract first

**Files:**

- Create `tests/operational_tactical_group_audit.test.ts`
- Create `tools/diagnostics/audit_operational_tactical_groups.ts`

- [x] Add a synthetic-state test that requires stable, sorted output for:
  - TG count/status/age/cohesion;
  - Army-HQ count/status and stale `tg_id`;
  - planning/executing records with no matching live CorpsOperation;
  - live and archived participation counts;
  - legacy active `kind: 'og'` formations and queued `og_orders`;
  - duplicate promotion display names.
- [x] Run the test before implementation and record the expected missing-module failure.
- [x] Implement a read-only analyzer plus CLI. It must accept a save path argument, emit JSON to stdout, use no timestamp, and sort all ids with `strictCompare`.
- [x] Run the tool against the turn-188 save named in §1.3 and record the observed counts in the Execution Log.
- [x] Do not write into `runs/`.

**Red command:**

```powershell
npm.cmd run test:vitest -- tests/operational_tactical_group_audit.test.ts --pool=forks --reporter=dot
```

**Green commands:**

```powershell
npm.cmd run test:vitest -- tests/operational_tactical_group_audit.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd exec -- tsx tools/diagnostics/audit_operational_tactical_groups.ts runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json
```

**Gate:** The audit deterministically reproduces every §1.3 category without changing the save.

→ `/simplify` → verify → commit `test(tg): add operational group lifecycle audit`

---

## Phase 1 — Live TG and Army-HQ lifecycle truth

**Assigned to:** Gameplay Programmer
**Reviewer:** Systems Programmer + Determinism Auditor
**Estimated scope:** 4–6 source files, 2 new focused test files

### Task 1.1 — Pin donor-backed formation semantics

**Files:**

- Modify `tests/tg_donation_readiness_fallback.test.ts`
- Modify `tests/tg_lifecycle.test.ts`
- Modify stale comments in `src/sim/combat/sector_offensive.ts`
- Modify stale comments in `src/sim/combat/operation_preparation.ts`

- [x] Add/retain tests proving `none` policy produces no TG.
- [x] Add/retain tests proving a `full`/`limited` operation with zero eligible donors proceeds without an empty TG.
- [x] Replace “every offensive forms a TG” comments with “every donor-eligible offensive attempts TG formation; zero-donor fallback remains an ordinary operation.”
- [x] Do not change runtime behavior in this task.

### Task 1.2 — Make `forming → engaged` observable

**Files:**

- Create `tests/tg_op_lifecycle.test.ts`
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`

- [x] Write failing tests for both planning-to-execution transition sites.
- [x] Add one lifecycle helper that finds TGs for an operation in sorted id order, sets live status to `engaged`, and refreshes `location_osid` from the anchor.
- [x] Call the helper immediately after TG formation at both operation transition sites.
- [x] Keep formation idempotent and keep zero-donor fallback untouched.

### Task 1.3 — Synchronize Army-HQ status and clear stale cap reducers

**Files:**

- Create `tests/army_hq_op_lifecycle.test.ts`
- Modify `src/state/game_state.ts` only if optional lifecycle turn fields are required
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`
- Modify `src/sim/combat/triggered_operations.ts`
- Modify `src/state/save_migration.ts` only if load-time normalization is needed
- Modify `tests/save_migration.test.ts` and/or `tests/save_migration_versioned_steps.test.ts` if migration code changes

- [x] Write failing tests for `planning → executing → recovering → completed`.
- [x] At TG/operation execution, set the associated Army-HQ record to `executing`.
- [x] At operation recovery entry, set it to `recovering`, finalize/dissolve the TG, and clear `tg_id`.
- [x] At CorpsOperation removal after recovery, set the durable Army-HQ record to `completed`.
- [x] Add a deterministic reconciliation helper for loaded state: if a planning/executing Army-HQ record has no matching live CorpsOperation and no live TG, mark it completed and clear `tg_id`.
- [x] Audit every production recovery entry, including direct `op.phase = 'recovery'` assignments and `beginRecovery` calls that do not currently receive state; add source-contract and runtime tests proving each path synchronizes TG/Army-HQ state exactly once.
- [x] Keep `recovering` Army-HQ records cap-active as a temporary safety rule until Task 3.3 lands; never merge a state where the new `recovering` transition releases the cap immediately.
- [x] Treat this temporary cap rule and Task 3.3 as one atomic integration contract: either land the four-turn recovery-tail metadata/counting in the same integration or retain the temporary `recovering` count until it does.

**Red command:**

```powershell
npm.cmd run test:vitest -- tests/tg_op_lifecycle.test.ts tests/army_hq_op_lifecycle.test.ts tests/tg_lifecycle.test.ts tests/tg_invariants.test.ts --pool=forks --reporter=dot
```

**Green commands:**

```powershell
npm.cmd run test:vitest -- tests/tg_op_lifecycle.test.ts tests/army_hq_op_lifecycle.test.ts tests/tg_lifecycle.test.ts tests/tg_invariants.test.ts tests/tg_donation_readiness_fallback.test.ts tests/triggered_operations.test.ts tests/operation_aar_army_hq_telemetry.test.ts tests/tg_schema_freeze.test.ts tests/tg_migration_recon.test.ts tests/save_migration.test.ts tests/save_migration_versioned_steps.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

**Gate:** No live execution TG remains `forming`; no completed/stale Army-HQ record reduces the faction TG cap or points at a missing live TG.

→ `/simplify` → verify → commit `fix(tg): synchronize tactical and army hq lifecycles`

---

## Phase 2 — Complete dissolution telemetry

**Assigned to:** Systems Programmer
**Reviewer:** QA Engineer + Determinism Auditor
**Estimated scope:** 3 source files, 2–3 focused test files

### Task 2.1 — Define terminal participation fields

**Files:**

- Modify `src/state/brigade_history.ts`
- Modify `tests/tg_telemetry.test.ts`
- Modify `tests/tg_schema_freeze.test.ts`

- [x] Add optional `dissolved_turn`, `personnel_returned`, and `casualties` fields to `TgParticipationRecord`.
- [x] Keep them omit-empty compatible.
- [x] Define exact semantics:
  - donor `casualties = contribution.casualties_so_far`;
  - donor `personnel_returned = max(0, personnel_lent - casualties)`;
  - anchor gets `dissolved_turn`; do not invent anchor casualties or returned personnel.
- [x] Confirm whether this additive optional shape can remain on the current schema. If validation or migration cannot safely accept both shapes, stop and require a schema-step decision.

### Task 2.2 — Finalize both live and archived records before deletion

**Files:**

- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `tests/tg_telemetry.test.ts`
- Modify `tests/tg_lifecycle.test.ts`
- Modify `tests/tg_casualty_distribution.test.ts`

- [x] Write a failing test in which donor casualties accrue before dissolution.
- [x] In `dissolveTacticalGroup`, mark the TG terminal in memory, then update matching participation rows by `tg_id` in both `tg_participations` and `archived_tg_participations`.
- [x] Iterate brigade ids and history lists deterministically.
- [x] Finalize telemetry before clearing loans and deleting the live TG.
- [x] Prove idempotency: a second dissolve call changes nothing.
- [x] Prove personnel conservation and `casualties <= personnel_lent`.

### Task 2.3 — Preserve AAR telemetry and save compatibility

**Files:**

- Modify tests only unless a defect is exposed:
  - `tests/operation_aar_army_hq_telemetry.test.ts`
  - `tests/tg_migration_recon.test.ts`
  - `tests/save_migration_round_trip_contract.test.ts`

- [x] Prove Army-HQ AAR snapshots remain available after TG deletion.
- [x] Prove an old record without terminal fields loads and round-trips.
- [x] Prove a completed record with terminal fields round-trips without zero invention.

**Green commands:**

```powershell
npm.cmd run test:vitest -- tests/tg_telemetry.test.ts tests/tg_lifecycle.test.ts tests/tg_casualty_distribution.test.ts tests/operation_aar_army_hq_telemetry.test.ts tests/tg_migration_recon.test.ts tests/tg_schema_freeze.test.ts tests/save_migration_round_trip_contract.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
```

**Gate:** Every dissolved donor participation records lent, casualties, returned, and dissolution turn; anchor records terminal turn without fabricated values.

→ `/simplify` → independent QA/determinism review → verify → commit `feat(tg): finalize dissolution participation telemetry`

---

## Phase 3 — Canonical TG exhaustion and Army-HQ recovery cost

**Assigned to:** Gameplay Programmer + Systems Programmer
**Reviewer:** Game Designer, Determinism Auditor, QA Engineer
**Status:** COMPLETE — locked 12/4/15/4 lifecycle and deterministic scenario proof landed locally
**Estimated scope:** 3–5 source files, focused tests, 40/188-week scenario proof

### Locked constants

Implementation constants, based on the accepted ADR and legacy implementation:

- `TG_MAX_LIFECYCLE_TURNS = 12` from ADR-0005.
- `TG_COHESION_DRAIN_PER_ENGAGED_TURN = 4`, reusing the existing formation-based OG drain.
- `TG_DISSOLVE_COHESION = 15`, already canonical.
- `ARMY_HQ_TG_CAP_RECOVERY_TURNS = 4` from ADR-0005.

These values are the implementation contract. A failing characterization may correct a transcription error, but it does not reopen the product choice; any genuine conflict is resolved by the governing ADR and the master roadmap.

### Task 3.1 — Write exhaustion tests first

**Files:**

- Modify `src/sim/combat/tactical_group_config.ts`
- Modify `tests/tg_op_lifecycle.test.ts`
- Modify `tests/tg_invariants.test.ts`

- [x] Test no drain while `forming`.
- [x] Test one drain per engaged war turn.
- [x] Test dissolution below cohesion 15.
- [x] Test dissolution at age 12.
- [x] Test no duplicate drain when unrelated helpers run.
- [x] Test an exhaustion-triggered TG termination transitions the owning CorpsOperation into recovery rather than letting an unbacked Army-HQ shell continue.

### Task 3.2 — Implement at the operation lifecycle chokepoint

**Files:**

- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`

- [x] Advance TG cohesion exactly once inside the operation lifecycle pass.
- [x] Return a typed deterministic termination reason to the CorpsOperation owner.
- [x] Route cohesion/age termination through the same `beginRecovery`/telemetry/dissolution path as ordinary completion.
- [x] Do not create a second war-phase scheduler.

### Task 3.3 — Implement the four-turn Army-HQ cap tail

**Files:**

- Modify `src/state/game_state.ts`
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/state/save_migration.ts` if required
- Modify `tests/army_hq_op_lifecycle.test.ts`
- Modify save migration/validation tests

- [x] Add optional recovery/completion turn metadata only if required.
- [x] Count the cap reduction for planning/executing and the first four turns after recovery begins.
- [x] Replace the Phase 1 temporary all-`recovering` cap count atomically with the bounded four-turn tail; add a regression proving there is no intermediate early-release state.
- [x] Ensure legacy stale planning records without a live operation become completed, not a fresh four-turn penalty.
- [x] Pin old-save defaults and round-trip behavior.

### Behavior verification

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- tests/tg_op_lifecycle.test.ts tests/army_hq_op_lifecycle.test.ts tests/tg_invariants.test.ts tests/tg_lifecycle.test.ts tests/tg_determinism.test.ts tests/tg_casualty_distribution.test.ts tests/triggered_operations.test.ts tests/operation_aar_army_hq_telemetry.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

Run the audit tool on both new final saves. Run a second 188-week scenario and prove byte identity before accepting deterministic output.

**Rejection barrier:** Revert or keep the phase open for any unexplained control/hash drift, anchor regression, Section 6 sensitivity change, cross-faction donation, personnel conservation failure, or non-identical repeated 188-week output. Do not refresh a baseline to hide it.

→ `/simplify` → independent game-design/QA/determinism review → verify → commit `feat(tg): enforce canonical exhaustion lifecycle`

---

## Phase 4 — Retire duplicate legacy production and guard promotion identity

**Status:** COMPLETE — compatibility convergence, explicit promotion identity, and deterministic proof landed locally
**Assigned to:** Systems Programmer
**Reviewers:** QA Engineer; Historian for Task 4.3 only
**Estimated scope:** 4 source files, 3 focused tests

### Task 4.1 — Characterize the duplicate producer

**Files:**

- Create `tests/operational_group_convergence.test.ts`
- Inspect `src/sim/combat/bot_corps_ai.ts`
- Inspect `src/sim/combat/bot_corps_operations.ts`
- Inspect `src/sim/combat/operational_groups.ts`
- Inspect `src/sim/turn_phases/war_phases.ts`

- [x] Test that a TG-enabled execution operation cannot enqueue a new legacy `OGActivationOrder`.
- [x] Test that old queued `og_orders` are handled deterministically and cannot create a second concurrent force overlay for the same operation.
- [x] Test that an already-active legacy `kind: 'og'` can finish its old compatibility lifecycle without disappearing personnel.

### Task 4.2 — Make legacy OG compatibility-only

**Files:**

- Modify `src/sim/combat/bot_corps_operations.ts`
- Modify `src/sim/combat/operational_groups.ts`
- Modify `src/sim/turn_phases/war_phases.ts`
- Modify `tests/operational_group_convergence.test.ts`

- [x] When Tactical Groups are enabled, stop producing new `og_orders`.
- [x] Prevent stale queued orders from activating a new legacy formation on the live path.
- [x] Retain `updateOGLifecycle` only as a bounded old-save drain for already-active `kind: 'og'` formations.
- [x] Mark the module and phase step compatibility-only in comments.
- [x] Do not delete old-save cleanup until a schema-retirement packet proves no supported save requires it.

### Task 4.3 — Prevent new duplicate/unmapped Division identities

**Files:**

- Modify `src/sim/combat/tactical_group_promotion.ts`
- Modify `tests/tg_og_promotion.test.ts`
- Modify the audit tool/test from Phase 0

- [x] Write a failing test where two unmapped RBiH corps cross the threshold and would both become `21. Division`.
- [x] Require an explicit historical `(corps_id, og_ordinal) → division_number` mapping before creating a new promotion.
- [x] Do not auto-rewrite existing save records.
- [x] Make the audit flag duplicate/unmapped existing records for historian review.
- [x] Retain only the verified 2nd Corps mappings: 1st OG → 21st Division and 5th OG → 25th Division. Leave all other pairs uncreated.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/operational_group_convergence.test.ts tests/tg_og_promotion.test.ts tests/tg_lifecycle.test.ts tests/tg_invariants.test.ts tests/corps_command.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

If Task 4.2 changes scenario output, rerun the Phase 3 40/188-week deterministic proof. Refresh a baseline only when the change is explained, passes the locked roadmap criteria, and is recorded in the ledger.

**Gate:** A fresh TG-enabled campaign creates no legacy `kind: 'og'`; supported old state is cleaned without force inflation or personnel loss; new promotion names require explicit mappings and cannot duplicate.

→ `/simplify` → independent QA/historian review → verify → commit `refactor(tg): converge legacy operational group paths`

---

## Phase 5 — Standing-OG doctrine convergence

**Assigned to:** Technical Architect + Documentation Specialist
**Reviewers:** Game Designer, Historian, Canon Compliance Reviewer
**Status:** COMPLETE — documentation and contract tests only; no combat-behavior change
**Estimated scope:** two canon manuals, two ADRs, one contract test

### Task 5.1 — Encode the decided ownership model

**Files:**

- Modify `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`
- Modify `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`
- Modify `docs/10_canon/Systems_Manual_v0_9_0.md`
- Modify `docs/10_canon/Rulebook_v0_9_0.md`
- Create `tests/standing_og_doctrine_contract.test.ts`
- Do not edit `docs/10_canon/FORAWWV.md`

- [x] State that a corps sector is the standing operational-group spatial entity.
- [x] State that reserve/rear commitment is bounded by the live Phase B eligibility rules.
- [x] State that brigades that actually contribute share the immediate casualties/fatigue already assigned by the combat path.
- [x] State that downstream aftermath remains primarily owned by the primary defender unless a future roadmap revision explicitly changes the behavior contract.
- [x] Mark ADR-0007 Phase C as retired and prohibit its widened roster/predictor split from being inferred as live behavior.
- [x] Add a contract test that fails if the ADR, Systems Manual, and Rulebook again claim the retired broader model.
- [x] Make no runtime change in this phase.

### Task 5.2 — Verify doctrine and runtime remain aligned

```powershell
npm.cmd run test:vitest -- tests/standing_og_defense.test.ts tests/standing_og_doctrine_contract.test.ts tests/brigade_front_distribution.test.ts tests/distance_weighted_defense.test.ts tests/attack_casualty_distribution.test.ts tests/attack_post_battle_effects.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run typecheck
```

**Acceptance barrier:** The live narrower contribution/primary-aftermath model is described consistently; ADR-0007 Phase C remains retired; focused gameplay tests and baselines do not change.

→ `/simplify` → independent canon/historian review → verify → commit `docs(og): align standing doctrine with live model`

---

## Phase 6 — Integration proof and closeout

**Assigned to:** Orchestrator + QA Engineer
**Reviewers:** Determinism Auditor, Process QA
**Estimated scope:** verification, report, roadmap/board/ledger propagation

### Task 6.1 — Full proof

- [ ] Run the 20-file / 195-test focused baseline plus all new lifecycle/convergence tests.
- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `npm.cmd run test:vitest:fast`.
- [ ] Run `npm.cmd run test:baselines`.
- [ ] For any accepted behavior-changing phase, run fresh 40-week and paired byte-identical 188-week scenarios plus `engine:health:gate`.
- [ ] Run the audit tool on the new final saves.
- [ ] Run `git diff --check`.
- [ ] Record exact pass counts, hashes, output directories, and any deliberate drift.

### Task 6.2 — Completion report

**Create:**

- `docs/40_reports/implemented/20260731_OPERATIONAL_TACTICAL_GROUP_CLOSEOUT_IMPLEMENTATION_REPORT.md`

The report must include:

- live behavior preserved;
- lifecycle/telemetry/convergence changes;
- files modified;
- tests and scenarios run;
- before/after audit tables;
- save/schema decision;
- scenario/hash drift explanation;
- Standing-OG doctrine convergence result;
- promotion mappings added or still blocked;
- no-force-inflation and personnel-conservation evidence.

### Task 6.3 — Propagate status

**Update:**

- this plan's status and Execution Log;
- `docs/plans/COMMAND_BOARD.md`;
- `docs/plans/MASTER_ROADMAP.md`;
- `docs/plans/README.md`;
- `docs/PROJECT_LEDGER.md`;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for a reusable lesson;
- `.claude/napkin.md` only if a recurring execution guard changes.

**Do not update without separate authority:**

- `docs/10_canon/FORAWWV.md`;
- package version;
- release/tag state;
- baseline manifests.

**Completion barrier:** Phases 0–6 are green with no waiver, the decided Standing-OG wording is aligned, and the required deterministic/save evidence is recorded. R3 is not closed before this barrier passes.

→ `/simplify` → Process QA → final verification → commit `docs(tg): close operational group remediation lane`

---

## 6. Determinism and Save-Schema Barriers

- [ ] No randomness, timestamps, environment-dependent branching, or filesystem-order dependence.
- [ ] Sort all TG, Army-HQ, corps, formation, participation, and diagnostic ids with `strictCompare`.
- [ ] Lifecycle advances exactly once from the canonical operation pass.
- [ ] Any persisted field is optional/omit-empty unless a versioned migration is required and fully tested.
- [ ] Old-shape saves, current-shape saves, and round trips have explicit tests.
- [ ] TG donor personnel/equipment conservation remains exact.
- [ ] Repeated 188-week runs are byte-identical after behavior-changing work.
- [ ] No manifest refresh without a written drift explanation and satisfaction of the locked roadmap acceptance criteria.

---

## 7. Historical, Canon, and Player-Truth Barriers

- [ ] No cross-faction donation.
- [ ] No new historical operation or unsupported Division identity.
- [ ] Promotion requires an explicit historical mapping; ambiguous existing records are reported, not invented away.
- [x] Standing-OG combat behavior remains the decided narrower live model; Phase 5 changes documentation/contracts only.
- [ ] Section 6 sensitive-history control receipts remain event-owned and unchanged.
- [ ] No GUI work is required for Phases 0–4; do not add a player-facing field in R3, and route any presentation finding to R4 or R7.

---

## 8. Protocol Enforcement

- [ ] Orchestrator oversees all phases.
- [ ] Architecture changes receive independent Technical Architect and Canon Compliance Reviewer review against the locked decisions.
- [ ] Napkin is read at session start and updated only for a recurring lesson.
- [ ] Ledger entry is appended after each completed behavior/output phase.
- [ ] Life lessons are scanned before work.
- [ ] `/simplify` runs between phases and findings are fixed.
- [ ] `typecheck` plus relevant Vitest proof runs after every phase.
- [ ] One logical change per commit.
- [ ] Version bump/tag is recorded as N/A unless separately authorized.
- [ ] No completion claim without fresh evidence.

---

## 9. Success Criteria

- [ ] TG status reaches `engaged` in production when its operation executes.
- [ ] No active execution TG remains `forming` with untouched cohesion indefinitely.
- [ ] Army-HQ records reach terminal status, clear stale TG links, and stop applying stale cap reduction.
- [ ] Dissolved donor participation records exact lent/casualty/return values.
- [ ] Old participation records remain loadable.
- [ ] Donor-backed/zero-donor semantics are explicit and tested.
- [ ] Fresh TG-enabled campaigns create no legacy `kind: 'og'` formations.
- [ ] New promotion identities cannot duplicate through the default ordinal fallback.
- [x] Standing-OG doctrine consistently encodes the decided narrower live model and retired Phase C.
- [ ] TypeScript, focused/full tests, baselines, determinism, and required scenario proof are green.

---

## 10. Execution Log

| Date | Phase | Commit | Verification | Scenario/hash evidence | Notes |
|---|---|---|---|---|---|
| 2026-07-31 | Planning | uncommitted | Existing focused TG/Standing/Army-HQ pack: 20 files / 195 tests passed during audit | Existing turn-188 save characterized; no new run | Plan authored; runtime untouched |
| 2026-07-31 | 0 | this phase commit | RED: `npm.cmd run test:vitest -- tests/operational_tactical_group_audit.test.ts --pool=forks --reporter=dot` failed on the missing audit module; subsequent composite-identity and cumulative-count contracts also failed before their fixes. GREEN: the focused audit file passed 4/4; the initial 20-file characterization barrier passed 195/195; `npm.cmd run typecheck` and `git diff --check` passed. Two CLI invocations exited 0 with empty stderr and byte-identical 1,743-byte stdout (`SHA-256 37974400a5de5db36f070b44e05f83fcb2d8bffb10f1acbb1b9ec808f74c1635`) containing no timestamp field. | Read-only audit of `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json`: input SHA-256 remained `edc08a7e12d9377a0d744edd45a7cd70d29afe246ffaabf0a914e2b0f5d8c1d9` and mtime was unchanged. Turn 188: 1 live TG (`forming`, age 8, cohesion 100); 9 cumulative formations (3 each 3rd/5th Corps, 1 each HVO southeast Herzegovina/VRS Herzegovina/VRS Sarajevo-Romanija); 1 Army-HQ record (`planning`) with 1 stale TG link and 1 missing live CorpsOperation; 19 live + 1 archived participation; 0 active legacy OGs; 0 queued OG orders; duplicate `21. Division` across 3rd/5th Corps. | CLI deserializes through canonical migration/validation, audits normalized in-memory state, sorts emitted ids with `strictCompare`, writes only JSON to stdout, and creates no `runs/` artifact. Army-HQ live-operation matching is composite: anchor corps + operation name, with `army_hq_op_id` checked when present. |
| 2026-07-31 | 1 | this phase commit | RED: the first lifecycle slice collected 51 tests with 7 expected failures (missing reconciliation/hooks, both execution sites leaving TGs `forming`, and stale donor wording); follow-up red cases isolated recovering/load orphans, explicit live links, completed stale links, idempotent omit-empty recovery, and legacy sector `force_launch` ownership. GREEN: expanded Phase 1 pack passed 12 files / 172 tests; the original characterization barrier passed 20 files / 197 tests; `npm.cmd run typecheck`, `npm.cmd run test:baselines`, and `git diff --check` passed. | Approved 52-week baseline remained byte-identical after simplify: `final_save.json` SHA-256 `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0`; all eight artifacts matched. An intermediate one-path drift (`military.corps_command.jna_herzegovina_command.last_completed_operation.force_launch`, omitted → `false`) was traced to generic-hook serialization noise and removed before commit; no baseline manifest was refreshed. | One exact Army-HQ-id/deterministic `(hostCorpsId, op.name)` resolver now owns live lookup. Both execution transitions engage/relocate TGs; every live recovery/completion writer routes through idempotent hooks; loaded state repairs stale/orphan receipts without penalties; recovering remains cap-active until Task 3.3. `corps_command.advanceOperations` is explicitly narrowed to reorganization operations. |
| 2026-07-31 | 1 review correction | this follow-up commit | Independent Operations review RED: 3 files / 34 tests produced 4 expected failures—partial timeout was `completed`, no-attempt timeout was `brigade_attrition`, an unrelated live TG preserved an orphan receipt, and reorganization advanced at turn 2 on the competing evaluator clock. GREEN: expanded/adjacent pack passed 14 files / 182 tests; characterization barrier passed 20 files / 198 tests; `npm.cmd run typecheck`, `npm.cmd run test:baselines`, and `git diff --check` passed. | All approved baseline artifacts remained byte-identical; 52-week `final_save.json` stayed at SHA-256 `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0`. No manifest refresh. | Only the success threshold now yields `completed`; other general-operation exits use attempt-history diagnostics. Loaded `tg_id` links must match exact Army-HQ id or legacy anchor-corps/name. `evaluateOperationProgress` excludes reorganization, leaving the 3/4/3 clock solely in `corps_command.advanceOperations`. |
| 2026-07-31 | 1 mixed-legacy correction | this follow-up commit | Code-quality review RED: the new mixed load-to-completion lifecycle case failed because a CorpsOperation with `army_hq_op_id` could not resolve its linked ID-less legacy TG. GREEN: focused identity/AAR proof passed 2 files / 16 tests; expanded lifecycle/adjacent proof passed 14 files / 141 tests; characterization barrier passed 20 files / 198 tests; `npm.cmd run typecheck`, `npm.cmd run test:baselines`, and `git diff --check` passed. | All approved baseline artifacts remained byte-identical; 52-week `final_save.json` stayed at SHA-256 `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0`. No manifest refresh. | An explicit TG Army-HQ id remains authoritative and must match exactly. Composite host-corps/name fallback is available only when the TG id is absent, including when the owning CorpsOperation already has an id. The validated owning op supplies the AAR snapshot id. One end-to-end regression proves engagement, recovery telemetry/dissolution, receipt-link clearing, donor-lock cleanup, recovering cap retention, completion cap release, and same-name/different-corps plus conflicting-id isolation. |
| 2026-07-31 | 2 | this phase commit | RED: terminal telemetry slice collected 3 files / 50 tests with 1 expected failure because the archived donor row lacked `dissolved_turn`, `casualties`, and `personnel_returned`. GREEN: Phase 2 focused pack passed 7 files / 109 tests; characterization barrier passed 20 files / 200 tests; `npm.cmd run typecheck` and `git diff --check` passed. The required strict baseline command ran and reported the deliberate persisted-output mismatch described at right; the manifest was not refreshed. | `baseline_ops_4w` and `noop_4w` matched all 8/8 approved artifacts. `apr1992_52w` matched 6/8; `final_save.json` moved `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0` → `ef30222cd8b6eb99ad3d3e3b5688b414dc0d82e0a07a7a20465e43296351a141`, and the dependent `run_summary.json` moved `f3a37865738df9fbe0903da778d62fb201c23bcebbb5d20a22f1e2dce6ce6545` → `3f91bd76383ae9538e8556ccdb5e7116a3f29dfe42a0d20d95bb432a368bee14`. Removing exactly four new anchor `dissolved_turn` fields restored the former final-save hash; replacing only the dependent `final_state_hash` restored the former run-summary hash. | Schema 36 accepts both old and terminal optional participation shapes; no migration/version bump. Dissolution marks the TG terminal, then scans formation ids with `strictCompare` and preserves live/archive row order before clearing loans/deleting the TG. Donors record exact contribution casualties and `max(0, lent - casualties)` returns; anchors receive only terminal turn. Second dissolve is state-idempotent, and AAR snapshot survival remains green. No baseline refresh. |
| 2026-07-31 | 2 conservation correction | this follow-up commit | RED: direct distribution plus terminalization collected 2 files / 16 tests with 2 expected failures: a second battle allocated against each donor's original loan, and the accrued terminal case failed to move unavailable donor casualties to the anchor. GREEN: direct proof passed 16/16; the Phase 2 pack passed 7 files / 110 tests; expanded TG/combat characterization passed 24 files / 262 tests; `npm.cmd run typecheck` and `git diff --check` passed. | Strict baselines retained exactly the pre-existing Phase 2 telemetry drift: both 4-week scenarios matched 8/8, while `apr1992_52w` matched 6/8 with `final_save.json` at `ef30222cd8b6eb99ad3d3e3b5688b414dc0d82e0a07a7a20465e43296351a141` and `run_summary.json` at `3f91bd76383ae9538e8556ccdb5e7116a3f29dfe42a0d20d95bb432a368bee14`. Removing the same four anchor-only `dissolved_turn` fields restored `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0`; restoring only the dependent summary hash restored `f3a37865738df9fbe0903da778d62fb201c23bcebbb5d20a22f1e2dce6ce6545`. No new artifact drift and no manifest refresh. | The battle allocator now caps each donor at `max(0, personnel_lent - casualties_so_far)` before deterministic overflow reassignment to the anchor. Repeated battles preserve cumulative `casualties <= lent` and total-casualty conservation; terminalization records exact returns and remains idempotent. No ordering, schema, migration, scenario, canon/FORAWWV, package, push, merge, tag, or release-state change. |
| 2026-07-31 | 2 controlled baseline refresh | this data-only follow-up commit | Independent specification and code-quality reviews approved the Phase 2 implementation and its isolated telemetry movement. The strict no-update `npm.cmd run test:baselines` gate then exited 0 with all scenarios matching the refreshed manifest. | Only `apr1992_52w/final_save.json` was re-blessed to `ef30222cd8b6eb99ad3d3e3b5688b414dc0d82e0a07a7a20465e43296351a141` and its dependent `run_summary.json` to `3f91bd76383ae9538e8556ccdb5e7116a3f29dfe42a0d20d95bb432a368bee14`. Every other manifest entry is unchanged. | The approval rests on the recorded 6/8 artifact match and normalization proof: four optional anchor terminal-turn values fully explain the final-save movement, and the run-summary movement is only its reported final-state hash. No source, test, scenario, canon/FORAWWV, package, push, merge, tag, or release-state change. |
| 2026-07-31 | 3 | this phase commit | RED: the first six-file slice collected 91 tests with 12 expected failures. Independent review correction RED: 2 files / 35 tests with 3 expected failures for sibling atomic drain/permutation and exact-live legacy receipt normalization. GREEN after correction/simplify: correction slice 35/35; plan's exact Phase 3 pack 8 files / 116 tests; supplemental lifecycle/schema pack 8 files / 126 tests; broader migration/schema/UI proof 4 files / 220 tests; `npm.cmd run typecheck`, `npm.cmd run test:baselines`, strict 188w engine health, and `git diff --check` passed. Baselines matched without update or re-bless. | Fresh 40w run `runs/apr1992_definitive_40w__1aa96054bcc8af09__w40_n3` ended at state/SHA-256 `f72a459e7548d70b` / `f72a459e7548d70b4e823c35dd8f1c4b3d61bd21441ed5d40f68e545017a9746`; audit: 0 live TGs, 4 cumulative formations, 0 Army-HQ receipts, 0 legacy OGs. Paired 188w runs `...__w188_n4` and `...__w188_n5` both ended at state hash `af83cbc6ca8d12d1`; all eight common artifacts were byte-identical, including final-save SHA-256 `af83cbc6ca8d12d1c9755b3bd30fdf06c78eca06d459582554e15dcac7607270`. Audit: 12 formations, two live Sana siblings at age 11/cohesion 56, one completed Farz-95 receipt with `recovery_started_turn=167` and no stale link, 20 live plus 4 archived participation rows, and no legacy OGs or duplicate promotions. | `CorpsOperation` remains sole clock/recovery owner. One sorted evaluator at the two execution chokepoints drains all eligible engaged siblings atomically by 4 once per unsuppressed future War turn, checks preloaded strict `<15` before age, and enforces age 12 before another drain using typed recovery reasons. Army-HQ cap cost covers planning/executing and `[R,R+4)`, including completed receipts and COHA calendar time; an exact live recovery normalizes legacy planning/executing receipts and supplies the marker, while stale/orphan receipts gain no invented tail. Optional fields round-trip under schema 36. The generated latest-save pointer and three health dashboards were restored to HEAD and excluded. No baseline, scenario, canon/FORAWWV, package, push, merge, tag, or release-state change. |
| 2026-07-31 | 4 | this phase commit | RED: 3 files / 22 tests produced 8 expected failures for live producer enqueue, stale-order activation mutation, incomplete legacy index cleanup, ordinal+20 fallback, unmapped threshold promotions, occupied number/name collisions, and the old audit shape. GREEN before simplify: new pack 22/22; exact Phase 4 plus audit pack 6 files / 68 tests; expanded characterization 22 files / 216 tests. After simplify and the old-record load characterization, final exact proof passed 6 files / 69 tests, expanded characterization passed 22 files / 217 tests, and typecheck passed. Strict baselines matched without refresh. | Fresh 40w `runs/apr1992_definitive_40w__1aa96054bcc8af09__w40_n6` remained `f72a459e7548d70b`. Fresh 188w `...__w188_n7` and `...__w188_n8` both ended `e400d232ba5da37e`; 14/15 artifacts matched byte-for-byte, with only `run_meta.json.out_dir` differing by the expected `n7`/`n8` suffix. Against Phase 3 n4, 12/15 artifacts were identical; the final-save delta is exactly removal of the unsupported `arbih_5th_corps` ordinal-1 fallback promotion (`21. Division`, turn 178), plus its dependent summary hash and run-directory metadata. Strict health stayed green and unchanged: 0 eligible/dead operations, 2 ghost-destroyed, 9 stranded brigades, 628 matched OSIDs, 0 consistency failures, K:W 3.779. | TG-enabled production now preserves an empty serialized `og_orders` shape and enqueues nothing; activation defensively discards persisted queues without formation/personnel/corps mutation. Already-active legacy OGs retain a sorted, bounded compatibility drain with personnel conservation and stale/duplicate `active_ogs` reconciliation. Promotion has no fallback: only `arbih_2nd_corps:1 → 21` and `:5 → 25` remain, sourced to *Balkan Battlegrounds* II p. 401, I p. 509, and local OOB lines 90/98; ordinal 5 remains unreachable. Existing records are loaded unchanged and the audit reports unmapped/mismatch/number/name collisions plus same-corps overlap candidates by record identity. The generated latest-save pointer was restored; no migration, schema, baseline, canon/FORAWWV, package, push, merge, tag, or release-state change. |
| 2026-07-31 | 5 | this phase commit | RED: the new doctrine contract collected 14 tests with 13 expected failures across missing spatial/eligibility/contributor anchors and the absent retired-history boundary; the production identifier scan already passed. GREEN: the expanded standing-OG/combat pack passed 6 files / 165 tests; `npm.cmd run typecheck`, `npm.cmd run canon:check`, standalone strict no-refresh `npm.cmd run test:baselines`, and `git diff --check` passed. | All approved baseline scenarios matched without update or re-bless. No new scenario/hash evidence was required because the phase changes governing wording, one production comment, and contract tests only; runtime, schema, scenarios, manifests, and `FORAWWV.md` are unchanged. | ADR-0006, ADR-0007, Systems Manual §6.3/§6.7, and Rulebook §5.7/§6.3 now separate standing-OG spatial membership, bounded Phase-B movement eligibility, actual resolver contribution, and primary-defender aftermath. Retired Phase-C identifiers/claims exist only below ADR-0007's explicit historical-record heading and remain absent from production. |

---

## 11. Copy-Ready Execution Prompt

```text
Role and objective: You are the implementation agent for the Operational/Tactical Group lifecycle and convergence closeout. Execute docs/plans/2026-07-31-operational-tactical-group-closeout-implementation-plan.md one phase at a time, starting with Phase 0 and continuing through Phase 6. Phase 3 uses the locked 12/4/15/4 constants; Phase 5 encodes the decided narrower Standing-OG model without changing combat behavior.

Canon references: Read .claude/napkin.md, docs/00_start_here/docs_index.md, docs/10_canon/context.md, Engine_Invariants_v0_9_0.md §§6.3/11/14.7, Systems_Manual_v0_9_0.md operational/standing-OG sections, Rulebook_v0_9_0.md operational/standing-OG sections, ADR-0005, ADR-0006, ADR-0007, PYRRHIC_PLANNING_RULES.md, PLAN_EXECUTION_STANDARD.md, COMMAND_BOARD.md, MASTER_ROADMAP.md, and the full plan before editing.

Determinism and ledger constraints: Use CorpsOperation as the only lifecycle clock. No timestamps, randomness, environment-dependent logic, or unordered iteration. Sort all persisted/diagnostic ids with strictCompare. Do not add save fields without old-shape/default/validator/round-trip tests. Preserve exact personnel/equipment conservation. Append PROJECT_LEDGER.md for behavior/output/roadmap changes and PROJECT_LEDGER_KNOWLEDGE.md only for reusable lessons. Do not edit FORAWWV.md.

Automatic dispositions: use the locked Phase 3 constants; align Standing-OG wording to the master-roadmap decision; omit an unmapped promotion identity; implement and test a required migration without inventing values; sequence/rebase a branch collision; investigate and revert unexplained scenario/hash drift; do not refresh a baseline merely to pass; and route UI, scenario, OOB, or sensitive-history findings to R4/R6/R7. Packaging, versioning, tagging, signing, upload, and release remain outside R3.

Output and validation: Work in an isolated codex/op-tg-closeout worktree and one phase per local commit. Run /simplify before each phase commit. In every handoff include changed files, phase completed, tests with exact pass/fail counts, scenario hashes/output paths when required, drift explanation, docs/ledger updates, acceptance-barrier status, and the next unfinished phase. Never claim complete without fresh typecheck, tests, diff check, and required scenario evidence.
```
