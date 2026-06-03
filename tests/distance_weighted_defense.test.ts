/**
 * Tests for distance-weighted reactive defense (Layer A).
 * Verifies BFS through friendly territory, distance decay, home-municipality bonus,
 * and that the resolver/predictor integrate these correctly.
 */
import { describe, it, expect } from 'vitest';
import {
    getReactiveDistanceWeight,
    bfsDistanceFriendly,
    REACTIVE_DISTANCE_BASE,
    REACTIVE_DISTANCE_MAX_HOPS,
    HOME_DEFENSE_REACTIVE_BONUS,
    getSectorReactiveDefensePredictionRatio,
    getSectorReactiveDefenseResolutionRatio,
    REACTIVE_DEFENSE_RATIO,
    SHARED_SECTOR_REACTIVE_DEFENSE_RATIO,
} from '../src/sim/combat/combat_math.js';
import { munFromOsid } from '../src/sim/combat/osid_adjacency.js';

// ── getReactiveDistanceWeight ─────────────────────────────────────────────

describe('getReactiveDistanceWeight', () => {
    it('returns 1.0 at hop 0', () => {
        expect(getReactiveDistanceWeight(0)).toBe(1.0);
    });

    it('decays exponentially with hops', () => {
        expect(getReactiveDistanceWeight(1)).toBeCloseTo(REACTIVE_DISTANCE_BASE, 5);
        expect(getReactiveDistanceWeight(2)).toBeCloseTo(REACTIVE_DISTANCE_BASE ** 2, 5);
        expect(getReactiveDistanceWeight(3)).toBeCloseTo(REACTIVE_DISTANCE_BASE ** 3, 5);
    });

    it('returns 0 beyond max hops', () => {
        expect(getReactiveDistanceWeight(REACTIVE_DISTANCE_MAX_HOPS + 1)).toBe(0);
        expect(getReactiveDistanceWeight(100)).toBe(0);
    });

    it('returns 0 for Infinity', () => {
        expect(getReactiveDistanceWeight(Infinity)).toBe(0);
    });

    it('returns 0 for negative hops', () => {
        expect(getReactiveDistanceWeight(-1)).toBe(0);
    });

    it('returns non-zero at max hops', () => {
        const w = getReactiveDistanceWeight(REACTIVE_DISTANCE_MAX_HOPS);
        expect(w).toBeGreaterThan(0);
        expect(w).toBeCloseTo(REACTIVE_DISTANCE_BASE ** REACTIVE_DISTANCE_MAX_HOPS, 5);
    });

    it('each hop is strictly less than the previous', () => {
        for (let h = 1; h <= REACTIVE_DISTANCE_MAX_HOPS; h++) {
            expect(getReactiveDistanceWeight(h)).toBeLessThan(getReactiveDistanceWeight(h - 1));
        }
    });
});

describe('sector reactive defense ratios', () => {
    it('preserves the legacy prediction cap when shared sector defense is disabled', () => {
        expect(getSectorReactiveDefensePredictionRatio(false)).toBe(REACTIVE_DEFENSE_RATIO);
    });

    it('uses a lower prediction cap for widened shared-sector rosters', () => {
        expect(SHARED_SECTOR_REACTIVE_DEFENSE_RATIO).toBeLessThan(REACTIVE_DEFENSE_RATIO);
        expect(getSectorReactiveDefensePredictionRatio(true)).toBe(SHARED_SECTOR_REACTIVE_DEFENSE_RATIO);
    });

    it('keeps battle resolution on the legacy cap for byte-stable defender cost', () => {
        expect(getSectorReactiveDefenseResolutionRatio(false)).toBe(REACTIVE_DEFENSE_RATIO);
        expect(getSectorReactiveDefenseResolutionRatio(true)).toBe(REACTIVE_DEFENSE_RATIO);
    });
});

// ── bfsDistanceFriendly ───────────────────────────────────────────────────

