/**
 * v0.9.3 C2a — per-faction caches for `deriveCorridorsOsid` and
 * `deriveSupplyStateByOsid`. The cache key for both is the
 * `FactionSupplyReachabilityOsid` reference, which the C2 supply-reachability
 * cache returns stably across turns when a faction's controlled set hasn't
 * changed.
 *
 * These tests prove:
 *   - Same fac reference returns the SAME per-faction cached output
 *     (corridors and supply state).
 *   - Different fac references (e.g., a fresh state) compute fresh outputs.
 *   - Cached vs fresh output is content-identical for the same fac inputs.
 *
 * End-to-end byte-identity is the golden-baseline regression's job.
 */
import { describe, it, expect } from 'vitest';
import {
    computeSupplyReachabilityOsid,
} from '../src/state/supply_reachability_osid.js';
import {
    deriveCorridorsOsid,
    deriveSupplyStateByOsid,
} from '../src/state/supply_state_derivation.js';
import type { GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type {
    CanonicalToOperationalMap,
    OperationalToCanonicalReverseMap,
} from '../src/data/operational_data.js';

function makeFixture(opts: { controllers: Record<string, string> }) {
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
        political: { political_controllers: { ...opts.controllers } },
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

describe('deriveCorridorsOsid per-faction cache (C2a)', () => {
    it('returns the same per-faction corridor entries when the supplyReport entry is reference-stable', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const supply1 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors1 = deriveCorridorsOsid(state, edges, supply1);

        // Advance turn; supply cache hit returns same per-faction refs
        (state.meta as any).turn = 1;
        const supply2 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors2 = deriveCorridorsOsid(state, edges, supply2);

        // Outer wrapper is fresh each call (turn differs); per-faction entries
        // come through the cache and have content equality.
        expect(corridors2.turn).toBe(1);
        expect(corridors1.turn).toBe(0);
        expect(corridors2.corridors).toEqual(corridors1.corridors);
        // Each individual corridor object is from the cached per-faction list;
        // verify reference equality on at least one entry.
        if (corridors1.corridors.length > 0) {
            expect(corridors2.corridors[0]).toBe(corridors1.corridors[0]);
        }
    });

    it('flipping a controller invalidates the per-faction corridor cache', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const supply1 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors1 = deriveCorridorsOsid(state, edges, supply1);

        // Flip op:a:2 → cache miss for both factions
        state.political.political_controllers!['op:a:2'] = 'RS';
        (state.meta as any).turn = 1;
        const supply2 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors2 = deriveCorridorsOsid(state, edges, supply2);

        // Different reachable subgraphs → different corridor lists
        expect(corridors2.corridors).not.toEqual(corridors1.corridors);
    });
});

describe('deriveSupplyStateByOsid per-faction cache (C2a)', () => {
    it('returns the same per-faction supply state entry when the supplyReport entry is reference-stable', () => {
        const { state, edges, c2o, o2c } = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const supply1 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors1 = deriveCorridorsOsid(state, edges, supply1);
        const supplyState1 = deriveSupplyStateByOsid(state, edges, supply1, corridors1);

        (state.meta as any).turn = 1;
        const supply2 = computeSupplyReachabilityOsid(state, edges, c2o, o2c);
        const corridors2 = deriveCorridorsOsid(state, edges, supply2);
        const supplyState2 = deriveSupplyStateByOsid(state, edges, supply2, corridors2);

        // Per-faction entries reuse cached objects.
        for (const faction of ['RBiH', 'RS']) {
            const e1 = supplyState1.factions.find(f => f.faction_id === faction)!;
            const e2 = supplyState2.factions.find(f => f.faction_id === faction)!;
            expect(e2, faction).toBe(e1); // reference equality
        }
    });

    it('cached per-faction supply state has content-identical by_osid to fresh compute', () => {
        const cached = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const supplyC = computeSupplyReachabilityOsid(cached.state, cached.edges, cached.c2o, cached.o2c);
        const corridorsC = deriveCorridorsOsid(cached.state, cached.edges, supplyC);
        const stateC = deriveSupplyStateByOsid(cached.state, cached.edges, supplyC, corridorsC);

        // Fresh GameState → bypasses cache
        const fresh = makeFixture({
            controllers: { 'op:a:1': 'RBiH', 'op:a:2': 'RBiH', 'op:b:1': 'RS', 'op:b:2': 'RS' },
        });
        const supplyF = computeSupplyReachabilityOsid(fresh.state, fresh.edges, fresh.c2o, fresh.o2c);
        const corridorsF = deriveCorridorsOsid(fresh.state, fresh.edges, supplyF);
        const stateF = deriveSupplyStateByOsid(fresh.state, fresh.edges, supplyF, corridorsF);

        for (const faction of ['RBiH', 'RS']) {
            const c = stateC.factions.find(f => f.faction_id === faction)!;
            const f = stateF.factions.find(f => f.faction_id === faction)!;
            expect(f.faction_id).toBe(c.faction_id);
            expect(f.by_osid).toEqual(c.by_osid);
        }
    });
});
