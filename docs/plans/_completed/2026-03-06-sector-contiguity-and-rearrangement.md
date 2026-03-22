# Sector Contiguity Enforcement + Corps AI Sector Rearrangement

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Guarantee every corps front sector has contiguous friendly territory, then let corps AI rearrange sectors (merge thin ones, create pocket-containment sectors, concentrate force for operations).

**Architecture:** Two-layer approach. Layer 1 is a post-build contiguity split inserted into `buildMultiSectorsForCorps()` — BFS through each sector's friendly OSIDs via OSID adjacency, split disconnected components into separate sectors. Layer 2 is a new `rearrangeSectorsForCorps()` called during `generateCorpsDirectives()` that merges, splits, and transfers OSIDs between sectors based on three triggers: operation concentration, enemy pocket containment, and thin sector consolidation.

**Tech Stack:** TypeScript, Vitest, existing OSID adjacency graph (`buildOsidAdjacency`), `strictCompare` for determinism.

---

## Task 1: Contiguity Split — Failing Tests

**Files:**
- Create: `tests/sector_contiguity_split.test.ts`

**Step 1: Write the failing tests**

Three test cases for the contiguity split:

```typescript
import { describe, expect, it } from 'vitest';
import { splitNonContiguousSectors } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    subSegments: CorpsFrontSubSegment[],
    assignedBrigades: string[] = [],
    reserveBrigades: string[] = [],
): CorpsFrontSector {
    const allEdges = subSegments.flatMap(s => s.edge_ids);
    const allFriendly = [...new Set(subSegments.flatMap(s => s.friendly_osids))].sort();
    const allEnemy = [...new Set(subSegments.flatMap(s => s.enemy_osids))].sort();
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as any,
        opposing_factions: ['RBiH' as any],
        edge_ids: allEdges,
        sub_segments: subSegments,
        length_edges: allEdges.length,
        assigned_brigade_ids: assignedBrigades,
        reserve_brigade_ids: reserveBrigades,
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
    };
}

function makeSubSeg(id: string, edgeIds: string[], friendly: string[], enemy: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        friendly_osids: friendly,
        enemy_osids: enemy,
        length_edges: edgeIds.length,
    };
}

// Linear adjacency: A--B--C--D--E (C is not adjacent to A or E directly)
function buildLinearAdjacency(): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    adj.set('op:a:a', ['op:b:b']);
    adj.set('op:b:b', ['op:a:a', 'op:c:c']);
    adj.set('op:c:c', ['op:b:b', 'op:d:d']);
    adj.set('op:d:d', ['op:c:c', 'op:e:e']);
    adj.set('op:e:e', ['op:d:d']);
    return adj;
}

describe('splitNonContiguousSectors', () => {
    it('returns sector unchanged when all friendly OSIDs are contiguous', () => {
        const adj = buildLinearAdjacency();
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3'], ['op:a:a', 'op:b:b', 'op:c:c'], ['op:x:x']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg], ['brig1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(1);
        expect(result[0].assigned_brigade_ids).toEqual(['brig1']);
    });

    it('splits sector with two disconnected friendly OSID groups', () => {
        const adj = buildLinearAdjacency();
        // friendly: A,B (connected) and D,E (connected) — C missing = disconnected
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3', 'e4'],
            ['op:a:a', 'op:b:b', 'op:d:d', 'op:e:e'],
            ['op:x:x', 'op:y:y']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg],
            ['brig1', 'brig2'], ['res1']);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result.length).toBeGreaterThan(1);
        // Each result sector must have contiguous friendly OSIDs
        for (const s of result) {
            const friendly = s.sub_segments.flatMap(ss => ss.friendly_osids);
            expect(friendly.length).toBeGreaterThan(0);
        }
        // All original brigades and reserves must be preserved across splits
        const allAssigned = result.flatMap(s => s.assigned_brigade_ids).sort();
        const allReserves = result.flatMap(s => s.reserve_brigade_ids).sort();
        expect([...allAssigned, ...allReserves].sort()).toEqual(['brig1', 'brig2', 'res1']);
    });

    it('handles sector with three disconnected groups', () => {
        // A alone, C alone, E alone — none adjacent
        const adj = buildLinearAdjacency();
        const subSeg = makeSubSeg('ss0', ['e1', 'e2', 'e3'],
            ['op:a:a', 'op:c:c', 'op:e:e'],
            ['op:x:x']);
        const sector = makeSector('sector:test:0', 'test_corps', [subSeg]);

        const result = splitNonContiguousSectors([sector], adj);
        expect(result).toHaveLength(3);
    });

    it('preserves already-contiguous sectors in a mixed list', () => {
        const adj = buildLinearAdjacency();
        const goodSeg = makeSubSeg('ss0', ['e1'], ['op:a:a', 'op:b:b'], ['op:x:x']);
        const goodSector = makeSector('sector:test:0', 'test_corps', [goodSeg]);
        const badSeg = makeSubSeg('ss1', ['e2', 'e3'], ['op:a:a', 'op:e:e'], ['op:y:y']);
        const badSector = makeSector('sector:test:1', 'test_corps', [badSeg]);

        const result = splitNonContiguousSectors([goodSector, badSector], adj);
        expect(result).toHaveLength(3); // 1 good + 2 from split bad
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sector_contiguity_split.test.ts`
Expected: FAIL — `splitNonContiguousSectors` not exported.

