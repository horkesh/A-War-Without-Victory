# Emergent Brigade Phase 2: Enclave Capacity Fix + Pool Rerouting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unlock ~12k stranded RBiH manpower by (1) fixing the enclave capacity gate that blocks 10k in Srebrenica/Gorazde, and (2) rerouting surplus pool manpower from exhausted municipalities to municipalities with waiting OOB candidates.

**Architecture:** Two independent changes, each calibrated separately. Change 1 modifies `canFormEmergentBrigade()` to use effective max_personnel (1,500 for enclaves) instead of uniform 3,000. Change 2 adds a `reroutePoolSurplus()` pipeline step before `brigade-reinforcement` that transfers manpower from surplus municipalities to deficit ones within the same faction.

**Tech Stack:** TypeScript, Vitest, scenario runner (40w calibration)

---

## File Map

| File | Action | Task |
|------|--------|------|
| `src/sim/recruitment_engine.ts` | Modify | Task 1 (enclave fix), Task 3 (rerouting) |
| `src/state/formation_constants.ts` | Modify | Task 1 (export ENCLAVE_MUNICIPALITY_IDS) |
| `src/sim/turn_phases/war_phases.ts` | Modify | Task 3 (new pipeline step) |
| `tests/emergent_brigade_formation.test.ts` | Modify | Task 1, Task 3 |

---

### Task 1: Enclave Capacity Gate Fix

**Files:**
- Modify: `src/state/formation_constants.ts`
- Modify: `src/sim/recruitment_engine.ts:363-398`
- Modify: `tests/emergent_brigade_formation.test.ts`

**Step 1: Add ENCLAVE_MUNICIPALITY_IDS to formation_constants.ts**

After the existing `ENCLAVE_MAX_PERSONNEL` constant (line 187), add:

```typescript
/** Municipalities where brigades are enclave-constrained (max_personnel capped at ENCLAVE_MAX_PERSONNEL). */
export const ENCLAVE_MUNICIPALITY_IDS = new Set<string>(['srebrenica', 'gorazde', 'zepa']);
```

Run: `npx tsc --noEmit`
Expected: clean

**Step 2: Write failing tests for enclave capacity gate**

Add to `tests/emergent_brigade_formation.test.ts`:

```typescript
import { ENCLAVE_MAX_PERSONNEL } from '../src/state/formation_constants.js';

// Add inside the existing describe block:

    it('uses ENCLAVE_MAX_PERSONNEL for threshold when isEnclave=true', () => {
        // Enclave brigade at 1000 out of 1500 = 67% > 60% threshold
        const existing = [makeBrigade(1000, ENCLAVE_MAX_PERSONNEL)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(true);
    });

    it('blocks enclave formation when brigade below enclave threshold', () => {
        // Enclave brigade at 600 out of 1500 = 40% < 60% threshold
        const existing = [makeBrigade(600, ENCLAVE_MAX_PERSONNEL)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });
```

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: The first new test FAILS because `canFormEmergentBrigade` currently uses `b.max_personnel ?? 3000`, and `makeBrigade(1000, 1500)` sets max_personnel=1500. Wait — actually this should already PASS because the existing code reads `b.max_personnel` directly: `const max = b.max_personnel ?? 3000`. If max_personnel=1500, then threshold = 1500 * 0.60 = 900, and 1000 > 900 = true.

The REAL bug is in the CALLER: `getMunBrigadesForFaction()` returns `{ personnel, max_personnel: f.max_personnel }` — but `f.max_personnel` on a FormationState is always 3000 (all brigades uniform). The enclave cap of 1500 is only enforced during reinforcement in `formation_spawn.ts`, not stored on the formation.

So the fix is: `getMunBrigadesForFaction()` must return the EFFECTIVE max (capped to ENCLAVE_MAX_PERSONNEL for enclave municipalities).

**Step 3: Fix getMunBrigadesForFaction to return effective max**

In `src/sim/recruitment_engine.ts`, modify `getMunBrigadesForFaction` (line 380):

