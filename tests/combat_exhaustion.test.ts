/**
 * Phase D Step 5: Exhaustion accumulation tests.
 * - Exhaustion never decreases.
 * - Prolonged conflict increases exhaustion for all sides.
 * - Exhaustion does not flip control directly.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { updateExhaustion } from '../src/sim/combat/exhaustion.js';
import type { GameState, FrontDescriptor } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 20, seed: 'ex-test', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
  factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
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
    political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'HRHB' }
  } as any,
        displacement: {} as any
    };
}

test('exhaustion never decreases', () => {
    const state = minimalPhaseIIState();
    state.political.war_exhaustion = { RBiH: 50, RS: 50, HRHB: 50 };
    const before = { ...state.political.war_exhaustion };
    updateExhaustion(state, []);
    assert.ok(state.political.war_exhaustion!['RBiH']! >= before['RBiH']!);
    assert.ok(state.political.war_exhaustion!['RS']! >= before['RS']!);
    assert.ok(state.political.war_exhaustion!['HRHB']! >= before['HRHB']!);
});

test('prolonged conflict increases exhaustion for all sides', () => {
    const state = minimalPhaseIIState();
    state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    state.political.war_supply_pressure = { RBiH: 20, RS: 30, HRHB: 10 };
    const staticFronts: FrontDescriptor[] = [
        { id: 'F_RS--RBiH_e1', edge_ids: ['e1'], created_turn: 10, stability: 'static' }
    ];
    updateExhaustion(state, staticFronts);
    assert.ok(state.political.war_exhaustion!['RBiH']! > 0);
    assert.ok(state.political.war_exhaustion!['RS']! > 0);
    assert.ok(state.political.war_exhaustion!['HRHB']! > 0);
});

test('exhaustion does not flip control directly', () => {
    const state = minimalPhaseIIState();
    const controllersBefore = state.political.political_controllers ? { ...state.political.political_controllers } : {};
    state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    state.political.war_supply_pressure = { RBiH: 100, RS: 100, HRHB: 100 };
    updateExhaustion(state, [
        { id: 'F1', edge_ids: ['e1'], created_turn: 1, stability: 'static' }
    ]);
    assert.deepStrictEqual(state.political.political_controllers, controllersBefore);
});

test('exhaustion prefers sector-owned frontline exposure when live sector truth exists', () => {
    const state = minimalPhaseIIState();
    state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    state.political.war_supply_pressure = { RBiH: 0, RS: 0, HRHB: 0 };
    state.military.corps_front_sectors = {
        'sector:rbih': {
            sector_id: 'sector:rbih',
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: ['e1'],
            sub_segments: [],
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
        },
        'sector:rs': {
            sector_id: 'sector:rs',
            corps_id: 'vrs_romanija',
            faction: 'RS',
            opposing_factions: ['RBiH'],
            edge_ids: ['e1'],
            sub_segments: [],
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
        },
    } as any;

    updateExhaustion(state, []);

    assert.ok((state.political.war_exhaustion?.RBiH ?? 0) >= 2);
    assert.ok((state.political.war_exhaustion?.RS ?? 0) >= 2);
    assert.strictEqual(state.political.war_exhaustion?.HRHB, 0);
});

test('updateExhaustion does nothing when meta.phase is peace', () => {
    const state = minimalPhaseIIState();
    state.meta.phase = 'war';
    state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    updateExhaustion(state, []);
    assert.strictEqual(state.political.war_exhaustion!['RBiH'], 0);
    assert.strictEqual(state.political.war_exhaustion!['RS'], 0);
});
