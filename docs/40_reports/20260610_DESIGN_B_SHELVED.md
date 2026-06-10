# Design B (exhaustion-drag → territorial teeth) — SHELVED

**Date:** 2026-06-10
**Status:** **SHELVED — proven structural dead-end (4 consecutive inert results).**
**Owner standing-delegation:** Pyrrhic scenario-tester panel returned **STOP**; shelved under the
"you have my signature as long as the team signs off" authority.
**§6:** OK throughout — every iteration was control_delta byte-identical (Srebrenica/Žepa fall identically).
**Floor:** UNCHANGED — 188w 649/712. No calibration impact; all four iterations were territory-inert.

---

## What Design B tried to do

Give the **exhaustion FEEL territorial teeth** — i.e. make a faction that has bled itself out
*actually launch fewer/weaker offensives*, so the felt pressure (Design A) is backed by ground truth.
The lever sat on the **corps-commander op-launch-willingness scorer**
(`src/sim/combat/commander/plan.ts`): a per-faction casualty-load drag that haircuts the launch
score of offensive intents.

## Why it is a structural dead-end (the finding)

Four iterations, each a clean 188w OFF-vs-ON pair, all **territory byte-identical**:

| Iter | Branch / PR | Lever | ON hash | control_delta |
|------|-------------|-------|---------|---------------|
| v1   | `feat/exhaustion-drag-designB` (#407)    | additive `e`-term drag @ floor 0.55 | `90cfbfc4c0513f89` | byte-identical |
| v2   | `feat/exhaustion-drag-designB-v2` (#408) | casualty-load drag + flag-reset fix | `e4aeeae4870d1d46` | byte-identical |
| v3   | `feat/exhaustion-drag-designB-v3` (#411) | bounded score-multiplier haircut (~32% on spent corps) + active-OG denominator fix | `4058ad3412bf02f3` | byte-identical |

OFF hash for all three == the 649 floor `345e044b7642aeab`.

**The v3 harvest proved the lever WORKS but is inert** — the 0.68× haircut flips a borderline scored
winner (RS `launch_opportunity` 0.654 → 0.4448, below `reinforce_zone` 0.545), yet zero territory moves.
Three independent reasons, each sufficient:

1. **At turn 188, 0/18 corps select any offensive intent.** The existing hard-block guards
   (`corps_exhaustion` / fatigue / stance / campaign_role) have *already* killed the opportunistic
   offensive lane before the haircut is consulted. The haircut operates on an empty room.
2. **The territory-moving late-war ops bypass the scorer entirely.** Storm / Sana / Mistral / the
   Drina enclave advances / Srebrenica + Žepa falls are delivered by the **injection** pipeline
   (`pre_planned_operations.ts` / `triggered_operations.ts` via `injectQueuedOperation` /
   `checkTriggeredOperations` / `injectArmyHqOperations`). That pipeline **never consults the
   corps-commander intent scorer**, so no haircut value can reach it.
3. A stronger haircut (lower floor → 0.3, or no floor) flips the scored winner *harder* but is still
   inert — see (1) and (2).

This is the same wall all four iterations hit. The op-launch-willingness mechanism **cannot** give
exhaustion territorial teeth, because the territory in the late war does not flow through it.

## Decision

- **Ship Design A (feel-only) for 1.0.** Exhaustion is a felt, surfaced pressure (war-weariness bands
  + Chronicle beat + verdict narrative), not a territorial lever. Design A is on `main`.
- **Shelve Design B.** Close #407 / #408 / #411; delete the three branches. The lever code is a proven
  dead-end and has **no future reuse** (the post-1.0 path is a different pipeline — see below).
- **Do NOT re-attempt the commander-scorer lever a 5th time.**

## Post-1.0 territorial-exhaustion lane (if ever pursued)

The *only* place exhaustion could move late-war territory is by **gating the injection pipeline**
(`pre_planned` / `triggered` ops) on faction exhaustion — e.g. delay/suppress a faction's queued
offensives once its casualty-load crosses a band. This is:

- a **much larger, calibration-disruptive** change that re-opens the 30/30 anchor floor AND §6
  (the rupture ops are triggered/injected — gating that pipeline touches the Srebrenica/Žepa path),
- therefore **out of scope for 1.0** and requires a full re-calibration paired with a fresh §6 panel,
- the historically-correct shape anyway: the one real territorial collapse (western Krajina, 1995)
  was a *triggered/injected* sequence, not an emergent commander choice — so the injection pipeline
  is the right substrate for it.

## Provenance

- Full v3 measurement: `feat/exhaustion-drag-designB-v3:docs/40_reports/20260610_DESIGN_B_V3_FIRST_FIRE.md`
  (on the closed-PR branch; GitHub retains it).
- Lever (v3): `plan.ts:759-768`; constants `:110-130`. Tests: `tests/exhaustion_drag_v2_haircut.test.ts`.
- Design A (shipped, on main): `src/state/war_weariness_bands.ts`, `src/ui/map/data/warWeariness.ts`,
  `src/ui/map/components/chronicle/warWearinessChronicle.ts`.