describe('bfsDistanceFriendly', () => {
    // Simple chain: A -- B -- C -- D (all friendly)
    const adj = new Map<string, string[]>([
        ['A', ['B']],
        ['B', ['A', 'C']],
        ['C', ['B', 'D']],
        ['D', ['C']],
    ]);
    const pc: Record<string, string | null> = { A: 'RS', B: 'RS', C: 'RS', D: 'RS' };

    it('returns 0 for same OSID', () => {
        expect(bfsDistanceFriendly('A', 'A', adj, pc, 'RS')).toBe(0);
    });

    it('returns 1 for adjacent', () => {
        expect(bfsDistanceFriendly('A', 'B', adj, pc, 'RS')).toBe(1);
    });

    it('returns correct hop count through friendly chain', () => {
        expect(bfsDistanceFriendly('A', 'C', adj, pc, 'RS')).toBe(2);
        expect(bfsDistanceFriendly('A', 'D', adj, pc, 'RS')).toBe(3);
    });

    it('returns Infinity when path blocked by enemy territory', () => {
        const pcBlocked = { ...pc, B: 'RBiH' };
        expect(bfsDistanceFriendly('A', 'C', adj, pcBlocked, 'RS')).toBe(Infinity);
    });

    it('returns Infinity when beyond maxHops', () => {
        expect(bfsDistanceFriendly('A', 'D', adj, pc, 'RS', 2)).toBe(Infinity);
    });

    it('can reach target through enemy territory (target itself can be enemy)', () => {
        // Target D is enemy-controlled but reachable because BFS checks n===to before filtering
        const pcTargetEnemy = { ...pc, D: 'RBiH' };
        expect(bfsDistanceFriendly('A', 'D', adj, pcTargetEnemy, 'RS')).toBe(3);
    });

    it('returns Infinity for disconnected graph', () => {
        const adjDisc = new Map<string, string[]>([
            ['A', ['B']],
            ['B', ['A']],
            ['C', ['D']],
            ['D', ['C']],
        ]);
        expect(bfsDistanceFriendly('A', 'C', adjDisc, pc, 'RS')).toBe(Infinity);
    });
});

// ── munFromOsid ───────────────────────────────────────────────────────────

describe('munFromOsid', () => {
    it('extracts municipality from standard OSID', () => {
        expect(munFromOsid('op:bihac:bihac_2')).toBe('bihac');
    });

    it('returns undefined for invalid format', () => {
        expect(munFromOsid('nocolons')).toBeUndefined();
    });

    it('handles OSID with extra colons', () => {
        expect(munFromOsid('op:sarajevo:stari_grad:sub')).toBe('sarajevo');
    });
});

// ── Integration: home bonus vs distance ───────────────────────────────────

describe('distance-weighted defense integration', () => {
    it('home-municipality brigade at 3 hops contributes less than stranger at 2 hops but gap narrows', () => {
        // Home brigade at 3 hops: 0.60^3 × 1.3 = 0.216 × 1.3 = 0.2808
        // Stranger at 2 hops: 0.60^2 × 1.0 = 0.36
        const homeAt3 = getReactiveDistanceWeight(3) * HOME_DEFENSE_REACTIVE_BONUS;
        const strangerAt2 = getReactiveDistanceWeight(2) * 1.0;
        // Home bonus narrows the gap but doesn't close it at 3 hops
        expect(homeAt3).toBeCloseTo(0.216 * HOME_DEFENSE_REACTIVE_BONUS, 2);
        expect(strangerAt2).toBeCloseTo(0.36, 2);
        expect(strangerAt2).toBeGreaterThan(homeAt3);
        expect(strangerAt2 - homeAt3).toBeLessThan(0.10);
    });

    it('physical defender (hop 0) always dominates reserve contributions', () => {
        const physical = getReactiveDistanceWeight(0); // 1.0
        const best1hop = getReactiveDistanceWeight(1) * HOME_DEFENSE_REACTIVE_BONUS; // 0.6 × 1.3 = 0.78
        expect(physical).toBeGreaterThan(best1hop);
    });

    it('5-hop reserve contributes meaningfully but weakly', () => {
        const w = getReactiveDistanceWeight(5);
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThan(0.1); // ~0.078
    });
});
