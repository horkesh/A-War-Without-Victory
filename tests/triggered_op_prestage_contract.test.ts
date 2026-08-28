/**
 * `prestageBrigadesForTriggeredOp` behavioural contract.
 *
 * WHY THIS FILE EXISTS
 * This coverage previously lived in `tests/krivaja_roster_and_prestage.test.ts`, which was
 * deleted on 2026-08-28 when Operation Krivaja-95 and Operation Stupčanica-95 were removed
 * (they were gated on the Srebrenica/Žepa fall RECEIPTS having already fired, so they could
 * never deliver the falls they described, and never launched in any run).
 *
 * Deleting that file took the ONLY behavioural coverage of `prestageBrigadesForTriggeredOp`
 * with it — a function that is still live and still called on BOTH injection paths
 * (`triggered_operations.ts` legacy path and the Army-HQ path) for every remaining
 * triggered op. That was an over-deletion, caught in review.
 *
 * The ported tests below build a SYNTHETIC def rather than looking one up in
 * `_TRIGGERED_OPS`. The original tests did the lookup, which is why they died with their
 * subject. The contract under test is the helper's BEHAVIOUR — write a column-march order
 * for participants who need one, and never stomp an order somebody else owns — and that
 * behaviour is independent of which operation supplies the axes. Keeping it catalog-free
 * means removing another op can never silently delete this coverage again.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
    prestageBrigadesForTriggeredOp,
} from '../src/sim/combat/triggered_operations.js';
import type { GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Fixtures — synthetic def + synthetic state, no catalog dependency
// ---------------------------------------------------------------------------

const STAGING = 'op:bratunac:bratunac_2';

/** Minimal def carrying only what the helper reads: axes[].brigades and axes[].staging_osid. */
function syntheticDef(): never {
    return {
        name: 'Synthetic Prestage Fixture',
        faction: 'RS',
        primary_corps: 'vrs_drina',
        staging_osid: STAGING,
        planning_duration: 3,
        min_attack_outcome: 'repulsed',
        trigger: () => false,
        axes: [
            {
                axis_id: 'synthetic_axis',
                name: 'Synthetic Axis',
                corps: 'vrs_drina',
                // Deliberately unsorted: the helper must sort for deterministic write order.
                brigades: ['bde_gamma', 'bde_alpha', 'bde_beta', 'bde_staged', 'bde_inactive'],
                objectives: ['op:srebrenica:srebrenica_2'],
                staging_osid: STAGING,
            },
        ],
    } as never;
}

interface Overrides {
    status?: 'active' | 'inactive';
    location_osid?: string;
    personnel?: number;
}

function formation(id: string, o: Overrides = {}): unknown {
    return {
        id,
        kind: 'brigade',
        status: o.status ?? 'active',
        location_osid: o.location_osid ?? 'op:vlasenica:grabovica',
        personnel: o.personnel ?? 1500,
        faction: 'RS',
        corps_id: 'vrs_drina',
        disrupted_turns: 0,
    };
}

function syntheticState(turn = 168): GameState {
    return {
        meta: { turn },
        military: {
            corps_command: {
                vrs_drina: {
                    command_span: 0,
                    subordinate_count: 0,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'defensive',
                    active_operations: [],
                },
            },
            formations: {
                bde_alpha: formation('bde_alpha', { location_osid: 'op:hanpijesak:han_pijesak_2' }),
                bde_beta: formation('bde_beta', { location_osid: 'op:vlasenica:bacici' }),
                bde_gamma: formation('bde_gamma', { location_osid: 'op:vlasenica:grabovica' }),
                // Already at staging — must be skipped.
                bde_staged: formation('bde_staged', { location_osid: STAGING }),
                // Inactive — must be skipped.
                bde_inactive: formation('bde_inactive', { status: 'inactive', personnel: 0 }),
            },
            brigade_movement_state: {} as Record<string, unknown>,
            brigade_movement_orders: {} as Record<string, unknown>,
            triggered_operations_accepted: {},
            declined_operations: {},
        },
        political: { political_controllers: {} },
        operation_history: [],
    } as unknown as GameState;
}

