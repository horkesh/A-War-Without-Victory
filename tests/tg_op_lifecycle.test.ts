import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    completeOperationLifecycle,
    enterOperationRecovery,
    markOperationExecuting,
} from '../src/sim/combat/tactical_group_lifecycle.js';
import {
    advanceSectorOffensives,
    evaluateOperationProgress,
    reevaluateWeakenedOperations,
} from '../src/sim/combat/sector_offensive.js';
import { reconcileFinalOperationTruth } from '../src/sim/combat/final_operation_truth_reconciliation.js';
import type { CorpsOperation, GameState, TacticalGroup } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

function makeOperation(name: string, type: CorpsOperation['type'] = 'sector_attack'): CorpsOperation {
    return {
        name,
        type,
        phase: 'planning',
        started_turn: 10,
        phase_started_turn: 10,
        participating_brigades: ['anchor_a'],
        objectives: ['op:enemy:objective'],
        current_objective_index: 0,
        planning_duration: 1,
        staging_osid: 'op:friendly:anchor_a',
    };
}

function makeTg(id: string, corpsId: string, opName: string, anchorId: string): TacticalGroup {
    return {
        id,
        corps_id: corpsId,
        op_id: opName,
        anchor_brigade_id: anchorId,
        donor_contributions: [],
        location_osid: 'op:stale:location',
        status: 'forming',
        formed_on_turn: 10,
        cohesion: 100,
    };
}

