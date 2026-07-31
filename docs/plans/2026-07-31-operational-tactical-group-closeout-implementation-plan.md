# Operational/Tactical Group Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-07-31
**Status:** READY — execute Phase 0, then Phases 1–2; later behavior/canon gates are explicit
**Overseer:** Orchestrator
**Owner lane:** Systems Programmer + Gameplay Programmer
**Independent reviewers:** QA Engineer, Determinism Auditor, Historian/Pyrrhic panel only where named
**Related command-board row:** `Operational/Tactical Group lifecycle and convergence closeout`
**Phase/workstream covered:** ADR-0005 temporary offensive Tactical Groups, Army-HQ operation lifecycle, legacy `kind: 'og'` convergence, ADR-0006/0007 standing-OG truth
**Current next action:** Create an isolated `codex/op-tg-closeout` worktree and execute Phase 0
**Collision rule:** Do not edit or clean the owner's current dirty workspace. Stop if another active branch owns any Phase 1–4 source file.

**Goal:** Close the lifecycle, telemetry, and duplicate-path gaps in the operational/tactical-group system while preserving the already-live donor selection, combat synthesis, casualty distribution, cooldown, recovery-suppression, and promotion substrate.

**Architecture:** `CorpsOperation` remains the sole offensive-operation clock. A live `TacticalGroup` mirrors that operation's active phase, Army-HQ operation records follow the same transition chokepoints, and dissolution finalizes per-brigade telemetry before removing the live TG. The older formation-based `kind: 'og'` path becomes compatibility-only once a clean-run proof shows the Tactical Group path owns new offensive task organization. Corps sectors remain the standing-OG spatial entity. Shared Standing-OG combat aftermath is not implemented until the accepted canon language and the retirement of ADR-0007 Phase C are reconciled.

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
6. **No automatic canon rewrite.** Do not edit `docs/10_canon/FORAWWV.md`. Standing-OG doctrine conflict goes to the explicit Phase 5 decision packet.
7. **No baseline refresh by default.** Any scenario/hash drift must be explained and approved. Never run an update/re-bless command merely to make a gate green.
8. **No release mutation.** This maintenance packet does not authorize packaging, a version bump, tag, push, PR, or release-state change. If project process requires a version/tag for closure, stop and obtain explicit owner authorization.

---

## 3. Purpose and Non-Goals

### In scope

- Deterministic TG and Army-HQ lifecycle status transitions.
- Stale Army-HQ cap/tg-reference repair for live and loaded state.
- Dissolution telemetry on live and archived brigade participation records.
- A deterministic audit tool for current/future saves.
- Canonical TG cohesion/max-lifecycle enforcement, but only after its behavior gate.
- Retirement of new legacy-OG production while retaining bounded old-save cleanup.
- Prevention of new unmapped/duplicate promotion identities.
- A decision-ready Standing-OG doctrine reconciliation packet.
- Focused, migration, full-suite, baseline, and 40/188-week proof.

### Non-goals

- No changes to donor power, casualty percentages, BFS range, caps, recovery suppression, or historical operation targets.
- No cross-faction HVO↔RBiH donations.
- No new offensive operation, Army-HQ operation, scenario event, OOB unit, map geometry, GUI surface, or presidential lever.
- No resurrection of retired ADR-0007 Phase C code.
- No automatic correction of historically ambiguous existing promotion records.
- No calibration tuning to recover territory counts.
- No baseline-manifest, startup-snapshot, package-version, installer, tag, or release edit without separate approval.

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

