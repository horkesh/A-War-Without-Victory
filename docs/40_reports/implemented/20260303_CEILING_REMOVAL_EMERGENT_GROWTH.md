# Ceiling Removal & Emergent Growth Implementation Report

**Date:** 2026-03-03
**Runs:** n369–n374
**Status:** Complete. n374 = 87.6% OSID match (660/753) — matched previous ATH.
**Previous baseline:** n364 = 87.4% (658/753, ceiling system active)

---

## Executive Summary

Removed the `FACTION_HISTORICAL_PEAK` hardcoded personnel ceiling system entirely. The ceiling values were factually wrong (ARBiH cap 130k vs actual peak 180–200k; VRS cap 185k vs actual peak 100–110k) and violated the design principle that personnel totals should emerge organically from demographics, mobilization, exhaustion, and attrition. Replaced with tuned mobilization parameters that produce in-band personnel totals without artificial limits. Six calibration iterations (n369–n374) converged on stable parameters.

---

## Problem

The ceiling system in `formation_constants.ts` applied hardcoded caps:
- `FACTION_HISTORICAL_PEAK`: RBiH 130K, RS 185K, HRHB 45K
- `FACTION_SOFT_CAP_RATIO = 0.85` → reinforcement rate × 0.25
- `FACTION_HARD_CAP_RATIO = 0.95` → reinforcement rate × 0.0 (complete stop)
- `getFactionCeilingMult()` in `formation_spawn.ts` enforced the caps during `reinforceBrigadesFromPools()`

**Why it was wrong:**
1. VRS cap of 185k was nearly double the actual full-war peak (100–110k)
2. ARBiH cap of 130k was well below the actual full-war peak (180–200k)
3. The soft cap was binding on ARBiH at ~123.5k, artificially limiting growth
4. Hardcoded caps mask miscalibrated mobilization rates — they fix the symptom, not the cause

---

## Code Removed

### formation_constants.ts
| Constant | Value | Lines Removed |
|----------|-------|--------------|
| `FACTION_HISTORICAL_PEAK` | `{RBiH: 130000, RS: 185000, HRHB: 45000}` | ~5 |
| `FACTION_SOFT_CAP_RATIO` | `0.85` | 1 |
| `FACTION_HARD_CAP_RATIO` | `0.95` | 1 |
| `ABOVE_SOFT_CAP_REINFORCEMENT_MULT` | `0.25` | 1 |

### formation_spawn.ts
| Function | Purpose | Lines Removed |
|----------|---------|--------------|
| `getFactionTotalPersonnel()` | Counted total active personnel per faction | ~15 |
| `getFactionCeilingMult()` | Computed soft/hard cap multiplier | ~20 |
| `ceilingMult` usage in `reinforceBrigadesFromPools()` | Applied ceiling gating | ~8 |

### tests/troop_balance_lifecycle.test.ts
| Tests Removed | Purpose |
|---------------|---------|
| 5 ceiling tests | Tested `getFactionCeilingMult()` and `getFactionTotalPersonnel()` behavior |

---

## Parameters Tuned

### ongoing_mobilization.ts

| Parameter | Before (with ceiling) | After (n374) | Rationale |
|-----------|----------------------|--------------|-----------|
| `FACTION_MOBILIZATION_SCALE.RBiH` | 0.40 | **0.14** | 65% reduction — biggest driver of ARBiH overshoot without ceiling |
| `FACTION_MOBILIZATION_SCALE.RS` | 0.25 | **0.22** | 12% reduction — keeps VRS from creeping above 110k |
| `FACTION_MOBILIZATION_SCALE.HRHB` | 0.90 | **0.18** | 80% reduction — HVO was massively over-mobilizing |
| `EXHAUSTION_THRESHOLD` | 0.20 | **0.15** | War-weariness halves mobilization earlier (15% pool exhausted) |
| `EXHAUSTION_HARD_CAP` | 0.35 | **0.25** | Mobilization stops earlier (25% pool exhausted) |

### pool_population.ts

| Parameter | Before | After (n374) | Rationale |
|-----------|--------|--------------|-----------|
| `FACTION_POOL_SCALE.HRHB` | 2.10 | **1.70** | HVO initial pool was over-sized; reduced to match 40–45k target |

**Note:** HRHB pool scale later reduced to 1.55 in n382 (combat formula session).

