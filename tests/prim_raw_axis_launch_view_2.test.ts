/**
 * PRIM-RAW-AXIS (rulings §31/§34), second sweep (B1-B7): planning readers read the launch view
 * (`launchAxisObjectiveView`: foreign-controlled filter, then the cut of leading unreachable
 * objectives); a null view is an axis the reconcile drops. Execution keeps the stored read.
 *
 * Every planning case builds an axis whose raw leading objective is a friendly cell (OWN_X), so
 * the raw read and the view diverge.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { getSectorOffensiveApproachOsids } from '../src/sim/combat/operation_approach_osids.js';
import { evaluateOpeningAttackReadiness, launchAxisObjectiveView } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { getSynchronizedOperationBrigadesAtObjective } from '../src/sim/combat/corps_operation_helpers.js';
import { getProbeTargetOsid } from '../src/sim/combat/operation_preparation.js';
import { hasOnlyPoliticallyBlockedCurrentObjectives } from '../src/sim/combat/sector_offensive.js';
import { resolveEliteDeploymentTarget } from '../src/sim/combat/army_reserve_system.js';
import type { CorpsOperation, FactionId, FormationId, FormationState, GameState, OperationAxis } from '../src/state/game_state.js';

const CORPS = 'synth_corps' as FormationId;
const FACTION = 'RBiH' as FactionId;
const OBJ_A = 'op:t2:obj_a';
const OBJ_B = 'op:t2:obj_b';
const OBJ_H = 'op:t2:obj_h';
const APP_A = 'op:t2:app_a';
const APP_B = 'op:t2:app_b';
const APP_H = 'op:t2:app_h';
const OWN_X = 'op:t2:own_x';
const STAGING = 'op:t2:stg';

function buildState(
    brigadeSpecs: Record<string, string | { location: string; personnel?: number }>,
    operations: CorpsOperation[] = [],
): GameState {
    const formations: Record<string, unknown> = {
        [CORPS]: { id: CORPS, kind: 'corps', status: 'active', faction: FACTION },
    };
    const brigades = Object.fromEntries(Object.entries(brigadeSpecs).map(([id, spec]) =>
        [id, typeof spec === 'string' ? { location: spec } : spec])) as Record<string, { location: string; personnel?: number }>;
    for (const [id, brigade] of Object.entries(brigades)) {
        formations[id] = {
            id,
            kind: 'brigade',
            status: 'active',
            location_osid: brigade.location,
            personnel: brigade.personnel ?? 1500,
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
            corps_command: { [CORPS]: { active_operations: operations } },
            corps_front_sectors: {
                synth_sector: {
                    sector_id: 'synth_sector',
                    corps_id: CORPS,
                    faction: FACTION,
                    territory_osids: [STAGING, APP_A, APP_B, APP_H, OWN_X],
                    sub_segments: [
                        { sub_segment_id: 's_a', friendly_osids: [APP_A], enemy_osids: [OBJ_A] },
                        { sub_segment_id: 's_b', friendly_osids: [APP_B], enemy_osids: [OBJ_B] },
                        { sub_segment_id: 's_h', friendly_osids: [APP_H], enemy_osids: [OBJ_H] },
                    ],
                    assigned_brigade_ids: Object.keys(brigades),
                },
            },
            war_front_edges_osid: [
                { a: APP_A, b: OBJ_A },
                { a: APP_B, b: OBJ_B },
                { a: APP_H, b: OBJ_H },
            ],
        },
        political: {
            political_controllers: {
                [STAGING]: 'RBiH',
                [APP_A]: 'RBiH',
                [APP_B]: 'RBiH',
                [APP_H]: 'RBiH',
                [OWN_X]: 'RBiH',
                [OBJ_A]: 'RS',
                [OBJ_B]: 'RS',
                [OBJ_H]: 'HRHB',
            },
            // RBiH-HRHB combat is politically blocked: OBJ_H is a blocked objective.
            rbih_hrhb_state: { washington_signed: true },
        },
        operation_history: [],
    } as unknown as GameState;
}

function axis(
    axisId: string,
    brigades: string[],
    objectives: string[],
    extra: Partial<OperationAxis> = {},
): OperationAxis {
    return {
        axis_id: axisId,
        name: axisId,
        objectives: [...objectives],
        current_objective_index: 0,
        assigned_brigades: brigades,
        status: 'executing',
        ...extra,
    } as unknown as OperationAxis;
}

function axisOp(
    axes: OperationAxis[],
    phase: 'planning' | 'execution' = 'planning',
    extra: Partial<CorpsOperation> = {},
): CorpsOperation {
    return {
        name: 'Synthetic Two',
        type: 'sector_attack',
        phase,
        participating_brigades: [...new Set(axes.flatMap((a) => a.assigned_brigades))].sort(),
        objectives: [...new Set(axes.flatMap((a) => a.objectives))].sort(),
        current_objective_index: 0,
        axes,
        ...extra,
    } as unknown as CorpsOperation;
}

describe('B1: getSectorOffensiveApproachOsids reads the launch view objectives in planning', () => {
    // OWN_X (friendly) has a friendly neighbour, so the raw read stops there.
    const adjacency = new Map<string, string[]>([[OWN_X, [STAGING]], [OBJ_B, [APP_B]]]);
    const approaches = (op: CorpsOperation): string[] => {
        const state = buildState({ b1: STAGING }, [op]);
        return [...getSectorOffensiveApproachOsids(
            state, op, FACTION, adjacency as never, undefined as never, 'b1' as FormationId,
        )].sort();
    };

    it('planning: a friendly leading objective is cut; the march goes to the first contested one', () => {
        assert.deepEqual(approaches(axisOp([axis('ax', ['b1'], [OWN_X, OBJ_B])])), [APP_B]);
    });

    it('planning: an axis the reconcile would drop has no approach', () => {
        assert.deepEqual(approaches(axisOp([axis('ax', ['b1'], [OWN_X])])), []);
    });

    it('execution: the stored axis is read (deliberate raw read)', () => {
        assert.deepEqual(approaches(axisOp([axis('ax', ['b1'], [OWN_X, OBJ_B])], 'execution')), [STAGING]);
    });
});

describe('B2: opening-attack readiness classifies each axis at its launch view objective', () => {
    it('planning: a friendly leading objective is not read as no_approach_osid', () => {
        // minimum_staged_brigades stops the check right after the approach test, before the predictor.
        const lead = axis('ax', ['b1'], [OWN_X, OBJ_A], { minimum_staged_brigades: 2 });
        const op = axisOp([lead]);
        const state = buildState({ b1: APP_A }, [op]);
        const result = evaluateOpeningAttackReadiness(state, CORPS, FACTION, op);
        assert.equal(result.blocker, 'participants_below_assembly_floor');
        assert.equal(lead.unreachable_at_launch, undefined);
    });

    it('planning: an axis the reconcile would drop is skipped, not marked unreachable', () => {
        const dropped = axis('ax_drop', ['b2'], [OWN_X]);
        const live = axis('ax_live', ['b1'], [OBJ_A], { minimum_staged_brigades: 2 });
        const op = axisOp([dropped, live]);
        const state = buildState({ b1: APP_A, b2: STAGING }, [op]);
        const result = evaluateOpeningAttackReadiness(state, CORPS, FACTION, op);
        assert.equal(result.blocker, 'participants_below_assembly_floor');
        assert.equal(dropped.unreachable_at_launch, undefined);
        assert.equal(dropped.launch_blocker, undefined);
    });

    it('execution: the stored index is read (friendly cell has no approach)', () => {
        const lead = axis('ax', ['b1'], [OWN_X, OBJ_A], { minimum_staged_brigades: 2 });
        const op = axisOp([lead], 'execution');
        const state = buildState({ b1: APP_A }, [op]);
        const result = evaluateOpeningAttackReadiness(state, CORPS, FACTION, op);
        assert.equal(result.blocker, 'no_approach_osid');
        assert.equal(lead.unreachable_at_launch, true);
    });
});

describe('B3: single-axis readiness reads objectives[0] in planning', () => {
    const flatOp = (phase: 'planning' | 'execution'): CorpsOperation => ({
        name: 'Flat',
        type: 'sector_attack',
        phase,
        participating_brigades: ['b1'],
        objectives: [OBJ_A, OWN_X],
        current_objective_index: 1,
    } as unknown as CorpsOperation);

    it('planning: a carried index 1 is not read (objective 0 has an approach)', () => {
        // personnel 0 stops the check at the attack floor, right after the approach test.
        const op = flatOp('planning');
        const state = buildState({ b1: { location: APP_A, personnel: 0 } }, [op]);
        assert.equal(evaluateOpeningAttackReadiness(state, CORPS, FACTION, op).blocker, 'participants_below_attack_floor');
    });

    it('execution: the live index 1 is read', () => {
        const op = flatOp('execution');
        const state = buildState({ b1: { location: APP_A, personnel: 0 } }, [op]);
        assert.equal(evaluateOpeningAttackReadiness(state, CORPS, FACTION, op).blocker, 'no_approach_osid');
    });
});

describe('B4: converging sibling axes are matched at their launch view objective', () => {
    it('planning objectiveOf: an axis led by a friendly cell converges on its first contested objective', () => {
        const ax1 = axis('ax1', ['b1'], [OWN_X, OBJ_A]);
        const ax2 = axis('ax2', ['b2'], [OBJ_A]);
        const op = axisOp([ax1, ax2]);
        const state = buildState({ b1: APP_A, b2: APP_A }, [op]);
        const objectiveOf = (candidate: OperationAxis): string | undefined =>
            launchAxisObjectiveView(state, CORPS, FACTION, op, candidate)?.objectives[0];
        assert.deepEqual(getSynchronizedOperationBrigadesAtObjective(state, op, FACTION, OBJ_A, objectiveOf), ['b1', 'b2']);
        // Without the callback (execution callers) the stored index is read.
        assert.deepEqual(getSynchronizedOperationBrigadesAtObjective(state, op, FACTION, OBJ_A), ['b2']);
    });
});

describe('B5: the preparation probe targets the launch view first objective', () => {
    it('a friendly leading objective is not the probe target', () => {
        const op = axisOp([axis('ax', ['b1'], [OWN_X, OBJ_B])]);
        const state = buildState({ b1: APP_B }, [op]);
        assert.equal(getProbeTargetOsid(state, op, CORPS, FACTION), OBJ_B);
    });

    it('a dropped lead axis gives no target; a flat op keeps objectives[0]', () => {
        const op = axisOp([axis('ax', ['b1'], [OWN_X])]);
        const state = buildState({ b1: APP_B }, [op]);
        assert.equal(getProbeTargetOsid(state, op, CORPS, FACTION), undefined);
        const flat = { phase: 'planning', objectives: [OWN_X, OBJ_B], participating_brigades: ['b1'] } as unknown as CorpsOperation;
        assert.equal(getProbeTargetOsid(state, flat, CORPS, FACTION), OWN_X);
    });
});

describe('B6: the political-block check reads the launch view in planning', () => {
    it('planning: the first contested objective (politically blocked) is read, not the friendly lead', () => {
        const op = axisOp([axis('ax', ['b1'], [OWN_X, OBJ_H])]);
        const state = buildState({ b1: APP_H }, [op]);
        assert.equal(hasOnlyPoliticallyBlockedCurrentObjectives(state, CORPS, FACTION, op), true);
    });

    it('planning: an axis the reconcile would drop is skipped', () => {
        const op = axisOp([axis('ax_drop', ['b2'], [OWN_X]), axis('ax_h', ['b1'], [OBJ_H])]);
        const state = buildState({ b1: APP_H, b2: STAGING }, [op]);
        assert.equal(hasOnlyPoliticallyBlockedCurrentObjectives(state, CORPS, FACTION, op), true);
    });

    it('execution: the stored index is read (friendly cell is not blocked)', () => {
        const op = axisOp([axis('ax', ['b1'], [OWN_X, OBJ_H])], 'execution');
        const state = buildState({ b1: APP_H }, [op]);
        assert.equal(hasOnlyPoliticallyBlockedCurrentObjectives(state, CORPS, FACTION, op), false);
    });
});

describe('B7: elite deployment stages at the front facing the launch view first objective', () => {
    it('planning: a friendly leading objective does not decide the staging front', () => {
        const op = axisOp([axis('ax', ['elite'], [OWN_X, OBJ_B])]);
        const state = buildState({ elite: STAGING }, [op]);
        const formation = state.military.formations!['elite'] as FormationState;
        assert.equal(resolveEliteDeploymentTarget(state, formation, 'elite', CORPS), APP_B);
    });
});
