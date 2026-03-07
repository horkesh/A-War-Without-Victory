import assert from 'node:assert';
import { test } from 'node:test';

import type { EdgeRecord, SettlementRecord } from '../src/map/settlements.js';
import { updateSupplyPressure } from '../src/sim/combat/supply_pressure.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { calculateFactionProductionBonus, ensureProductionFacilities } from '../src/state/production_facilities.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 30, seed: 'prod-test', phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            SZ1: 'RBiH',
            SZ2: 'RBiH',
            SV1: 'HRHB'
        }
    };
}

function makeSettlements(): Map<string, SettlementRecord> {
    return new Map<string, SettlementRecord>([
        ['SZ1', { sid: 'SZ1', source_id: 'SZ1', mun_code: 'zenica', mun: 'Zenica', mun1990_id: 'zenica' }],
        ['SZ2', { sid: 'SZ2', source_id: 'SZ2', mun_code: 'zenica', mun: 'Zenica', mun1990_id: 'zenica' }],
        ['SV1', { sid: 'SV1', source_id: 'SV1', mun_code: 'vitez', mun: 'Vitez', mun1990_id: 'vitez' }],
        ['SK1', { sid: 'SK1', source_id: 'SK1', mun_code: 'konjic', mun: 'Konjic', mun1990_id: 'konjic' }],
        ['SNT1', { sid: 'SNT1', source_id: 'SNT1', mun_code: 'novi_travnik', mun: 'Novi Travnik', mun1990_id: 'novi_travnik' }]
    ]);
}

test('production facilities grant deterministic bonus by controlling faction', () => {
    const state = makeState();
    state.political_controllers = {
        ...(state.political_controllers ?? {}),
        SK1: 'RBiH',
        SNT1: 'HRHB'
    };
    ensureProductionFacilities(state);
    const bonus = calculateFactionProductionBonus(state, makeSettlements());
    assert.ok((bonus['RBiH'] ?? 0) > 0, 'RBiH should receive Zenica and Konjic facility bonus');
    assert.ok((bonus['HRHB'] ?? 0) > 0, 'HRHB should receive Vitez and Novi Travnik facility bonus');
});

test('production bonus reduces supply-pressure growth without decreasing current pressure', () => {
    const state = makeState();
    state.war_supply_pressure = { RBiH: 10, RS: 10, HRHB: 10 };
    // Alliance must be broken so the RBiH–HRHB edge counts as a front edge
    state.war_alliance_rbih_hrhb = -1;
    const edges: EdgeRecord[] = [{ a: 'SZ1', b: 'SV1' }];
    updateSupplyPressure(
        state,
        edges,
        {
            schema: 1,
            turn: 30,
            factions: [
                { faction_id: 'RBiH', by_settlement: [{ sid: 'SZ1', state: 'strained' }], adequate_count: 0, strained_count: 1, critical_count: 0 },
                { faction_id: 'RS', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 0 },
                { faction_id: 'HRHB', by_settlement: [{ sid: 'SV1', state: 'critical' }], adequate_count: 0, strained_count: 0, critical_count: 1 }
            ]
        },
        undefined,
        { RBiH: 5, RS: 0, HRHB: 0 }
    );
    assert.ok((state.war_supply_pressure?.RBiH ?? 0) >= 10, 'pressure must remain monotonic');
    assert.ok((state.war_supply_pressure?.RBiH ?? 0) < (state.war_supply_pressure?.HRHB ?? 0), 'production bonus should reduce growth relative to higher-isolation side');
});
