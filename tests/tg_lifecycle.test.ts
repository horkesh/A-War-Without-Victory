/**
 * Tactical Group lifecycle + selection tests (ADR-0005 v2.2a).
 *
 * Covers:
 *   - selectDonors v2.2-simplified: same-corps candidates + 6 eligibility gates
 *   - formTacticalGroup: creates TG entity, writes per-donor lent fields,
 *     enforces Hard Invariants #1/#4/#8 (no duplicate donor, anchor-not-donor,
 *     anchor/donor-not-already-in-TG)
 *   - dissolveTacticalGroup: clears lent fields, removes TG entry,
 *     sets cooldown per Hard Invariant #2 (TG_DONOR_COOLDOWN_TURNS = 6)
 */

import { describe, expect, it } from 'vitest';
import type {
    FormationState,
    GameState,
    MilitaryState,
    TgDonorContribution,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import {
    compositionHash,
    dissolveTacticalGroup,
    formTacticalGroup,
    TG_DONOR_COOLDOWN_TURNS,
} from '../src/sim/combat/tactical_group_lifecycle.js';

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, faction: 'RBiH', name: id, created_turn: 0, status: 'active', assignment: null,
        corps_id: 'corp_a',
        location_osid: 'op:test:test',
        personnel: 1500,
        cohesion: 80,
        ...overrides,
    } as FormationState;
}

function stateWith(brigades: FormationState[], turn = 5): GameState {
    const formations: Record<string, FormationState> = {};
    for (const b of brigades) formations[b.id] = b;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'tg-lifecycle-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

// === selectDonors v2.2-simplified ===

describe('selectDonors v2.2-simplified', () => {
    it('returns empty pool when anchor missing', () => {
        const state = stateWith([]);
        expect(selectDonors(state, { anchor_brigade_id: 'missing', staging_osid: 'op:x:y' })).toEqual([]);
    });

    it('returns same-corps candidates excluding the anchor', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d1'),
            brigade('d2'),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id).sort()).toEqual(['d1', 'd2']);
    });

    it('excludes cross-corps brigades (same-corps-only in v2.2-simplified)', () => {
        const state = stateWith([
            brigade('anchor', { corps_id: 'corp_a' }),
            brigade('d1', { corps_id: 'corp_a' }),
            brigade('d2_otherCorps', { corps_id: 'corp_b' }),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['d1']);
    });

    it('excludes cross-faction brigades (Hard Invariant #10)', () => {
        const state = stateWith([
            brigade('anchor', { faction: 'RBiH' }),
            brigade('d_hvo', { faction: 'HRHB' }),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual([]);
    });

    it('excludes brigades with cohesion < healthy threshold', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d_broken', { cohesion: 40 }),
            brigade('d_healthy', { cohesion: 60 }),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_healthy']);
    });

    it('excludes brigades already in another TG (Hard Invariant #1)', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d_lent', { personnel_lent_by_tg: { 'tg:other:op:x': 200 } }),
            brigade('d_free'),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_free']);
    });

    it('excludes brigades that would drop below MIN_BRIGADE_PERSONNEL_AFTER_DONATION', () => {
        // donation = floor(min(p*0.25, p*0.30)) = floor(p*0.25)
        // p=1000 → donation 250 → residual 750 < 800 → excluded
        // p=1200 → donation 300 → residual 900 > 800 → included
        const state = stateWith([
            brigade('anchor'),
            brigade('d_small', { personnel: 1000 }),
            brigade('d_big', { personnel: 1200 }),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_big']);
    });

    it('respects cooldown — excludes brigades with tg_cooldown_until_turn > current', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d_cd', { tg_cooldown_until_turn: 10 }),
            brigade('d_ok', { tg_cooldown_until_turn: 5 }), // current_turn=5, equal → eligible
        ], 5);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['d_ok']);
    });

    it('caps full-policy donors at MAX_DONORS_PER_TG_FULL_POLICY = 6 (Phase 1.7 power floor)', () => {
        // Phase 1.7 raised the offensive ('full'-policy, max_donors omitted) cap from 3 to 6
        // so a mass historical offensive's committed brigades are not amputated from the pool.
        const state = stateWith([
            brigade('anchor'),
            brigade('d1'), brigade('d2'), brigade('d3'), brigade('d4'), brigade('d5'),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors).toHaveLength(5); // 5 candidates, all kept (below the cap of 6)
    });

    it('caps full-policy donors at 6 even with more candidates available', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d1'), brigade('d2'), brigade('d3'), brigade('d4'),
            brigade('d5'), brigade('d6'), brigade('d7'), brigade('d8'),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors).toHaveLength(6); // 8 candidates, capped at MAX_DONORS_PER_TG_FULL_POLICY
    });

    it('returns donations sorted deterministically by brigade_id', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('zzz'), brigade('aaa'), brigade('mmm'),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(donors.map(d => d.brigade_id)).toEqual(['aaa', 'mmm', 'zzz']);
    });

    it('donation_personnel matches ratified falloff model (0 hops → 30% cap)', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d1', { personnel: 1200 }),
        ]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        // No adjacency graph in this fixture → hops degrade to 0 → factor max(0.10, 1-0)=1.0,
        // capped at 0.30 × personnel: floor(min(1200×1.0, 1200×0.30)) = 360.
        expect(donors[0].personnel_lent).toBe(360);
        expect(donors[0].distance_hops).toBe(0);
    });
});

