# Comprehensive Combat Formula Implementation Report

**Date:** 2026-03-03
**Runs:** n375–n392
**Status:** Complete. n392 = 88.6% OSID match (667/753) — all-time high.
**Previous baseline:** n374 = 87.6% (660/753, ceiling removal complete)

---

## Executive Summary

Four new combat mechanics added to create a comprehensive, faction-differentiating combat formula. Together they model the three documented asymmetries of the Bosnian War: command quality (VRS professional → degraded, ARBiH rabble → professional), ethnic homeland defense motivation, and heavy weapons superiority (persistent shelling, bombardment exposure). Result: +1.0pp OSID match over n374, with ARBiH KIA closing from 7,214 to 9,831 (85% of 11,500 target).

---

## Mechanics Implemented

### 1. Officer Quality (`combat_math.ts:141-164`)

Faction-level command effectiveness multiplier applied to both `computeAttackerPower` and `computeDefenderPower`.

| Faction | Initial | Trajectory | Floor/Cap | Rationale |
|---------|---------|------------|-----------|-----------|
| VRS | 1.10 | Decays 0.002/week after w20 | Floor 0.95 | JNA inheritance; irreplaceable officers lost to attrition/brain drain |
| ARBiH | 0.85 | Grows 0.003/week from w0 | Cap 1.05 | No trained officers at start; battlefield promotions, foreign-trained returnees |
| HVO | 0.97 | Constant | — | Croatian Army secondees; stable but limited cadre |

**Week 40 values:** VRS 1.06, ARBiH 0.97, HVO 0.97.

**Wiring:**
- `computeAttackerPower()` in `combat_math.ts` — multiplies attack power
- `computeDefenderPower()` in `combat_math.ts` — multiplies defense power
- `combat_predictor.ts` — predictor parity (same call)
- `bot_brigade_ai_osid.ts` — bot AI predictor uses same function

### 2. Ethnic Homeland Defense (`ethnic_defense.ts`, 68 lines — new file)

Defenders get a graduated defense bonus when defending co-ethnic majority OSIDs.

**Constants:**
- `MAX_ETHNIC_DEFENSE_BONUS = 0.12` (12% max)
- `ETHNIC_DEFENSE_THRESHOLD = 0.30` (below = no bonus)
- `ETHNIC_DEFENSE_FULL = 0.60` (above = full bonus)

**Exports:**
- `OsidEthnicComposition` — Map type for per-OSID census data
- `getCoEthnicShare(osid, faction, ethnicMap)` — returns 0.0–1.0 co-ethnic fraction (RS→serb, RBiH→bosniak, HRHB→croat)
- `getEthnicDefenseBonus(coEthnicShare)` — returns 0.0–0.12, applied as ×(1 + bonus) to defender power

**Wiring:**
- `attack_resolution_osid.ts` — defender power calculation
- `combat_predictor.ts` — predictor parity
- `bot_brigade_ai_osid.ts` — bot outcome estimation
- Ethnic composition data sourced from `operational_data.ts` (1991 census per OSID)

### 3. Bombardment Casualty Multiplier (`combat_math.ts:196-210`)

Attacker heavy weapons inflict extra defender casualties even on stalemate/repulsed outcomes.

**Constants:**
- `MAX_BOMBARDMENT_CAS_MULT = 1.8` (up to 80% extra defender casualties)
- `BOMBARDMENT_DIVISOR = 80` (firepower units for full effect)

**Formula:** `1.0 + (MAX - 1.0) × min(1.0, totalFirepower / DIVISOR)`

Where `totalFirepower = Σ(artEff + tankEff × 0.5)` across all attackers.

**Wiring:**
- `attack_resolution_osid.ts` — multiplies `defenderCasualties` after battle resolution
- `combat_predictor.ts` — predictor parity

### 4. Bombardment Exposure Attrition (`frontline_attrition.ts:38-54, 106-185`)

Passive attrition from enemy heavy weapons — the major new mechanic for closing the ARBiH casualty gap. Added to the existing frontline attrition system.

**Constants:**
- `BOMBARDMENT_EXPOSURE_RATE = 0.012` (1.2% max weekly personnel loss)
- `BOMBARDMENT_RATIO_SCALE = 2.0` (ln(7) ≈ 2.0 for full effect)
- `MIN_COUNTERBATTERY_FP = 1.0` (floor to prevent division by zero)

**Model (ratio-based with log scaling):**
```
effect = min(1.0, ln(incoming_FP / own_FP) / SCALE)
casualties = personnel × RATE × effect
```

**Per-faction effect at w40:**
| Faction | Own FP | Incoming FP | Ratio | ln(ratio)/2.0 | Effect |
|---------|--------|-------------|-------|---------------|--------|
| ARBiH | ~1.8 | ~13 | 7.2 | 0.99 | 99% (near-full) |
| HVO | ~5 | ~13 | 2.6 | 0.48 | 48% (half) |
| VRS | ~17 | ~2 | 0.13 | <0 | 0% (zero) |

**Implementation details:**
- **Pre-loop pass** (lines 106-122): Aggregates per-faction total heavy weapons firepower (`factionFrontFP`) for all front-assigned active brigades
- **Per-brigade computation** (lines 167-185): Each enemy faction's total FP is distributed across all non-enemy brigades (`totalFrontBrigades - enemyFaction.count`), not just own-faction count. This prevents small factions (HVO, 31 brigades) from being disproportionately penalized.
- **Casualties** (line 189): `baseAttritionCas + bombardmentCas`, capped at `personnel - MIN_COMBAT_PERSONNEL`
- Feeds into casualty ledger and pool.exhausted (demographic gating)

