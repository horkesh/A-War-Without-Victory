# Morale-Victory Feedback: Anti-Steamroller Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent RS morale steamroller and ARBiH death spiral by adding diminishing returns on battle morale, faction-differentiated sensitivity, and existential defense floors.

**Architecture:** Modify drift path only (`morale_drift.ts`). Immediate shock path in `attack_resolution_osid.ts` stays untouched. New constants in `morale_drift.ts`. One new field on `FormationState`.

**Tech Stack:** TypeScript, Vitest

**Stage:** 1 of 2 (safe battle morale refinements only; Stage 2 = fatigue cap + war weariness)

---

## Research Summary

### Current System (Two Paths)

**Path 1 — Immediate shock (`attack_resolution_osid.ts:1124-1142`):**
- Attacker: decisive +3, victory +1, costly 0, stalemate -2, repulsed -5, catastrophic -10
- Defender: flip -5, hold +1
- **NOT MODIFIED in Stage 1**

**Path 2 — Drift reflection (`morale_drift.ts:53-60`):**
- `BATTLE_MORALE_DRIFT`: decisive +5, victory +3, costly +1, stalemate 0, repulsed -2, catastrophic -4
- Applied once per turn via `recent_battle_outcome`, then cleared
- **THIS IS WHAT WE MODIFY**

Combined: decisive victory attacker gets +3 immediate + +5 drift = +8 total per battle.

### Problems

1. **RS Steamroller**: 150+ attacks in w0-12 blitz. At +8 per decisive victory, RS morale hits 100 by w4 and stays pinned. Victory breeds more victory with no diminishing returns.
2. **ARBiH Death Spiral**: Early defeats stack. Low affinity areas give -2/turn drift. By w10, ARBiH morale can hit critical (15), triggering cohesion cascade → dissolution.
3. **No war weariness**: VRS morale should decay organically from w26+ (DEFERRED to Stage 2).

### Historical Grounding (Historian Agent, BB-sourced)

- VRS morale: 80-90 (1992) → 45-60 (1994) → 30-50 (1995). Decay from economy/extended duty/weariness, NOT battlefield defeats.
- ARBiH morale: 30-50 (1992) → 55-70 (1994). Sustained by existential threat, homeland defense, no alternative.
- Diminishing returns on victory: first victory euphoric, 20th meaningless.
- VRS has LOWER morale floor than ARBiH (soldiers could desert home to Serbia; ARBiH had nowhere to go).
- All factions became "numb" to combat by late 1993.

---

## Design

### Mechanic 1: Battle Habituation (Diminishing Returns)

Track `battle_outcome_count` on each formation. Every time `recent_battle_outcome` is consumed in drift, increment the counter. Counter never resets.

**Formula:** `habituation = 1 / (1 + battle_outcome_count * BATTLE_HABITUATION_RATE)`

With `BATTLE_HABITUATION_RATE = 0.03`:
- After 0 battles: 1.00× (full effect)
- After 10 battles: 0.77×
- After 20 battles: 0.62×
- After 40 battles: 0.45×

Applied to ALL drift values (positive and negative). War-weary troops are numb to everything — the 30th battle barely registers whether you win or lose. This naturally caps RS morale growth AND softens ARBiH death spirals simultaneously.

### Mechanic 2: Faction Sensitivity Multipliers

Asymmetric morale reaction by faction. Applied multiplicatively AFTER habituation.

**Victory sensitivity** (positive drift values):
| Faction | Multiplier | Rationale |
|---------|-----------|-----------|
| RS | 0.8 | Winning is expected (JNA inheritance) |
| RBiH | 1.3 | Each victory proves the army is real |
| HRHB | 1.0 | Baseline |

