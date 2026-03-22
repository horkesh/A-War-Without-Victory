# Commander Override Layer (Phase A) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a commander review step after mechanical brigade assignment that overrides sector allocations based on strategic intent — fixing 2KK Prozor drift, SRK siege ring gaps, and Drina over-extension.

**Architecture:** New `commanderReviewAssignment()` function runs per-corps after all mechanical assignment steps (budget fill, cross-corps enclave, minimum coverage, rear reclassify). It evaluates 4 criteria (mission compliance, non-priority excess, offensive staging, defensive coherence) and produces `CommanderOverride[]` that mutate sector `assigned_brigade_ids`. Commander personality (aggressiveness, competence) gates and shapes the review. Separately, supply-aware operation sizing replaces the binary supply gate in `bot_corps_directives.ts`.

**Tech Stack:** TypeScript, Vitest, existing `CorpsFrontSector`/`CorpsCommanderProfile`/`ArmyOperationPriority` types.

**Source design:** `docs/30_planning/COMMANDER_OVERRIDE_LAYER.md`

---

## Task 1: CommanderOverride type + stub function

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — add type + stub function
- Create: `tests/commander_override.test.ts`

**Step 1: Add CommanderOverride type and stub function**

Add after the `CorpsCommanderProfile` interface (~line 603):

```typescript
export interface CommanderOverride {
    brigade_id: string;
    from_sector_id: string;
    to_sector_id: string;
    reason: 'mission_priority' | 'non_priority_excess' | 'offensive_staging' | 'defensive_critical';
}

/**
 * Commander reviews mechanical assignment and issues overrides.
 * Called per-corps after all mechanical steps. Mutates sectors in place.
 * Low-competence commanders (< 0.35) skip entirely.
 */
export function commanderReviewAssignment(
    corpsId: string,
    sectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    adjacency: Map<string, string[]>,
    componentOf: Map<string, number>,
): CommanderOverride[] {
    // Competence gate: low-competence commanders don't override
    if (commanderProfile.competence < COMMANDER_COMPETENCE_OVERRIDE_THRESHOLD) {
        return [];
    }

    const corpsSectors = sectors.filter(s => s.corps_id === corpsId);
    if (corpsSectors.length < 2) return []; // Need 2+ sectors to redistribute

    const overrides: CommanderOverride[] = [];

    // Criteria 1: Mission compliance
    applyMissionCompliance(corpsSectors, formations, armyPriorities, commanderProfile, overrides, componentOf);

    // Criteria 2: Non-priority excess
    applyNonPriorityExcess(corpsSectors, formations, armyPriorities, commanderProfile, overrides, componentOf);

    // Criteria 3: Offensive staging
    applyOffensiveStaging(corpsSectors, formations, commanderProfile, overrides, componentOf);

    // Criteria 4: Defensive coherence
    applyDefensiveCoherence(corpsSectors, formations, commanderProfile, overrides, componentOf);

    // Apply overrides to sector assigned_brigade_ids
    for (const ov of overrides) {
        const fromSec = sectors.find(s => s.sector_id === ov.from_sector_id);
        const toSec = sectors.find(s => s.sector_id === ov.to_sector_id);
        if (!fromSec || !toSec) continue;
        const idx = fromSec.assigned_brigade_ids.indexOf(ov.brigade_id);
        if (idx >= 0) {
            fromSec.assigned_brigade_ids.splice(idx, 1);
            toSec.assigned_brigade_ids.push(ov.brigade_id);
        }
    }

    return overrides;
}

const COMMANDER_COMPETENCE_OVERRIDE_THRESHOLD = 0.35;
```

**Step 2: Write failing test for competence gate**

