# Sector Combat Power Model + Enclave Capital Defense + Zombie Dissolution

**Date:** 2026-03-10
**Author:** Orchestrator + War-or-Game + Historian
**Status:** Design complete, awaiting implementation
**Calibration baseline:** n524 (87.7% area-weighted, 138 battles, 24.2k casualties)

---

## Executive Summary

Five interconnected problems emerge from the n524 deep dive:

1. **No clear sector combat power** — the player (and bot AI) can't see "this sector has 4,200 offensive power and 6,800 defensive power." Instead, power is computed per-battle from 15+ multiplicative factors. This makes the war opaque.
2. **Goražde town falls at w10 with no defender** — brigades retreat topologically (nearest friendly OSID with fewest enemies) instead of toward the enclave capital. BB2 p.479: historically, beaten units fell back concentrically toward town.
3. **19 zombie brigades** at 100-500 personnel, effectively immortal — dissolution criteria too strict (needs all three: pers<200, cohesion≤10, readiness=degraded).
4. **Casualties too low** (24.2k vs 40-60k historical) — base loss rates already raised to 0.06/0.042 but morale absorption and bombardment are undertuned.
5. **100% early-war attack success** — 35% against undefended targets (OK), 65% against weak ARBiH (plausible for 1992 VRS steamroll, but needs some failures).

Root cause cascade: Without clear sector power, the bot can't make good attack/defend decisions → zombie brigades clog sectors without contributing → enclave defenders scatter instead of concentrating → casualties stay low because battles are one-sided.

---

## Change 1: Sector Combat Power Rating

### Problem
Power is computed at battle time from 15+ factors. Nobody — not the player, not the bot, not the debugger — can see "this sector has X offensive and Y defensive strength" until a battle happens.

### Design

**New function: `computeSectorCombatRating()`** in `src/sim/combat/sector_combat_rating.ts`

For each sector, compute two numbers:

```typescript
interface SectorCombatRating {
    sector_id: string;
    faction: string;

    // Aggregate strength
    offensive_power: number;     // Total attack power of all sector brigades
    defensive_power: number;     // Total defense power across all edges
    defense_per_edge: number;    // defensive_power / edge_count

    // Components (for player tooltip breakdown)
    personnel: number;           // Raw headcount
    equipment_score: number;     // Weighted equipment effectiveness
    morale_avg: number;          // Average morale (0-100)
    cohesion_avg: number;        // Average cohesion (0-100)
    fatigue_avg: number;         // Average fatigue (0-30)
    entrenchment_avg: number;    // Average entrenchment turns
    officer_quality: number;     // Corps + brigade officer composite
    terrain_avg: number;         // Average terrain multiplier
    supply_state: string;        // adequate/strained/critical

    // Derived assessments
    edge_count: number;          // Front edges to defend
    brigade_count: number;       // Active brigades in sector
    reserve_count: number;       // Reserve brigades available

    // Comparative
    strength_class: 'fortress' | 'strong' | 'adequate' | 'thin' | 'critical';
    // fortress: defense_per_edge > 2× avg attacker brigade power
    // strong: > 1.5×
    // adequate: > 1.0×
    // thin: > 0.5×
    // critical: ≤ 0.5×
}
```

**How offensive_power is computed:**
```
For each brigade in sector:
  brigPower = computeAttackerPower(state, brigade, supply, 'attack', avgTerrainMult)
  if brigade.personnel < 500: brigPower *= 0  // combat ineffective

offensive_power = sum(brigPower) × concentration_potential
```
Where `concentration_potential` = bonus from being able to concentrate 2-4 brigades (getConcentrationBonus).

**How defensive_power is computed:**
```
For each brigade in sector:
  brigDefPower = computeDefenderPower(state, brigade, representativeOsid, terrainMult, ...)

totalSectorDefense = sum(brigDefPower)
defense_per_edge = totalSectorDefense / edge_count
  + reactive reserves (REACTIVE_DEFENSE_RATIO × reserve power)
  + garrison power (enclave civilian defense)
```

