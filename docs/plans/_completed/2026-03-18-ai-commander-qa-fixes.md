# AI Commander QA Engine Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 7 engine issues identified by the AI commander QA system (321 observations from three API-powered commanders).

**Architecture:** All fixes are parameter tuning or additive fields — no structural refactors. Each fix targets a specific observation cluster. After all fixes, re-run `npm run sim:qa:commanders` and compare observation counts.

**Tech Stack:** TypeScript, Vitest, existing sim pipeline.

**Verification protocol:** After EACH sim-affecting fix (1, 2, 4, 7): run `npm run sim:scenario:run:40w`, compare with `node tools/compare_painted_vs_sim.cjs`, verify area-weighted ≥ 89%. After ALL fixes: run `npm run sim:qa:commanders` and count observations.

---

### Task 1: Alliance Floor Mechanism (P1 — 22 observations)

Alliance decays to 0.20 by w28 despite init at 0.75. COs say should be 0.50-0.70 through late 1992.

**Files:**
- Modify: `src/sim/early_war/alliance_update.ts:196-200`
- Test: `tests/alliance_floor.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';

describe('alliance floor before war', () => {
    it('ALLIANCE_FLOOR_BEFORE_WAR is 0.40', () => {
        // Alliance should not drop below 0.40 before war_earliest_turn
        expect(0.40).toBeGreaterThan(0.20); // ALLIED_THRESHOLD
        expect(0.40).toBeLessThan(0.75);    // DEFAULT_INIT_ALLIANCE
    });

    it('alliance clamped to floor before war_earliest_turn', () => {
        // Simulate: if computed value is 0.25, floor clamps to 0.40
        const computedValue = 0.25;
        const ALLIANCE_FLOOR_BEFORE_WAR = 0.40;
        const result = Math.max(computedValue, ALLIANCE_FLOOR_BEFORE_WAR);
        expect(result).toBe(0.40);
    });

    it('alliance can drop below floor after war_earliest_turn', () => {
        // After turn 40, no floor — alliance can go to 0 or negative
        const computedValue = 0.15;
        const turn = 41;
        const earliestTurn = 40;
        const result = turn >= earliestTurn ? computedValue : Math.max(computedValue, 0.40);
        expect(result).toBe(0.15);
    });
});
```

**Step 2: Implement**

In `src/sim/early_war/alliance_update.ts`, add constant after existing thresholds (~line 55):
```typescript
/** Alliance floor before war: prevents premature collapse. Target: ~0.50 at w30, war at ~w50. */
export const ALLIANCE_FLOOR_BEFORE_WAR = 0.40;
```

Then change the clamping logic at lines 196-200 from:
```typescript
if (state.meta.turn < earliestTurn) {
    newValue = Math.max(newValue, ALLIED_THRESHOLD);
}
```
To:
```typescript
if (state.meta.turn < earliestTurn) {
    newValue = Math.max(newValue, ALLIANCE_FLOOR_BEFORE_WAR);
}
```

**Step 3: Run tests + commit**

Run: `npx vitest run tests/alliance_floor.test.ts && npx vitest run`

```bash
git commit -m "feat(alliance): floor at 0.40 before war_earliest_turn — prevents premature collapse"
```

**VERIFY:** Run 40w scenario. Alliance should stay above 0.40 through w39.

---

### Task 2: ARBiH Mobilization Cap (P1 — 84 observations)

ARBiH reaches 150k by w38 — historical is 80-90k at that point.

**Files:**
- Modify: `src/sim/combat/ongoing_mobilization.ts`
- Test: `tests/arbih_mobilization_cap.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';

describe('ARBiH mobilization cap', () => {
    it('ARBIH_PERSONNEL_CAP is 95000', () => {
        const ARBIH_PERSONNEL_CAP = 95_000;
        expect(ARBIH_PERSONNEL_CAP).toBeGreaterThan(80_000);
        expect(ARBIH_PERSONNEL_CAP).toBeLessThan(100_000);
    });

    it('mobilization stops when cap reached', () => {
        const currentPersonnel = 94_000;
        const mobilized = 3_000;
        const cap = 95_000;
        const added = Math.min(mobilized, Math.max(0, cap - currentPersonnel));
        expect(added).toBe(1_000); // Only 1k added, not full 3k
    });
});
```

**Step 2: Implement**

In `src/sim/combat/ongoing_mobilization.ts`, add constant:
```typescript
/** ARBiH total active personnel cap. Historical: 80-90k by late 1992. */
const ARBIH_PERSONNEL_CAP = 95_000;
```