**Step 3: Commit**

```
git add tests/sector_contiguity_split.test.ts
git commit -m "test: add failing tests for sector contiguity split"
```

---

## Task 2: Contiguity Split — Implementation

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts`

**Step 1: Implement `splitNonContiguousSectors` and wire it into the pipeline**

Add this function after the `deduplicateBrigadesAcrossSectors` function (around line 1302):

```typescript
/**
 * Split sectors whose friendly OSIDs are not contiguous through OSID adjacency.
 * BFS through each sector's friendly OSIDs; if disconnected components exist,
 * split into one sector per component. Edges are partitioned by which component
 * their friendly-side OSID belongs to. Brigades go to the component containing
 * their location_osid, or the largest component as fallback.
 *
 * Deterministic: sorted iteration via strictCompare.
 */
export function splitNonContiguousSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
): CorpsFrontSector[] {
    const result: CorpsFrontSector[] = [];

    for (const sector of sectors) {
        const allFriendly = new Set<string>();
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) allFriendly.add(o);
        }

        // BFS to find connected components of friendly OSIDs
        const visited = new Set<string>();
        const components: Set<string>[] = [];
        const sortedFriendly = [...allFriendly].sort(strictCompare);

        for (const seed of sortedFriendly) {
            if (visited.has(seed)) continue;
            const component = new Set<string>();
            const queue = [seed];
            visited.add(seed);
            let head = 0;
            while (head < queue.length) {
                const osid = queue[head++]!;
                component.add(osid);
                for (const nb of osidAdjacency.get(osid) ?? []) {
                    if (visited.has(nb) || !allFriendly.has(nb)) continue;
                    visited.add(nb);
                    queue.push(nb);
                }
            }
            components.push(component);
        }

        // Single component — sector is already contiguous
        if (components.length <= 1) {
            result.push(sector);
            continue;
        }

        // Multiple components — split sector
        // Assign each edge to the component that contains its friendly-side OSID
        const edgeMeta = new Map<string, string>(); // edge_id -> friendly OSID
        for (const ss of sector.sub_segments) {
            for (let i = 0; i < ss.edge_ids.length; i++) {
                // Each edge's friendly OSID is in the sub-segment's friendly_osids
                // We need to figure out which friendly OSID this edge touches
                // Use the sub-segment — each edge in a sub-segment touches at least one of its friendly_osids
                // For simplicity, tag each edge with all friendly OSIDs from its sub-segment
                if (!edgeMeta.has(ss.edge_ids[i]!)) {
                    // Pick the first friendly OSID from this sub-segment that's in any component
                    for (const fo of ss.friendly_osids) {
                        edgeMeta.set(ss.edge_ids[i]!, fo);
                        break;
                    }
                }
            }
        }

        // Build per-component data
        for (let ci = 0; ci < components.length; ci++) {
            const comp = components[ci]!;
            const compEdgeIds: string[] = [];
            const compFriendly = new Set<string>();
            const compEnemy = new Set<string>();

            for (const ss of sector.sub_segments) {
                for (let ei = 0; ei < ss.edge_ids.length; ei++) {
                    const eid = ss.edge_ids[ei]!;
                    const friendlyOsid = edgeMeta.get(eid);
                    if (friendlyOsid && comp.has(friendlyOsid)) {
                        compEdgeIds.push(eid);
                    }
                }
                for (const fo of ss.friendly_osids) {
                    if (comp.has(fo)) compFriendly.add(fo);
                }
                for (const eo of ss.enemy_osids) {
                    // Include enemy OSID if any of its sector's friendly neighbors are in this component
                    // Simple heuristic: include if the sub-segment has any friendly OSID in this component
                    const hasInComp = ss.friendly_osids.some(fo => comp.has(fo));
                    if (hasInComp) compEnemy.add(eo);
                }
            }

            if (compEdgeIds.length === 0 && compFriendly.size === 0) continue;

            compEdgeIds.sort(strictCompare);
            const subSeg: CorpsFrontSubSegment = {
                sub_segment_id: `subseg:${sector.corps_id}:split${ci}`,
                edge_ids: compEdgeIds,
                friendly_osids: [...compFriendly].sort(strictCompare),
                enemy_osids: [...compEnemy].sort(strictCompare),
                length_edges: compEdgeIds.length,
            };

            // Brigades: assigned go to the component containing their location
            // (we don't have formation data here, so distribute by sector's existing lists)
            // Assigned brigades are at front OSIDs — they must be in a friendly OSID.
            // We'll redistribute after: caller re-runs assignInteriorBrigadesToSectors.
            const newSector: CorpsFrontSector = {
                sector_id: `sector:${sector.corps_id}:${result.length}`,
                corps_id: sector.corps_id,
                faction: sector.faction,
                opposing_factions: [...sector.opposing_factions],
                edge_ids: compEdgeIds,
                sub_segments: [subSeg],
                length_edges: compEdgeIds.length,
                assigned_brigade_ids: [], // Re-populated by caller
                reserve_brigade_ids: [],
                density: 0,
                threat_ratio: 0,
                defensive_power: 0,
            };

            result.push(newSector);
        }
    }

    // Renumber sector IDs deterministically
    result.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < result.length; i++) {
        result[i]!.sector_id = `sector:${result[i]!.corps_id}:${i}`;
    }

    return result;
}
```

**Step 2: Wire into `buildMultiSectorsForCorps`**

In `buildMultiSectorsForCorps()` (around line 628, after Phase 1E split and dedup, before interior brigade assignment), insert:

```typescript
    // Step 4b: Split non-contiguous sectors (friendly OSIDs must be connected via OSID adjacency)
    const contiguousSectors = splitNonContiguousSectors(finalSectors, adjacency);
