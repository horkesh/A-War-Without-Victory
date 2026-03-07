import { describe, expect, it } from 'vitest';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeBrigade(id: string, faction: FactionId, corpsId: string, locationOsid: string): FormationState {
    return {
        id,
        faction,
        corps_id: corpsId,
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 70,
        hq_sid: 'S1',
        location_osid: locationOsid,
        posture: 'hold',
        tags: []
    };
}

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'op-tempo-test', phase: 'war', supply_reserves_enabled: true } as any,
        factions: [
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            'rs-corps-1': {
                id: 'rs-corps-1', faction: 'RS', name: 'Corps', created_turn: 1, status: 'active',
                assignment: null, kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: []
            },
            'rs-brig-1': makeBrigade('rs-brig-1', 'RS', 'rs-corps-1', 'op:test:staging'),
            'rbih-brig-1': makeBrigade('rbih-brig-1', 'RBiH', 'rbih-corps-1', 'op:test:objective'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { 'op:test:objective': 'RBiH' },
        heavy_munitions_reserve: { RS: 5, RBiH: 0, HRHB: 0 },
        general_supply_reserve: { RS: 10, RBiH: 10, HRHB: 10 },
        corps_command: {
            'rs-corps-1': {
                command_span: 5,
                subordinate_count: 1,
                og_slots: 1,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'offensive',
                active_operation: {
                    name: 'Test',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 8,
                    phase_started_turn: 8,
                    participating_brigades: ['rs-brig-1'],
                    objectives: ['op:test:objective'],
                    current_objective_index: 0,
                    planning_duration: 4,
                    staging_osid: 'op:test:staging',
                    force_launch: true,
                    tempo: 'all_out',
                    artillery_preparation: true,
                    sector_id: 'sector:rs-corps-1',
                }
            }
        }
    } as GameState;
}

describe('advanceSectorOffensives', () => {
    it('force launch triggers execution, cohesion penalty, and artillery prep', () => {
        const state = makeState();

        advanceSectorOffensives(state, null);

        const op = state.corps_command?.['rs-corps-1']?.active_operation;
        expect(op?.phase).toBe('execution');
        expect(state.formations['rs-brig-1'].cohesion).toBe(55);
        expect(state.formations['rbih-brig-1'].dig_in_progress).toBe(0);
        expect(state.formations['rbih-brig-1'].cohesion).toBe(60);
        expect(state.heavy_munitions_reserve?.RS).toBe(3);
    });

    it('all-out tempo applies extra execution cohesion cost each turn', () => {
        const state = makeState();
        advanceSectorOffensives(state, null);
        state.meta.turn = 11;

        advanceSectorOffensives(state, null);

        expect(state.formations['rs-brig-1'].cohesion).toBe(54);
    });
});