### 4.3 Initial characterization gate

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- tests/tg_casualty_distribution.test.ts tests/tg_determinism.test.ts tests/tg_donation_readiness_fallback.test.ts tests/tg_effective_personnel.test.ts tests/tg_fidelity.test.ts tests/tg_identity_commander.test.ts tests/tg_inv6_zombie_hold.test.ts tests/tg_invariants.test.ts tests/tg_lifecycle.test.ts tests/tg_migration_recon.test.ts tests/tg_og_promotion.test.ts tests/tg_pre_planned_reservation.test.ts tests/tg_recovery_suppression.test.ts tests/tg_routing.test.ts tests/tg_schema_freeze.test.ts tests/tg_telemetry.test.ts tests/operation_aar_army_hq_telemetry.test.ts tests/standing_og_defense.test.ts tests/corps_command.test.ts tests/triggered_operations.test.ts --pool=forks --reporter=dot
```

If this gate fails for a reason unrelated to the lane, stop and report the exact failure; do not repair unrelated owner work.

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

- [ ] Add a synthetic-state test that requires stable, sorted output for:
  - TG count/status/age/cohesion;
  - Army-HQ count/status and stale `tg_id`;
  - planning/executing records with no matching live CorpsOperation;
  - live and archived participation counts;
  - legacy active `kind: 'og'` formations and queued `og_orders`;
  - duplicate promotion display names.
- [ ] Run the test before implementation and record the expected missing-module failure.
- [ ] Implement a read-only analyzer plus CLI. It must accept a save path argument, emit JSON to stdout, use no timestamp, and sort all ids with `strictCompare`.
- [ ] Run the tool against the turn-188 save named in §1.3 and record the observed counts in the Execution Log.
- [ ] Do not write into `runs/`.

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

- [ ] Add/retain tests proving `none` policy produces no TG.
- [ ] Add/retain tests proving a `full`/`limited` operation with zero eligible donors proceeds without an empty TG.
- [ ] Replace “every offensive forms a TG” comments with “every donor-eligible offensive attempts TG formation; zero-donor fallback remains an ordinary operation.”
- [ ] Do not change runtime behavior in this task.

### Task 1.2 — Make `forming → engaged` observable

**Files:**

- Create `tests/tg_op_lifecycle.test.ts`
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`

- [ ] Write failing tests for both planning-to-execution transition sites.
- [ ] Add one lifecycle helper that finds TGs for an operation in sorted id order, sets live status to `engaged`, and refreshes `location_osid` from the anchor.
- [ ] Call the helper immediately after TG formation at both operation transition sites.
- [ ] Keep formation idempotent and keep zero-donor fallback untouched.

### Task 1.3 — Synchronize Army-HQ status and clear stale cap reducers

**Files:**

