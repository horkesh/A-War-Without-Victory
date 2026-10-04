import { afterEach, describe, expect, it } from 'vitest';

import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';

const ACTOR = 'synthetic_737';
const CORPS = 'synthetic_3rd_corps';
const REAR = 'op:test:rear';
const MID = 'op:test:mid';
const FRONT_A = 'op:test:front_a';
const FRONT_B = 'op:test:front_b';

const edges = [
    { a: REAR, b: MID },
    { a: MID, b: FRONT_A },
    { a: FRONT_A, b: FRONT_B },
] as EdgeRecord[];
const adjacency = new Map<string, string[]>([
    [REAR, [MID]],
    [MID, [REAR, FRONT_A]],
    [FRONT_A, [MID, FRONT_B]],
    [FRONT_B, [FRONT_A]],
]);
const reverseMap = new Map([
    [REAR, [REAR]],
    [MID, [MID]],
    [FRONT_A, [FRONT_A]],
    [FRONT_B, [FRONT_B]],
]) as OperationalToCanonicalReverseMap;
const flatTerrain = {
    by_sid: Object.fromEntries([REAR, MID, FRONT_A, FRONT_B].map((sid) => [sid, {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    }])),
} as TerrainScalarsData;

function makeFixture(posture: 'defend' | 'dig_in', operationParticipant = false): {
    state: GameState;
    sectors: CorpsFrontSector[];
} {
    const sector = {
        sector_id: `sector:${CORPS}:0`,
        corps_id: CORPS,
        faction: 'RBiH',
        territory_osids: [REAR, MID, FRONT_A, FRONT_B],
        assigned_brigade_ids: [ACTOR],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        sub_segments: [{
            sub_segment_id: `subseg:${CORPS}:0`,
            friendly_osids: [FRONT_A, FRONT_B],
            enemy_osids: ['op:test:enemy'],
            primary_brigade_ids: [ACTOR],
            edge_ids: [],
            length_edges: 2,
        }],
    } as unknown as CorpsFrontSector;
    const activeOperations = operationParticipant ? [{
        name: 'Synthetic authorized operation control',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 1,
        phase_started_turn: 1,
        participating_brigades: [ACTOR],
        objectives: ['op:test:enemy'],
        current_objective_index: 0,
        axes: [],
    }] : [];
    const formation: FormationState = {
        id: ACTOR,
        name: 'Synthetic 737-shaped brigade',
        kind: 'brigade',
        status: 'active',
        faction: 'RBiH',
        corps_id: CORPS,
        location_osid: REAR,
        home_osid: REAR,
        posture,
        dig_in_progress: posture === 'dig_in' ? 4 : 0,
        entrenchment_turns: posture === 'dig_in' ? 12 : 0,
        disrupted_turns: 0,
    } as FormationState;
    const state = {
        meta: { turn: 1, phase: 'war', schema_version: 1, scenario_id: 'front-conflict-diagnostic' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {
                [ACTOR]: formation,
            },
            brigade_movement_orders: {},
            corps_front_sectors: { [sector.sector_id]: sector },
            corps_command: {
                [CORPS]: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: activeOperations,
                },
            },
        },
        political: {
            political_controllers: {
                [REAR]: 'RBiH',
                [MID]: 'RBiH',
                [FRONT_A]: 'RBiH',
                [FRONT_B]: 'RBiH',
            },
        },
    } as unknown as GameState;
    return { state, sectors: [sector] };
}

function runProducerConsumer(posture: 'defend' | 'dig_in') {
    const { state, sectors } = makeFixture(posture);
    distributeBrigadesToFront(state, sectors, adjacency);
    const producedOrder = structuredClone(state.military.brigade_movement_orders?.[ACTOR]);
    const report = processOsidColumnMovement(state, edges, reverseMap, flatTerrain, adjacency);
    return {
        producedOrder,
        report,
        resultingOrder: state.military.brigade_movement_orders?.[ACTOR],
        movementState: state.military.brigade_movement_state?.[ACTOR],
        location: state.military.formations[ACTOR]?.location_osid,
        posture: state.military.formations[ACTOR]?.posture,
        digInProgress: state.military.formations[ACTOR]?.dig_in_progress,
    };
}

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
});

describe('front distribution to column movement conflict diagnostic', () => {
    it('characterizes deterministic Phase B order churn for an idle dug-in brigade', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();

        const first = runProducerConsumer('dig_in');
        const second = runProducerConsumer('dig_in');

        expect(first).toEqual(second);
        expect(first.producedOrder).toEqual({
            destination_sids: [FRONT_A],
            stance: 'column',
        });
        expect(first.report.column_rejections).toEqual([expect.objectContaining({
            formation_id: ACTOR,
            reason: 'posture_dig_in',
            location_osid: REAR,
            destination_osid: FRONT_A,
        })]);
        expect(first.report.column_starts).toBe(0);
        expect(first.report.column_blocked).toBe(1);
        expect(first.resultingOrder).toBeUndefined();
        expect(first.movementState).toBeUndefined();
        expect(first.location).toBe(REAR);
        expect(first.posture).toBe('dig_in');
        expect(first.digInProgress).toBe(4);
    });

    it('starts the same real distributor order when defensive posture does not veto it', () => {
        const result = runProducerConsumer('defend');

        expect(result.producedOrder).toEqual({
            destination_sids: [FRONT_A],
            stance: 'column',
        });
        expect(result.report.column_starts).toBe(1);
        expect(result.report.column_blocked).toBe(0);
        expect(result.resultingOrder).toBeUndefined();
        expect(result.movementState).toEqual(expect.objectContaining({
            status: 'in_transit',
            stance: 'column',
            destination_sids: [FRONT_A],
        }));
    });

    it('does not let repair distribution issue an order for an active-operation participant', () => {
        const { state, sectors } = makeFixture('dig_in', true);

        distributeBrigadesToFront(state, sectors, adjacency);

        expect(state.military.brigade_movement_orders?.[ACTOR]).toBeUndefined();
        expect(state.military.brigade_movement_state?.[ACTOR]).toBeUndefined();
        expect(state.military.formations[ACTOR]?.location_osid).toBe(REAR);
        expect(state.military.formations[ACTOR]?.posture).toBe('dig_in');
    });
});