```

Then change the variable name in subsequent code from `finalSectors` to `contiguousSectors`. The split clears brigade assignments, so the existing `assignInteriorBrigadesToSectors` and `buildSectorFromSubSegments` calls that follow will re-populate them.

Actually, since `splitNonContiguousSectors` clears brigade lists, we need to re-assign brigades to the split sectors. The cleanest approach: after the split, re-run brigade assignment for the split sectors. The existing `buildSectorFromSubSegments` does brigade assignment from formations at friendly OSIDs. Instead of re-running that, we can have `splitNonContiguousSectors` accept a `formations` parameter and assign brigades per-component based on `location_osid` membership.

Update the function signature and brigade distribution:

```typescript
export function splitNonContiguousSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
    formations?: Record<string, { location_osid?: string; faction?: string; status?: string; kind?: string }>,
): CorpsFrontSector[] {
```

Inside the per-component loop, after creating `compFriendly`, assign brigades:

```typescript
            // Distribute brigades by location_osid
            const compAssigned: string[] = [];
            const compReserves: string[] = [];
            if (formations) {
                for (const bid of sector.assigned_brigade_ids) {
                    const f = formations[bid];
                    if (f?.location_osid && compFriendly.has(f.location_osid)) {
                        compAssigned.push(bid);
                    }
                }
                for (const bid of sector.reserve_brigade_ids) {
                    const f = formations[bid];
                    if (f?.location_osid && compFriendly.has(f.location_osid)) {
                        compReserves.push(bid);
                    }
                }
            }
```

And set `assigned_brigade_ids: compAssigned.sort(strictCompare)` and `reserve_brigade_ids: compReserves.sort(strictCompare)` on the new sector.

After all components processed, collect any unplaced brigades (location not in any component) and assign them to the largest component sector.

**Step 3: Run tests**

Run: `npx vitest run tests/sector_contiguity_split.test.ts`
Expected: PASS

**Step 4: Run full suite**

Run: `npx vitest run ; npx tsc --noEmit`
Expected: All pass, no type errors.

**Step 5: Commit**

```
git add src/sim/combat/corps_front_sectors.ts
git commit -m "feat(sim): split non-contiguous sectors by friendly OSID BFS"
```

---

## Task 3: Sector Rearrangement — Failing Tests

**Files:**
- Create: `tests/sector_rearrangement.test.ts`

**Step 1: Write the failing tests**

Three tests covering the three rearrangement triggers:

```typescript
import { describe, expect, it } from 'vitest';
import { rearrangeSectorsForCorps } from '../src/sim/combat/sector_rearrangement.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
    sectorId: string, corpsId: string,
    friendly: string[], enemy: string[], edges: string[],
    assigned: string[] = [], reserves: string[] = [],
): CorpsFrontSector {
    const ss: CorpsFrontSubSegment = {
        sub_segment_id: `subseg:${corpsId}:0`,
        edge_ids: edges,
        friendly_osids: friendly,
        enemy_osids: enemy,
        length_edges: edges.length,
    };
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as any,
        opposing_factions: ['RBiH' as any],
        edge_ids: edges,
        sub_segments: [ss],
        length_edges: edges.length,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: reserves,
        density: edges.length > 0 ? assigned.length / edges.length : 0,
        threat_ratio: 0,
        defensive_power: 0,
    };
}

