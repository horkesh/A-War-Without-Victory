import { describe, it, expect } from 'vitest';
import {
    updateEnclaveResilience,
    getEnclaveDefenseBonus,
    getEnclaveCohesionRecovery,
    getMaxEnclaveResilienceForFaction,
    readResilience,
} from '../src/sim/combat/enclave_resilience.js';
import { updateExhaustion } from '../src/sim/combat/exhaustion.js';
import type { EnclaveResilienceEntry, GameState } from '../src/state/game_state.js';
import {
    HARDENING_THRESHOLD,
    HARDENING_DEFENSE_BONUS,
    MAX_ENCLAVE_RESILIENCE,
    RESILIENCE_EFFECT_SCALE,
} from '../src/state/supply_reserve_constants.js';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
    return {
  schema_version: 1,
  meta: { turn: 20, seed: 'test', phase: 'war' },
  factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] }
        ],
  ...overrides,
  military: {
    formations: {},
      ...(overrides?.military || {})
} as any,
  political: {
    settlements: [],
    municipalities: {},
    political_controllers: {},
      ...(overrides?.political || {})
} as any,
  displacement: {
      ...(overrides?.displacement || {})
} as any,
} as unknown as GameState;
}

function makeCriticalSupplyReport(enclavePrefix: string, faction: string = 'RBiH') {
    return {
        schema: 1 as const,
        turn: 20,
        factions: [{
            faction_id: faction,
            by_osid: [
                { osid: `${enclavePrefix}center`, state: 'critical' as const },
                { osid: `${enclavePrefix}north`, state: 'critical' as const },
            ]
        }]
    };
}

function makeAdequateSupplyReport(enclavePrefix: string, faction: string = 'RBiH') {
    return {
        schema: 1 as const,
        turn: 20,
        factions: [{
            faction_id: faction,
            by_osid: [
                { osid: `${enclavePrefix}center`, state: 'adequate' as const },
                { osid: `${enclavePrefix}north`, state: 'adequate' as const },
            ]
        }]
    };
}

describe('readResilience', () => {
    it('returns 0 for undefined', () => {
        expect(readResilience(undefined)).toBe(0);
    });

    it('returns number directly for bare number', () => {
        expect(readResilience(15)).toBe(15);
    });

    it('extracts resilience from structured entry', () => {
        const entry: EnclaveResilienceEntry = { resilience: 20, isolation_turns: 5, hardening_active: false };
        expect(readResilience(entry)).toBe(20);
    });
});

describe('updateEnclaveResilience — isolation tracking', () => {
    it('increments isolation_turns on critical supply', () => {
        const state = makeMinimalState();
        const supply = makeCriticalSupplyReport('op:srebrenica:');
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(1);
        expect(entry.hardening_active).toBe(false);
    });

    it('accumulates isolation_turns across multiple turns', () => {
        const state = makeMinimalState();
        const supply = makeCriticalSupplyReport('op:srebrenica:');
        for (let i = 0; i < 5; i++) {
            updateEnclaveResilience(state, supply);
        }
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(5);
        expect(entry.resilience).toBeCloseTo(3.5, 5); // 5 turns × +2 × 0.35 growth_mult per critical turn
    });

    it('resets isolation_turns on adequate supply', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 10, isolation_turns: 5, hardening_active: false }
            },
  } as any,
});
        const supply = makeAdequateSupplyReport('op:srebrenica:');
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(0);
        expect(entry.resilience).toBe(9); // 10 - 1 decay
    });
});

describe('updateEnclaveResilience — hardening activation', () => {
    it('activates hardening after HARDENING_THRESHOLD isolation turns', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 14, isolation_turns: HARDENING_THRESHOLD - 1, hardening_active: false }
            },
  } as any,
});
        const supply = makeCriticalSupplyReport('op:srebrenica:');
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(HARDENING_THRESHOLD);
        expect(entry.hardening_active).toBe(true);
    });

    it('deactivates hardening when isolation resets', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 20, isolation_turns: 10, hardening_active: true }
            },
  } as any,
});
        const supply = makeAdequateSupplyReport('op:srebrenica:');
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(entry.isolation_turns).toBe(0);
        expect(entry.hardening_active).toBe(false);
    });
});

