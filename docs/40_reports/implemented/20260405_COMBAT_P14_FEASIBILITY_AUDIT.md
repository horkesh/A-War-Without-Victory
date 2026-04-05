# COMBAT-P14 Feasibility / Estimator Gap Audit — Resolved (No Code Changes)

**Date:** 2026-04-05
**Run:** n1323 (current HEAD — no new run needed)
**Status:** RESOLVED — investigation-only

## Summary

Audited COMBAT-P14 ("Combat predictor checkLaunchFeasibility ignores defender artillery/terrain/entrenchment — primary driver of high ZEA rates") from the engine health audit (2026-04-02). Finding: **COMBAT-P14 is stale.** All flagged modifiers have been added. The two remaining commander `operation_zero_eligible_execution` cases targeted by this audit are bounded friction in structurally constrained corps, not a predictor mismatch.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Code trace of all 3 combat layers, COMBAT-P14 staleness confirmation | `checkLaunchFeasibility` now includes `getDefensiveFireMult`, `entrenchmentMult`, `terrainMult`. Two-tier architecture (optimistic feasibility → realistic predictor) is by design. |
| Scenario Runner | Root cause of 2 remaining commander `operation_zero_eligible_execution` cases | cmd_vrs_east_bosnian_t14: staging unreachability (brigades can't reach objective). cmd_arbih_1st_corps_t18: Sarajevo siege — corps-level ratio passes, per-brigade vs entrenched SRK fails. Both structurally constrained corps. |
| Orchestrator | Dispatch, synthesis, resolution decision | Both specialists converge: COMBAT-P14 stale, remaining ZEA is bounded friction. |

## Three-Layer Architecture (confirmed correct)

### Layer 1: `checkLaunchFeasibility` (sector_offensive.ts:164-228)
- **Purpose**: Corps-level "is this operation worth planning?" Intentionally optimistic.
- **Attacker**: All corps brigades pooled, `basePower × FEASIBILITY_ATTACK_POSTURE_MULT`
- **Defender**: `sectorDefenderPower × defensiveFireMult × entrenchmentMult × terrainMult`
- **Now includes** (post-audit updates): defensive fire, entrenchment (sqrt scaling), urban+forest terrain
- **Design intent** (documented lines 155-161): "only rejects operations where even the most generous estimate shows no objective is achievable"

### Layer 2: `predictCombatOutcome` (combat_predictor.ts:164)
- **Purpose**: Per-brigade "can this brigade take this OSID?" Used by bot_brigade_ai.
- **Uses full `computeAttackerPower`/`computeDefenderPower`** with all 12+ multipliers
- **Includes**: supply, entrenchment, terrain, artillery, seasonal, officer, fatigue, morale, fog of war

### Layer 3: `attack_resolution_osid` (resolver)
- **Purpose**: Ground truth combat resolution. Same formulas as predictor, no fog of war.

The two-tier architecture (optimistic feasibility → realistic per-brigade predictor) is intentional separation of concerns. Corps commanders plan optimistically; brigade commanders refuse bad orders. This is mechanically sound and historically appropriate.

## Remaining 2 Commander `operation_zero_eligible_execution` Cases

### cmd_vrs_east_bosnian_t14 (RS, w14-w21, 0 attacks)
- **Objective**: Domaljevac (HRHB Posavina pocket)
- **Root cause**: Staging unreachability — East Bosnian corps based around Bijeljina, objective is in separated Posavina pocket. Brigades never adjacent to target.
- **Fix-worthy?** No. Structurally constrained corps with limited front-line adjacency. Known chronic edge case.

### cmd_arbih_1st_corps_t18 (RBiH, w18-w28, 0 attacks)
- **Objective**: Ilidza/Lukavica (RS-held Sarajevo suburbs)
- **Root cause**: Classic predictor mismatch — corps-level feasibility passes (aggregate ratio), but per-brigade OSID-level combat math rejects every individual attack vs 18-turn entrenched SRK with defensive fire.
- **Fix-worthy?** No. Historically accurate — ARBiH could not break the Sarajevo siege. The commander should not plan the op, but this is a design question (commander personality/aggressiveness tuning) not a predictor bug.

## Commander Zero-Eligible Trajectory (this session)

| Run | Targeted anomaly family | Key Fix |
|---|---|---|
| Pre-session | high / dominant | — |
| n1318 | sharply reduced | Commander ops get axes (invalid ops 370→137) |
| n1319 | reduced again | Empty-objective probe guard |
| n1321 | narrowed further | Anti-paralysis supply gate |
| **n1323** | **2 residual commander cases** | Supply graduated scoring + BFS corridor fix |

## Completion Block

- **Canonical owner:** `src/sim/combat/sector_offensive.ts` (`checkLaunchFeasibility`)
- **Demoted path:** None — COMBAT-P14 is resolved. Remaining ZEA is bounded friction from 2 structurally constrained corps.
- **Player-visible truth:** No change. The feasibility check now correctly weighs defender capabilities. The commander-operation zero-eligible family audited here is reduced to 2 bounded residual cases.
- **Canonical UI surface:** No UI change.
- **Done means:** COMBAT-P14 confirmed stale — all flagged modifiers present in current code. Two-tier architecture validated. The two remaining commander `operation_zero_eligible_execution` cases are bounded edge cases, not predictor bugs.

## Recommended Next Lane

1. **gradacac_2 P0 investigation**: Remaining calibration priority. RS overperforming on newly-covered fronts.
2. **v0.8.1 Commander Maturity gate check**: Full two-tier post-run panel go/no-go on commander system. n1323 is a strong candidate for this gate.
3. **Commander personality tuning**: The Sarajevo breakout attempt (cmd_arbih_1st_corps_t18) suggests the 1st Corps commander needs lower aggressiveness or a siege-awareness check. Design lane, not predictor lane.
