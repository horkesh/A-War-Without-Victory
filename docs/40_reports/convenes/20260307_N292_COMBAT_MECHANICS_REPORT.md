# N292 Combat Mechanics Report — 40-Week Scenario

**Run**: `apr1992_definitive_40w` | **Hash**: `185c8e3e1ac266d4` | **Weeks**: 0–40 (Apr 1992 – Jan 1993)
**Date**: 2026-03-07 | **Valid for combat calibration**: No

---

## Executive Summary

The simulation produces excellent macro-level tempo and territorial patterns but has **6 critical mechanical failures** that undermine combat credibility. Equipment is immortal, fatigue is inert, zombie brigades fight indefinitely, and the casualty ratio is inverted from history. The supply model gives RBiH 100% supply under what was historically a devastating arms embargo.

**Overall Grade: C-** — Good strategic skeleton, broken tactical organs.

---

## Combat Activity

| Metric | Value |
|--------|-------|
| Attack orders | 190 (RS: 175, RBiH: 7, HRHB: 8) |
| Battles resolved | 168 |
| Territory flips | 74 |
| Active operations (w40) | 6 (all VRS) |
| Brigades destroyed | **0** |
| Equipment lost | **0** |

RS dominance in attack orders (92%) matches the historical VRS offensive initiative in 1992. RBiH and HRHB near-zero attacks correctly reflect their defensive posture in Year 1.

---

## Casualties

| Faction | KIA | WIA | MIA | Total |
|---------|-----|-----|-----|-------|
| RS | 9,567 | 17,548 | 9,882 | 36,997 |
| RBiH | 7,861 | 14,376 | 7,895 | 30,132 |
| HRHB | 4,572 | 8,330 | 4,534 | 17,436 |
| **Total** | **21,999** | **40,254** | **22,312** | **84,565** |

### Historian Assessment: D (Casualty Ratio)

The RS-to-RBiH KIA ratio is **1.22:1 in favor of RS losses**. This is historically inverted. Through 1992, the ARBiH suffered disproportionately higher casualties due to:
- Lack of heavy weapons and training
- Defensive positions in urban areas under siege
- VRS artillery superiority

**Historical expectation**: ARBiH KIA should be 1.5-2x VRS KIA in this period. The simulation shows the opposite because the attacker always pays BASE_ATTACKER=0.04 vs BASE_DEFENDER=0.028, and VRS attacks 175 times vs RBiH 7. The model correctly punishes attackers but **fails to model artillery bombardment casualties** (siege shelling, sniper fire) which historically inflicted massive defender losses without formal "battles."

---

## Mechanical Findings

### 1. FATIGUE: Effectively Inert — Grade: F

**Finding**: 98% of brigades have fatigue at or near zero. Recovery vastly outpaces accumulation.

- Fatigue adds: +0.5/turn frontline, +2 attacker/+1 defender per battle
- Recovery: every 2 turns, amount unspecified but clearly dominant
- `getFatigueMult()` floors at 0.6x attack / 0.75x defend — but nobody reaches meaningful fatigue
- Net effect: fatigue has **zero practical impact** on combat outcomes

**Impact**: Brigades that fight 15+ battles in 40 weeks show no degradation from exhaustion. This removes a critical historical constraint — units that fought continuously in 1992 became combat-ineffective within weeks.

### 2. EQUIPMENT LOSS: Completely Missing — Grade: F

**Finding**: Zero equipment destroyed across 168 battles. Tanks, artillery, and AA systems are immortal.

- Equipment state tracks `operational/degraded/non_operational` conditions
- `equipment_decay` field exists on brigades but no mechanic reduces equipment counts
- A brigade with 12 tanks after 15 battles still has 12 tanks
- VRS heavy weapon superiority (the defining asymmetry of the war) degrades to parity over time historically, but never does in simulation

**Impact**: This is arguably the most consequential missing mechanic. VRS firepower advantage was finite — barrels wore out, tanks broke down, ammunition depleted. Without equipment attrition, VRS maintains permanent heavy weapon superiority.

### 3. ZOMBIE BRIGADES: No Dissolution — Grade: F

**Finding**: The 65th Protection Regiment (Bihac) has 169 personnel, 0 cohesion, 0 morale — and is still "active" and fighting.

- `MIN_COMBAT_PERSONNEL=100` exists but only as a combat power floor, not a dissolution trigger
- No mechanic destroys or disbands combat-ineffective units
- Brigades with <200 personnel continue to occupy OSIDs and participate in defense
- 5 brigades are critically low (<300 personnel) but none have been destroyed

**Specific case — 65th Protection Regiment**: This is historically a headquarters security unit for the 5th Corps in Bihac. It should never be deployed as a frontline combat brigade. Its destruction in the simulation (effectively: 169 pers, 0/0 cohesion/morale) represents both a missing dissolution mechanic AND a misuse of a garrison unit.

### 4. HRHB COHESION FLOOR: Too Generous — Grade: C-