function makeLifecycleState(opA = makeOperation('Shared Name')): GameState {
    const opB = makeOperation('Shared Name');
    opB.participating_brigades = ['anchor_b'];
    opB.staging_osid = 'op:friendly:anchor_b';

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 12, phase: 'war', seed: 'tg-op-lifecycle' } as any,
        factions: [{ id: 'RBiH' }, { id: 'RS' }] as any,
        military: {
            formations: {
                corps_a: makeCorps({ id: 'corps_a', faction: 'RBiH', hq_sid: 'S1' }),
                corps_b: makeCorps({ id: 'corps_b', faction: 'RBiH', hq_sid: 'S2' }),
                anchor_a: makeFormation({
                    id: 'anchor_a', faction: 'RBiH', corps_id: 'corps_a', hq_sid: 'S1',
                    location_osid: 'op:friendly:anchor_a', personnel: 1200, cohesion: 70,
                }),
                anchor_b: makeFormation({
                    id: 'anchor_b', faction: 'RBiH', corps_id: 'corps_b', hq_sid: 'S2',
                    location_osid: 'op:friendly:anchor_b', personnel: 1200, cohesion: 70,
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
            tactical_groups: {
                tg_a: makeTg('tg_a', 'corps_a', opA.name, 'anchor_a'),
                tg_b: makeTg('tg_b', 'corps_b', opB.name, 'anchor_b'),
            },
            corps_front_sectors: {},
            war_front_edges_osid: [],
        } as any,
        political: {
            political_controllers: {
                'op:friendly:anchor_a': 'RBiH',
                'op:friendly:anchor_b': 'RBiH',
                'op:enemy:objective': 'RS',
            },
        } as any,
    } as GameState;
}

describe('Tactical Group operation lifecycle', () => {
    it('engages and relocates only TGs matching the composite host-corps and operation name', () => {
        const op = makeOperation('Shared Name');
        const state = makeLifecycleState(op);

        markOperationExecuting(state, 'corps_a', op);

        expect(state.military.tactical_groups?.tg_a).toMatchObject({
            status: 'engaged',
            location_osid: 'op:friendly:anchor_a',
        });
        expect(state.military.tactical_groups?.tg_b).toMatchObject({
            status: 'forming',
            location_osid: 'op:stale:location',
        });
    });

    it('recovery is idempotent and cannot dissolve a same-name TG hosted by another corps', () => {
        const op = makeOperation('Shared Name');
        op.phase = 'execution';
        const state = makeLifecycleState(op);

        enterOperationRecovery(state, 'corps_a', op, 15, 'brigade_attrition');
        const afterFirst = structuredClone(state);
        enterOperationRecovery(state, 'corps_a', op, 15, 'brigade_attrition');

        expect(state).toEqual(afterFirst);
        expect(op).toMatchObject({
            phase: 'recovery',
            phase_started_turn: 15,
            recovery_reason: 'brigade_attrition',
        });
        expect(state.military.tactical_groups?.tg_a).toBeUndefined();
        expect(state.military.tactical_groups?.tg_b).toBeDefined();
    });

    it('completion is idempotent and does not mutate an unlinked CorpsOperation', () => {
        const op = makeOperation('Shared Name');
        const state = makeLifecycleState(op);
        const before = structuredClone(op);

        completeOperationLifecycle(state, 'corps_a', op);
        completeOperationLifecycle(state, 'corps_a', op);

        expect(op).toEqual(before);
    });

    it('the sector-offensive execution site engages a pre-existing forming TG', () => {
        const op = makeOperation('Sector Execution');
        op.force_launch = true;
        op.preparation_sub_phase = 'ready';
        op.preparation_turns_elapsed = 1;
        op.preparation_max_turns = 1;
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.formations?.corps_b;
        delete state.military.formations?.anchor_b;
        delete state.military.tactical_groups?.tg_b;
        state.military.tactical_groups!.tg_a!.op_id = op.name;

        advanceSectorOffensives(state);

        expect(op.phase).toBe('execution');
        expect(state.military.tactical_groups?.tg_a).toMatchObject({
            status: 'engaged',
            location_osid: 'op:friendly:anchor_a',
        });
    });

    it('the general-operation execution site engages a pre-existing forming TG', () => {
        const op = makeOperation('General Execution', 'general_offensive');
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.formations?.corps_b;
        delete state.military.formations?.anchor_b;
        delete state.military.tactical_groups?.tg_b;
        state.military.tactical_groups!.tg_a!.op_id = op.name;
        state.meta.turn = 13;

        evaluateOperationProgress(state, 'RBiH');

        expect(op.phase).toBe('execution');
        expect(state.military.tactical_groups?.tg_a).toMatchObject({
            status: 'engaged',
            location_osid: 'op:friendly:anchor_a',
        });
    });

    it('routes weakened-operation attrition recovery through TG closeout', () => {
        const op = makeOperation('Weakened Recovery');
        op.phase = 'execution';
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.tactical_groups?.tg_b;
        state.military.tactical_groups!.tg_a!.op_id = op.name;
        state.military.formations!.anchor_a!.status = 'inactive';

        reevaluateWeakenedOperations(state);

        expect(op).toMatchObject({
            phase: 'recovery',
            recovery_reason: 'brigade_attrition',
            force_launch: false,
        });
        expect(state.military.tactical_groups?.tg_a).toBeUndefined();
    });

    it('routes final-truth empty-roster recovery through TG closeout', () => {
        const op = makeOperation('Final Truth Recovery');
        op.phase = 'execution';
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.tactical_groups?.tg_b;
        state.military.tactical_groups!.tg_a!.op_id = op.name;
        state.military.formations!.anchor_a!.status = 'inactive';

        reconcileFinalOperationTruth(state);

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'brigade_attrition' });
        expect(state.military.tactical_groups?.tg_a).toBeUndefined();
    });

    it('routes every production phase writer through the canonical lifecycle hooks', () => {
        const sectorSource = readFileSync(resolve('src/sim/combat/sector_offensive.ts'), 'utf8');
        const weakenedSource = sectorSource.slice(
            sectorSource.indexOf('export function reevaluateWeakenedOperations'),
            sectorSource.indexOf('/** Append a reevaluation log entry'),
        );
        const progressSource = sectorSource.slice(sectorSource.indexOf('export function evaluateOperationProgress'));
        const finalSource = readFileSync(resolve('src/sim/combat/final_operation_truth_reconciliation.ts'), 'utf8');
        const corpsSource = readFileSync(resolve('src/sim/combat/corps_command.ts'), 'utf8');

        expect(sectorSource.match(/markOperationExecuting\(state, corps(?:Id|\.id), op\)/g)).toHaveLength(2);
        expect(weakenedSource).not.toMatch(/op\.phase\s*=\s*'recovery'/);
        expect(progressSource).not.toMatch(/op\.phase\s*=\s*'recovery'/);
        expect(finalSource).not.toMatch(/operation\.phase\s*=\s*'recovery'/);
        expect(corpsSource).toContain("if (op.type !== 'reorganization') continue;");
    });
});
