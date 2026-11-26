/**
 * PRIM-RAW-AXIS (rulings §31): planning-phase readers of an operation axis read what the
 * launch will fight, not the raw stored axis. The launch reconcile filters and prunes the
 * axis (`launchAxisObjectiveView`), then the launch resets every index to 0, so the first
 * battle is at the reconciled axis's first objective.
 *
 * Each case builds an axis where the raw read and the launch view diverge:
 * - countAssembledBrigades: the raw first objective is a friendly cell the reconcile cuts.
 * - getCurrentLaunchObjectives / areParticipantsReadyForExecution: an index carried to 1.
 * - getSectorOffensiveApproachOsids: planning reads from 0, execution keeps the live index.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { countAssembledBrigades } from '../src/sim/combat/operation_preparation.js';
import { getCurrentLaunchObjectives } from '../src/sim/combat/sector_offensive_axis_helpers.js';
import { areParticipantsReadyForExecution } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { getSectorOffensiveApproachOsids } from '../src/sim/combat/operation_approach_osids.js';
import type { CorpsOperation, FactionId, FormationId, GameState } from '../src/state/game_state.js';

const CORPS = 'synth_corps' as FormationId;
const FACTION = 'RBiH' as FactionId;
const OBJ_A = 'op:t:obj_a';
const OBJ_B = 'op:t:obj_b';
const APP_A = 'op:t:app_a';
const APP_B = 'op:t:app_b';
const OWN_X = 'op:t:own_x';
const STAGING = 'op:t:stg';

function buildState(brigadeLocations: Record<string, string>): GameState {
    const formations: Record<string, unknown> = {};
    for (const [id, location] of Object.entries(brigadeLocations)) {
        formations[id] = {
            id,
            kind: 'brigade',
            status: 'active',
            location_osid: location,
            personnel: 1500,
            disrupted_turns: 0,
            faction: FACTION,
            corps_id: CORPS,
        };
    }
    return {
        meta: { turn: 100 },
        military: {
            formations,
            brigade_movement_state: {},
            corps_front_sectors: {
                synth_sector: {
                    sector_id: 'synth_sector',
                    corps_id: CORPS,
                    faction: FACTION,
                    territory_osids: [STAGING, APP_A, APP_B, OWN_X],
                    sub_segments: [
                        { sub_segment_id: 's_a', friendly_osids: [APP_A], enemy_osids: [OBJ_A] },
                        { sub_segment_id: 's_b', friendly_osids: [APP_B], enemy_osids: [OBJ_B] },
                    ],
                    assigned_brigade_ids: Object.keys(brigadeLocations),
                },
            },
            war_front_edges_osid: [
                { a: APP_A, b: OBJ_A },
                { a: APP_B, b: OBJ_B },
            ],
        },
        political: {
            political_controllers: {
                [STAGING]: 'RBiH',
                [APP_A]: 'RBiH',
                [APP_B]: 'RBiH',
                [OWN_X]: 'RBiH',
                [OBJ_A]: 'RS',
                [OBJ_B]: 'RS',
            },
        },
        operation_history: [],
    } as unknown as GameState;
}

function axisOp(
    brigades: string[],
    objectives: string[],
    index: number,
    phase: 'planning' | 'execution' = 'planning',
): CorpsOperation {
    return {
        name: 'Synthetic',
        type: 'sector_attack',
        phase,
        participating_brigades: brigades,
        staging_osid: STAGING,
        objectives: [...objectives].sort(),
        current_objective_index: 0,
        faction: FACTION,
        corps_id: CORPS,
        axes: [{
            axis_id: 'ax',
            name: 'Axis',
            objectives: [...objectives],
            current_objective_index: index,
            assigned_brigades: brigades,
            staging_osid: STAGING,
        }],
    } as unknown as CorpsOperation;
}

describe('PRIM-RAW-AXIS (2): countAssembledBrigades reads the launch view', () => {
    it('a friendly leading objective the reconcile cuts is not an assembly point', () => {
        // Raw axes[0].objectives[0] is OWN_X; the launch view is [OBJ_B].
        const state = buildState({ at_own: OWN_X, at_b: OBJ_B });
        const op = axisOp(['at_own', 'at_b'], [OWN_X, OBJ_B], 0);
        // No sector_id on the op, so only staging + the first objective count.
        assert.equal(countAssembledBrigades(state, op, CORPS, FACTION), 1);
        const onlyOwn = buildState({ at_own: OWN_X });
        assert.equal(
            countAssembledBrigades(onlyOwn, axisOp(['at_own'], [OWN_X, OBJ_B], 0), CORPS, FACTION),
            0,
            'the raw first objective (a friendly cell) must not count',
        );
    });

    it('a view the reconcile would drop adds no objective', () => {
        const state = buildState({ at_own: OWN_X });
        assert.equal(countAssembledBrigades(state, axisOp(['at_own'], [OWN_X], 0), CORPS, FACTION), 0);
    });
});

describe('PRIM-RAW-AXIS (3): launch readiness reads the first objective, not a carried index', () => {
    it('getCurrentLaunchObjectives reads objectives[0] on axes and single-axis operations', () => {
        assert.deepEqual(getCurrentLaunchObjectives(axisOp(['b'], [OBJ_A, OBJ_B], 1)), [OBJ_A]);
        const single = {
            participating_brigades: ['b'],
            objectives: [OBJ_A, OBJ_B],
            current_objective_index: 1,
        } as unknown as CorpsOperation;
        assert.deepEqual(getCurrentLaunchObjectives(single), [OBJ_A]);
    });

    it('multi-axis: a brigade at the first objective\'s approach is ready with index 1', () => {
        const state = buildState({ b1: APP_A });
        const op = axisOp(['b1'], [OBJ_A, OBJ_B], 1);
        assert.equal(areParticipantsReadyForExecution(state, CORPS, FACTION, op), true);
    });

    it('single-axis: a brigade at the first objective\'s approach is ready with index 1', () => {
        const state = buildState({ b1: APP_A });
        const op = {
            name: 'Single',
            type: 'sector_attack',
            phase: 'planning',
            participating_brigades: ['b1'],
            staging_osid: STAGING,
            objectives: [OBJ_A, OBJ_B],
            current_objective_index: 1,
            faction: FACTION,
            corps_id: CORPS,
        } as unknown as CorpsOperation;
        assert.equal(areParticipantsReadyForExecution(state, CORPS, FACTION, op), true);
    });
});

describe('PRIM-RAW-AXIS (4): approach OSIDs read the live index only in execution', () => {
    const adjacency = new Map<string, string[]>([[OBJ_A, [APP_A]], [OBJ_B, [APP_B]]]);
    const approaches = (op: CorpsOperation): string[] => {
        const state = buildState({ b1: STAGING });
        return [...getSectorOffensiveApproachOsids(
            state, op, FACTION, adjacency as never, undefined as never, 'b1' as FormationId,
        )].sort();
    };

    it('planning: a carried index 1 still marches to the first objective', () => {
        assert.deepEqual(approaches(axisOp(['b1'], [OBJ_A, OBJ_B], 1, 'planning')), [APP_A]);
    });

    it('execution: the live index 1 marches to the second objective (deliberate raw read)', () => {
        assert.deepEqual(approaches(axisOp(['b1'], [OBJ_A, OBJ_B], 1, 'execution')), [APP_B]);
    });
});
