import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    completeOperationLifecycle,
    enterOperationRecovery,
    evaluateOperationTacticalGroupExhaustion,
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
            cohesion: 100,
        });
        expect(state.military.tactical_groups?.tg_a?.last_exhaustion_tick_turn).toBeUndefined();
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
            cohesion: 100,
        });
        expect(state.military.tactical_groups?.tg_a?.last_exhaustion_tick_turn).toBeUndefined();
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

    it('classifies a general-operation success threshold as completed', () => {
        const op = makeOperation('General Success', 'general_offensive');
        op.phase = 'execution';
        op.phase_started_turn = 10;
        op.target_settlements = ['op:target:captured', 'op:target:open'];
        op.attack_attempt_count = 1;
        const state = makeLifecycleState(op);
        state.political.political_controllers!['op:target:captured'] = 'RBiH';
        state.political.political_controllers!['op:target:open'] = 'RS';

        evaluateOperationProgress(state, 'RBiH');

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'completed' });
    });

    it('routes sector-owner cohesion exhaustion through canonical recovery before other execution work', () => {
        const op = makeOperation('Sector TG Exhaustion');
        op.phase = 'execution';
        op.phase_started_turn = 11;
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.formations?.corps_b;
        delete state.military.formations?.anchor_b;
        delete state.military.tactical_groups?.tg_b;
        const tg = state.military.tactical_groups!.tg_a!;
        tg.op_id = op.name;
        tg.status = 'engaged';
        tg.cohesion = 15;

        advanceSectorOffensives(state);

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'tg_cohesion_exhausted' });
        expect(state.military.tactical_groups?.tg_a).toBeUndefined();
    });

    it('routes general-owner lifecycle exhaustion through canonical recovery before progress checks', () => {
        const op = makeOperation('General TG Duration', 'strategic_defense');
        op.phase = 'execution';
        op.phase_started_turn = 0;
        op.target_settlements = ['op:enemy:objective'];
        const state = makeLifecycleState(op);
        delete state.military.corps_command?.corps_b;
        delete state.military.formations?.corps_b;
        delete state.military.formations?.anchor_b;
        delete state.military.tactical_groups?.tg_b;
        const tg = state.military.tactical_groups!.tg_a!;
        tg.op_id = op.name;
        tg.status = 'engaged';

        evaluateOperationProgress(state, 'RBiH');

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'tg_max_lifecycle' });
        expect(state.military.tactical_groups?.tg_a).toBeUndefined();
    });

    it('classifies a partial general-operation execution timeout as max failures', () => {
        const op = makeOperation('General Partial Timeout', 'general_offensive');
        op.phase = 'execution';
        op.phase_started_turn = 6;
        op.target_settlements = ['op:target:captured', 'op:target:open-a', 'op:target:open-b'];
        op.attack_attempt_count = 2;
        const state = makeLifecycleState(op);
        state.political.political_controllers!['op:target:captured'] = 'RBiH';
        state.political.political_controllers!['op:target:open-a'] = 'RS';
        state.political.political_controllers!['op:target:open-b'] = 'RS';

        evaluateOperationProgress(state, 'RBiH');

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'max_failures' });
    });

    it('classifies a no-attempt general-operation execution timeout as no logged attempt', () => {
        const op = makeOperation('General No-Attempt Timeout', 'general_offensive');
        op.phase = 'execution';
        op.phase_started_turn = 6;
        op.target_settlements = ['op:target:open-a', 'op:target:open-b'];
        op.attack_attempt_count = 0;
        const state = makeLifecycleState(op);
        state.political.political_controllers!['op:target:open-a'] = 'RS';
        state.political.political_controllers!['op:target:open-b'] = 'RS';

        evaluateOperationProgress(state, 'RBiH');

        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'no_logged_attempt' });
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

    it('does not drain forming groups and drains an engaged group once per future unsuppressed turn', () => {
        const op = makeOperation('Exhaustion Clock');
        op.phase = 'execution';
        op.phase_started_turn = 12;
        const state = makeLifecycleState(op);
        delete state.military.tactical_groups?.tg_b;
        const tg = state.military.tactical_groups!.tg_a!;
        tg.op_id = op.name;

        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 13)).toBeNull();
        expect(tg).toMatchObject({ status: 'forming', cohesion: 100 });
        expect(tg.last_exhaustion_tick_turn).toBeUndefined();

        markOperationExecuting(state, 'corps_a', op);
        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 13)).toBeNull();
        expect(tg).toMatchObject({ cohesion: 96, last_exhaustion_tick_turn: 13 });

        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 13)).toBeNull();
        expect(tg).toMatchObject({ cohesion: 96, last_exhaustion_tick_turn: 13 });

        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 14)).toBeNull();
        expect(tg).toMatchObject({ cohesion: 92, last_exhaustion_tick_turn: 14 });

        tg.cohesion = 104;
        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 15)).toBeNull();
        expect(tg).toMatchObject({ cohesion: 100, last_exhaustion_tick_turn: 15 });
    });

    it('uses strict cohesion threshold, checks preloaded exhaustion before age, and ages from execution start', () => {
        const op = makeOperation('Strict Thresholds');
        op.phase = 'execution';
        op.phase_started_turn = 20;
        const state = makeLifecycleState(op);
        delete state.military.tactical_groups?.tg_b;
        const tg = state.military.tactical_groups!.tg_a!;
        tg.op_id = op.name;
        tg.status = 'engaged';

        tg.cohesion = 19;
        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 21)).toBeNull();
        expect(tg.cohesion).toBe(15);

        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 22)).toBe('tg_cohesion_exhausted');
        expect(tg.cohesion).toBe(11);

        tg.cohesion = 14;
        delete tg.last_exhaustion_tick_turn;
        op.phase_started_turn = 8;
        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 22)).toBe('tg_cohesion_exhausted');
        expect(tg.cohesion).toBe(14);
        expect(tg.last_exhaustion_tick_turn).toBeUndefined();

        tg.cohesion = 100;
        expect(evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 20)).toBe('tg_max_lifecycle');
        expect(tg.cohesion).toBe(100);
        expect(tg.last_exhaustion_tick_turn).toBeUndefined();
    });

    it('pauses exhaustion under COHA and resumes on the first unsuppressed War turn', () => {
        const op = makeOperation('COHA Pause');
        op.phase = 'execution';
        op.phase_started_turn = 12;
        const state = makeLifecycleState(op);
        delete state.military.tactical_groups?.tg_b;
        delete state.military.corps_command?.corps_b;
        delete state.military.formations?.corps_b;
        delete state.military.formations?.anchor_b;
        const tg = state.military.tactical_groups!.tg_a!;
        tg.op_id = op.name;
        tg.status = 'engaged';
        state.military.event_flags = { coha_active: true } as any;
        state.meta.turn = 13;

        advanceSectorOffensives(state);
        expect(tg).toMatchObject({ cohesion: 100 });
        expect(tg.last_exhaustion_tick_turn).toBeUndefined();
        expect(op.phase_started_turn).toBe(13);

        state.military.event_flags!.coha_active = false;
        state.meta.turn = 14;
        advanceSectorOffensives(state);
        expect(tg).toMatchObject({ cohesion: 96, last_exhaustion_tick_turn: 14 });
    });

    it('returns the first sorted multi-group result and recovery atomically dissolves every sibling once', () => {
        const op = makeOperation('Multi TG');
        op.phase = 'execution';
        op.phase_started_turn = 20;
        op.army_hq_op_id = 'ahq:RBiH:multi';
        const state = makeLifecycleState(op);
        delete state.military.tactical_groups?.tg_b;
        const first = makeTg('tg:a', 'corps_a', op.name, 'anchor_a');
        const second = makeTg('tg:z', 'corps_a', op.name, 'anchor_a');
        first.army_hq_op_id = op.army_hq_op_id;
        second.army_hq_op_id = op.army_hq_op_id;
        first.status = 'engaged';
        second.status = 'engaged';
        first.cohesion = 15;
        second.cohesion = 14;
        state.military.tactical_groups = { [second.id]: second, [first.id]: first };
        state.military.army_hq_operations = {
            [op.army_hq_op_id]: {
                id: op.army_hq_op_id,
                faction_id: 'RBiH',
                name: op.name,
                anchor_corps_id: 'corps_a',
                donor_corps_ids: [],
                tg_id: second.id,
                status: 'executing',
                formed_on_turn: 20,
                scenario_year: 0,
            },
        };

        const reason = evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 21);
        expect(reason).toBe('tg_cohesion_exhausted');
        expect(first.cohesion).toBe(15);
        expect(second.cohesion).toBe(14);

        enterOperationRecovery(state, 'corps_a', op, 21, reason!);
        const afterFirst = structuredClone(state);
        enterOperationRecovery(state, 'corps_a', op, 21, reason!);

        expect(state).toEqual(afterFirst);
        expect(state.military.tactical_groups).toEqual({});
        expect(op).toMatchObject({ phase: 'recovery', recovery_reason: 'tg_cohesion_exhausted' });
        expect(op.army_hq_telemetry_snapshot).toEqual({
            army_hq_op_id: op.army_hq_op_id,
            anchor_corps_id: 'corps_a',
            donor_corps_lineage: [],
            cross_corps_donor_count: 0,
            total_cohesion_bled: 0,
        });
        expect(state.military.army_hq_operations[op.army_hq_op_id]).toMatchObject({
            status: 'recovering',
            recovery_started_turn: 21,
        });
    });

    it('drains every eligible sibling before one recovery and is invariant to record insertion order', () => {
        function run(insertionOrder: readonly ('tg:a' | 'tg:z')[]) {
            const op = makeOperation('Atomic Multi TG');
            op.phase = 'execution';
            op.phase_started_turn = 20;
            op.army_hq_op_id = 'ahq:RBiH:atomic';
            const state = makeLifecycleState(op);
            const groups = {
                'tg:a': makeTg('tg:a', 'corps_a', op.name, 'anchor_a'),
                'tg:z': makeTg('tg:z', 'corps_a', op.name, 'anchor_a'),
            };
            groups['tg:a'].army_hq_op_id = op.army_hq_op_id;
            groups['tg:z'].army_hq_op_id = op.army_hq_op_id;
            groups['tg:a'].status = 'engaged';
            groups['tg:z'].status = 'engaged';
            groups['tg:a'].cohesion = 15;
            groups['tg:z'].cohesion = 100;
            state.military.tactical_groups = Object.fromEntries(
                insertionOrder.map((id) => [id, groups[id]]),
            );
            state.military.army_hq_operations = {
                [op.army_hq_op_id]: {
                    id: op.army_hq_op_id,
                    faction_id: 'RBiH',
                    name: op.name,
                    anchor_corps_id: 'corps_a',
                    donor_corps_ids: [],
                    status: 'executing',
                    formed_on_turn: 20,
                    scenario_year: 0,
                },
            };

            const reason = evaluateOperationTacticalGroupExhaustion(state, 'corps_a', op, 21);
            const beforeRecovery = {
                'tg:a': structuredClone(state.military.tactical_groups!['tg:a']),
                'tg:z': structuredClone(state.military.tactical_groups!['tg:z']),
            };
            enterOperationRecovery(state, 'corps_a', op, 21, reason!);
            return {
                reason,
                beforeRecovery,
                liveTacticalGroups: state.military.tactical_groups,
                operation: op,
                armyHq: state.military.army_hq_operations[op.army_hq_op_id],
            };
        }

        const forward = run(['tg:a', 'tg:z']);
        const reverse = run(['tg:z', 'tg:a']);

        expect(reverse).toEqual(forward);
        expect(forward.reason).toBe('tg_cohesion_exhausted');
        expect(forward.beforeRecovery['tg:a']).toMatchObject({
            cohesion: 11,
            last_exhaustion_tick_turn: 21,
        });
        expect(forward.beforeRecovery['tg:z']).toMatchObject({
            cohesion: 96,
            last_exhaustion_tick_turn: 21,
        });
        expect(forward.liveTacticalGroups).toEqual({});
        expect(forward.operation.recovery_reason).toBe('tg_cohesion_exhausted');
        expect(forward.armyHq).toMatchObject({ status: 'recovering', recovery_started_turn: 21 });
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
        expect(sectorSource.match(/evaluateOperationTacticalGroupExhaustion\(state, corps(?:Id|\.id), op, turn\)/g)).toHaveLength(2);
        expect(sectorSource.match(/case 'tg_cohesion_exhausted':/g)).toHaveLength(2);
        expect(sectorSource.match(/case 'tg_max_lifecycle':/g)).toHaveLength(2);
        expect(weakenedSource).not.toMatch(/op\.phase\s*=\s*'recovery'/);
        expect(progressSource).not.toMatch(/op\.phase\s*=\s*'recovery'/);
        expect(finalSource).not.toMatch(/operation\.phase\s*=\s*'recovery'/);
        expect(corpsSource).toContain("if (op.type !== 'reorganization') continue;");
    });
});
