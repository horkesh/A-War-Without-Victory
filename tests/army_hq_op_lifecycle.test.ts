import { describe, expect, it } from 'vitest';

import {
    completeOperationLifecycle,
    enterOperationRecovery,
    formTacticalGroup,
    markOperationExecuting,
} from '../src/sim/combat/tactical_group_lifecycle.js';
import { evaluateOperationProgress } from '../src/sim/combat/sector_offensive.js';
import { reconcileLoadedArmyHqOperationLifecycle } from '../src/state/operation_lifecycle_reconciliation.js';
import type { CorpsOperation, GameState, TacticalGroup, TgDonorContribution } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

const AHQ_A = 'ahq:RBiH:3:shared_a';
const AHQ_B = 'ahq:RBiH:3:shared_b';

function operation(corps: string, armyHqId = AHQ_A): CorpsOperation {
    return {
        name: 'Shared Army Operation',
        type: 'general_offensive',
        phase: 'planning',
        started_turn: 100,
        phase_started_turn: 100,
        participating_brigades: [`anchor_${corps}`],
        target_settlements: ['op:enemy:target'],
        staging_osid: `op:friendly:${corps}`,
        army_hq_op_id: armyHqId,
    };
}

function tgFor(op: CorpsOperation, corpsId: string, anchorId: string, ahqId = AHQ_A): TacticalGroup {
    return {
        id: `tg:${corpsId}:${op.name}:${anchorId}`,
        corps_id: corpsId,
        op_id: op.name,
        army_hq_op_id: ahqId,
        anchor_brigade_id: anchorId,
        donor_contributions: [],
        location_osid: 'op:stale',
        status: 'forming',
        formed_on_turn: 100,
        cohesion: 100,
    };
}

function makeState(): GameState {
    const opA = operation('corps_a', AHQ_A);
    const opB = operation('corps_b', AHQ_B);
    const tgA = tgFor(opA, 'corps_a', 'anchor_corps_a', AHQ_A);
    const tgB = tgFor(opB, 'corps_b', 'anchor_corps_b', AHQ_B);

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 103, phase: 'war', seed: 'army-hq-lifecycle' } as any,
        factions: [{ id: 'RBiH' }, { id: 'RS' }] as any,
        military: {
            formations: {
                corps_a: makeCorps({ id: 'corps_a', faction: 'RBiH', hq_sid: 'S1' }),
                corps_b: makeCorps({ id: 'corps_b', faction: 'RBiH', hq_sid: 'S2' }),
                anchor_corps_a: makeFormation({
                    id: 'anchor_corps_a', faction: 'RBiH', corps_id: 'corps_a', hq_sid: 'S1',
                    location_osid: 'op:friendly:corps_a', personnel: 1500, cohesion: 70,
                }),
                anchor_corps_b: makeFormation({
                    id: 'anchor_corps_b', faction: 'RBiH', corps_id: 'corps_b', hq_sid: 'S2',
                    location_osid: 'op:friendly:corps_b', personnel: 1500, cohesion: 70,
                }),
            },
            corps_command: {
                corps_a: {
                    command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [opA],
                },
                corps_b: {
                    command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [opB],
                },
            },
            tactical_groups: { [tgA.id]: tgA, [tgB.id]: tgB },
            army_hq_operations: {
                [AHQ_A]: {
                    id: AHQ_A, faction_id: 'RBiH', name: opA.name, anchor_corps_id: 'corps_a',
                    donor_corps_ids: [], tg_id: tgA.id, status: 'planning', formed_on_turn: 100, scenario_year: 3,
                },
                [AHQ_B]: {
                    id: AHQ_B, faction_id: 'RBiH', name: opB.name, anchor_corps_id: 'corps_b',
                    donor_corps_ids: [], tg_id: tgB.id, status: 'planning', formed_on_turn: 100, scenario_year: 3,
                },
            },
            corps_front_sectors: {},
        } as any,
        political: { political_controllers: { 'op:enemy:target': 'RS' } } as any,
    } as GameState;
}

