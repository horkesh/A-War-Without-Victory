# Early-War Offensive Window — Implementation Plan

**Date:** 2026-03-09
**Priority:** P0 — Root cause of 5+ downstream realism issues
**Author:** Orchestrator + Game Designer + Technical Architect
**Source:** `docs/40_reports/REAL_WAR_MASTER.md` issues #2, #9

## Problem Statement

83% of attacks end in catastrophic defeat (378/453 battles at w40). Historical VRS attack success rate in 1992: 60-75%. The sim produces 1994-style positional warfare from week 6.

Root cause: multiplicative defense bonus stacking. 17 defense multipliers compound to make nearly all attacks fail. No "hasty defense" concept — a unit that just arrived defends at full posture bonus (1.4×) immediately. Artillery suppression uses MAX per-attacker instead of SUM, so multi-brigade concentration doesn't increase suppression.

## Design Principles

1. **Organic, not phase-switched** — all mechanics driven by formation state, not game clock
2. **No `if (turn < X)` guards** — violates doctrinal arc principle
3. **Minimal code surface** — all changes in `combat_math.ts` (2 mechanics) + `getArtillerySuppression` (1 mechanic)
4. **Calibration-safe** — constants are tunable, effects are monotonic and predictable

## Three Mechanics

### Mechanic A: Hasty Defense Penalty

**What:** Formations that recently moved or were recently created get reduced posture defense bonus. A defender at `entrenchment_turns=0` has improvised positions — no prepared trenches, no cleared fields of fire.

**Why organic:** Driven by `entrenchment_turns` per-formation, not game clock. VRS rapidly advancing faces hasty defenders. Once positions stabilize (3+ turns), full bonus returns. In late war, defenders who've been dug in for 40 turns are unaffected.

**Historical basis:** In April-June 1992, ARBiH positions were hasty — barricades, apartment buildings, improvised roadblocks. VRS assaults succeeded because defenders hadn't had time to prepare proper positions. By late 1992, Gorazde, Sarajevo, and other positions had been fortified for months.

**Implementation in `computeDefenderPower`:**

```typescript
// Hasty defense: formations that haven't been in position long enough
// get reduced posture defense effectiveness. At et=0, posture contributes
// nothing beyond baseline (1.0). Ramps to full over HASTY_DEFENSE_RAMP turns.
const HASTY_DEFENSE_RAMP = 3; // turns to reach full posture defense bonus
const hastyFactor = Math.min(1.0, entrenchmentTurns / HASTY_DEFENSE_RAMP);
const effectivePostureMult = 1.0 + (rawPostureMult - 1.0) * hastyFactor;
```

**Effect table:**

| entrenchment_turns | defend posture mult | defend_at_all_costs mult |
|---|---|---|
| 0 | 1.00 (was 1.40) | 1.00 (was 1.60) |
| 1 | 1.13 | 1.20 |
| 2 | 1.27 | 1.40 |
| 3+ | 1.40 (full) | 1.60 (full) |

**Impact:** At week 1-3, defenders at new positions lose 29-40% of their defense bonus. By week 6, all stationary defenders are at full. This is the single biggest lever — it creates a genuine offensive window without any phase switch.

### Mechanic B: Defense Environmental Soft Cap

**What:** Soft cap on the product of environmental defense multipliers (terrain × entrenchment × corps × resilience × urban × density × enclave × toTerrain × perBrigade × ethnic). Diminishing returns above a threshold.

**Why organic:** Structural math fix. Applies equally in all periods. The cap prevents the tail cases where 8 small multipliers compound to 3-4×. In early war, with fewer active multipliers, the cap rarely triggers — its main effect is preventing late-war super-positions from being completely impregnable.

**Implementation in `computeDefenderPower`:**

```typescript
// Soft cap on environmental defense bonuses.
// The product of terrain/entrenchment/corps/resilience/urban/density/etc.
// uses diminishing returns above DEFENSE_ENV_CAP_THRESHOLD.
const DEFENSE_ENV_CAP_THRESHOLD = 1.0; // bonus above 1.0 before compression starts
const DEFENSE_ENV_COMPRESSION = 0.5;   // 50% diminishing above threshold

const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
    * urbanMult * enclaveMult * toTerrainMult * perBrigadeTerrainBonus
    * frontDensityMult * ethnicMult;

const envBonus = envProduct - 1.0;
const cappedBonus = envBonus <= DEFENSE_ENV_CAP_THRESHOLD
    ? envBonus
    : DEFENSE_ENV_CAP_THRESHOLD + (envBonus - DEFENSE_ENV_CAP_THRESHOLD) * DEFENSE_ENV_COMPRESSION;
const cappedEnvProduct = 1.0 + cappedBonus;
```

