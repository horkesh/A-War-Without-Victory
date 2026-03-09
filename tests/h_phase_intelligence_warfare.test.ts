import { describe, expect, it } from 'vitest';
import { deriveSectorIntel } from '../src/sim/combat/sector_intel.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { runCohesionDrift } from '../src/sim/combat/cohesion_drift.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: string,
    edgeIds: string[],
    friendlyOsids: string[],
    enemyOsids: string[]
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId as any,
        faction: faction as any,
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

function makeBrigade(id: string, faction: 'RS' | 'RBiH', corpsId: string, locationOsid: string, cohesion = 60): FormationState {
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
        cohesion,
        hq_sid: 'S1',
        location_osid: locationOsid,
        posture: 'hold',
        tags: [],
    };
}

describe('H phase intelligence warfare', () => {
    it('feint operations produce offensive signs in enemy sector intel', () => {
        const state = {
  meta: { turn: 5, phase: 'war' },
  military: {
    formations: {},
    corps_front_sectors: {
                friendly: makeSector('friendly', 'rbih_corps', 'RBiH', ['e1'], ['op:rbih:a'], ['op:rs:b']),
                enemy: makeSector('enemy', 'rs_corps', 'RS', ['e1'], ['op:rs:b'], ['op:rbih:a']),
            },
    corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operation: {
                        name: 'Maskirovka',
                        type: 'feint',
                        phase: 'planning',
                        started_turn: 4,
                        phase_started_turn: 4,
                        participating_brigades: [],
                        objectives: ['op:rbih:a'],
                        current_objective_index: 0,
                    },
                },
            },
    sector_intel: {
                friendly: [{
                    enemy_sector_id: 'enemy',
                    enemy_faction: 'RS',
                    enemy_corps_id: 'rs_corps',
                    front_edge_count: 1,
                    strength_category: 'moderate',
                    posture_observed: 'defensive',
                    offensive_signs: false,
                    confidence: 0.5,
                    turns_in_contact: 3,
                    visible_brigade_ids: [],
                    last_updated_turn: 4,
                }],
            }
  } as any,
  political: {
    political_controllers: {}
  } as any,
} as unknown as GameState;

        deriveSectorIntel(state, 5);

        expect(state.military.sector_intel?.friendly?.[0]?.offensive_signs).toBe(true);
        expect(state.military.sector_intel?.friendly?.[0]?.posture_observed).toBe('offensive_prep');
    });

    it('probe operations clamp to two participating brigades and one-turn planning', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'probe-test', phase: 'war', supply_reserves_enabled: true } as any,
  factions: [
                { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            ],
  military: {
    formations: {
                rs_corps: { id: 'rs_corps', faction: 'RS', name: 'Corps', created_turn: 1, status: 'active', assignment: null, kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: [] },
                b1: makeBrigade('b1', 'RS', 'rs_corps', 'op:test:staging'),
                b2: makeBrigade('b2', 'RS', 'rs_corps', 'op:test:staging'),
                b3: makeBrigade('b3', 'RS', 'rs_corps', 'op:test:staging'),
            },
    corps_front_sectors: {
                rs_sector: makeSector('rs_sector', 'rs_corps', 'RS', ['e1'], ['op:test:staging'], ['op:test:objective']),
            },
    general_supply_reserve: { RS: 10, RBiH: 10, HRHB: 10 },
    heavy_munitions_reserve: { RS: 10, RBiH: 0, HRHB: 0 },
    corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 3,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operation: {
                        name: 'Probe',
                        type: 'probe',
                        phase: 'planning',
                        started_turn: 9,
                        phase_started_turn: 9,
                        participating_brigades: ['b1', 'b2', 'b3'],
                        objectives: ['op:test:objective'],
                        current_objective_index: 0,
                        planning_duration: 4,
                        staging_osid: 'op:test:staging',
                        sector_id: 'rs_sector',
                    },
                },
            }
  } as any,
  political: {
    political_controllers: { 'op:test:objective': 'RBiH' }
  } as any,
} as unknown as GameState;

        advanceSectorOffensives(state, null);

        const op = state.military.corps_command?.rs_corps?.active_operation;
        expect(op?.participating_brigades).toEqual(['b1', 'b2']);
        expect(op?.planning_duration).toBe(1);
        expect(op?.phase).toBe('execution');
    });

    it('opsec halves positive cohesion drift for formations in the marked sector', () => {
        const state = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, phase: 'war', seed: 'opsec-cohesion' } as any,
  factions: [
                { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            ],
  military: {
    formations: {
                rbih_1: makeBrigade('rbih_1', 'RBiH', 'rbih_corps', 'op:rbih:a', 60),
            },
    militia_pools: {},
    corps_front_sectors: {
                secure_sector: makeSector('secure_sector', 'rbih_corps', 'RBiH', ['e1'], ['op:rbih:a'], ['op:rs:b']),
            },
    opsec_sectors: ['secure_sector']
  } as any,
} as unknown as GameState;

        const report = runCohesionDrift(state, []);

        expect(report.formations_updated).toBe(1);
        expect(state.military.formations.rbih_1.cohesion).toBe(60.2);
    });
});
