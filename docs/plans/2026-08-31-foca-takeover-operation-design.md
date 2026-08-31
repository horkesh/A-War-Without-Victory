# Foča Takeover Operation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the five Foča OSID start overrides from the active April 1992 scenario family and make ordinary combat in Operation Foca produce the historically required RS takeover.

**Architecture:** Preserve census-derived turn-zero control. Extend the existing VRS Herzegovina Corps operation, which already follows Operation Visegrad, so its Foča axis first opens the Foča–Brod route and then attacks the five former override cells. Control changes remain battle-owned through `CorpsOperation`; no event receipt, direct controller write, must-hold rule, or engine exception is added.

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
2. Add a catalog test asserting that Operation Foca contains the five former overrides on its Foča axis, preserves its two authored participants, and retains the Foča-town staging point.
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

## Task 3: Extend Operation Foca minimally

**Files:**
- Modify: `src/sim/combat/pre_planned_operations.ts`

Keep `rs_foa_brigade` and `rs_bilea_brigade` on the Foča axis. Preserve `op:foca:foca_3` staging and the existing `patkovina → prevrac → kolovarice` approach. Add the five former override cells after the operation opens access from Foča town through Patkovina/Brod. Update stale comments that incorrectly claim every Foča OSID starts RS.

Run the two focused tests again and require green.

## Task 4: Verify mechanism before campaign adoption

1. Run typecheck and the focused operation/scenario suites.
2. Run a bounded replay of the canonical 188-week scenario through the January checkpoint.
3. Confirm from `operation_aars.json` and `weekly_report.jsonl` that each changed OSID is captured by Operation Foca, not by a direct write or independent brigade attack.
4. Compare January score and check the 9/9 enclave guard.
5. Because this moves territory, request owner authorization before the final 188-week adoption run. A short-horizon result is development evidence only.

## Task 5: Adopt and document

After a clean authorized 188-week run, compare against baseline `n388` using killed, wounded, operations, attacks, dead/inert-operation advisories, checkpoints, and guard results. Update calibration authority, real-war reporting if outputs move, and the project ledger. Reconcile the baseline manifest and health floors only after the owner accepts the measured engine/scenario truth.
