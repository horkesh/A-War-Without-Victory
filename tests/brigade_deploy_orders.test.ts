import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import { processBrigadeMovement } from '../src/sim/phase_ii/brigade_movement.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'deploy-orders-test', phase: 'phase_ii' } as any,
        factions: [{ id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true }] as any,
        formations: {
            b1: {
                id: 'b1',
                faction: 'RBiH',
                name: 'B1',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                hq_sid: 'S1',
            } as any,
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RBiH', S3: 'RBiH' } as any,
        brigade_aor: { S1: 'b1', S2: 'b1', S3: null },
    } as GameState;
}

const EDGES: EdgeRecord[] = [
    { a: 'S1', b: 'S2' },
    { a: 'S2', b: 'S3' },
];

function makeTerrain(by_sid: TerrainScalarsData['by_sid']): TerrainScalarsData {
    return { by_sid };
}

describe('brigade deploy/undeploy staging', () => {
    it('undeploy order contracts AoR and holds brigade in column packing state', () => {
        const state = makeState();
        state.brigade_deploy_orders = { b1: 'undeploy' };

        processBrigadeMovement(state, EDGES);

        expect(state.brigade_aor?.S1).toBe('b1');
        expect(state.brigade_aor?.S2 ?? null).toBeNull();
        expect(state.brigade_movement_state?.b1?.status).toBe('packing');
        expect(state.brigade_movement_state?.b1?.stance).toBe('column');
        expect(state.brigade_movement_state?.b1?.destination_sids).toEqual(['S1']);
        expect(state.brigade_deploy_orders).toBeUndefined();
    });

    it('deploy order transitions column packing to unpacking then deployed on next turn', () => {
        const state = makeState();
        state.brigade_movement_state = {
            b1: { status: 'packing', stance: 'column', destination_sids: ['S1'] },
        };
        state.brigade_deploy_orders = { b1: 'deploy' };

        processBrigadeMovement(state, EDGES);
        expect(state.brigade_movement_state?.b1?.status).toBe('unpacking');
        expect(state.brigade_movement_state?.b1?.stance).toBe('combat');

        processBrigadeMovement(state, EDGES);
        expect(state.brigade_movement_state?.b1).toBeUndefined();
    });

    it('column movement uses composition and terrain/roads costs', () => {
        const roughTerrain = makeTerrain({
            S1: {
                road_access_index: 0.1,
                river_crossing_penalty: 0.8,
                elevation_mean_m: 120,
                elevation_stddev_m: 20,
                slope_index: 0.6,
                terrain_friction_index: 0.7,
            },
            S2: {
                road_access_index: 0.2,
                river_crossing_penalty: 0.8,
                elevation_mean_m: 900,
                elevation_stddev_m: 30,
                slope_index: 0.7,
                terrain_friction_index: 0.8,
            },
            S3: {
                road_access_index: 0.15,
                river_crossing_penalty: 0.7,
                elevation_mean_m: 1600,
                elevation_stddev_m: 35,
                slope_index: 0.75,
                terrain_friction_index: 0.85,
            },
        });

        const flatTerrain = makeTerrain({
            S1: {
                road_access_index: 0.95,
                river_crossing_penalty: 0,
                elevation_mean_m: 150,
                elevation_stddev_m: 5,
                slope_index: 0.05,
                terrain_friction_index: 0.05,
            },
            S2: {
                road_access_index: 0.95,
                river_crossing_penalty: 0,
                elevation_mean_m: 160,
                elevation_stddev_m: 5,
                slope_index: 0.05,
                terrain_friction_index: 0.05,
            },
            S3: {
                road_access_index: 0.95,
                river_crossing_penalty: 0,
                elevation_mean_m: 170,
                elevation_stddev_m: 5,
                slope_index: 0.05,
                terrain_friction_index: 0.05,
            },
        });

        const heavy = makeState();
        (heavy.formations.b1 as any).composition = {
            infantry: 700,
            tanks: 260,
            artillery: 180,
            aa_systems: 70,
            artillery_condition: { max: 100, current: 100 },
            tanks_condition: { max: 100, current: 100 },
            ammo_stock: 100,
            anti_tank: 80,
            air_defense: 75,
            engineer: 40,
            transport: 50,
            recon: 30,
            command_comm: 60,
        };
        heavy.brigade_movement_state = {
            b1: { status: 'packing', stance: 'column', destination_sids: ['S3'] },
        };
        processBrigadeMovement(heavy, EDGES, roughTerrain);
        const heavyTurns = heavy.brigade_movement_state?.b1?.turns_remaining ?? 0;

        const light = makeState();
        (light.formations.b1 as any).composition = {
            infantry: 2100,
            tanks: 10,
            artillery: 8,
            aa_systems: 4,
            artillery_condition: { max: 100, current: 100 },
            tanks_condition: { max: 100, current: 100 },
            ammo_stock: 100,
            anti_tank: 60,
            air_defense: 50,
            engineer: 45,
            transport: 70,
            recon: 55,
            command_comm: 70,
        };
        light.brigade_movement_state = {
            b1: { status: 'packing', stance: 'column', destination_sids: ['S3'] },
        };
        processBrigadeMovement(light, EDGES, flatTerrain);
        const lightTurns = light.brigade_movement_state?.b1?.turns_remaining ?? 0;

        expect(heavy.brigade_movement_state?.b1?.status).toBe('in_transit');
        expect(light.brigade_movement_state?.b1?.status).toBe('in_transit');
        expect(heavyTurns).toBeGreaterThan(lightTurns);
    });
});
