import { describe, expect, it } from 'vitest';
import type { CorpsOperation, FormationState, GameState, OperationAxis } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { removeFromActiveOperation } from '../src/sim/combat/brigade_dissolution.js';
import { createLinkedPreparationProbe } from '../src/sim/combat/operation_preparation.js';

const CORPS = 'test_corps';
const TARGET = 'op:test:target';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: 'HRHB',
        kind: 'brigade',
        name: id,
        status: 'active',
        personnel: 1_000,
        cohesion: 80,
        morale: 80,
        fatigue: 0,
        corps_id: CORPS,
        location_osid: 'op:test:approach',
        ...overrides,
    } as FormationState;
}

function axis(): OperationAxis {
    return {
        axis_id: 'test_axis',
        name: 'Test axis',
        assigned_brigades: ['b1'],
        objectives: ['op:test:target'],
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    };
}

function parentOperation(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Renamed parent operation',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 10,
        phase_started_turn: 10,
        participating_brigades: ['b1', 'b2', 'b3'],
        sector_id: 'sector:test',
        objectives: [TARGET],
        planning_duration: 4,
        minimum_viable_participants: 1,
        preparation_probe_delivery: 'subordinate',
        preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 1,
        preparation_max_turns: 4,
        axes: [{
            ...axis(),
            axis_id: 'parent_axis',
            assigned_brigades: ['b1', 'b2', 'b3'],
        }],
        active_probe: {
            target_osid: TARGET,
            brigade_ids: ['b2', 'b1'],
            started_turn: 12,
            resolved: false,
        },
        ...overrides,
    };
}

function stateWithParent(parent = parentOperation()): GameState {
    return {
        schema_version: 34,
        meta: { turn: 12, phase: 'war', player_faction: 'HRHB', seed: '1' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }] as GameState['factions'],
        military: {
            formations: {
                [CORPS]: { ...brigade(CORPS), kind: 'corps', corps_id: undefined },
                b1: brigade('b1'),
                b2: brigade('b2'),
                b3: brigade('b3'),
            },
            corps_command: {
                [CORPS]: {
                    command_span: 5,
                    subordinate_count: 3,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 10,
                    stance: 'offensive',
                    active_operations: [parent],
                },
            },
            sector_intel: {
                'sector:test': [{
                    enemy_sector_id: 'sector:enemy',
                    enemy_faction: 'RS',
                    enemy_corps_id: 'enemy_corps',
                    front_edge_count: 1,
                    turns_in_contact: 1,
                    strength_category: 'unknown',
                    posture_observed: 'unknown',
                    offensive_signs: false,
                    visible_brigade_ids: [],
                    confidence: 0.2,
                    last_updated_turn: 11,
                    sources: ['passive_contact'],
                }],
            },
            corps_front_sectors: {
                'sector:test': {
                    sector_id: 'sector:test', corps_id: CORPS, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1,
                    territory_osids: ['op:test:approach'], assigned_brigade_ids: ['b1', 'b2', 'b3'],
                    reserve_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 1,
                    sector_stance: 'active_defense', stance_source: 'bot',
                },
                'sector:enemy': {
                    sector_id: 'sector:enemy', corps_id: 'enemy_corps', faction: 'RS', opposing_factions: ['HRHB'],
                    edge_ids: ['edge:test'], sub_segments: [], length_edges: 1,
                    territory_osids: [TARGET], assigned_brigade_ids: [], reserve_brigade_ids: [],
                    density: 1, threat_ratio: 1, defensive_power: 1, sector_stance: 'defend', stance_source: 'bot',
                },
            },
            war_front_edges_osid: [{
                edge_id: 'edge:test', a: 'op:test:approach', b: TARGET,
                side_a: 'HRHB', side_b: 'RS',
            }],
        } as unknown as GameState['military'],
        political: { political_controllers: { [TARGET]: 'RS', 'op:test:approach': 'HRHB' } } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

describe('preparation probe participant-loss validation', () => {
    it('keeps a linked subordinate probe valid and serializable after a participant leaves the operation', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;

        expect(child).not.toBeNull();
        expect(child.participating_brigades).toEqual(['b1', 'b2']);
        expect(validateGameStateShape(state)).toEqual({ ok: true });

        removeFromActiveOperation(state, 'b2', CORPS);

        expect(child.participating_brigades).toEqual(['b1']);
        expect(child.preparation_probe_link!.source_axes.map((source) => source.brigade_id))
            .toEqual(['b1', 'b2']);
        expect(validateGameStateShape(state)).toEqual({ ok: true });
        expect(() => serializeGameState(state)).not.toThrow();
    });

    it('still rejects a participant that is not present in source_axes', () => {
        const parent = parentOperation();
        const state = stateWithParent(parent);
        const child = createLinkedPreparationProbe(state, CORPS, parent)!;

        removeFromActiveOperation(state, 'b2', CORPS);
        child.preparation_probe_link!.source_axes = [{ brigade_id: 'b2', axis_id: 'parent_axis' }];

        const result = validateGameStateShape(state);

        expect(result.ok).toBe(false);
        expect(result.ok ? [] : result.errors).toContain(
            `military.corps_command.${CORPS}.active_operations[1].preparation_probe_link.source_axes brigade ids must include every child participant`,
        );
    });
});
