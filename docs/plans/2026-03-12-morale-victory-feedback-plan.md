# Morale-Victory Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent RS morale steamroller and ARBiH death spiral by adding diminishing returns on battle morale drift, faction-differentiated sensitivity, and existential defense floors.

**Architecture:** Modify drift path only (`morale_drift.ts`). Immediate shock path in `attack_resolution_osid.ts` untouched. One new field on `FormationState`. All new constants in `morale_drift.ts`.

**Tech Stack:** TypeScript, Vitest

**Design doc:** `docs/plans/2026-03-12-morale-victory-feedback-design.md`

---

### Task 1: Add `battle_outcome_count` to FormationState

**Files:**
- Modify: `src/state/game_state.ts:480` (after `zero_morale_turns`)

**Step 1: Add the field**

In `src/state/game_state.ts`, after line 481 (`zero_morale_turns?: number;`), add:

```typescript
    /** How many battle outcomes this formation has processed through morale drift. Used for habituation — diminishing morale effect of combat over time. */
    battle_outcome_count?: number;
```

**Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS (optional field, no consumers yet)

**Step 3: Commit**

```bash
git add src/state/game_state.ts
git commit -m "feat(morale): add battle_outcome_count field to FormationState"
```

---

### Task 2: Add morale-victory feedback constants to morale_drift.ts

**Files:**
- Modify: `src/sim/combat/morale_drift.ts:13` (imports) and `:48-60` (constants section)

**Step 1: Remove the HOME_GROUND_MORALE_FLOOR import**

In `morale_drift.ts` line 13, change:

```typescript
import { CRITICAL_MORALE_THRESHOLD, HOME_GROUND_MORALE_FLOOR } from './combat_math.js';
```

to:

```typescript
import { CRITICAL_MORALE_THRESHOLD } from './combat_math.js';
```

We'll replace the flat floor with faction-differentiated floors.

**Step 2: Add new constants after the BATTLE_MORALE_DRIFT block (after line 60)**

```typescript

/** Battle habituation: diminishing morale returns from repeated combat.
 * Formula: 1 / (1 + battle_outcome_count * RATE).
 * At 0 battles: 1.00×, at 10: 0.77×, at 20: 0.62×, at 40: 0.45×.
 * Historical: all factions became "numb" to combat by late 1993 (BB2). */
const BATTLE_HABITUATION_RATE = 0.03;

/** Faction-differentiated morale sensitivity to VICTORIES (positive drift).
 * RS 0.8: winning is expected (JNA inheritance) — each victory matters less.
 * RBiH 1.3: each victory proves the army is real — huge morale boost.
 * HRHB 1.0: baseline. */
const FACTION_VICTORY_SENSITIVITY: Record<string, number> = {
    RS: 0.8,
    RBiH: 1.3,
    HRHB: 1.0,
};

/** Faction-differentiated morale sensitivity to DEFEATS (negative drift).
 * RS 1.3: losing is shocking for a professional army — defeats hit harder.
 * RBiH 0.7: existential determination — expect to suffer, absorb losses.
 * HRHB 1.0: baseline. */
const FACTION_DEFEAT_SENSITIVITY: Record<string, number> = {
    RS: 1.3,
    RBiH: 0.7,
    HRHB: 1.0,
};

/** Faction-differentiated home defense morale floors.
 * Replaces flat HOME_GROUND_MORALE_FLOOR (15) from combat_math.ts.
 * RBiH 30: nowhere to go — fight or die.
 * HRHB 25: Croatian homeland, but Croatia exists as fallback.
 * RS 20: can desert home to Serbia proper. */
const FACTION_HOME_MORALE_FLOOR: Record<string, number> = {
    RS: 20,
    RBiH: 30,
    HRHB: 25,
};

/** RBiH existential floor: ARBiH formations in co-ethnic majority areas (>50% Bosniak)
 * get morale floor 25 even without home_defense_active.
 * Models "cornered rat" — no surrender option for Bosniaks. */
const RBIH_EXISTENTIAL_FLOOR = 25;
const EXISTENTIAL_AFFINITY_THRESHOLD = 0.50;
```

**Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS (constants defined but not yet used — HOME_GROUND_MORALE_FLOOR import removal may cause an error if used elsewhere in the file, which it is at line 167. That's fine — we'll fix the consumer in Task 4.)

