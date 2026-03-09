/**
 * Peace-phase Overhaul Phase D: Tests for promoteFormations and naming helpers.
 *
 * Tests cover:
 *  1.  Eligible militia formation promotes to brigade
 *  2.  Personnel < 1500 → does NOT promote
 *  3.  Cohesion < 40 → does NOT promote
 *  4.  turns_active < 4 → does NOT promote
 *  5.  kind !== 'militia' (already brigade) → does NOT re-promote
 *  6.  Faction has no corps → does NOT promote (RBiH before turn 24)
 *  7.  RS formation always promotes (corps exist from turn 0)
 *  8.  On promotion: kind becomes 'brigade'
 *  9.  On promotion: cohesion += 10 (capped at 100)
 *  10. On promotion: readiness = 'active'
 *  11. On promotion: promoted_turn set to currentTurn
 *  12. Historical name matching: two formations in same mun → ordinal 1 gets first OOB name, ordinal 2 gets second
 *  13. Fallback name: no OOB match → "[N]st/nd/rd/th [mun] Brigade" format
 *  14. OOB tag propagation: matched_oob_id set; oob: tag added; corps: tag added when OOB entry has corps field
 *  15. Displaced-origin: if origin_mun ≠ home_mun, tries origin_mun first
 */

import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { OobBrigade } from '../src/scenario/oob_loader.js';
import { promoteFormations } from '../src/sim/early_war/promote_formations.js';
import { fallbackBrigadeName, findMatchedOobEntry, matchHistoricalName } from '../src/state/formation_naming.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(formations: Record<string, FormationState>): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'promote-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 2,
            war_start_turn: 3,
            recruitment_mode: 'bottom_up'
        },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  formations,
  military: {
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
};
}

/** Create a minimal eligible militia formation. created_turn=4 → 6 turns active at turn 10. */
function eligibleMilitia(id: string, faction: string, mun: string, overrides?: Partial<FormationState>): FormationState {
    return {
        id,
        faction,
        name: `TO ${mun}`,
        created_turn: 4,
        status: 'active',
        assignment: null,
        kind: 'militia',
        personnel: 1600,
        cohesion: 50,
        readiness: 'forming',
        tags: [`mun:${mun}`, 'generated_phase_i0'],
        origin_mun: mun,
        ...overrides
    };
}

/** A corps_asset formation for a faction (makes factionHasCorps return true). */
function corpsAsset(id: string, faction: string): FormationState {
    return {
        id,
        faction,
        name: `${faction} Corps HQ`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'corps_asset',
        personnel: 0
    };
}

/** A sample OOB brigade entry. */
function makeOobBrigade(id: string, faction: string, home_mun: string, name: string, corps?: string): OobBrigade {
    return {
        id,
        faction: faction as OobBrigade['faction'],
        name,
        home_mun,
        corps,
        kind: 'brigade',
        manpower_cost: 800,
        capital_cost: 10,
        default_equipment_class: 'light_infantry',
        priority: 1,
        mandatory: false,
        available_from: 0,
        max_personnel: 3000
    };
}

// ---------------------------------------------------------------------------
// describe block
// ---------------------------------------------------------------------------