**Defeat sensitivity** (negative drift values):
| Faction | Multiplier | Rationale |
|---------|-----------|-----------|
| RS | 1.3 | Losing is shocking (professional army shouldn't lose) |
| RBiH | 0.7 | Expect to suffer (existential determination) |
| HRHB | 1.0 | Baseline |

### Mechanic 3: Faction-Differentiated Home Morale Floors

Replaces flat `HOME_GROUND_MORALE_FLOOR = 15` for home defenders:

| Faction | Floor | Rationale |
|---------|-------|-----------|
| RBiH | 30 | Nowhere to go — fight or die |
| HRHB | 25 | Croatian homeland, but Croatia exists as fallback |
| RS | 20 | Can desert home to Serbia proper |

### Mechanic 4: RBiH Existential Defense Floor

ARBiH formations in co-ethnic majority areas (affinity > 0.50) get morale floor 25, even without `home_defense_active`. Models the "cornered rat" — ARBiH soldiers defending Bosniak towns they aren't from still fight with determination. Weaker than home defense floor (25 vs 30) but applies more broadly.

RS and HRHB do NOT get this — their soldiers can leave Bosnia.

### Combined Formula

```
baseDrift = BATTLE_MORALE_DRIFT[outcome]
habituation = 1 / (1 + battle_outcome_count * 0.03)
sensitivity = baseDrift >= 0 ? VICTORY_SENSITIVITY[faction] : DEFEAT_SENSITIVITY[faction]
finalDrift = Math.round(baseDrift * habituation * sensitivity)
```

### Worked Examples

**RS decisive victory, turn 1 (0 battles):**
`+5 × 1.00 × 0.8 = +4.0 → +4` (vs current +5)

**RS decisive victory, turn 20 (20 battles):**
`+5 × 0.625 × 0.8 = +2.5 → +3` (vs current +5)

**ARBiH catastrophic defeat, turn 1 (0 battles):**
`-4 × 1.00 × 0.7 = -2.8 → -3` (vs current -4)

**ARBiH catastrophic defeat, turn 20 (20 battles):**
`-4 × 0.625 × 0.7 = -1.75 → -2` (vs current -4)

**ARBiH at morale 20 in Bosniak-majority town:**
Floor holds at 25 (existential), prevents death spiral cascade.

---

## Data Model Changes

### FormationState (game_state.ts)

```typescript
battle_outcome_count?: number;  // Incremented each time recent_battle_outcome consumed in drift
```

### New Constants (morale_drift.ts)

```typescript
const BATTLE_HABITUATION_RATE = 0.03;

const FACTION_VICTORY_SENSITIVITY: Record<string, number> = {
    RS: 0.8,    // Winning is expected
    RBiH: 1.3,  // Each win proves the army is real
    HRHB: 1.0,  // Baseline
};

const FACTION_DEFEAT_SENSITIVITY: Record<string, number> = {
    RS: 1.3,    // Losing is shocking
    RBiH: 0.7,  // Expect to suffer
    HRHB: 1.0,  // Baseline
};

const FACTION_HOME_MORALE_FLOOR: Record<string, number> = {
    RS: 20,     // Can desert to Serbia
    RBiH: 30,   // Nowhere to go
    HRHB: 25,   // Croatia as fallback
};

const RBIH_EXISTENTIAL_FLOOR = 25;
const EXISTENTIAL_AFFINITY_THRESHOLD = 0.50;
```

---

## Testing Strategy

New file: `tests/morale_victory_feedback.test.ts`

1. Habituation scaling — after 0, 10, 20, 40 battles, verify diminishing multiplier
2. RS decisive victory drift — verify 0.8× faction sensitivity
3. ARBiH catastrophic defeat drift — verify 0.7× faction sensitivity
4. HRHB baseline — verify 1.0× both directions
5. Combined habituation + sensitivity — full pipeline with Math.round()
6. `battle_outcome_count` increments — persists across multiple drift runs
7. Faction home morale floors — RS 20, RBiH 30, HRHB 25 replace flat 15
8. RBiH existential floor — morale floor 25 at co-ethnic >50% without home_defense_active
9. RBiH existential floor skipped — no floor at co-ethnic <50%
10. Non-RBiH no existential floor — RS/HRHB don't get it

**Calibration**: 40w scenario run after implementation, compare against n617 baseline.

---

## Alternatives Registry

If calibration results are unsatisfactory, try these alternatives in order of risk:

### A1: Habituation Rate
- **Chosen:** `0.03` (62% at 20 battles, 45% at 40)
- Try if too weak (RS still steamrolls): `0.05` (50% at 10, 33% at 20)
- Try if too strong (morale flat): `0.02` (71% at 20, 56% at 40)
- Nuclear: `0.08` (38% at 10 — very aggressive)

### A2: Habituation Formula
- **Chosen:** `1 / (1 + count * rate)` — hyperbolic, smooth, never zero
- Alt: `Math.max(0.3, 1 - count * 0.02)` — linear with floor (simpler, harsher cap)
- Alt: `Math.pow(0.97, count)` — exponential decay (faster initial drop, long tail)

### A3: What Counter Tracks
- **Chosen:** Total battles (wins + losses both increment)
- Alt: Victory-only counter (resets on defeat) — targets steamroller only, worsens death spiral
- Alt: Separate win/loss counters with different rates — more complex but precise

### A4: Faction Victory Sensitivity
- **Chosen:** RS 0.8, RBiH 1.3, HRHB 1.0
- Try if RS steamrolls: RS 0.6, RBiH 1.5
- Try if ARBiH morale too high: RBiH 1.1
- Alt: Time-varying — RS starts 1.0 → 0.6 by w20

### A5: Faction Defeat Sensitivity
- **Chosen:** RS 1.3, RBiH 0.7, HRHB 1.0
- Try if RS collapses too fast: RS 1.1
- Try if ARBiH still death-spirals: RBiH 0.5
- Alt: Affinity-gated — RBiH 0.5 in co-ethnic, 0.9 elsewhere

### A6: Home Morale Floors
- **Chosen:** RS 20, RBiH 30, HRHB 25
- Try if ARBiH still collapses: RBiH 35
- Try if RS too sticky: RS 15 (revert to original)
- Alt: Dynamic floors (RBiH floor rises as they professionalize)

### A7: RBiH Existential Floor
- **Chosen:** Floor 25, affinity threshold 0.50
- Alt: Floor 20 (weaker) or 30 (same as home defense)
- Alt: Threshold 0.40 (broader) or 0.60 (narrower)
- Alt: Apply to HRHB too in Croat-majority areas at floor 20

### A8: Rounding
- **Chosen:** `Math.round()` — symmetric
- Alt: `Math.floor()` — systematically weakens all effects (conservative)
- Alt: `Math.trunc()` — dampens both directions

### A9: Stalemate Asymmetry (DEFERRED)
- Not in Stage 1 — current stalemate values unchanged
- If needed: attacker stalemate drift -1.5 (was 0), defender stalemate drift +1 (was 0)

### A10: War Weariness Drain (STAGE 2)
- Not in Stage 1 — organic per-turn drain
- When ready: RS -0.2/turn from w26, RBiH -0.1/turn from w52
- New drift source in morale_drift.ts after battle outcome block

### A11: Shock Path Modification (STAGE 2)
- Not in Stage 1 — immediate morale in attack_resolution_osid.ts untouched
- If drift-only insufficient: apply same habituation + sensitivity to shock path
- Risk: deeply entangled with retreat/flip/casualty logic

### A12: Two-Path Unification (STAGE 3)
- Merge immediate and drift into single coherent system
- High calibration risk — requires full retuning
- Only if Stage 1+2 produce inconsistent behavior
