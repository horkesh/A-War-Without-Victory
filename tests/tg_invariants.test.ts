/**
 * Tactical Group invariants test (ADR-0005 v2.0 baseline).
 *
 * Locks the 6 hard invariants from ADR-0005 §Test Surface (companion to
 * §Hard Invariants 1-10). v2.0 ships empty TG state; these tests verify
 * (a) the schema admits empty defaults cleanly, (b) the invariant helper
 * correctly flags synthetic violations, (c) v18→v19 migration produces
 * the expected shape.
 *
 * As v2.2 wires real TG formation, these invariants must continue to hold;
 * additional tests will cover live formation/dissolution lifecycle.
 */

import { describe, expect, it } from 'vitest';
import type {
    FormationState,
    GameState,
    MilitaryState,
    TacticalGroup,
    TgDonorContribution,
    TgId,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyMigrations } from '../src/state/save_migration.js';

// === Invariant helper ===
// Mirrors the runtime checks that v2.2 selectDonors/formation logic
// must respect. Returns a list of violation messages; empty = clean.

export function validateTgInvariants(state: GameState): string[] {
    const violations: string[] = [];
    const mil = state.military;
    const tgs = mil?.tactical_groups ?? {};
    const formations = mil?.formations ?? {};

    // Invariant #1: every TgId in personnel_lent_by_tg exists in tactical_groups
    // Invariant #2: one TG per brigade (|keys(personnel_lent_by_tg)| ≤ 1)
    // Invariant #3: sum(personnel_lent_by_tg) ≤ brigade.personnel
    // Invariant #5: effectivePersonnel ≥ 0
    for (const [bid, b] of Object.entries(formations)) {
        const lent = (b as FormationState).personnel_lent_by_tg ?? {};
        const lentTgIds = Object.keys(lent);
        if (lentTgIds.length > 1) {
            violations.push(`Brigade ${bid}: lent to ${lentTgIds.length} TGs (max 1)`);
        }
        for (const tgId of lentTgIds) {
            if (!tgs[tgId]) {
                violations.push(`Brigade ${bid}: personnel_lent_by_tg references unknown TG ${tgId}`);
            }
        }
        const totalLent = Object.values(lent).reduce((sum, n) => sum + n, 0);
        const total = (b as FormationState).personnel ?? 0;
        if (totalLent > total) {
            violations.push(`Brigade ${bid}: total lent ${totalLent} > personnel ${total}`);
        }
        const effective = total - totalLent;
        if (effective < 0) {
            violations.push(`Brigade ${bid}: effectivePersonnel ${effective} < 0`);
        }
    }

    // Invariant #4: donor_contributions sorted by brigade_id
    // Invariant #6: anchor never in own donor list
    for (const [tgId, tg] of Object.entries(tgs)) {
        const donors = (tg as TacticalGroup).donor_contributions;
        for (let i = 1; i < donors.length; i++) {
            if (donors[i - 1].brigade_id >= donors[i].brigade_id) {
                violations.push(`TG ${tgId}: donor_contributions not strictly sorted at index ${i}`);
                break;
            }
        }
        const anchorId = (tg as TacticalGroup).anchor_brigade_id;
        if (donors.some(d => d.brigade_id === anchorId)) {
            violations.push(`TG ${tgId}: anchor ${anchorId} appears in own donor list`);
        }
    }

    return violations;
}

// === Fixtures ===

function emptyV19Fixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'tg-invariants-fixture',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            game_over: false,
            player_faction: 'RBiH',
        } as any,
        military: {
            formations: {},
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        } as Partial<MilitaryState> as MilitaryState,
    } as GameState;
}