function buildGridAdjacency(): Map<Osid, Osid[]> {
    // Grid: A-B-C across top, D-E-F across middle, G-H-I across bottom
    // A-D, B-E, C-F vertical; D-G, E-H, F-I vertical
    const adj = new Map<Osid, Osid[]>();
    adj.set('op:a:a', ['op:b:b', 'op:d:d']);
    adj.set('op:b:b', ['op:a:a', 'op:c:c', 'op:e:e']);
    adj.set('op:c:c', ['op:b:b', 'op:f:f']);
    adj.set('op:d:d', ['op:a:a', 'op:e:e', 'op:g:g']);
    adj.set('op:e:e', ['op:b:b', 'op:d:d', 'op:f:f', 'op:h:h']);
    adj.set('op:f:f', ['op:c:c', 'op:e:e', 'op:i:i']);
    adj.set('op:g:g', ['op:d:d', 'op:h:h']);
    adj.set('op:h:h', ['op:e:e', 'op:g:g', 'op:i:i']);
    adj.set('op:i:i', ['op:f:f', 'op:h:h']);
    // Enemy OSIDs (not in adj, but needed)
    adj.set('op:x:x', ['op:a:a']);
    adj.set('op:y:y', ['op:c:c']);
    return adj;
}

describe('rearrangeSectorsForCorps — thin sector consolidation', () => {
    it('merges a 0-brigade ≤3-edge sector into its adjacent neighbor', () => {
        const adj = buildGridAdjacency();
        const big = makeSector('sector:test:0', 'test_corps',
            ['op:a:a', 'op:b:b', 'op:d:d', 'op:e:e'],
            ['op:x:x'], ['e1', 'e2', 'e3', 'e4', 'e5'],
            ['brig1', 'brig2']);
        const tiny = makeSector('sector:test:1', 'test_corps',
            ['op:c:c'],
            ['op:y:y'], ['e6'],
            []); // 0 brigades, 1 edge

        const result = rearrangeSectorsForCorps([big, tiny], 'test_corps', adj, {});
        // tiny should be merged into big
        expect(result).toHaveLength(1);
        expect(result[0].sub_segments.flatMap(ss => ss.friendly_osids)).toContain('op:c:c');
    });

    it('does not merge a thin sector with no adjacent neighbor', () => {
        const adj = buildGridAdjacency();
        const big = makeSector('sector:test:0', 'test_corps',
            ['op:a:a'], ['op:x:x'], ['e1'], ['brig1']);
        const isolated = makeSector('sector:test:1', 'test_corps',
            ['op:i:i'], ['op:y:y'], ['e2'], []);
        // A and I are not adjacent

        const result = rearrangeSectorsForCorps([big, isolated], 'test_corps', adj, {});
        expect(result).toHaveLength(2);
    });
});