**Design evolution (3 model iterations):**
1. **Linear deficit** (n383): `netExposure / DIVISOR` — only 1.4× ARBiH/HVO differentiation, HVO over-penalized due to per-faction-count FP distribution
2. **Fixed distribution** (n384-n386): Enemy FP across all non-enemy brigades — fixed HVO, better calibration
3. **Ratio-based** (n387-n392): `ln(incoming/own) / SCALE` — 2.07× differentiation, natural diminishing returns, steep low-equipment penalty

---

## Files Changed

| File | Lines Changed | Change |
|------|--------------|--------|
| `src/sim/combat/combat_math.ts` | +82 | `getOfficerQualityMult()`, `getBombardmentCasualtyMult()`, constants |
| `src/sim/combat/ethnic_defense.ts` | +68 (new) | Ethnic defense module: types, `getCoEthnicShare()`, `getEthnicDefenseBonus()` |
| `src/sim/combat/frontline_attrition.ts` | +55 | Bombardment exposure: constants, pre-loop FP aggregation, per-brigade ratio computation |
| `src/sim/combat/attack_resolution_osid.ts` | +8 | Wired ethnic defense + bombardment casualty mult into resolver |
| `src/sim/combat/combat_predictor.ts` | +8 | Wired ethnic defense + bombardment casualty mult + officer quality into predictor |
| `src/sim/combat/bot_brigade_ai_osid.ts` | +6 | Wired ethnic defense into bot AI outcome estimation |

---

## Calibration Iterations

| Run | Model | RATE | Scale | ARBiH KIA | VRS Pers. | HVO Pers. | OSID Match |
|-----|-------|------|-------|-----------|-----------|-----------|------------|
| n374 | (baseline, no new mechanics) | — | — | — | 97k | 46k | 87.6% |
| n375 | officer + ethnic + bombardment mult | — | — | ~7,200 | 91k | 46k | 88.3% |
| n382 | n375 verified, HRHB pool 1.55 | — | — | 7,214 | 91k | 46k | 88.3% |
| n383 | linear deficit | 0.005 | DIV=20 | 8,057 | — | 41k | 88.0% |
| n385 | linear deficit | 0.012 | DIV=12 | 9,287 | 88k | 42k | 88.4% |
| n386 | linear deficit | 0.015 | DIV=10 | 10,292 | 88k | 39k | 88.0% |
| n387 | ratio ln() | 0.015 | 2.0 | 10,403 | 85k | 39k | 88.2% |
| **n392** | **ratio ln()** | **0.012** | **2.0** | **9,831** | **85k** | **41k** | **88.6%** |

**Key finding — cascade dynamics:** Increasing bombardment attrition weakens ARBiH/HVO → VRS attacks succeed more → VRS takes more attacker casualties → VRS personnel drops. RS pool scale is extremely sensitive: 0.25→0.27 crashed OSID from 88.6% to 85.7% (VRS over-extension beyond historical territory).

---

## n392 Results

**Territory:** RS 420 (target 416, +4), RBiH 246 (target 248, -2), HRHB 87 (target 89, -2)

**Regional breakdown:**
| Region | Match | Delta from n374 |
|--------|-------|-----------------|
| Krajina | 98.5% (130/132) | +3.0pp |
| Herzegovina | 92.5% (86/93) | +4.3pp |
| Central Corridor | 90.4% (85/94) | 0.0pp |
| Sarajevo | 87.1% (27/31) | 0.0pp |
| Central Bosnia | 87.3% (145/166) | -0.7pp |
| Drina | 82.0% (105/128) | +0.7pp |
| Posavina | 81.7% (89/109) | 0.0pp |

**Personnel:** ARBiH 119k (in band), VRS 85k (below 90k band by 5k), HVO 41k (in band)

**Casualties:** ARBiH KIA 9,831 (target 11,500, 85% achieved), total military KIA 25,805

---

## Remaining Gaps

1. **ARBiH KIA shortfall:** 1,669 remaining gap (9,831 vs 11,500). Likely requires siege-specific mechanics (Sarajevo daily shelling, enclave bombardment) rather than further parameter tuning.
2. **VRS at 85k:** Below 90k target band. Driven by combat cascade — more successful VRS attacks = more VRS attacker casualties. RS pool increase causes worse OSID match (n390: 86.3%, n391: 85.7%). Accepted as emergent tradeoff for 88.6% territory accuracy.

---

## Design Principle

All four mechanics produce faction differentiation organically from starting conditions (equipment levels, ethnic composition, JNA inheritance) rather than hardcoded bonuses. Officer quality follows documented doctrinal arcs. Ethnic defense reflects 1991 census. Bombardment exposure reflects actual equipment holdings. No special-case per-faction code except the officer quality curves (which model documented historical trajectories).

---

## Backward Compatibility

All mechanics are additive — no existing behavior removed. Officer quality defaults to 1.0 for unknown factions. Ethnic defense returns 0 when no ethnic map is provided. Bombardment casualty mult returns 1.0 when no attackers. Bombardment exposure is 0 when own FP exceeds incoming FP.

## Tests

No new unit tests added for these mechanics. Verification is via deterministic scenario runs (n375–n392) with OSID match rate, personnel bands, and casualty targets as acceptance criteria. The mechanics are validated by their calibration outcomes rather than isolated unit tests.
