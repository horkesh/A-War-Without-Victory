/**
 * Hard Invariant #6 — anchor-death zombie-hold confirmation (test-only; pins existing behavior).
 *
 * ADR-0005 Hard Inv #6: when a TG anchor is destroyed mid-op, the TG dissolves immediately
 * and its captured OSID must NOT remain artificially held by any TG-specific record — i.e.
 * the OSID reverts to normal control mechanics (contested unless an ordinary 1-hop non-TG
 * friendly brigade is present). The destroyed anchor is a normal dead physical brigade, so
 * existing brigade-death/control mechanics own the territory; the TG layer leaves nothing
 * behind that could "zombie-hold" the OSID.
 *
 * This is the TODO-v2.2c-followup confirmation near attack_resolution_osid.ts:~936-938.
 * It is test-ONLY: it asserts what `dissolveTacticalGroup` (the function the anchor-death
 * path invokes) actually does. No sim logic is changed → byte-identical by construction.
 *
 * What we pin:
 *   1. dissolveTacticalGroup removes the TG entry entirely (no lingering record on the OSID).
 *   2. Every donor's personnel_lent_by_tg / equipment_lent_by_tg for that TG is cleared.
 *   3. Anchor + donors receive the dissolution cooldown (Hard Inv #2).
 *   4. After dissolution, NO tactical_groups entry references the captured OSID — so any
 *      hold on that OSID is owned by ordinary control mechanics, not a TG zombie record.
 */

import { describe, expect, it } from 'vitest';
import type {
    FormationState,
    GameState,
    MilitaryState,
    TacticalGroup,
    TgDonorContribution,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
    dissolveTacticalGroup,
    TG_DONOR_COOLDOWN_TURNS,
} from '../src/sim/combat/tactical_group_lifecycle.js';

const CAPTURED_OSID = 'op:captured:objective';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        kind: 'brigade',
        corps_id: 'corp_a',
        location_osid: CAPTURED_OSID,
        personnel: 1500,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function donor(brigade_id: string): TgDonorContribution {
    return {
        brigade_id,
        source_corps_id: 'corp_a',
        distance_hops: 1,
        personnel_lent: 300,
        heavy_equipment_lent: { tanks: 1, artillery: 2, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0,
    };
}

/**
 * Build a state with a live TG anchored at CAPTURED_OSID, donors with active lent fields,
 * simulating the mid-op "anchor destroyed" precondition (anchor personnel driven to 0).
 */
function stateWithLiveTg(turn = 10): { state: GameState; tgId: string } {
    const anchor = brigade('anchor', { personnel: 0, cohesion: 0 }); // destroyed mid-op
    const d1 = brigade('d1', {
        location_osid: 'op:rear:a',
        personnel_lent_by_tg: { 'tg:corp_a:op_zombie:anchor': 300 },
        equipment_lent_by_tg: { 'tg:corp_a:op_zombie:anchor': { tanks: 1, artillery: 2, aa_systems: 0 } },
    });
    const d2 = brigade('d2', {
        location_osid: 'op:rear:b',
        personnel_lent_by_tg: { 'tg:corp_a:op_zombie:anchor': 300 },
    });
    const formations: Record<string, FormationState> = { anchor, d1, d2 };

    const tgId = 'tg:corp_a:op_zombie:anchor';
    const tg: TacticalGroup = {
        id: tgId,
        corps_id: 'corp_a',
        op_id: 'op_zombie',
        anchor_brigade_id: 'anchor',
        donor_contributions: [donor('d1'), donor('d2')],
        location_osid: CAPTURED_OSID,
        status: 'engaged',
        formed_on_turn: turn - 2,
        cohesion: 70,
    };

    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-inv6-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: { [tgId]: tg },
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
    return { state, tgId };
}

/** Mirror of findTgForAnchor: any live TG referencing this OSID as its location. */
function tgsReferencingOsid(state: GameState, osid: string): string[] {
    const tgs = state.military?.tactical_groups ?? {};
    return Object.keys(tgs).filter(id => tgs[id]?.location_osid === osid);
}

describe('Hard Invariant #6 — anchor-death zombie-hold confirmation', () => {
    it('dissolveTacticalGroup removes the TG entry entirely', () => {
        const { state, tgId } = stateWithLiveTg();
        expect(state.military.tactical_groups![tgId]).toBeDefined();
        const res = dissolveTacticalGroup(state, tgId, state.meta.turn);
        expect(res.dissolved).toBe(true);
        expect(state.military.tactical_groups![tgId]).toBeUndefined();
    });

    it('clears every donor personnel_lent_by_tg / equipment_lent_by_tg for the dissolved TG', () => {
        const { state, tgId } = stateWithLiveTg();
        dissolveTacticalGroup(state, tgId, state.meta.turn);
        for (const did of ['d1', 'd2']) {
            const d = state.military.formations[did];
            // personnel_lent_by_tg either deleted entirely or no longer references this TG.
            expect(d.personnel_lent_by_tg?.[tgId]).toBeUndefined();
            expect(d.equipment_lent_by_tg?.[tgId]).toBeUndefined();
        }
    });

    it('sets dissolution cooldown on anchor + donors (Hard Inv #2)', () => {
        const { state, tgId } = stateWithLiveTg();
        const expectedUntil = state.meta.turn + TG_DONOR_COOLDOWN_TURNS;
        dissolveTacticalGroup(state, tgId, state.meta.turn);
        expect(state.military.formations.anchor.tg_cooldown_until_turn).toBe(expectedUntil);
        expect(state.military.formations.d1.tg_cooldown_until_turn).toBe(expectedUntil);
        expect(state.military.formations.d2.tg_cooldown_until_turn).toBe(expectedUntil);
    });

    it('leaves NO TG record referencing the captured OSID (no TG-specific zombie hold)', () => {
        const { state, tgId } = stateWithLiveTg();
        // Before: exactly one TG record is anchored at the captured OSID.
        expect(tgsReferencingOsid(state, CAPTURED_OSID)).toEqual([tgId]);
        dissolveTacticalGroup(state, tgId, state.meta.turn);
        // After: no TG record references the OSID — ordinary control mechanics own it.
        expect(tgsReferencingOsid(state, CAPTURED_OSID)).toEqual([]);
    });
});