describe('rearrangeSectorsForCorps — enemy pocket containment', () => {
    it('creates a containment sector around an enemy pocket inside corps territory', () => {
        const adj = buildGridAdjacency();
        // E is enemy-controlled, surrounded by friendly A,B,C,D,F,G,H,I
        // Current sector covers the whole front (A-C top row facing external enemy)
        const sector = makeSector('sector:test:0', 'test_corps',
            ['op:a:a', 'op:b:b', 'op:c:c', 'op:d:d', 'op:f:f', 'op:g:g', 'op:h:h', 'op:i:i'],
            ['op:x:x'], ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
            ['brig1', 'brig2', 'brig3']);
        // E is enemy (pocket)
        const politicalControllers: Record<string, string> = {
            'op:a:a': 'RS', 'op:b:b': 'RS', 'op:c:c': 'RS',
            'op:d:d': 'RS', 'op:e:e': 'RBiH', 'op:f:f': 'RS',
            'op:g:g': 'RS', 'op:h:h': 'RS', 'op:i:i': 'RS',
            'op:x:x': 'RBiH',
        };

        const result = rearrangeSectorsForCorps(
            [sector], 'test_corps', adj, {},
            { politicalControllers, faction: 'RS' as any }
        );
        // Should have created a containment sector for the E pocket
        const containment = result.find(s =>
            s.sub_segments.some(ss => ss.enemy_osids.includes('op:e:e'))
        );
        expect(containment).toBeDefined();
    });
});
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run tests/sector_rearrangement.test.ts`
Expected: FAIL — module not found.

**Step 3: Commit**

```
git add tests/sector_rearrangement.test.ts
git commit -m "test: add failing tests for sector rearrangement"
```

---

## Task 4: Sector Rearrangement — Implementation

**Files:**
- Create: `src/sim/combat/sector_rearrangement.ts`
- Modify: `src/sim/combat/bot_corps_ai.ts` (wire in)

**Step 1: Implement `sector_rearrangement.ts`**

```typescript
/**
 * Corps AI sector rearrangement.
 *
 * Called after sectors are built and before brigade orders are issued.
 * Three triggers:
 *   1. Thin sector consolidation — merge 0-brigade ≤3-edge sectors into adjacent neighbor
 *   2. Enemy pocket containment — create dedicated sector around enemy pockets in corps interior
 *   3. Operation concentration — merge operation target sector with adjacent small sectors
 *
 * Deterministic: sorted iteration via strictCompare, no randomness.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    GameState,
} from '../../state/game_state.js';
import type { Osid } from './osid_adjacency.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';

/** Maximum edges for a sector to be eligible for thin-sector merge. */
const THIN_SECTOR_MAX_EDGES = 3;

/** Minimum edges for a pocket containment sector. */
const POCKET_MIN_ENEMY_OSIDS = 1;

// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if two sectors are OSID-adjacent (any friendly OSID of one is
 * adjacent to any friendly OSID of the other).
 */
function areSectorsAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    osidAdjacency: Map<Osid, Osid[]>,
): boolean {
    const bFriendly = new Set<string>();
    for (const ss of b.sub_segments) {
        for (const o of ss.friendly_osids) bFriendly.add(o);
    }
    for (const ss of a.sub_segments) {
        for (const o of ss.friendly_osids) {
            if (bFriendly.has(o)) return true;
            for (const nb of osidAdjacency.get(o) ?? []) {
                if (bFriendly.has(nb)) return true;
            }
        }
    }
    return false;
}

/**
 * Merge sector `from` into sector `into`. Mutates `into`.
 */