NOTE: Typecheck may fail here because `HOME_GROUND_MORALE_FLOOR` is still referenced at line 167. If so, proceed to Task 3+4 before re-checking.

**Step 4: Commit**

```bash
git add src/sim/combat/morale_drift.ts
git commit -m "feat(morale): add habituation, faction sensitivity, and floor constants"
```

---

### Task 3: Wire habituation + faction sensitivity into battle outcome drift

**Files:**
- Modify: `src/sim/combat/morale_drift.ts:150-156`

**Step 1: Replace the battle outcome drift block**

Replace lines 150-156:

```typescript
        // 4. Battle outcome morale boost/penalty
        const recentOutcome = (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        if (recentOutcome) {
            drift += BATTLE_MORALE_DRIFT[recentOutcome] ?? 0;
            // Clear after consumption — one-shot per battle
            delete (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        }
```

With:

```typescript
        // 4. Battle outcome morale drift (with habituation + faction sensitivity)
        const recentOutcome = (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        if (recentOutcome) {
            const baseDrift = BATTLE_MORALE_DRIFT[recentOutcome] ?? 0;

            // Habituation: combat-hardened troops become numb to battle outcomes
            const battleCount = (f as { battle_outcome_count?: number }).battle_outcome_count ?? 0;
            const habituation = 1 / (1 + battleCount * BATTLE_HABITUATION_RATE);

            // Faction sensitivity: asymmetric reaction to victory vs defeat
            const sensitivity = baseDrift >= 0
                ? (FACTION_VICTORY_SENSITIVITY[f.faction] ?? 1.0)
                : (FACTION_DEFEAT_SENSITIVITY[f.faction] ?? 1.0);

            drift += Math.round(baseDrift * habituation * sensitivity);

            // Increment battle counter (persists, never resets)
            (f as { battle_outcome_count?: number }).battle_outcome_count = battleCount + 1;

            // Clear after consumption — one-shot per battle
            delete (f as { recent_battle_outcome?: string }).recent_battle_outcome;
        }
```

**Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: May still fail due to HOME_GROUND_MORALE_FLOOR reference at line 167. Proceed to Task 4.

---

### Task 4: Wire faction-differentiated home floors + RBiH existential floor

**Files:**
- Modify: `src/sim/combat/morale_drift.ts:163-168`

**Step 1: Replace the home ground morale floor block**

Replace lines 163-168 (approximately, after the `f.morale = Math.max(0, Math.min(100, f.morale + drift));` line):

```typescript
        // Home ground morale floor: brigades defending their home municipality
        // never drop below HOME_GROUND_MORALE_FLOOR (15) — models historical holdouts
        // (e.g. Goražde defenders). Applied AFTER drift, as a hard minimum on the morale value.
        if (f.home_defense_active === true) {
            f.morale = Math.max(f.morale, HOME_GROUND_MORALE_FLOOR);
        }
```

With:

```typescript
        // Home ground morale floor: faction-differentiated.
        // RBiH 30 (nowhere to go), HRHB 25 (Croatia fallback), RS 20 (Serbia fallback).
        if (f.home_defense_active === true) {
            const factionFloor = FACTION_HOME_MORALE_FLOOR[f.faction] ?? 15;
            f.morale = Math.max(f.morale, factionFloor);
        }

        // RBiH existential floor: Bosniak troops in co-ethnic majority areas
        // get morale floor 25 even without home_defense_active.
        // Models the "cornered rat" — no surrender option for Bosniaks.
        if (f.faction === 'RBiH' && affinity > EXISTENTIAL_AFFINITY_THRESHOLD) {
            f.morale = Math.max(f.morale, RBIH_EXISTENTIAL_FLOOR);
        }
```

**Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: PASS — all references to HOME_GROUND_MORALE_FLOOR removed, replaced with FACTION_HOME_MORALE_FLOOR.

**Step 3: Commit Tasks 2-4 together**

```bash
git add src/sim/combat/morale_drift.ts
git commit -m "feat(morale): wire habituation, faction sensitivity, and differentiated floors into drift"
```

---

### Task 5: Write tests

**Files:**
- Create: `tests/morale_victory_feedback.test.ts`
- Modify: `vitest.config.ts` (add to include list)