describe('getEnclaveDefenseBonus — with hardening', () => {
    it('returns base bonus without hardening', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 20, isolation_turns: 3, hardening_active: false }
            },
  } as any,
});
        const bonus = getEnclaveDefenseBonus(state, 'op:srebrenica:center');
        expect(bonus).toBeCloseTo(1.0 + 20 * 0.02, 5); // 1.40
    });

    it('applies hardening defense bonus when active', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 20, isolation_turns: 10, hardening_active: true }
            },
  } as any,
});
        const bonus = getEnclaveDefenseBonus(state, 'op:srebrenica:center');
        const expected = (1.0 + 20 * 0.02) * (1.0 + HARDENING_DEFENSE_BONUS);
        expect(bonus).toBeCloseTo(expected, 5); // 1.40 × 1.05 = 1.47
    });

    it('max combined bonus at max resilience + hardening', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: MAX_ENCLAVE_RESILIENCE, isolation_turns: 10, hardening_active: true }
            },
  } as any,
});
        const bonus = getEnclaveDefenseBonus(state, 'op:srebrenica:center');
        const expected = (1.0 + MAX_ENCLAVE_RESILIENCE * 0.02) * (1.0 + HARDENING_DEFENSE_BONUS);
        expect(bonus).toBeCloseTo(expected, 5); // 1.60 × 1.05 = 1.68
    });

    it('returns 1.0 for non-enclave OSID', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 20, isolation_turns: 10, hardening_active: true }
            },
  } as any,
});
        expect(getEnclaveDefenseBonus(state, 'op:banja_luka:center')).toBe(1.0);
    });
});

describe('getEnclaveCohesionRecovery — structured entry', () => {
    it('works with structured entry', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 25, isolation_turns: 5, hardening_active: false }
            },
  } as any,
});
        expect(getEnclaveCohesionRecovery(state, 'op:srebrenica:center')).toBe(2);
    });

    it('works with legacy bare number', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: { srebrenica: 25 },
  } as any,
});
        expect(getEnclaveCohesionRecovery(state, 'op:srebrenica:center')).toBe(2);
    });
});

describe('getMaxEnclaveResilienceForFaction', () => {
    it('returns max resilience across RBiH enclaves', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                bihac_pocket: { resilience: 10, isolation_turns: 5, hardening_active: false },
                srebrenica: { resilience: 25, isolation_turns: 12, hardening_active: true },
                gorazde: { resilience: 15, isolation_turns: 8, hardening_active: true },
            },
  } as any,
});
        expect(getMaxEnclaveResilienceForFaction(state, 'RBiH')).toBe(25);
    });

    it('returns 0 for RS (no enclaves)', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: {
                srebrenica: { resilience: 25, isolation_turns: 12, hardening_active: true }
            },
  } as any,
});
        expect(getMaxEnclaveResilienceForFaction(state, 'RS')).toBe(0);
    });
});

describe('exhaustion — enclave reduction', () => {
    it('reduces RBiH exhaustion growth with enclave resilience', () => {
        const stateBase = makeMinimalState({
  political: {
    war_supply_pressure: { RBiH: 50, RS: 50, HRHB: 0 } as any,
  } as any,
});
        // No enclave resilience → baseline exhaustion
        updateExhaustion(stateBase, []);
        const baseExhaustion = stateBase.political.war_exhaustion!['RBiH'] ?? 0;

        const stateWithEnclave = makeMinimalState({
  political: {
    war_supply_pressure: { RBiH: 50, RS: 50, HRHB: 0 } as any,
    enclave_resilience: {
                srebrenica: { resilience: 20, isolation_turns: 10, hardening_active: true }
            },
  } as any,
});
        updateExhaustion(stateWithEnclave, []);
        const enclaveExhaustion = stateWithEnclave.political.war_exhaustion!['RBiH'] ?? 0;

        // With 20 resilience × 0.01 = 20% reduction
        expect(enclaveExhaustion).toBeCloseTo(baseExhaustion * (1.0 - 20 * RESILIENCE_EFFECT_SCALE), 5);
        expect(enclaveExhaustion).toBeLessThan(baseExhaustion);
    });

    it('does not reduce RS exhaustion (no enclaves)', () => {
        const state1 = makeMinimalState({
  political: {
    war_supply_pressure: { RBiH: 50, RS: 50, HRHB: 0 } as any,
  } as any,
});
        updateExhaustion(state1, []);
        const rsBase = state1.political.war_exhaustion!['RS'] ?? 0;

        const state2 = makeMinimalState({
  political: {
    war_supply_pressure: { RBiH: 50, RS: 50, HRHB: 0 } as any,
    enclave_resilience: {
                srebrenica: { resilience: 30, isolation_turns: 15, hardening_active: true }
            },
  } as any,
});
        updateExhaustion(state2, []);
        const rsWithEnclave = state2.political.war_exhaustion!['RS'] ?? 0;

        expect(rsWithEnclave).toBeCloseTo(rsBase, 5); // No change for RS
    });
});

describe('migration from bare number', () => {
    it('updateEnclaveResilience migrates bare numbers to structured entries', () => {
        const state = makeMinimalState({
  political: {
    enclave_resilience: { srebrenica: 15 },
  } as any,
});
        const supply = makeCriticalSupplyReport('op:srebrenica:');
        updateEnclaveResilience(state, supply);
        const entry = state.political.enclave_resilience!['srebrenica'] as EnclaveResilienceEntry;
        expect(typeof entry).toBe('object');
        expect(entry.resilience).toBeCloseTo(15.7, 5); // 15 + 2 * 0.35 growth (srebrenica growth_mult)
        expect(entry.isolation_turns).toBe(1);
        expect(entry.hardening_active).toBe(false);
    });
});
