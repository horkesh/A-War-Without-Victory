/**
 * CODE3 (2026-11-16): a scripted (pre-planned) operation the President halts stays halted.
 *
 * The player-faction pre-planned injection runs every week and re-queues any authored operation
 * that is neither active, queued nor resolved. A halt removes the operation and writes no AAR, so
 * before this fix a halted operation was queued again the next week: the President paid 25 Authority
 * and the operation came back. A halt now counts as the operation's resolution (one authored
 * operation is one attempt). Halts are player-only, so headless runs are unchanged.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { _ALL_PRE_PLANNED, injectPrePlannedOperations } from '../src/sim/combat/pre_planned_operations.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { CorpsCommandState, CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';

const CORPS_ID = 'arbih_1st_corps';
const VISOKO = _ALL_PRE_PLANNED.find((def) => def.name === 'Visoko–Breza Line Clearing');
assert.ok(VISOKO);

function makeState(activeOps: CorpsOperation[]): GameState {
    const defs = _ALL_PRE_PLANNED.filter((def) => def.corps === CORPS_ID && def.faction === 'RBiH');
    const formations: Record<string, FormationState> = {};
    const assigned: string[] = [];
    const controllers: Record<string, string> = {};
    for (const def of defs) {
        controllers[def.staging_osid] = 'RBiH';
        for (const axis of def.axes) {
            if (axis.staging_osid) controllers[axis.staging_osid] = 'RBiH';
            for (const osid of axis.objectives) controllers[osid] = 'RS';
            for (const id of axis.brigades) {
                if (formations[id]) continue;
                formations[id] = {
                    id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1000,
                    corps_id: CORPS_ID, location_osid: axis.staging_osid ?? def.staging_osid,
                } as FormationState;
                assigned.push(id);
            }
        }
    }
    const command: CorpsCommandState = {
        command_span: 5, subordinate_count: 10, og_slots: 0, active_ogs: [],
        active_operations: activeOps, corps_exhaustion: 0, stance: 'balanced',
    };
    return {
        meta: { turn: 20, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test', patron_confidence: 50 },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations,
            named_officers: {},
            corps_command: { [CORPS_ID]: command },
            corps_front_sectors: {
                [`sector:${CORPS_ID}:0`]: {
                    sector_id: `sector:${CORPS_ID}:0`, corps_id: CORPS_ID, assigned_brigade_ids: assigned,
                    reserve_brigade_ids: [], length_edges: 1, territory_osids: [],
                },
            },
        },
        political: { political_controllers: controllers },
    } as unknown as GameState;
}

function op(name: string, phase: CorpsOperation['phase']): CorpsOperation {
    return {
        name, type: 'sector_attack', phase, is_pre_planned: true, started_turn: 18, phase_started_turn: 18,
        participating_brigades: [], objectives: [], current_objective_index: 0, momentum: 0, failure_count: 0,
        consecutive_failures_on_current: 0, attack_attempt_count: 0, objective_capture_count: 0,
        movement_only_execution_turns: 0,
    } as CorpsOperation;
}

const APPLY_OP_HALTS = warPhases.find((p) => p.name === 'apply-op-halts')!;

describe('CODE3: a halted scripted operation is not re-queued', () => {
    for (const phase of ['planning', 'execution'] as const) {
        it(`halting it in ${phase} removes it, and next week's injection does not queue it again`, () => {
            const state = makeState([op(VISOKO.name, phase)]);
            const command = state.military.corps_command![CORPS_ID]!;
            command.pending_op_halt = { op_name: VISOKO.name, turn: 20, ca_cost: 25 } as CorpsCommandState['pending_op_halt'];

            APPLY_OP_HALTS.run({ state } as never);
            assert.equal(command.active_operations.some((o) => o.name === VISOKO.name), false, 'the halt removes the operation');
            assert.equal(command.halted_op_record?.[0]?.op_name, VISOKO.name);

            state.meta.turn = 21;
            injectPrePlannedOperations(state, undefined, { faction: VISOKO.faction });

            assert.equal(command.queued_operations?.includes(VISOKO.name) ?? false, false, 'a halted operation must not return to the queue');
            assert.equal(command.active_operations.some((o) => o.name === VISOKO.name), false, 'nor be injected again');
        });
    }

    it('an operation that was never halted is still queued (the guard is specific to the halt)', () => {
        const state = makeState([op('Blocking Operation', 'execution')]);
        injectPrePlannedOperations(state, undefined, { faction: VISOKO.faction });
        assert.equal(state.military.corps_command![CORPS_ID]!.queued_operations?.includes(VISOKO.name), true);
    });
});
