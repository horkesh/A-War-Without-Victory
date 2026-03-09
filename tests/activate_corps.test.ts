/**
 * Peace-phase Overhaul Phase C: activateCorpsForTurn tests.
 *
 * Verifies:
 * 1. bottom_up, turn 0: RS corps exist (created at Peace phase entry), RBiH/HRHB corps do NOT exist.
 * 2. bottom_up, turn 10: HRHB corps appear (available_from: 10).
 * 3. bottom_up, turn 24: RBiH corps appear (available_from: 24).
 * 4. Idempotency: calling twice at same turn does not create duplicate corps.
 * 5. auto_oob (no bottom_up): function still works when called directly — creates corps per available_from.
 * 6. createOobFormations skips RBiH/HRHB corps and brigades in bottom_up mode.
 * 7. createOobFormations keeps RS corps and brigades in bottom_up mode.
 */

import { describe, expect, it } from 'vitest';
import type { OobCorps, OobBrigade } from '../src/scenario/oob_loader.js';
import { createOobFormations } from '../src/scenario/oob_early_war_entry.js';
import { activateCorpsForTurn } from '../src/sim/early_war/activate_corps.js';
import { CURRENT_SCHEMA_VERSION, type FormationState, type GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Minimal OOB fixtures matching oob_corps.json structure
// ---------------------------------------------------------------------------

/** RS corps (available_from: 0) */
const RS_CORPS_OOB: OobCorps[] = [
    { id: 'vrs_main_staff', faction: 'RS', name: 'Main Staff VRS', hq_mun: 'han_pijesak', kind: 'army_hq', available_from: 0 },
    { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', hq_mun: 'banja_luka', kind: 'corps', available_from: 0 },
    { id: 'vrs_drina', faction: 'RS', name: 'Drina Corps', hq_mun: 'vlasenica', kind: 'corps', available_from: 0 },
];

/** HRHB corps (available_from: 10) */
const HRHB_CORPS_OOB: OobCorps[] = [
    { id: 'hvo_main_staff', faction: 'HRHB', name: 'Main Staff HVO', hq_mun: 'mostar', kind: 'army_hq', available_from: 10 },
    { id: 'hvo_southeast_herzegovina', faction: 'HRHB', name: 'Southeast Herzegovina OZ', hq_mun: 'mostar', kind: 'corps', available_from: 10 },
    { id: 'hvo_central_bosnia', faction: 'HRHB', name: 'Central Bosnia OZ', hq_mun: 'vitez', kind: 'corps', available_from: 10 },
];

/** RBiH corps (available_from: 24) */
const ARBIH_CORPS_OOB: OobCorps[] = [
    { id: 'arbih_general_staff', faction: 'RBiH', name: 'General Staff ARBiH', hq_mun: 'kakanj', kind: 'army_hq', available_from: 24 },
    { id: 'arbih_1st_corps', faction: 'RBiH', name: '1st Corps', hq_mun: 'centar_sarajevo', kind: 'corps', available_from: 24 },
    { id: 'arbih_5th_corps', faction: 'RBiH', name: '5th Corps', hq_mun: 'bihac', kind: 'corps', available_from: 24 },
];

const ALL_CORPS_OOB: OobCorps[] = [...RS_CORPS_OOB, ...HRHB_CORPS_OOB, ...ARBIH_CORPS_OOB];

// ---------------------------------------------------------------------------
// Minimal OOB brigade fixtures
// ---------------------------------------------------------------------------

function makeOobBrigade(id: string, faction: string, home_mun: string): OobBrigade {
    return {
        id,
        faction: faction as import('../src/state/game_state.js').FactionId,
        name: `${faction} Brigade ${id}`,
        home_mun,
        kind: 'brigade',
        manpower_cost: 800,
        capital_cost: 0,
        default_equipment_class: 'light_infantry',
        priority: 1,
        mandatory: false,
        available_from: 0,
        max_personnel: 3000,
    };
}

const SAMPLE_BRIGADES: OobBrigade[] = [
    makeOobBrigade('rs_brig_01', 'RS', 'banja_luka'),
    makeOobBrigade('rbih_brig_01', 'RBiH', 'kakanj'),
    makeOobBrigade('hrhb_brig_01', 'HRHB', 'mostar'),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal GameState for Peace phase with bottom_up mode. */
function makeBottomUpState(turn = 0): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 'activate-corps-test',
            phase: 'war',
            recruitment_mode: 'bottom_up'
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {},
        municipalities: {}
    } as unknown as GameState;
}

/** Minimal sidToMun map — no entries — so presence check is bypassed. */
const EMPTY_SIDO_TO_MUN = new Map<string, string>();

function formationIds(state: GameState): string[] {
    return Object.keys(state.formations ?? {}).sort();
}

// ---------------------------------------------------------------------------
// Tests: activateCorpsForTurn
// ---------------------------------------------------------------------------

describe('activateCorpsForTurn — bottom_up mode', () => {
    it('turn 0: no corps activated (all RS corps exist already from entry, HRHB/RBiH not yet due)', () => {
        const state = makeBottomUpState(0);
        // Pre-seed RS corps (as createOobFormations would do)
        for (const c of RS_CORPS_OOB) {
            state.formations![c.id] = {
                id: c.id as import('../src/state/game_state.js').FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: 0,
                status: 'active',
                assignment: null,
                tags: [`mun:${c.hq_mun}`],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0
            } as FormationState;
        }

        const report = activateCorpsForTurn(state, ALL_CORPS_OOB, 0);

        // No new corps — RS already exist, HRHB (10) and RBiH (24) not due yet
        expect(report.corps_activated).toBe(0);
        expect(report.corps_ids).toHaveLength(0);
        // Only RS corps should be in state
        for (const c of RS_CORPS_OOB) {
            expect(state.formations![c.id]).toBeDefined();
        }
        for (const c of HRHB_CORPS_OOB) {
            expect(state.formations![c.id]).toBeUndefined();
        }
        for (const c of ARBIH_CORPS_OOB) {
            expect(state.formations![c.id]).toBeUndefined();
        }
    });

    it('turn 10: HRHB corps appear (available_from: 10)', () => {
        const state = makeBottomUpState(10);
        // RS already exist
        for (const c of RS_CORPS_OOB) {
            state.formations![c.id] = {
                id: c.id as import('../src/state/game_state.js').FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: 0,
                status: 'active',
                assignment: null,
                tags: [],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0
            } as FormationState;
        }

        const report = activateCorpsForTurn(state, ALL_CORPS_OOB, 10);

        expect(report.corps_activated).toBe(HRHB_CORPS_OOB.length);
        for (const c of HRHB_CORPS_OOB) {
            expect(state.formations![c.id]).toBeDefined();
            expect(state.formations![c.id]!.faction).toBe('HRHB');
        }
        // RBiH still absent
        for (const c of ARBIH_CORPS_OOB) {
            expect(state.formations![c.id]).toBeUndefined();
        }
    });

    it('turn 24: RBiH corps appear (available_from: 24)', () => {
        const state = makeBottomUpState(24);
        // Pre-seed RS + HRHB
        for (const c of [...RS_CORPS_OOB, ...HRHB_CORPS_OOB]) {
            state.formations![c.id] = {
                id: c.id as import('../src/state/game_state.js').FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: 0,
                status: 'active',
                assignment: null,
                tags: [],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0
            } as FormationState;
        }

        const report = activateCorpsForTurn(state, ALL_CORPS_OOB, 24);

        expect(report.corps_activated).toBe(ARBIH_CORPS_OOB.length);
        for (const c of ARBIH_CORPS_OOB) {
            expect(state.formations![c.id]).toBeDefined();
            expect(state.formations![c.id]!.faction).toBe('RBiH');
        }
    });

    it('idempotency: calling twice at turn 24 does not create duplicate corps', () => {
        const state = makeBottomUpState(24);
        // Pre-seed RS corps as createOobFormations would at Peace phase entry
        for (const c of RS_CORPS_OOB) {
            state.formations![c.id] = {
                id: c.id as import('../src/state/game_state.js').FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: 0,
                status: 'active',
                assignment: null,
                tags: [],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0
            } as FormationState;
        }

        // First call at turn 24 — activates HRHB + RBiH
        const r1 = activateCorpsForTurn(state, ALL_CORPS_OOB, 24);
        const idsBefore = formationIds(state);

        // Second call — all already exist
        const r2 = activateCorpsForTurn(state, ALL_CORPS_OOB, 24);
        const idsAfter = formationIds(state);

        expect(r2.corps_activated).toBe(0);
        expect(idsBefore).toEqual(idsAfter);
        // Combined: HRHB + RBiH corps were created on first call
        expect(r1.corps_activated).toBe(HRHB_CORPS_OOB.length + ARBIH_CORPS_OOB.length);
    });

    it('corps_ids output is sorted deterministically', () => {
        const state = makeBottomUpState(10);
        const report = activateCorpsForTurn(state, ALL_CORPS_OOB, 10);

        const sorted = [...report.corps_ids].sort();
        expect(report.corps_ids).toEqual(sorted);
    });

    it('created corps have created_turn set to currentTurn', () => {
        const state = makeBottomUpState(10);
        activateCorpsForTurn(state, ALL_CORPS_OOB, 10);

        for (const c of HRHB_CORPS_OOB) {
            expect(state.formations![c.id]!.created_turn).toBe(10);
        }
    });

    it('created corps have correct kind: army_hq vs corps_asset', () => {
        const state = makeBottomUpState(10);
        activateCorpsForTurn(state, ALL_CORPS_OOB, 10);

        const mainStaff = state.formations!['hvo_main_staff'];
        expect(mainStaff).toBeDefined();
        expect(mainStaff!.kind).toBe('army_hq');

        const seOz = state.formations!['hvo_southeast_herzegovina'];
        expect(seOz).toBeDefined();
        expect(seOz!.kind).toBe('corps_asset');
    });

    it('corps/army_hq formations have no location_osid (command structures, not map entities)', () => {
        const state = makeBottomUpState(24);
        // Activate all corps
        activateCorpsForTurn(state, ALL_CORPS_OOB, 24);

        for (const f of Object.values(state.formations!)) {
            if (f.kind === 'corps_asset' || f.kind === 'army_hq') {
                expect(f.location_osid).toBeUndefined();
            }
        }
    });

    it('auto_oob mode (called directly): all corps with available_from <= turn are activated', () => {
        // Direct call: caller skips the pipeline guard; function activates by available_from only
        const state = makeBottomUpState(24);
        state.meta.recruitment_mode = undefined; // not bottom_up

        // All 9 corps (RS + HRHB + RBiH, available_from <= 24) should be created
        const report = activateCorpsForTurn(state, ALL_CORPS_OOB, 24);

        expect(report.corps_activated).toBe(ALL_CORPS_OOB.length);
        for (const c of ALL_CORPS_OOB) {
            expect(state.formations![c.id]).toBeDefined();
        }
    });
});

// ---------------------------------------------------------------------------
// Tests: createOobFormations — bottom_up mode guards
// ---------------------------------------------------------------------------

describe('createOobFormations — bottom_up mode skipping', () => {
    /**
     * Build sidToMun + political_controllers where each mun has one SID per faction.
     * SID format: "SID_<mun>_<faction>" → mun, with pc[SID] = faction.
     * This lets factionHasPresenceInMun return true for any (mun, faction) pair.
     */
    function buildPresence(
        muns: string[],
        factions: string[]
    ): { sidToMun: Map<string, string>; pc: Record<string, string> } {
        const sidToMun = new Map<string, string>();
        const pc: Record<string, string> = {};
        for (const mun of muns) {
            for (const f of factions) {
                const sid = `SID_${mun}_${f}`;
                sidToMun.set(sid, mun);
                pc[sid] = f;
            }
        }
        return { sidToMun, pc };
    }

    const ALL_MUNS = [
        'han_pijesak', 'banja_luka', 'vlasenica', 'titov_drvar', 'bijeljina', 'bileca', 'novo_sarajevo',
        'kakanj', 'centar_sarajevo', 'tuzla', 'zenica', 'jablanica', 'bihac',
        'mostar', 'vitez', 'orasje', 'duvno'
    ];

    it('bottom_up mode: only RS corps are created at turn 0', () => {
        const state = makeBottomUpState(0);
        // Control: all muns have presence for all factions
        const { sidToMun, pc } = buildPresence(ALL_MUNS, ['RS', 'RBiH', 'HRHB']);
        state.political_controllers = pc;

        createOobFormations(
            state,
            ALL_CORPS_OOB,
            SAMPLE_BRIGADES,
            {},
            sidToMun
        );

        // RS corps should exist
        for (const c of RS_CORPS_OOB) {
            expect(state.formations![c.id]).toBeDefined();
        }
        // HRHB and RBiH corps should NOT exist
        for (const c of [...HRHB_CORPS_OOB, ...ARBIH_CORPS_OOB]) {
            expect(state.formations![c.id]).toBeUndefined();
        }
    });

    it('bottom_up mode: only RS brigades are created at turn 0', () => {
        const state = makeBottomUpState(0);
        const { sidToMun, pc } = buildPresence(ALL_MUNS, ['RS', 'RBiH', 'HRHB']);
        state.political_controllers = pc;

        createOobFormations(
            state,
            ALL_CORPS_OOB,
            SAMPLE_BRIGADES,
            {},
            sidToMun
        );

        // RS brigade should exist
        expect(state.formations!['rs_brig_01']).toBeDefined();
        // RBiH and HRHB brigades should NOT exist
        expect(state.formations!['rbih_brig_01']).toBeUndefined();
        expect(state.formations!['hrhb_brig_01']).toBeUndefined();
    });

    it('auto_oob mode: all corps and brigades are created', () => {
        const state = makeBottomUpState(0);
        state.meta.recruitment_mode = undefined; // legacy mode
        const { sidToMun, pc } = buildPresence(ALL_MUNS, ['RS', 'RBiH', 'HRHB']);
        state.political_controllers = pc;

        const report = createOobFormations(
            state,
            ALL_CORPS_OOB,
            SAMPLE_BRIGADES,
            {},
            sidToMun
        );

        // All corps should exist
        expect(report.corps_created).toBe(ALL_CORPS_OOB.length);
        // All brigades should exist
        expect(report.brigades_created).toBe(SAMPLE_BRIGADES.length);
    });

    it('bottom_up mode: report.corps_created counts only RS corps', () => {
        const state = makeBottomUpState(0);
        const { sidToMun, pc } = buildPresence(ALL_MUNS, ['RS', 'RBiH', 'HRHB']);
        state.political_controllers = pc;

        const report = createOobFormations(
            state,
            ALL_CORPS_OOB,
            SAMPLE_BRIGADES,
            {},
            sidToMun
        );

        expect(report.corps_created).toBe(RS_CORPS_OOB.length);
        expect(report.brigades_created).toBe(1); // only rs_brig_01
    });
});
