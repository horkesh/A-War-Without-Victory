/**
 * Tactical Group Phase 0 — effectivePersonnel safety-cascade invariants (ADR-0005).
 *
 * Closes the documented double-count bug: when TG flags are ON, a donor's lent personnel
 * is recorded in `personnel_lent_by_tg` but never decremented from `personnel`. The lent
 * slice therefore fights inside the TG (raw-personnel denominators) AND was still counted
 * toward the donor's HOME availability (defensive strength, recruitment, etc.).
 *
 * These tests drive the lifecycle helpers directly (which do not check feature flags —
 * callers gate), so the cascade is exercised regardless of the compile-time flag state.
 *
 * Asserts:
 *   (a) sum(personnel_lent_by_tg) <= personnel after formation
 *   (b) effectivePersonnel clamps >= 0 even when lent exceeds raw personnel
 *   (c) home-sector defensive strength drops by the lent fraction during the lend window
 *   (d) after dissolution the donor returns to full home defensive strength
 */

import { describe, expect, it } from 'vitest';
import type { FormationState, GameState, MilitaryState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import {
    dissolveTacticalGroup,
    formTacticalGroup,
} from '../src/sim/combat/tactical_group_lifecycle.js';
import {
    effectivePersonnel,
    lentPersonnel,
} from '../src/sim/combat/tactical_group_personnel.js';
import { computeLocalFrontDefensivePower } from '../src/sim/combat/local_front_defense.js';

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
        meta: { turn, seed: 'tg-effpers-fixture', phase: 'war', player_faction: 'RBiH' } as any,
        military: {
            formations,
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

describe('effectivePersonnel helper', () => {
    it('equals raw personnel when no TG donations (flag-off / default path)', () => {
        const b = brigade('b1', { personnel: 1500 });
        expect(effectivePersonnel(b)).toBe(1500);
        expect(lentPersonnel(b)).toBe(0);
    });

    it('subtracts the lent slice', () => {
        const b = brigade('b1', { personnel: 1500, personnel_lent_by_tg: { 'tg:x': 400 } });
        expect(lentPersonnel(b)).toBe(400);
        expect(effectivePersonnel(b)).toBe(1100);
    });

    it('(b) clamps >= 0 when lent exceeds raw personnel (donor took its own attrition)', () => {
        const b = brigade('b1', { personnel: 300, personnel_lent_by_tg: { 'tg:x': 400 } });
        expect(effectivePersonnel(b)).toBe(0);
    });

    it('sums across multiple TG entries (robust to Hard Inv #1)', () => {
        const b = brigade('b1', { personnel: 2000, personnel_lent_by_tg: { 'tg:x': 300, 'tg:y': 200 } });
        expect(lentPersonnel(b)).toBe(500);
        expect(effectivePersonnel(b)).toBe(1500);
    });
});

describe('TG formation respects the lent-personnel invariant', () => {
    it('(a) sum(personnel_lent_by_tg) <= personnel after formation', () => {
        const state = stateWith([brigade('anchor'), brigade('d1'), brigade('d2')]);
        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const result = formTacticalGroup(state, {
            op_id: 'op42', anchor_brigade_id: 'anchor', donors, current_turn: 5,
        });
        expect(result.tg_id).not.toBeNull();
        for (const id of ['d1', 'd2']) {
            const f = state.military.formations[id];
            expect(lentPersonnel(f)).toBeLessThanOrEqual(f.personnel ?? 0);
            expect(effectivePersonnel(f)).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('home-sector defensive strength reflects lent personnel (the bug fix)', () => {
    // Single defender on a fixed-length front: computeLocalFrontDefensivePower scales
    // linearly with brigadePower, which now reads effectivePersonnel. So the defensive
    // power ratio after lending must equal the effective-personnel fraction.
    const COVERAGE = 4;

    function homeDefPower(state: GameState, donorId: string): number {
        return computeLocalFrontDefensivePower(state.military.formations, [donorId], COVERAGE);
    }

    it('(c) defensive strength drops by the lent fraction during the lend window', () => {
        const state = stateWith([brigade('anchor'), brigade('d1', { personnel: 1600 })]);

        const before = homeDefPower(state, 'd1');
        expect(before).toBeGreaterThan(0);

        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const lent = donors.find(d => d.brigade_id === 'd1')!.personnel_lent;
        expect(lent).toBeGreaterThan(0);

        const formed = formTacticalGroup(state, {
            op_id: 'op42', anchor_brigade_id: 'anchor', donors, current_turn: 5,
        });
        expect(formed.tg_id).not.toBeNull();

        const during = homeDefPower(state, 'd1');
        const raw = state.military.formations.d1.personnel!;
        const expectedFraction = (raw - lent) / raw;

        // Power scales linearly with personnel; everything else (cohesion/exp/honor/density)
        // is identical across the two computations.
        expect(during).toBeCloseTo(before * expectedFraction, 6);
        expect(during).toBeLessThan(before);
    });

    it('(d) after dissolution the donor returns to full home defensive strength', () => {
        const state = stateWith([brigade('anchor'), brigade('d1', { personnel: 1600 })]);
        const before = homeDefPower(state, 'd1');

        const donors = selectDonors(state, { anchor_brigade_id: 'anchor', staging_osid: 'op:x:y' });
        const formed = formTacticalGroup(state, {
            op_id: 'op42', anchor_brigade_id: 'anchor', donors, current_turn: 5,
        });
        expect(homeDefPower(state, 'd1')).toBeLessThan(before);

        dissolveTacticalGroup(state, formed.tg_id!, 20);
        // Lent ledger cleared → effectivePersonnel === personnel → full strength restored.
        expect(lentPersonnel(state.military.formations.d1)).toBe(0);
        expect(homeDefPower(state, 'd1')).toBeCloseTo(before, 6);
    });
});