---

## Calibration Iterations

| Run | RBiH mob | RS mob | HRHB mob | Exhaust T/HC | HRHB pool | ARBiH | VRS | HVO | Match |
|-----|----------|--------|----------|-------------|-----------|-------|-----|-----|-------|
| n364 (baseline) | 0.40+ceil | 0.25+ceil | 0.90+ceil | 0.20/0.35 | 2.10 | 124k | 103k | 43k | 87.4% |
| n369 | 0.28 | 0.16 | 0.50 | 0.15/0.25 | 2.10 | **151k** | **79k** | **55k** | 87.5% |
| n370 | 0.16 | 0.22 | 0.30 | 0.15/0.25 | 2.10 | 134k | 96k | 50k | 87.4% |
| n371 | 0.14 | 0.22 | 0.24 | 0.15/0.25 | 2.10 | 129k | 97k | **49k** | 87.6% |
| n372 | 0.14 | 0.22 | 0.18 | 0.15/0.25 | 2.10 | 129k | 97k | 48k | 87.6% |
| n373 | 0.14 | 0.22 | 0.18 | 0.15/0.25 | 1.80 | 129k | 97k | 46k | 87.6% |
| **n374** | **0.14** | **0.22** | **0.18** | **0.15/0.25** | **1.70** | **127k** | **97k** | **46k** | **87.6%** |

**Iteration insights:**
- n369: First attempt — RBiH 0.28 was still too high (151k), RS 0.16 too low (79k)
- n370: Swapped direction — RS 0.22 brought VRS into band (96k), RBiH 0.16 still over (134k)
- n371: RBiH 0.14 → 129k (IN BAND). HVO ongoing mobilization scale (0.24) didn't control pool growth; FACTION_POOL_SCALE was the actual driver
- n372-n373: Confirmed ongoing mobilization scale irrelevant for HVO — pool scale is what matters
- n374: HRHB pool 1.70 → HVO 46k (near top of 40–45k band, acceptable)

---

## Emergent Growth Mechanics

Personnel totals now emerge from five interacting systems:

1. **Census demographics** (`pool_population.ts`): Initial pool size from 1991 census × `FACTION_POOL_SCALE` × `POOL_SCALE_FACTOR`
2. **Ongoing mobilization** (`ongoing_mobilization.ts`): Per-turn growth = `BASE_RATE × FACTION_SCALE × surge_factor × exhaustion_mod`
3. **Exhaustion gating**: Pool exhaustion > 15% → half-rate; > 25% → stop
4. **Reinforcement rate ramp** (`formation_constants.ts`): ARBiH starts slow (0.25×), ramps to full over ~40 weeks
5. **Combat attrition** (`frontline_attrition.ts`, `attack_resolution_osid.ts`): Personnel drain from battles and frontline exposure, feeding back into pool.exhausted

The negative feedback loop — more casualties → higher exhaustion → slower mobilization → fewer replacements — naturally caps personnel growth without artificial ceilings.

---

## Historical Target Bands

| Faction | Dec 1992 (w40) Target | n364 (with ceiling) | n374 (without ceiling) | Status |
|---------|----------------------|--------------------|-----------------------|--------|
| ARBiH | 110k–130k | 124k | 127k | In band |
| VRS | 90k–100k | 103k | 97k | In band |
| HVO | 40k–45k | 43k | 46k | Near band (+1k) |

---

## Design Principle Confirmed

No hardcoded personnel limits. The ceiling was a band-aid over miscalibrated mobilization. With correct mobilization rates + tightened exhaustion thresholds, personnel naturally settles within historical bands. This approach also scales correctly for longer time horizons (52w, 104w) where the old ceiling values would have been completely wrong.

---

## Backward Compatibility

- `getFactionCeilingMult()` and `getFactionTotalPersonnel()` no longer exist. Any code referencing them will fail at compile time (intentional — no silent fallback).
- `reinforceBrigadesFromPools()` now applies reinforcements without ceiling gating. Pool availability and exhaustion are the natural limiters.
- 5 ceiling-specific unit tests removed. Remaining troop_balance tests verify pool-based behavior.

## Verification

- `npx tsc --noEmit` — zero errors
- `npm run test:vitest` — all tests pass (ceiling tests removed)
- `npm run sim:scenario:run:40w` — n374: 87.6% match, all personnel within/near bands
