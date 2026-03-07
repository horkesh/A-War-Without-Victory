/**
 * Tests for UN humanitarian airdrops (Phase D — applyUnAirdrops).
 * Historical basis: US C-130 drops to Srebrenica, Goražde, Žepa, Bihać (Feb 1993+).
 * General supply only (no munitions). Deterministic: sorted enclave iteration.
 */
import { describe, it, expect } from 'vitest';
import { applyUnAirdrops } from '../src/state/supply_reserves.js';
import {
    AIRDROP_ISOLATION_THRESHOLD,
    AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE,
    AIRDROP_MAX_SUPPLY_PER_TURN,
    AIRDROP_ELIGIBLE_FACTION,
} from '../src/state/supply_reserve_constants.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        meta: { turn: 10, phase: 'war', supply_reserves_enabled: true },
        general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 60 },
        heavy_munitions_reserve: { RBiH: 40, RS: 50, HRHB: 45 },
        enclave_resilience: {},
        factions: [],
        political_controllers: {},
        formations: {},
        ...overrides,
    } as unknown as GameState;
}

describe('applyUnAirdrops', () => {
    it('no-op when supply_reserves_enabled is false', () => {
        const state = makeState();
        state.meta.supply_reserves_enabled = false;
        state.enclave_resilience = {
            'op:gorazde:core': { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 2, hardening_active: false },
        };
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBe(50);
    });

    it('no-op when no enclaves have reached isolation threshold', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 5, isolation_turns: AIRDROP_ISOLATION_THRESHOLD - 1, hardening_active: false },
            },
        });
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBe(50);
    });

    it('airdrops begin exactly at isolation threshold', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 5, isolation_turns: AIRDROP_ISOLATION_THRESHOLD, hardening_active: false },
            },
        });
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBeCloseTo(50 + AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE);
    });

    it('multiple eligible enclaves accumulate drops', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 3, hardening_active: false },
                'op:srebrenica:core': { resilience: 15, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 1, hardening_active: false },
                'op:zepa:core': { resilience: 8, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 5, hardening_active: true },
            },
        });
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBeCloseTo(50 + AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE * 3);
    });

    it('total drop capped at AIRDROP_MAX_SUPPLY_PER_TURN', () => {
        const enclaves: Record<string, unknown> = {};
        for (let i = 0; i < 20; i++) {
            enclaves[`op:enclave${i}:core`] = { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 5, hardening_active: false };
        }
        const state = makeState({ enclave_resilience: enclaves as GameState['enclave_resilience'] });
        state.general_supply_reserve!['RBiH'] = 0;
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBe(AIRDROP_MAX_SUPPLY_PER_TURN);
    });

    it('heavy munitions are NOT affected — humanitarian only', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 2, hardening_active: false },
            },
        });
        applyUnAirdrops(state);
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(40);
    });

    it('non-RBiH factions not affected', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 2, hardening_active: false },
            },
        });
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RS']).toBe(70);
        expect(state.general_supply_reserve!['HRHB']).toBe(60);
        expect(AIRDROP_ELIGIBLE_FACTION).toBe('RBiH');
    });

    it('reserve clamped at 100', () => {
        const state = makeState({
            enclave_resilience: {
                'op:gorazde:core': { resilience: 20, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 5, hardening_active: false },
            },
        });
        state.general_supply_reserve!['RBiH'] = 99.9;
        applyUnAirdrops(state);
        expect(state.general_supply_reserve!['RBiH']).toBe(100);
    });

    it('normalizes staged airdrop allocations across eligible enclaves', () => {
        const state = makeState({
            enclave_resilience: {
                gorazde: { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 2, hardening_active: false },
                srebrenica: { resilience: 10, isolation_turns: AIRDROP_ISOLATION_THRESHOLD + 2, hardening_active: false },
            },
            airdrop_allocation: {
                gorazde: 0.5,
            }
        });

        applyUnAirdrops(state);

        expect(state.airdrop_allocation?.gorazde).toBeCloseTo(0.75);
        expect(state.airdrop_allocation?.srebrenica).toBeCloseTo(0.25);
    });
});
