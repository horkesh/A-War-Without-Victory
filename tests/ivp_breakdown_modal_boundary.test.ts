/**
 * IVP Breakdown Modal Boundary Tests — Phase 6 hardening.
 *
 * Verifies that:
 * 1. IvpBreakdownModal.ts no longer reads political.* or military.* directly
 * 2. The DATA BOUNDARY: comment is present
 * 3. ClickableRegionManager.ts no longer reads political.* in openCommandBriefingModal
 * 4. extractWarData() correctly populates ivpState
 * 5. Null/absent IVP state produces safe defaults
 */

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import type { FactionId, GameState } from '../src/state/game_state.js';

const IVP_MODAL_PATH = resolve(process.cwd(), 'src/ui/warroom/components/IvpBreakdownModal.ts');
const CRM_PATH = resolve(process.cwd(), 'src/ui/warroom/ClickableRegionManager.ts');

/** Minimal GameState for IVP boundary tests (war phase). */
function makeMinimalWarState() {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH' },
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
            sarajevo_tunnel_operational: true,
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 0, RS: 0, HRHB: 0 },
            loss_of_control_trends: { by_faction: {} },
            international_visibility_pressure: {
                composite_ivp: 0.55,
                last_major_shift: 5,
                sarajevo_siege_visibility: 0.5,
                enclave_humanitarian_pressure: 0.3,
                atrocity_visibility: 0.2,
                negotiation_momentum: 0.1,
            },
            ivp_consequences_active: ['drina_blockade'],
        },
        displacement: {
            displacement_state: {},
            displacement_camp_state: {},
            hostile_takeover_timers: {},
            civilian_casualties: {},
            sustainability_state: {},
        },
    };
}

// ---------------------------------------------------------------------------
// Test 1 — boundary comment present
// ---------------------------------------------------------------------------

describe('IvpBreakdownModal boundary comment', () => {
    it('IvpBreakdownModal has DATA BOUNDARY comment', () => {
        const src = readFileSync(IVP_MODAL_PATH, 'utf8');
        expect(src).toContain('DATA BOUNDARY:');
        expect(src).toContain('extractWarData()');
    });
});

// ---------------------------------------------------------------------------
// Test 2 — no raw political or military reads
// ---------------------------------------------------------------------------

describe('IvpBreakdownModal direct state read guard', () => {
    it('IvpBreakdownModal does not read political.international_visibility_pressure directly', () => {
        const src = readFileSync(IVP_MODAL_PATH, 'utf8');
        expect(src).not.toContain('political.international_visibility_pressure');
    });

    it('IvpBreakdownModal does not read political.ivp_consequences_active directly', () => {
        const src = readFileSync(IVP_MODAL_PATH, 'utf8');
        expect(src).not.toContain('political.ivp_consequences_active');
    });

    it('IvpBreakdownModal does not read military.sarajevo_tunnel_operational directly', () => {
        const src = readFileSync(IVP_MODAL_PATH, 'utf8');
        expect(src).not.toContain('military.sarajevo_tunnel_operational');
    });
});

// ---------------------------------------------------------------------------
// Test 3 — shell seam closed in ClickableRegionManager
// ---------------------------------------------------------------------------

describe('ClickableRegionManager shell seam', () => {
    it('ClickableRegionManager does not read state.political.international_visibility_pressure', () => {
        const src = readFileSync(CRM_PATH, 'utf8');
        expect(src).not.toContain('state.political.international_visibility_pressure');
    });

    it('ClickableRegionManager does not read state.political.ivp_consequences_active', () => {
        const src = readFileSync(CRM_PATH, 'utf8');
        expect(src).not.toContain('state.political.ivp_consequences_active');
    });
});

// ---------------------------------------------------------------------------
// Test 4 — ivpState correctness
// ---------------------------------------------------------------------------

describe('extractWarData ivpState correctness', () => {
    it('extractWarData returns correct ivpState.composite', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state as unknown as GameState, 'RBiH');
        expect(snap.ivpState.composite).toBeCloseTo(0.55, 2);
    });

    it('extractWarData returns correct ivpState.activeConsequenceIds', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state as unknown as GameState, 'RBiH');
        expect(snap.ivpState.activeConsequenceIds).toContain('drina_blockade');
    });

    it('extractWarData returns sarajevoTunnelOperational from military state', () => {
        const state = makeMinimalWarState();
        const snap = extractWarData(state as unknown as GameState, 'RBiH');
        expect(snap.ivpState.sarajevoTunnelOperational).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Test 5 — null/absent IVP state produces safe defaults
// ---------------------------------------------------------------------------

describe('extractWarData ivpState null safety', () => {
    it('extractWarData returns safe defaults when IVP state is absent', () => {
        const state = makeMinimalWarState();
        (state as any).political.international_visibility_pressure = undefined;
        (state as any).political.ivp_consequences_active = undefined;
        const snap = extractWarData(state as unknown as GameState, 'RBiH');
        expect(snap.ivpState.composite).toBe(0);
        expect(snap.ivpState.activeConsequenceIds).toEqual([]);
        expect(snap.ivpState.lastMajorShift).toBeNull();
        expect(snap.ivpState.components).toEqual([]);
    });
});