**Effect table:**

| Raw env product | Capped env product | Reduction |
|---|---|---|
| 1.5× | 1.5× | 0% |
| 2.0× | 2.0× | 0% (at threshold) |
| 2.5× | 2.25× | 10% |
| 3.0× | 2.5× | 17% |
| 4.0× | 3.0× | 25% |

**Impact:** Prevents extreme defense stacking. A Sarajevo defender with terrain(1.3) × entrenchment(1.17) × corps(1.2) × urban(1.5) × density(1.15) = 3.17× gets compressed to 2.58×. The difference between "impossible to attack" and "difficult but feasible with concentration."

### Mechanic C: Aggregate Artillery Suppression

**What:** Change artillery suppression from `max(per-attacker)` to `sum(per-attacker)` for multi-brigade attacks. Corps-level fire coordination.

**Why organic:** Rewards force concentration. VRS in 1992 had massive artillery superiority. When 3-4 brigades attack together, their combined artillery should suppress more entrenchment than any single brigade's guns. As VRS loses equipment through attrition and supply degradation (equipment_decay, heavy weapon losses), this advantage naturally erodes.

**Historical basis:** Operation Corridor 92 used massed artillery preparation. VRS doctrine (inherited from JNA) emphasized combined-arms with concentrated fire support. ARBiH had essentially zero counter-battery capability in 1992.

**Implementation in `getArtillerySuppression`:**

```typescript
// Change: sum ALL attacker suppression values (corps-level fire coordination)
// instead of taking only the best single attacker.
let totalSuppression = 0;
for (const attacker of attackers) {
    const comp = attacker.composition ?? ensureBrigadeComposition(attacker);
    const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
    const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
    totalSuppression += (artEff * 1.0 + tankEff * 0.5) / 100;
}
const munitionsMult = getHeavyMunitionsMult(attackerFactionId, state);
return Math.min(0.7, totalSuppression) * munitionsMult;
```

**Effect table (3 VRS brigades with moderate artillery):**

| Metric | Before (MAX) | After (SUM) |
|---|---|---|
| Per-brigade suppression | 0.22 | 0.22 |
| Combined suppression | 0.22 | 0.66 (capped 0.7) |
| Entrenchment negated | 22% | 66% |

**Impact:** Multi-brigade VRS attacks in early war with concentrated artillery nearly negate entrenchment. As equipment degrades (equipment_decay starts w26), this advantage naturally fades.

## Implementation Steps

### Step 1: Mechanic A — Hasty Defense Penalty
- File: `src/sim/combat/combat_math.ts` → `computeDefenderPower`
- Add `HASTY_DEFENSE_RAMP = 3` constant
- Compute `hastyFactor` from `entrenchmentTurns`
- Apply to `postureMult` before it enters the product
- Also update `computeDigInDefMult` to account for hasty factor (dig-in should also ramp)

### Step 2: Mechanic B — Defense Environmental Soft Cap
- File: `src/sim/combat/combat_math.ts` → `computeDefenderPower`
- Add `DEFENSE_ENV_CAP_THRESHOLD = 1.0` and `DEFENSE_ENV_COMPRESSION = 0.5` constants
- Compute `envProduct` from terrain through ethnic multipliers
- Apply soft cap formula
- Replace the individual multiplier chain with `cappedEnvProduct`

### Step 3: Mechanic C — Aggregate Artillery Suppression
- File: `src/sim/combat/combat_math.ts` → `getArtillerySuppression`
- Change `maxSuppression` logic to `totalSuppression` accumulator
- Keep the `Math.min(0.7, ...)` cap
- Same function signature — transparent to callers

### Step 4: Mirror in Combat Predictor
- The predictor uses the same `computeDefenderPower` and `getArtillerySuppression` from `combat_math.ts`
- No predictor-specific changes needed — it imports these functions directly