```typescript
import { ENCLAVE_MAX_PERSONNEL, ENCLAVE_MUNICIPALITY_IDS } from '../state/formation_constants.js';

/** Get all active brigades in a municipality for a given faction,
 *  with effective max_personnel (capped for enclave municipalities). */
function getMunBrigadesForFaction(
    state: GameState, munId: string, faction: string
): Array<{ personnel: number; max_personnel?: number }> {
    const formations = state.military.formations ?? {};
    const isEnclave = ENCLAVE_MUNICIPALITY_IDS.has(munId);
    const result: Array<{ personnel: number; max_personnel?: number }> = [];
    for (const f of Object.values(formations)) {
        if (f.faction !== faction || f.status !== 'active' || f.kind !== 'brigade') continue;
        const tags = f.tags;
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (typeof t === 'string' && t.startsWith('mun:') && t.slice(4) === munId) {
                    const rawMax = f.max_personnel ?? 3000;
                    const effectiveMax = isEnclave ? Math.min(rawMax, ENCLAVE_MAX_PERSONNEL) : rawMax;
                    result.push({ personnel: f.personnel ?? 0, max_personnel: effectiveMax });
                    break;
                }
            }
        }
    }
    return result;
}
```

Note: `ENCLAVE_MAX_PERSONNEL` is already imported in `formation_spawn.ts` from `formation_constants.js`. We need to add the import in `recruitment_engine.ts`. Check existing imports first — `FORMATION_CAPACITY_THRESHOLD` is already imported from there, so just add `ENCLAVE_MAX_PERSONNEL` and `ENCLAVE_MUNICIPALITY_IDS` to that import.

**Step 4: Write a test that captures the real bug**

The unit tests for `canFormEmergentBrigade` already pass with max_personnel=1500 because the function reads it directly. The bug is in the caller chain. Add an integration-style test:

```typescript
describe('enclave capacity gate integration', () => {
    it('enclave municipality uses ENCLAVE_MAX_PERSONNEL as effective cap', () => {
        // A brigade with max_personnel=3000 (FormationState default) in an enclave municipality
        // should be evaluated against ENCLAVE_MAX_PERSONNEL (1500), not 3000.
        // At personnel=1000: 1000/3000 = 33% FAIL vs 1000/1500 = 67% PASS
        const existing = [makeBrigade(1000, 3000)];
        // Without the fix, this would use 3000 * 0.60 = 1800 threshold → FAIL
        // With the fix (effective max = 1500), threshold = 900 → PASS
        // But canFormEmergentBrigade itself doesn't know about enclaves —
        // the fix is in getMunBrigadesForFaction which caps max_personnel before passing in.
        // So this test verifies the function works with pre-capped values:
        const existingCapped = [makeBrigade(1000, 1500)]; // simulating what getMunBrigadesForFaction returns
        expect(canFormEmergentBrigade(existingCapped, { available: 800 }, 600, 4, 0)).toBe(true);
        // And without capping:
        const existingUncapped = [makeBrigade(1000, 3000)];
        expect(canFormEmergentBrigade(existingUncapped, { available: 800 }, 600, 4, 0)).toBe(false);
    });
});
```

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: all pass

**Step 5: Run tsc + full test suite**

Run: `npx tsc --noEmit`
Expected: clean

Run: `npm run test:vitest`
Expected: all pass

**Step 6: Commit**

```bash
git add src/sim/recruitment_engine.ts src/state/formation_constants.ts tests/emergent_brigade_formation.test.ts
git commit -m "fix(sim): enclave capacity gate — use ENCLAVE_MAX_PERSONNEL for formation threshold in enclave municipalities"
```

---

### Task 2: Calibration Run — Enclave Fix

**Files:** None modified — verification only

