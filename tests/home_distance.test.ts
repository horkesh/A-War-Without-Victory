import { describe, it, expect } from 'vitest';
import {
    computeOsidGraphDistance,
    getHomeDistanceMult,
    buildHomeDistanceCache,
    HOME_DISTANCE_FREE_RANGE,
    HOME_DISTANCE_FLOOR,
    HOME_DISTANCE_FLOOR_ELITE,
    HOME_DISTANCE_UNREACHABLE_HOPS
} from '../src/sim/combat/home_distance.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Helper: build a linear chain adjacency graph ──
function buildChainAdjacency(n: number): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (let i = 0; i < n; i++) {
        const osid = `op:mun:osid_${i}` as Osid;
        const neighbors: Osid[] = [];
        if (i > 0) neighbors.push(`op:mun:osid_${i - 1}` as Osid);
        if (i < n - 1) neighbors.push(`op:mun:osid_${i + 1}` as Osid);
        adj.set(osid, neighbors);
    }
    return adj;
}

describe('computeOsidGraphDistance', () => {
    it('returns 0 for same OSID', () => {
        const adj = buildChainAdjacency(5);
        expect(computeOsidGraphDistance('op:mun:osid_0' as Osid, 'op:mun:osid_0' as Osid, adj)).toBe(0);
    });

    it('returns correct hop count for linear chain', () => {
        const adj = buildChainAdjacency(10);
        expect(computeOsidGraphDistance('op:mun:osid_0' as Osid, 'op:mun:osid_3' as Osid, adj)).toBe(3);
        expect(computeOsidGraphDistance('op:mun:osid_0' as Osid, 'op:mun:osid_9' as Osid, adj)).toBe(9);
        expect(computeOsidGraphDistance('op:mun:osid_5' as Osid, 'op:mun:osid_2' as Osid, adj)).toBe(3);
    });

    it('returns Infinity for disconnected OSIDs', () => {
        const adj = new Map<Osid, Osid[]>();
        adj.set('op:a:1' as Osid, []);
        adj.set('op:b:1' as Osid, []);
        expect(computeOsidGraphDistance('op:a:1' as Osid, 'op:b:1' as Osid, adj)).toBe(Infinity);
    });
});

describe('getHomeDistanceMult', () => {
    it('returns 1.0 within free range', () => {
        for (let i = 0; i <= HOME_DISTANCE_FREE_RANGE; i++) {
            expect(getHomeDistanceMult(i)).toBe(1.0);
        }
    });

    it('decreases beyond free range', () => {
        const m4 = getHomeDistanceMult(4);
        const m5 = getHomeDistanceMult(5);
        const m6 = getHomeDistanceMult(6);
        expect(m4).toBeLessThan(1.0);
        expect(m5).toBeLessThan(m4);
        expect(m6).toBeLessThan(m5);
    });

    it('reaches floor at large distances', () => {
        expect(getHomeDistanceMult(20)).toBe(HOME_DISTANCE_FLOOR);
        expect(getHomeDistanceMult(100)).toBe(HOME_DISTANCE_FLOOR);
    });

    it('never goes below floor', () => {
        for (let i = 0; i <= 50; i++) {
            expect(getHomeDistanceMult(i)).toBeGreaterThanOrEqual(HOME_DISTANCE_FLOOR);
        }
    });

    it('elite brigades get flatter curve', () => {
        // Same at 0 hops
        expect(getHomeDistanceMult(0, true)).toBe(1.0);
        // Both 1.0 within free range
        expect(getHomeDistanceMult(3, true)).toBe(1.0);
        // Elite decays slower beyond free range
        const regular6 = getHomeDistanceMult(6);
        const elite6 = getHomeDistanceMult(6, true);
        expect(elite6).toBeGreaterThan(regular6);
    });

    it('elite floor is higher than regular floor', () => {
        expect(HOME_DISTANCE_FLOOR_ELITE).toBeGreaterThan(HOME_DISTANCE_FLOOR);
        expect(getHomeDistanceMult(50, true)).toBe(HOME_DISTANCE_FLOOR_ELITE);
        expect(getHomeDistanceMult(50, false)).toBe(HOME_DISTANCE_FLOOR);
    });

    it('elite never goes below elite floor', () => {
        for (let i = 0; i <= 50; i++) {
            expect(getHomeDistanceMult(i, true)).toBeGreaterThanOrEqual(HOME_DISTANCE_FLOOR_ELITE);
        }
    });
});

