/**
 * Phase D Step 5: Exhaustion accumulation tests.
 * - Exhaustion never decreases.
 * - Prolonged conflict increases exhaustion for all sides.
 * - Exhaustion does not flip control directly.
 */

import { describe, expect, it } from 'vitest';
import { updateExhaustion } from '../src/sim/combat/exhaustion.js';
import type { FrontDescriptor, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'ex-test', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'HRHB' },
        } as any,
        displacement: {} as any,
    };
}

describe('exhaustion accumulation', () => {
    it('never decreases', () => {
        const state = minimalPhaseIIState();
        state.political.war_exhaustion = { RBiH: 50, RS: 50, HRHB: 50 };
        const before = { ...state.political.war_exhaustion };
        updateExhaustion(state, []);
        expect((state.political.war_exhaustion?.RBiH ?? 0) >= (before.RBiH ?? 0)).toBe(true);
        expect((state.political.war_exhaustion?.RS ?? 0) >= (before.RS ?? 0)).toBe(true);
        expect((state.political.war_exhaustion?.HRHB ?? 0) >= (before.HRHB ?? 0)).toBe(true);
    });

    it('increases for all sides during prolonged conflict', () => {
        const state = minimalPhaseIIState();
        state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
        state.political.war_supply_pressure = { RBiH: 20, RS: 30, HRHB: 10 };
        const staticFronts: FrontDescriptor[] = [
            { id: 'F_RS--RBiH_e1', edge_ids: ['e1'], created_turn: 10, stability: 'static' },
        ];
        updateExhaustion(state, staticFronts);
        expect((state.political.war_exhaustion?.RBiH ?? 0) > 0).toBe(true);
        expect((state.political.war_exhaustion?.RS ?? 0) > 0).toBe(true);
        expect((state.political.war_exhaustion?.HRHB ?? 0) > 0).toBe(true);
    });

    it('uses live supply condition instead of saturated cumulative pressure', () => {
        const state = minimalPhaseIIState();
        state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
        state.political.war_supply_pressure = { RBiH: 100, RS: 100, HRHB: 100 };
        state.political.war_supply_condition = { RBiH: 100, RS: 50, HRHB: 0 };

        updateExhaustion(state, []);

        expect(state.political.war_exhaustion?.RBiH).toBe(0);
        expect(state.political.war_exhaustion?.RS).toBeGreaterThan(0);
        expect(state.political.war_exhaustion?.HRHB).toBeGreaterThan(state.political.war_exhaustion?.RS ?? 0);
    });

    it('does not flip control directly', () => {
        const state = minimalPhaseIIState();
        const controllersBefore = state.political.political_controllers ? { ...state.political.political_controllers } : {};
        state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
        state.political.war_supply_pressure = { RBiH: 100, RS: 100, HRHB: 100 };
        updateExhaustion(state, [
            { id: 'F1', edge_ids: ['e1'], created_turn: 1, stability: 'static' },
        ]);
        expect(state.political.political_controllers).toEqual(controllersBefore);
    });

    it('prefers sector-owned frontline exposure when live sector truth exists', () => {
        const state = minimalPhaseIIState();
        state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
        state.political.war_supply_pressure = { RBiH: 0, RS: 0, HRHB: 0 };
        state.military.corps_front_sectors = {
            'sector:rbih': {
                sector_id: 'sector:rbih',
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['e1'],
                sub_segments: [],
                territory_osids: [],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 1,
            },
            'sector:rs': {
                sector_id: 'sector:rs',
                corps_id: 'vrs_romanija',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: ['e1'],
                sub_segments: [],
                territory_osids: [],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 1,
            },
        } as any;

        updateExhaustion(state, []);

        expect((state.political.war_exhaustion?.RBiH ?? 0) >= 2).toBe(true);
        expect((state.political.war_exhaustion?.RS ?? 0) >= 2).toBe(true);
        expect(state.political.war_exhaustion?.HRHB).toBe(0);
    });

    it('does nothing when meta.phase is peace', () => {
        const state = minimalPhaseIIState();
        state.meta.phase = 'peace';
        state.political.war_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
        updateExhaustion(state, []);
        expect(state.political.war_exhaustion?.RBiH).toBe(0);
        expect(state.political.war_exhaustion?.RS).toBe(0);
    });
});