**Step 1: Create test file**

```typescript
import { describe, it, expect } from 'vitest';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import type { GameState, FormationState } from '../src/state/game_state.js';

/** Minimal GameState factory for morale drift tests. */
function makeState(formations: Record<string, Partial<FormationState>>): GameState {
    const fmns: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmns[id] = {
            id, faction: 'RS', name: id, created_turn: 0, status: 'active',
            assignment: null, kind: 'brigade', morale: 60, personnel: 2000,
            cohesion: 60, location_osid: 'op:banja_luka:rekavice_2',
            ...partial,
        } as FormationState;
    }
    return { meta: { turn: 10 }, military: { formations: fmns } } as unknown as GameState;
}

describe('Battle habituation', () => {
    it('first battle applies full drift (habituation = 1.0)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // HRHB sensitivity 1.0, habituation 1/(1+0*0.03)=1.0 → +5×1.0×1.0 = +5
        expect(state.military.formations!['b1']!.morale).toBe(55);
    });

    it('after 10 battles, drift is reduced (habituation ≈ 0.77)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 10 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+10*0.03)=0.769 → 5×0.769×1.0 = 3.846 → round 4
        expect(state.military.formations!['b1']!.morale).toBe(54);
    });

    it('after 20 battles, drift is ~62%', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+20*0.03)=0.625 → 5×0.625×1.0 = 3.125 → round 3
        expect(state.military.formations!['b1']!.morale).toBe(53);
    });

    it('after 40 battles, drift is ~45%', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 40 } as any,
        });
        runMoraleDrift(state, []);
        // 1/(1+40*0.03)=0.455 → 5×0.455×1.0 = 2.273 → round 2
        expect(state.military.formations!['b1']!.morale).toBe(52);
    });

    it('increments battle_outcome_count after processing', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'victory', battle_outcome_count: 5 } as any,
        });
        runMoraleDrift(state, []);
        expect((state.military.formations!['b1'] as any).battle_outcome_count).toBe(6);
    });

    it('initializes battle_outcome_count from undefined to 1', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'victory' } as any,
        });
        runMoraleDrift(state, []);
        expect((state.military.formations!['b1'] as any).battle_outcome_count).toBe(1);
    });
});

describe('Faction victory sensitivity', () => {
    it('RS decisive victory: 0.8× sensitivity', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // 5 × 1.0 × 0.8 = 4.0 → round 4
        expect(state.military.formations!['b1']!.morale).toBe(54);
    });

    it('RBiH decisive victory: 1.3× sensitivity', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // 5 × 1.0 × 1.3 = 6.5 → round 7
        expect(state.military.formations!['b1']!.morale).toBe(57);
    });

    it('HRHB decisive victory: 1.0× sensitivity (baseline)', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(55);
    });
});

describe('Faction defeat sensitivity', () => {
    it('RS catastrophic defeat: 1.3× sensitivity (defeats hit harder)', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // -4 × 1.0 × 1.3 = -5.2 → round -5
        expect(state.military.formations!['b1']!.morale).toBe(45);
    });

    it('RBiH catastrophic defeat: 0.7× sensitivity (absorb losses)', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // -4 × 1.0 × 0.7 = -2.8 → round -3
        expect(state.military.formations!['b1']!.morale).toBe(47);
    });
});

describe('Combined habituation + sensitivity', () => {
    it('RS decisive after 20 battles: +5 × 0.625 × 0.8 = 2.5 → +3', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 50, recent_battle_outcome: 'decisive_victory', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(53);
    });

    it('ARBiH catastrophic after 20 battles: -4 × 0.625 × 0.7 = -1.75 → -2', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 50, recent_battle_outcome: 'catastrophic', battle_outcome_count: 20 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBe(48);
    });
});

describe('Faction home morale floors', () => {
    it('RBiH home defender: floor 30', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 20, home_defense_active: true, recent_battle_outcome: 'catastrophic', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        // morale 20 + drift (-3 from catastrophic × 0.7 = -2.1 → -2) = 18... but other drifts may apply
        // Floor should enforce >= 30
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(30);
    });

    it('RS home defender: floor 20', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 15, home_defense_active: true, recent_battle_outcome: 'repulsed', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(20);
    });

    it('HRHB home defender: floor 25', () => {
        const state = makeState({
            b1: { faction: 'HRHB', morale: 20, home_defense_active: true, recent_battle_outcome: 'repulsed', battle_outcome_count: 0 } as any,
        });
        runMoraleDrift(state, []);
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(25);
    });
});

describe('RBiH existential floor', () => {
    it('RBiH in co-ethnic majority (>50%) gets floor 25 without home_defense_active', () => {
        // Need a state where affinity > 0.50 for RBiH — use a municipality with high Bosniak pop
        // The getFactionAlignedPopulationShare returns 0.5 when no munPopulation provided,
        // so we need to pass munPopulation. Use a synthetic municipality.
        const state = makeState({
            b1: { faction: 'RBiH', morale: 20, location_osid: 'op:tuzla:tuzla_1' } as any,
        });
        // Provide munPopulation with high Bosniak share for tuzla
        const munPop = new Map([['tuzla', { bosniak: 0.65, serb: 0.15, croat: 0.15, other: 0.05 }]]) as any;
        runMoraleDrift(state, [], munPop);
        // Affinity > 0.50 + faction RBiH → existential floor 25
        expect(state.military.formations!['b1']!.morale).toBeGreaterThanOrEqual(25);
    });

    it('RBiH in low co-ethnic area (<50%) does NOT get existential floor', () => {
        const state = makeState({
            b1: { faction: 'RBiH', morale: 10, location_osid: 'op:prijedor:prijedor_1' } as any,
        });
        // Low Bosniak share
        const munPop = new Map([['prijedor', { bosniak: 0.20, serb: 0.60, croat: 0.10, other: 0.10 }]]) as any;
        runMoraleDrift(state, [], munPop);
        // Affinity < 0.50 → no existential floor, also low affinity drift -2
        // morale 10 - 2 = 8 (below 25 and no floor)
        expect(state.military.formations!['b1']!.morale).toBeLessThan(25);
    });

    it('RS in co-ethnic majority does NOT get existential floor', () => {
        const state = makeState({
            b1: { faction: 'RS', morale: 10, location_osid: 'op:prijedor:prijedor_1' } as any,
        });
        const munPop = new Map([['prijedor', { bosniak: 0.20, serb: 0.60, croat: 0.10, other: 0.10 }]]) as any;
        runMoraleDrift(state, [], munPop);
        // RS doesn't get existential floor even in own-ethnic area
        // High affinity → +2 drift, so morale goes to 12, not floored
        expect(state.military.formations!['b1']!.morale).toBeLessThan(25);
    });
});
```

