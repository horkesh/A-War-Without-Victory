# v0.9 Formation-Life Believability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn brigade drift, far-from-home live ownership, active-never-fights formations, and HRHB/HVO offensive emergence from recurring warnings into owned, explainable, or fixed simulation behavior.

**Architecture:** This lane is bounded around formation lifecycle and commander assignment truth. It must not hide warnings merely to improve reports; each warning family is either fixed at the canonical owner, accepted as scenario variance with evidence, or promoted into a specific mechanics/design decision.

**Tech Stack:** TypeScript simulation engine, scenario runner artifacts, `diagnose_run.cjs`, `validate_run_consistency.cjs`, commander decision traces, formation state, corps sector ownership.

---

## Source Plans And Evidence

- `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`
- `docs/plans/2026-04-14-roadmap-execution-packet-backlog.md`
- `docs/40_reports/20260324_SARAJEVO_SIEGE_FULL_INVESTIGATION.md`
- `docs/40_reports/implemented/20260409_STRICT_CROSS_CORPS_FIELD_BRIGADE_OWNERSHIP_HARDENING.md`
- `docs/40_reports/OPTION_K_DIAGNOSTIC_FINDINGS.md`
- `tools/diagnose_run.cjs`
- `tools/validate_run_consistency.cjs`

## Task 1: Classify Warning Families From Fresh Runs

**Files:**
- Reference: `runs/*/run_summary.json`
- Reference: `runs/*/final_save.json`
- Reference: `tools/diagnose_run.cjs`
- Reference: `tools/validate_run_consistency.cjs`
- Create: `docs/40_reports/implemented/YYYYMMDD_FORMATION_LIFE_WARNING_CLASSIFICATION.md`

**Steps:**
1. Run `node tools/diagnose_run.cjs <run_dir>`.
2. Run `node tools/validate_run_consistency.cjs <run_dir>`.
3. Extract warning families: drift, far-from-home live owner, active-never-fights, corps-out-of-area, density imbalance, HRHB/HVO silence.
4. Classify each as `owner bug`, `commander doctrine issue`, `scenario content issue`, `accepted variance`, or `detector wording issue`.
5. Verification: report lists counts and representative formations for each family.

## Task 2: Identify Canonical Owners

**Files:**
- Reference: `src/state/formation_lifecycle.ts`
- Reference: `src/sim/combat/final_sector_truth_reconciliation.ts`
- Reference: `src/sim/combat/corps_front_sectors.ts`
- Reference: `src/sim/combat/commander/plan.ts`
- Reference: `src/sim/combat/commander/force_eval.ts`
- Reference: `src/sim/combat/commander/allocate.ts`
- Reference: `src/sim/combat/bot_corps_stance.ts`

**Steps:**
1. For each warning family, name the only allowed mutation owner.
2. Confirm whether that owner currently has enough state to solve the issue deterministically.
3. If not, name the minimum state extension or design decision needed.
4. Verification: no proposed fix crosses into report/anomaly code unless the issue is detector wording only.

## Task 3: HRHB/HVO Offensive Emergence Packet

**Files:**
- Reference: `docs/40_reports/OPTION_K_DIAGNOSTIC_FINDINGS.md`
- Reference: `src/sim/combat/commander/force_eval.ts`
- Reference: `src/sim/combat/bot_corps_stance.ts`
- Reference: `src/sim/combat/commander/plan.ts`
- Reference: `data/source/oob_brigades.json`
- Test: `tests/*commander*`

**Steps:**
1. Reproduce the latest HRHB/HVO trace from 188w/200w output.
2. Inspect `state.military.corps_command[corpsId].commander_state.decision_trace`.
3. Determine whether the binding gate is force tier, stance rule, target seeding, war-state gating, or launch execution.
4. Write a bounded implementation packet for exactly that gate.
5. Verification: post-fix long run shows HRHB/HVO behavior changed for the intended reason, not by suppressing diagnostics.

## Task 4: Drift / Far-From-Home Lifecycle Packet

**Files:**
- Reference: `src/state/formation_lifecycle.ts`
- Reference: `src/sim/combat/corps_front_sectors.ts`
- Reference: `src/sim/combat/commander_march_correction.ts`
- Reference: `src/sim/combat/apply_brigade_reposition.ts`
- Reference: `src/sim/combat/return_displaced_brigades.ts`
- Test: `tests/*sector*`
- Test: `tests/*formation*`

**Steps:**
1. Pick the top 5 recurring far-from-home formations from fresh run artifacts.
2. For each, trace home, current location, assignment, operation/loan state, and last movement order.
3. Decide whether each should stay, return, be loaned, dissolve, or be reclassified as historical redeployment.
4. Write the narrowest implementation packet for the common owner path.
5. Verification: fresh run reduces the targeted warning family without reintroducing unresolved sector brigades or false owners.

## Task 5: Active-Never-Fights Interpretation Packet

**Files:**
- Reference: `tools/diagnose_run.cjs`
- Reference: `tools/validate_run_consistency.cjs`
- Reference: `runs/*/run_summary.json`
- Reference: `src/sim/combat/attack_resolution_osid.ts`
- Reference: `src/sim/combat/sector_offensive.ts`

**Steps:**
1. Separate cold-front, rear reserve, garrison, and live-front active-never-fights cases.
2. Confirm which cases are real product concerns versus expected quiet sectors.
3. If real, trace whether they are caused by target scoring, stance, front assignment, or lack of enemy pressure.
4. Update detector wording only after owner behavior is understood.
5. Verification: report no longer treats quiet-but-valid formations as equivalent to live-front inert formations.

## Done Means

- Every warning family has an owner classification.
- At least one bounded implementation packet exists for the dominant live problem.
- No diagnostic is weakened before its owner behavior is understood.
- Long-run evidence is required for HRHB/HVO conclusions.
