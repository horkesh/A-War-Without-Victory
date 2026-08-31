# Foča Takeover Operation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the five Foča OSID start overrides from the active April 1992 scenario family and make ordinary combat in Operation Foca produce the historically required RS takeover.

**Architecture:** Preserve census-derived turn-zero control. Extend the existing VRS Herzegovina Corps operation, which already follows Operation Visegrad, with two reachable Foča takeover axes: the local Foča brigade clears the northern valley and the Bileća brigade stages from Izgori for the southern municipal mop-up. Control changes remain battle-owned through `CorpsOperation`; no event receipt, direct controller write, must-hold rule, or engine exception is added.

**Tech Stack:** TypeScript, JSON scenario assets, Vitest, deterministic scenario runner.

---

## Historical and canon contract

- BB1 p.187 states that Serb forces captured Foča in April 1992 and then mopped up the rest of the municipality.
- Turn-zero census control remains authoritative under `CLAUDE.md`: initial OSIDs are never overridden for calibration.
- Brigades never attack independently; all five captures must be attributable to Operation Foca.
- The Goražde enclave guard is unchanged. The operation may retain its existing approach objectives, but this change adds no objective inside the protected Goražde core.

## Task 1: Pin the desired data and catalog contract

**Files:**
- Modify: `tests/scenario_guardrails.test.ts`
- Modify: `tests/pre_planned_operations.test.ts`

1. Add a guardrail asserting that every active `apr1992_definitive_*` scenario has no Foča entry in `osid_control_overrides`.
2. Add a catalog test asserting that Operation Foca contains the five former overrides on two geographically reachable axes, with each authored participant at its correct staging point.
3. Run the two focused test files and verify both new assertions fail for the intended reasons.

## Task 2: Remove active April-family overrides

**Files:**
- Modify: `data/scenarios/apr1992_definitive_40w.json`
- Modify: `data/scenarios/apr1992_definitive_40w_emergent.json`
- Modify: `data/scenarios/apr1992_definitive_52w.json`
- Modify: `data/scenarios/apr1992_definitive_104w.json`
- Modify: `data/scenarios/apr1992_definitive_188w.json`
- Modify: `data/scenarios/apr1992_definitive_188w_dayton_close.json`

Delete only `op:foca:izbisno`, `op:foca:kosman`, `op:foca:miljevina_2`, `op:foca:tjentiste_2`, and `op:foca:ustikolina`. Do not edit painted control, municipality control, backup evidence scenarios, or later-date scenarios.

## Task 3: Correct and extend Operation Foca minimally

**Files:**
- Modify: `src/sim/combat/pre_planned_operations.ts`

Keep `rs_foa_brigade` on the Foča-town axis and preserve the existing `patkovina → prevrac → kolovarice` approach, adding Ustikolina as a battle objective. Move `rs_bilea_brigade` to a separate southern axis staged at RS-held `op:gacko:izgori`, which it can reach within the six-turn assembly budget, then attack Tjentište, Miljevina, Izbišno, and Kosman. Update stale comments that incorrectly claim every Foča OSID starts RS.

Run the two focused tests again and require green.

## Task 4: Verify mechanism before campaign adoption

1. Run typecheck and the focused operation/scenario suites.
2. Run a bounded replay of the canonical 188-week scenario through the January checkpoint.
3. Confirm from `operation_aars.json` and `weekly_report.jsonl` that each changed OSID is captured by Operation Foca, not by a direct write or independent brigade attack.
4. Compare January score and check the 9/9 enclave guard.
5. Because this moves territory, request owner authorization before the final 188-week adoption run. A short-horizon result is development evidence only.

## Task 5: Adopt and document

After a clean authorized 188-week run, compare against baseline `n388` using killed, wounded, operations, attacks, dead/inert-operation advisories, checkpoints, and guard results. Update calibration authority, real-war reporting if outputs move, and the project ledger. Reconcile the baseline manifest and health floors only after the owner accepts the measured engine/scenario truth.

## Bounded implementation evidence — 2026-08-31

The first single-axis design was falsified by the bounded `n0` run: the engine correctly excluded
`rs_bilea_brigade` because no RS-controlled route connected its Bileća start to the authored
`op:foca:foca_3` staging area within the planning budget. That was an operation-catalog defect, not
an engine defect. All five former overrides consequently remained RBiH.

The two-axis correction is proven in the canonical 188-week scenario with a 40-week development
override at
`F:\A-War-Without-Victory\runs\codex_foca_takeover_dev\apr1992_definitive_188w__7c3a0f299a8c80e9__w40_n1`.
The run used Node 22.23.2 and carries an explicit dirty-development provenance override, so it cannot
license adoption or a Section 6 verdict. All five cells are RBiH in `initial_save.json` and RS in
`final_save.json`. Operation Foca's axis summaries record Ustikolina under `foca_valley` and
Tjentište, Miljevina, and Izbišno under `foca_south`; its weekly log records the final Kosman
objective changing to RS on turn 12 without a battle that turn after the southern captures isolated
it. The operation made 14 attacks, ended at turn 17 as a four-star partial victory, and the January
checkpoint is 694/712.
Focused verification passes 67/67 tests across five files plus typecheck. A clean authorized
188-week run remains mandatory before adoption, documentation as canonical behavior, or baseline
reconciliation.