**Step 2: Add test to vitest.config.ts**

Append `'tests/morale_victory_feedback.test.ts'` to the include array.

**Step 3: Run tests**

Run: `npx vitest run tests/morale_victory_feedback.test.ts`
Expected: ALL PASS

**Step 4: Run full test suite**

Run: `npm run test:vitest`
Expected: ALL existing tests still pass (no regressions)

**Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add tests/morale_victory_feedback.test.ts vitest.config.ts
git commit -m "test(morale): add morale-victory feedback tests — habituation, sensitivity, floors"
```

---

### Task 6: Run 40w calibration and compare to n617 baseline

**Step 1: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`

**Step 2: Compare results**

Check:
- 6/6 bot benchmarks (especially RS w40 — was 0.517, lower bound 0.503)
- Area-weighted match (was 86.3%)
- RS morale distribution at w12 and w40 (the key question: is RS still pinned at 100?)
- ARBiH morale distribution (death spiral prevention — how many at critical?)
- Total casualties (was ~41k)

**Step 3: If benchmarks pass, commit design + plan docs**

```bash
git add docs/plans/2026-03-12-morale-victory-feedback-design.md docs/plans/2026-03-12-morale-victory-feedback-plan.md
git commit -m "docs: morale-victory feedback design and implementation plan"
```

---

## Post-Implementation

After calibration passes:
1. Update `docs/PROJECT_LEDGER.md` with n-number entry
2. Update `docs/40_reports/REAL_WAR_MASTER.md` — mark #5 and #10 as ADDRESSED
3. Update MEMORY.md with new calibration state
4. If RS morale still pinned at 100 by w12, escalate to Stage 2 (shock path modification)