**Step 1: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`

**Step 2: Compare**

Run: `node tools/compare_painted_vs_sim.cjs runs/<latest_dir>`

**Step 3: Diagnostics**

Run: `node tools/diagnose_run.cjs runs/<latest_dir>`

**Step 4: Check enclave-specific metrics**

```bash
node -e "
const s=require('./runs/<dir>/final_save.json');
const fmns = Object.values(s.military.formations);
// Srebrenica brigades
const sreb = fmns.filter(f => f.faction === 'RBiH' && f.status === 'active' && (f.tags||[]).some(t => t === 'mun:srebrenica'));
console.log('Srebrenica RBiH brigades:', sreb.length, '| total:', sreb.reduce((s,f)=>s+f.personnel,0));
// Gorazde brigades
const gor = fmns.filter(f => f.faction === 'RBiH' && f.status === 'active' && (f.tags||[]).some(t => t === 'mun:gorazde'));
console.log('Gorazde RBiH brigades:', gor.length, '| total:', gor.reduce((s,f)=>s+f.personnel,0));
// Total RBiH
const rbih = fmns.filter(f => f.faction === 'RBiH' && f.status === 'active' && f.kind === 'brigade');
console.log('RBiH total:', rbih.length, 'brigades |', rbih.reduce((s,f)=>s+f.personnel,0), 'pers | avg:', Math.round(rbih.reduce((s,f)=>s+f.personnel,0)/rbih.length));
// Pools
const pools = s.military.militia_pools || {};
console.log('Srebrenica pool:', pools['srebrenica:RBiH']?.available);
console.log('Gorazde pool:', pools['gorazde:RBiH']?.available);
"
```

**Expected outcomes:**
- Srebrenica: 2-4 brigades formed (was 1), pool drawn down from 5,000
- Gorazde: 2-5 brigades formed (was 1), pool drawn down from 4,914
- RBiH total personnel: ~155-165k (up from 149k)
- Calibration: may shift — enclaves with more brigades fight harder

**Step 5: Freeze if acceptable**

Run: `node tools/freeze_baseline.cjs runs/<latest_dir>`

---

### Task 3: Surplus Pool Rerouting

**Files:**
- Modify: `src/sim/recruitment_engine.ts` (add `reroutePoolSurplus`)
- Modify: `src/sim/turn_phases/war_phases.ts` (add pipeline step)
- Modify: `tests/emergent_brigade_formation.test.ts` (add rerouting tests)

**Step 1: Write failing tests for pool rerouting**

Add to `tests/emergent_brigade_formation.test.ts`:

```typescript
import { reroutePoolSurplus } from '../src/sim/recruitment_engine.js';

describe('reroutePoolSurplus', () => {
    // Helper to build minimal GameState with pools and formations
    function makeState(pools: Record<string, { available: number; committed: number }>, formations: any[] = []) {
        const fmnsObj: Record<string, any> = {};
        for (const f of formations) fmnsObj[f.id] = f;
        return {
            military: {
                militia_pools: pools,
                formations: fmnsObj,
            },
        } as any;
    }

    function makeFormation(id: string, faction: string, mun: string, personnel: number, status = 'active') {
        return { id, faction, status, kind: 'brigade', personnel, max_personnel: 3000, tags: [`mun:${mun}`] };
    }

    it('transfers surplus from exhausted mun to deficit mun', () => {
        const state = makeState({
            'zenica:RBiH': { available: 5000, committed: 10000 },
            'visoko:RBiH': { available: 0, committed: 2000 },
        }, [
            makeFormation('b1', 'RBiH', 'zenica', 2500), // above capacity
        ]);
        // OOB candidates: visoko has one waiting, zenica has none
        const oobByMun: Record<string, { faction: string; initial_personnel: number }[]> = {
            visoko: [{ faction: 'RBiH', initial_personnel: 800 }],
        };
        const result = reroutePoolSurplus(state, 'RBiH', oobByMun);
        expect(result.transferred).toBeGreaterThan(0);
        expect(state.military.militia_pools['visoko:RBiH'].available).toBeGreaterThan(0);
        expect(state.military.militia_pools['zenica:RBiH'].available).toBeLessThan(5000);
    });

    it('does not route into enclave municipalities', () => {
        const state = makeState({
            'zenica:RBiH': { available: 5000, committed: 10000 },
            'srebrenica:RBiH': { available: 100, committed: 1000 },
        }, [
            makeFormation('b1', 'RBiH', 'zenica', 2500),
        ]);
        const oobByMun: Record<string, { faction: string; initial_personnel: number }[]> = {
            srebrenica: [{ faction: 'RBiH', initial_personnel: 800 }],
        };
        const result = reroutePoolSurplus(state, 'RBiH', oobByMun);
        expect(result.transferred).toBe(0); // enclaves are isolated
    });

    it('does nothing when no surplus municipalities exist', () => {
        const state = makeState({
            'visoko:RBiH': { available: 0, committed: 2000 },
        });
        const result = reroutePoolSurplus(state, 'RBiH', {});
        expect(result.transferred).toBe(0);
    });
});
```

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: FAIL — `reroutePoolSurplus` not exported

**Step 2: Implement reroutePoolSurplus**

Add to `src/sim/recruitment_engine.ts`:

```typescript
/**
 * Reroute surplus pool manpower from municipalities where all OOB candidates are
 * exhausted and all brigades are at capacity, to municipalities that have waiting
 * OOB candidates but insufficient pool.
 *
 * Does NOT route into enclave municipalities (isolated by definition).
 * Deterministic: surplus sorted by available descending, deficit by needed ascending.
 */
