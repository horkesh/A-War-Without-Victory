/**
 * NewspaperModal Officer Boundary Tests — Phase 8 hardening.
 *
 * Verifies that:
 * 1. NewspaperModal no longer reads military.named_officer_data directly in war-phase path
 * 2. NewspaperModal no longer reads military.formations in getOfficerSuccessionLines
 * 3. DATA BOUNDARY: comment is present in NewspaperModal.ts
 * 4. extractWarData() correctly populates officerNamesById
 * 5. Null/empty named_officer_data returns empty record (null safety)
 */

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const NEWSPAPER_MODAL_PATH = resolve(process.cwd(), 'src/ui/warroom/components/NewspaperModal.ts');
const EXTRACTOR_PATH = resolve(process.cwd(), 'src/ui/warroom/data/war_data_extractor.ts');

// ---------------------------------------------------------------------------
// Minimal fixture helper (matches warroom_turn_preview_boundary.test.ts pattern)
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

// ---------------------------------------------------------------------------
// Test 1 — Structural: no direct military.named_officer_data read in war-phase path
// ---------------------------------------------------------------------------

describe('NewspaperModal direct state read guard — named_officer_data', () => {
    it('NewspaperModal does not read this.gameState.military.named_officer_data directly', () => {
        const src = readFileSync(NEWSPAPER_MODAL_PATH, 'utf8');
        expect(src).not.toContain('this.gameState.military.named_officer_data');
    });
});

// ---------------------------------------------------------------------------
// Test 2 — Structural: no direct military.formations read in getOfficerSuccessionLines
// ---------------------------------------------------------------------------

describe('NewspaperModal direct state read guard — formations', () => {
    it('NewspaperModal does not read this.gameState.military.formations in succession lines', () => {
        const src = readFileSync(NEWSPAPER_MODAL_PATH, 'utf8');
        expect(src).not.toContain('this.gameState.military.formations');
    });
});

// ---------------------------------------------------------------------------
// Test 3 — Structural: DATA BOUNDARY comment present
// ---------------------------------------------------------------------------

describe('NewspaperModal boundary comment', () => {
    it('NewspaperModal has DATA BOUNDARY: comment at class level', () => {
        const src = readFileSync(NEWSPAPER_MODAL_PATH, 'utf8');
        expect(src).toContain('DATA BOUNDARY:');
    });

    it('NewspaperModal DATA BOUNDARY comment references extractWarData', () => {
        const src = readFileSync(NEWSPAPER_MODAL_PATH, 'utf8');
        expect(src).toContain('extractWarData');
    });

    it('NewspaperModal DATA BOUNDARY comment documents the Phase 0 exceptions', () => {
        const src = readFileSync(NEWSPAPER_MODAL_PATH, 'utf8');
        expect(src).toContain('phase0_events_log');
        expect(src).toContain('declaration_pressure');
    });
});

// ---------------------------------------------------------------------------
// Test 4 — Functional: extractWarData returns correct officerNamesById
// ---------------------------------------------------------------------------

describe('extractWarData officerNamesById correctness', () => {
    it('returns officer names keyed by ID', () => {
        const state = makeMinimalWarState({
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
                named_officer_data: [
                    { id: 'off_1', name: 'Halilović', faction: 'RBiH', rank: 'corps_commander', competence: 3 },
                    { id: 'off_2', name: 'Mladić', faction: 'RS', rank: 'corps_commander', competence: 4 },
                ],
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.officerNamesById['off_1']).toBeDefined();
        expect(typeof snap.officerNamesById['off_1']).toBe('string');
        expect(snap.officerNamesById['off_2']).toBeDefined();
        expect(typeof snap.officerNamesById['off_2']).toBe('string');
    });

    it('player-safe officer names are non-empty strings', () => {
        const state = makeMinimalWarState({
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
                named_officer_data: [
                    { id: 'off_1', name: 'Halilović', faction: 'RBiH', rank: 'corps_commander', competence: 3 },
                ],
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.officerNamesById['off_1'].length).toBeGreaterThan(0);
    });

    it('officerNamesById is a plain Record (object), not a Map', () => {
        const state = makeMinimalWarState({
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
                named_officer_data: [
                    { id: 'off_a', name: 'Test Officer', faction: 'RBiH', rank: 'corps_commander', competence: 3 },
                ],
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(typeof snap.officerNamesById).toBe('object');
        expect(snap.officerNamesById).not.toBeInstanceOf(Map);
    });
});

// ---------------------------------------------------------------------------
// Test 5 — Null safety: empty/absent named_officer_data returns empty record
// ---------------------------------------------------------------------------

describe('extractWarData officerNamesById null safety', () => {
    it('returns empty record when named_officer_data is undefined', () => {
        const state = makeMinimalWarState({
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
                named_officer_data: undefined,
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.officerNamesById).toEqual({});
    });

    it('returns empty record when named_officer_data is empty array', () => {
        const state = makeMinimalWarState({
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
                named_officer_data: [],
            },
        });
        const snap = extractWarData(state, 'RBiH');
        expect(snap.officerNamesById).toEqual({});
    });

    it('officerNamesById field is always present on snapshot (never undefined)', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state, 'RBiH');
        expect('officerNamesById' in snap).toBe(true);
        expect(snap.officerNamesById).not.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Structural: extractor source declares officerNamesById on WarDataSnapshot
// ---------------------------------------------------------------------------

describe('WarDataSnapshot structural contract', () => {
    it('extractor source declares officerNamesById on WarDataSnapshot interface', () => {
        const src = readFileSync(EXTRACTOR_PATH, 'utf8');
        expect(src).toContain('officerNamesById');
    });

    it('extractor source has extractOfficerNamesById sub-extractor function', () => {
        const src = readFileSync(EXTRACTOR_PATH, 'utf8');
        expect(src).toContain('extractOfficerNamesById');
    });
});
