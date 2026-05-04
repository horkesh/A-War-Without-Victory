/**
 * Phase M2: Morale system tests.
 * - Population affinity calculation
 * - Retreat resistance gate (morale absorption)
 * - Morale drift (affinity, encirclement, exhaustion)
 * - Post-battle morale effects
 * - Morale bounds
 */

import { describe, expect, it } from 'vitest';
import { getFactionAlignedPopulationShare, type MunicipalityPopulation1991Map } from '../src/state/population_share.js';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

/** Test census data - simplified for testing. */
const TEST_CENSUS: MunicipalityPopulation1991Map = {
    srebrenica: { total: 37000, bosniak: 27118, serb: 9163, croat: 38, other: 681 },
    banja_luka: { total: 195000, bosniak: 29000, serb: 106000, croat: 30000, other: 30000 },
    livno: { total: 40000, bosniak: 6000, serb: 4000, croat: 28000, other: 2000 },
    tuzla: { total: 132000, bosniak: 60000, serb: 20000, croat: 16000, other: 36000 },
    prijedor: { total: 112000, bosniak: 49000, serb: 53000, croat: 6000, other: 4000 },
};

function makeFormation(overrides: Partial<FormationState> & { id: string; faction: string }): FormationState {
    return {
        name: 'Test',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        morale: 60,
        location_osid: 'op:tuzla:tuzla_2',
        ...overrides,
    } as FormationState;
}

function makeState(formations: Record<string, FormationState>, overrides?: Partial<GameState>): GameState {
    const overrideMilitary = (overrides?.military ?? {}) as Record<string, unknown>;
    return {
        schema_version: 1,
        meta: {
            turn: 10,
            seed: 'test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 4,
            war_start_turn: 5,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
            game_over: false,
            outcome: undefined,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 70,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                prewar_capital: 70,
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null,
            },
        ],
        ...overrides,
        military: {
            formations,
            brigade_encircled: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            ...overrideMilitary,
        } as any,
    } as any;
}

describe('Population Affinity', () => {
    // Phase 3 it.each consolidation: 3 faction-symmetric high-affinity contracts
    // (RBiH/RS/HRHB) with parametric per-faction municipality, floor, and
    // strictness preserved as overrides.
    it.each([
        { faction: 'RBiH' as const, mun: 'srebrenica', label: 'Srebrenica (73% Bosniak)', floor: 0.70, strict: true },
        { faction: 'RS' as const, mun: 'banja_luka', label: 'Banja Luka (54% Serb)', floor: 0.50, strict: true },
        { faction: 'HRHB' as const, mun: 'livno', label: 'Livno (70% Croat)', floor: 0.70, strict: false },
    ])('$faction has high affinity in $label', ({ faction, mun, floor, strict }) => {
        const aff = getFactionAlignedPopulationShare(mun, faction, TEST_CENSUS, 0.5);
        if (strict) {
            expect(aff).toBeGreaterThan(floor);
        } else {
            expect(aff).toBeGreaterThanOrEqual(floor);
        }
    });

    it('RS has low affinity in Tuzla', () => {
        const aff = getFactionAlignedPopulationShare('tuzla', 'RS', TEST_CENSUS, 0.5);
        expect(aff).toBeLessThan(0.30);
    });

    it('returns fallback for unknown municipality', () => {
        const aff = getFactionAlignedPopulationShare('nonexistent', 'RBiH', TEST_CENSUS, 0.5);
        expect(aff).toBe(0.5);
    });
});

describe('Morale Drift', () => {
    it('high affinity OSID increases morale', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: formation });
        const report = runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeGreaterThan(50);
        expect(report.formations_updated).toBe(1);
    });

    it('low affinity OSID decreases morale', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: formation });
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeLessThan(50);
    });

    it('neutral affinity does not drift', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:prijedor:prijedor_2' });
        const state = makeState({ bde1: formation });
        const report = runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBe(50);
        expect(report.formations_updated).toBe(0);
    });

    it('encircled + own pop increases morale', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: formation }, { military: { brigade_encircled: { bde1: true } } } as any);
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBe(55);
    });

    it('encircled + enemy pop decreases morale', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: formation }, { military: { brigade_encircled: { bde1: true } } } as any);
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBe(45);
    });

    it('skips engaged formations', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: formation });
        const engaged = new Set(['bde1']);
        const report = runMoraleDrift(state, engaged, TEST_CENSUS);
        expect(formation.morale).toBe(50);
        expect(report.formations_updated).toBe(0);
    });

    it('morale never exceeds 100', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 99, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: formation });
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeLessThanOrEqual(100);
    });

    it('morale never drops below 0', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RS', morale: 1, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: formation }, { military: { brigade_encircled: { bde1: true } } } as any);
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeGreaterThanOrEqual(0);
    });

    it('defaults morale to 60 when undefined', () => {
        const formation = makeFormation({ id: 'bde1', faction: 'RBiH', location_osid: 'op:srebrenica:srebrenica_2' });
        delete (formation as any).morale;
        const state = makeState({ bde1: formation });
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeDefined();
        expect(formation.morale).toBeGreaterThan(60);
    });
});

describe('Morale Drift - Exhaustion', () => {
    it('high fatigue reduces morale', () => {
        const formation = makeFormation({
            id: 'bde1',
            faction: 'RS',
            morale: 50,
            location_osid: 'op:banja_luka:banja_luka_2',
            ops: { fatigue: 85, last_supplied_turn: null },
        });
        const state = makeState({ bde1: formation });
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeLessThan(50);
    });

    it('critical fatigue reduces morale more', () => {
        const formation = makeFormation({
            id: 'bde1',
            faction: 'RS',
            morale: 50,
            location_osid: 'op:banja_luka:banja_luka_2',
            ops: { fatigue: 96, last_supplied_turn: null },
        });
        const state = makeState({ bde1: formation });
        runMoraleDrift(state, [], TEST_CENSUS);
        expect(formation.morale).toBeLessThan(49);
    });
});

describe('Morale Drift - Determinism', () => {
    it('produces same result on repeated calls', () => {
        const formation1 = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const formation2 = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state1 = makeState({ bde1: formation1 });
        const state2 = makeState({ bde1: formation2 });
        runMoraleDrift(state1, [], TEST_CENSUS);
        runMoraleDrift(state2, [], TEST_CENSUS);
        expect(formation1.morale).toBe(formation2.morale);
    });
});
