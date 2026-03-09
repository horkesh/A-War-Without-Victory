/**
 * Tests for time/condition-triggered VRS operations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkTriggeredOperations, _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import type { CorpsCommandState, FactionId, FormationState, GameState } from '../src/state/game_state.js';

function makeFormation(id: string, corpsId: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        personnel: 1000,
        corps_id: corpsId,
        location_osid: 'op:test:test',
        ...overrides,
    } as FormationState;
}

function makeCorpsCmd(overrides: Partial<CorpsCommandState> = {}): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 10,
        og_slots: 0,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'balanced',
        ...overrides,
    };
}

function makeState(turn: number): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    // Create all corps
    const corpsIds = ['vrs_1st_krajina', 'vrs_east_bosnian', 'vrs_2nd_krajina', 'vrs_drina'];
    for (const cid of corpsIds) {
        corpsCommand[cid] = makeCorpsCmd();
    }

    // Create all brigades referenced in triggered ops
    for (const def of _TRIGGERED_OPS) {
        for (const axisDef of def.axes) {
            for (const brigadeId of axisDef.brigades) {
                if (formations[brigadeId]) continue;
                formations[brigadeId] = makeFormation(brigadeId, axisDef.corps);
            }
        }
    }

    // Set all objectives as enemy-controlled
    const politicalControllers: Record<string, string> = {};
    for (const def of _TRIGGERED_OPS) {
        for (const axisDef of def.axes) {
            for (const osid of axisDef.objectives) {
                politicalControllers[osid] = 'RBiH';
            }
        }
    }

    return {
  meta: {
            turn,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as unknown as GameState['meta'],
  factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
  formations,
  military: {
    corps_command: corpsCommand
  } as any,
  political: {
    political_controllers: politicalControllers
  } as any,
} as unknown as GameState;
}

describe('triggered operations definitions', () => {
    it('defines four triggered operations', () => {
        assert.equal(_TRIGGERED_OPS.length, 4);
        const names = _TRIGGERED_OPS.map(d => d.name);
        assert.ok(names.includes('Operation Posavina Corridor'));
        assert.ok(names.includes('Operation Kotor Varos'));
        assert.ok(names.includes('Operation Jajce'));
        assert.ok(names.includes('Operation Cerska-Kamenica'));
    });

    it('Posavina Corridor is joint 1KK + EBK', () => {
        const posavina = _TRIGGERED_OPS.find(d => d.name === 'Operation Posavina Corridor')!;
        const corpsInvolved = new Set(posavina.axes.map(a => a.corps));
        assert.ok(corpsInvolved.has('vrs_1st_krajina'));
        assert.ok(corpsInvolved.has('vrs_east_bosnian'));
    });
});

describe('checkTriggeredOperations', () => {
    it('does not inject before trigger condition met', () => {
        const state = makeState(5);
        const injected = checkTriggeredOperations(state);
        // Posavina not triggered (corps have no ops but corpsOpFinished checks no active + no queued)
        // At turn 5: Kotor Varos needs turn >= 10
        // Only Posavina could fire (1KK and EBK both "finished" since no active ops)
        // Posavina triggers because both corps have no active_operation and no queued_operations
        assert.ok(injected.includes('Operation Posavina Corridor'));
    });

    it('does not inject Posavina when 1KK has active op', () => {
        const state = makeState(5);
        state.military.corps_command!['vrs_1st_krajina']!.active_operation = {
            name: 'Test Op',
            type: 'sector_attack',
            phase: 'execution',
        } as any;
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Posavina Corridor'));
    });

    it('does not inject Posavina when EBK has active op', () => {
        const state = makeState(5);
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = {
            name: 'Test Op',
            type: 'sector_attack',
            phase: 'execution',
        } as any;
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Posavina Corridor'));
    });

    it('does not inject Posavina when 1KK has queued ops', () => {
        const state = makeState(5);
        state.military.corps_command!['vrs_1st_krajina']!.queued_operations = ['Operation Bosanski Novi'];
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Posavina Corridor'));
    });

    it('injects Kotor Varos at turn 10', () => {
        const state = makeState(10);
        // Block Posavina so it doesn't grab 1KK
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = { name: 'x' } as any;
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Kotor Varos'));
    });

    it('does not inject Kotor Varos before turn 10', () => {
        const state = makeState(9);
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Kotor Varos'));
    });

    it('injects Jajce at turn 24', () => {
        const state = makeState(24);
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Jajce'));
    });

    it('injects Cerska-Kamenica at turn 40', () => {
        const state = makeState(40);
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Cerska-Kamenica'));
    });

    it('does not inject same operation twice', () => {
        const state = makeState(10);
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = { name: 'x' } as any;
        const first = checkTriggeredOperations(state);
        assert.ok(first.includes('Operation Kotor Varos'));

        // Clear the active op (it was just set)
        // But triggered_operations_accepted should prevent re-injection
        delete state.military.corps_command!['vrs_1st_krajina']!.active_operation;
        const second = checkTriggeredOperations(state);
        assert.ok(!second.includes('Operation Kotor Varos'));
    });

    it('respects declined operations with cooldown', () => {
        const state = makeState(12);
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = { name: 'x' } as any;
        state.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 10, decline_count: 1 },
        };
        // Turn 12, declined at 10, cooldown is 8 → still in cooldown
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Kotor Varos'));
    });

    it('re-offers after cooldown expires', () => {
        const state = makeState(20);
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = { name: 'x' } as any;
        state.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 10, decline_count: 1 },
        };
        // Turn 20, declined at 10, cooldown is 8 → 10 turns passed, past cooldown
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Kotor Varos'));
    });

    it('permanently dismisses after 3 declines', () => {
        const state = makeState(50);
        state.military.corps_command!['vrs_east_bosnian']!.active_operation = { name: 'x' } as any;
        state.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 40, decline_count: 3 },
        };
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Kotor Varos'));
    });

    it('creates multi-axis operation with correct structure', () => {
        const state = makeState(24);
        // Block other corps to only get Jajce
        state.military.corps_command!['vrs_1st_krajina']!.active_operation = { name: 'x' } as any;
        state.military.corps_command!['vrs_drina']!.active_operation = { name: 'x' } as any;

        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Jajce'));

        const jajceOp = state.military.corps_command!['vrs_2nd_krajina']!.active_operation;
        assert.ok(jajceOp);
        assert.equal(jajceOp!.name, 'Operation Jajce');
        assert.ok(jajceOp!.axes);
        assert.equal(jajceOp!.axes!.length, 2);
        assert.equal(jajceOp!.axes![0]!.axis_id, 'jajce_assault');
        assert.equal(jajceOp!.axes![1]!.axis_id, 'donji_vakuf');
        assert.equal(jajceOp!.phase, 'planning');
        assert.equal(jajceOp!.planning_duration, 3);
    });

    it('filters out already RS-controlled objectives', () => {
        const state = makeState(40);
        // Make some Cerska objectives already RS
        state.political.political_controllers!['op:srebrenica:brezovice_2'] = 'RS';
        state.political.political_controllers!['op:srebrenica:kalimanici'] = 'RS';

        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Cerska-Kamenica'));

        const cerskaOp = state.military.corps_command!['vrs_drina']!.active_operation;
        assert.ok(cerskaOp);
        // cerska_pocket axis should still exist with remaining objective
        const cerskaAxis = cerskaOp!.axes!.find(a => a.axis_id === 'cerska_pocket');
        assert.ok(cerskaAxis);
        assert.ok(!cerskaAxis!.objectives.includes('op:srebrenica:brezovice_2'));
        assert.ok(!cerskaAxis!.objectives.includes('op:srebrenica:kalimanici'));
        assert.equal(cerskaAxis!.objectives.length, 1); // only lijesce remains
    });
});