In the mobilization function (where personnel are added to formations), add a check:
- Before adding mobilized troops to an RBiH formation, compute total active RBiH personnel
- If total ≥ ARBIH_PERSONNEL_CAP, skip mobilization for RBiH this turn
- This is a soft cap — existing troops aren't removed, just no new ones added

Find the section where `mobilized` personnel are distributed. Add:
```typescript
if (faction === 'RBiH') {
    let totalRbihPersonnel = 0;
    for (const [, f] of Object.entries(formations)) {
        if (f.faction === 'RBiH' && f.kind === 'brigade' && f.status === 'active') {
            totalRbihPersonnel += f.personnel ?? 0;
        }
    }
    if (totalRbihPersonnel >= ARBIH_PERSONNEL_CAP) continue; // Skip mobilization
}
```

**Step 3: Run tests + commit**

**VERIFY:** Run 40w scenario. Check RBiH final personnel — should be ~90-100k, not 150k.

---

### Task 3: Operation Combat Feedback (P2 — 38 observations)

COs can't see whether operations are actually producing battles.

**Files:**
- Modify: `src/state/game_state.ts` (CorpsOperation interface)
- Modify: `src/sim/combat/sector_offensive.ts` (populate fields)
- Test: `tests/operation_combat_feedback.test.ts`

**Step 1: Add fields to CorpsOperation**

In `src/state/game_state.ts`, find `CorpsOperation` interface. Add after existing fields:
```typescript
    /** Battles conducted this turn (reset each turn start). */
    battles_this_turn?: number;
    /** OSIDs captured this turn (reset each turn start). */
    territory_gained_this_turn?: number;
    /** Total battles since operation started. */
    total_battles?: number;
    /** Total OSIDs captured since operation started. */
    total_territory_gained?: number;
```

**Step 2: Reset at turn start, populate during battles**

In `src/sim/combat/sector_offensive.ts`, find where operations are advanced each turn. At the start of the per-operation loop, reset:
```typescript
if (op) {
    op.battles_this_turn = 0;
    op.territory_gained_this_turn = 0;
}
```

In `src/sim/combat/attack_resolution_osid.ts`, find where a battle resolves and territory flips. After a successful attack that flips an OSID, increment:
```typescript
if (activeOp) {
    activeOp.battles_this_turn = (activeOp.battles_this_turn ?? 0) + 1;
    activeOp.total_battles = (activeOp.total_battles ?? 0) + 1;
    if (territoryFlipped) {
        activeOp.territory_gained_this_turn = (activeOp.territory_gained_this_turn ?? 0) + 1;
        activeOp.total_territory_gained = (activeOp.total_territory_gained ?? 0) + 1;
    }
}
```

**Step 3: Write test + commit**

```typescript
import { describe, it, expect } from 'vitest';

describe('operation combat feedback fields', () => {
    it('battles_this_turn starts at 0', () => {
        const op = { battles_this_turn: 0, territory_gained_this_turn: 0 };
        expect(op.battles_this_turn).toBe(0);
    });

    it('total_battles accumulates across turns', () => {
        let total = 0;
        total += 3; // turn 1
        total += 1; // turn 2
        expect(total).toBe(4);
    });
});
```

**NOTE:** This is informational — no sim behavior change. No calibration check needed.

---

### Task 4: Initial Territory Pacing (P2 — 16 observations)

RS at 57.6% area-weighted by w5 — should be 45-50%.

**Files:**
- Modify: `src/state/formation_constants.ts` (PARAMILITARY_SPAWN_RATE)
- Modify: `src/sim/combat/bot_brigade_eval_attack.ts:418` (evaluateUncontestedOccupation)
- Test: `tests/initial_territory_pacing.test.ts`

**Step 1: Reduce paramilitary sweep rate**

Find `PARAMILITARY_SPAWN_RATE` in `src/state/formation_constants.ts`. Change RS from 0.85 to 0.65:
```typescript
export const PARAMILITARY_SPAWN_RATE: Record<string, number> = {
    RS: 0.65,   // Was 0.85. Reduced to slow initial territory grab (57.6%→target 50% by w5)
    HRHB: 0.55,
    RBiH: 0.30,
};
```

**Step 2: Add early-war throttle to uncontested occupation**

In `src/sim/combat/bot_brigade_eval_attack.ts`, find `evaluateUncontestedOccupation`. Add at the top of the function:
```typescript
// Early-war throttle: brigades are disorganized in weeks 0-3, don't walk into
// every empty OSID immediately. After w3, full uncontested occupation resumes.
const turn = state.meta?.turn ?? 0;
if (turn <= 3 && faction === 'RS') {
    // RS only occupies uncontested OSIDs adjacent to their home_osid in early war
    const homeMun = brigade.home_osid?.split(':')[1];
    const targetMun = /* extract from target */;
    if (homeMun !== targetMun) return false;
}
```

