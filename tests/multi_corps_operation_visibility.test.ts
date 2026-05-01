/**
 * Multi-corps operation visibility — engine contract.
 *
 * Bug captured by this test (pre-fix):
 *   `triggered_operations.ts:checkTriggeredOperations` pushes a triggered
 *   operation onto `primary_corps.active_operations` only. When the op has
 *   axes from a SECONDARY corps, brigades belonging to the secondary corps
 *   call `findBrigadeOperation(brigade.own_corps_cmd, brigade_id)` and get
 *   `null` because the op lives in primary corps's active_operations array,
 *   not theirs.
 *
 * Result: the secondary-corps brigades never see the op, never enter the
 * planning-phase column-march toward staging, never enter execution-phase
 * attack evaluation, never produce attacks. The op runs to recovery with
 * `attempts=0` for those brigades.
 *
 * Source evidence: `runs/.../w183_n1593` Mistral 2 op (HRHB,
 * primary_corps=hvo_main_staff, axis 2 corps=hvo_tomislavgrad).
 *
 * Required contract: a brigade participant in a multi-corps operation must
 * be able to find the op via a state-level lookup, not just a corps-local
 * lookup. This is what `findBrigadeOperationAnywhere(state, brigadeId)`
 * provides — and the brigade AI hot path in `bot_brigade_ai_osid.ts` must
 * use the state-aware lookup so secondary-corps brigades see their op.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
    findBrigadeOperation,
    findBrigadeOperationAnywhere,
} from '../src/sim/combat/corps_operation_helpers.js';
import type {
    CorpsCommandState,
    CorpsOperation,
    GameState,
} from '../src/state/game_state.js';

function makeOp(participating: string[], name = 'Operation Multi-Corps'): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 175,
        phase_started_turn: 175,
        participating_brigades: [...participating],
        objectives: ['op:foreign_corps:objective_1'],
        current_objective_index: 0,
        planning_duration: 4,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: 'op:test:staging',
    } as CorpsOperation;
}

function makeCmd(activeOps: CorpsOperation[] = []): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 10,
        og_slots: 0,
        active_ogs: [],
        active_operations: activeOps,
        corps_exhaustion: 0,
        stance: 'offensive',
    } as CorpsCommandState;
}

function makeState(corpsCommand: Record<string, CorpsCommandState>): GameState {
    return {
        meta: { turn: 175 } as unknown as GameState['meta'],
        military: { corps_command: corpsCommand } as unknown as GameState['military'],
    } as unknown as GameState;
}

describe('multi-corps operation visibility — pre-fix bug exposure', () => {
    it('findBrigadeOperation (corps-local) MISSES brigades in a multi-corps op pushed to a foreign corps', () => {
        // Mistral 2 shape: op has axes from hvo_main_staff (primary) + hvo_tomislavgrad (secondary).
        // Engine pushes the op only onto primary's active_operations.
        const op = makeOp([
            'hvo_1st_guard_abb',                       // hvo_main_staff
            'hrhb_kralj_petar_kreimir_iv_brigade',     // hvo_tomislavgrad
            'hrhb_kralj_tomislav_brigade',             // hvo_tomislavgrad
        ], 'Operation Mistral 2');

        const primary = makeCmd([op]);
        const secondary = makeCmd([]);

        // Primary-corps brigade finds its op normally.
        const primaryFound = findBrigadeOperation(primary, 'hvo_1st_guard_abb');
        assert.equal(primaryFound, op, 'primary-corps brigade must find its op');

        // Secondary-corps brigade looks up its OWN cmd's active_operations and finds nothing.
        // This is the bug — the secondary brigade is in op.participating_brigades but the op
        // lives in primary's active_operations.
        const secondaryFoundLocal = findBrigadeOperation(secondary, 'hrhb_kralj_petar_kreimir_iv_brigade');
        assert.equal(secondaryFoundLocal, null,
            'corps-local lookup MUST miss secondary brigades — that is the bug shape this contract fixes');
    });
});

describe('multi-corps operation visibility — fix contract', () => {
    it('findBrigadeOperationAnywhere finds the op via state-wide search', () => {
        const op = makeOp([
            'hvo_1st_guard_abb',
            'hrhb_kralj_petar_kreimir_iv_brigade',
            'hrhb_kralj_tomislav_brigade',
        ], 'Operation Mistral 2');

        const state = makeState({
            hvo_main_staff: makeCmd([op]),
            hvo_tomislavgrad: makeCmd([]),
            // Add unrelated corps to verify deterministic iteration:
            arbih_5th_corps: makeCmd([]),
            vrs_drina: makeCmd([]),
        });

        // Primary-corps brigade still found.
        const primary = findBrigadeOperationAnywhere(state, 'hvo_1st_guard_abb');
        assert.ok(primary, 'primary brigade must be found');
        assert.equal(primary!.op, op);

        // Secondary-corps brigades MUST be found via state-wide search.
        const sec1 = findBrigadeOperationAnywhere(state, 'hrhb_kralj_petar_kreimir_iv_brigade');
        assert.ok(sec1, 'secondary brigade #1 (hvo_tomislavgrad) must be found via state-wide search');
        assert.equal(sec1!.op, op);

        const sec2 = findBrigadeOperationAnywhere(state, 'hrhb_kralj_tomislav_brigade');
        assert.ok(sec2, 'secondary brigade #2 must be found via state-wide search');
        assert.equal(sec2!.op, op);

        // Returned cmd is the corps that ACTUALLY hosts the op (primary), not the brigade's own corps.
        // Brigades use this to read op.phase and op.participating_brigades for directive logic;
        // they continue to use their OWN corps_command for stance, sector assignment, etc.
        assert.equal(sec1!.cmd, state.military.corps_command!.hvo_main_staff);
    });

    it('findBrigadeOperationAnywhere returns null when no op participates the brigade', () => {
        const op = makeOp(['hvo_1st_guard_abb']);
        const state = makeState({
            hvo_main_staff: makeCmd([op]),
            hvo_tomislavgrad: makeCmd([]),
        });

        const missing = findBrigadeOperationAnywhere(state, 'hrhb_brigade_not_in_any_op');
        assert.equal(missing, null);
    });

    it('findBrigadeOperationAnywhere is deterministic (sorted corps iteration)', () => {
        // Two corps each have an op with the same brigade — must always return the
        // alphabetically-earlier corps's op for stable iteration.
        const opA = makeOp(['shared_brigade'], 'Op A');
        const opB = makeOp(['shared_brigade'], 'Op B');

        const state = makeState({
            zzzcorps: makeCmd([opB]),
            aaacorps: makeCmd([opA]),
        });

        // Sorted iteration: aaacorps before zzzcorps → opA returned first.
        const found = findBrigadeOperationAnywhere(state, 'shared_brigade');
        assert.ok(found);
        assert.equal(found!.op, opA, 'must return op from alphabetically-earliest corps for stable behavior');
    });

    it('findBrigadeOperationAnywhere returns null for empty / missing corps_command', () => {
        const emptyState = { meta: { turn: 1 }, military: { corps_command: {} } } as unknown as GameState;
        assert.equal(findBrigadeOperationAnywhere(emptyState, 'any_brigade'), null);

        const noCommandState = { meta: { turn: 1 }, military: {} } as unknown as GameState;
        assert.equal(findBrigadeOperationAnywhere(noCommandState, 'any_brigade'), null);
    });
});
