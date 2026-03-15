/**
 * Tests for catastrophic outcome stall (#39).
 *
 * Commanders may order a desperate attack once — they sometimes gamble.
 * But no one sends men to die at the same fortified position three turns running.
 * After 2 consecutive catastrophic outcomes on the same objective, axis stalls.
 */
import { describe, it, expect } from 'vitest';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    friendlyOsids: string[],
    enemyOsids: string[]
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: ['e1'],
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function makeBrigade(
    id: string,
    locationOsid: string,
    opts?: { posture?: string; lastOutcome?: string; lastOsid?: string; lastTurn?: number }
): FormationState {
    const f: any = {
        id,
        faction: 'RBiH',
        corps_id: 'arbih_corps',
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 70,
        hq_sid: 'S1',
        location_osid: locationOsid,
        posture: opts?.posture ?? 'hold',
        tags: [],
    };
    if (opts?.lastOutcome) {
        f.brigade_history = {
            engagements: [{
                turn: opts.lastTurn ?? 10,
                osid: opts.lastOsid ?? 'op:target:obj',
                role: 'attacker',
                outcome: opts.lastOutcome,
                casualties_taken: 500,
                casualties_inflicted: 50,
                enemy_faction: 'RS',
                territory_flipped: false,
                was_concentrated: false,
            }],
            battles_fought: 1,
            battles_as_attacker: 1,
            battles_as_defender: 0,
            victories: 0,
            defeats: 1,
            stalemates: 0,
            total_casualties_taken: 500,
            total_casualties_inflicted: 50,
            total_osids_captured: 0,
            total_osids_lost: 0,
            current_victory_streak: 0,
            longest_victory_streak: 0,
            current_defense_streak: 0,
            longest_defense_streak: 0,
            first_battle_turn: opts.lastTurn ?? 10,
            first_battle_osid: opts.lastOsid ?? 'op:target:obj',
            worst_single_battle_casualties: 500,
            worst_single_battle_turn: opts.lastTurn ?? 10,
            peak_personnel: 1000,
            nadir_personnel: 500,
        };
    }
    return f as FormationState;
}

function makeState(overrides: {
    brigades: Record<string, FormationState>;
    axes: any[];
    turn?: number;
}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: overrides.turn ?? 10, phase: 'war', seed: 'catastrophic-test' } as any,
        military: {
            formations: {
                arbih_corps: {
                    id: 'arbih_corps', faction: 'RBiH', name: 'Corps',
                    created_turn: 1, status: 'active', assignment: null,
                    kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: [],
                },
                ...overrides.brigades,
            },
            corps_front_sectors: {
                s1: makeSector('s1', 'arbih_corps', 'RBiH', ['op:front:approach'], ['op:target:obj']),
            },
            corps_command: {
                arbih_corps: {
                    command_span: 5, subordinate_count: 2, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive',
                    active_operation: {
                        name: 'Doomed Assault',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 5,
                        phase_started_turn: 8,
                        participating_brigades: Object.keys(overrides.brigades),
                        sector_id: 's1',
                        axes: overrides.axes,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                    },
                },
            },
        } as any,
        political: {
            political_controllers: {
                'op:target:obj': 'RS',
                'op:front:approach': 'RBiH',
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('catastrophic outcome stall (#39)', () => {
    it('first catastrophic attack does NOT stall the axis', () => {
        const b1 = makeBrigade('b1', 'op:front:approach', {
            posture: 'attack',
            lastOutcome: 'catastrophic',
            lastOsid: 'op:target:obj',
        });
        const state = makeState({
            brigades: { b1 },
            axes: [{
                axis_id: 'a1', name: 'Main', assigned_brigades: ['b1'],
                objectives: ['op:target:obj'], current_objective_index: 0,
                status: 'executing', failure_count: 0,
                consecutive_failures_on_current: 0, momentum: 0,
                attack_attempt_count: 0, objective_capture_count: 0,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            }],
        });

        updateSectorOffensiveResults(state);

        const axis = (state.military.corps_command as any).arbih_corps.active_operation.axes[0];
        expect(axis.status).toBe('executing'); // NOT stalled after first catastrophic
        expect(axis.consecutive_catastrophic_on_current).toBe(1);
        expect(axis.failure_count).toBe(1);
    });

    it('second consecutive catastrophic on same objective STALLS the axis', () => {
        const b1 = makeBrigade('b1', 'op:front:approach', {
            posture: 'attack',
            lastOutcome: 'catastrophic',
            lastOsid: 'op:target:obj',
        });
        const state = makeState({
            brigades: { b1 },
            axes: [{
                axis_id: 'a1', name: 'Main', assigned_brigades: ['b1'],
                objectives: ['op:target:obj'], current_objective_index: 0,
                status: 'executing', failure_count: 1,
                consecutive_failures_on_current: 1, momentum: 0,
                consecutive_catastrophic_on_current: 1, // already 1 from previous turn
                attack_attempt_count: 1, objective_capture_count: 0,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            }],
        });

        updateSectorOffensiveResults(state);

        const axis = (state.military.corps_command as any).arbih_corps.active_operation.axes[0];
        expect(axis.status).toBe('stalled');
        expect(axis.consecutive_catastrophic_on_current).toBe(2);
    });

    it('non-catastrophic outcome resets the counter', () => {
        const b1 = makeBrigade('b1', 'op:front:approach', {
            posture: 'attack',
            lastOutcome: 'repulsed', // bad but not catastrophic
            lastOsid: 'op:target:obj',
        });
        const state = makeState({
            brigades: { b1 },
            axes: [{
                axis_id: 'a1', name: 'Main', assigned_brigades: ['b1'],
                objectives: ['op:target:obj'], current_objective_index: 0,
                status: 'executing', failure_count: 1,
                consecutive_failures_on_current: 1, momentum: 0,
                consecutive_catastrophic_on_current: 1, // was 1, but this turn is repulsed
                attack_attempt_count: 1, objective_capture_count: 0,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            }],
        });

        updateSectorOffensiveResults(state);

        const axis = (state.military.corps_command as any).arbih_corps.active_operation.axes[0];
        expect(axis.status).toBe('executing'); // NOT stalled
        expect(axis.consecutive_catastrophic_on_current).toBe(0); // reset
    });

    it('capture resets the catastrophic counter', () => {
        // Brigade is on the objective, which was just captured
        const b1 = makeBrigade('b1', 'op:front:approach', { posture: 'attack' });
        const state = makeState({
            brigades: { b1 },
            axes: [{
                axis_id: 'a1', name: 'Main', assigned_brigades: ['b1'],
                objectives: ['op:target:obj'], current_objective_index: 0,
                status: 'executing', failure_count: 1,
                consecutive_failures_on_current: 1, momentum: 0,
                consecutive_catastrophic_on_current: 1,
                attack_attempt_count: 2, objective_capture_count: 0,
                movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            }],
        });

        // Simulate capture by changing controller
        (state.political as any).political_controllers['op:target:obj'] = 'RBiH';

        updateSectorOffensiveResults(state);

        const axis = (state.military.corps_command as any).arbih_corps.active_operation.axes[0];
        expect(axis.consecutive_catastrophic_on_current).toBe(0); // reset
        expect(axis.objective_capture_count).toBe(1);
    });
});