```typescript
// tests/commander_override.test.ts
import { describe, it, expect } from 'vitest';
import { commanderReviewAssignment, type CommanderOverride } from '../src/sim/combat/corps_front_sectors.js';

// Minimal sector factory
function makeSector(id: string, corpsId: string, assignedIds: string[], edges: number, threatRatio: number): any {
    return {
        sector_id: id,
        corps_id: corpsId,
        faction: 'RS' as const,
        opposing_factions: ['RBiH'],
        edge_ids: Array.from({ length: edges }, (_, i) => `e${i}`),
        sub_segments: [{ friendly_osids: [`osid_${id}_f1`], hostile_osids: [`osid_${id}_h1`] }],
        length_edges: edges,
        territory_osids: [`osid_${id}_f1`, `osid_${id}_t1`],
        assigned_brigade_ids: [...assignedIds],
        reserve_brigade_ids: [],
        density: assignedIds.length / edges,
        threat_ratio: threatRatio,
        defensive_power: assignedIds.length * 1000,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeFormation(id: string, locationOsid: string, corpsId: string, homeOsid?: string): any {
    return {
        id,
        location_osid: locationOsid,
        corps_id: corpsId,
        home_osid: homeOsid ?? locationOsid,
        status: 'active',
        kind: 'brigade',
        personnel: { current: 800, max: 1200 },
    };
}

describe('commanderReviewAssignment', () => {
    it('skips review for low-competence commanders', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1', 'b2', 'b3'], 6, 2.0),
            makeSector('s2', 'vrs_drina', ['b4'], 6, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina'),
            b2: makeFormation('b2', 'osid_s1_f1', 'vrs_drina'),
            b3: makeFormation('b3', 'osid_s1_f1', 'vrs_drina'),
            b4: makeFormation('b4', 'osid_s2_f1', 'vrs_drina'),
        };
        const profile = { competence: 0.2, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), new Map()
        );
        expect(result).toEqual([]);
    });

    it('skips review when corps has fewer than 2 sectors', () => {
        const sectors = [makeSector('s1', 'vrs_drina', ['b1'], 6, 1.0)];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina'),
        };
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), new Map()
        );
        expect(result).toEqual([]);
    });
});
```

**Step 3: Run test**

```bash
npx vitest run tests/commander_override.test.ts
```

Expected: PASS (stub returns [] for low competence and <2 sectors)

**Step 4: Commit**

```bash
git add src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: commander override type + stub with competence gate"
```

---

## Task 2: Defensive coherence criterion

Start with defensive coherence — the simplest and highest-impact criterion. If any sector has threat_ratio > `DEFENSIVE_CRITICAL_THREAT` and fewer brigades than its garrison budget, pull from lowest-threat sectors.

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — implement `applyDefensiveCoherence`
- Modify: `tests/commander_override.test.ts`

**Step 1: Write failing test**

```typescript
describe('defensive coherence', () => {
    it('moves brigade from low-threat to critically under-garrisoned sector', () => {
        // s1: high threat (3.0), 1 brigade, needs more
        // s2: low threat (0.3), 3 brigades, has surplus
        const sectors = [
            makeSector('s1', 'vrs_srk', ['b1'], 8, 3.0),
            makeSector('s2', 'vrs_srk', ['b2', 'b3', 'b4'], 4, 0.3),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_srk'),
            b2: makeFormation('b2', 'osid_s2_f1', 'vrs_srk'),
            b3: makeFormation('b3', 'osid_s2_f1', 'vrs_srk'),
            b4: makeFormation('b4', 'osid_s2_f1', 'vrs_srk'),
        };
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const componentOf = new Map([
            ['osid_s1_f1', 0], ['osid_s1_t1', 0],
            ['osid_s2_f1', 0], ['osid_s2_t1', 0],
        ]);
        const result = commanderReviewAssignment(
            'vrs_srk', sectors, formations, [], profile,
            new Map(), componentOf,
        );
        // Should move at least 1 brigade from s2 to s1
        expect(result.some(o => o.to_sector_id === 's1' && o.from_sector_id === 's2')).toBe(true);
        expect(result[0]?.reason).toBe('defensive_critical');
        // s1 should now have 2+ brigades
        expect(sectors[0].assigned_brigade_ids.length).toBeGreaterThanOrEqual(2);
    });

    it('does not strip last brigade from donor sector', () => {
        const sectors = [
            makeSector('s1', 'vrs_srk', ['b1'], 12, 5.0),
            makeSector('s2', 'vrs_srk', ['b2'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_srk'),
            b2: makeFormation('b2', 'osid_s2_f1', 'vrs_srk'),
        };
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const componentOf = new Map([
            ['osid_s1_f1', 0], ['osid_s1_t1', 0],
            ['osid_s2_f1', 0], ['osid_s2_t1', 0],
        ]);
        const result = commanderReviewAssignment(
            'vrs_srk', sectors, formations, [], profile,
            new Map(), componentOf,
        );
        // s2 should keep its last brigade
        expect(sectors[1].assigned_brigade_ids.length).toBeGreaterThanOrEqual(1);
    });
});
```

