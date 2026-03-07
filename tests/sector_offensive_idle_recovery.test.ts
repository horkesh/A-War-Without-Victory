import { describe, expect, it } from 'vitest';
import { updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    edgeIds: string[],
    friendlyOsids: string[],
    enemyOsids: string[]
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [],
        edge_ids: edgeIds,
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: edgeIds,
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            length_edges: edgeIds.length,
        }],
        length_edges: edgeIds.length,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
    };
}

function makeBrigade(id: string, locationOsid: string): FormationState {
    return {
        id,
        faction: 'RS',
        corps_id: 'rs_corps',
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
        tags: [],
    };
}

describe('sector offensive idle recovery', () => {
    it('moves a zero-eligibility execution operation into recovery on its first idle turn', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 9, phase: 'war', seed: 'idle-recovery' } as any,
            formations: {
                rs_corps: {
                    id: 'rs_corps',
                    faction: 'RS',
                    name: 'Corps',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'corps',
                    personnel: 50,
                    cohesion: 80,
                    hq_sid: 'S1',
                    tags: [],
                },
                b1: makeBrigade('b1', 'op:rear:staging'),
                b2: makeBrigade('b2', 'op:rear:staging'),
            },
            political_controllers: {
                'op:target:objective': 'RBiH',
                'op:rear:staging': 'RS',
            },
            corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:front:approach'], ['op:target:objective']),
            },
            corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 2,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operation: {
                        name: 'Stalled Attack',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 8,
                        phase_started_turn: 8,
                        participating_brigades: ['b1', 'b2'],
                        objectives: ['op:target:objective'],
                        current_objective_index: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        sector_id: 'rs_sector',
                    },
                },
            },
        } as unknown as GameState;

        updateSectorOffensiveResults(state);

        const op = state.corps_command?.rs_corps?.active_operation;
        expect(op?.phase).toBe('recovery');
        expect(op?.recovery_reason).toBe('no_logged_attempt');
        expect(op?.movement_only_execution_turns).toBe(1);
    });
});
