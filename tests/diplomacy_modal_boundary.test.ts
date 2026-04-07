// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DiplomacyModal } from '../src/ui/warroom/components/DiplomacyModal.js';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import type { GameState } from '../src/state/game_state.js';

const SOURCE_PATH = resolve(process.cwd(), 'src/ui/warroom/components/DiplomacyModal.ts');
const source = readFileSync(SOURCE_PATH, 'utf8');

/** Minimal GameState for RBiH diplomacy render (war phase). */
function makeState(): GameState {
    return {
        meta: { turn: 5, phase: 'war', player_faction: 'RBiH' },
        factions: [
            { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
            { id: 'RS',   profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
            { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        ],
        military: {
            formations: {}, casualty_ledger: {}, front_edges: [], war_front_edges_osid: [],
            front_pressure: {}, front_segments: {}, militia_garrison: {},
            brigade_movement_state: {}, brigade_encircled: {}, corps_command: {},
        },
        political: {
            political_controllers: {
                'op:banja_luka:centar': 'RS',
                'op:banja_luka:north': 'RS',
                'op:tuzla:centar': 'RBiH',
                'op:mostar:west': 'HRHB',
            },
            war_exhaustion: { RBiH: 20, RS: 15, HRHB: 18 },
            loss_of_control_trends: { by_faction: {} },
            rbih_hrhb_state: {
                bilateral_flips_this_turn: 0, stalemate_turns: 0, total_bilateral_flips: 0,
                allied_mixed_municipalities: [], ceasefire_active: false, ceasefire_since_turn: null,
                washington_signed: false, washington_turn: null, war_started_turn: 1,
            },
            war_alliance_rbih_hrhb: 0.25,
            international_visibility_pressure: { negotiation_momentum: 0.30 },
        },
        displacement: {
            displacement_state: {}, displacement_camp_state: {}, hostile_takeover_timers: {},
            civilian_casualties: {}, sustainability_state: {},
        },
    } as unknown as GameState;
}

describe('DiplomacyModal boundary', () => {
    it('canonical boundary comment is present in source', () => {
        expect(source).toContain('DATA BOUNDARY: extractWarData() is the primary data source for this file.');
        expect(source).toContain('This file must NOT import from operational_sitrep_views.ts or command_briefing_views.ts.');
    });

    it('source does not import from operational_sitrep_views or command_briefing_views', () => {
        expect(source).not.toMatch(/^import[^'"]*['"].*operational_sitrep_views/m);
        expect(source).not.toMatch(/^import[^'"]*['"].*command_briefing_views/m);
    });

    it('W5 seam closed — source does not read political.political_controllers directly', () => {
        expect(source).not.toContain('political.political_controllers');
    });

    it('HRHB capability exception is documented with explicit reasoning', () => {
        expect(source).toContain('BOUNDARY EXCEPTION: reads own-faction capability profile directly from gameState.');
        expect(source).toContain('Do not expand this exception to other factions or other raw-state fields.');
    });

    it('functional render (RBiH) returns a DOM element and does not crash', () => {
        const el = new DiplomacyModal(makeState()).render();
        expect(el).toBeDefined();
        expect(el.tagName).toBeDefined();
        expect(el.innerHTML.length).toBeGreaterThan(0);
    });

    it('extractWarData result includes observedEnemyTerritoryPct as a faction-keyed fraction map', () => {
        const snap = extractWarData(makeState(), 'RBiH');
        expect(snap).toHaveProperty('observedEnemyTerritoryPct');
        const pct = snap.observedEnemyTerritoryPct;
        // 2 RS OSIDs out of 4 total → 0.5
        expect(pct['RS']).toBeCloseTo(0.5);
        // 1 RBiH OSID → 0.25
        expect(pct['RBiH']).toBeCloseTo(0.25);
        // 1 HRHB OSID → 0.25
        expect(pct['HRHB']).toBeCloseTo(0.25);
    });

    it('extractWarData returns empty observedEnemyTerritoryPct when political_controllers is absent', () => {
        const state = makeState();
        (state as any).political.political_controllers = {};
        const snap = extractWarData(state, 'RBiH');
        expect(snap.observedEnemyTerritoryPct).toEqual({});
    });
});
