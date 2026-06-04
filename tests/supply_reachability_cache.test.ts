/**
 * v0.9.3 C2 — per-GameState, per-faction supply-reachability memoization.
 *
 * These tests prove:
 *  - On a second call with the same GameState and an unchanged controlled set,
 *    the per-faction result is the SAME object reference (cache hit).
 *  - When a political_controllers flip changes a faction's controlled set,
 *    the cache misses and a fresh result is computed.
 *  - Distinct GameState instances keep independent caches (WeakMap scoping).
 *  - BFS output is byte-identical between cached and fresh compute for the
 *    same inputs.
 *
 * End-to-end byte-identity against the 40w/52w/4w scenarios is separate —
 * the golden-baseline regression would fail if the cache ever produced a
 * different reachability map than the fresh compute.
 */
import { describe, it, expect } from 'vitest';
import {
    computeSupplyReachabilityOsid,
    type SupplyReachabilityOsidReport,
} from '../src/state/supply_reachability_osid.js';
import type { GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type {
    CanonicalToOperationalMap,
    OperationalToCanonicalReverseMap,
} from '../src/data/operational_data.js';

/** Minimal GameState fixture with a 4-OSID graph, two factions, and two
 *  political controllers. */
function makeFixture(opts: {
    controllers: Record<string, string>;
}): {
    state: GameState;
    edges: EdgeRecord[];
    c2o: CanonicalToOperationalMap;
    o2c: OperationalToCanonicalReverseMap;
} {
    const edges: EdgeRecord[] = [
        { a: 'op:a:1', b: 'op:a:2' } as EdgeRecord,
        { a: 'op:a:2', b: 'op:b:1' } as EdgeRecord,
        { a: 'op:b:1', b: 'op:b:2' } as EdgeRecord,
    ];
    const state = {
        meta: { turn: 0, phase: 'war' },
        factions: [
            { id: 'RBiH', supply_sources: ['op:a:1'] },
            { id: 'RS', supply_sources: ['op:b:2'] },
        ],
        political: {
            political_controllers: { ...opts.controllers },
        },
    } as unknown as GameState;
    const c2o: CanonicalToOperationalMap = { 'op:a:1': 'op:a:1', 'op:b:2': 'op:b:2' };
    const o2c: OperationalToCanonicalReverseMap = new Map([
        ['op:a:1', ['op:a:1']],
        ['op:a:2', ['op:a:2']],
        ['op:b:1', ['op:b:1']],
        ['op:b:2', ['op:b:2']],
    ]);
    return { state, edges, c2o, o2c };
}

describe('computeSupplyReachabilityOsid cache', () => {
    it('second call with unchanged state returns the SAME per-faction object reference', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const first = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        // Advance turn but keep controllers identical
        (state.meta as any).turn = 1;
        const second = computeSupplyReachabilityOsid(state, edges, c2o, o2c);

        // Outer wrapper is freshly constructed each call (turn value differs).
        expect(second.turn).toBe(1);
        expect(first.turn).toBe(0);
        // Per-faction objects reuse the cached instance.
        for (const faction of ['RBiH', 'RS']) {
            const firstFac = first.factions.find(f => f.faction_id === faction);
            const secondFac = second.factions.find(f => f.faction_id === faction);
            expect(secondFac, faction).toBe(firstFac); // reference equality → cache hit
        }
    });

    it('control flip on a faction-owned OSID invalidates that faction\'s cache entry', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const first = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        // Flip op:a:2 from RBiH to RS — changes BOTH factions' controlled sets.
        state.political.political_controllers!['op:a:2'] = 'RS';
        (state.meta as any).turn = 1;
        const second = computeSupplyReachabilityOsid(state, edges, c2o, o2c);

        const firstRBiH = first.factions.find(f => f.faction_id === 'RBiH')!;
        const secondRBiH = second.factions.find(f => f.faction_id === 'RBiH')!;
        expect(secondRBiH).not.toBe(firstRBiH); // cache miss → fresh object
        expect(secondRBiH.controlled).toEqual(['op:a:1']); // op:a:2 removed
        expect(firstRBiH.controlled).toEqual(['op:a:1', 'op:a:2']);

        const firstRS = first.factions.find(f => f.faction_id === 'RS')!;
        const secondRS = second.factions.find(f => f.faction_id === 'RS')!;
        expect(secondRS).not.toBe(firstRS);
        expect(secondRS.controlled).toEqual(['op:a:2', 'op:b:1', 'op:b:2']);
    });

    it('edge topology change invalidates a faction cache entry even when sources and control are stable', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RBiH', 'op:b:2': 'RBiH' },
        });
        const first = computeSupplyReachabilityOsid(state, edges, c2o, o2c);

        const disconnectedEdges: EdgeRecord[] = [
            { a: 'op:a:1', b: 'op:a:2' } as EdgeRecord,
            { a: 'op:b:1', b: 'op:b:2' } as EdgeRecord,
        ];
        (state.meta as any).turn = 1;
        const second = computeSupplyReachabilityOsid(state, disconnectedEdges, c2o, o2c);

        const firstRBiH = first.factions.find(f => f.faction_id === 'RBiH')!;
        const secondRBiH = second.factions.find(f => f.faction_id === 'RBiH')!;
        expect(secondRBiH).not.toBe(firstRBiH);
        expect(firstRBiH.reachable_osids).toEqual(['op:a:1', 'op:a:2', 'op:b:1', 'op:b:2']);
        expect(secondRBiH.reachable_osids).toEqual(['op:a:1', 'op:a:2']);
        expect(secondRBiH.isolated_osids).toEqual(['op:b:1', 'op:b:2']);
    });

    it('distinct GameState instances keep independent caches', () => {
        const a = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const b = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const ra = computeSupplyReachabilityOsid(a.state, a.edges, a.c2o, a.o2c);
        const rb = computeSupplyReachabilityOsid(b.state, b.edges, b.c2o, b.o2c);
        const raRBiH = ra.factions.find(f => f.faction_id === 'RBiH')!;
        const rbRBiH = rb.factions.find(f => f.faction_id === 'RBiH')!;
        // Content identical but reference distinct — each GameState has its own cache entry.
        expect(rbRBiH).not.toBe(raRBiH);
        expect(rbRBiH.reachable_osids).toEqual(raRBiH.reachable_osids);
        expect(rbRBiH.controlled).toEqual(raRBiH.controlled);
    });

    it('cached vs fresh compute on same inputs produces byte-identical content', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        // Warm the cache.
        const cached = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        // Fresh compute on a new GameState with identical content.
        const fresh = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const freshResult = computeSupplyReachabilityOsid(fresh.state, fresh.edges, fresh.c2o, fresh.o2c);

        // Compare the per-faction content (turn will differ structurally but we've hoisted it out).
        const normalize = (r: SupplyReachabilityOsidReport) =>
            r.factions.map(f => ({
                faction_id: f.faction_id,
                sources: f.sources,
                controlled: f.controlled,
                reachable_osids: f.reachable_osids,
                isolated_osids: f.isolated_osids,
                edges_used: f.edges_used,
            }));
        expect(normalize(freshResult)).toEqual(normalize(cached));
    });
});
