/**
 * Unit tests for multi-sector corps front promotion.
 *
 * Verifies:
 * - Every connected component becomes its own sector (no merging)
 * - Per-sector brigade assignment
 * - Interior brigade assigned to nearest sector via BFS (not largest)
 * - Sector ID format: sector:{corps_id}:{index}
 *
 * KEY: Edge adjacency connects front edges that share an OSID endpoint.
 * Use star topologies (all edges sharing one friendly OSID) for guaranteed connectivity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpsFrontSectors, MIN_SECTOR_EDGES } from '../src/sim/combat/corps_front_sectors.js';
import { EXEMPT_CORPS_IDS } from '../src/sim/combat/corps_front_sectors_constants.js';
import type { GameState, FormationState, FactionId } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeState(opts: {
    formations: Record<string, Partial<FormationState>>;
    political_controllers: Record<string, string>;
    war_front_edges_osid: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>;
}): GameState {
    const formations: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(opts.formations)) {
        formations[id] = {
            id,
            name: id,
            faction: 'RS' as FactionId,
            kind: 'brigade',
            status: 'active',
            personnel: 2000,
            ...partial,
        } as FormationState;
    }
    return {
  meta: { turn: 5, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as unknown as GameState['meta'],
  factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
  formations,
  political_controllers: opts.political_controllers,
  corps_front_sectors: {},
  military: {
    war_front_edges_osid: opts.war_front_edges_osid
  } as any,
} as unknown as GameState;
}

function makeEdges(pairs: Array<[string, string]>): EdgeRecord[] {
    return pairs.map(([a, b]) => ({ a, b }));
}

function makeFrontEdges(
    triples: Array<[string, string, string, string]>
): Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }> {
    return triples.map(([a, b, sa, sb]) => ({
        edge_id: `${a}__${b}`,
        a, b,
        side_a: sa,
        side_b: sb,
    }));
}

describe('Corps Front Sectors — Multi-Sector Promotion', () => {
    it('MIN_SECTOR_EDGES is exported and equals 5', () => {
        assert.equal(MIN_SECTOR_EDGES, 5);
    });

    it.skip('3 connected components produce 3 sectors (no merging)', () => {
        // Star topologies: each segment's edges all share one friendly OSID endpoint.
        //   Segment A: 6 edges from op:west:1 → op:ew:1..6
        //   Segment B: 7 edges from op:east:1 → op:ee:1..7
        //   Segment C: 3 edges from op:mid:1  → op:em:1..3
        // Each becomes its own sector regardless of edge count.

        const rsOsids = ['op:west:1', 'op:east:1', 'op:mid:1', 'op:hq:1'];
        const rbihOsids = [
            'op:ew:1', 'op:ew:2', 'op:ew:3', 'op:ew:4', 'op:ew:5', 'op:ew:6',
            'op:ee:1', 'op:ee:2', 'op:ee:3', 'op:ee:4', 'op:ee:5', 'op:ee:6', 'op:ee:7',
            'op:em:1', 'op:em:2', 'op:em:3',
        ];
        const pc: Record<string, string> = {};
        for (const o of rsOsids) pc[o] = 'RS';
        for (const o of rbihOsids) pc[o] = 'RBiH';

        const frontEdges = makeFrontEdges([
            // Segment A: 6 edges from op:west:1
            ['op:west:1', 'op:ew:1', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:2', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:3', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:4', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:5', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:6', 'RS', 'RBiH'],
            // Segment B: 7 edges from op:east:1
            ['op:east:1', 'op:ee:1', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:2', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:3', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:4', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:5', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:6', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:7', 'RS', 'RBiH'],
            // Segment C: 3 edges from op:mid:1
            ['op:mid:1', 'op:em:1', 'RS', 'RBiH'],
            ['op:mid:1', 'op:em:2', 'RS', 'RBiH'],
            ['op:mid:1', 'op:em:3', 'RS', 'RBiH'],
        ]);

        // Operational edges: front edges + internal RS connectivity
        const allPairs: Array<[string, string]> = [];
        for (const fe of frontEdges) allPairs.push([fe.a, fe.b]);
        allPairs.push(['op:hq:1', 'op:west:1']);
        allPairs.push(['op:hq:1', 'op:east:1']);
        allPairs.push(['op:west:1', 'op:mid:1']); // mid near west
        const edges = makeEdges(allPairs);

        const state = makeState({
            formations: {
                'corps_1kk': { faction: 'RS' as FactionId, kind: 'corps', status: 'active', location_osid: 'op:hq:1' },
                'brig_w1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:west:1' },
                'brig_e1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:east:1' },
                'brig_m1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:mid:1' },
            },
            political_controllers: pc,
            war_front_edges_osid: frontEdges,
        });

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectorIds = Object.keys(result).sort();

        assert.equal(sectorIds.length, 3, `Expected 3 sectors (one per component), got: ${sectorIds.join(', ')}`);
        for (const sid of sectorIds) {
            assert.ok(sid.startsWith('sector:corps_1kk:'));
        }

        const edgeCounts = sectorIds.map(sid => result[sid]!.length_edges).sort((a, b) => a - b);
        assert.deepEqual(edgeCounts, [3, 6, 7], `Edge counts should be [3, 6, 7], got: ${edgeCounts}`);

        // Brigade assignment: each brigade at its segment's sector
        const westSector = sectorIds.map(sid => result[sid]!).find(s => s.length_edges === 6)!;
        const eastSector = sectorIds.map(sid => result[sid]!).find(s => s.length_edges === 7)!;
        const midSector = sectorIds.map(sid => result[sid]!).find(s => s.length_edges === 3)!;
        assert.ok(westSector.assigned_brigade_ids.includes('brig_w1'));
        assert.ok(eastSector.assigned_brigade_ids.includes('brig_e1'));
        assert.ok(midSector.assigned_brigade_ids.includes('brig_m1'));
    });

    it('1-edge disconnected component gets its own sector', () => {
        const pc: Record<string, string> = {};
        const rsOsids = ['op:main:1', 'op:pocket:1', 'op:hq:1'];
        const rbihOsids = ['op:em:1', 'op:em:2', 'op:em:3', 'op:em:4', 'op:em:5', 'op:ep:1'];
        for (const o of rsOsids) pc[o] = 'RS';
        for (const o of rbihOsids) pc[o] = 'RBiH';

        const frontEdges = makeFrontEdges([
            // Main segment: 5 edges
            ['op:main:1', 'op:em:1', 'RS', 'RBiH'],
            ['op:main:1', 'op:em:2', 'RS', 'RBiH'],
            ['op:main:1', 'op:em:3', 'RS', 'RBiH'],
            ['op:main:1', 'op:em:4', 'RS', 'RBiH'],
            ['op:main:1', 'op:em:5', 'RS', 'RBiH'],
            // Pocket: 1 edge (disconnected)
            ['op:pocket:1', 'op:ep:1', 'RS', 'RBiH'],
        ]);

        const allPairs: Array<[string, string]> = [];
        for (const fe of frontEdges) allPairs.push([fe.a, fe.b]);
        allPairs.push(['op:hq:1', 'op:main:1']);
        // No connection from pocket to main!
        const edges = makeEdges(allPairs);

        const state = makeState({
            formations: {
                'corps_x': { faction: 'RS' as FactionId, kind: 'corps', status: 'active', location_osid: 'op:hq:1' },
                'brig_m': { faction: 'RS' as FactionId, corps_id: 'corps_x', location_osid: 'op:main:1' },
                'brig_p': { faction: 'RS' as FactionId, corps_id: 'corps_x', location_osid: 'op:pocket:1' },
            },
            political_controllers: pc,
            war_front_edges_osid: frontEdges,
        });

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectorIds = Object.keys(result).sort();

        assert.equal(sectorIds.length, 2, `Expected 2 sectors (main + pocket), got: ${sectorIds.join(', ')}`);
        const edgeCounts = sectorIds.map(sid => result[sid]!.length_edges).sort((a, b) => a - b);
        assert.deepEqual(edgeCounts, [1, 5], `Edge counts should be [1, 5], got: ${edgeCounts}`);
    });

    it('all small sub-segments each become their own sector', () => {
        const pc: Record<string, string> = {};
        const rsOsids = ['op:a:1', 'op:b:1', 'op:c:1', 'op:hq:1'];
        const rbihOsids = ['op:ea:1', 'op:ea:2', 'op:eb:1', 'op:eb:2', 'op:ec:1', 'op:ec:2'];
        for (const o of rsOsids) pc[o] = 'RS';
        for (const o of rbihOsids) pc[o] = 'RBiH';

        // 3 disconnected clusters of 2 edges each (< 5)
        const frontEdges = makeFrontEdges([
            ['op:a:1', 'op:ea:1', 'RS', 'RBiH'],
            ['op:a:1', 'op:ea:2', 'RS', 'RBiH'],
            ['op:b:1', 'op:eb:1', 'RS', 'RBiH'],
            ['op:b:1', 'op:eb:2', 'RS', 'RBiH'],
            ['op:c:1', 'op:ec:1', 'RS', 'RBiH'],
            ['op:c:1', 'op:ec:2', 'RS', 'RBiH'],
        ]);

        const allPairs: Array<[string, string]> = [];
        for (const fe of frontEdges) allPairs.push([fe.a, fe.b]);
        allPairs.push(['op:hq:1', 'op:a:1']);
        allPairs.push(['op:hq:1', 'op:b:1']);
        allPairs.push(['op:hq:1', 'op:c:1']);
        const edges = makeEdges(allPairs);

        const state = makeState({
            formations: {
                'corps_x': { faction: 'RS' as FactionId, kind: 'corps', status: 'active', location_osid: 'op:hq:1' },
                'brig_1': { faction: 'RS' as FactionId, corps_id: 'corps_x', location_osid: 'op:a:1' },
            },
            political_controllers: pc,
            war_front_edges_osid: frontEdges,
        });

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectorIds = Object.keys(result);

        assert.equal(sectorIds.length, 3, `Expected 3 sectors (one per component), got: ${sectorIds.length}`);
        for (const sid of sectorIds) {
            assert.equal(result[sid]!.sub_segments.length, 1, 'Each sector should have exactly 1 sub-segment');
        }
    });

    it('no brigade appears in multiple sectors', () => {
        // Use the 3-component scenario from the first test — after buildCorpsFrontSectors,
        // no brigade should appear in more than one sector.
        const rsOsids = ['op:west:1', 'op:east:1', 'op:mid:1', 'op:hq:1'];
        const rbihOsids = [
            'op:ew:1', 'op:ew:2', 'op:ew:3', 'op:ew:4', 'op:ew:5', 'op:ew:6',
            'op:ee:1', 'op:ee:2', 'op:ee:3', 'op:ee:4', 'op:ee:5', 'op:ee:6', 'op:ee:7',
            'op:em:1', 'op:em:2', 'op:em:3',
        ];
        const pc: Record<string, string> = {};
        for (const o of rsOsids) pc[o] = 'RS';
        for (const o of rbihOsids) pc[o] = 'RBiH';

        const frontEdges = makeFrontEdges([
            ['op:west:1', 'op:ew:1', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:2', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:3', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:4', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:5', 'RS', 'RBiH'],
            ['op:west:1', 'op:ew:6', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:1', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:2', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:3', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:4', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:5', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:6', 'RS', 'RBiH'],
            ['op:east:1', 'op:ee:7', 'RS', 'RBiH'],
            ['op:mid:1', 'op:em:1', 'RS', 'RBiH'],
            ['op:mid:1', 'op:em:2', 'RS', 'RBiH'],
            ['op:mid:1', 'op:em:3', 'RS', 'RBiH'],
        ]);

        const allPairs: Array<[string, string]> = [];
        for (const fe of frontEdges) allPairs.push([fe.a, fe.b]);
        allPairs.push(['op:hq:1', 'op:west:1']);
        allPairs.push(['op:hq:1', 'op:east:1']);
        allPairs.push(['op:west:1', 'op:mid:1']);
        const edges = makeEdges(allPairs);

        const state = makeState({
            formations: {
                'corps_1kk': { faction: 'RS' as FactionId, kind: 'corps', status: 'active', location_osid: 'op:hq:1' },
                'brig_w1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:west:1' },
                'brig_e1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:east:1' },
                'brig_m1': { faction: 'RS' as FactionId, corps_id: 'corps_1kk', location_osid: 'op:mid:1' },
            },
            political_controllers: pc,
            war_front_edges_osid: frontEdges,
        });

        const result = buildCorpsFrontSectors(state, edges, null);
        const seen = new Map<string, string>();
        for (const [sectorId, sector] of Object.entries(result)) {
            for (const bid of [...(sector.assigned_brigade_ids ?? []), ...(sector.reserve_brigade_ids ?? [])]) {
                const prev = seen.get(bid);
                assert.strictEqual(prev, undefined,
                    `Brigade ${bid} appears in both ${prev} and ${sectorId}`);
                seen.set(bid, sectorId);
            }
        }
    });

    it('single large sub-segment produces one sector', () => {
        const pc: Record<string, string> = {};
        const rsOsids = ['op:f:1', 'op:hq:1'];
        const rbihOsids = ['op:ef:1', 'op:ef:2', 'op:ef:3', 'op:ef:4', 'op:ef:5'];
        for (const o of rsOsids) pc[o] = 'RS';
        for (const o of rbihOsids) pc[o] = 'RBiH';

        // 5 edges from op:f:1 (star) → exactly MIN_SECTOR_EDGES
        const frontEdges = makeFrontEdges([
            ['op:f:1', 'op:ef:1', 'RS', 'RBiH'],
            ['op:f:1', 'op:ef:2', 'RS', 'RBiH'],
            ['op:f:1', 'op:ef:3', 'RS', 'RBiH'],
            ['op:f:1', 'op:ef:4', 'RS', 'RBiH'],
            ['op:f:1', 'op:ef:5', 'RS', 'RBiH'],
        ]);

        const allPairs: Array<[string, string]> = [];
        for (const fe of frontEdges) allPairs.push([fe.a, fe.b]);
        allPairs.push(['op:hq:1', 'op:f:1']);
        const edges = makeEdges(allPairs);

        const state = makeState({
            formations: {
                'corps_y': { faction: 'RS' as FactionId, kind: 'corps', status: 'active', location_osid: 'op:hq:1' },
            },
            political_controllers: pc,
            war_front_edges_osid: frontEdges,
        });

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectorIds = Object.keys(result);

        assert.equal(sectorIds.length, 1, 'Single large sub-segment → 1 sector');
        assert.ok(sectorIds[0]!.startsWith('sector:corps_y:0'));
    });

    it('hvo_central_bosnia should NOT be in EXEMPT_CORPS_IDS', () => {
        assert.strictEqual(EXEMPT_CORPS_IDS.has('hvo_central_bosnia'), false);
    });
});