const ordersOf = (s: GameState) =>
    (s.military.brigade_movement_orders ?? {}) as unknown as Record<string, { destination_sids?: string[]; stance?: string }>;

// ---------------------------------------------------------------------------

describe('prestageBrigadesForTriggeredOp — export', () => {
    it('is exported as a function', () => {
        assert.equal(typeof prestageBrigadesForTriggeredOp, 'function');
    });
});

describe('prestageBrigadesForTriggeredOp — writes orders for participants that need them', () => {
    it('emits column-march orders for non-staged active participants only', () => {
        const state = syntheticState();
        prestageBrigadesForTriggeredOp(state, syntheticDef());
        const orders = ordersOf(state);

        for (const id of ['bde_alpha', 'bde_beta', 'bde_gamma']) {
            assert.ok(orders[id], `${id} must receive a movement order`);
            assert.deepEqual(orders[id]!.destination_sids, [STAGING], `${id} must march to staging`);
            assert.equal(orders[id]!.stance, 'column',
                `${id} must use stance 'column' — omitting it routes to the wrong movement system`);
        }
        assert.equal(orders['bde_staged'], undefined, 'a brigade already at staging must not be ordered');
        assert.equal(orders['bde_inactive'], undefined, 'an inactive brigade must be skipped');
    });

    it('two independent calls produce byte-identical brigade_movement_orders', () => {
        const a = syntheticState();
        const b = syntheticState();
        prestageBrigadesForTriggeredOp(a, syntheticDef());
        prestageBrigadesForTriggeredOp(b, syntheticDef());
        assert.equal(
            JSON.stringify(ordersOf(a)),
            JSON.stringify(ordersOf(b)),
            'prestage must be deterministic — same input, byte-identical orders',
        );
    });
});

describe('prestageBrigadesForTriggeredOp — never stomps an order somebody else owns', () => {
    it('does not write a new order for a brigade already in_transit toward staging', () => {
        const state = syntheticState();
        (state.military.brigade_movement_state as Record<string, unknown>)['bde_alpha'] =
            { status: 'in_transit', destination_sid: STAGING };
        prestageBrigadesForTriggeredOp(state, syntheticDef());
        assert.equal(ordersOf(state)['bde_alpha'], undefined,
            're-issuing an order resets transit state — an in_transit brigade must be left alone');
    });

    it('does not override a brigade already in_transit toward a DIFFERENT osid', () => {
        const state = syntheticState();
        (state.military.brigade_movement_state as Record<string, unknown>)['bde_beta'] =
            { status: 'in_transit', destination_sid: 'op:zvornik:zvornik_2' };
        prestageBrigadesForTriggeredOp(state, syntheticDef());
        assert.equal(ordersOf(state)['bde_beta'], undefined,
            'in_transit toward another destination is still in_transit — do not redirect');
    });

    it('does not silently stomp an existing pending order toward a different osid', () => {
        const state = syntheticState();
        (state.military.brigade_movement_orders as Record<string, unknown>)['bde_gamma'] =
            { destination_sids: ['op:zvornik:zvornik_2'], stance: 'column' };
        prestageBrigadesForTriggeredOp(state, syntheticDef());
        assert.deepEqual(ordersOf(state)['bde_gamma']!.destination_sids, ['op:zvornik:zvornik_2'],
            'another owner (commander correction, emergency defense, reserve recall) has priority');
    });

    it('does not double-write or alter an order already pointing at staging', () => {
        const state = syntheticState();
        const existing = { destination_sids: [STAGING], stance: 'column', marker: 'pre-existing' };
        (state.military.brigade_movement_orders as Record<string, unknown>)['bde_alpha'] = existing;
        prestageBrigadesForTriggeredOp(state, syntheticDef());
        assert.equal((ordersOf(state)['bde_alpha'] as unknown as { marker?: string }).marker, 'pre-existing',
            'an order already pointing at staging must be left untouched, not rewritten');
    });
});
