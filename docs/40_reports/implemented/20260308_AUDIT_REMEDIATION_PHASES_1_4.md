# Audit Remediation — Phases 1-4 (Superseded)

> **Note:** This report covers Phases 1-4 only. For the complete 5-phase report including terminology sweep, mega-file splitting, and simplify pass, see [20260308_AUDIT_REMEDIATION_FULL_5_PHASES.md](20260308_AUDIT_REMEDIATION_FULL_5_PHASES.md).

---

**Date:** 2026-03-08
**Run IDs:** n414 (Phase 2), n415 (Phase 3)
**Baseline:** n403 (86.9% area-weighted)
**Result:** n415 (89.4% area-weighted, +2.5pp)

## Summary
- Systematic remediation of issues identified in two audit reports: Pyrrhic Team State of the Game Evaluation and N412 Deep Dive Sector/Ops/Combat
- 4 phases executed: determinism, frozen front cascade, supply/morale balance, code health
- Calibration improved from 86.9% to 89.4% area-weighted; DRINA region improved +8.4pp

## Phase 1: Determinism Fix

**Problem:** 24 unsorted `Object.values()`/`Object.keys()` iterations in combat code could produce different battle outcomes across JS engines.

**Changes:**
- `attack_resolution_osid.ts`: 4 sorted iterations (displacement, resolution, post-flip, cleanup)
- `bot_brigade_ai_osid.ts`: 6 fixes (sector fallback, defender detection, brigade filtering)
- `bot_corps_ai.ts`: 3 fixes (settlement counting, enemy detection)
- `decoration_evaluator.ts`, `front_assignment.ts`, `operation_storm.ts`, `paramilitary_sweep.ts`, `rear_pocket_consolidation.ts`: sorted iterations

**Simplify pass:** Removed unnecessary sorts from order-independent operations — counters, `.length` checks, `.some()` existence checks, hot-loop `.filter()` callbacks replaced with `.some()`. ~8000 unnecessary sorts/turn eliminated.

**Impact:** No calibration change (reproducibility only).

## Phase 2: Frozen Front Cascade (n414: 87.4%)

**Problem:** Self-reinforcing stasis cycle at w40: entrenchment wall → attacks fail → fatigue/supply drain → aggression collapses → targets cleared → complete front freeze.

**Changes:**
1. **Concentration bonus** (`combat_math.ts`): Multi-brigade attacks get coordination bonus (2=1.15×, 3=1.25×, 4+=1.30×)
2. **Entrenchment degradation** (`attack_resolution_osid.ts`): Defenders lose 0.5 `entrenchment_turns` per battle, win or lose
3. **Hold OSID corps scoping** (`bot_corps_ai.ts`): `findFriendlyOsidsFromMunicipalities` results filtered to corps sector territory only
4. **Target adjacency filter** (`bot_corps_ai.ts`): Undefended enemy sectors only targeted if adjacent to corps sectors
5. **Aggression floor** (`bot_corps_ai.ts`): Offensive=0.0, balanced=-0.10, defensive=-0.30, reorganize=-0.50

**Impact:** 87.4% (+0.5pp). RS attacks rose to 375/40w. Still freezes after w29 but later than before.

## Phase 3: Supply & Morale Balance (n415: 89.4%)

**Problem:** RS supply hits zero by w40 (drain exceeded income after OOB grew to 112 formations). Formations at morale=0 remain active indefinitely.

**Changes:**
1. **Supply drain** (`supply_reserve_constants.ts`): `MAINTENANCE_DRAIN_PER_FORMATION` 0.045→0.035. RS drain drops from 5.04 to 3.92/turn vs ~4.0 patron income
2. **Critical morale penalty** (`combat_math.ts`): `getCriticalMoralePenalty()` — below morale 15, combat power drops to 0.3-1.0×
3. **Cohesion decay** (`morale_drift.ts`): Formations below morale 15 lose 2 cohesion/turn → organic surrender cascade

**Impact:** 89.4% (+2.0pp). DRINA jumped from 70.0% to 78.4% (+8.4pp). RS delta improved from -70 to -50.

## Phase 4: Code Health

**Problem:** Displacement routing duplicated ~120 lines across 3 loops. No supply invariant checks. 98 temporary diagnostic scripts cluttering tools/.

**Changes:**
1. **Displacement dedup** (`displacement_takeover.ts`): Extracted `routeDisplacedCohort` helper. Net -412 lines
2. **Supply assertions** (`supply_reserves.ts`): `assertSupplyInvariant` at start/end of `updateSupplyReserves`
3. **Script cleanup**: Deleted 5 tracked scripts, added `tools/tmp_*.cjs` to `.gitignore`

**Impact:** No behavioral change. Cleaner codebase.

## Calibration Results (n415)

| Region | n403 | n414 | n415 | Delta |
|--------|------|------|------|-------|
| KRAJINA | 94.7% | 94.9% | 96.3% | +1.6pp |
| POSAVINA | — | 93.6% | 93.4% | stable |
| CORRIDOR | 90.8% | 90.8% | 89.5% | -1.3pp |
| CENTRAL_BOSNIA | — | 81.0% | 83.8% | +2.8pp |
| SARAJEVO | — | — | 86.2% | — |
| HERZEGOVINA | 90.3% | 90.3% | 91.5% | +1.2pp |
| DRINA | — | 70.0% | 78.4% | +8.4pp |
| **OVERALL** | **86.9%** | **87.4%** | **89.4%** | **+2.5pp** |

## Files Changed

| File | Phase | Change |
|------|-------|--------|
| `attack_resolution_osid.ts` | 1,2 | Determinism sorts + concentration bonus + entrenchment degradation |
| `bot_brigade_ai_osid.ts` | 1 | Determinism sorts, hot-loop optimization |
| `bot_corps_ai.ts` | 1,2 | Determinism sorts + hold scoping + target filter + aggression floor |
| `combat_math.ts` | 2,3 | Concentration bonus + critical morale penalty |
| `morale_drift.ts` | 3 | Cohesion decay at critical morale |
| `supply_reserve_constants.ts` | 3 | Maintenance drain reduction |
| `supply_reserves.ts` | 4 | Supply invariant assertions |
| `displacement_takeover.ts` | 4 | Routing dedup |
| `decoration_evaluator.ts` | 1 | Determinism sort |
| `faction_resilience.ts` | 1 | Import cleanup |
| `front_assignment.ts` | 1 | Determinism sort |
| `operation_storm.ts` | 1 | Determinism sort |
| `paramilitary_sweep.ts` | 1 | Determinism sort |
| `rear_pocket_consolidation.ts` | 1 | Determinism sort |
| `.gitignore` | 4 | tmp_*.cjs rule |
| 5 diagnostic scripts | 4 | Deleted |

## Remaining Issues (Phase 5 — deferred)

- **Mega-file splitting**: corps_front_sectors.ts (2,223L), bot_corps_ai.ts (2,159L), bot_brigade_ai_osid.ts (1,987L)
- **Phase I/II terminology**: 332 references across 95 files (comments/docs only — canon v0.6 says purged)
- **Drina region**: 78.4% improved but still weakest region
- **Zero-eligible-attacker operations**: 8 sector ops launching without eligible brigades
- **HRHB corps rework**: Herzegovina/Central Bosnia corps boundary issues
- **UI testing**: 0% coverage on React components

## Next Steps

1. Investigate Drina underperformance (RS aggression in eastern Bosnia)
2. Fix zero-eligible-attacker sector operations
3. Phase I/II terminology sweep (103 files, comments only)
4. Mega-file splitting roadmap