**Step 2: Implement `applyDefensiveCoherence`**

Constants:
```typescript
const DEFENSIVE_CRITICAL_THREAT = 2.0;
const GARRISON_BUDGET_EDGES_PER_BRIGADE = 6;
const MIN_DONOR_BRIGADES = 1; // Never strip below this
```

Logic:
1. Find deficit sectors: `threat_ratio >= DEFENSIVE_CRITICAL_THREAT` AND `assigned < ceil(length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE)`
2. Find surplus sectors: `assigned > ceil(length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE)` AND `assigned > MIN_DONOR_BRIGADES`
3. Sort deficit by threat descending, surplus by threat ascending
4. Transfer brigades from lowest-threat surplus to highest-threat deficit
5. Pick brigade with lowest personnel (least disruption to strong sectors)
6. Cap transfers: each deficit sector receives at most `budget - assigned` brigades
7. Guard: donor must keep `MIN_DONOR_BRIGADES`

**Step 3: Run tests**

```bash
npx vitest run tests/commander_override.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: commander override — defensive coherence criterion"
```

---

## Task 3: Mission compliance criterion

If army priorities specify `target_municipalities` for this corps and a sector faces those municipalities but is under-garrisoned relative to other sectors, pull brigades toward the mission.

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — implement `applyMissionCompliance`
- Modify: `tests/commander_override.test.ts`

**Step 1: Write failing test**

```typescript
describe('mission compliance', () => {
    it('concentrates brigades at mission-relevant sector', () => {
        // s1 faces target municipality "bihac" — mission sector, 1 brigade
        // s2 faces non-target territory — 3 brigades
        const sectors = [
            { ...makeSector('s1', 'vrs_2kk', ['b1'], 6, 1.0),
              territory_osids: ['op:bihac:bihac_f1', 'op:bihac:t1'] },
            { ...makeSector('s2', 'vrs_2kk', ['b2', 'b3', 'b4'], 4, 0.5),
              territory_osids: ['op:livno:livno_f1', 'op:livno:t1'] },
        ];
        // Sub-segments with hostile osids in target municipality
        sectors[0].sub_segments = [{ friendly_osids: ['op:bihac:bihac_f1'], hostile_osids: ['op:bihac:enemy1'] }];
        sectors[1].sub_segments = [{ friendly_osids: ['op:livno:livno_f1'], hostile_osids: ['op:livno:enemy1'] }];

        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:bihac:bihac_f1', 'vrs_2kk'),
            b2: makeFormation('b2', 'op:livno:livno_f1', 'vrs_2kk'),
            b3: makeFormation('b3', 'op:livno:livno_f1', 'vrs_2kk'),
            b4: makeFormation('b4', 'op:livno:livno_f1', 'vrs_2kk'),
        };
        const priorities = [{
            name: 'Bihac Pocket',
            corps_id: 'vrs_2kk',
            target_municipalities: ['bihac'],
            start_week: 0, end_week: 52, weight: 10,
            min_outcome: 'stalemate' as const,
        }];
        const profile = { competence: 0.6, aggressiveness: 0.6, preStagingSectorWeights: new Map() };
        const componentOf = new Map([
            ['op:bihac:bihac_f1', 0], ['op:bihac:t1', 0],
            ['op:livno:livno_f1', 0], ['op:livno:t1', 0],
        ]);

        const result = commanderReviewAssignment(
            'vrs_2kk', sectors, formations, priorities, profile,
            new Map(), componentOf,
        );
        expect(result.some(o => o.to_sector_id === 's1' && o.reason === 'mission_priority')).toBe(true);
        expect(sectors[0].assigned_brigade_ids.length).toBeGreaterThan(1);
    });
});
```

**Step 2: Implement `applyMissionCompliance`**