function fixtureWithIntentionalViolation(violationKind: 'orphan_tg' | 'over_lend' | 'unsorted_donors' | 'anchor_self_donor'): GameState {
    const base = emptyV19Fixture();
    const mil = base.military;
    if (violationKind === 'orphan_tg') {
        mil.formations.brg1 = {
            id: 'brg1', faction: 'RBiH', name: 'B1', created_turn: 0, status: 'active', assignment: null,
            personnel: 1000, personnel_lent_by_tg: { 'tg:bogus:op:brg1': 500 },
        } as FormationState;
    }
    if (violationKind === 'over_lend') {
        mil.formations.brg1 = {
            id: 'brg1', faction: 'RBiH', name: 'B1', created_turn: 0, status: 'active', assignment: null,
            personnel: 100, personnel_lent_by_tg: { 'tg:corp:op:brg1': 500 },
        } as FormationState;
        mil.tactical_groups!['tg:corp:op:brg1'] = {
            id: 'tg:corp:op:brg1', corps_id: 'corp', op_id: 'op',
            anchor_brigade_id: 'brg_anchor', donor_contributions: [],
            location_osid: 'op:test:test', status: 'forming', formed_on_turn: 0, cohesion: 80,
        };
    }
    if (violationKind === 'unsorted_donors') {
        mil.tactical_groups!['tg1'] = {
            id: 'tg1', corps_id: 'corp', op_id: 'op',
            anchor_brigade_id: 'anchor',
            donor_contributions: [
                makeDonor('zzz_late'),
                makeDonor('aaa_early'), // out of order
            ],
            location_osid: 'op:test:test', status: 'engaged', formed_on_turn: 0, cohesion: 80,
        };
    }
    if (violationKind === 'anchor_self_donor') {
        mil.tactical_groups!['tg1'] = {
            id: 'tg1', corps_id: 'corp', op_id: 'op',
            anchor_brigade_id: 'self',
            donor_contributions: [makeDonor('self')],
            location_osid: 'op:test:test', status: 'engaged', formed_on_turn: 0, cohesion: 80,
        };
    }
    return base;
}

function makeDonor(brigade_id: string): TgDonorContribution {
    return {
        brigade_id,
        source_corps_id: 'corp',
        distance_hops: 1,
        personnel_lent: 100,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0,
    };
}

// === Tests ===

describe('TG invariants (ADR-0005 v2.0 baseline)', () => {
    it('passes on empty v19 state (default v2.0)', () => {
        const state = emptyV19Fixture();
        expect(validateTgInvariants(state)).toEqual([]);
    });

    it('flags orphan personnel_lent_by_tg pointing at unknown TG (Invariant #1)', () => {
        const state = fixtureWithIntentionalViolation('orphan_tg');
        const v = validateTgInvariants(state);
        expect(v.some(s => s.includes('unknown TG'))).toBe(true);
    });

    it('flags total lent > brigade.personnel (Invariant #3)', () => {
        const state = fixtureWithIntentionalViolation('over_lend');
        const v = validateTgInvariants(state);
        expect(v.some(s => s.includes('> personnel'))).toBe(true);
        expect(v.some(s => s.includes('effectivePersonnel'))).toBe(true);
    });

    it('flags unsorted donor_contributions (Invariant #4)', () => {
        const state = fixtureWithIntentionalViolation('unsorted_donors');
        const v = validateTgInvariants(state);
        expect(v.some(s => s.includes('not strictly sorted'))).toBe(true);
    });

    it('flags anchor in own donor list (Invariant #6)', () => {
        const state = fixtureWithIntentionalViolation('anchor_self_donor');
        const v = validateTgInvariants(state);
        expect(v.some(s => s.includes('appears in own donor list'))).toBe(true);
    });
});

describe('v18→v19 migration (ADR-0005 v2.0)', () => {
    it('initializes empty TG Records on a pre-v19 save', () => {
        const oldSave = {
            schema_version: 18,
            meta: { turn: 0, seed: 'x', phase: 'war', player_faction: 'RBiH' } as any,
            military: { formations: {} } as MilitaryState,
        } as GameState;
        applyMigrations(oldSave);
        expect(oldSave.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(oldSave.military.tactical_groups).toEqual({});
        expect(oldSave.military.army_hq_operations).toEqual({});
        expect(oldSave.military.army_hq_last_op_turn).toEqual({});
        expect(oldSave.military.army_hq_op_count_by_year).toEqual({});
    });

    it('preserves existing TG state when migrating an already-v19 save', () => {
        const state = emptyV19Fixture();
        const before = JSON.stringify(state.military.tactical_groups);
        applyMigrations(state);
        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(JSON.stringify(state.military.tactical_groups)).toBe(before);
    });
});
