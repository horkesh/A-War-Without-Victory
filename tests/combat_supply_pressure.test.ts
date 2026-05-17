/**
 * Phase D Step 4: Supply pressure tests.
 * - Isolation increases pressure (critical/strained from supply report).
 * - Overextension (front edges) increases pressure.
 * - Deterministic accumulation; no free supply (pressure never decreased).
 */

import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import { updateSupplyPressure } from '../src/sim/combat/supply_pressure.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport, SupplyStateDerivationReport } from '../src/state/supply_state_derivation.js';

function minimalPhaseIIState(controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sp-test', phase: 'war', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
            political_controllers: controllers ?? { S1: 'RBiH', S2: 'RS', S3: 'HRHB' },
        } as any,
        displacement: {} as any,
    };
}

describe('supply pressure', () => {
    it('increases with front edges (overextension)', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        updateSupplyPressure(state, edges);
        expect(!!state.political.war_supply_pressure).toBe(true);
        expect((state.political.war_supply_pressure?.RBiH ?? 0) >= 3).toBe(true);
        expect((state.political.war_supply_pressure?.RS ?? 0) >= 3).toBe(true);
    });

    it('increases from isolation when supply report has critical count', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.political.war_supply_pressure = { RBiH: 0, RS: 0, HRHB: 0 };
        const edges: EdgeRecord[] = [];
        const supplyReport: SupplyStateDerivationReport = {
            schema: 1,
            turn: 20,
            factions: [
                { faction_id: 'RBiH', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 2 },
                { faction_id: 'RS', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 0 },
                { faction_id: 'HRHB', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 0 },
            ],
        };
        updateSupplyPressure(state, edges, supplyReport);
        expect((state.political.war_supply_pressure?.RBiH ?? 0) >= 20).toBe(true);
    });

    it('is deterministic for the same inputs', () => {
        const state1 = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        const state2 = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        updateSupplyPressure(state1, edges);
        updateSupplyPressure(state2, edges);
        expect(state1.political.war_supply_pressure).toEqual(state2.political.war_supply_pressure);
    });

    it('never decreases', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.political.war_supply_pressure = { RBiH: 50, RS: 50, HRHB: 0 };
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        updateSupplyPressure(state, edges);
        expect((state.political.war_supply_pressure?.RBiH ?? 0) >= 50).toBe(true);
        expect((state.political.war_supply_pressure?.RS ?? 0) >= 50).toBe(true);
    });

    it('derives live supply condition from OSID state while preserving cumulative pressure', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.political.war_supply_pressure = { RBiH: 100, RS: 100, HRHB: 100 };
        const supplyByOsid: SupplyStateByOsidReport = {
            schema: 1,
            turn: 20,
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:a:1', state: 'adequate' },
                        { osid: 'op:a:2', state: 'strained' },
                        { osid: 'op:a:3', state: 'critical' },
                    ],
                },
                {
                    faction_id: 'RS',
                    by_osid: [
                        { osid: 'op:b:1', state: 'adequate' },
                        { osid: 'op:b:2', state: 'adequate' },
                    ],
                },
                {
                    faction_id: 'HRHB',
                    by_osid: [
                        { osid: 'op:c:1', state: 'critical' },
                    ],
                },
            ],
        };

        updateSupplyPressure(state, [], undefined, undefined, undefined, supplyByOsid);

        expect(state.political.war_supply_pressure).toEqual({ RBiH: 100, RS: 100, HRHB: 100 });
        expect(state.political.war_supply_condition).toEqual({ HRHB: 0, RBiH: 50, RS: 100 });
    });

    it('clears stale live supply condition when OSID state is unavailable', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.political.war_supply_pressure = { RBiH: 20, RS: 20, HRHB: 20 };
        state.political.war_supply_condition = { RBiH: 100, RS: 0, HRHB: 50 };

        updateSupplyPressure(state, [], undefined, undefined, undefined, undefined);

        expect(state.political.war_supply_condition).toBeUndefined();
        expect(state.political.war_supply_pressure).toEqual({ RBiH: 20, RS: 20, HRHB: 20 });
    });

    it('prefers sector-owned frontage when live sector truth exists', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.military.corps_front_sectors = {
            'sector:rbih': {
                sector_id: 'sector:rbih',
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['e1', 'e2'],
                sub_segments: [],
                territory_osids: [],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 2,
            },
            'sector:rs': {
                sector_id: 'sector:rs',
                corps_id: 'vrs_romanija',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: ['e1', 'e2', 'e3'],
                sub_segments: [],
                territory_osids: [],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                length_edges: 3,
            },
        } as any;

        updateSupplyPressure(state, []);

        expect(state.political.war_supply_pressure?.RBiH).toBe(6);
        expect(state.political.war_supply_pressure?.RS).toBe(9);
    });

    it('does nothing when meta.phase is peace', () => {
        const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
        state.meta.phase = 'peace';
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        updateSupplyPressure(state, edges);
        expect(state.political.war_supply_pressure === undefined || Object.keys(state.political.war_supply_pressure).length === 0).toBe(true);
    });
});
