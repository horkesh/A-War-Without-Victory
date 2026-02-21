import assert from 'node:assert';
import { test } from 'node:test';
import type { LoadedSettlementGraph } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { updateSarajevoState } from '../src/state/sarajevo_exception.js';
import type { SupplyStateDerivationReport } from '../src/state/supply_state_derivation.js';

test('updateSarajevoState derives siege status from supply', () => {
    const state: GameState = {
        schema_version: 1,
        meta: { turn: 12, seed: 'sarajevo-test', phase: 'phase_ii' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { SARA: 'RBiH' }
    };

    const graph: LoadedSettlementGraph = {
        settlements: new Map([['SARA', { sid: 'SARA', source_id: 'SARA', mun_code: '10529', mun: 'Sarajevo', mun1990_id: '10529' }]]),
        edges: []
    };
    const supplyReport: SupplyStateDerivationReport = {
        schema: 1,
        turn: 12,
        factions: [
            { faction_id: 'RBiH', by_settlement: [{ sid: 'SARA', state: 'adequate' }], adequate_count: 1, strained_count: 0, critical_count: 0 }
        ]
    };

    const sarajevo = updateSarajevoState(state, graph, supplyReport);
    assert.strictEqual(sarajevo.siege_status, 'BESIEGED');
    assert.strictEqual(sarajevo.internal_supply, 0);
});
