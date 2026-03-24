# Emergent Brigade Formation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 56 time-gated RBiH brigade spawns from fixed-week triggers to pool-gated emergent formation — brigades form when municipality pools have surplus AND existing brigades are at capacity.

**Architecture:** Add a `canFormEmergentBrigade()` gate in `recruitment_engine.ts` that checks: (1) `available_from <= currentTurn` (minimum week, unchanged), (2) all existing same-faction brigades in that municipality are at FORMATION_CAPACITY_THRESHOLD % of max_personnel, (3) pool.available >= brigade.initial_personnel. The OOB data is unchanged — `available_from` becomes "earliest eligible" not "spawn at."

**Tech Stack:** TypeScript, Vitest, scenario runner (40w calibration)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/sim/recruitment_engine.ts` | Modify | Add pool-surplus gate to mandatory + elective recruitment filters |
| `src/state/formation_constants.ts` | Modify | Add `FORMATION_CAPACITY_THRESHOLD` constant |
| `tests/emergent_brigade_formation.test.ts` | Create | Test the pool-gated formation logic |
| `tests/war_phase_step_order.test.ts` | No change | Step count unchanged (no new pipeline step) |

---

### Task 1: Add FORMATION_CAPACITY_THRESHOLD constant

**Files:**
- Modify: `src/state/formation_constants.ts`

- [ ] **Step 1: Add the constant**

In `src/state/formation_constants.ts`, add after the existing `MAX_BRIGADE_PERSONNEL`:

```typescript
/**
 * Fraction of max_personnel at which a brigade is considered "at capacity" for emergent
 * formation purposes. When ALL brigades in a municipality are above this threshold,
 * new brigades can form from pool surplus. At 0.60 with max 3000: threshold = 1800.
 * Lower than 0.80 because max_personnel=3000 is uniform — most brigades plateau below 2400.
 */
export const FORMATION_CAPACITY_THRESHOLD = 0.60;
```

- [ ] **Step 2: Verify tsc clean**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add src/state/formation_constants.ts
git commit -m "feat(constants): add FORMATION_CAPACITY_THRESHOLD for emergent brigade formation"
```

---

### Task 2: Write failing tests for emergent formation gate

**Files:**
- Create: `tests/emergent_brigade_formation.test.ts`

- [ ] **Step 1: Write test file**

```typescript
import { describe, it, expect } from 'vitest';
import { canFormEmergentBrigade } from '../src/sim/recruitment_engine.js';

// Minimal test state builder
function makePool(available: number, committed: number) {
    return { available, committed, exhausted: 0, faction: 'RBiH', mun_id: 'test', updated_turn: 0, fatigue: 0 };
}

function makeFormation(id: string, mun: string, personnel: number, maxPersonnel = 3000) {
    return {
        id, faction: 'RBiH', status: 'active', kind: 'brigade',
        personnel, max_personnel: maxPersonnel,
        tags: [`mun:${mun}`],
    };
}

describe('canFormEmergentBrigade', () => {
    it('returns true when pool has surplus and existing brigades are at capacity', () => {
        const existingBrigades = [makeFormation('b1', 'tuzla', 2500)]; // 83% > 60%
        const pool = makePool(1000, 5000);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 0)).toBe(true);
    });

    it('returns false when existing brigade is below capacity threshold', () => {
        const existingBrigades = [makeFormation('b1', 'tuzla', 1000)]; // 33% < 60%
        const pool = makePool(1000, 5000);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 0)).toBe(false);
    });

    it('returns false when pool cannot afford the new brigade', () => {
        const existingBrigades = [makeFormation('b1', 'tuzla', 2500)];
        const pool = makePool(100, 5000); // only 100 available, needs 600
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 0)).toBe(false);
    });

    it('returns false when current turn is before available_from', () => {
        const existingBrigades = [makeFormation('b1', 'tuzla', 2500)];
        const pool = makePool(1000, 5000);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 2)).toBe(false);
        // currentTurn=2, available_from=4 → not yet eligible
    });

    it('returns true when municipality has zero existing brigades (first formation)', () => {
        const existingBrigades: any[] = [];
        const pool = makePool(800, 0);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 0, 0)).toBe(true);
    });

    it('returns true when all existing brigades are at or above threshold', () => {
        const existingBrigades = [
            makeFormation('b1', 'tuzla', 2000), // 67% > 60%
            makeFormation('b2', 'tuzla', 1900), // 63% > 60%
        ];
        const pool = makePool(800, 3000);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 0)).toBe(true);
    });

    it('returns false when one brigade is below threshold even if others are full', () => {
        const existingBrigades = [
            makeFormation('b1', 'tuzla', 3000), // 100%
            makeFormation('b2', 'tuzla', 500),  // 17% < 60%
        ];
        const pool = makePool(800, 3000);
        expect(canFormEmergentBrigade(existingBrigades, pool, 600, 4, 0)).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: FAIL — `canFormEmergentBrigade` not exported from recruitment_engine

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/emergent_brigade_formation.test.ts
git commit -m "test: add failing tests for emergent brigade formation gate"
```