**Pipeline step:** `compute-sector-combat-ratings` — runs after `partition-corps-front-sectors`, before bot AI decisions. Stores in `state.military.sector_combat_ratings: Record<string, SectorCombatRating>`.

**Bot AI uses this:** Instead of per-battle prediction, the bot can see "this sector is 'thin' — reinforce" or "enemy sector is 'critical' — attack here."

**Player sees this:** In the sector panel, show:
- **Defensive Strength: 6,800** (Strong) — with tooltip breaking down personnel, equipment, morale, terrain, entrenchment, officers
- **Offensive Capacity: 4,200** — with tooltip showing available attack brigades and concentration potential
- **Front Coverage: 12 brigades / 18 edges** — not "thin density" but actual numbers

### Files
- NEW: `src/sim/combat/sector_combat_rating.ts`
- EDIT: `src/sim/turn_phases/war_phases.ts` (add pipeline step)
- EDIT: `src/state/game_state.ts` (add `sector_combat_ratings` to military)
- EDIT: `src/ui/map/components/CorpsFrontPanel.tsx` (display ratings)

---

## Change 2: Enclave Capital Defense ("Fall Back to Town")

### Problem
Goražde town falls at w10 because the 801st Light was beaten 3 times at outer OSIDs and pushed to `op:cajnice:batotici` — far from home. No mechanic forces retreat TOWARD the enclave capital.

### Historical Evidence
BB2 p.479: When VRS broke through from multiple axes, ARBiH defenders consolidated on successive defensive lines closer to Goražde town. The 43rd Drina "hung on at Gradina — the key to ARBiH defenses — despite repeated VRS attempts to capture it." Forces compressed inward concentrically.

BB2 p.480: ARBiH suffered 300 KIA / 1,000 WIA (16% casualty rate) defending Goražde — they fought hard, not scattered.

### Design

**A. Enclave retreat gravity**

In `getFriendlyRetreatDestinations()` (attack_resolution_osid.ts), when the retreating brigade belongs to an enclave:

```typescript
// After computing all friendly adjacent OSIDs, sort by:
// 1. Distance to enclave capital (fewer hops = better)
// 2. Fewest enemy neighbors (existing logic)
// Enclave brigades ALWAYS prefer retreating toward the capital
```

This is the critical fix. The 801st Light should retreat from `kolovarice` to an OSID closer to `gorazde_2`, not further away.

**B. Enclave capital "last stand"**

When the enclave capital OSID itself is attacked and a defender IS present:
- `defend_at_all_costs` posture auto-applied (1.60× defense, highest in game)
- Morale absorption triggers on ALL outcomes except `decisive_victory` (not just `costly_victory`)
- No retreat from the capital — fight to the last. If attacker wins decisive, brigade takes emergency retreat penalties but the OSID still falls.

When the enclave capital is attacked and NO defender is present:
- Garrison power (already implemented) provides the defense
- But the garrison power should be HIGHER for the capital OSID specifically

**C. Goražde-specific fixes**

| Parameter | Before | After | Rationale |
|-----------|--------|-------|-----------|
| resilience_start_turn | 16 | 0 | Goražde had organized TDF defense from April 1992 (BB2 p.478) |
| initial_resilience | 0 | 15 | Less than Sarajevo (20) but still significant — ~37k prewar pop |
| ALWAYS_BESIEGED_ENCLAVES | {sarajevo} | {sarajevo, gorazde} | Goražde was besieged from the start |
| capital_osid | (none) | gorazde_2 | New field on EnclaveDefinition — the OSID that must fall last |
| capital_garrison_mult | (none) | 2.0 | Capital OSID gets 2× garrison power |

**D. Corps assignment for enclave brigades**

