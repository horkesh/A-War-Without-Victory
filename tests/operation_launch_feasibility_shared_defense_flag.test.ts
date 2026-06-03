import { describe, expect, it, vi } from 'vitest';
import type { CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';

function makeBrigade(overrides: Partial<FormationState> & { id: string; faction: string }): FormationState {
    const { id, faction, ...rest } = overrides;
    return {
        id,
        faction,
        kind: 'brigade',
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        personnel: 1800,
        cohesion: 80,
        morale: 70,
        experience: 0.5,
        posture: 'defend',
        location_osid: 'op:test:front',
        corps_id: faction === 'RS' ? 'rs_corps' : 'rbih_corps',
        ...rest,
    } as FormationState;
}

function makeSharedDefenseState(): GameState {
    const formations: Record<string, FormationState> = {
        rs_atk_a: makeBrigade({
            id: 'rs_atk_a',
            faction: 'RS',
            location_osid: 'op:test:front',
            posture: 'attack',
            personnel: 900,
        }),
        rs_atk_b: makeBrigade({
            id: 'rs_atk_b',
            faction: 'RS',
            location_osid: 'op:test:front',
            posture: 'attack',
            personnel: 900,
        }),
        rbih_def_a: makeBrigade({
            id: 'rbih_def_a',
            faction: 'RBiH',
            location_osid: 'op:test:objective',
            posture: 'defend',
            personnel: 100,
            cohesion: 55,
            morale: 50,
        }),
        rbih_reserve_a: makeBrigade({
            id: 'rbih_reserve_a',
            faction: 'RBiH',
            location_osid: 'op:test:objective',
            posture: 'dig_in',
            personnel: 9000,
            cohesion: 90,
            morale: 85,
            entrenchment_turns: 6,
        }),
        rbih_rear_a: makeBrigade({
            id: 'rbih_rear_a',
            faction: 'RBiH',
            location_osid: 'op:test:objective',
            posture: 'defend',
            personnel: 8000,
            cohesion: 85,
            morale: 80,
            entrenchment_turns: 4,
        }),
    };
    return {
        meta: { turn: 12, phase: 'war' },
        political: {
            political_controllers: {
                'op:test:front': 'RS',
                'op:test:objective': 'RBiH',
            },
        },
        military: {
            formations,
            corps_command: {
                rs_corps: { stance: 'offensive', active_operations: [] },
                rbih_corps: { stance: 'defensive', active_operations: [] },
            },
            corps_front_sectors: {
                rs_sector: {
                    sector_id: 'rs_sector',
                    corps_id: 'rs_corps',
                    faction: 'RS',
                    opposing_factions: ['RBiH'],
                    edge_ids: [],
                    sub_segments: [{
                        id: 'rs_sub',
                        edge_ids: [],
                        friendly_osids: ['op:test:front'],
                        enemy_osids: ['op:test:objective'],
                        coverage_length: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:test:front'],
                    assigned_brigade_ids: ['rs_atk_a', 'rs_atk_b'],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 1,
                    sector_stance: 'attack',
                    stance_source: 'bot',
                },
                rbih_sector: {
                    sector_id: 'rbih_sector',
                    corps_id: 'rbih_corps',
                    faction: 'RBiH',
                    opposing_factions: ['RS'],
                    edge_ids: [],
                    sub_segments: [{
                        id: 'rbih_sub',
                        edge_ids: [],
                        friendly_osids: ['op:test:objective'],
                        enemy_osids: ['op:test:front'],
                        coverage_length: 1,
                    }],
                    length_edges: 1,
                    territory_osids: ['op:test:objective'],
                    assigned_brigade_ids: ['rbih_def_a'],
                    reserve_brigade_ids: ['rbih_reserve_a'],
                    rear_brigade_ids: ['rbih_rear_a'],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 1,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            sector_intel: {
                rs_sector: [{
                    enemy_sector_id: 'rbih_sector',
                    enemy_faction: 'RBiH',
                    enemy_corps_id: 'rbih_corps',
                    front_edge_count: 1,
                    strength_category: 'moderate',
                    posture_observed: 'defensive',
                    offensive_signs: false,
                    confidence: 0.9,
                    turns_in_contact: 4,
                    visible_brigade_ids: [],
                    last_updated_turn: 10,
                }],
            },
        },
    } as unknown as GameState;
}

function makeOperation(): CorpsOperation {
    return {
        name: 'Shared Defense Probe',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 10,
        phase_started_turn: 10,
        participating_brigades: ['rs_atk_a', 'rs_atk_b'],
        sector_id: 'rs_sector',
        objectives: ['op:test:objective'],
        planning_duration: 2,
    } as CorpsOperation;
}

describe('operation launch feasibility with Phase C shared defense enabled', () => {
    it('counts reserve and rear sector defenders before declaring an attack executable', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/standing_og_defense.js', async (importOriginal) => {
            const actual = await importOriginal<typeof import('../src/sim/combat/standing_og_defense.js')>();
            return {
                ...actual,
                ENABLE_SHARED_SECTOR_DEFENSE: true,
            };
        });
        const { evaluateLaunchFeasibility } = await import('../src/sim/combat/sector_offensive_launch_helpers.js');

        const result = evaluateLaunchFeasibility(
            makeSharedDefenseState(),
            ['rs_atk_b', 'rs_atk_a'],
            ['op:test:objective'],
            'RS',
            undefined,
            { 'op:test:objective': 1.0 },
        );

        expect(result.defenderIds).toEqual(['rbih_reserve_a', 'rbih_rear_a', 'rbih_def_a']);
        expect(result.feasible).toBe(false);
        expect(result.blocker).toBe('defender_power_too_high');
        expect(result.defenderPower).toBeGreaterThan(result.attackerPower);
    });

    it('counts reserve and rear sector defenders in operation force-ratio preparation', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/standing_og_defense.js', async (importOriginal) => {
            const actual = await importOriginal<typeof import('../src/sim/combat/standing_og_defense.js')>();
            return {
                ...actual,
                ENABLE_SHARED_SECTOR_DEFENSE: true,
            };
        });
        const { estimateForceRatio } = await import('../src/sim/combat/operation_preparation.js');

        const ratio = estimateForceRatio(
            makeSharedDefenseState(),
            makeOperation(),
            5,
            0.9,
            undefined,
            { 'op:test:objective': 1.0 },
        );

        expect(ratio).toBeLessThan(1.0);
    });
});