---

### Task 3: Implement canFormEmergentBrigade and wire it into recruitment

**Files:**
- Modify: `src/sim/recruitment_engine.ts`
- Modify: `src/state/formation_constants.ts` (import)

- [ ] **Step 1: Add canFormEmergentBrigade function**

In `src/sim/recruitment_engine.ts`, add and export:

```typescript
import { FORMATION_CAPACITY_THRESHOLD } from '../state/formation_constants.js';

/**
 * Check if a new brigade can form in a municipality via pool-gated emergent formation.
 * Conditions: (1) all existing same-faction brigades at capacity threshold,
 * (2) pool can afford the new brigade, (3) current turn >= available_from.
 */
export function canFormEmergentBrigade(
    existingBrigades: Array<{ personnel: number; max_personnel?: number }>,
    pool: { available: number } | undefined,
    requiredPersonnel: number,
    currentTurn: number,
    availableFrom: number
): boolean {
    // Minimum week gate (unchanged from time-gated system)
    if (currentTurn < availableFrom) return false;

    // Pool must be able to afford the formation
    if (!pool || pool.available < requiredPersonnel) return false;

    // All existing brigades must be at capacity threshold
    // (empty municipality = first formation = always allowed)
    for (const b of existingBrigades) {
        const max = b.max_personnel ?? 3000;
        if (b.personnel < max * FORMATION_CAPACITY_THRESHOLD) return false;
    }

    return true;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: 7/7 PASS

- [ ] **Step 3: Wire into mandatory recruitment filter (line ~547)**

Replace the simple `available_from` check with the emergent gate. In the mandatory brigade filter:

```typescript
// OLD: .filter(b => b.available_from <= currentTurn)
// NEW: .filter(b => {
//     if (b.available_from > currentTurn) return false;
//     // Turn-0 brigades always spawn (seed formations)
//     if (b.available_from === 0) return true;
//     // Gated brigades: check pool surplus + existing capacity
//     const munBrigades = getMunBrigadesForFaction(state, b.home_mun, faction);
//     const poolKey = militiaPoolKey(b.home_mun, b.recruit_pool_faction ?? faction);
//     const pool = pools?.[poolKey];
//     return canFormEmergentBrigade(munBrigades, pool, b.initial_personnel ?? b.manpower_cost ?? 500, currentTurn, b.available_from);
// })
```

The helper `getMunBrigadesForFaction` collects all active brigades in a municipality for a faction. Add it as a local function:

```typescript
function getMunBrigadesForFaction(
    state: GameState, munId: string, faction: string
): Array<{ personnel: number; max_personnel?: number }> {
    const formations = state.military.formations ?? {};
    const result: Array<{ personnel: number; max_personnel?: number }> = [];
    for (const f of Object.values(formations)) {
        if (f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        const fMun = getMunIdFromFormation(f);
        if (fMun === munId) result.push({ personnel: f.personnel ?? 0, max_personnel: f.max_personnel });
    }
    return result;
}
```

Note: `getMunIdFromFormation` is already defined in `formation_spawn.ts` — it reads the `mun:` tag. The recruitment engine needs access. Either import it or duplicate the 4-line function locally.

- [ ] **Step 4: Wire into elective recruitment filter (line ~652)**

Same change for the elective filter:

```typescript
// OLD: .filter(b => b.available_from <= currentTurn)
// NEW: .filter(b => {
//     if (b.available_from > currentTurn) return false;
//     if (b.available_from === 0) return true;
//     const munBrigades = getMunBrigadesForFaction(state, b.home_mun, faction);
//     const poolKey = militiaPoolKey(b.home_mun, b.recruit_pool_faction ?? faction);
//     const pool = pools?.[poolKey];
//     return canFormEmergentBrigade(munBrigades, pool, b.initial_personnel ?? b.manpower_cost ?? 500, currentTurn, b.available_from);
// })
```

- [ ] **Step 5: Import militiaPoolKey if not already imported**

Check if `militiaPoolKey` is imported in `recruitment_engine.ts`. If not:
```typescript
import { militiaPoolKey } from '../state/militia_pool_key.js';
```

Also need access to pools — check if `state.military.militia_pools` is accessible in the recruitment function. It should be since the function receives `state: GameState`.

- [ ] **Step 6: Run full test suite**

Run: `npm run test:vitest`
Expected: all pass (1445+)

- [ ] **Step 7: Run tsc**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 8: Commit**

```bash
git add src/sim/recruitment_engine.ts src/state/formation_constants.ts tests/emergent_brigade_formation.test.ts
git commit -m "feat(sim): pool-gated emergent brigade formation — replace time gates with pool surplus checks"
```

---

### Task 4: Calibration run and diagnostic

**Files:** None modified — verification only

- [ ] **Step 1: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`

- [ ] **Step 2: Run comparison tool**

Run: `node tools/compare_painted_vs_sim.cjs runs/<latest_dir>`
Record: area-weighted %, faction territory counts

- [ ] **Step 3: Run diagnostic tool**

Run: `node tools/diagnose_run.cjs runs/<latest_dir>`
Record: depleted corps, siege health, drift warnings

- [ ] **Step 4: Check key metrics**

```bash
node -e "
const s=require('./runs/<dir>/final_save.json');
const fmns = Object.values(s.military.formations);
// Total RBiH brigades and personnel
const rbih = fmns.filter(f => f.faction === 'RBiH' && f.status === 'active' && f.kind === 'brigade');
console.log('RBiH brigades:', rbih.length, '| total:', rbih.reduce((s,f)=>s+f.personnel,0));
// 1st Corps
const c1 = fmns.filter(f => f.corps_id === 'arbih_1st_corps');
console.log('1st Corps:', c1.reduce((s,f)=>s+f.personnel,0), '| ineff:', c1.filter(f=>f.personnel<400).length);
// Check municipalities with surplus pools — did new brigades form?
const pools = s.military.militia_pools || {};
['tuzla','zenica','doboj','bihac','gradacac'].forEach(m => {
  const p = pools[m+':RBiH'];
  const brig = rbih.filter(f => (f.tags||[]).some(t => t === 'mun:'+m));
  console.log(m, '| pool:', p?.available, '| brigades:', brig.length);
});
"
```

**Expected outcomes:**
- RBiH brigade count: ~95-110 (down from 120, because small-pool municipalities form fewer)
- Tuzla/Zenica/Doboj: same brigade count (turn-0 seed brigades unaffected; gated brigades may form later or not at all depending on pool timing)
- Hadzici: 2-3 brigades instead of 5 (pool can't sustain 5)
- 1st Corps ineffective count: should decrease (fewer brigades, each healthier)
- Calibration: expect shift — may need follow-up tuning

- [ ] **Step 5: Compare to n1061 baseline**

Check: did the emergent system produce better per-brigade health at the cost of fewer total brigades? This is the intended tradeoff.

- [ ] **Step 6: Freeze baseline if results are acceptable**

Run: `node tools/freeze_baseline.cjs runs/<latest_dir>`

- [ ] **Step 7: Commit results**

```bash
git add data/calibration/baseline_40w.json data/derived/latest_run_final_save.json
git commit -m "calibrate: emergent brigade formation — pool-gated spawning baseline"
```

---

## Post-Implementation Notes

**Phase 2 (deferred):**
- Displacement-responsive pool routing (route displaced to municipalities with formation potential)
- Strategic reserve draw rate fix (RBiH 0.02 → higher)
- Dissolved brigade personnel → return to municipality pool instead of strategic reserve
- Beyond-OOB emergent brigades (generic formations when all OOB candidates exhausted)
- Tiered max_personnel (light=1,500, mountain=2,000, motorized=3,000)

**Key files to read before implementing:**
- `src/sim/recruitment_engine.ts` lines 540-680 — the recruitment loop
- `src/sim/formation_spawn.ts` lines 245-340 — the reinforcement loop (for reference, not modified)
- `src/state/formation_constants.ts` — all formation constants
- `docs/plans/2026-03-24-emergent-brigade-formation-design.md` — full design spec
