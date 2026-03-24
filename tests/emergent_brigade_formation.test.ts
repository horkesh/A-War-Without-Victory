import { describe, it, expect } from 'vitest';
import { canFormEmergentBrigade, reroutePoolSurplus } from '../src/sim/recruitment_engine.js';
import { ENCLAVE_FORMATION_CAPACITY_THRESHOLD } from '../src/state/formation_constants.js';

function makeBrigade(personnel: number, maxPersonnel = 3000) {
    return { personnel, max_personnel: maxPersonnel };
}

describe('canFormEmergentBrigade', () => {
    it('returns true when pool has surplus and existing brigades at capacity', () => {
        const existing = [makeBrigade(2500)]; // 83% > 60%
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 4, 0)).toBe(true);
    });

    it('returns false when existing brigade below capacity threshold', () => {
        const existing = [makeBrigade(1000)]; // 33% < 60%
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when pool cannot afford new brigade', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, { available: 100 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when current turn before available_from', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, { available: 1000 }, 600, 2, 4)).toBe(false);
    });

    it('returns true when municipality has zero existing brigades', () => {
        expect(canFormEmergentBrigade([], { available: 800 }, 600, 0, 0)).toBe(true);
    });

    it('returns true when all existing brigades above threshold', () => {
        const existing = [makeBrigade(2000), makeBrigade(1900)]; // 67%, 63%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(true);
    });

    it('returns false when one brigade below threshold even if others full', () => {
        const existing = [makeBrigade(3000), makeBrigade(500)]; // 100%, 17%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });

    it('returns false when pool is undefined', () => {
        const existing = [makeBrigade(2500)];
        expect(canFormEmergentBrigade(existing, undefined, 600, 4, 0)).toBe(false);
    });
});

describe('canFormEmergentBrigade — enclave capacity gate', () => {
    it('enclave brigade (max=1500) at 1000 passes 60% threshold (1000 > 900)', () => {
        const existing = [makeBrigade(1000, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(true);
    });

    it('enclave brigade (max=1500) at 600 fails 60% threshold (600 < 900)', () => {
        const existing = [makeBrigade(600, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });

    it('standard brigade (max=3000) at 1000 FAILS but enclave (max=1500) at 1000 PASSES', () => {
        // Standard: 1000 < 3000 * 0.60 = 1800 → false
        const standard = [makeBrigade(1000, 3000)];
        expect(canFormEmergentBrigade(standard, { available: 800 }, 600, 4, 0)).toBe(false);

        // Enclave: 1000 > 1500 * 0.60 = 900 → true
        const enclave = [makeBrigade(1000, 1500)];
        expect(canFormEmergentBrigade(enclave, { available: 800 }, 600, 4, 0)).toBe(true);
    });
});

describe('canFormEmergentBrigade — enclave lowered threshold (0.30)', () => {
    it('enclave threshold (0.30) allows formation when brigade at 600/1500', () => {
        const existing = [makeBrigade(600, 1500)]; // 40% > 30%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(true);
    });

    it('enclave threshold (0.30) blocks when brigade at 300/1500', () => {
        const existing = [makeBrigade(300, 1500)]; // 20% < 30%
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(false);
    });

    it('enclave threshold (0.30) passes at exact boundary (450/1500 = 30%, strict less-than)', () => {
        const existing = [makeBrigade(450, 1500)]; // exactly 30% — not less than, so passes
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(true);
    });

    it('enclave threshold (0.30) blocks just below boundary (449/1500)', () => {
        const existing = [makeBrigade(449, 1500)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0, ENCLAVE_FORMATION_CAPACITY_THRESHOLD)).toBe(false);
    });

    it('default threshold still works when no override passed', () => {
        // 1000/3000 = 33% < 60% default → false
        const existing = [makeBrigade(1000, 3000)];
        expect(canFormEmergentBrigade(existing, { available: 800 }, 600, 4, 0)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// reroutePoolSurplus
// ---------------------------------------------------------------------------

describe('reroutePoolSurplus', () => {
    function makeState(pools: Record<string, { available: number; committed: number }>, formations: any[] = []) {
        const fmnsObj: Record<string, any> = {};
        for (const f of formations) fmnsObj[f.id] = f;
        return {
            meta: { turn: 10 },
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
            makeFormation('b1', 'RBiH', 'zenica', 2500), // above 60% capacity
        ]);
        const oobByMun: Record<string, { faction: string; initial_personnel: number }[]> = {
            visoko: [{ faction: 'RBiH', initial_personnel: 800 }],
        };
        const result = reroutePoolSurplus(state, 'RBiH', oobByMun);
        expect(result.transferred).toBeGreaterThan(0);
        expect(state.military.militia_pools['visoko:RBiH'].available).toBeGreaterThan(0);
        expect(state.military.militia_pools['zenica:RBiH'].available).toBeLessThan(5000);
    });

    it('does NOT route into enclave municipalities', () => {
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

    it('deterministic ordering — surplus sorted by available desc, deficit by needed asc', () => {
        const state = makeState({
            'aaa_mun:RBiH': { available: 1000, committed: 5000 },
            'zzz_mun:RBiH': { available: 3000, committed: 5000 },
            'bbb_mun:RBiH': { available: 0, committed: 1000 },
            'ccc_mun:RBiH': { available: 0, committed: 1000 },
        }, [
            // surplus muns have brigades at capacity
            makeFormation('b1', 'RBiH', 'aaa_mun', 2500),
            makeFormation('b2', 'RBiH', 'zzz_mun', 2500),
        ]);
        const oobByMun: Record<string, { faction: string; initial_personnel: number }[]> = {
            bbb_mun: [{ faction: 'RBiH', initial_personnel: 500 }],
            ccc_mun: [{ faction: 'RBiH', initial_personnel: 800 }],
        };
        const result = reroutePoolSurplus(state, 'RBiH', oobByMun);
        expect(result.transferred).toBe(1300); // 500 + 800
        // zzz_mun (3000) is drained first (highest surplus), then aaa_mun (1000)
        expect(result.routes[0].from).toBe('zzz_mun');
        expect(result.routes[0].to).toBe('bbb_mun'); // bbb needs 500 (smallest deficit first)
        expect(result.routes[1].from).toBe('zzz_mun');
        expect(result.routes[1].to).toBe('ccc_mun'); // ccc needs 800
    });
});