// === formTacticalGroup ===

describe('formTacticalGroup', () => {
    it('creates TG entry + writes per-donor lent fields', () => {
        const state = stateWith([brigade('anchor'), brigade('d1'), brigade('d2')]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const result = formTacticalGroup(state, {
            op_id: 'op42',
            anchor_brigade_id: 'anchor',
            donors,
            current_turn: 5,
        });
        expect(result.tg_id).toBe('tg:corp_a:op42:anchor');
        const tg = state.military.tactical_groups![result.tg_id!];
        expect(tg).toBeDefined();
        expect(tg.anchor_brigade_id).toBe('anchor');
        expect(tg.status).toBe('forming');
        expect(tg.formed_on_turn).toBe(5);
        expect(tg.donor_contributions.map(d => d.brigade_id)).toEqual(['d1', 'd2']);
        // Per-donor lent field written. Default brigade personnel = 1500; 0 hops → 30% cap = 450.
        expect(state.military.formations.d1.personnel_lent_by_tg).toEqual({ [result.tg_id!]: 450 });
        expect(state.military.formations.d2.personnel_lent_by_tg).toEqual({ [result.tg_id!]: 450 });
    });

    it('rejects: missing_anchor', () => {
        const state = stateWith([brigade('d1')]);
        const r = formTacticalGroup(state, { op_id: 'op', anchor_brigade_id: 'missing', donors: [], current_turn: 0 });
        expect(r.tg_id).toBeNull();
        expect(r.rejection_reason).toBe('missing_anchor');
    });

    it('rejects: anchor already in another TG (Hard Invariant #1)', () => {
        const state = stateWith([brigade('anchor', { personnel_lent_by_tg: { 'tg:other:op:anchor': 100 } })]);
        const r = formTacticalGroup(state, { op_id: 'op', anchor_brigade_id: 'anchor', donors: [], current_turn: 0 });
        expect(r.tg_id).toBeNull();
        expect(r.rejection_reason).toBe('anchor_in_other_tg');
    });

    it('rejects: donor already in another TG (Hard Invariant #1)', () => {
        const state = stateWith([
            brigade('anchor'),
            brigade('d_taken', { personnel_lent_by_tg: { 'tg:other:op:taken': 100 } }),
        ]);
        const d: TgDonorContribution = {
            brigade_id: 'd_taken', source_corps_id: 'corp_a', distance_hops: 0,
            personnel_lent: 300, heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
            casualties_so_far: 0, equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
            cohesion_bleed_applied: 0,
        };
        const r = formTacticalGroup(state, { op_id: 'op', anchor_brigade_id: 'anchor', donors: [d], current_turn: 0 });
        expect(r.tg_id).toBeNull();
        expect(r.rejection_reason).toBe('donor_in_other_tg');
    });

    it('rejects: anchor in own donor list', () => {
        const state = stateWith([brigade('anchor')]);
        const d: TgDonorContribution = {
            brigade_id: 'anchor', source_corps_id: 'corp_a', distance_hops: 0,
            personnel_lent: 300, heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
            casualties_so_far: 0, equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
            cohesion_bleed_applied: 0,
        };
        const r = formTacticalGroup(state, { op_id: 'op', anchor_brigade_id: 'anchor', donors: [d], current_turn: 0 });
        expect(r.tg_id).toBeNull();
        expect(r.rejection_reason).toBe('anchor_in_donor_list');
    });

    it('sorts donor_contributions by brigade_id (Hard Invariant #4)', () => {
        const state = stateWith([brigade('anchor'), brigade('d_z'), brigade('d_a'), brigade('d_m')]);
        const unsorted = [
            { brigade_id: 'd_z', source_corps_id: 'corp_a', distance_hops: 0, personnel_lent: 300, heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 }, casualties_so_far: 0, equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 }, cohesion_bleed_applied: 0 },
            { brigade_id: 'd_a', source_corps_id: 'corp_a', distance_hops: 0, personnel_lent: 300, heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 }, casualties_so_far: 0, equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 }, cohesion_bleed_applied: 0 },
            { brigade_id: 'd_m', source_corps_id: 'corp_a', distance_hops: 0, personnel_lent: 300, heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 }, casualties_so_far: 0, equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 }, cohesion_bleed_applied: 0 },
        ] as TgDonorContribution[];
        const r = formTacticalGroup(state, { op_id: 'op', anchor_brigade_id: 'anchor', donors: unsorted, current_turn: 0 });
        const tg = state.military.tactical_groups![r.tg_id!];
        expect(tg.donor_contributions.map(d => d.brigade_id)).toEqual(['d_a', 'd_m', 'd_z']);
    });
});