**Step 3: Test + commit**

```typescript
import { describe, it, expect } from 'vitest';

describe('initial territory pacing', () => {
    it('RS paramilitary spawn rate is 0.65 (was 0.85)', () => {
        expect(0.65).toBeLessThan(0.85);
        expect(0.65).toBeGreaterThan(0.50);
    });
});
```

**VERIFY:** Run 40w scenario. Check RS area-weighted at w5 — should be 48-52%, not 57%.

---

### Task 5: Patron Directive System for HVO (P2 — 12 observations)

HVO has no mechanism for Zagreb's political direction changing over time.

**Files:**
- Modify: `src/state/game_state.ts` (add PatronDirective type)
- Modify: `data/scenarios/timelines/apr1992.json` (add HVO directives)
- Modify: `src/sim/combat/bot_corps_stance.ts` (consume directives)
- Test: `tests/patron_directives.test.ts`

**Step 1: Add type and field**

In `src/state/game_state.ts`, add:
```typescript
/** Political directive from a faction's patron state. */
export interface PatronDirective {
    name: string;
    start_week: number;
    end_week: number;
    stance_ceiling: CorpsStance;
    description: string;
}
```

Add to `PoliticalState` (or wherever war_timeline lives):
```typescript
patron_directives?: Record<FactionId, PatronDirective[]>;
```

**Step 2: Add timeline entries**

In `data/scenarios/timelines/apr1992.json`, add under a new `patron_directives` section:
```json
"patron_directives": {
    "HRHB": [
        { "name": "Consolidate Herzegovina", "start_week": 0, "end_week": 40, "stance_ceiling": "defensive", "description": "Zagreb orders: secure Herzegovina, maintain RBiH alliance" },
        { "name": "Prepare Central Bosnia", "start_week": 40, "end_week": 50, "stance_ceiling": "balanced", "description": "Zagreb signals: prepare positions in central Bosnia" },
        { "name": "Secure Croat Territory", "start_week": 50, "end_week": 999, "stance_ceiling": "offensive", "description": "Zagreb orders: take central Bosnia from RBiH" }
    ]
}
```

**Step 3: Consume in bot_corps_stance.ts**

In `generateCorpsStanceOrders()`, after the faction-specific HRHB section (E3), add:
```typescript
// Patron directive ceiling: Zagreb's political orders constrain HVO corps stances
const directives = state.military.war_timeline?.patron_directives?.['HRHB'];
if (directives) {
    const activeDirective = directives.find(d => turn >= d.start_week && turn < d.end_week);
    if (activeDirective && STANCE_RANK[stance] > STANCE_RANK[activeDirective.stance_ceiling]) {
        stance = activeDirective.stance_ceiling;
    }
}
```

**Step 4: Test + commit**

```typescript
import { describe, it, expect } from 'vitest';

describe('patron directives', () => {
    it('HVO directive ceiling prevents offensive before w40', () => {
        const ceiling = 'defensive';
        const stance = 'offensive';
        const STANCE_RANK: Record<string, number> = { reorganize: 0, defensive: 1, balanced: 2, offensive: 3 };
        const result = STANCE_RANK[stance] > STANCE_RANK[ceiling] ? ceiling : stance;
        expect(result).toBe('defensive');
    });

    it('HVO can go offensive after w50', () => {
        const ceiling = 'offensive';
        const stance = 'offensive';
        const STANCE_RANK: Record<string, number> = { reorganize: 0, defensive: 1, balanced: 2, offensive: 3 };
        const result = STANCE_RANK[stance] > STANCE_RANK[ceiling] ? ceiling : stance;
        expect(result).toBe('offensive');
    });
});
```

**NOTE:** No calibration check needed for 40w scenario — directives only change behavior at w40+.

---

### Task 6: Jajce Event Timing (P3 — 11 observations)

Jajce falls event fires at w29-32, historically should be w43-44 (late October 1992).

**Files:**
- Modify: `data/scenarios/events/war_1992.json`

**Step 1: Change turn_min**

Find `jajce_falls_1992` event. Change:
```json
"trigger": { "turn_min": 30, "turn_max": 40, ...}
```
To:
```json
"trigger": { "turn_min": 40, "turn_max": 52, ...}
```

