/**
 * FARZ-ROUTING (§73, 2026-11-28): a triggered operation's participants get an
 * op-owned staging order that takes precedence over any non-authored
 * (`bot_discretionary`) order, and the routine bot march never overwrites the
 * order of a brigade in a live operation.
 *
 * The defect (lane B s37, sv6 saves t179/t180): Operation Farz 95 launched in
 * planning at t179 while the 327th and 351st held a `bot_discretionary` column
 * order to petrovo_2. `prestageBrigadesForTriggeredOp` yielded to that order,
 * and the bot writer (`bot_brigade_ai_osid.ts` merge) lets a routine march
 * replace an operation's staging order, so the roster marched off-axis and the
 * operation ended with 0 attacks. The model is the pre-planned concentration
 * (`pre_planned_operations.ts`, `owner: 'authored_preplanned'`).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { prestageBrigadesForTriggeredOp } from '../src/sim/combat/triggered_operations.js';
import { mergeBotMovementOrders } from '../src/sim/combat/bot_brigade_ai_osid.js';
import type { BrigadeMovementOrder, GameState } from '../src/state/game_state.js';

const STAGING = 'op:gracanica:hajderovici_2';
const OFF_AXIS = 'op:gracanica:petrovo_2';

type TriggeredDefArg = Parameters<typeof prestageBrigadesForTriggeredOp>[1];

const DEF = {
    name: 'Operation Test Farz',
    faction: 'RBiH',
    primary_corps: 'arbih_3rd_corps',
    axes: [{ staging_osid: STAGING, brigades: ['arbih_327th', 'arbih_351st', 'arbih_328th'] }],
} as unknown as TriggeredDefArg;

function brigade(id: string, location: string): unknown {
    return {
        id,
        kind: 'brigade',
        status: 'active',
        faction: 'RBiH',
        corps_id: 'arbih_3rd_corps',
        location_osid: location,
        personnel: 1800,
        disrupted_turns: 0,
    };
}

function makeState(withLiveOp: boolean): GameState {
    return {
        meta: { turn: 179 },
        military: {
            corps_command: {
                arbih_3rd_corps: {
                    command_span: 0,
                    subordinate_count: 0,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: withLiveOp
                        ? [{
                            name: 'Operation Test Farz',
                            phase: 'planning',
                            participating_brigades: ['arbih_327th', 'arbih_328th', 'arbih_351st'],
                        }]
                        : [],
                },
            },
            formations: {
                arbih_327th: brigade('arbih_327th', 'op:maglaj:misurici_2'),
                arbih_351st: brigade('arbih_351st', 'op:maglaj:misurici_2'),
                arbih_328th: brigade('arbih_328th', 'op:gracanica:cinovici'),
                arbih_999th: brigade('arbih_999th', 'op:maglaj:misurici_2'),
            },
            brigade_movement_state: {},
            brigade_movement_orders: {},
        },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

describe('FARZ-ROUTING: triggered-op staging takes precedence over bot_discretionary', () => {
    it('replaces a pending bot_discretionary order with an op-owned staging order', () => {
        const state = makeState(false);
        state.military.brigade_movement_orders!['arbih_327th' as never] = {
            destination_sids: [OFF_AXIS],
            stance: 'column',
            owner: 'bot_discretionary',
        } as never;

        prestageBrigadesForTriggeredOp(state, DEF);

        const order = state.military.brigade_movement_orders!['arbih_327th' as never] as BrigadeMovementOrder;
        assert.deepEqual(order.destination_sids, [STAGING]);
        assert.equal(order.stance, 'column');
        assert.equal(order.owner, 'authored_preplanned');
    });

    it('reclaims a bot_discretionary transit that is not bound for staging', () => {
        const state = makeState(false);
        state.military.brigade_movement_state!['arbih_351st' as never] = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: [OFF_AXIS],
            path: ['op:maglaj:kosova_2', OFF_AXIS],
            turns_remaining: 2,
            owner: 'bot_discretionary',
        } as never;

        prestageBrigadesForTriggeredOp(state, DEF);

        assert.equal(state.military.brigade_movement_state!['arbih_351st' as never], undefined);
        const order = state.military.brigade_movement_orders!['arbih_351st' as never] as BrigadeMovementOrder;
        assert.deepEqual(order.destination_sids, [STAGING]);
        assert.equal(order.owner, 'authored_preplanned');
    });

    it('keeps a bot_discretionary transit already bound for staging (no progress reset)', () => {
        const state = makeState(false);
        const transit = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: [STAGING],
            path: ['op:maglaj:kosova_2', STAGING],
            turns_remaining: 1,
            owner: 'bot_discretionary',
        };
        state.military.brigade_movement_state!['arbih_351st' as never] = transit as never;

        prestageBrigadesForTriggeredOp(state, DEF);

        assert.equal(state.military.brigade_movement_state!['arbih_351st' as never], transit);
        assert.equal(state.military.brigade_movement_orders!['arbih_351st' as never], undefined);
    });

    it('still yields to an untagged (non-discretionary) order and transit', () => {
        const state = makeState(false);
        const untaggedOrder = { destination_sids: [OFF_AXIS], stance: 'column' };
        state.military.brigade_movement_orders!['arbih_327th' as never] = untaggedOrder as never;
        const untaggedTransit = {
            status: 'in_transit', stance: 'column', destination_sids: [OFF_AXIS], turns_remaining: 2,
        };
        state.military.brigade_movement_state!['arbih_351st' as never] = untaggedTransit as never;

        prestageBrigadesForTriggeredOp(state, DEF);

        assert.equal(state.military.brigade_movement_orders!['arbih_327th' as never], untaggedOrder);
        assert.equal(state.military.brigade_movement_state!['arbih_351st' as never], untaggedTransit);
        assert.equal(state.military.brigade_movement_orders!['arbih_351st' as never], undefined);
    });
});

describe('FARZ-ROUTING: the routine bot march does not overwrite a live-op participant order', () => {
    const routine = (dest: string): BrigadeMovementOrder => ({
        destination_sids: [dest as never],
        stance: 'column',
        owner: 'bot_discretionary',
    });

    it('keeps the op-owned staging order of a live-op participant in replacement mode', () => {
        const state = makeState(true);
        prestageBrigadesForTriggeredOp(state, DEF);
        const staged = state.military.brigade_movement_orders!['arbih_327th' as never];
        assert.ok(staged);

        mergeBotMovementOrders(
            state,
            { arbih_327th: routine(OFF_AXIS), arbih_999th: routine(OFF_AXIS) } as never,
            false,
            () => false,
            () => false,
        );

        assert.equal(state.military.brigade_movement_orders!['arbih_327th' as never], staged);
        // A brigade outside any live operation still takes the routine march.
        assert.deepEqual(
            (state.military.brigade_movement_orders!['arbih_999th' as never] as BrigadeMovementOrder).destination_sids,
            [OFF_AXIS],
        );
    });

    it('keeps an untagged order of a live-op participant, and replaces its own discretionary output', () => {
        const state = makeState(true);
        const untagged = { destination_sids: [STAGING], stance: 'column' };
        state.military.brigade_movement_orders!['arbih_328th' as never] = untagged as never;
        state.military.brigade_movement_orders!['arbih_351st' as never] = routine('op:maglaj:old') as never;

        mergeBotMovementOrders(
            state,
            { arbih_328th: routine(OFF_AXIS), arbih_351st: routine(OFF_AXIS) } as never,
            false,
            () => false,
            () => false,
        );

        assert.equal(state.military.brigade_movement_orders!['arbih_328th' as never], untagged);
        assert.deepEqual(
            (state.military.brigade_movement_orders!['arbih_351st' as never] as BrigadeMovementOrder).destination_sids,
            [OFF_AXIS],
        );
    });

    it("a bot march to the operation's own staging or approach cell is operation movement and still replaces", () => {
        // Kotor Varos shape: the authored staging is the enemy-held objective, and the bot's
        // approach march (an operation-authorized destination) is what actually stages it.
        const APPROACH = 'op:gracanica:cinovici';
        const state = makeState(true);
        prestageBrigadesForTriggeredOp(state, DEF);

        mergeBotMovementOrders(
            state,
            { arbih_327th: routine(APPROACH), arbih_351st: routine(OFF_AXIS) } as never,
            false,
            () => false,
            (_bid, order) => order.destination_sids.includes(APPROACH as never),
        );

        assert.deepEqual(
            (state.military.brigade_movement_orders!['arbih_327th' as never] as BrigadeMovementOrder).destination_sids,
            [APPROACH],
        );
        assert.deepEqual(
            (state.military.brigade_movement_orders!['arbih_351st' as never] as BrigadeMovementOrder).destination_sids,
            [STAGING],
        );
    });

    it('outside a live operation, replacement mode behaves as before (the bot march wins)', () => {
        const state = makeState(false);
        state.military.brigade_movement_orders!['arbih_328th' as never] = { destination_sids: [STAGING] } as never;

        mergeBotMovementOrders(state, { arbih_328th: routine(OFF_AXIS) } as never, false, () => false, () => false);

        assert.deepEqual(
            (state.military.brigade_movement_orders!['arbih_328th' as never] as BrigadeMovementOrder).destination_sids,
            [OFF_AXIS],
        );
    });

    it('merge mode keeps every existing order, as before', () => {
        const state = makeState(false);
        const existing = { destination_sids: [STAGING] };
        state.military.brigade_movement_orders!['arbih_328th' as never] = existing as never;

        mergeBotMovementOrders(state, { arbih_328th: routine(OFF_AXIS) } as never, true, () => false, () => false);

        assert.equal(state.military.brigade_movement_orders!['arbih_328th' as never], existing);
    });
});