export function reroutePoolSurplus(
    state: GameState,
    faction: FactionId,
    /** Unspawned OOB candidates grouped by home_mun. */
    unspawnedByMun: Record<string, { faction: string; initial_personnel: number }[]>
): { transferred: number; routes: Array<{ from: string; to: string; amount: number }> } {
    const pools = state.military.militia_pools ?? {};
    const routes: Array<{ from: string; to: string; amount: number }> = [];
    let transferred = 0;

    // 1. Identify surplus municipalities: pool > 0, no unspawned OOB, all brigades at capacity
    const surplusMuns: Array<{ mun: string; poolKey: string; available: number }> = [];
    const deficitMuns: Array<{ mun: string; poolKey: string; needed: number }> = [];

    for (const [key, pool] of Object.entries(pools)) {
        if (!key.endsWith(':' + faction)) continue;
        const mun = key.split(':')[0];
        if (ENCLAVE_MUNICIPALITY_IDS.has(mun)) continue; // never route from/to enclaves
        const unspawned = unspawnedByMun[mun] ?? [];

        if (unspawned.length === 0 && pool.available > 0) {
            // Check all brigades at capacity
            const brigs = getMunBrigadesForFaction(state, mun, faction);
            const allAtCapacity = brigs.length === 0 || brigs.every(
                b => b.personnel >= (b.max_personnel ?? 3000) * FORMATION_CAPACITY_THRESHOLD
            );
            if (allAtCapacity) {
                surplusMuns.push({ mun, poolKey: key, available: pool.available });
            }
        } else if (unspawned.length > 0) {
            // Deficit: has unspawned OOB, needs manpower
            const maxNeeded = unspawned.reduce((sum, c) => sum + (c.initial_personnel ?? 500), 0);
            const deficit = Math.max(0, maxNeeded - pool.available);
            if (deficit > 0) {
                deficitMuns.push({ mun, poolKey: key, needed: deficit });
            }
        }
    }

    // Deterministic sort
    surplusMuns.sort((a, b) => b.available - a.available || a.mun.localeCompare(b.mun));
    deficitMuns.sort((a, b) => a.needed - b.needed || a.mun.localeCompare(b.mun));

    // 2. Transfer
    for (const deficit of deficitMuns) {
        if (deficit.needed <= 0) continue;
        for (const surplus of surplusMuns) {
            if (surplus.available <= 0) continue;
            const amount = Math.min(surplus.available, deficit.needed);
            if (amount <= 0) continue;

            // Execute transfer
            pools[surplus.poolKey].available -= amount;
            surplus.available -= amount;
            if (!pools[deficit.poolKey]) {
                pools[deficit.poolKey] = { available: 0, committed: 0, exhausted: 0, faction, mun_id: deficit.mun as any, updated_turn: state.meta?.turn ?? 0, fatigue: 0 };
            }
            pools[deficit.poolKey].available += amount;
            deficit.needed -= amount;
            transferred += amount;
            routes.push({ from: surplus.mun, to: deficit.mun, amount });

            if (deficit.needed <= 0) break;
        }
    }

    return { transferred, routes };
}
```

Run: `npm run test:vitest -- tests/emergent_brigade_formation.test.ts`
Expected: all pass

**Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: clean (may need type adjustments on the pool creation — check MilitiaPool interface)

**Step 4: Wire into pipeline**

In `src/sim/turn_phases/war_phases.ts`, add a new step BEFORE `brigade-reinforcement` (before line 1604):

```typescript
    {
        name: 'reroute-pool-surplus',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { reroutePoolSurplus } = require('../recruitment_engine.js');
            // Build unspawned OOB map from context
            const oobCatalog = context.input.oobCatalog;
            if (!oobCatalog) return;
            const activeIds = new Set(Object.keys(context.state.military.formations ?? {}));
            for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
                const unspawnedByMun: Record<string, { faction: string; initial_personnel: number }[]> = {};
                for (const b of oobCatalog) {
                    if (b.faction !== faction) continue;
                    if (activeIds.has(b.id)) continue;
                    if (!unspawnedByMun[b.home_mun]) unspawnedByMun[b.home_mun] = [];
                    unspawnedByMun[b.home_mun].push({ faction: b.faction, initial_personnel: b.initial_personnel ?? b.manpower_cost ?? 500 });
                }
                reroutePoolSurplus(context.state, faction, unspawnedByMun);
            }
        }
    },
