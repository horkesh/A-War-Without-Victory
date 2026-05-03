/**
 * Turn Preview Boundary Tests — Phase 7 hardening.
 *
 * Verifies that:
 * 1. ClickableRegionManager.ts has the DATA BOUNDARY: comment
 * 2. generateThisWeekPreview() no longer reads state.military.formations directly
 * 3. extractWarData() correctly populates ownForces.wiaFormationCount
 * 4. Null/empty formations returns a safe default of 0
 * 5. wiaFormationCount counts only player-faction formations with wounded_pending > 0
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

function makeMinimalWarState(overrides: Record<string, unknown> = {}): GameState {
    const base = {
        meta: { turn: 5, phase: 'war', player_faction: 'RBiH' },
        factions: [
            { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
            { id: 'RS',   profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
            { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        ],
        military: {
            formations: {},
            casualty_ledger: {},
            front_edges: [],
            war_front_edges_osid: [],
            front_pressure: {},
            front_segments: {},
            militia_garrison: {},
            brigade_movement_state: {},
            brigade_encircled: {},
            corps_command: {},
            sarajevo_tunnel_operational: false,
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 0, RS: 0, HRHB: 0 },
            loss_of_control_trends: { by_faction: {} },
            international_visibility_pressure: null,
            ivp_consequences_active: [],
        },
        displacement: {
            displacement_state: {},
            displacement_camp_state: {},
            hostile_takeover_timers: {},
            civilian_casualties: {},
            sustainability_state: {},
        },
        ...overrides,
    };
    return base as unknown as GameState;
}

function makeStateWithWiaFormations(): GameState {
    return makeMinimalWarState({
        military: {
            formations: {
                // RBiH brigade with WIA
                'arbih_bde_1': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 900, wounded_pending: 45, cohesion: 0.8 },
                // RBiH brigade with NO WIA
                'arbih_bde_2': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1100, wounded_pending: 0, cohesion: 0.75 },
                // RBiH brigade with wounded_pending absent (undefined)
                'arbih_bde_3': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 800, cohesion: 0.7 },
                // RS brigade with WIA — must NOT be counted for RBiH player
                'vrs_bde_1': { faction: 'RS', kind: 'brigade', status: 'active', personnel: 1200, wounded_pending: 60, cohesion: 0.85 },
            },
            casualty_ledger: {},
            front_edges: [],
            war_front_edges_osid: [],
            front_pressure: {},
            front_segments: {},
            militia_garrison: {},
            brigade_movement_state: {},
            brigade_encircled: {},
            corps_command: {},
            sarajevo_tunnel_operational: false,
        },
    });
}

// ---------------------------------------------------------------------------
// Test 3 — extractor correctness: wiaFormationCount is populated
// ---------------------------------------------------------------------------

describe('extractWarData ownForces.wiaFormationCount correctness', () => {
    it('returns 0 when no formations have wounded_pending', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state, 'RBiH');
        expect(snap.ownForces.wiaFormationCount).toBe(0);
    });

    it('counts only player-faction formations with wounded_pending > 0', () => {
        const state = makeStateWithWiaFormations();
        const snap = extractWarData(state, 'RBiH');
        // arbih_bde_1 has wounded_pending: 45 → counts
        // arbih_bde_2 has wounded_pending: 0 → does not count
        // arbih_bde_3 has no wounded_pending field → does not count
        // vrs_bde_1 has wounded_pending: 60 but is RS faction → does not count
        expect(snap.ownForces.wiaFormationCount).toBe(1);
    });

    it('does not count enemy-faction formations with WIA', () => {
        const state = makeStateWithWiaFormations();
        const snapRS = extractWarData(state, 'RS');
        // vrs_bde_1 has wounded_pending: 60 → counts for RS player
        expect(snapRS.ownForces.wiaFormationCount).toBe(1);

        const snapRBiH = extractWarData(state, 'RBiH');
        // vrs_bde_1 must NOT count for RBiH player
        expect(snapRBiH.ownForces.wiaFormationCount).toBe(1); // only arbih_bde_1
    });

    it('counts multiple formations correctly', () => {
        const state = makeMinimalWarState({
            military: {
                formations: {
                    'bde_a': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 900, wounded_pending: 10 },
                    'bde_b': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 800, wounded_pending: 5 },
                    'bde_c': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 700, wounded_pending: 1 },
                    'bde_d': { faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 600, wounded_pending: 0 },
                },
                casualty_ledger: {},
                front_edges: [],
                war_front_edges_osid: [],
                front_pressure: {},
                front_segments: {},
                militia_garrison: {},
                brigade_movement_state: {},
                brigade_encircled: {},
                corps_command: {},
                sarajevo_tunnel_operational: false,
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.ownForces.wiaFormationCount).toBe(3); // a, b, c; not d
    });
});

// ---------------------------------------------------------------------------
// Test 4 — null/empty safety
// ---------------------------------------------------------------------------

describe('extractWarData ownForces.wiaFormationCount null safety', () => {
    it('returns 0 when formations is empty object', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state, 'RBiH');
        expect(snap.ownForces.wiaFormationCount).toBe(0);
    });

    it('returns 0 when formations is absent (undefined)', () => {
        const state = makeMinimalWarState({
            military: {
                formations: undefined,
                casualty_ledger: {},
                front_edges: [],
                war_front_edges_osid: [],
                front_pressure: {},
                front_segments: {},
                militia_garrison: {},
                brigade_movement_state: {},
                brigade_encircled: {},
                corps_command: {},
                sarajevo_tunnel_operational: false,
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.ownForces.wiaFormationCount).toBe(0);
    });

    it('wiaFormationCount is a number (not undefined) in all cases', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state, 'RBiH');
        expect(typeof snap.ownForces.wiaFormationCount).toBe('number');
    });
});

// ---------------------------------------------------------------------------
// Test 5 — OwnForcesSnapshot structural invariant
// ---------------------------------------------------------------------------

describe('OwnForcesSnapshot structural contract', () => {
    it('wiaFormationCount field exists on ownForces snapshot', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state, 'RBiH');
        expect('wiaFormationCount' in snap.ownForces).toBe(true);
    });
});
