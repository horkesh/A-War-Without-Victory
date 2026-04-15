/**
 * Phase F Step 2: Displacement trigger conditions tests.
 * - Trigger evaluator returns bounded deltas only for front-active settlements when phase_ii.
 * - Deterministic: same state + edges => same deltas.
 * - No triggers in phase_0 / peace phase.
 */

import { expect, test } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { evaluateDisplacementTriggers, PHASE_F_MAX_DELTA_PER_TURN } from '../src/sim/displacement_pipeline/displacement_triggers.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(controllers: Record<string, string> = { S1: 'RBiH', S2: 'RS' }): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 20,
            seed: 'pf-trig',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
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
    political_controllers: controllers
  } as any,
        displacement: {} as any
    };
}

test('evaluateDisplacementTriggers: peace returns empty deltas', () => {
    const state = minimalPhaseIIState() as GameState;
    state.meta!.phase = 'peace';
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas, report } = evaluateDisplacementTriggers(state, edges);
    expect(Object.keys(deltas)).toEqual([]);
    expect(report.triggered_settlements.length).toBe(0);
});

test('evaluateDisplacementTriggers: war phase + opposing control yields bounded deltas for front-active settlements', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas, report } = evaluateDisplacementTriggers(state, edges);
    expect(Object.keys(deltas).length >= 1).toBeTruthy();
    for (const [sid, val] of Object.entries(deltas)) {
        expect(val > 0 && val <= PHASE_F_MAX_DELTA_PER_TURN).toBeTruthy();
    }
    expect(report.reasons['S1']?.includes('front_active') ?? report.reasons['S2']?.includes('front_active')).toBeTruthy();
});

test('evaluateDisplacementTriggers: same control on both ends yields no front-active edges', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RBiH' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const { deltas } = evaluateDisplacementTriggers(state, edges);
    expect(Object.keys(deltas)).toEqual([]);
});

test('evaluateDisplacementTriggers: deterministic re-run identical', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const r1 = evaluateDisplacementTriggers(state, edges);
    const r2 = evaluateDisplacementTriggers(state, edges);
    expect(r1.deltas).toEqual(r2.deltas);
    expect(r1.report.triggered_settlements.sort()).toEqual(r2.report.triggered_settlements.sort());
});

test('evaluateDisplacementTriggers: prefers sector-owned edge scope when live sector truth exists', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS', S3: 'RBiH', S4: 'RS' });
    state.military.corps_front_sectors = {
        'sector:rbih': {
            sector_id: 'sector:rbih',
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: ['S1__S2'],
            sub_segments: [],
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
        },
    } as any;

    const edges: EdgeRecord[] = [
        { a: 'S1', b: 'S2' },
        { a: 'S3', b: 'S4' },
    ];

    const { deltas, report } = evaluateDisplacementTriggers(state, edges);

    expect(Object.keys(deltas).sort()).toEqual(['S1', 'S2']);
    expect(report.pressure_eligible_size).toBe(1);
    expect(report.front_active_set_size).toBe(2);
    expect(report.displacement_trigger_eligible_size).toBe(2);
});

test('evaluateDisplacementTriggers: matches live sector OSID edges against canonical graph edges via operational mapping', () => {
    const state = minimalPhaseIIState({ 'op:s1': 'RBiH', 'op:s2': 'RS', 'op:s3': 'RBiH', 'op:s4': 'RS' });
    state.military.corps_front_sectors = {
        'sector:rbih': {
            sector_id: 'sector:rbih',
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: ['op:s1__op:s2'],
            sub_segments: [],
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
        },
    } as any;

    const edges: EdgeRecord[] = [
        { a: 'S1', b: 'S2' },
        { a: 'S3', b: 'S4' },
    ];

    const { deltas, report } = evaluateDisplacementTriggers(
        state,
        edges,
        { S1: 'op:s1', S2: 'op:s2', S3: 'op:s3', S4: 'op:s4' }
    );

    expect(Object.keys(deltas).sort()).toEqual(['S1', 'S2']);
    expect(report.pressure_eligible_size).toBe(1);
    expect(report.front_active_set_size).toBe(2);
    expect(report.displacement_trigger_eligible_size).toBe(2);
});