Investigation found all 7 Goražde brigades have `corps: undefined` at w40. Without corps, they're outside the sector system entirely. Fix: ensure enclave brigades maintain corps assignment even when cut off. The East Bosnian OG was a functional command structure (BB2 p.478: "Colonel Ferid Buljubašić's East Bosnian Operational Group").

### Files
- EDIT: `src/sim/combat/enclave_resilience.ts` (Goražde config, capital_osid, capital_garrison_mult)
- EDIT: `src/sim/combat/attack_resolution_osid.ts` (retreat gravity, last stand)
- EDIT: `src/sim/combat/combat_predictor.ts` (mirror retreat gravity for prediction)
- EDIT: `src/sim/combat/combat_math.ts` (last stand posture logic)

---

## Change 3: Zombie Brigade Dissolution

### Problem
19 active brigades at 100-500 personnel. `arbih_808th_liberation`: 100 pers, cohesion 8, morale 0 — walking dead. Dissolution requires ALL THREE of `personnel < 200 AND cohesion ≤ 10 AND readiness === 'degraded'`. Almost never met because `readiness` rarely reaches `degraded`.

### Historical Evidence
BB1 p.455: "9th Grahovo Light Infantry Brigade... may have earlier been destroyed." Brigades WERE destroyed in the Bosnian War. BB1 p.443: After Srebrenica fell, survivors were "reconstituted" into a new 28th Division — the old units ceased to exist.

BB2 p.480: Goražde defenders at 16% casualty rate were "severely degraded" but persisted as units. The pattern: gradual attrition → combat ineffectiveness → eventual dissolution or absorption, NOT immortal zombie persistence.

### Design

**A. Relaxed dissolution criteria** (OR logic instead of AND-all-three):

```typescript
// Current: ALL three required (almost never triggers)
// New: TWO of three triggers dissolution check

const isDissolving = (
    (personnel < DISSOLUTION_PERSONNEL_THRESHOLD && cohesion <= DISSOLUTION_COHESION_THRESHOLD) ||
    (personnel < DISSOLUTION_PERSONNEL_THRESHOLD && morale <= DISSOLUTION_MORALE_THRESHOLD) ||
    (cohesion <= DISSOLUTION_COHESION_THRESHOLD && morale <= DISSOLUTION_MORALE_THRESHOLD)
);
```

New constants:
```typescript
DISSOLUTION_PERSONNEL_THRESHOLD = 300  // was 200
DISSOLUTION_COHESION_THRESHOLD = 15    // was 10
DISSOLUTION_MORALE_THRESHOLD = 10      // NEW
```

A brigade at 100 personnel + morale 0 dissolves. A brigade at 250 personnel + cohesion 12 + morale 8 dissolves. A brigade at 400 personnel + cohesion 50 + morale 60 does NOT dissolve (healthy enough).

**B. Combat ineffective check** — brigades below 500 personnel cannot attack:

In bot brigade AI, before issuing attack orders:
```typescript
if (formation.personnel < MIN_ATTACK_PERSONNEL) {
    // Cannot attack. Request withdrawal/reconstitution.
    return { action: 'withdraw', reason: 'combat_ineffective' };
}
```
`MIN_ATTACK_PERSONNEL = 500`

This prevents the n524 pattern where 300-person brigades attack repeatedly at PR 0.17-0.44.

**C. Morale collapse desertion** — sustained zero morale causes attrition:

In `morale_drift.ts`, when morale has been 0 for 3+ consecutive turns:
```typescript
// Desertion: 5% personnel loss per turn at zero morale
if (formation.morale <= 0 && (formation.ops?.zero_morale_turns ?? 0) >= 3) {
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL,
        Math.floor(formation.personnel * 0.95));
}
```

This creates organic dissolution: zero morale → desertion → personnel drops → dissolution triggers. No hard kill switch needed.

