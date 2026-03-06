import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { injectPrePlannedOperations, _VRS_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { CorpsCommandState, FactionId, FormationState, GameState } from '../src/state/game_state.js';

function makeMinimalState(): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    const defs = _VRS_PRE_PLANNED;
    for (const def of defs) {
        formations[def.corps] = {
            id: def.corps,
            name: def.corps,
            faction: 'RS' as FactionId,
            kind: 'corps',
            status: 'active',
            personnel: 0,
        } as FormationState;
        corpsCommand[def.corps] = {
            command_span: 5,
            subordinate_count: def.participating_brigades.length,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
        };
        for (const brigadeId of def.participating_brigades) {
            formations[brigadeId] = {
                id: brigadeId,
                name: brigadeId,
                faction: 'RS' as FactionId,
                kind: 'brigade',
                status: 'active',
                personnel: 1000,
                corps_id: def.corps,
                location_osid: def.staging_osid,
            } as FormationState;
        }
    }

    const politicalControllers: Record<string, string> = {};
    for (const def of defs) {
        politicalControllers[def.staging_osid] = 'RS';
        for (const osid of def.target_osids) {
            politicalControllers[osid] = 'RBiH';
        }
    }

    return {
        meta: {
            turn: 0,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }] as GameState['factions'],
        formations,
        corps_command: corpsCommand,
        political_controllers: politicalControllers,
    } as GameState;
}

describe('pre-planned VRS operations', () => {
    it('defines five explicit opening operations', () => {
        assert.equal(_VRS_PRE_PLANNED.length, 5);
        for (const def of _VRS_PRE_PLANNED) {
            if (def.sector_id !== undefined) {
                assert.ok(def.sector_id.startsWith('sector:'), `${def.corps} sector_id must stay in sector namespace`);
            }
            assert.ok(def.participating_brigades.length >= 2, `${def.corps} should have explicit brigade roster`);
        }
    });

    it('injects explicit rosters and staging OSIDs, allowing sector resolution at runtime', () => {
        const state = makeMinimalState();
        injectPrePlannedOperations(state);

        for (const def of _VRS_PRE_PLANNED) {
            const op = state.corps_command?.[def.corps]?.active_operation;
            assert.ok(op, `${def.corps} should receive an opening operation`);
            assert.equal(op?.name, def.name);
            assert.equal(op?.type, 'sector_attack');
            assert.equal(op?.phase, 'planning');
            assert.equal(op?.sector_id, def.sector_id);
            assert.equal(op?.staging_osid, def.staging_osid);
            assert.deepEqual(op?.participating_brigades, [...def.participating_brigades].sort());
            assert.deepEqual(op?.objectives, def.target_osids);
        }
    });

    it('filters out already RS-controlled objectives without dropping the operation', () => {
        const state = makeMinimalState();
        state.political_controllers!['op:zvornik:novo_selo'] = 'RS';

        injectPrePlannedOperations(state);

        const drina = state.corps_command?.vrs_drina?.active_operation;
        assert.ok(drina);
        assert.deepEqual(drina?.objectives, [
            'op:bratunac:bratunac_2',
            'op:zvornik:zvornik',
        ]);
    });
});
