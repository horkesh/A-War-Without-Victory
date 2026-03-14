/**
 * Tests for Phase 2 (n698): recomputeSectorPowerAndThreat runs after all
 * assignment steps, so sectors rescued by ensureMinimumSectorCoverage show
 * non-zero defensive_power and threat_ratio.
 *
 * Uses the same topology as commander_driven_brigade_assignment.test.ts:
 * linear front chain (f1-f5 vs e1-e5), single corps, single sector.
 */

import { describe, expect, it } from 'vitest';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        morale: 70,
        ...overrides,
    } as FormationState;
}

/**
 * Linear front: f1-f5 (RS) vs e1-e5 (RBiH), one corps.
 * One brig_seed at f3 seeds the corps. Optionally supply extra brigades/formations.
 */
function makeLinearFrontState(overrides?: {
    formations?: Record<string, FormationState>;
    extraPolitical?: Record<string, string>;
}): { state: GameState; edges: EdgeRecord[] } {
    const formations: Record<string, FormationState> = {
        corps_a: makeFormation('corps_a', {
            kind: 'corps' as any,
            faction: 'RS',
            location_osid: 'op:zon:rear',
        }),
        brig_seed: makeFormation('brig_seed', {
            corps_id: 'corps_a',
            location_osid: 'op:zon:f3',
            home_osid: 'op:zon:f3',
        }),
        ...overrides?.formations,
    };

    const political: Record<string, string> = {
        'op:zon:rear': 'RS',
        'op:zon:f1': 'RS', 'op:zon:f2': 'RS', 'op:zon:f3': 'RS',
        'op:zon:f4': 'RS', 'op:zon:f5': 'RS',
        'op:zon:e1': 'RBiH', 'op:zon:e2': 'RBiH', 'op:zon:e3': 'RBiH',
        'op:zon:e4': 'RBiH', 'op:zon:e5': 'RBiH',
        ...overrides?.extraPolitical,
    };

    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'n698-power-threat-test',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        } as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as unknown as GameState['factions'],
        military: {
            formations,
            war_front_edges_osid: [
                { edge_id: 'op:zon:f1__op:zon:e1', a: 'op:zon:f1', b: 'op:zon:e1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:zon:f2__op:zon:e2', a: 'op:zon:f2', b: 'op:zon:e2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:zon:f3__op:zon:e3', a: 'op:zon:f3', b: 'op:zon:e3', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:zon:f4__op:zon:e4', a: 'op:zon:f4', b: 'op:zon:e4', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:zon:f5__op:zon:e5', a: 'op:zon:f5', b: 'op:zon:e5', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as GameState['military'],
        political: {
            political_controllers: political,
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:zon:rear', b: 'op:zon:f1' } as EdgeRecord,
        { a: 'op:zon:f1', b: 'op:zon:f2' } as EdgeRecord,
        { a: 'op:zon:f2', b: 'op:zon:f3' } as EdgeRecord,
        { a: 'op:zon:f3', b: 'op:zon:f4' } as EdgeRecord,
        { a: 'op:zon:f4', b: 'op:zon:f5' } as EdgeRecord,
        { a: 'op:zon:e1', b: 'op:zon:e2' } as EdgeRecord,
        { a: 'op:zon:e2', b: 'op:zon:e3' } as EdgeRecord,
        { a: 'op:zon:e3', b: 'op:zon:e4' } as EdgeRecord,
        { a: 'op:zon:e4', b: 'op:zon:e5' } as EdgeRecord,
        { a: 'op:zon:f1', b: 'op:zon:e1' } as EdgeRecord,
        { a: 'op:zon:f2', b: 'op:zon:e2' } as EdgeRecord,
        { a: 'op:zon:f3', b: 'op:zon:e3' } as EdgeRecord,
        { a: 'op:zon:f4', b: 'op:zon:e4' } as EdgeRecord,
        { a: 'op:zon:f5', b: 'op:zon:e5' } as EdgeRecord,
    ];

    return { state, edges };
}

describe('recomputeSectorPowerAndThreat — runs after all assignment steps (n698)', () => {
    it('sector with assigned brigade has non-zero defensive_power', () => {
        const { state, edges } = makeLinearFrontState();
        const sectors = buildCorpsFrontSectors(state, edges, null);
        const rsSectors = Object.values(sectors).filter(s => s.faction === 'RS');
        expect(rsSectors.length).toBeGreaterThan(0);
        // Every sector with brigades must have non-zero defensive_power
        const withBrigades = rsSectors.filter(s => s.assigned_brigade_ids.length > 0);
        expect(withBrigades.length).toBeGreaterThan(0);
        for (const s of withBrigades) {
            expect(s.defensive_power).toBeGreaterThan(0);
        }
    });

    it('sector with enemy brigade at adjacent OSID shows non-zero threat_ratio', () => {
        const { state, edges } = makeLinearFrontState({
            formations: {
                // Enemy brigade at e3 (facing f3 where brig_seed sits)
                enemy_brig: makeFormation('enemy_brig', {
                    faction: 'RBiH' as FactionId,
                    kind: 'brigade' as any,
                    corps_id: 'arbih_1st_corps' as any,
                    location_osid: 'op:zon:e3',
                    home_osid: 'op:zon:e3',
                    personnel: 1500,
                }),
            },
        });
        const sectors = buildCorpsFrontSectors(state, edges, null);
        const rsSectors = Object.values(sectors).filter(s => s.faction === 'RS');
        expect(rsSectors.length).toBeGreaterThan(0);
        // At least one RS sector facing e3 must have non-zero threat_ratio
        const withThreat = rsSectors.filter(s =>
            s.sub_segments.some(ss => ss.enemy_osids.includes('op:zon:e3'))
            && s.assigned_brigade_ids.length > 0
        );
        expect(withThreat.length).toBeGreaterThan(0);
        for (const s of withThreat) {
            expect(s.threat_ratio).toBeGreaterThan(0);
        }
    });

    it('all sectors have finite non-negative dp and threat_ratio (never NaN/undefined)', () => {
        const { state, edges } = makeLinearFrontState({
            formations: {
                enemy_e1: makeFormation('enemy_e1', {
                    faction: 'RBiH' as FactionId,
                    kind: 'brigade' as any,
                    corps_id: 'arbih_1st_corps' as any,
                    location_osid: 'op:zon:e1',
                    home_osid: 'op:zon:e1',
                    personnel: 1200,
                }),
            },
        });
        const sectors = buildCorpsFrontSectors(state, edges, null);
        for (const s of Object.values(sectors)) {
            expect(typeof s.defensive_power).toBe('number');
            expect(typeof s.threat_ratio).toBe('number');
            expect(typeof s.density).toBe('number');
            expect(Number.isFinite(s.defensive_power)).toBe(true);
            expect(Number.isFinite(s.threat_ratio)).toBe(true);
            expect(s.defensive_power).toBeGreaterThanOrEqual(0);
            expect(s.threat_ratio).toBeGreaterThanOrEqual(0);
        }
    });
});
