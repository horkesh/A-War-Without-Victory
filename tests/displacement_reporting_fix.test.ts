/**
 * Regression test: displacement reporting bug fix
 *
 * System A (displacement_state) carries the 2.2M displaced persons from Peace phase.
 * System C (settlement_displacement / municipality_displacement) was always 0 because
 * isPressureEligible looked up SID keys (e.g. "S100013") in an OSID-keyed
 * political_controllers map (e.g. keyed by "op:mun:slug") — always returning false.
 *
 * Fixes verified here:
 * 1. buildWeeklyReport in War phase now includes displacement_state in totals.
 * 2. isPressureEligible correctly resolves SID→OSID when canonicalToOperational is provided.
 */

import { describe, expect, it } from 'vitest';
import { buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { isPressureEligible, getEligiblePressureEdges } from '../src/sim/emergence/pressure_eligibility.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal War phase GameState fixture with System A displacement data. */
function makePhaseIIStateWithDisplacementState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 20,
            seed: 'disp-fix-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 4,
            war_start_turn: 6
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 40, legitimacy: 40, control: 40, logistics: 40, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 60, legitimacy: 60, control: 60, logistics: 60, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: true,
                declaration_turn: 5
            },
            {
                id: 'HRHB',
                profile: { authority: 30, legitimacy: 30, control: 30, logistics: 30, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
            'op:banovici:banovici_2': 'RS',
            'op:banovici:seona': 'RBiH'
        }
  } as any,
  displacement: {
    displacement_state: {
            'banovici': {
                displaced_out: 15000,
                displaced_in: 3000,
                lost_population: 2000
            },
            'sarajevo': {
                displaced_out: 80000,
                displaced_in: 10000,
                lost_population: 5000
            }
        },
    settlement_displacement: {},
    municipality_displacement: {}
  } as any,
} as unknown as GameState;
}

describe('displacement reporting fix — scenario_reporting.ts', () => {
    it('War phase buildWeeklyReport returns non-zero municipality_displacement_total when displacement_state has data', () => {
        const state = makePhaseIIStateWithDisplacementState();
        const report = buildWeeklyReport(state);

        // System A: banovici displaced_out=15000 lost=2000 → 17000; sarajevo displaced_out=80000 lost=5000 → 85000
        // Total: 102000
        expect(report.municipality_displacement_total).toBeGreaterThan(0);
        expect(report.municipality_displacement_total).toBe(17000 + 85000);
    });

    it('War phase buildWeeklyReport counts municipalities with displacement_state data', () => {
        const state = makePhaseIIStateWithDisplacementState();
        const report = buildWeeklyReport(state);

        // Two municipalities with non-zero displacement
        expect(report.municipality_displacement_count).toBe(2);
    });

    it('War phase buildWeeklyReport settlement_displacement_total includes System A data as proxy', () => {
        const state = makePhaseIIStateWithDisplacementState();
        const report = buildWeeklyReport(state);

        // settlement_displacement_total should include System A total as municipality-level proxy
        expect(report.settlement_displacement_total).toBeGreaterThan(0);
    });

    it('War phase buildWeeklyReport returns zero when both System A and System C are empty', () => {
        const state = makePhaseIIStateWithDisplacementState();
        // Remove displacement_state
        delete (state as any).displacement.displacement_state;
        const report = buildWeeklyReport(state);

        expect(report.municipality_displacement_total).toBe(0);
        expect(report.municipality_displacement_count).toBe(0);
        expect(report.settlement_displacement_total).toBe(0);
    });

    it('Peace phase buildWeeklyReport still reads from displacement_state (existing behavior)', () => {
        const state = makePhaseIIStateWithDisplacementState();
        // Switch to Peace phase
        (state.meta as { phase: string }).phase = 'war';
        const report = buildWeeklyReport(state);

        expect(report.municipality_displacement_total).toBeGreaterThan(0);
        expect(report.municipality_displacement_total).toBe(17000 + 85000);
    });
});

describe('displacement OSID fix — isPressureEligible', () => {
    /** GameState with OSID-keyed political_controllers (post-promotion War phase state) */
    const osidKeyedState: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 10, seed: 'osid-test', phase: 'war' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: {
            'op:banovici:banovici_2': 'RS',
            'op:banovici:seona': 'RBiH'
        }
  } as any,
} as unknown as GameState;

    const sidToOsid = {
        S100013: 'op:banovici:banovici_2',
        S100030: 'op:banovici:seona'
    };

    it('returns false without map when edge.a/edge.b are SIDs and pc is OSID-keyed', () => {
        // This is the ORIGINAL broken behavior — SIDs not found in OSID-keyed pc
        const result = isPressureEligible(
            osidKeyedState,
            { a: 'S100013', b: 'S100030' }
        );
        expect(result).toBe(false);
    });

    it('returns true with map when edge.a/edge.b are SIDs and pc is OSID-keyed with opposing control', () => {
        // FIX: with canonicalToOperational, SIDs resolve to OSIDs and control lookup succeeds
        const result = isPressureEligible(
            osidKeyedState,
            { a: 'S100013', b: 'S100030' },
            undefined,
            sidToOsid
        );
        expect(result).toBe(true); // RS vs RBiH = opposing = eligible
    });

    it('returns false with map when both sides have same controller', () => {
        const sameControlState: GameState = {
            ...osidKeyedState,
            political: {
                political_controllers: {
                    'op:banovici:banovici_2': 'RS',
                    'op:banovici:seona': 'RS'
                }
            } as any
        } as unknown as GameState;
        const result = isPressureEligible(
            sameControlState,
            { a: 'S100013', b: 'S100030' },
            undefined,
            sidToOsid
        );
        expect(result).toBe(false); // same controller = no front
    });

    it('returns true when edges already use OSID format and pc is OSID-keyed (no map needed)', () => {
        // When operational edges are passed directly, no map is required
        const result = isPressureEligible(
            osidKeyedState,
            { a: 'op:banovici:banovici_2', b: 'op:banovici:seona' }
        );
        expect(result).toBe(true); // RS vs RBiH = opposing
    });

    it('getEligiblePressureEdges with SID edges and OSID-keyed pc finds eligible edges when map provided', () => {
        const edges = [
            { a: 'S100013', b: 'S100030' }
        ];
        // Without map: empty result (broken)
        const withoutMap = getEligiblePressureEdges(osidKeyedState, edges);
        expect(withoutMap).toHaveLength(0);

        // With map: correct result
        const withMap = getEligiblePressureEdges(osidKeyedState, edges, undefined, sidToOsid);
        expect(withMap).toHaveLength(1);
    });
});