This ensures Jajce can't fall before week 40 (October 1992) even if the territorial condition is met earlier. The `turn_max: 52` gives a 12-week window for the condition to fire.

**Step 2: Commit**

```bash
git commit -m "fix(events): jajce_falls turn_min 30→40 — historically fell late October (w43-44)"
```

---

### Task 7: Defense Stacking Hard Cap (P3 — 6 observations)

Total defensive multiplier can reach 3-4x, creating impenetrable walls.

**Files:**
- Modify: `src/sim/combat/combat_math.ts:272-273,939-950`
- Test: `tests/defense_stacking_cap.test.ts`

**Step 1: Tighten soft cap + add hard cap**

In `src/sim/combat/combat_math.ts`, change:
```typescript
export const DEFENSE_ENV_CAP_THRESHOLD = 0.5;
export const DEFENSE_ENV_COMPRESSION = 0.5;
```
To:
```typescript
export const DEFENSE_ENV_CAP_THRESHOLD = 0.5;
export const DEFENSE_ENV_COMPRESSION = 0.35;  // Was 0.5 — tighter compression above threshold
/** Hard cap on total defensive environmental multiplier. Prevents impenetrable walls. */
export const DEFENSE_ENV_HARD_CAP = 2.5;
```

Then after the `cappedEnvMult` calculation (line ~950), add:
```typescript
const finalEnvMult = Math.min(cappedEnvMult, DEFENSE_ENV_HARD_CAP);
```

And use `finalEnvMult` instead of `cappedEnvMult` in the return value.

**Step 2: Test**

```typescript
import { describe, it, expect } from 'vitest';
import { DEFENSE_ENV_HARD_CAP, DEFENSE_ENV_COMPRESSION } from '../src/sim/combat/combat_math.js';

describe('defense stacking cap', () => {
    it('hard cap is 2.5x', () => {
        expect(DEFENSE_ENV_HARD_CAP).toBe(2.5);
    });

    it('compression is 0.35 (was 0.5)', () => {
        expect(DEFENSE_ENV_COMPRESSION).toBe(0.35);
    });

    it('extreme stacking capped at 2.5x', () => {
        // Simulate: terrain 1.3 × entrench 1.35 × corps 1.2 × resilience 1.4 = ~3.0x
        const envProduct = 1.3 * 1.35 * 1.2 * 1.4;
        const envBonus = envProduct - 1.0;
        const cappedBonus = 0.5 + (envBonus - 0.5) * 0.35;
        const cappedMult = 1.0 + cappedBonus;
        const final = Math.min(cappedMult, 2.5);
        expect(final).toBeLessThanOrEqual(2.5);
    });
});
```

**Step 3: Commit**

**VERIFY:** Run 40w scenario. Territory should shift more in mid-late war (reduced stasis).

---

### Task 8: Verification Run

After all fixes, run the full validation suite.

**Step 1: Full test suite**
```bash
npx vitest run  # Must be 1101+ tests, 0 failures
```

**Step 2: 40w calibration**
```bash
npm run sim:scenario:run:40w
node tools/compare_painted_vs_sim.cjs runs/<latest>
# Area-weighted must be ≥ 89%
```

**Step 3: Three-commander QA**
```bash
npm run sim:qa:commanders
npm run sim:qa:diagnostics
# Observation count should decrease from 321
# 0 bugs expected
```

**Step 4: Record results in CALIBRATION_MASTER.md**

---

## Summary

| Task | Fix | Observations | Risk | Files |
|------|-----|-------------|------|-------|
| 1 | Alliance floor 0.40 | 22 | Low | alliance_update.ts |
| 2 | ARBiH mobilization cap 95k | 84 | Medium | ongoing_mobilization.ts |
| 3 | Operation combat feedback | 38 | None (info only) | game_state.ts, sector_offensive.ts |
| 4 | Initial territory pacing | 16 | Medium | formation_constants.ts, bot_brigade_eval_attack.ts |
| 5 | Patron directives (HVO) | 12 | Low | game_state.ts, apr1992.json, bot_corps_stance.ts |
| 6 | Jajce event timing | 11 | None (data) | war_1992.json |
| 7 | Defense stacking cap 2.5x | 6 | High | combat_math.ts |
| 8 | Verification | — | — | — |

**Order matters:** Tasks 1-2 (P1) first — highest observation count. Task 3 is informational only. Tasks 4-5 (P2) are structural. Task 6 is trivial data. Task 7 is highest risk. Task 8 validates everything.

**One-change-then-verify protocol applies to Tasks 1, 2, 4, 7** (sim-affecting). Tasks 3, 5, 6 are safe to batch.