describe('Army-HQ operation lifecycle', () => {
    it('uses exact army_hq_op_id before composite fallback and isolates same-name corps', () => {
        const state = makeState();
        const opA = state.military.corps_command!.corps_a!.active_operations[0]!;

        markOperationExecuting(state, 'corps_a', opA);

        expect(state.military.army_hq_operations?.[AHQ_A]?.status).toBe('executing');
        expect(state.military.army_hq_operations?.[AHQ_B]?.status).toBe('planning');
    });

    it('moves executing to recovering, clears tg_id, dissolves once, then completes durably', () => {
        const state = makeState();
        const opA = state.military.corps_command!.corps_a!.active_operations[0]!;
        markOperationExecuting(state, 'corps_a', opA);

        enterOperationRecovery(state, 'corps_a', opA, 104, 'completed');
        const afterFirstRecovery = structuredClone(state);
        enterOperationRecovery(state, 'corps_a', opA, 104, 'completed');

        expect(state).toEqual(afterFirstRecovery);
        expect(state.military.army_hq_operations?.[AHQ_A]).toMatchObject({ status: 'recovering' });
        expect(state.military.army_hq_operations?.[AHQ_A]?.tg_id).toBeUndefined();
        expect(opA).not.toHaveProperty('force_launch');

        completeOperationLifecycle(state, 'corps_a', opA);
        completeOperationLifecycle(state, 'corps_a', opA);
        expect(state.military.army_hq_operations?.[AHQ_A]).toMatchObject({ status: 'completed' });
        expect(state.military.army_hq_operations?.[AHQ_A]?.tg_id).toBeUndefined();
        expect(state.military.army_hq_operations?.[AHQ_B]?.status).toBe('planning');
    });

    it('marks the durable record completed before evaluateOperationProgress removes the CorpsOperation', () => {
        const state = makeState();
        const opA = state.military.corps_command!.corps_a!.active_operations[0]!;
        opA.phase = 'recovery';
        opA.phase_started_turn = 100;
        state.military.army_hq_operations![AHQ_A]!.status = 'recovering';

        evaluateOperationProgress(state, 'RBiH');

        expect(state.military.corps_command!.corps_a!.active_operations).toHaveLength(0);
        expect(state.military.army_hq_operations?.[AHQ_A]).toMatchObject({ status: 'completed' });
    });

    it('reconciles stale loaded records to a fixed point without assigning recovery penalties', () => {
        const state = makeState();
        const orphan = state.military.army_hq_operations![AHQ_A]!;
        state.military.corps_command!.corps_a!.active_operations = [];
        delete state.military.tactical_groups![orphan.tg_id!];
        const anchor = state.military.formations!.anchor_corps_a!;
        delete anchor.tg_recovery_suppressed_until_turn;

        reconcileLoadedArmyHqOperationLifecycle(state);
        const once = structuredClone(state);
        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(state).toEqual(once);
        expect(orphan).toMatchObject({ status: 'completed' });
        expect(orphan.tg_id).toBeUndefined();
        expect(anchor.tg_recovery_suppressed_until_turn).toBeUndefined();
    });

    it('does not let a same-name operation under another host corps keep a stale record active', () => {
        const state = makeState();
        state.military.corps_command!.corps_a!.active_operations = [];
        const orphan = state.military.army_hq_operations![AHQ_A]!;
        delete state.military.tactical_groups![orphan.tg_id!];

        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(orphan.status).toBe('completed');
    });

    it('keeps a receipt active when its explicitly linked TG is still live', () => {
        const state = makeState();
        state.military.corps_command!.corps_a!.active_operations = [];
        const receipt = state.military.army_hq_operations![AHQ_A]!;
        delete state.military.tactical_groups![receipt.tg_id!]!.army_hq_op_id;

        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(receipt.status).toBe('planning');
        expect(receipt.tg_id).toBe(tgFor(operation('corps_a'), 'corps_a', 'anchor_corps_a').id);
    });

    it('rejects an unrelated live TG link and reconciles the orphan to a fixed point', () => {
        const state = makeState();
        const orphan = state.military.army_hq_operations![AHQ_A]!;
        const unrelatedTgId = state.military.army_hq_operations![AHQ_B]!.tg_id!;
        state.military.corps_command!.corps_a!.active_operations = [];
        delete state.military.tactical_groups![orphan.tg_id!];
        orphan.tg_id = unrelatedTgId;

        reconcileLoadedArmyHqOperationLifecycle(state);
        const once = structuredClone(state);
        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(state).toEqual(once);
        expect(orphan.status).toBe('completed');
        expect(orphan.tg_id).toBeUndefined();
        expect(state.military.army_hq_operations![AHQ_B]!.tg_id).toBe(unrelatedTgId);
    });

    it('completes a loaded recovering orphan so the temporary cap cannot become permanent', () => {
        const state = makeState();
        const orphan = state.military.army_hq_operations![AHQ_A]!;
        orphan.status = 'recovering';
        state.military.corps_command!.corps_a!.active_operations = [];
        delete state.military.tactical_groups![orphan.tg_id!];

        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(orphan.status).toBe('completed');
        expect(orphan.tg_id).toBeUndefined();
    });

    it('clears a TG link from a loaded completed receipt even if the TG is still live', () => {
        const state = makeState();
        const completed = state.military.army_hq_operations![AHQ_A]!;
        completed.status = 'completed';

        reconcileLoadedArmyHqOperationLifecycle(state);

        expect(completed.status).toBe('completed');
        expect(completed.tg_id).toBeUndefined();
    });

    it('keeps recovering Army-HQ operations cap-active until the four-turn tail lands', () => {
        const state = makeState();
        state.military.army_hq_operations![AHQ_A]!.status = 'recovering';
        state.military.army_hq_operations![AHQ_B]!.status = 'completed';
        state.military.tactical_groups = {
            existing_a: tgFor(operation('corps_a'), 'corps_a', 'anchor_corps_a'),
            existing_b: tgFor(operation('corps_b'), 'corps_b', 'anchor_corps_b'),
        };
        state.military.formations!.candidate_anchor = makeFormation({
            id: 'candidate_anchor', faction: 'RBiH', corps_id: 'corps_c', hq_sid: 'S3',
            location_osid: 'op:friendly:corps_c', personnel: 1500, cohesion: 70,
        });
        state.military.formations!.candidate_donor = makeFormation({
            id: 'candidate_donor', faction: 'RBiH', corps_id: 'corps_c', hq_sid: 'S3',
            location_osid: 'op:friendly:corps_c', personnel: 1500, cohesion: 70,
        });
        const donor: TgDonorContribution = {
            brigade_id: 'candidate_donor', source_corps_id: 'corps_c', distance_hops: 0,
            personnel_lent: 300,
            heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
            casualties_so_far: 0,
            equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
            cohesion_bleed_applied: 0,
        };

        const result = formTacticalGroup(state, {
            op_id: 'Cap Candidate', anchor_brigade_id: 'candidate_anchor', donors: [donor], current_turn: 103,
        });

        expect(result).toEqual({ tg_id: null, rejection_reason: 'faction_tg_cap_reached' });
    });
});