- Create `tests/army_hq_op_lifecycle.test.ts`
- Modify `src/state/game_state.ts` only if optional lifecycle turn fields are required
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`
- Modify `src/sim/combat/triggered_operations.ts`
- Modify `src/state/save_migration.ts` only if load-time normalization is needed
- Modify `tests/save_migration.test.ts` and/or `tests/save_migration_versioned_steps.test.ts` if migration code changes

- [ ] Write failing tests for `planning → executing → recovering → completed`.
- [ ] At TG/operation execution, set the associated Army-HQ record to `executing`.
- [ ] At operation recovery entry, set it to `recovering`, finalize/dissolve the TG, and clear `tg_id`.
- [ ] At CorpsOperation removal after recovery, set the durable Army-HQ record to `completed`.
- [ ] Add a deterministic reconciliation helper for loaded state: if a planning/executing Army-HQ record has no matching live CorpsOperation and no live TG, mark it completed and clear `tg_id`.
- [ ] Ensure the concurrency-cap helper counts only genuinely active planning/executing records.
- [ ] Do not implement the ADR's four-turn post-recovery cap tail in this task unless the optional recovery-turn field and migration/default tests are approved under Phase 3's behavior gate.

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

- [ ] Add optional `dissolved_turn`, `personnel_returned`, and `casualties` fields to `TgParticipationRecord`.
- [ ] Keep them omit-empty compatible.
- [ ] Define exact semantics:
  - donor `casualties = contribution.casualties_so_far`;
  - donor `personnel_returned = max(0, personnel_lent - casualties)`;
  - anchor gets `dissolved_turn`; do not invent anchor casualties or returned personnel.
- [ ] Confirm whether this additive optional shape can remain on the current schema. If validation or migration cannot safely accept both shapes, stop and require a schema-step decision.

### Task 2.2 — Finalize both live and archived records before deletion

**Files:**

- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `tests/tg_telemetry.test.ts`
- Modify `tests/tg_lifecycle.test.ts`
- Modify `tests/tg_casualty_distribution.test.ts`

- [ ] Write a failing test in which donor casualties accrue before dissolution.
- [ ] In `dissolveTacticalGroup`, mark the TG terminal in memory, then update matching participation rows by `tg_id` in both `tg_participations` and `archived_tg_participations`.
- [ ] Iterate brigade ids and history lists deterministically.
- [ ] Finalize telemetry before clearing loans and deleting the live TG.
- [ ] Prove idempotency: a second dissolve call changes nothing.
- [ ] Prove personnel conservation and `casualties <= personnel_lent`.

### Task 2.3 — Preserve AAR telemetry and save compatibility

**Files:**

- Modify tests only unless a defect is exposed:
  - `tests/operation_aar_army_hq_telemetry.test.ts`
  - `tests/tg_migration_recon.test.ts`
  - `tests/save_migration_round_trip_contract.test.ts`

- [ ] Prove Army-HQ AAR snapshots remain available after TG deletion.
- [ ] Prove an old record without terminal fields loads and round-trips.
- [ ] Prove a completed record with terminal fields round-trips without zero invention.

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
**Status:** BEHAVIOR-GATED — do not begin without owner/Pyrrhic confirmation of the locked constants below
**Estimated scope:** 3–5 source files, focused tests, 40/188-week scenario proof

### Decision gate 3.0

Recommended constants, based on already-accepted ADR/legacy implementation:

- `TG_MAX_LIFECYCLE_TURNS = 12` from ADR-0005.
- `TG_COHESION_DRAIN_PER_ENGAGED_TURN = 4`, reusing the existing formation-based OG drain.
- `TG_DISSOLVE_COHESION = 15`, already canonical.
- `ARMY_HQ_TG_CAP_RECOVERY_TURNS = 4` from ADR-0005.

If any constant is rejected or canon is interpreted differently, stop and amend this plan before code.

### Task 3.1 — Write exhaustion tests first

**Files:**

- Modify `src/sim/combat/tactical_group_config.ts`
- Modify `tests/tg_op_lifecycle.test.ts`
- Modify `tests/tg_invariants.test.ts`

- [ ] Test no drain while `forming`.
- [ ] Test one drain per engaged war turn.
- [ ] Test dissolution below cohesion 15.
- [ ] Test dissolution at age 12.
- [ ] Test no duplicate drain when unrelated helpers run.
- [ ] Test an exhaustion-triggered TG termination transitions the owning CorpsOperation into recovery rather than letting an unbacked Army-HQ shell continue.

### Task 3.2 — Implement at the operation lifecycle chokepoint

**Files:**

- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/sim/combat/sector_offensive.ts`

- [ ] Advance TG cohesion exactly once inside the operation lifecycle pass.
- [ ] Return a typed deterministic termination reason to the CorpsOperation owner.
- [ ] Route cohesion/age termination through the same `beginRecovery`/telemetry/dissolution path as ordinary completion.
- [ ] Do not create a second war-phase scheduler.

### Task 3.3 — Implement the four-turn Army-HQ cap tail

**Files:**

- Modify `src/state/game_state.ts`
- Modify `src/sim/combat/tactical_group_lifecycle.ts`
- Modify `src/state/save_migration.ts` if required
- Modify `tests/army_hq_op_lifecycle.test.ts`
- Modify save migration/validation tests

- [ ] Add optional recovery/completion turn metadata only if required.
- [ ] Count the cap reduction for planning/executing and the first four turns after recovery begins.
- [ ] Ensure legacy stale planning records without a live operation become completed, not a fresh four-turn penalty.
- [ ] Pin old-save defaults and round-trip behavior.

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

**Stop gate:** Any unexplained control/hash drift, anchor regression, Section 6 sensitivity change, cross-faction donation, personnel conservation failure, or non-identical repeated 188-week output. Do not refresh a baseline.

→ `/simplify` → independent game-design/QA/determinism review → verify → commit `feat(tg): enforce canonical exhaustion lifecycle`

---

## Phase 4 — Retire duplicate legacy production and guard promotion identity

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

- [ ] Test that a TG-enabled execution operation cannot enqueue a new legacy `OGActivationOrder`.
- [ ] Test that old queued `og_orders` are handled deterministically and cannot create a second concurrent force overlay for the same operation.
- [ ] Test that an already-active legacy `kind: 'og'` can finish its old compatibility lifecycle without disappearing personnel.

### Task 4.2 — Make legacy OG compatibility-only

**Files:**

