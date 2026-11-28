/**
 * SOLE-DEFENDER-STRIP (rulings §73, §78.3): an operation must not take the last own brigade off an
 * enemy-adjacent own cell, and a brigade left on own ground after an operation re-mans the line.
 *
 * The draw gate is SOFT (and never applied to an authored phased-axis handoff brigade): a deferred sole defender is re-admitted whenever the axis or operation
 * would otherwise fall under its participant floor, so the gate never blocks a launch (consult 9).
 *
 * Geometry (all RBiH unless noted):
 *   E (RS) ── A ── B ── T (RS, objective)        R, R2, R3: rear cells, no enemy contact
 * Enemy contact comes from `war_front_edges_osid`, the same edges tactical adjacency reads.
 */

import { describe, expect, it } from 'vitest';

import {
    applyOpportunityDecision,
    buildProposalId,
    preflightOpportunityAdmission,
    runOpportunityEvaluationStep,
    type AxisPredicate,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import { issuePostOperationReturnMarches } from '../src/sim/combat/sector_offensive.js';
import { isSoleDefenderOfFrontCell } from '../src/sim/combat/sole_defender_gate.js';
import type { CorpsCommandState, CorpsOperation, GameState } from '../src/state/game_state.js';

const CORPS = 'arbih_5th_corps';
const A = 'op:m:a';
const B = 'op:m:b';
const E = 'op:m:enemy';
const T = 'op:m:target';
const R = 'op:m:rear';
const R2 = 'op:m:rear2';
const R3 = 'op:m:rear3';

function buildState(locations: Record<string, string>): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: [],
    };
    return {
        schema_version: 0,
        meta: { turn: 175, seed: 'test', phase: 'war' as const },
        factions: [],
        military: {
            formations: Object.fromEntries(Object.entries(locations).map(([id, loc]) => [id, {
                id,
                name: id,
                kind: 'brigade',
                status: 'active',
                faction: 'RBiH',
                corps_id: CORPS,
                personnel: 1000,
                location_osid: loc,
                home_osid: loc,
            }])),
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { [CORPS]: cmd },
            war_front_edges_osid: [{ a: A, b: E }, { a: B, b: T }],
        },
        political: {
            political_controllers: {
                [A]: 'RBiH', [B]: 'RBiH', [R]: 'RBiH', [R2]: 'RBiH', [R3]: 'RBiH', [E]: 'RS', [T]: 'RS',
            },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

const green: AxisPredicate = () => ({ green: true, reason: 'satisfied' });

function fixtureDef(brigades: string[], objectives: string[] = [T]): OperationOpportunityDef {
    return {
        opportunity_id: 'fixture_sds',
        name: 'Fixture SDS',
        tier: 'T1',
        faction: 'RBiH',
        primary_corps: CORPS,
        family: 'fifth_corps',
        axes: [{ axis_id: 'main', name: 'Main', corps: CORPS, brigades, objectives }],
        staging_osid: B,
        planning_duration: 3,
        citations: ['fixture'],
        historical_exit_class: 'partial_success',
        prerequisites: {
            date_window: 'required',
            political_authorization: 'n_a',
            corps_readiness: 'required',
            logistics: 'optional',
            staging_access: 'required',
            weather_season: 'n_a',
            commander_confidence: 'n_a',
            enemy_weakness: 'optional',
            alliance_context: 'n_a',
            force_quality: 'n_a',
            min_optional_axes: 0,
        },
        evaluators: {
            date_window: green,
            political_authorization: green,
            corps_readiness: green,
            logistics: green,
            staging_access: green,
            weather_season: green,
            commander_confidence: green,
            enemy_weakness: green,
            alliance_context: green,
            force_quality: green,
        },
        staff_recommendation: 'approve',
    } as unknown as OperationOpportunityDef;
}

function approve(state: GameState, def: OperationOpportunityDef, commitment?: 'minimum' | 'standard'): CorpsOperation {
    runOpportunityEvaluationStep(state, 175, [def]);
    applyOpportunityDecision(
        state, 175, buildProposalId(def.opportunity_id, 175), 'approve', [def],
        commitment ? { commitment_profile: commitment } : {},
    );
    const op = state.military.corps_command![CORPS]!.active_operations.find((o) => o.name === def.name);
    expect(op).toBeDefined();
    return op!;
}

describe('SOLE-DEFENDER-STRIP: roster draw gate', () => {
    it('keeps the last brigade on an enemy-adjacent own cell off the roster when others can go', () => {
        const state = buildState({ x: A, y: R, z: R2 });
        expect(isSoleDefenderOfFrontCell(state, 'x', new Set())).toBe(true);
        const op = approve(state, fixtureDef(['x', 'y', 'z']));
        expect(op.participating_brigades).toEqual(['y', 'z']);
    });

    it('admits the sole defender anyway when the operation floor would otherwise fail (no launch blocked)', () => {
        const state = buildState({ x: A, y: R, z: R2 });
        state.military.formations!.z!.disrupted_turns = 2;
        const def = fixtureDef(['x', 'y', 'z']);
        expect(preflightOpportunityAdmission(state, def, def.axes, 'standard', 175)).toMatchObject({
            admitted: true, selected_participants: 2,
        });
        const op = approve(state, def);
        expect(op.participating_brigades).toEqual(['x', 'y']);
        expect(op.axes![0]!.assigned_brigades).toEqual(['x', 'y']);
    });

    it('admits the sole defender when it is the only brigade an axis can field', () => {
        const state = buildState({ x: A, y: R, z: R2 });
        const def = fixtureDef(['y', 'z']);
        const withSecondAxis: OperationOpportunityDef = {
            ...def,
            axes: [...def.axes, { axis_id: 'second', name: 'Second', corps: CORPS, brigades: ['x'], objectives: [T] }],
        };
        const op = approve(state, withSecondAxis);
        expect(op.axes!.map((axis) => [axis.axis_id, axis.assigned_brigades])).toEqual([
            ['main', ['y', 'z']],
            ['second', ['x']],
        ]);
    });

    it('exempts a sole defender whose cell touches the axis objective or is its staging cell', () => {
        const touching = buildState({ x: B, y: R, z: R2 });
        expect(approve(touching, fixtureDef(['x', 'y', 'z'])).participating_brigades).toEqual(['x', 'y', 'z']);

        const staged = buildState({ x: A, y: R, z: R2 });
        const def = fixtureDef(['x', 'y', 'z']);
        const stagedDef: OperationOpportunityDef = { ...def, staging_osid: A };
        expect(approve(staged, stagedDef).participating_brigades).toEqual(['x', 'y', 'z']);
    });

    it('counts brigades drawn from the same cell: the second of two on a front cell stays', () => {
        const state = buildState({ x1: A, x2: A, y: R, z: R2 });
        const op = approve(state, fixtureDef(['x1', 'x2', 'y', 'z']));
        expect(op.participating_brigades).toEqual(['x1', 'y', 'z']);
    });

    it('lets a later roster entry substitute under a minimum commitment', () => {
        const state = buildState({ x: A, y: R, z: R2, w: R3 });
        const op = approve(state, fixtureDef(['x', 'y', 'z', 'w']), 'minimum');
        expect(op.participating_brigades).toEqual(['y', 'z']);
    });

    it('treats a brigade on a rear cell, or one already leaving, as no sole defender', () => {
        const state = buildState({ x: A, y: R, other: A });
        expect(isSoleDefenderOfFrontCell(state, 'y', new Set())).toBe(false);
        expect(isSoleDefenderOfFrontCell(state, 'x', new Set())).toBe(false);
        state.military.brigade_movement_orders = {
            other: { destination_sids: [R2], stance: 'column' },
        } as unknown as GameState['military']['brigade_movement_orders'];
        expect(isSoleDefenderOfFrontCell(state, 'x', new Set())).toBe(true);
    });

    it('is deterministic: the same state draws the same roster', () => {
        const a = approve(buildState({ x: A, y: R, z: R2 }), fixtureDef(['x', 'y', 'z']));
        const b = approve(buildState({ x: A, y: R, z: R2 }), fixtureDef(['x', 'y', 'z']));
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
});

describe('SOLE-DEFENDER-STRIP: phased-axis handoff brigade', () => {
    it('never defers the authored handoff brigade, so the phased axis main builds is still built', () => {
        const state = buildState({ h: A, y: R, z: R2 });
        const def = fixtureDef(['h', 'y', 'z']);
        const phased: OperationOpportunityDef = {
            ...def,
            axes: [def.axes[0]!, {
                axis_id: 'destination', name: 'Destination', corps: CORPS, brigades: [], objectives: [T],
                phase_gate: {
                    main_axis_id: 'main', requires_operation_captures: [T],
                    handoff: { brigade_id: 'h', source_axis_id: 'main' },
                },
            }],
        };
        expect(isSoleDefenderOfFrontCell(state, 'h', new Set())).toBe(true);
        const op = approve(state, phased);
        expect(op.participating_brigades).toEqual(['h', 'y', 'z']);
        expect(op.axes!.map((axis) => axis.axis_id)).toEqual(['main', 'destination']);
        expect(op.axes![1]!.late_phase?.handoff?.brigade_id).toBe('h');
    });
});

describe('SOLE-DEFENDER-STRIP: post-operation return re-mans the line', () => {
    function withSector(state: GameState, frontCells: string[]): void {
        state.military.corps_front_sectors = {
            s1: {
                sector_id: 's1',
                corps_id: CORPS,
                length_edges: frontCells.length,
                sub_segments: [{ friendly_osids: frontCells }],
                territory_osids: [A, B, R, R2, R3],
                assigned_brigade_ids: [],
            },
        } as unknown as GameState['military']['corps_front_sectors'];
    }
    const adjacency = new Map<string, string[]>([
        [A, [B, E]], [B, [A, T, R]], [R, [B, R2]], [R2, [R]],
    ]);
    const finishedOp = (brigades: string[]): CorpsOperation => ({
        name: 'Done', type: 'sector_attack', phase: 'execution', started_turn: 170, phase_started_turn: 171,
        participating_brigades: brigades, objectives: [T], current_objective_index: 0,
    } as unknown as CorpsOperation);

    it('sends a brigade standing on own ground in its sector to the nearest vacant enemy-adjacent front cell', () => {
        const state = buildState({ x: R2, holder: B });
        withSector(state, [A, B]);
        issuePostOperationReturnMarches(state, finishedOp(['x']), adjacency);
        expect(state.military.brigade_movement_orders?.x?.destination_sids).toEqual([A]);
    });

    it('never sends two brigades to the same vacancy', () => {
        const state = buildState({ x: R2, w: R2, holder: B });
        withSector(state, [A, B]);
        issuePostOperationReturnMarches(state, finishedOp(['w', 'x']), adjacency);
        const orders = state.military.brigade_movement_orders ?? {};
        expect(orders.w?.destination_sids).toEqual([A]);
        expect(orders.x).toBeUndefined();
    });

    it('does not pull the last defender off a front cell to fill another', () => {
        const state = buildState({ x: B });
        withSector(state, [A, B]);
        issuePostOperationReturnMarches(state, finishedOp(['x']), adjacency);
        expect(state.military.brigade_movement_orders?.x).toBeUndefined();
    });
});