Logic:
1. Build set of target municipalities from `armyPriorities[].target_municipalities`
2. For each sector, check if any hostile OSID's municipality is in the target set — mark as "mission sector"
3. Compute mission sector deficit: if mission sector assigned < desired (edges-based budget), it needs brigades
4. Find non-mission sectors with surplus (assigned > budget)
5. Transfer surplus from non-mission to mission sectors, sorted by priority weight
6. Aggressive commanders (`aggressiveness >= 0.6`) pull one MORE brigade than strict budget says
7. Guard: donor keeps MIN_DONOR_BRIGADES
8. Guard: don't override if brigade already moved by another criterion (check `overrides` list)

Helper: `munFromOsid(osid)` already exists as a shared utility.

**Step 3: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: commander override — mission compliance criterion"
```

---

## Task 4: Non-priority excess criterion

Release brigades from sectors that face territory NOT in `target_municipalities` and NOT in `hold_municipalities`, when those sectors have more than the minimum garrison.

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — implement `applyNonPriorityExcess`
- Modify: `tests/commander_override.test.ts`

**Step 1: Write failing test**

```typescript
describe('non-priority excess', () => {
    it('releases excess from non-priority sector to any deficit sector', () => {
        // s1: mission sector, below budget — 1 brigade, 8 edges
        // s2: non-priority, over budget — 4 brigades, 4 edges (budget=1)
        const sectors = [
            { ...makeSector('s1', 'vrs_2kk', ['b1'], 8, 1.5),
              sub_segments: [{ friendly_osids: ['op:bihac:f1'], hostile_osids: ['op:bihac:h1'] }] },
            { ...makeSector('s2', 'vrs_2kk', ['b2', 'b3', 'b4', 'b5'], 4, 0.3),
              sub_segments: [{ friendly_osids: ['op:prozor:f1'], hostile_osids: ['op:prozor:h1'] }] },
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:bihac:f1', 'vrs_2kk'),
            b2: makeFormation('b2', 'op:prozor:f1', 'vrs_2kk'),
            b3: makeFormation('b3', 'op:prozor:f1', 'vrs_2kk'),
            b4: makeFormation('b4', 'op:prozor:f1', 'vrs_2kk'),
            b5: makeFormation('b5', 'op:prozor:f1', 'vrs_2kk'),
        };
        const priorities = [{
            name: 'Bihac', corps_id: 'vrs_2kk',
            target_municipalities: ['bihac'], start_week: 0, end_week: 52,
            weight: 10, min_outcome: 'stalemate' as const,
        }];
        const profile = { competence: 0.5, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const componentOf = new Map([
            ['op:bihac:f1', 0], ['op:bihac:h1', 0],
            ['op:prozor:f1', 0], ['op:prozor:h1', 0],
        ]);

        const result = commanderReviewAssignment(
            'vrs_2kk', sectors, formations, priorities, profile,
            new Map(), componentOf,
        );
        expect(result.some(o =>
            o.from_sector_id === 's2' && o.reason === 'non_priority_excess'
        )).toBe(true);
    });
});
```

**Step 2: Implement `applyNonPriorityExcess`**

Logic:
1. Build set of priority + hold municipalities from army priorities
2. Sectors facing ONLY non-priority municipalities are "non-priority"
3. Non-priority sectors with `assigned > ceil(edges / GARRISON_BUDGET_EDGES_PER_BRIGADE)` have excess
4. Send excess to any sector with `assigned < budget`
5. Defensive commanders (`aggressiveness <= 0.4`) keep one extra brigade in non-priority sectors (conservative)
6. Guard: donor keeps `MIN_DONOR_BRIGADES`
7. Guard: skip brigades already moved by earlier criteria

**Step 3: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: commander override — non-priority excess criterion"
```

---

## Task 5: Offensive staging criterion

Concentrate surplus brigades at sectors with active operation in `force_staging` or `assessment` phase.

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — implement `applyOffensiveStaging`
- Modify: `tests/commander_override.test.ts`

**Step 1: Write failing test**

```typescript
describe('offensive staging', () => {
    it('concentrates brigades at sector with staging operation', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 6, 1.0),
            makeSector('s2', 'vrs_drina', ['b2', 'b3', 'b4'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina'),
            b2: makeFormation('b2', 'osid_s2_f1', 'vrs_drina'),
            b3: makeFormation('b3', 'osid_s2_f1', 'vrs_drina'),
            b4: makeFormation('b4', 'osid_s2_f1', 'vrs_drina'),
        };
        // s1 has staging operation (weight 3.0)
        const profile = {
            competence: 0.6, aggressiveness: 0.7,
            preStagingSectorWeights: new Map([['s1', 3.0]]),
        };
        const componentOf = new Map([
            ['osid_s1_f1', 0], ['osid_s1_t1', 0],
            ['osid_s2_f1', 0], ['osid_s2_t1', 0],
        ]);

        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), componentOf,
        );
        expect(result.some(o => o.to_sector_id === 's1' && o.reason === 'offensive_staging')).toBe(true);
    });

    it('defensive commander does not over-stage', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 6, 1.0),
            makeSector('s2', 'vrs_drina', ['b2', 'b3'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina'),
            b2: makeFormation('b2', 'osid_s2_f1', 'vrs_drina'),
            b3: makeFormation('b3', 'osid_s2_f1', 'vrs_drina'),
        };
        const profile = {
            competence: 0.6, aggressiveness: 0.3, // defensive
            preStagingSectorWeights: new Map([['s1', 3.0]]),
        };
        const componentOf = new Map([
            ['osid_s1_f1', 0], ['osid_s1_t1', 0],
            ['osid_s2_f1', 0], ['osid_s2_t1', 0],
        ]);

        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), componentOf,
        );
        // Defensive commander refuses to thin s2 below budget
        expect(sectors[1].assigned_brigade_ids.length).toBeGreaterThanOrEqual(1);
    });
});
```

**Step 2: Implement `applyOffensiveStaging`**

Logic:
1. Check `commanderProfile.preStagingSectorWeights` for staging sectors (weight >= 1.5)
2. If staging sector has fewer brigades than `budget + stagingBonus`, pull from non-staging surplus
3. `stagingBonus`: aggressive (>= 0.6) = 2 extra, balanced = 1 extra, defensive (<= 0.4) = 0 extra
4. Pull from lowest-threat non-staging sector with surplus
5. Guard: donor keeps MIN_DONOR_BRIGADES

**Step 3: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
git add src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: commander override — offensive staging criterion"
```

---

## Task 6: Pipeline integration in buildFactionSectors

Wire `commanderReviewAssignment` into the `buildFactionSectors` pipeline as Step 8a between reclassifyRearBrigades (Step 8) and deduplicateBrigadesAcrossSectors (Step 8b).

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts` — add call in pipeline

**Step 1: Add call site**

After Step 8 (`reclassifyRearBrigades`, ~line 235) and before Step 8b (`deduplicateBrigadesAcrossSectors`, ~line 239):

```typescript
    // Step 8a: Commander reviews and overrides mechanical assignment
    const armyPriorities = getCorpsArmyPriorities ?? [];
    const uniqueCorps = [...new Set(sectors.map(s => s.corps_id))];
    for (const cid of uniqueCorps.sort()) {
        const profile = commanderProfiles.get(cid);
        if (!profile) continue;
        const priorities = getActiveArmyPriorities(faction, cid, state.turn);
        commanderReviewAssignment(
            cid, sectors, formations, priorities, profile,
            adjacency, componentOf,
        );
    }
```

Need to import `getCorpsArmyPriorities` from `bot_strategy.ts` (it's exported as `getActiveArmyPriorities` or similar — check actual export name).

Also need to pass `adjacency` and `componentOf` through to this point — they're already available in `buildFactionSectors` scope.

**Step 2: Verify pipeline doesn't break existing tests**

```bash
npx vitest run
```

Expected: ALL existing tests pass. The commander override layer is purely additive — it only moves brigades between sectors that are already correctly assigned.

**Step 3: Commit**

```bash
git add src/sim/combat/corps_front_sectors.ts
git commit -m "feat: wire commander override into buildFactionSectors pipeline"
```

---

## Task 7: Supply-aware operation sizing

Replace the binary supply gate in `bot_corps_directives.ts` with graduated response.

**Files:**
- Modify: `src/sim/combat/bot_corps_directives.ts` — graduated supply response
- Modify: `tests/commander_override.test.ts` — add supply sizing tests

**Step 1: Write failing tests**

```typescript
describe('supply-aware operation sizing', () => {
    // These test the logic conceptually — actual integration test runs via 40w scenario
    it('strained supply limits operation to surplus brigade count', () => {
        // Test the sizing function directly
        const surplusCount = 3;
        const maxBrigades = computeSupplyAwareOpSize(
            { critical_fraction: 0.3, adequate_fraction: 0.4 },
            surplusCount,
            12, // MAX_PARTICIPATING_BRIGADES
        );
        expect(maxBrigades).toBe(3); // limited to surplus
    });

    it('adequate supply allows full operation', () => {
        const maxBrigades = computeSupplyAwareOpSize(
            { critical_fraction: 0.1, adequate_fraction: 0.8 },
            5,
            12,
        );
        expect(maxBrigades).toBe(12); // full
    });

    it('critical supply blocks all operations', () => {
        const maxBrigades = computeSupplyAwareOpSize(
            { critical_fraction: 0.6, adequate_fraction: 0.1 },
            5,
            12,
        );
        expect(maxBrigades).toBe(0); // blocked
    });
});
```

**Step 2: Implement `computeSupplyAwareOpSize`**

Add exported function in `bot_corps_directives.ts`:

```typescript
export function computeSupplyAwareOpSize(
    supplyHealth: { critical_fraction: number; adequate_fraction: number },
    surplusBrigadeCount: number,
    maxParticipatingBrigades: number,
): number {
    // Critical: >50% brigades critical supply → no operations
    if (supplyHealth.critical_fraction > 0.5) return 0;

    // Adequate: >=50% adequate → full operations
    if (supplyHealth.adequate_fraction >= 0.5) return maxParticipatingBrigades;

    // Strained: limit to surplus count (allows limited counterattacks)
    return Math.min(surplusBrigadeCount, maxParticipatingBrigades);
}
```

**Step 3: Replace binary gate**

At the supply gate (~line 941), replace:
```typescript
// OLD: binary strip
if (supplyHealth.critical_fraction > 0.5) {
    offensiveTargets.length = 0;
}
```

With:
```typescript
// NEW: graduated response
const surplusCount = computeCorpsSurplus(corpsSectors, formations);
const maxOpSize = computeSupplyAwareOpSize(supplyHealth, surplusCount, MAX_PARTICIPATING_BRIGADES);
if (maxOpSize === 0) {
    offensiveTargets.length = 0;
}
// maxOpSize passed down to operation launch sizing
```

Add `computeCorpsSurplus` helper: count brigades beyond garrison budget across all corps sectors.

**Step 4: Run tests, commit**

```bash
npx vitest run tests/commander_override.test.ts
npx vitest run
git add src/sim/combat/bot_corps_directives.ts tests/commander_override.test.ts
git commit -m "feat: supply-aware operation sizing replaces binary gate"
```

---

## Task 8: Full integration — typecheck + vitest + 40w scenario

**Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 2: Full test suite**

```bash
npx vitest run
```

All tests must pass.

**Step 3: Run /simplify**

Invoke `/simplify` skill to review all changed code for reuse, quality, and efficiency.

**Step 4: Run 40w scenario**

```bash
npm run sim:scenario:run:40w
```

**Step 5: Run comparison tool**

```bash
node tools/compare_painted_vs_sim.cjs <run_dir>
```

**Step 6: Record results in CALIBRATION_MASTER.md**

Expected improvements:
- Drina region: 76.8% → 80%+ (commander caps over-extension)
- Krajina: stable or improved (2KK brigades move toward Bihac)
- SRK: siege ring brigade count should increase

**Step 7: Run /war-or-game for sign-off**

Invoke `/war-or-game` skill on the 40w results.

**Step 8: Commit integration + version bump**

```bash
git add -A
git commit -m "feat: commander override layer Phase A — v0.4.6"
```

Update `package.json` version to `0.4.6`.

---

## Execution Checklist

| Step | Task | Gate |
|------|------|------|
| 1 | Type + stub + competence gate tests | Tests pass |
| 2 | Defensive coherence | Tests pass |
| 3 | Mission compliance | Tests pass |
| 4 | Non-priority excess | Tests pass |
| 5 | Offensive staging | Tests pass |
| 6 | Pipeline integration | All vitest pass |
| 7 | Supply-aware op sizing | All vitest pass |
| 8 | /simplify → 40w → /war-or-game | Sign-off |
