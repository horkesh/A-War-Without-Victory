import { describe, expect, it } from 'vitest';

import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeStateWithOperation(operation: Record<string, unknown>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 40, phase: 'war', seed: 'operation-completion-truth' } as any,
        factions: [{ id: 'RS' }],
        formations: {
            corps_1: {
                id: 'corps_1',
                faction: 'RS',
                name: '1st Corps',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'corps',
                personnel: 0,
                cohesion: 80,
                hq_sid: 'S1',
                tags: [],
            },
            b1: {
                id: 'b1',
                faction: 'RS',
                corps_id: 'corps_1',
                name: 'Brigade 1',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1200,
                cohesion: 70,
                hq_sid: 'S1',
                location_osid: 'op:front:staging',
                posture: 'defend',
                tags: [],
            },
        } as any,
        military: {
            formations: {
                corps_1: {
                    id: 'corps_1',
                    faction: 'RS',
                    name: '1st Corps',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'corps',
                    personnel: 0,
                    cohesion: 80,
                    hq_sid: 'S1',
                    tags: [],
                },
                b1: {
                    id: 'b1',
                    faction: 'RS',
                    corps_id: 'corps_1',
                    name: 'Brigade 1',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    personnel: 1200,
                    cohesion: 70,
                    hq_sid: 'S1',
                    location_osid: 'op:front:staging',
                    posture: 'defend',
                    tags: [],
                },
            },
            corps_command: {
                corps_1: {
                    command_span: 3,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [operation],
                },
            },
            corps_front_sectors: {
                'sector:corps_1:0': {
                    sector_id: 'sector:corps_1:0',
                    corps_id: 'corps_1',
                    faction: 'RS',
                    opposing_factions: ['RBiH'],
                    edge_ids: ['edge:1'],
                    sub_segments: [{
                        sub_segment_id: 'subseg:sector:corps_1:0:0',
                        edge_ids: ['edge:1'],
                        friendly_osids: ['op:front:staging'],
                        enemy_osids: ['op:enemy:objective'],
                        primary_brigade_ids: [],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:front:staging'],
                    assigned_brigade_ids: ['b1'],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'attack',
                    stance_source: 'bot',
                },
            },
        } as any,
        political: {
            political_controllers: {
                'op:front:staging': 'RS',
                'op:enemy:objective': 'RBiH',
            },
            control_events: [],
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('operation completion truth', () => {
    it('aborts a probe that enters execution and immediately spends the turn fully idle', () => {
        const state = makeStateWithOperation({
            name: 'probe_corps_1_t40',
            type: 'probe',
            phase: 'execution',
            started_turn: 40,
            phase_started_turn: 40,
            participating_brigades: ['b1'],
            objectives: ['op:enemy:objective'],
            objective_capture_count: 0,
            attack_attempt_count: 0,
            sector_id: 'sector:corps_1:0',
            axes: [{
                axis_id: 'probe_corps_1_t40',
                name: 'Probe',
                assigned_brigades: ['b1'],
                objectives: ['op:enemy:objective'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.corps_1?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('no_logged_attempt');
    });

    it('does not mark a multi-axis probe completed when failures merely skipped past the objective list', () => {
        const state = makeStateWithOperation({
            name: 'probe_corps_1_t39',
            type: 'probe',
            phase: 'execution',
            started_turn: 39,
            phase_started_turn: 39,
            participating_brigades: ['b1'],
            objectives: ['op:enemy:objective'],
            objective_capture_count: 0,
            attack_attempt_count: 0,
            sector_id: 'sector:corps_1:0',
            axes: [{
                axis_id: 'probe_corps_1_t39',
                name: 'Probe',
                assigned_brigades: ['b1'],
                objectives: ['op:enemy:objective'],
                current_objective_index: 1,
                status: 'complete',
                failure_count: 3,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 3,
                last_result: 'stalemate',
            }],
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.corps_1?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('no_logged_attempt');
    });

    it('does not mark a legacy operation completed when failures merely skipped past the objective list', () => {
        const state = makeStateWithOperation({
            name: 'Operacija Test',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 39,
            phase_started_turn: 39,
            participating_brigades: ['b1'],
            objectives: ['op:enemy:objective'],
            current_objective_index: 1,
            objective_capture_count: 0,
            attack_attempt_count: 0,
            failure_count: 3,
            consecutive_failures_on_current: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 3,
            sector_id: 'sector:corps_1:0',
            last_result: 'stalemate',
        });

        updateSectorOffensiveResults(state);

        const op = state.military.corps_command?.corps_1?.active_operations[0];
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('no_logged_attempt');
    });
});
