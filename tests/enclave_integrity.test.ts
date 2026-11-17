import { describe, expect, it } from 'vitest';

import type { LoadedSettlementGraph } from '../src/map/settlements.js';
import { updateEnclaveIntegrity } from '../src/state/enclave_integrity.js';
import type { GameState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

function baseState(): GameState {
    return {
        schema_version: 1,
        meta: { turn: 5, seed: 'enclave-test', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        political: {
            political_controllers: { S1: 'RBiH', S2: 'RBiH' },
            municipalities: { M1: { authority: 0.5 } }
        } as any,
        displacement: {} as any
    };
}

describe('enclave integrity', () => {
    it('updateEnclaveIntegrity detects enclave and pressure', () => {
        const state = baseState();
        const graph: LoadedSettlementGraph = {
            settlements: new Map([
                ['S1', { sid: 'S1', source_id: 'S1', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }],
                ['S2', { sid: 'S2', source_id: 'S2', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }]
            ]),
            edges: [{ a: 'S1', b: 'S2' }]
        };
        const supplyReport: SupplyStateByOsidReport = {
            schema: 1,
            turn: 5,
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'S1', state: 'critical' },
                        { osid: 'S2', state: 'critical' }
                    ]
                }
            ]
        };

        const report = updateEnclaveIntegrity(state, graph, graph.edges, supplyReport);
        expect(report.enclaves).toHaveLength(1);
        expect(report.humanitarian_pressure_total).toBeGreaterThan(0);
    });

    it('F1i: reads the OSID supply report, so OSID-controlled critical pockets become enclaves', () => {
        const state = baseState();
        state.political.political_controllers = { 'op:m1:a': 'RBiH', 'op:m1:b': 'RBiH', 'op:m1:c': 'RBiH' } as any;
        const graph: LoadedSettlementGraph = {
            settlements: new Map([
                ['op:m1:a', { sid: 'op:m1:a', source_id: 'op:m1:a', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }],
                ['op:m1:b', { sid: 'op:m1:b', source_id: 'op:m1:b', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }],
                ['op:m1:c', { sid: 'op:m1:c', source_id: 'op:m1:c', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }]
            ]),
            edges: [{ a: 'op:m1:a', b: 'op:m1:b' }, { a: 'op:m1:b', b: 'op:m1:c' }]
        };
        const supplyReport: SupplyStateByOsidReport = {
            schema: 1,
            turn: 5,
            factions: [{
                faction_id: 'RBiH',
                by_osid: [
                    { osid: 'op:m1:a', state: 'critical' },
                    { osid: 'op:m1:b', state: 'critical' },
                    { osid: 'op:m1:c', state: 'adequate' }
                ]
            }]
        };

        const report = updateEnclaveIntegrity(state, graph, graph.edges, supplyReport);
        expect(report.enclaves).toHaveLength(1);
        expect(report.enclaves[0]!.settlement_ids).toEqual(['op:m1:a', 'op:m1:b']);
        expect(state.political.enclaves).toHaveLength(1);

        // Without an OSID supply report nothing is critical, so there is no enclave.
        expect(updateEnclaveIntegrity(baseState(), graph, graph.edges, undefined).enclaves).toHaveLength(0);
    });
});