- Modify `src/sim/combat/bot_corps_operations.ts`
- Modify `src/sim/combat/operational_groups.ts`
- Modify `src/sim/turn_phases/war_phases.ts`
- Modify `tests/operational_group_convergence.test.ts`

- [ ] When Tactical Groups are enabled, stop producing new `og_orders`.
- [ ] Prevent stale queued orders from activating a new legacy formation on the live path.
- [ ] Retain `updateOGLifecycle` only as a bounded old-save drain for already-active `kind: 'og'` formations.
- [ ] Mark the module and phase step compatibility-only in comments.
- [ ] Do not delete old-save cleanup until a schema-retirement packet proves no supported save requires it.

### Task 4.3 — Prevent new duplicate/unmapped Division identities

**Files:**

- Modify `src/sim/combat/tactical_group_promotion.ts`
- Modify `tests/tg_og_promotion.test.ts`
- Modify the audit tool/test from Phase 0

- [ ] Write a failing test where two unmapped RBiH corps cross the threshold and would both become `21. Division`.
- [ ] Require an explicit historical `(corps_id, og_ordinal) → division_number` mapping before creating a new promotion.
- [ ] Do not auto-rewrite existing save records.
- [ ] Make the audit flag duplicate/unmapped existing records for historian review.
- [ ] If the Historian supplies verified mappings, add them in a separately reviewed data-only commit; otherwise leave those promotions uncreated.

**Verification:**

```powershell
npm.cmd run test:vitest -- tests/operational_group_convergence.test.ts tests/tg_og_promotion.test.ts tests/tg_lifecycle.test.ts tests/tg_invariants.test.ts tests/corps_command.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
```

If Task 4.2 changes scenario output, rerun the Phase 3 40/188-week deterministic proof. No baseline refresh without approval.

**Gate:** A fresh TG-enabled campaign creates no legacy `kind: 'og'`; supported old state is cleaned without force inflation or personnel loss; new promotion names require explicit mappings and cannot duplicate.

→ `/simplify` → independent QA/historian review → verify → commit `refactor(tg): converge legacy operational group paths`

---

## Phase 5 — Standing-OG doctrine reconciliation

**Assigned to:** Architect + Game Designer + Historian/Pyrrhic panel
**Status:** GOVERNANCE-GATED / DOCS FIRST
**Estimated scope:** one decision packet; no combat code

### Task 5.1 — Produce the decision packet

**Files:**

- Create `docs/40_reports/proposals/20260731_STANDING_OG_DOCTRINE_RECONCILIATION.md`
- Do not edit canon in this task

- [ ] Quote/paraphrase the exact current ownership split:
  - ADR-0006: sectors are standing OGs;
  - live Phase B: one eligible reserve/rear brigade may commit to the hottest threatened subsegment;
  - current combat: sector-assigned/physical defenders contribute and share casualties, while full downstream aftermath remains primarily on the primary defender;
  - ADR-0007 Phase C: retired/deleted;
  - canon: says the standing OG shares defensive fatigue and casualties.
- [ ] Present three bounded options:
  1. **Recommended:** design a new contribution-receipt-based shared aftermath slice for brigades that actually contributed; do not resurrect Phase C's widened roster/predictor split.
  2. Amend canon to describe the narrower live Phase B/primary-aftermath model.
  3. Reopen broader shared defense only as a new ADR with Guardrail-1 and calibration proof.
- [ ] Include affected files, expected war-cost risks, focused tests, 40/188-week gates, and the exact owner decision required.

### Task 5.2 — Stop for verdict

No changes to:

