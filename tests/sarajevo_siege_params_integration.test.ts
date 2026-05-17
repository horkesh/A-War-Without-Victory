import { describe, expect, it } from 'vitest';

import { computeTerrainModifier } from '../src/sim/combat/battle_resolution.js';
import { updateExhaustion } from '../src/sim/combat/exhaustion.js';
import { updateEnclaveIntegrity } from '../src/state/enclave_integrity.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function baseState(overrides?: GameState['meta']['sarajevo_overrides']): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 8,
            seed: 'sarajevo-integration',
            phase: 'war',
            ...(overrides ? { sarajevo_overrides: overrides } : {}),
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {} } as any,
        political: {
            political_controllers: { 'op:centar_sarajevo:centar_sarajevo': 'RBiH' },
            sarajevo_state: { siege_status: 'BESIEGED', siege_duration: 8 },
            war_exhaustion: { RBiH: 0, RS: 0 },
            war_supply_condition: { RBiH: 100, RS: 100 },
        } as any,
        displacement: {} as any,
    };
}

describe('Sarajevo siege parameter consumer integration', () => {
    it('preserves default Sarajevo urban defense math and reads defense override', () => {
        const terrainData = { by_sid: {} } as any;
        const settlementToMun = new Map([['S1', 'centar_sarajevo']]);

        const defaults = computeTerrainModifier(terrainData, 'S1', settlementToMun, baseState());
        const overridden = computeTerrainModifier(terrainData, 'S1', settlementToMun, baseState({ defense_bonus: 0.5 }));

        expect(defaults.urban_defense_bonus).toBe(0.4);
        expect(overridden.urban_defense_bonus).toBe(0.5);
        expect(overridden.composite).toBeGreaterThan(defaults.composite);
    });

    it('preserves default Sarajevo exhaustion surcharge and reads per-faction overrides', () => {
        const defaults = baseState();
        updateExhaustion(defaults, []);
        expect(defaults.political.war_exhaustion?.RBiH).toBe(3);
        expect(defaults.political.war_exhaustion?.RS).toBe(2);

        const overridden = baseState({ rbih_exhaustion_per_turn: 4, rs_exhaustion_per_turn: 1.25 });
        updateExhaustion(overridden, []);
        expect(overridden.political.war_exhaustion?.RBiH).toBe(4);
        expect(overridden.political.war_exhaustion?.RS).toBe(1.25);
    });

    it('uses the Sarajevo integrity floor override when computing enclave integrity', () => {
        const state = baseState({ integrity_floor: 0.33 });
        state.political.enclaves = [{
            id: 'prev',
            faction_id: 'RBiH',
            settlement_ids: ['op:centar_sarajevo:centar_sarajevo'],
            integrity: 0.1,
            components: { supply: 0, authority: 0, population: 0, connectivity: 0 },
            humanitarian_pressure: 0,
            siege_duration: 5,
            collapsed: false,
        }];
        const graph = {
            settlements: new Map([
                ['op:centar_sarajevo:centar_sarajevo', { mun1990_id: 'centar_sarajevo' }],
            ]),
        } as any;
        const supplyReport = {
            factions: [{
                faction_id: 'RBiH',
                by_settlement: [{ sid: 'op:centar_sarajevo:centar_sarajevo', state: 'critical' }],
            }],
        } as any;

        const report = updateEnclaveIntegrity(state, graph, [], supplyReport);

        expect(report.enclaves[0]?.integrity).toBe(0.33);
    });
});