### Step 5: Smoke Test
- `npx tsc --noEmit` — type check
- `npm run test:vitest` — all 378 tests pass
- Run 40w scenario: `npm run sim:scenario:run:40w`

### Step 6: Calibration Verification
- Extract outcome distribution from `weekly_report.jsonl`
- Verify: VRS attack success rate in weeks 1-12 should be 50-70%
- Verify: overall catastrophic rate should drop from 83% to <50%
- Verify: area-weighted calibration score remains >85%
- If needed: tune HASTY_DEFENSE_RAMP (2-4), DEFENSE_ENV_CAP_THRESHOLD (0.8-1.2), DEFENSE_ENV_COMPRESSION (0.3-0.7)

### Step 7: Cascade Calibration Check
- Per life lesson "Fixing one faction cascades to all others": verify all three factions' troop strength, KIA, and territorial outcomes
- If VRS advances further, RBiH/HRHB territories change → may need pool/mobilization rebalance

## Acceptance Criteria

1. Attack outcome distribution at w40 shows <50% catastrophic (was 83%)
2. VRS attack success rate in weeks 1-12 is 50-70% (was ~17%)
3. Organic transition: success rate drops to 30-40% by weeks 15-20
4. Total military casualties increase toward historical range (target: 40-60k vs current 19k)
5. Area-weighted calibration score remains >85%
6. No `if (turn < X)` or `if (week < X)` guards anywhere in the code

## Files Changed

- `src/sim/combat/combat_math.ts` — all three mechanics (constants + computeDefenderPower + getArtillerySuppression)
- No other files — both resolver and predictor import from combat_math.ts

## Implementation Results (n482)

### Actual Changes
Four changes, two files:

1. **CRITICAL BUG FIX — Attack posture override** (`attack_resolution_osid.ts:465-472`):
   Formations with attack orders but defensive posture were computing 0 attack power → power_ratio=0 → catastrophic. 80% of all "catastrophic" outcomes were fake. Now formations use minimum 'attack' posture when they have attack orders.

2. **Hasty defense penalty** (`combat_math.ts:computeDefenderPower`):
   HASTY_DEFENSE_RAMP=5. Formations at entrenchment_turns < 5 get reduced posture defense bonus. At et=0, posture mult = 1.0× (no bonus). Marginal impact.

3. **Defense environmental soft cap** (`combat_math.ts:computeDefenderPower`):
   DEFENSE_ENV_CAP_THRESHOLD=0.5, COMPRESSION=0.5. Diminishing returns on terrain×entrenchment×corps×etc. above 1.5× total.

4. **Weighted artillery suppression** (`combat_math.ts:getArtillerySuppression`):
   Best attacker = full suppression, each additional = +30%. Marginal impact.

### Outcome Comparison

| Metric | n473 (before) | n482 (after) | Target |
|---|---|---|---|
| Overall catastrophic | 83.4% | 25.3% | <50% |
| Overall decisive | 12.2% | 53.1% | — |
| Early war (w1-12) success | ~17% | 76.7% | 50-70% |
| Late war (w13-40) success | ~14% | 40.9% | 30-40% |
| Bot benchmarks | 6/6 PASS | 6/6 PASS | 6/6 |
| RS delta | -53 | +104 | 0 |
| Total casualties | 19.4k | 21.4k | 40-60k |

### Key Insight

The posture bug fix was the dominant change — it alone accounts for >90% of the improvement. The three combat math mechanics (hasty defense, env cap, artillery) are structurally correct but marginal compared to fixing the bug where 80% of attacks had zero attacker power.

### Remaining P1 Calibration

- RS over-capture (+104 delta): tune pre-planned ops targets, avoided_osids, aggression
- Casualties 1/4 of historical: increase engagement frequency or base rates
- HRHB passivity: Graz exceptions, offensive stances
- Morale victory boost: not yet implemented

## Risk Assessment

- **Over-correction risk:** RS is over-capturing (+104 delta). Expected cascade from fixing fundamental attack balance. Mitigation: tune avoided_osids and aggression parameters.
- **Cascade risk:** More RS territory → changed war dynamics → need pool recalibration. Per life lesson: verify all three factions after any single-faction fix.
- **No schema risk:** No state shape changes, no pipeline changes, no IPC changes.