### Files
- EDIT: `src/sim/brigade_dissolution.ts` (relaxed criteria)
- EDIT: `src/sim/combat/bot_brigade_ai_osid.ts` (combat ineffective check)
- EDIT: `src/sim/morale_drift.ts` (desertion at sustained zero morale)
- NEW constant: `MIN_ATTACK_PERSONNEL = 500` in `formation_constants.ts`

---

## Change 4: Casualty Volume

### Problem
24.2k total casualties vs 40-60k historical target. Base loss rates already raised (0.06/0.042). The gap comes from:
1. Too few battles (138 vs ~200+ expected)
2. Decisive victories produce asymmetric casualties (avg 52 att / 109 def) — low total
3. Morale absorption rarely triggers (RS morale floor 70 is high)
4. Bombardment casualty multiplier undertuned

### Design

**A. Lower RS morale resist floor: 70 → 55**

At floor 70, RS defenders rarely absorb (most RS units below 70 morale by w20). At 55, RS defenders absorb costly_victory outcomes more often → both sides take 1.35× extra casualties → total casualty volume increases. Historical: VRS troops held ground tenaciously when under pressure.

**B. Increase bombardment casualty multiplier**

```typescript
MAX_BOMBARDMENT_CAS_MULT = 2.2  // was 1.8 — up to 120% extra defender casualties
BOMBARDMENT_DIVISOR = 60         // was 80 — full effect at less firepower
```

Historical: VRS artillery bombardment was the primary casualty-inflicting mechanism throughout the war. ~500,000 mortar/artillery/tank rounds fired at Sarajevo alone. The sim underweights artillery's role in causing casualties even when it doesn't cause retreats.

**C. Increase morale absorption multiplier**

```typescript
MORALE_ABSORPTION_CAS_MULT = 1.6  // was 1.35 — bloodier "hold at all costs"
```

When defenders refuse to retreat, the resulting close-quarters fighting is MUCH bloodier than a clean victory. Historically, Bosnian War frontline combat was grinding attrition, not clean operational maneuver.

**D. Stalemate/repulsed should still cause meaningful casualties**

Current stalemate defender mod = 0.8, repulsed = 0.5. These are too low — a repulsed attack still involves hours of fighting. Increase:
```typescript
OUTCOME_DEFENDER_MOD.stalemate = 1.0  // was 0.8
OUTCOME_DEFENDER_MOD.repulsed = 0.7   // was 0.5
```

### Files
- EDIT: `src/sim/combat/combat_math.ts` (resist floor, bombardment, outcome mods)
- EDIT: `src/sim/combat/attack_resolution_osid.ts` (absorption multiplier)

---

## Change 5: Player-Facing Clarity

### Problem
The player sees "thin density" and "sector coverage penalty" — meaningless jargon. They need to see numbers that make sense to a military commander.

### Design

**Sector panel shows:**
```
═══ SECTOR: 1st Krajina Corps — Posavina ═══

DEFENSE                          OFFENSE
────────────────                 ────────────────
Total Power:  8,400 (Strong)     Available:  4,200
Per Edge:       467              Brigades:   3 ready
Edges:           18              Best target: op:derventa:derventa
Reserves:     2,100              Predicted:  Victory (1.6:1)

COMPOSITION
────────────────────────────────────
Brigades:    12 (3 reserve, 1 disrupted)
Personnel:   8,240 total
Equipment:   24 tanks, 18 artillery
Avg Morale:  62  Avg Cohesion: 71
Avg Fatigue: 12  Entrenchment: 4.2 turns
Officers:    Col. Talić (competence 4)
Supply:      Adequate

COMPARISON TO ENEMY
────────────────────────────────────
Enemy sector est: ~5,200 defense
Our advantage:     1.6:1 offensive
Their advantage:   1.2:1 if they attack us
```