// === dissolveTacticalGroup ===

describe('dissolveTacticalGroup', () => {
    it('removes TG, clears lent fields, sets cooldown on anchor + donors', () => {
        const state = stateWith([brigade('anchor'), brigade('d1'), brigade('d2')]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const formed = formTacticalGroup(state, {
            op_id: 'op42', anchor_brigade_id: 'anchor', donors, current_turn: 5,
        });
        const tgId = formed.tg_id!;

        const result = dissolveTacticalGroup(state, tgId, 20);
        expect(result.dissolved).toBe(true);
        expect(state.military.tactical_groups![tgId]).toBeUndefined();
        // Donor lent fields cleared
        expect(state.military.formations.d1.personnel_lent_by_tg).toBeUndefined();
        expect(state.military.formations.d2.personnel_lent_by_tg).toBeUndefined();
        // Cooldown set on anchor + donors
        expect(state.military.formations.anchor.tg_cooldown_until_turn).toBe(20 + TG_DONOR_COOLDOWN_TURNS);
        expect(state.military.formations.d1.tg_cooldown_until_turn).toBe(20 + TG_DONOR_COOLDOWN_TURNS);
        expect(state.military.formations.d2.tg_cooldown_until_turn).toBe(20 + TG_DONOR_COOLDOWN_TURNS);
    });

    it('records a recent-composition hash on dissolution gated path is flag-off-inert', () => {
        // ENABLE_TG_COHESION_BLEED is a compile-time const false, so dissolution must NOT
        // write tg_recent_compositions (byte-identity contract). Asserts the gate holds.
        const state = stateWith([brigade('anchor'), brigade('d1')]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const formed = formTacticalGroup(state, { op_id: 'op1', anchor_brigade_id: 'anchor', donors, current_turn: 5 });
        dissolveTacticalGroup(state, formed.tg_id!, 5);
        expect(state.military.tg_recent_compositions).toBeUndefined();
    });

    it('returns dissolved=false for unknown TG id', () => {
        const state = stateWith([brigade('anchor')]);
        const result = dissolveTacticalGroup(state, 'tg:nonexistent', 10);
        expect(result.dissolved).toBe(false);
    });

    it('after dissolution, donor is eligible for new TG (cooldown checked)', () => {
        const state = stateWith([brigade('anchor'), brigade('d1', { personnel: 2000 })]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const formed = formTacticalGroup(state, {
            op_id: 'op1', anchor_brigade_id: 'anchor', donors, current_turn: 5,
        });
        dissolveTacticalGroup(state, formed.tg_id!, 5);

        // Same turn → d1 in cooldown
        const sameTurnDonors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(sameTurnDonors.map(d => d.brigade_id)).toEqual([]);

        // Past cooldown → d1 eligible again
        state.meta.turn = 5 + TG_DONOR_COOLDOWN_TURNS + 1;
        const laterDonors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        expect(laterDonors.map(d => d.brigade_id)).toEqual(['d1']);
    });
});

// === compositionHash (Hard Invariant #9, v2.3) ===

describe('compositionHash (ADR-0005 Hard Invariant #9)', () => {
    it('is independent of op_id (anchor + sorted donor ids only)', () => {
        // The whole point: a different op_id must NOT yield a different composition hash,
        // otherwise "dissolve and reform same TG via a new op_id" would bypass the block.
        const h1 = compositionHash('anchor', ['d1', 'd2']);
        const h2 = compositionHash('anchor', ['d1', 'd2']);
        expect(h1).toBe(h2);
    });

    it('is order-independent across donor list (sorted via strictCompare)', () => {
        expect(compositionHash('anchor', ['d2', 'd1'])).toBe(compositionHash('anchor', ['d1', 'd2']));
        expect(compositionHash('anchor', ['zzz', 'aaa', 'mmm'])).toBe(compositionHash('anchor', ['aaa', 'mmm', 'zzz']));
    });

    it('distinguishes different anchors and different donor sets', () => {
        expect(compositionHash('anchorA', ['d1'])).not.toBe(compositionHash('anchorB', ['d1']));
        expect(compositionHash('anchor', ['d1'])).not.toBe(compositionHash('anchor', ['d1', 'd2']));
    });

    it('handles the empty (anchor-only) donor set', () => {
        expect(compositionHash('anchor', [])).toBe('anchor|');
    });
});
