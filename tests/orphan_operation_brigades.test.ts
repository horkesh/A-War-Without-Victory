import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { checkOrphanOperationBrigades } from '../src/scenario/anomaly_checks_extended.js';

function makeState(objectiveOsid: string): GameState {
    return {
        meta: { turn: 40, phase: 'war', seed: 'orphan-op-test' },
        military: {
            formations: {
                rs_brigade: {
                    id: 'rs_brigade',
                    name: 'RS Brigade',
                    faction: 'RS',
                    corps_id: 'vrs_test_corps',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1500,
                    location_osid: 'op:brcko:potocari_2',
                },
            },
            corps_command: {
                vrs_test_corps: {
                    active_operations: [{
                        name: 'Test Operation',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 33,
                        phase_started_turn: 33,
                        participating_brigades: ['rs_brigade'],
                        objectives: [objectiveOsid],
                        current_objective_index: 0,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                    }],
                },
            },
        },
        political: {
            political_controllers: {
                'op:brcko:potocari_2': 'RS',
                'op:brcko:boce_2': 'RBiH',
                [objectiveOsid]: 'RBiH',
            },
        },
        displacement: {},
    } as unknown as GameState;
}

describe('orphan operation brigade anomaly contract', () => {
    it('does not flag a brigade adjacent to an enemy-held objective as orphaned', () => {
        const reports = checkOrphanOperationBrigades(makeState('op:brcko:boce_2'));

        assert.deepEqual(reports, []);
    });

    it('still flags brigades that are genuinely unreachable from the operation objective', () => {
        const reports = checkOrphanOperationBrigades(makeState('op:gorazde:faocici_2'));

        assert.equal(reports.length, 1);
        assert.equal(reports[0]?.type, 'orphan_operation_brigades');
    });

    it('does not flag a brigade already inside the anchored sector territory', () => {
        const state = makeState('op:gorazde:faocici_2');
        state.military.corps_command!.vrs_test_corps!.active_operations[0]!.sector_id = 'sector:vrs_test_corps:0';
        state.military.corps_front_sectors = {
            'sector:vrs_test_corps:0': {
                sector_id: 'sector:vrs_test_corps:0',
                corps_id: 'vrs_test_corps',
                territory_osids: ['op:brcko:potocari_2'],
                sub_segments: [{
                    friendly_osids: ['op:brcko:potocari_2'],
                    enemy_osids: ['op:gorazde:faocici_2'],
                }],
            } as any,
        } as any;

        const reports = checkOrphanOperationBrigades(state);

        assert.deepEqual(reports, []);
    });
});
