/**
 * Tests for operation reinforcement pooling — drawing brigades from
 * other sectors within the same corps to reinforce an operation.
 *
 * TDD: tests written first, then implementation.
 */
import { describe, it, expect } from 'vitest';
import {
    computeReinforcementPool,
    checkLoanedArrivals,
    areLoanedBrigadesReady,
    cleanupDissolvedLoans,
} from '../src/sim/combat/operation_reinforcement.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeSector(sectorId: string, corpsId: string, faction: string, opts: Partial<any> = {}): any {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        sub_segments: [],
        territory_osids: [],
        length_edges: 6,
        threat_ratio: 0.5,
        density: 0,
        defensive_power: 0,
        edge_ids: [],
        opposing_factions: [],
        sector_stance: 'defend',
        stance_source: 'bot',
        ...opts,
    };
}

function makeBrigade(id: string, corpsId: string, faction: string, locationOsid: string, opts: Partial<any> = {}): any {
    return {
        id,
        name: id,
        faction,
        corps_id: corpsId,
        kind: 'brigade',
        status: 'active',
        personnel: 1500,
        location_osid: locationOsid,
        disrupted_turns: 0,
        created_turn: 0,
        assignment: null,
        ...opts,
    };
}

function buildLinearAdjacency(osids: string[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const o of osids) adj.set(o as Osid, []);
    for (let i = 0; i < osids.length - 1; i++) {
        adj.get(osids[i]! as Osid)!.push(osids[i + 1]! as Osid);
        adj.get(osids[i + 1]! as Osid)!.push(osids[i]! as Osid);
    }
    return adj;
}

