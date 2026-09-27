import { describe, expect, it } from 'vitest';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';
import { tickPreparation } from '../../src/sim/combat/operation_preparation.js';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsOperation,
    type FormationId,
    type GameState,
    type MilitaryState,
} from '../../src/state/game_state.js';
import type { CommanderOutput, CommanderState, ZoneId } from '../../src/sim/combat/commander/commander_state.js';
import { makeCommanderMinimalState } from '../_helpers/commander.js';

const CORPS_ID = 'vrs_2nd_krajina' as FormationId;

function operation(name = 'Operacija Bunar', patch: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 25,
        phase_started_turn: 25,
        participating_brigades: ['b1'],
        objectives: ['op:test:target'],
        sector_id: `sector:${CORPS_ID}:0`,
        ...patch,
    } as CorpsOperation;
}

function state(options: {
    autonomyLevel?: number;
    activeOperations?: CorpsOperation[];
    officers?: Array<{ id: string; competence: number; aggressiveness: number; status?: 'reserve' | 'active'; assignedOperation?: string }>;
} = {}): GameState {
    const officers = options.officers ?? [{ id: 'home_4_4', competence: 4, aggressiveness: 4 }];
    const military: MilitaryState = {
        formations: {
            [CORPS_ID]: {
                id: CORPS_ID, name: '2nd Krajina Corps', faction: 'RS',
                kind: 'corps', status: 'active', personnel: 0, morale: 80,
                cohesion: 50, experience: 40, created_turn: 0, assignment: null,
            },
            b1: {
                id: 'b1', name: 'Brigade 1', faction: 'RS', corps_id: CORPS_ID,
                kind: 'brigade', status: 'active', personnel: 1000, morale: 80,
                cohesion: 50, experience: 40, location_osid: 'op:test:approach',
                created_turn: 0, assignment: null,
            },
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        theatres: {},
        army_theatre_assignment: {},
        corps_front_sectors: {},
        sector_intel: {},
        army_co_decision_traces: {},
        army_corps_directives_by_faction: {},
        fired_event_ids: [],
        event_decision_log: [],
        event_readiness: {},
        event_fire_counts: {},
        event_last_fired_turn: {},
        event_flags: {},
        enabled_event_ids: [],
        phantoms_spawned: [],
        brigade_movement_orders: {},
        corps_command: {
            [CORPS_ID]: {
                command_span: 5,
                subordinate_count: 1,
                og_slots: 0,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'offensive',
                active_operations: options.activeOperations ?? [],
            },
        },
        named_officer_data: officers.map((entry) => ({
            id: entry.id,
            name: entry.id,
            faction: 'RS',
            rank: 'corps_commander',
            competence: entry.competence,
            aggressiveness: entry.aggressiveness,
            defensive_skill: 3,
            political_reliability: 3,
            home_corps_id: CORPS_ID,
            available_from_turn: 0,
            origin: 'jna',
            casualty_vulnerability: 0,
            can_improve: false,
            improvement_rate: 0,
            pool_tier: 'tier_a',
        })),
        named_officers: Object.fromEntries(officers.map((entry) => [entry.id, {
            officer_id: entry.id,
            status: entry.status ?? 'reserve',
            assigned_operation: entry.assignedOperation,
            assigned_corps_id: null,
            turns_in_command: 0,
            battles: 0,
            victories: 0,
            effective_competence_penalty: 0,
            penalty_turns_remaining: 0,
            acting_commander: false,
        }])),
    };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 25, phase: 'war', seed: 'commander-assignment', autonomy_level: options.autonomyLevel ?? 0 } as GameState['meta'],
        factions: [{ id: 'RS' }] as GameState['factions'],
        military,
        political: {
            political_controllers: {},
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_state: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            displacement_event_log: [],
            sustainability_state: {},
            war_displacement_initiated: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            civilian_casualties: {},
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            displacement_flows_by_osid: {},
        },
    };
}

function output(candidate: CorpsOperation, currentPlan: CommanderState['current_plan'] = null): CommanderOutput {
    return {
        directive: {
            assigned_front_ids: [],
            offensive_targets: [],
            hold_osids: [],
            avoid_osids: [],
            max_attackers_per_target: 1,
            reserve_fraction: 0,
            min_attack_outcome: 'stalemate',
            aggression_modifier: 0,
        },
        operations: [candidate],
        sector_stances: [],
        updated_state: makeCommanderMinimalState({
            current_plan: currentPlan,
            last_assessment_turn: 25,
            last_plan_action: 'none',
            last_plan_reason: 'test',
        }),
        reinforcement_requests: [], prepositioning_orders: [], plan_updates: [], garrison_locks: [],
    };
}