describe('buildHomeDistanceCache', () => {
    it('caches distances for active brigades', () => {
        const adj = buildChainAdjacency(10);
        const formations: Record<string, { home_osid?: string; location_osid?: string; status?: string; kind?: string }> = {
            brig_a: { home_osid: 'op:mun:osid_0', location_osid: 'op:mun:osid_5', status: 'active', kind: 'brigade' },
            brig_b: { home_osid: 'op:mun:osid_0', location_osid: 'op:mun:osid_0', status: 'active', kind: 'brigade' },
            brig_c: { home_osid: 'op:mun:osid_3', location_osid: 'op:mun:osid_7', status: 'active', kind: 'brigade' },
        };
        const cache = buildHomeDistanceCache(formations, adj, ['brig_a', 'brig_b', 'brig_c']);
        expect(cache['brig_a']).toBe(5);
        expect(cache['brig_b']).toBe(0);
        expect(cache['brig_c']).toBe(4);
    });

    it('skips inactive and non-brigade formations', () => {
        const adj = buildChainAdjacency(5);
        const formations: Record<string, { home_osid?: string; location_osid?: string; status?: string; kind?: string }> = {
            inactive: { home_osid: 'op:mun:osid_0', location_osid: 'op:mun:osid_2', status: 'inactive', kind: 'brigade' },
            corps: { home_osid: 'op:mun:osid_0', location_osid: 'op:mun:osid_2', status: 'active', kind: 'corps' },
            active_brig: { home_osid: 'op:mun:osid_0', location_osid: 'op:mun:osid_2', status: 'active', kind: 'brigade' },
        };
        const cache = buildHomeDistanceCache(formations, adj, ['active_brig', 'corps', 'inactive']);
        expect('inactive' in cache).toBe(false);
        expect('corps' in cache).toBe(false);
        expect('active_brig' in cache).toBe(true);
    });

    it('skips brigades without home_osid', () => {
        const adj = buildChainAdjacency(5);
        const formations: Record<string, { home_osid?: string; location_osid?: string; status?: string; kind?: string }> = {
            no_home: { location_osid: 'op:mun:osid_2', status: 'active', kind: 'brigade' },
        };
        const cache = buildHomeDistanceCache(formations, adj, ['no_home']);
        expect('no_home' in cache).toBe(false);
    });

    it('clamps graph-unreachable home to a finite sentinel (no Infinity in cache)', () => {
        // Two disconnected chains: brigade home is in chain A, location in chain B.
        const adj = new Map<Osid, Osid[]>();
        adj.set('op:a:0' as Osid, ['op:a:1' as Osid]);
        adj.set('op:a:1' as Osid, ['op:a:0' as Osid]);
        adj.set('op:b:0' as Osid, ['op:b:1' as Osid]);
        adj.set('op:b:1' as Osid, ['op:b:0' as Osid]);
        const formations: Record<string, { home_osid?: string; location_osid?: string; status?: string; kind?: string }> = {
            severed: { home_osid: 'op:a:0', location_osid: 'op:b:0', status: 'active', kind: 'brigade' },
        };
        const cache = buildHomeDistanceCache(formations, adj, ['severed']);
        // The raw graph distance is Infinity (severed corridor); cache must be finite.
        expect(Number.isFinite(cache['severed'])).toBe(true);
        expect(cache['severed']).toBe(HOME_DISTANCE_UNREACHABLE_HOPS);
        // Behaviorally inert: the sentinel yields the same floored multiplier as Infinity.
        expect(getHomeDistanceMult(cache['severed']!)).toBe(HOME_DISTANCE_FLOOR);
        expect(getHomeDistanceMult(Infinity)).toBe(HOME_DISTANCE_FLOOR);
        expect(getHomeDistanceMult(cache['severed']!, true)).toBe(HOME_DISTANCE_FLOOR_ELITE);
        expect(getHomeDistanceMult(Infinity, true)).toBe(HOME_DISTANCE_FLOOR_ELITE);
    });
});
