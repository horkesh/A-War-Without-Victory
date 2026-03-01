/**
 * Tests for pre-planned VRS operations injection.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { injectPrePlannedOperations, _VRS_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { GameState, FactionId, FormationState, CorpsCommandState } from '../src/state/game_state.js';

function makeMinimalState(): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    // Create 5 VRS corps + brigades
    const corpsIds = [
        'vrs_east_bosnian', 'vrs_drina', 'vrs_sarajevo_romanija',
        'vrs_herzegovina', 'vrs_1st_krajina',
    ];
    for (const corpsId of corpsIds) {
        formations[corpsId] = {
            id: corpsId, name: corpsId, faction: 'RS' as FactionId,
            kind: 'corps', status: 'active', personnel: 0,
        } as FormationState;
        corpsCommand[corpsId] = {
            command_span: 5, subordinate_count: 4, og_slots: 0,
            active_ogs: [], corps_exhaustion: 0, stance: 'balanced',
        };
        // Add 4 brigades per corps
        for (let i = 0; i < 4; i++) {
            const brigId = `${corpsId}_brig_${i}`;
            formations[brigId] = {
                id: brigId, name: brigId, faction: 'RS' as FactionId,
                kind: 'brigade', status: 'active', personnel: 2000,
                corps_id: corpsId, location_osid: `op:some_mun:loc_${i}`,
            } as FormationState;
        }
    }

    // Create political_controllers with enemy OSIDs in target muns
    const pc: Record<string, string> = {};
    const targetMuns = [
        'brcko', 'bosanski_samac', 'modrica',
        'zvornik', 'bratunac', 'vlasenica',
        'ilidza', 'hadzici', 'vogosca', 'ilijas',
        'foca', 'cajnice', 'kalinovik',
        'prijedor', 'sanski_most', 'kljuc',
    ];
    for (const mun of targetMuns) {
        for (let i = 0; i < 3; i++) {
            pc[`op:${mun}:target_${i}`] = 'RBiH';
        }
    }
    // Also some RS-held OSIDs
    pc['op:brcko:rs_held_1'] = 'RS';
    pc['op:prijedor:rs_held_1'] = 'RS';

    return {
        meta: { turn: 0, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }] as GameState['factions'],
        formations,
        corps_command: corpsCommand,
        political_controllers: pc,
    } as GameState;
}

describe('Pre-Planned VRS Operations', () => {
    it('defines 5 pre-planned operations', () => {
        assert.equal(_VRS_PRE_PLANNED.length, 5);
    });

    it('injects 5 operations into corps_command', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const corpsWithOps = Object.keys(state.corps_command!)
            .filter(cid => state.corps_command![cid]!.active_operation);
        assert.equal(corpsWithOps.length, 5, `Expected 5 corps with ops, got ${corpsWithOps.length}`);
    });

    it('all operations are type sector_attack in execution phase', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        for (const cid of Object.keys(state.corps_command!)) {
            const op = state.corps_command![cid]!.active_operation;
            if (!op) continue;
            assert.equal(op.type, 'sector_attack');
            assert.equal(op.phase, 'execution');
            assert.equal(op.started_turn, 0);
        }
    });

    it('sets corps stances to offensive', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const expectedCorps = [
            'vrs_east_bosnian', 'vrs_drina', 'vrs_sarajevo_romanija',
            'vrs_herzegovina', 'vrs_1st_krajina',
        ];
        for (const cid of expectedCorps) {
            assert.equal(state.corps_command![cid]!.stance, 'offensive',
                `${cid} should be offensive`);
        }
    });

    it('operations have correct names', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const expectedNames: Record<string, string> = {
            vrs_east_bosnian: 'Operacija Koridor',
            vrs_drina: 'Operacija Drina',
            vrs_sarajevo_romanija: 'Operacija Prsten',
            vrs_herzegovina: 'Operacija Foca',
            vrs_1st_krajina: 'Operacija Prijedor',
        };

        for (const [cid, expectedName] of Object.entries(expectedNames)) {
            const op = state.corps_command![cid]!.active_operation;
            assert.ok(op, `${cid} should have an operation`);
            assert.equal(op!.name, expectedName, `${cid} op name`);
        }
    });

    it('skips corps with existing active operation', () => {
        const state = makeMinimalState();
        // Set an existing operation on east_bosnian
        state.corps_command!['vrs_east_bosnian']!.active_operation = {
            name: 'Existing Op', type: 'sector_attack', phase: 'execution',
            started_turn: 0, phase_started_turn: 0, participating_brigades: [],
        };
        injectPrePlannedOperations(state);

        assert.equal(state.corps_command!['vrs_east_bosnian']!.active_operation!.name,
            'Existing Op', 'Should not overwrite existing op');
        // Other 4 should still get ops
        const opsCount = Object.values(state.corps_command!)
            .filter(c => c.active_operation).length;
        assert.equal(opsCount, 5);
    });

    it('objectives only include enemy-held OSIDs in target municipalities', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        const op = state.corps_command!['vrs_east_bosnian']!.active_operation!;
        assert.ok(op.objectives!.length > 0, 'Should have objectives');
        for (const obj of op.objectives!) {
            assert.ok(!obj.includes('rs_held'), `Objective ${obj} should not be RS-held`);
            const mun = obj.split(':')[1];
            assert.ok(['brcko', 'bosanski_samac', 'modrica'].includes(mun!),
                `Objective ${obj} should be in target municipality`);
        }
    });
});