- `src/sim/combat/standing_og_defense.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `src/sim/combat/brigade_front_distribution.ts`
- `docs/10_canon/*`

until the Pyrrhic panel/owner chooses an option. A later implementation must be a separate plan amendment because it changes combat outcomes.

**Gate:** Signed option and explicit authorization to edit the named canon/runtime files.

→ `/simplify` → docs verification → commit `docs(og): file standing doctrine decision packet`

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
- Standing-OG verdict or explicit remaining gate;
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

**Completion gate:** Phases 0–4 are green or explicitly waived with written owner rationale; Phase 5 has either a signed verdict or remains clearly governance-gated. D3 may not treat Operational/Tactical Groups as fully closed before this gate.

→ `/simplify` → Process QA → final verification → commit `docs(tg): close operational group remediation lane`

---

## 6. Determinism and Save-Schema Gates

- [ ] No randomness, timestamps, environment-dependent branching, or filesystem-order dependence.
- [ ] Sort all TG, Army-HQ, corps, formation, participation, and diagnostic ids with `strictCompare`.
- [ ] Lifecycle advances exactly once from the canonical operation pass.
- [ ] Any persisted field is optional/omit-empty unless a versioned migration is approved.
- [ ] Old-shape saves, current-shape saves, and round trips have explicit tests.
- [ ] TG donor personnel/equipment conservation remains exact.
- [ ] Repeated 188-week runs are byte-identical after behavior-changing work.
- [ ] No manifest refresh without explicit owner approval and a written drift explanation.

---

## 7. Historical, Canon, and Player-Truth Gates

- [ ] No cross-faction donation.
- [ ] No new historical operation or unsupported Division identity.
- [ ] Promotion requires an explicit historical mapping; ambiguous existing records are reported, not invented away.
- [ ] Standing-OG combat behavior does not change before a signed doctrine verdict.
- [ ] Section 6 sensitive-history control receipts remain event-owned and unchanged.
- [ ] No GUI work is required for Phases 0–4; if a new player-facing field is proposed, stop and create a UI/read-model amendment.

---

## 8. Protocol Enforcement

- [ ] Orchestrator oversees all phases.
- [ ] Architect decisions are flagged for owner review.
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
- [ ] Standing-OG doctrine conflict has a signed decision or an explicit release gate.
- [ ] TypeScript, focused/full tests, baselines, determinism, and required scenario proof are green.

---

## 10. Execution Log

| Date | Phase | Commit | Verification | Scenario/hash evidence | Notes |
|---|---|---|---|---|---|
| 2026-07-31 | Planning | uncommitted | Existing focused TG/Standing/Army-HQ pack: 20 files / 195 tests passed during audit | Existing turn-188 save characterized; no new run | Plan authored; runtime untouched |

---

## 11. Copy-Ready Execution Prompt

```text
Role and objective: You are the implementation agent for the Operational/Tactical Group lifecycle and convergence closeout. Execute docs/plans/2026-07-31-operational-tactical-group-closeout-implementation-plan.md one phase at a time, starting with Phase 0. Phases 0–2 are executable. Stop at Phase 3 until its constants are explicitly confirmed, and stop at Phase 5 until the Standing-OG doctrine verdict is signed.

Canon references: Read .claude/napkin.md, docs/00_start_here/docs_index.md, docs/10_canon/context.md, Engine_Invariants_v0_9_0.md §§6.3/11/14.7, Systems_Manual_v0_9_0.md operational/standing-OG sections, Rulebook_v0_9_0.md operational/standing-OG sections, ADR-0005, ADR-0006, ADR-0007, PYRRHIC_PLANNING_RULES.md, PLAN_EXECUTION_STANDARD.md, COMMAND_BOARD.md, MASTER_ROADMAP.md, and the full plan before editing.

Determinism and ledger constraints: Use CorpsOperation as the only lifecycle clock. No timestamps, randomness, environment-dependent logic, or unordered iteration. Sort all persisted/diagnostic ids with strictCompare. Do not add save fields without old-shape/default/validator/round-trip tests. Preserve exact personnel/equipment conservation. Append PROJECT_LEDGER.md for behavior/output/roadmap changes and PROJECT_LEDGER_KNOWLEDGE.md only for reusable lessons. Do not edit FORAWWV.md.

STOP AND ASK triggers: a Phase 3 constant is not explicitly approved; canon conflicts or is silent on a required choice; Standing-OG combat/canon work is reached without a signed verdict; an unmapped promotion needs historical identity; save schema needs a version bump; branch/file collision exists; unexplained scenario/hash drift appears; a baseline refresh seems necessary; scope expands into UI, scenario data, OOB, sensitive history, packaging, versioning, tagging, or release.

Output and validation: Work in an isolated codex/op-tg-closeout worktree and one phase per commit. Run /simplify before each phase commit. In every handoff include changed files, phase completed, tests with exact pass/fail counts, scenario hashes/output paths when required, drift explanation, docs/ledger updates, stop-gate status, and the next unfinished phase. Never claim complete without fresh typecheck, tests, diff check, and required scenario evidence.
```