**Battle report shows:**
```
═══ BATTLE: op:gorazde:gorazde_2 — Week 10 ═══

ATTACKER: rs_ajnie_brigade (VRS Herzegovina)
  Power: 4,120
  ├─ Personnel: 1,800 × equipment 0.72 × exp 0.88 × cohesion 0.76
  ├─ Officer: Col. Lazić (×1.08)
  ├─ Heavy weapons: 12 tanks, 8 artillery (×1.45)
  └─ Operation bonus: ×1.30

DEFENDER: Militia garrison only
  Power: 449
  ├─ Garrison: 37,000 pop × 5% mobilized × 15% effective
  ├─ Enclave resilience: ×1.30 (resilience 15)
  └─ No brigade present — enclave capital undefended!

Ratio: 9.18:1 → DECISIVE VICTORY
Casualties: 6 attacker / 35 defender
```

This makes it immediately obvious WHY things happen. No mystery.

### Files
- EDIT: `src/ui/map/components/CorpsFrontPanel.tsx`
- EDIT: `src/ui/map/components/BattleReport.tsx` (or equivalent)
- Uses data from `sector_combat_ratings` (Change 1)

---

## Implementation Order

| Phase | Change | Risk | Dependencies |
|-------|--------|------|-------------|
| 1 | Sector Combat Rating (Change 1) | Low — read-only computation | None |
| 2 | Zombie Dissolution (Change 3) | Medium — changes force structure | None |
| 3 | Enclave Capital Defense (Change 2) | Medium — retreat logic change | None |
| 4 | Casualty Volume (Change 4) | High — tuning constants | Needs calibration run |
| 5 | Player-Facing Clarity (Change 5) | Low — UI only | Change 1 complete |

Phases 1-3 are independent and can be parallelized. Phase 4 needs a calibration run after 1-3 to see new baseline. Phase 5 is UI-only after Phase 1.

---

## Calibration Targets (post-implementation)

| Metric | n524 (current) | Target | Notes |
|--------|---------------|--------|-------|
| Total casualties | 24.2k | 35-50k | Raised via bombardment + absorption + stalemate mods |
| Early war success | 100% | 80-90% | Some early attacks should fail (hasty ARBiH defense) |
| Late war success | 80.2% | 40-60% | Better sector defense + zombie dissolution |
| Goražde town | Falls w10 | Holds through w40 | Enclave capital last stand |
| Sarajevo core | Holds (RS 5/RBiH 4) | Holds (RS 5/RBiH 4) | Maintain n527 fix |
| Zombie brigades | 19 | <5 | Dissolution + combat ineffective check |
| HVO attacks | 0 | 20-40 | Not addressed here — separate issue |
| Area-weighted | 87.7% | >85% | Must not regress |

---

## Determinism Checklist

- [ ] No Math.random() in any new code
- [ ] No Date.now() or timestamps
- [ ] Sorted iteration in sector_combat_rating.ts (use strictCompare)
- [ ] New state field `sector_combat_ratings` — deterministic from sector assignments
- [ ] Dissolution order: sorted by formation ID (strictCompare)
- [ ] Retreat destination tie-breaking: sorted by OSID (strictCompare)

---

## Test Plan

1. **Unit: sector_combat_rating.ts** — given known formations + sectors, verify offensive/defensive power matches hand calculation
2. **Unit: enclave retreat gravity** — given Goražde enclave, verify retreat goes toward capital, not away
3. **Unit: dissolution relaxed criteria** — verify 2-of-3 triggers correctly
4. **Unit: combat ineffective** — verify <500 personnel blocks attack orders
5. **Integration: 40w run** — verify Goražde town holds, zombies dissolve, casualties increase
6. **Regression: vitest full suite** — no existing test breakage

---

## Canon Impact

- **Sector combat rating** — new derived state, no canon change needed
- **Enclave capital defense** — extends existing enclave system; consistent with Rulebook enclave mechanics
- **Dissolution** — relaxing existing criteria; consistent with Game Bible force lifecycle
- **Casualty constants** — tuning existing values; no structural canon change
- **Player display** — UI improvement; no canon impact

No FORAWWV changes needed. No cross-phase conflicts.