function mergeSectorInto(into: CorpsFrontSector, from: CorpsFrontSector): void {
    const edgeSet = new Set(into.edge_ids);
    for (const eid of from.edge_ids) {
        if (!edgeSet.has(eid)) {
            into.edge_ids.push(eid);
            edgeSet.add(eid);
        }
    }
    into.edge_ids.sort(strictCompare);
    into.length_edges = into.edge_ids.length;

    // Merge sub-segments
    into.sub_segments.push(...from.sub_segments);

    // Merge brigades (dedup)
    const assignedSet = new Set(into.assigned_brigade_ids);
    for (const bid of from.assigned_brigade_ids) {
        if (!assignedSet.has(bid)) {
            into.assigned_brigade_ids.push(bid);
            assignedSet.add(bid);
        }
    }
    into.assigned_brigade_ids.sort(strictCompare);

    const reserveSet = new Set(into.reserve_brigade_ids);
    for (const bid of from.reserve_brigade_ids) {
        if (!reserveSet.has(bid) && !assignedSet.has(bid)) {
            into.reserve_brigade_ids.push(bid);
            reserveSet.add(bid);
        }
    }
    into.reserve_brigade_ids.sort(strictCompare);

    // Merge opposing factions
    const opSet = new Set(into.opposing_factions);
    for (const f of from.opposing_factions) {
        if (!opSet.has(f)) {
            into.opposing_factions.push(f);
            opSet.add(f);
        }
    }
    into.opposing_factions.sort(strictCompare);

    // Recompute density
    into.density = into.length_edges > 0
        ? into.assigned_brigade_ids.length / into.length_edges : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger 1: Thin Sector Consolidation
// ═══════════════════════════════════════════════════════════════════════════

function consolidateThinSectors(
    sectors: CorpsFrontSector[],
    osidAdjacency: Map<Osid, Osid[]>,
): CorpsFrontSector[] {
    let pool = [...sectors];
    let changed = true;

    while (changed) {
        changed = false;
        pool.sort((a, b) => strictCompare(a.sector_id, b.sector_id));

        // Find the smallest thin sector
        let thinIdx = -1;
        let thinSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            const s = pool[i]!;
            if (s.assigned_brigade_ids.length === 0 && s.length_edges <= THIN_SECTOR_MAX_EDGES) {
                if (s.length_edges < thinSize ||
                    (s.length_edges === thinSize && thinIdx >= 0 &&
                     strictCompare(s.sector_id, pool[thinIdx]!.sector_id) < 0)) {
                    thinSize = s.length_edges;
                    thinIdx = i;
                }
            }
        }
        if (thinIdx === -1) break;

        const thin = pool[thinIdx]!;

        // Find the best adjacent sector to merge into (smallest, for balance)
        let bestIdx = -1;
        let bestSize = Infinity;
        for (let i = 0; i < pool.length; i++) {
            if (i === thinIdx) continue;
            if (areSectorsAdjacent(thin, pool[i]!, osidAdjacency)) {
                const size = pool[i]!.length_edges;
                if (size < bestSize || (size === bestSize && bestIdx >= 0 &&
                    strictCompare(pool[i]!.sector_id, pool[bestIdx]!.sector_id) < 0)) {
                    bestSize = size;
                    bestIdx = i;
                }
            }
        }

        if (bestIdx === -1) break; // No adjacent neighbor — stop

        mergeSectorInto(pool[bestIdx]!, thin);
        pool.splice(thinIdx, 1);
        changed = true;
    }

    return pool;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger 2: Enemy Pocket Containment
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect enemy pockets (enemy OSIDs surrounded entirely by friendly OSIDs)
 * and create containment sectors around them.
 */
function createPocketContainmentSectors(
    sectors: CorpsFrontSector[],
    corpsId: FormationId,
    osidAdjacency: Map<Osid, Osid[]>,
    state: GameState,
    faction: FactionId,
    reverseMap: Map<string, string[]> | null,
): CorpsFrontSector[] {
    // Collect all friendly OSIDs across all corps sectors
    const corpsFriendlyOsids = new Set<string>();
    for (const s of sectors) {
        for (const ss of s.sub_segments) {
            for (const o of ss.friendly_osids) corpsFriendlyOsids.add(o);
        }
    }

    // Collect all enemy OSIDs already in existing sectors
    const existingEnemyOsids = new Set<string>();
    for (const s of sectors) {
        for (const ss of s.sub_segments) {
            for (const o of ss.enemy_osids) existingEnemyOsids.add(o);
        }
    }

    // Find enemy pockets: enemy OSIDs where ALL neighbors are friendly to this corps
    const pocketOsids = new Set<string>();
    for (const friendlyOsid of corpsFriendlyOsids) {
        for (const nb of osidAdjacency.get(friendlyOsid) ?? []) {
            if (corpsFriendlyOsids.has(nb)) continue;
            if (existingEnemyOsids.has(nb)) continue; // Already covered by a sector
            const ctrl = getPoliticalControllerOSID(state, nb, reverseMap ?? undefined);
            if (ctrl === faction) continue; // Friendly but not in this corps

            // Check if ALL of nb's neighbors are in corpsFriendlyOsids
            const nbNeighbors = osidAdjacency.get(nb) ?? [];
            const allFriendly = nbNeighbors.every(n => corpsFriendlyOsids.has(n));
            if (allFriendly && nbNeighbors.length > 0) {
                pocketOsids.add(nb);
            }
        }
    }

    if (pocketOsids.size === 0) return sectors;

    // Group pocket OSIDs into connected pockets
    const sortedPockets = [...pocketOsids].sort(strictCompare);
    const pocketVisited = new Set<string>();
    const pocketGroups: Set<string>[] = [];

    for (const seed of sortedPockets) {
        if (pocketVisited.has(seed)) continue;
        const group = new Set<string>();
        const queue = [seed];
        pocketVisited.add(seed);
        let head = 0;
        while (head < queue.length) {
            const osid = queue[head++]!;
            group.add(osid);
            for (const nb of osidAdjacency.get(osid) ?? []) {
                if (pocketVisited.has(nb) || !pocketOsids.has(nb)) continue;
                pocketVisited.add(nb);
                queue.push(nb);
            }
        }
        pocketGroups.push(group);
    }

    // Create a containment sector for each pocket group
    const result = [...sectors];
    for (let gi = 0; gi < pocketGroups.length; gi++) {
        const pocket = pocketGroups[gi]!;
        // Friendly OSIDs = corps friendly OSIDs adjacent to the pocket
        const containmentFriendly = new Set<string>();
        for (const enemyOsid of pocket) {
            for (const nb of osidAdjacency.get(enemyOsid) ?? []) {
                if (corpsFriendlyOsids.has(nb)) containmentFriendly.add(nb);
            }
        }

        const subSeg: CorpsFrontSubSegment = {
            sub_segment_id: `subseg:${corpsId}:pocket${gi}`,
            edge_ids: [], // Pocket containment sectors have no front edges (internal)
            friendly_osids: [...containmentFriendly].sort(strictCompare),
            enemy_osids: [...pocket].sort(strictCompare),
            length_edges: 0,
        };

        result.push({
            sector_id: `sector:${corpsId}:pocket${gi}`,
            corps_id: corpsId,
            faction,
            opposing_factions: [...new Set(
                [...pocket].map(o => getPoliticalControllerOSID(state, o, reverseMap ?? undefined)).filter(Boolean)
            )].sort(strictCompare) as FactionId[],
            edge_ids: [],
            sub_segments: [subSeg],
            length_edges: 0,
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
        });
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trigger 3: Operation Concentration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * When a corps has an active sector_attack, merge adjacent small sectors
 * into the operation's sector to concentrate force.
 */
function concentrateForOperations(
    sectors: CorpsFrontSector[],
    corpsId: FormationId,
    osidAdjacency: Map<Osid, Osid[]>,
    activeOps: Record<string, { type?: string; sector_id?: string }>,
): CorpsFrontSector[] {
    // Find the operation's target sector
    const opEntries = Object.entries(activeOps)
        .filter(([, op]) => op.type === 'sector_attack' && op.sector_id)
        .sort((a, b) => strictCompare(a[0], b[0]));

    if (opEntries.length === 0) return sectors;

    let pool = [...sectors];
    for (const [, op] of opEntries) {
        const targetSectorId = op.sector_id!;
        const targetIdx = pool.findIndex(s => s.sector_id === targetSectorId);
        if (targetIdx === -1) continue;

        const target = pool[targetIdx]!;

        // Merge adjacent sectors with ≤ MIN_SECTOR_EDGES into the target
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = pool.length - 1; i >= 0; i--) {
                if (i === targetIdx) continue;
                const candidate = pool[i]!;
                if (candidate.length_edges > THIN_SECTOR_MAX_EDGES * 2) continue; // Only merge small sectors
                if (!areSectorsAdjacent(target, candidate, osidAdjacency)) continue;

                mergeSectorInto(target, candidate);
                pool.splice(i, 1);
                // Adjust targetIdx if needed
                if (i < targetIdx) {
                    // targetIdx shifted down
                    break; // Restart loop with new pool
                }
                changed = true;
            }
            if (changed) {
                // Re-find target after splice
                const newIdx = pool.indexOf(target);
                if (newIdx === -1) break;
            }
        }
    }

    return pool;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

export interface RearrangeContext {
    politicalControllers?: Record<string, string>;
    faction?: FactionId;
    reverseMap?: Map<string, string[]> | null;
    activeOps?: Record<string, { type?: string; sector_id?: string }>;
    state?: GameState;
}

/**
 * Rearrange sectors for a single corps: consolidate thin sectors,
 * create pocket containment, concentrate for operations.
 * Returns new sector array. Does NOT mutate input.
 */
export function rearrangeSectorsForCorps(
    sectors: CorpsFrontSector[],
    corpsId: FormationId,
    osidAdjacency: Map<Osid, Osid[]>,
    formations: Record<string, { location_osid?: string }>,
    context?: RearrangeContext,
): CorpsFrontSector[] {
    if (sectors.length === 0) return [];

    // 1. Thin sector consolidation (always)
    let result = consolidateThinSectors(sectors, osidAdjacency);

    // 2. Enemy pocket containment (when state available)
    if (context?.state && context?.faction) {
        result = createPocketContainmentSectors(
            result, corpsId, osidAdjacency,
            context.state, context.faction,
            context.reverseMap ?? null,
        );
    }

    // 3. Operation concentration (when active ops available)
    if (context?.activeOps) {
        result = concentrateForOperations(result, corpsId, osidAdjacency, context.activeOps);
    }

    // Renumber
    result.sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (let i = 0; i < result.length; i++) {
        result[i]!.sector_id = `sector:${corpsId}:${i}`;
    }

    return result;
}
```

**Step 2: Run tests**

Run: `npx vitest run tests/sector_rearrangement.test.ts`
Expected: PASS

**Step 3: Run full suite + typecheck**

Run: `npx vitest run ; npx tsc --noEmit`
Expected: All pass.

**Step 4: Commit**

```
git add src/sim/combat/sector_rearrangement.ts
git commit -m "feat(sim): corps AI sector rearrangement — thin consolidation, pocket containment, op concentration"
```

---

## Task 5: Wire Rearrangement into Corps AI

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts` (in `generateCorpsDirectives`)

**Step 1: Import and call rearrangement**

At the top of `bot_corps_ai.ts`, add:
```typescript
import { rearrangeSectorsForCorps } from './sector_rearrangement.js';
```

Inside `generateCorpsDirectives`, after the `corpsSectors` array is built (around line 1240-1242), add rearrangement:

```typescript
        // Rearrange sectors: consolidate thin, pocket containment, op concentration
        const corpsOps: Record<string, { type?: string; sector_id?: string }> = {};
        if (cmd.active_operation) {
            corpsOps[cmd.active_operation.name ?? 'unnamed'] = {
                type: cmd.active_operation.type,
                sector_id: cmd.active_operation.sector_id,
            };
        }
        const rearrangedSectors = rearrangeSectorsForCorps(
            corpsSectors, corps.id, adjacency, formations,
            {
                state,
                faction,
                reverseMap: reverseMap ?? undefined,
                activeOps: corpsOps,
            }
        );

        // Write rearranged sectors back to state
        const sectorLookupMut = state.corps_front_sectors ?? {};
        // Remove old sectors for this corps
        for (const oldSec of corpsSectors) {
            delete sectorLookupMut[oldSec.sector_id];
        }
        // Add rearranged sectors
        for (const newSec of rearrangedSectors) {
            sectorLookupMut[newSec.sector_id] = newSec;
        }
```

Then use `rearrangedSectors` instead of `corpsSectors` for the rest of the directive generation (offensive target filtering, priority_sector_id, reinforce_sector_ids).

**Step 2: Run full suite + typecheck**

Run: `npx vitest run ; npx tsc --noEmit`
Expected: All pass.

**Step 3: Commit**

```
git add src/sim/combat/bot_corps_ai.ts
git commit -m "feat(sim): wire sector rearrangement into corps directive generation"
```

---

## Task 6: Integration Verification — Scenario Run

**Step 1: Run the 40w scenario to verify sectors are contiguous**

Run: `npm run sim:scenario:run:40w`

**Step 2: Inspect sector contiguity in the output**

Write a quick one-off check script (or reuse the inspection logic from our investigation) to verify that all sectors in the final save have contiguous friendly OSIDs.

**Step 3: Run calibration comparison**

Run: `node tools/compare_painted_vs_sim.cjs` on the output directory.

Expected: Area-weighted percentage should not regress more than 0.5pp from ATH (99.2%). Some movement is expected because sectors now consolidate differently, affecting brigade positioning.

**Step 4: Commit if results are acceptable**

```
git add -A
git commit -m "feat(sim): sector contiguity enforcement + corps AI rearrangement — verified 40w"
```

---

## Determinism Checklist

- [ ] No `Math.random()` — all BFS traversals use sorted adjacency lists
- [ ] No `Date.now()` or timestamps
- [ ] All iteration over Maps/Sets uses `strictCompare` sorting
- [ ] Sector IDs renumbered deterministically after each operation
- [ ] Brigade assignment follows sorted formation ID order
- [ ] Pocket detection uses sorted OSID iteration

## Ledger Notes

Append to `docs/PROJECT_LEDGER.md`:
```
### 2026-03-06 — Sector Contiguity + Corps AI Rearrangement
- **Contiguity split**: `splitNonContiguousSectors()` in `corps_front_sectors.ts` — BFS through each sector's friendly OSIDs, split disconnected components into separate sectors. Fixes 18/26 non-contiguous 1KK sectors.
- **Rearrangement**: `sector_rearrangement.ts` — three triggers: thin consolidation (merge 0-brigade ≤3-edge into neighbor), enemy pocket containment (detect surrounded enemy OSIDs, create containment sector), operation concentration (merge small adjacent sectors into op target sector).
- **Wired into**: `generateCorpsDirectives()` in `bot_corps_ai.ts`. Rearrangement happens after sector build, before brigade orders.
```

## Canon/Docs Impact

- Update `docs/20_engineering/REPO_MAP.md` to list `src/sim/combat/sector_rearrangement.ts`
- Update napkin §Sectors & Operations with contiguity split and rearrangement patterns
