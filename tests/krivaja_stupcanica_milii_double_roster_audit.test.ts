/**
 * LANE-2026-05-02-IN-TRANSIT-PREDICTOR follow-up: rs_1st_milii double-roster
 * ping-pong audit.
 *
 * Per /scenario-creator-runner-tester (Krivaja PARTIAL Phase 6 verdict): the
 * `rs_1st_milii` brigade is in BOTH the Krivaja-95 (`turn >= 168`) AND
 * Stupčanica-95 (`turn >= 172`) catalogs. The pre-stage helper writes a Krivaja
 * column-march for milii at t168; the question for THIS lane's follow-up
 * audit is whether commit `98446604`'s overwrite contract (skip when
 * in_transit OR existing order) already neutralizes the ping-pong, or whether
 * the brigade can still be yanked toward Stupčanica's staging after Krivaja
 * concludes.
 *
 * This is an AUDIT, not a fix-test. We synthesize three engine states that
 * model points along the timeline and assert what the helper does at each.
 * If any of the post-Krivaja states sees a fresh write toward Stupčanica's
 * staging while milii is sitting at a Krivaja-relevant OSID, the ping-pong
 * is real and a follow-up arbitration is warranted.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
    _TRIGGERED_OPS,
    prestageBrigadesForTriggeredOp,
} from '../src/sim/combat/triggered_operations.js';
import type { GameState } from '../src/state/game_state.js';

const KRIVAJA_STAGING = 'op:bratunac:bratunac_2';
const STUPCANICA_STAGING = 'op:vlasenica:grabovica';

interface BrigadeOpts {
    location_osid?: string;
    in_transit_destination?: string;
    existing_order_destination?: string;
    status?: 'active' | 'inactive' | 'destroyed';
    personnel?: number;
}

function buildState(turn: number, brigades: Record<string, BrigadeOpts>): GameState {
    const formations: Record<string, unknown> = {};
    const movement_state: Record<string, unknown> = {};
    const movement_orders: Record<string, unknown> = {};
    for (const [id, opts] of Object.entries(brigades)) {
        formations[id] = {
            id,
            kind: 'brigade',
            status: opts.status ?? 'active',
            location_osid: opts.location_osid ?? KRIVAJA_STAGING,
            personnel: opts.personnel ?? 1500,
            disrupted_turns: 0,
            faction: 'RS',
            corps_id: 'vrs_drina',
        };
        if (opts.in_transit_destination !== undefined) {
            movement_state[id] = {
                status: 'in_transit',
                stance: 'column',
                destination_sids: [opts.in_transit_destination],
                turns_remaining: 1,
            };
        }
        if (opts.existing_order_destination !== undefined) {
            movement_orders[id] = {
                destination_sids: [opts.existing_order_destination],
                stance: 'column',
            };
        }
    }
    return {
        meta: { turn },
        military: {
            formations,
            brigade_movement_state: movement_state,
            brigade_movement_orders: movement_orders,
        },
    } as unknown as GameState;
}

function getStupcanicaDef(): (typeof _TRIGGERED_OPS)[number] {
    const def = _TRIGGERED_OPS.find((d) => d.name === 'Operation Stupčanica-95');
    if (!def) throw new Error('Stupčanica-95 catalog entry missing');
    return def;
}

// ---------------------------------------------------------------------------
// Audit A — Stupčanica's pre-stage at t172 with milii STILL IN_TRANSIT
// toward Krivaja staging. Per `98446604` rule 2 (in_transit → skip), the
// helper must NOT write a new order. Net: contract HONORS the prior march.
// ---------------------------------------------------------------------------
describe('AUDIT A: in_transit-to-Krivaja-staging at Stupčanica trigger → contract honors prior march', () => {
    it('Stupčanica pre-stage SKIPS milii while it is in_transit toward Krivaja staging', () => {
        const state = buildState(172, {
            rs_1st_milii: {
                location_osid: 'op:vlasenica:grabovica', // some intermediate
                in_transit_destination: KRIVAJA_STAGING,
            },
            // Other Stupčanica catalog brigades don't matter for this assertion
            rs_1st_vlasenica: { location_osid: STUPCANICA_STAGING },
            rs_1st_podrinje: { location_osid: STUPCANICA_STAGING },
        });
        prestageBrigadesForTriggeredOp(state, getStupcanicaDef());
        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, { destination_sids?: string[] }>)['rs_1st_milii'];
        assert.equal(
            miliiOrder,
            undefined,
            'milii in_transit toward Krivaja staging — Stupčanica pre-stage must NOT overwrite (contract rule 2)',
        );
    });
});

// ---------------------------------------------------------------------------
// Audit B — Stupčanica's pre-stage at t172 with milii's existing
// brigade_movement_orders pointing at Krivaja staging (helper wrote at t168,
// brigade has not yet been advanced into in_transit by the movement system).
// Per `98446604` rule 3 (existing order → skip), no new write.
// ---------------------------------------------------------------------------
describe('AUDIT B: existing-order-to-Krivaja-staging at Stupčanica trigger → contract honors prior order', () => {
    it('Stupčanica pre-stage SKIPS milii while it has an existing order toward Krivaja staging', () => {
        const state = buildState(172, {
            rs_1st_milii: {
                location_osid: 'op:vlasenica:grabovica',
                existing_order_destination: KRIVAJA_STAGING,
            },
            rs_1st_vlasenica: { location_osid: STUPCANICA_STAGING },
            rs_1st_podrinje: { location_osid: STUPCANICA_STAGING },
        });
        prestageBrigadesForTriggeredOp(state, getStupcanicaDef());
        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, { destination_sids?: string[] }>)['rs_1st_milii'];
        // Existing order toward Krivaja staging must NOT be overwritten by Stupčanica
        // pre-stage. The order should still point at Krivaja staging.
        assert.ok(miliiOrder, 'pre-existing order must still be present');
        assert.equal(
            miliiOrder!.destination_sids?.[0],
            KRIVAJA_STAGING,
            'milii existing order toward Krivaja staging must remain unchanged (contract rule 3)',
        );
    });
});

// ---------------------------------------------------------------------------
// Audit C — POST-Krivaja state at Stupčanica's t172 trigger.
// Krivaja has CONCLUDED (no longer in active_operations). Milii has reached
// (or returned from) Krivaja staging. No in_transit, no order — just resting
// at op:bratunac:bratunac_2.
//
// Per `98446604`'s overwrite contract, only rules 1/2/3 prevent writes;
// here none apply (location ≠ Stupčanica staging, no transit, no order),
// so rule 4 fires and a fresh column-march is written toward Stupčanica's
// staging. This is OBSERVATIONAL evidence for the lane report; whether
// it represents a bug or correct historical sequencing is an
// interpretation question discussed in
// `docs/40_reports/implemented/20260502_SREBRENICA_IN_TRANSIT_PREDICTOR.md`.
//
// Per Popović §244 (Krivaja-95 preparatory order, 2 July 1995) and the
// historical sequence (Krivaja 6–11 July → regroup 12–13 July →
// Stupčanica 14–25 July), 1st Milici LIB DID redeploy between the two
// ops. The post-conclusion fresh-order is consistent with that history.
// ---------------------------------------------------------------------------
describe('AUDIT C: post-Krivaja-conclusion at Stupčanica trigger → fresh order written for sequential redeployment', () => {
    it('Stupčanica pre-stage writes a fresh column-march for milii once Krivaja has concluded', () => {
        // Milii is at Krivaja staging op:bratunac:bratunac_2 (Krivaja completed
        // and milii arrived). No active transit, no pending order.
        const state = buildState(172, {
            rs_1st_milii: {
                location_osid: KRIVAJA_STAGING,
                // no in_transit, no existing order
            },
            rs_1st_vlasenica: { location_osid: STUPCANICA_STAGING },
            rs_1st_podrinje: { location_osid: STUPCANICA_STAGING },
        });
        prestageBrigadesForTriggeredOp(state, getStupcanicaDef());
        const orders = state.military.brigade_movement_orders ?? {};
        const miliiOrder = (orders as Record<string, { destination_sids?: string[] }>)['rs_1st_milii'];
        assert.ok(
            miliiOrder,
            'observation: post-Krivaja, with no transit/order present, Stupčanica pre-stage writes a fresh column-march for milii',
        );
        assert.equal(
            miliiOrder!.destination_sids?.[0],
            STUPCANICA_STAGING,
            'observation: fresh order destination is Stupčanica staging — historically consistent with milii redeploying for Stupčanica per Popović §244',
        );
    });
});