```

Note: Check how `oobCatalog` is available in context. It may be stored as `context.input.oobBrigades` or loaded separately. Grep for `oobCatalog` or `oob_brigades` in war_phases.ts to find the correct field name. If not available, the implementer must pass it through the pipeline input or load it inline.

**Step 5: Run tsc + full tests**

Run: `npx tsc --noEmit`
Run: `npm run test:vitest`
Expected: all pass

**Step 6: Commit**

```bash
git add src/sim/recruitment_engine.ts src/sim/turn_phases/war_phases.ts tests/emergent_brigade_formation.test.ts
git commit -m "feat(sim): surplus pool rerouting — transfer manpower from exhausted to deficit municipalities"
```

---

### Task 4: Calibration Run — Pool Rerouting

**Files:** None modified — verification only

**Step 1: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`

**Step 2: Compare + Diagnostics**

Run: `node tools/compare_painted_vs_sim.cjs runs/<latest_dir>`
Run: `node tools/diagnose_run.cjs runs/<latest_dir>`

**Step 3: Check rerouting effect**

```bash
node -e "
const s=require('./runs/<dir>/final_save.json');
const fmns = Object.values(s.military.formations);
const rbih = fmns.filter(f => f.faction === 'RBiH' && f.status === 'active' && f.kind === 'brigade');
const rs = fmns.filter(f => f.faction === 'RS' && f.status === 'active' && f.kind === 'brigade');
const hrhb = fmns.filter(f => f.faction === 'HRHB' && f.status === 'active' && f.kind === 'brigade');
console.log('RBiH:', rbih.length, 'brigs |', rbih.reduce((s,f)=>s+f.personnel,0), 'pers');
console.log('RS:', rs.length, 'brigs |', rs.reduce((s,f)=>s+f.personnel,0), 'pers');
console.log('HRHB:', hrhb.length, 'brigs |', hrhb.reduce((s,f)=>s+f.personnel,0), 'pers');
console.log('RS+HRHB:', rs.reduce((s,f)=>s+f.personnel,0) + hrhb.reduce((s,f)=>s+f.personnel,0));
// Check if rerouting helped form new brigades
const pools = s.military.militia_pools || {};
['zenica','maglaj','novo_sarajevo','visoko','olovo','cazin'].forEach(m => {
    const p = pools[m+':RBiH'];
    const brigs = rbih.filter(f => (f.tags||[]).some(t => t === 'mun:'+m));
    console.log(m, '| pool:', p?.available, '| brigs:', brigs.length);
});
"
```

**Expected:**
- Zenica/Maglaj pools drawn down (surplus rerouted)
- Visoko/Olovo/Cazin pools increased (received manpower)
- 2-4 additional RBiH brigades formed from rerouted manpower
- RBiH total: ~160-170k (from 149k baseline)
- RBiH should now exceed or approach RS+HRHB combined

**Step 4: Freeze if acceptable**

Run: `node tools/freeze_baseline.cjs runs/<latest_dir>`

**Step 5: Commit results**

```bash
git add data/calibration/baseline_40w.json data/derived/latest_run_final_save.json
git commit -m "calibrate: emergent phase 2 — enclave fix + pool rerouting baseline"
```

---

## Post-Implementation Notes

**Remaining Phase 2 items (deferred):**
- Dissolved brigade personnel → return to municipality pool instead of strategic reserve
- Beyond-OOB emergent generic brigades (only if pool rerouting + enclave fix are insufficient)
- Tiered max_personnel (light=1,500, mountain=2,000, motorized=3,000)
- Displacement-responsive pool routing (route displaced to municipalities with formation potential)

**Key files to read before implementing:**
- `src/sim/recruitment_engine.ts` — canFormEmergentBrigade, getMunBrigadesForFaction
- `src/state/formation_constants.ts` — FORMATION_CAPACITY_THRESHOLD, ENCLAVE_MAX_PERSONNEL
- `src/sim/formation_spawn.ts:245-350` — reinforceBrigadesFromPools (the reinforcement loop)
- `src/sim/turn_phases/war_phases.ts:1600-1640` — pipeline step ordering around reinforcement
- `tests/emergent_brigade_formation.test.ts` — existing tests