**Finding**: HRHB minimum cohesion is 50, preventing realistic degradation.

- HRHB avg cohesion: 73.9 (min 50, max 100)
- Compare RS avg: 51.8 (min 8, max 100) — RS can degrade properly
- Compare RBiH avg: 67.8 (min 25, max 100)
- The floor prevents HRHB units from becoming combat-ineffective through cohesion loss

**Impact**: HVO historically suffered severe cohesion problems when fighting on two fronts (vs VRS and vs ARBiH from 1993). A 50-floor prevents this.

### 5. ENCLAVE RESILIENCE: Static After Init — Grade: D

**Finding**: Enclave resilience caps at 30 within ~15 turns and never changes thereafter.

- No dynamic adjustment based on actual siege conditions
- Srebrenica, Zepa, Gorazde, Bihac all treated identically
- Historical reality: each enclave had dramatically different resilience based on terrain, UN presence, supply corridors, and internal organization

### 6. SUPPLY MODEL: RBiH at 100% — Grade: F

**Finding**: RBiH general supply at 100% is historically impossible.

- Bosnia was under international arms embargo throughout the war
- ARBiH was the most supply-constrained force — acute ammunition shortages, weapons rationing
- HRHB at 8.5% is closer to a realistic constrained state
- RS at 32.7% reflects some attrition but not enough

**Historian note**: The arms embargo was *the* defining constraint on ARBiH capability. A model that gives them 100% supply fundamentally misrepresents the war's dynamics.

---

## What Works Well

| Mechanic | Grade | Notes |
|----------|-------|-------|
| Combat tempo decline | A | Attack rate drops naturally as war progresses — matches history |
| Territorial pattern | B+ | RS gains match 1992 corridor operations |
| Displacement | B- | 771k displaced (historical: 1.0-1.3M by end-1992) |
| Defense terrain bonus | B+ | Applied correctly to 8 OOB-designated mountain brigades |
| Morale retreat resistance | B | Faction-differentiated floors work as designed |
| Pioneer attack seeding | B | Realistic multi-brigade concentration before committing |
| Vienna Declaration truce | A- | RS-HRHB non-aggression matches 1992 reality |

---

## Troop Strength (w40)

| Faction | Simulated | Historical Target |
|---------|-----------|-------------------|
| RS | 106,656 | 90-100k |
| RBiH | 120,850 | 110-130k |
| HRHB | 37,740 | 40-45k |

RBiH and HRHB are within bands. RS is slightly high (JNA inheritance bonus may need trimming).

---

## Priority Fix List

| Priority | Issue | Complexity | Impact |
|----------|-------|------------|--------|
| **P0** | Equipment attrition mechanic | Medium | Fixes VRS permanent superiority |
| **P0** | Brigade dissolution at combat-ineffective threshold | Low | Fixes zombie brigades |
| **P0** | Supply model — RBiH embargo constraint | Medium | Fixes most consequential historical inaccuracy |
| **P1** | Fatigue accumulation/recovery rebalance | Low | Makes exhaustion matter |
| **P1** | Casualty model — siege/bombardment casualties | Medium | Fixes inverted casualty ratio |
| **P2** | HRHB cohesion floor reduction | Trivial | Floor 50 to 25 or 30 |
| **P2** | Enclave resilience dynamism | Medium | Differentiate enclaves realistically |
| **P3** | 65th Protection Regt — flag as garrison unit | Trivial | OOB data fix |

---

## Historian's Verdict

> *The simulation correctly captures the VRS blitzkrieg tempo of spring-summer 1992 and the gradual grinding down that followed. But it models a war where defenders have infinite supply, attackers have infinite tanks, and destroyed units keep fighting. The macro pattern is right; the micro mechanics that should constrain it are absent. Fix equipment loss, supply constraints, and brigade dissolution — those three alone would transform this from a territorial painting exercise into a credible conflict simulation.*

---

## n292 Raw Data Reference

### Morale Distribution
- RS: avg=56.3, min=0, max=85, below40=7/80
- RBiH: avg=68.2, min=0, max=90, below40=3/127
- HRHB: avg=71.5, min=45, max=90, below40=0/40

### Cohesion Distribution
- RS: avg=51.8, min=8, max=100, at_or_below_25=12/80
- RBiH: avg=67.8, min=25, max=100, at_or_below_25=2/127
- HRHB: avg=73.9, min=50, max=100, at_or_below_25=0/40

### Supply Reserves
- RS: general=32.7%, heavy_munitions=varies
- RBiH: general=100%, heavy_munitions=varies
- HRHB: general=8.5%, heavy_munitions=varies

### Top Engaged Brigades (by battle count)
Extracted via `tools/analyze_n292.cjs` — see run directory for full data.

### Critically Low Brigades
- 65th Protection Regiment (RBiH): 169 pers, 0 cohesion, 0 morale
- 4 additional brigades below 300 personnel (all still active)