describe('promoteFormations', () => {

    // Test 1: eligible formation promotes
    test('1. eligible militia formation promotes to brigade', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 1);
        assert.ok(report.formations_promoted.includes('m1'));
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'brigade');
    });

    // Test 2: personnel < 1500 → no promotion
    test('2. formation with personnel < 1500 does not promote', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { personnel: 1400 })
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'militia');
    });

    // Test 3: cohesion < 40 → no promotion
    test('3. formation with cohesion < 40 does not promote', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { cohesion: 35 })
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'militia');
    });

    // Test 4: turns_active < 4 → no promotion
    test('4. formation with turns_active < 4 does not promote', () => {
        // currentTurn=10, created_turn=8 → turnsActive=2
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { created_turn: 8 })
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'militia');
    });

    // Test 5: kind !== 'militia' → no re-promotion
    test('5. kind !== "militia" (already brigade) does not re-promote', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { kind: 'brigade' })
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
    });

    // Test 6: faction has no corps → no promotion (RBiH before corps activated)
    test('6. faction with no corps formation does not promote', () => {
        // No corps_asset for RBiH
        const state = makeState({
            // Only RS has corps
            rs_corps: corpsAsset('rs_corps', 'RS'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'militia');
    });

    // Test 7: RS formation always promotes (corps from turn 0)
    test('7. RS formation promotes because RS corps exist from turn 0', () => {
        const state = makeState({
            rs_corps: corpsAsset('rs_corps', 'RS'),
            m1: eligibleMilitia('m1', 'RS', 'banja_luka')
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 1);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'brigade');
    });

    // Test 8: kind becomes 'brigade' on promotion
    test('8. on promotion: kind becomes "brigade"', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        promoteFormations(state, 10, []);
        assert.strictEqual((state.military.formations['m1'] as FormationState).kind, 'brigade');
    });

    // Test 9: cohesion += 10, capped at 100
    test('9. on promotion: cohesion += PROMOTION_COHESION_BONUS (capped at 100)', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { cohesion: 50 })
        });
        promoteFormations(state, 10, []);
        assert.strictEqual((state.military.formations['m1'] as FormationState).cohesion, 60);

        // Test cap at 100
        const state2 = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m2: eligibleMilitia('m2', 'RBiH', 'bihac', { cohesion: 95 })
        });
        promoteFormations(state2, 10, []);
        assert.strictEqual((state2.military.formations['m2'] as FormationState).cohesion, 100);
    });

    // Test 10: readiness = 'active'
    test('10. on promotion: readiness becomes "active"', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac', { readiness: 'forming' })
        });
        promoteFormations(state, 10, []);
        assert.strictEqual((state.military.formations['m1'] as FormationState).readiness, 'active');
    });

    // Test 11: promoted_turn set to currentTurn
    test('11. on promotion: promoted_turn set to currentTurn', () => {
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        promoteFormations(state, 10, []);
        assert.strictEqual((state.military.formations['m1'] as FormationState).promoted_turn, 10);
    });

    // Test 12: two formations same mun → ordinal 1 gets first OOB name, ordinal 2 gets second
    test('12. two formations in same mun get distinct historical names in ordinal order', () => {
        const oobBrigades = [
            makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade'),
            makeOobBrigade('rbih-bihac-2', 'RBiH', 'bihac', '517th Mountain Brigade')
        ];

        // m_a has id "a_formation", m_b has id "b_formation" — sorted: a before b
        // "a_formation" → ordinal 1 → "502nd Mountain Brigade"
        // "b_formation" → ordinal 2 → "517th Mountain Brigade"
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            a_formation: eligibleMilitia('a_formation', 'RBiH', 'bihac'),
            b_formation: eligibleMilitia('b_formation', 'RBiH', 'bihac')
        });
        promoteFormations(state, 10, oobBrigades);

        assert.strictEqual((state.military.formations['a_formation'] as FormationState).name, '502nd Mountain Brigade');
        assert.strictEqual((state.military.formations['b_formation'] as FormationState).name, '517th Mountain Brigade');
    });

    // Test 13: fallback name format
    test('13. fallback name when no OOB match: "[N]st/nd/rd/th [mun] Brigade"', () => {
        assert.strictEqual(fallbackBrigadeName('bihac', 1), '1st bihac Brigade');
        assert.strictEqual(fallbackBrigadeName('travnik', 2), '2nd travnik Brigade');
        assert.strictEqual(fallbackBrigadeName('mostar', 3), '3rd mostar Brigade');
        assert.strictEqual(fallbackBrigadeName('sarajevo', 4), '4th sarajevo Brigade');
        assert.strictEqual(fallbackBrigadeName('zenica', 11), '11th zenica Brigade');
        assert.strictEqual(fallbackBrigadeName('zenica', 12), '12th zenica Brigade');
        assert.strictEqual(fallbackBrigadeName('zenica', 13), '13th zenica Brigade');
        assert.strictEqual(fallbackBrigadeName('zenica', 21), '21st zenica Brigade');
    });

    // Test 14: OOB tag propagation
    test('14. OOB tag propagation: matched_oob_id, oob: tag, corps: tag', () => {
        const oobBrigades = [
            makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '5th Bihac Brigade', 'rbih-5-corps')
        ];
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        promoteFormations(state, 10, oobBrigades);
        const f = state.military.formations['m1'] as FormationState;
        assert.strictEqual(f.matched_oob_id, 'rbih-bihac-1');
        assert.ok(Array.isArray(f.tags));
        assert.ok(f.tags!.includes('oob:rbih-bihac-1'), 'oob: tag should be present');
        assert.ok(f.tags!.includes('corps:rbih-5-corps'), 'corps: tag should be present');
    });

    // Test 14b: equip: tag added when default_equipment_class differs from current
    test('14b. equip: tag added when OOB equipment class differs from current', () => {
        // makeOobBrigade sets default_equipment_class='light_infantry';
        // override to 'mountain' to ensure equip: tag is written (formation has no existing equip: tag)
        const oob: OobBrigade = {
            ...makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '5th Bihac Brigade'),
            default_equipment_class: 'mountain'
        };
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        promoteFormations(state, 10, [oob]);
        const f = state.military.formations['m1'] as FormationState;
        assert.ok(f.tags!.includes('equip:mountain'), 'equip: tag should be present');
    });

    // Test 15: displaced-origin — origin_mun ≠ home_mun, tries origin_mun first
    test('15. displaced-origin formation matches by origin_mun first', () => {
        // Formation spawned in "prijedor" but operating from "travnik"
        // OOB has a brigade with home_mun: "prijedor" (origin)
        const oobBrigades = [
            makeOobBrigade('rs-prijedor-1', 'RS', 'prijedor', '17th Krajina Brigade')
        ];
        const state = makeState({
            rs_corps: corpsAsset('rs_corps', 'RS'),
            m1: eligibleMilitia('m1', 'RS', 'travnik', {
                origin_mun: 'prijedor', // displaced origin
                tags: ['mun:travnik', 'generated_phase_i0']
            })
        });
        promoteFormations(state, 10, oobBrigades);
        const f = state.military.formations['m1'] as FormationState;
        // Should match via origin_mun=prijedor, not home_mun=travnik
        assert.strictEqual(f.name, '17th Krajina Brigade');
        assert.strictEqual(f.matched_oob_id, 'rs-prijedor-1');
    });

    // Test 15b: displaced-origin falls back to home_mun when no candidates in origin_mun
    test('15b. displaced-origin falls back to home_mun when no origin_mun candidates', () => {
        const oobBrigades = [
            makeOobBrigade('rs-travnik-1', 'RS', 'travnik', '1st Travnik Brigade')
        ];
        const state = makeState({
            rs_corps: corpsAsset('rs_corps', 'RS'),
            m1: eligibleMilitia('m1', 'RS', 'travnik', {
                origin_mun: 'unknown_mun', // no OOB for this origin
                tags: ['mun:travnik', 'generated_phase_i0']
            })
        });
        promoteFormations(state, 10, oobBrigades);
        const f = state.military.formations['m1'] as FormationState;
        assert.strictEqual(f.name, '1st Travnik Brigade');
    });

    // Test: matchHistoricalName returns null when no match
    test('matchHistoricalName returns null when ordinal exceeds candidates', () => {
        const oobBrigades = [makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade')];
        const result = matchHistoricalName('RBiH', 'bihac', 2, oobBrigades);
        assert.strictEqual(result, null);
    });

    // Test: matchHistoricalName returns null when no matching faction/mun
    test('matchHistoricalName returns null when no matching faction or mun', () => {
        const oobBrigades = [makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade')];
        const result1 = matchHistoricalName('RS', 'bihac', 1, oobBrigades);
        assert.strictEqual(result1, null);
        const result2 = matchHistoricalName('RBiH', 'travnik', 1, oobBrigades);
        assert.strictEqual(result2, null);
    });

    // Test: empty state is safe (no crash)
    test('empty formations object is safe', () => {
        const state = makeState({});
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 0);
        assert.deepStrictEqual(report.formations_promoted, []);
    });

    // Test: formation without origin_mun falls back to mun: tag
    test('formation without origin_mun uses mun: tag for home municipality', () => {
        const oobBrigades = [makeOobBrigade('rbih-zenica-1', 'RBiH', 'zenica', '3rd Corps Brigade')];
        const state = makeState({
            corps1: corpsAsset('corps1', 'RBiH'),
            m1: {
                id: 'm1',
                faction: 'RBiH',
                name: 'TO zenica',
                created_turn: 4,
                status: 'active',
                assignment: null,
                kind: 'militia',
                personnel: 1600,
                cohesion: 50,
                readiness: 'forming',
                tags: ['mun:zenica', 'generated_phase_i0']
                // No origin_mun set
            }
        });
        promoteFormations(state, 10, oobBrigades);
        const f = state.military.formations['m1'] as FormationState;
        assert.strictEqual(f.kind, 'brigade');
        assert.strictEqual(f.name, '3rd Corps Brigade');
    });

    // Test: army_hq satisfies the corps gate
    test('army_hq formation satisfies the corps gate', () => {
        const state = makeState({
            army_hq1: {
                id: 'army_hq1',
                faction: 'RBiH',
                name: 'ARBiH Army HQ',
                created_turn: 0,
                status: 'active',
                assignment: null,
                kind: 'army_hq',
                personnel: 0
            },
            m1: eligibleMilitia('m1', 'RBiH', 'bihac')
        });
        const report = promoteFormations(state, 10, []);
        assert.strictEqual(report.promoted, 1);
    });

    // Direct matchHistoricalName tests (required by Refactor Pass D→E)

    test('matchHistoricalName: ordinal 1 returns first OOB entry name (same mun)', () => {
        const oobBrigades = [
            makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade'),
            makeOobBrigade('rbih-bihac-2', 'RBiH', 'bihac', '517th Mountain Brigade')
        ];
        assert.strictEqual(matchHistoricalName('RBiH', 'bihac', 1, oobBrigades), '502nd Mountain Brigade');
    });

    test('matchHistoricalName: ordinal 2 returns second OOB entry name (same mun)', () => {
        const oobBrigades = [
            makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade'),
            makeOobBrigade('rbih-bihac-2', 'RBiH', 'bihac', '517th Mountain Brigade')
        ];
        assert.strictEqual(matchHistoricalName('RBiH', 'bihac', 2, oobBrigades), '517th Mountain Brigade');
    });

    test('matchHistoricalName: ordinal overflow (ordinal > candidates) returns null', () => {
        const oobBrigades = [makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade')];
        assert.strictEqual(matchHistoricalName('RBiH', 'bihac', 2, oobBrigades), null);
    });

    test('matchHistoricalName: displaced-origin — origin_mun tried first when different from home_mun', () => {
        const oobBrigades = [
            makeOobBrigade('rs-prijedor-1', 'RS', 'prijedor', '17th Krajina Brigade'),
            makeOobBrigade('rs-travnik-1', 'RS', 'travnik', '1st Travnik Brigade')
        ];
        // origin_mun=prijedor should yield prijedor name, not travnik name
        assert.strictEqual(matchHistoricalName('RS', 'travnik', 1, oobBrigades, 'prijedor'), '17th Krajina Brigade');
        // Without origin_mun, home_mun=travnik is used
        assert.strictEqual(matchHistoricalName('RS', 'travnik', 1, oobBrigades), '1st Travnik Brigade');
    });

    // Direct fallbackBrigadeName ordinal tests
    test('fallbackBrigadeName: ordinals 1, 2, 3, 11 use correct suffix', () => {
        assert.strictEqual(fallbackBrigadeName('bihac', 1), '1st bihac Brigade');
        assert.strictEqual(fallbackBrigadeName('bihac', 2), '2nd bihac Brigade');
        assert.strictEqual(fallbackBrigadeName('bihac', 3), '3rd bihac Brigade');
        // 11 is special case: ends in 1 but uses "th" not "st"
        assert.strictEqual(fallbackBrigadeName('bihac', 11), '11th bihac Brigade');
    });

    // findMatchedOobEntry tests
    test('findMatchedOobEntry: returns OobBrigade object for valid ordinal', () => {
        const oobBrigades = [
            makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade', 'rbih-5-corps')
        ];
        const entry = findMatchedOobEntry('RBiH', 'bihac', 1, oobBrigades);
        assert.ok(entry !== null);
        assert.strictEqual(entry!.id, 'rbih-bihac-1');
        assert.strictEqual(entry!.name, '502nd Mountain Brigade');
        assert.strictEqual(entry!.corps, 'rbih-5-corps');
    });

    test('findMatchedOobEntry: returns null when ordinal exceeds candidates', () => {
        const oobBrigades = [makeOobBrigade('rbih-bihac-1', 'RBiH', 'bihac', '502nd Mountain Brigade')];
        assert.strictEqual(findMatchedOobEntry('RBiH', 'bihac', 2, oobBrigades), null);
    });
});
