// tests/supply_phase_e1.test.ts
import { describe, it, expect } from 'vitest';
import { applyJnaInheritanceBonus, ensureSupplyReserves } from '../src/state/supply_reserves.js';
import {
    JNA_INHERITANCE_FACTION,
    JNA_INHERITANCE_HEAVY_BONUS,
    PATRON_AID_SCALE,
    PATRON_AID_FACTION_EFFICIENCY,
    PATRON_AID_GENERAL_FRACTION,
    INIT_HEAVY_MUNITIONS_RESERVE,
} from '../src/state/supply_reserve_constants.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(supplyEnabled = true): GameState {
    return {
        schema_version: 1,
        meta: { turn: 0, seed: 'test', phase: 'war', supply_reserves_enabled: supplyEnabled },
        factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] },
        ],
        formations: {},
        settlements: [],
        municipalities: {},
        political_controllers: {},
    } as unknown as GameState;
}

describe('Phase E1 — JNA Inheritance Bonus', () => {
    it('applies JNA bonus to RS heavy munitions', () => {
        const state = makeState();
        ensureSupplyReserves(state);
        applyJnaInheritanceBonus(state);
        expect(state.heavy_munitions_reserve!['RS']).toBe(INIT_HEAVY_MUNITIONS_RESERVE + JNA_INHERITANCE_HEAVY_BONUS);
    });

    it('clamps RS heavy munitions at 100', () => {
        const state = makeState();
        state.heavy_munitions_reserve = { RS: 90, RBiH: 60, HRHB: 60 } as unknown as typeof state.heavy_munitions_reserve;
        applyJnaInheritanceBonus(state);
        expect(state.heavy_munitions_reserve!['RS']).toBe(100);
    });

    it('is no-op when supply_reserves_enabled is false', () => {
        const state = makeState(false);
        ensureSupplyReserves(state);
        applyJnaInheritanceBonus(state);
        expect(state.heavy_munitions_reserve!['RS']).toBe(INIT_HEAVY_MUNITIONS_RESERVE);
    });

    it('does not affect non-RS factions', () => {
        const state = makeState();
        ensureSupplyReserves(state);
        applyJnaInheritanceBonus(state);
        // RBiH and HRHB use per-faction overrides (5 and 25 respectively), not the global default
        expect(state.heavy_munitions_reserve!['RBiH']).toBe(5);
        expect(state.heavy_munitions_reserve!['HRHB']).toBe(25);
    });

    it('is idempotent — second call stays at 100 if already maxed', () => {
        const state = makeState();
        state.heavy_munitions_reserve = { RS: 100, RBiH: 60, HRHB: 60 } as unknown as typeof state.heavy_munitions_reserve;
        applyJnaInheritanceBonus(state);
        applyJnaInheritanceBonus(state);
        expect(state.heavy_munitions_reserve!['RS']).toBe(100);
    });
});

describe('Phase E1 — PATRON_AID_SCALE value check', () => {
    it('PATRON_AID_SCALE is 6 with faction efficiency multipliers', () => {
        expect(PATRON_AID_SCALE).toBe(6);
        expect(PATRON_AID_FACTION_EFFICIENCY['RS']).toBe(0.8);
        expect(PATRON_AID_FACTION_EFFICIENCY['RBiH']).toBe(0.3);
        expect(PATRON_AID_FACTION_EFFICIENCY['HRHB']).toBe(0.6);
    });

    it('RS patron income with faction efficiency substantially offsets maintenance drain', () => {
        // RS material_support_level ~0.78, embargo general factor ~0.9, faction efficiency 0.8
        const materialSupport = 0.78;
        const embargoFactor = 0.9;
        const factionEff = PATRON_AID_FACTION_EFFICIENCY['RS'] ?? 1.0;
        const income = materialSupport * PATRON_AID_SCALE * factionEff * PATRON_AID_GENERAL_FRACTION * embargoFactor;
        // At scale 6 × efficiency 0.8: income ~1.68 (meaningful offset vs RS maintenance drain)
        expect(income).toBeGreaterThan(1.5);
    });
});