function buildComponents(adjacency: Map<Osid, Osid[]>, friendly: Set<string>): Map<string, number> {
    const componentOf = new Map<string, number>();
    let nextComponent = 0;
    const visited = new Set<string>();

    for (const osid of [...friendly].sort()) {
        if (visited.has(osid)) continue;
        const queue = [osid];
        visited.add(osid);
        while (queue.length > 0) {
            const current = queue.shift()!;
            componentOf.set(current, nextComponent);
            for (const neighbor of adjacency.get(current as Osid) ?? []) {
                if (!visited.has(neighbor) && friendly.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        nextComponent++;
    }
    return componentOf;
}

// ── computeReinforcementPool tests ───────────────────────────────────────────

describe('computeReinforcementPool', () => {
    it('concentrates force even when target sector already has enough brigades', () => {
        // Target sector has 4 brigades — already above MIN_BRIGADES_FOR_SECTOR_ATTACK(3)
        // but corps-wide concentration should still draw from surplus sectors.
        // Source: 3 brigades, budget=ceil(6/6)=1, surplus=2
        const osids = ['op:a:1', 'op:a:2', 'op:a:3', 'op:b:1', 'op:b:2'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1', 'b2', 'b3', 'b4'],
            territory_osids: ['op:a:1', 'op:a:2', 'op:a:3'],
            sub_segments: [{ friendly_osids: ['op:a:1', 'op:a:2'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 12,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b5', 'b6', 'b7'],
            territory_osids: ['op:b:1', 'op:b:2'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:a:1'),
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:a:2'),
            b4: makeBrigade('b4', 'corps1', 'RS', 'op:a:3'),
            b5: makeBrigade('b5', 'corps1', 'RS', 'op:b:1'),
            b6: makeBrigade('b6', 'corps1', 'RS', 'op:b:1'),
            b7: makeBrigade('b7', 'corps1', 'RS', 'op:b:2'),
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            4, // sectorBrigadeCount — already enough, but concentration still draws
        );

        expect(result.length).toBe(2); // surplus of 2 from source
        expect(result[0]!.source_sector_id).toBe('sector:corps1:1');
    });

    it('sources brigades from surplus sector within distance', () => {
        // Target sector has 1 brigade (needs more), source has 3 brigades, budget=1 => surplus=2
        const osids = ['op:a:1', 'op:a:2', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1', 'op:a:2'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3', 'b4'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget = ceil(6/6) = 1, surplus = 3-1 = 2
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1'),
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1'),
            b4: makeBrigade('b4', 'corps1', 'RS', 'op:b:1'),
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1, // only 1 brigade in target sector
        );

        expect(result.length).toBe(2); // surplus of 2
        expect(result[0]!.arrived).toBe(false);
        expect(result[0]!.source_sector_id).toBe('sector:corps1:1');
    });

    it('respects garrison floor — does not strip below budget', () => {
        // Source sector has 2 brigades, 12 edges => budget ceil(12/6) = 2 => no surplus
        const osids = ['op:a:1', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 12, // budget = ceil(12/6) = 2, surplus = 2-2 = 0
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1'),
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1'),
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result).toEqual([]);
    });

    it('respects threat gate — does not pull from sectors with threat_ratio >= 1.5', () => {
        const osids = ['op:a:1', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3', 'b4'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=2 — BUT threat is too high
            threat_ratio: 1.5, // >= SOURCE_SECTOR_MAX_THREAT
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1'),
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1'),
            b4: makeBrigade('b4', 'corps1', 'RS', 'op:b:1'),
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result).toEqual([]);
    });

    it('does not source from disconnected components', () => {
        // Two islands of friendly territory — not connected
        const adj = new Map<Osid, Osid[]>();
        adj.set('op:a:1' as Osid, []);
        adj.set('op:b:1' as Osid, []);
        // No edges between a:1 and b:1

        const friendly = new Set(['op:a:1', 'op:b:1']);
        const componentOf = buildComponents(adj, friendly);
        // They should be in different components
        expect(componentOf.get('op:a:1')).not.toBe(componentOf.get('op:b:1'));

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3', 'b4'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1'),
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1'),
            b4: makeBrigade('b4', 'corps1', 'RS', 'op:b:1'),
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adj,
            friendly,
            componentOf,
            1,
        );

        expect(result).toEqual([]);
    });

    it('respects MAX_OP_LOAN_DISTANCE — skips brigades too far away', () => {
        // Linear chain of 8 hops: a1-a2-a3-a4-a5-a6-a7-a8-a9
        // Target sector at a1, brigade at a9 (8 hops away, > MAX_OP_LOAN_DISTANCE=6)
        const osids = ['op:a:1', 'op:a:2', 'op:a:3', 'op:a:4', 'op:a:5', 'op:a:6', 'op:a:7', 'op:a:8', 'op:a:9'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3'],
            territory_osids: ['op:a:8', 'op:a:9'],
            sub_segments: [{ friendly_osids: ['op:a:8'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=1
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:a:9'), // 8 hops from target — too far
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:a:8'), // 7 hops from target — still too far
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result).toEqual([]);
    });

    it('caps loans at MAX_LOANED_PER_OP (6)', () => {
        // Source sector has 10 brigades, budget=1, surplus=9 — but cap at 6
        const osids = ['op:a:1', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b0'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const brigadeIds = Array.from({ length: 10 }, (_, i) => `b${i + 1}`);
        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: brigadeIds,
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=9
        });

        const formations: Record<string, any> = {
            b0: makeBrigade('b0', 'corps1', 'RS', 'op:a:1'),
        };
        for (const bid of brigadeIds) {
            formations[bid] = makeBrigade(bid, 'corps1', 'RS', 'op:b:1');
        }

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result.length).toBe(6); // MAX_LOANED_PER_OP
    });

    it('prefers closer brigades over distant ones', () => {
        // Chain: a1 - a2 - a3 - a4
        // Target at a1, close brigade at a2 (1 hop), far brigade at a4 (3 hops)
        const osids = ['op:a:1', 'op:a:2', 'op:a:3', 'op:a:4'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b0'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b_far', 'b_close', 'b_mid'],
            territory_osids: ['op:a:2', 'op:a:3', 'op:a:4'],
            sub_segments: [{ friendly_osids: ['op:a:4'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=2
        });

        const formations: Record<string, any> = {
            b0: makeBrigade('b0', 'corps1', 'RS', 'op:a:1'),
            b_far: makeBrigade('b_far', 'corps1', 'RS', 'op:a:4'),   // 3 hops
            b_close: makeBrigade('b_close', 'corps1', 'RS', 'op:a:2'), // 1 hop
            b_mid: makeBrigade('b_mid', 'corps1', 'RS', 'op:a:3'),     // 2 hops
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result.length).toBe(2); // surplus=2
        expect(result[0]!.brigade_id).toBe('b_close');
        expect(result[1]!.brigade_id).toBe('b_mid');
    });

    it('skips combat-ineffective brigades (personnel < 400)', () => {
        const osids = ['op:a:1', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=1
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1', { personnel: 399 }), // combat ineffective
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1', { personnel: 400 }), // ok
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        // Only b3 should be available (b2 is combat ineffective)
        expect(result.length).toBe(1);
        expect(result[0]!.brigade_id).toBe('b3');
    });

    it('skips disrupted brigades', () => {
        const osids = ['op:a:1', 'op:b:1'];
        const adjacency = buildLinearAdjacency(osids);
        const friendly = new Set(osids);
        const componentOf = buildComponents(adjacency, friendly);

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            assigned_brigade_ids: ['b1'],
            territory_osids: ['op:a:1'],
            sub_segments: [{ friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6,
        });

        const sourceSector = makeSector('sector:corps1:1', 'corps1', 'RS', {
            assigned_brigade_ids: ['b2', 'b3'],
            territory_osids: ['op:b:1'],
            sub_segments: [{ friendly_osids: ['op:b:1'], enemy_osids: ['op:e:2'], sub_segment_id: 'ss:1', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
            length_edges: 6, // budget=1, surplus=1
        });

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'),
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1', { disrupted_turns: 2 }), // disrupted
            b3: makeBrigade('b3', 'corps1', 'RS', 'op:b:1'), // ok
        };

        const result = computeReinforcementPool(
            targetSector,
            [sourceSector],
            formations,
            adjacency,
            friendly,
            componentOf,
            1,
        );

        expect(result.length).toBe(1);
        expect(result[0]!.brigade_id).toBe('b3');
    });
});

// ── checkLoanedArrivals tests ────────────────────────────────────────────────

describe('checkLoanedArrivals', () => {
    it('marks brigades arrived when in target sector territory', () => {
        const op: any = {
            loaned_brigades: [
                { brigade_id: 'b1', source_sector_id: 'sector:corps1:1', arrived: false },
                { brigade_id: 'b2', source_sector_id: 'sector:corps1:1', arrived: false },
            ],
        };

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:target:1'), // in target territory
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:other:1'),   // not in target territory
        };

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            territory_osids: ['op:target:1', 'op:target:2'],
            sub_segments: [{ friendly_osids: ['op:target:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
        });

        const fraction = checkLoanedArrivals(op, formations, targetSector);

        expect(op.loaned_brigades[0].arrived).toBe(true);
        expect(op.loaned_brigades[1].arrived).toBe(false);
        expect(fraction).toBe(0.5);
    });

    it('returns 1.0 when all brigades arrived', () => {
        const op: any = {
            loaned_brigades: [
                { brigade_id: 'b1', source_sector_id: 'sector:corps1:1', arrived: false },
            ],
        };

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:target:1'),
        };

        const targetSector = makeSector('sector:corps1:0', 'corps1', 'RS', {
            territory_osids: ['op:target:1'],
            sub_segments: [{ friendly_osids: ['op:target:1'], enemy_osids: ['op:e:1'], sub_segment_id: 'ss:0', edge_ids: [], length_edges: 3, primary_brigade_ids: [] }],
        });

        const fraction = checkLoanedArrivals(op, formations, targetSector);
        expect(fraction).toBe(1.0);
    });

    it('returns 0 when no loaned brigades', () => {
        const op: any = { loaned_brigades: [] };
        const fraction = checkLoanedArrivals(op, {}, makeSector('s', 'c', 'RS'));
        expect(fraction).toBe(0);
    });
});

// ── areLoanedBrigadesReady tests ─────────────────────────────────────────────

describe('areLoanedBrigadesReady', () => {
    it('returns true at 0.7 (LOAN_ARRIVAL_THRESHOLD)', () => {
        expect(areLoanedBrigadesReady(0.7)).toBe(true);
    });

    it('returns true above threshold', () => {
        expect(areLoanedBrigadesReady(1.0)).toBe(true);
    });

    it('returns false below threshold', () => {
        expect(areLoanedBrigadesReady(0.69)).toBe(false);
    });
});

// ── cleanupDissolvedLoans tests ──────────────────────────────────────────────

describe('cleanupDissolvedLoans', () => {
    it('removes dissolved brigades from loaned list', () => {
        const op: any = {
            loaned_brigades: [
                { brigade_id: 'b1', source_sector_id: 's1', arrived: true },
                { brigade_id: 'b2', source_sector_id: 's2', arrived: false },
                { brigade_id: 'b3', source_sector_id: 's3', arrived: true },
            ],
        };

        const formations: Record<string, any> = {
            b1: makeBrigade('b1', 'corps1', 'RS', 'op:a:1'), // active
            b2: makeBrigade('b2', 'corps1', 'RS', 'op:b:1', { status: 'inactive' }), // dissolved
            // b3 not in formations at all — also dissolved
        };

        cleanupDissolvedLoans(op, formations);

        expect(op.loaned_brigades.length).toBe(1);
        expect(op.loaned_brigades[0].brigade_id).toBe('b1');
    });

    it('handles empty loaned_brigades', () => {
        const op: any = { loaned_brigades: [] };
        cleanupDissolvedLoans(op, {});
        expect(op.loaned_brigades).toEqual([]);
    });

    it('handles undefined loaned_brigades', () => {
        const op: any = {};
        cleanupDissolvedLoans(op, {});
        // Should not throw
        expect(op.loaned_brigades).toBeUndefined();
    });
});
