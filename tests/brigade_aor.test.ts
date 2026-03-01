/**
 * Phase II brigade behavior. Legacy AoR (Area of Responsibility) is phased out;
 * spatial model is OSID/location_osid only. Active tests cover the thin legacy API
 * retained in brigade_aor_legacy.ts. Full AoR system (Voronoi BFS, mun orders,
 * AoR validation, encirclement) was deleted in R5.
 */
import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    computeBrigadeDensity,
    getBrigadeAoRSettlements,
    getSettlementGarrison,
    identifyFrontActiveSettlements,
} from '../src/sim/combat/brigade_aor_legacy.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
    return {
        id,
        faction,
        name: `Brigade ${id}`,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel,
        cohesion: 60,
        hq_sid: hq,
        tags: []
    };
}

/**
 * Test scenario: 3-faction, 12-settlement linear graph.
 *
 * RS controls: S1, S2, S3, S4
 * RBiH controls: S5, S6, S7, S8
 * HRHB controls: S9, S10, S11, S12
 *
 * Edges: S1-S2, S2-S3, S3-S4, S4-S5, S5-S6, S6-S7, S7-S8, S8-S9, S9-S10, S10-S11, S11-S12
 * Front edges: S4-S5 (RS-RBiH), S8-S9 (RBiH-HRHB)
 */
function makeLinearScenario(): { state: GameState; edges: EdgeRecord[] } {
    const edges: EdgeRecord[] = [];
    for (let i = 1; i < 12; i++) {
        edges.push({ a: `S${i}`, b: `S${i + 1}` });
    }

    const pc: Record<string, FactionId> = {};
    for (let i = 1; i <= 4; i++) pc[`S${i}`] = 'RS';
    for (let i = 5; i <= 8; i++) pc[`S${i}`] = 'RBiH';
    for (let i = 9; i <= 12; i++) pc[`S${i}`] = 'HRHB';

    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'aor-test', phase: 'war', rbih_hrhb_war_earliest_turn: 1 } as any,
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as any,
        formations: {
            'rs-brig-1': makeFormation('rs-brig-1', 'RS', 'S2'),
            'rbih-brig-1': makeFormation('rbih-brig-1', 'RBiH', 'S6'),
            'hrhb-brig-1': makeFormation('hrhb-brig-1', 'HRHB', 'S10'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: pc,
        war_alliance_rbih_hrhb: -0.5
    } as GameState;

    return { state, edges };
}


describe('identifyFrontActiveSettlements', () => {
    it('identifies settlements on opposing-control edges', () => {
        const { state, edges } = makeLinearScenario();
        const frontActive = identifyFrontActiveSettlements(state, edges);

        expect(frontActive.has('S4')).toBe(true);  // RS side of RS-RBiH front
        expect(frontActive.has('S5')).toBe(true);  // RBiH side of RS-RBiH front
        expect(frontActive.has('S8')).toBe(true);  // RBiH side of RBiH-HRHB front
        expect(frontActive.has('S9')).toBe(true);  // HRHB side of RBiH-HRHB front
        expect(frontActive.has('S1')).toBe(false); // Deep rear
        expect(frontActive.has('S12')).toBe(false); // Deep rear
    });
});

/* initializeBrigadeAoR, validateBrigadeAoR, applyBrigadeMunicipalityOrders tests
   removed in R5 — those functions were deleted with brigade_aor.ts. */

describe('computeBrigadeDensity', () => {
    it('returns 0 for nonexistent brigade', () => {
        const { state } = makeLinearScenario();
        expect(computeBrigadeDensity(state, 'nonexistent')).toBe(0);
    });

    it('uses personnel / AoR count (settlement-level: AoR is the coverage)', () => {
        const formationId = 'rs-brig-cap';
        const pc: Record<string, FactionId> = {};
        const brigadeAor: Record<string, string> = {};
        const formations: Record<string, FormationState> = {
            [formationId]: makeFormation(formationId, 'RS', 'S001', 3000)
        };
        for (let i = 1; i <= 4; i++) {
            const sid = `S${String(i).padStart(3, '0')}`;
            pc[sid] = 'RS';
            brigadeAor[sid] = formationId;
        }
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 20, seed: 'aor-cap-test', phase: 'war' } as any,
            factions: [
                { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as any,
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            political_controllers: pc,
            brigade_aor: brigadeAor
        } as GameState;

        const density = computeBrigadeDensity(state, formationId);
        expect(density).toBeCloseTo(3000 / 4, 6);
        expect(getSettlementGarrison(state, 'S001')).toBeCloseTo(750, 6);
        expect(getSettlementGarrison(state, 'S004')).toBeCloseTo(750, 6);
    });

    it('garrison is personnel / AoR size (no separate operational cap)', () => {
        const formationId = 'rbih-sarajevo-brig';
        const formation = makeFormation(formationId, 'RBiH', 'S001', 1200);
        formation.tags = ['mun:centar_sarajevo'];
        const pc: Record<string, FactionId> = {};
        const brigadeAor: Record<string, string> = { S001: formationId };
        pc['S001'] = 'RBiH';
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 20, seed: 'sarajevo-cap-test', phase: 'war' } as any,
            factions: [
                { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as any,
            formations: { [formationId]: formation },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            political_controllers: pc,
            brigade_aor: brigadeAor
        } as GameState;

        expect(getSettlementGarrison(state, 'S001')).toBe(1200);
    });

    /* computeBrigadeOperationalCoverageCap test removed in R5 — function deleted */
});