describe('commander operation commander assignment', () => {
    it('assigns a legal reserve commander to a newly admitted named operation and preparation uses 4/4 timing', () => {
        const game = state();
        applyCommanderOutput(game, CORPS_ID, output(operation()));

        const admitted = game.military.corps_command![CORPS_ID]!.active_operations[0]!;
        expect(admitted.commander_officer_id).toBe('home_4_4');
        expect(game.military.named_officers!['home_4_4']!.status).toBe('active');
        expect(game.military.named_officers!['home_4_4']!.assigned_operation).toBe('Operacija Bunar');

        const preparation = Array.from({ length: 4 }, () => (
            tickPreparation(game, admitted, CORPS_ID, 'RS', 1)
        ));
        expect(admitted.preparation_max_turns).toBe(4);
        expect(preparation.slice(0, 3).every((tick) => !tick.ready)).toBe(true);
        expect(preparation[3]!.ready).toBe(true);
    });

    it('preserves an explicit operation commander without consuming another reserve officer', () => {
        const game = state({ officers: [
            { id: 'explicit', competence: 3, aggressiveness: 3, status: 'active', assignedOperation: 'Named operation' },
            { id: 'reserve', competence: 4, aggressiveness: 4 },
        ] });
        applyCommanderOutput(game, CORPS_ID, output(operation('Named operation', { commander_officer_id: 'explicit' })));

        expect(game.military.corps_command![CORPS_ID]!.active_operations[0]!.commander_officer_id).toBe('explicit');
        expect(game.military.named_officers!['reserve']!.status).toBe('reserve');
    });

    it.each(['probe', 'feint'] as const)('assigns commanders to newly admitted %s operations', (type) => {
        const game = state();
        applyCommanderOutput(game, CORPS_ID, output(operation(`${type} operation`, { type })));

        expect(game.military.corps_command![CORPS_ID]!.active_operations[0]!.commander_officer_id).toBe('home_4_4');
        expect(game.military.named_officers!['home_4_4']!.assigned_operation).toBe(`${type} operation`);
    });

    it('does not allocate an officer when a conflicting operation rejects the candidate', () => {
        const blocker = operation('Existing operation', { phase: 'execution' });
        const game = state({ activeOperations: [blocker] });
        applyCommanderOutput(game, CORPS_ID, output(operation('Conflicting operation')));

        expect(game.military.corps_command![CORPS_ID]!.active_operations).toEqual([blocker]);
        expect(game.military.named_officers!['home_4_4']!.status).toBe('reserve');
    });

    it('does not allocate an officer while Level-1 approval is absent', () => {
        const game = state({ autonomyLevel: 1 });
        applyCommanderOutput(game, CORPS_ID, output(operation(), {
            plan_id: 'p1',
            objective_description: 'Test operation',
            target_osids: ['op:test:target'],
            required_brigades: 1,
            assigned_brigades: ['b1'],
            staging_zone: 'op:test:approach' as ZoneId,
            status: 'executing',
            created_turn: 25,
            target_ready_turn: 25,
            concentration_progress: 1,
            viability_score: 1,
            source: 'reactive',
        }));

        expect(game.military.corps_command![CORPS_ID]!.active_operations).toHaveLength(0);
        expect(game.military.named_officers!['home_4_4']!.status).toBe('reserve');
    });

    it('does not allocate a second officer on a same-identity retry', () => {
        const existing = operation('Retried operation', { commander_officer_id: 'first' });
        const game = state({
            activeOperations: [existing],
            officers: [
                { id: 'first', competence: 3, aggressiveness: 3, status: 'active', assignedOperation: 'Retried operation' },
                { id: 'second', competence: 4, aggressiveness: 4 },
            ],
        });
        applyCommanderOutput(game, CORPS_ID, output(operation('Retried operation')));

        expect(game.military.corps_command![CORPS_ID]!.active_operations).toEqual([existing]);
        expect(game.military.named_officers!['second']!.status).toBe('reserve');
    });

    it('retains default preparation timing when no legal reserve commander exists', () => {
        const game = state({ officers: [{ id: 'busy', competence: 4, aggressiveness: 4, status: 'active' }] });
        applyCommanderOutput(game, CORPS_ID, output(operation()));

        const admitted = game.military.corps_command![CORPS_ID]!.active_operations[0]!;
        expect(admitted.commander_officer_id).toBeUndefined();
        const firstFour = Array.from({ length: 4 }, () => (
            tickPreparation(game, admitted, CORPS_ID, 'RS', 1)
        ));
        expect(admitted.preparation_max_turns).toBe(5);
        expect(firstFour.every((tick) => !tick.ready)).toBe(true);
        expect(tickPreparation(game, admitted, CORPS_ID, 'RS', 1).ready).toBe(true);
    });
});
