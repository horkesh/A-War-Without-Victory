/**
 * Phase M2: Morale system tests.
 * - Population affinity calculation
 * - Retreat resistance gate (morale absorption)
 * - Morale drift (affinity, encirclement, exhaustion)
 * - Post-battle morale effects
 * - Morale bounds
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getFactionAlignedPopulationShare, type MunicipalityPopulation1991Map } from '../src/state/population_share.js';
import { runPhaseIIMoraleDrift, type MoraleDriftReport } from '../src/sim/combat/morale_drift.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

/** Test census data — simplified for testing. */
const TEST_CENSUS: MunicipalityPopulation1991Map = {
    srebrenica: { total: 37000, bosniak: 27118, serb: 9163, croat: 38, other: 681 },  // 73% Bosniak
    banja_luka: { total: 195000, bosniak: 29000, serb: 106000, croat: 30000, other: 30000 }, // 54% Serb
    livno:      { total: 40000, bosniak: 6000, serb: 4000, croat: 28000, other: 2000 },      // 70% Croat
    tuzla:      { total: 132000, bosniak: 60000, serb: 20000, croat: 16000, other: 36000 },   // 73% Bosniak+Other
    prijedor:   { total: 112000, bosniak: 49000, serb: 53000, croat: 6000, other: 4000 },     // 47% Serb
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
    return {
        schema_version: 1,
        meta: { turn: 10, seed: 'test', phase: 'war', referendum_held: true, referendum_turn: 4, war_start_turn: 5, referendum_eligible_turn: null, referendum_deadline_turn: null, game_over: false, outcome: undefined },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, prewar_capital: 70, declaration_pressure: 0, declared: false, declaration_turn: null },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, prewar_capital: 70, declaration_pressure: 0, declared: false, declaration_turn: null },
        ],
        formations,
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        ...overrides,
    } as any;
}

describe('Population Affinity', () => {
    it('RBiH has high affinity in Srebrenica (73% Bosniak)', () => {
        const aff = getFactionAlignedPopulationShare('srebrenica', 'RBiH', TEST_CENSUS, 0.5);
        assert.ok(aff > 0.70, `Expected > 0.70, got ${aff}`);
    });

    it('RS has high affinity in Banja Luka (54% Serb)', () => {
        const aff = getFactionAlignedPopulationShare('banja_luka', 'RS', TEST_CENSUS, 0.5);
        assert.ok(aff > 0.50, `Expected > 0.50, got ${aff}`);
    });

    it('HRHB has high affinity in Livno (70% Croat)', () => {
        const aff = getFactionAlignedPopulationShare('livno', 'HRHB', TEST_CENSUS, 0.5);
        assert.ok(aff >= 0.70, `Expected >= 0.70, got ${aff}`);
    });

    it('RS has low affinity in Tuzla', () => {
        const aff = getFactionAlignedPopulationShare('tuzla', 'RS', TEST_CENSUS, 0.5);
        assert.ok(aff < 0.30, `Expected < 0.30, got ${aff}`);
    });

    it('returns fallback for unknown municipality', () => {
        const aff = getFactionAlignedPopulationShare('nonexistent', 'RBiH', TEST_CENSUS, 0.5);
        assert.strictEqual(aff, 0.5);
    });
});

describe('Morale Drift', () => {
    it('high affinity OSID increases morale', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: f });
        const report = runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale! > 50, `Expected morale > 50, got ${f.morale}`);
        assert.strictEqual(report.formations_updated, 1);
    });

    it('low affinity OSID decreases morale', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: f });
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale! < 50, `Expected morale < 50, got ${f.morale}`);
    });

    it('neutral affinity does not drift', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:prijedor:prijedor_2' });
        const state = makeState({ bde1: f });
        const report = runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.strictEqual(f.morale, 50);
        assert.strictEqual(report.formations_updated, 0);
    });

    it('encircled + own pop → morale UP', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: f }, { brigade_encircled: { bde1: true } } as any);
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        // High affinity (+2) + encirclement own pop (+3) = +5
        assert.strictEqual(f.morale, 55);
    });

    it('encircled + enemy pop → morale DOWN', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RS', morale: 50, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: f }, { brigade_encircled: { bde1: true } } as any);
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        // Low affinity (-2) + encirclement enemy pop (-3) = -5
        assert.strictEqual(f.morale, 45);
    });

    it('skips engaged formations', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: f });
        const engaged = new Set(['bde1']);
        const report = runPhaseIIMoraleDrift(state, engaged, TEST_CENSUS);
        assert.strictEqual(f.morale, 50); // unchanged
        assert.strictEqual(report.formations_updated, 0);
    });

    it('morale never exceeds 100', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 99, location_osid: 'op:srebrenica:srebrenica_2' });
        const state = makeState({ bde1: f });
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale! <= 100, `Expected <= 100, got ${f.morale}`);
    });

    it('morale never drops below 0', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RS', morale: 1, location_osid: 'op:tuzla:tuzla_2' });
        const state = makeState({ bde1: f }, { brigade_encircled: { bde1: true } } as any);
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale! >= 0, `Expected >= 0, got ${f.morale}`);
    });

    it('defaults morale to 60 when undefined', () => {
        const f = makeFormation({ id: 'bde1', faction: 'RBiH', location_osid: 'op:srebrenica:srebrenica_2' });
        delete (f as any).morale;
        const state = makeState({ bde1: f });
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale !== undefined, 'morale should be initialized');
        assert.ok(f.morale! > 60, 'morale should increase from 60 in high-affinity');
    });
});

describe('Morale Drift — Exhaustion', () => {
    it('high fatigue reduces morale', () => {
        const f = makeFormation({
            id: 'bde1', faction: 'RS', morale: 50,
            location_osid: 'op:banja_luka:banja_luka_2',
            ops: { fatigue: 85, last_supplied_turn: null },
        });
        const state = makeState({ bde1: f });
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        // RS in Banja Luka: 54% Serb → neutral affinity (0.30-0.70 range), no drift from affinity
        // But fatigue 85 > 80 threshold → -0.5 morale penalty
        assert.ok(f.morale! < 50, `Expected morale < 50, got ${f.morale}`);
    });

    it('critical fatigue reduces morale more', () => {
        const f = makeFormation({
            id: 'bde1', faction: 'RS', morale: 50,
            location_osid: 'op:banja_luka:banja_luka_2',
            ops: { fatigue: 96, last_supplied_turn: null },
        });
        const state = makeState({ bde1: f });
        runPhaseIIMoraleDrift(state, [], TEST_CENSUS);
        assert.ok(f.morale! < 49, `Expected morale < 49, got ${f.morale}`);
    });
});

describe('Morale Drift — Determinism', () => {
    it('produces same result on repeated calls', () => {
        const f1 = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const f2 = makeFormation({ id: 'bde1', faction: 'RBiH', morale: 50, location_osid: 'op:srebrenica:srebrenica_2' });
        const state1 = makeState({ bde1: f1 });
        const state2 = makeState({ bde1: f2 });
        runPhaseIIMoraleDrift(state1, [], TEST_CENSUS);
        runPhaseIIMoraleDrift(state2, [], TEST_CENSUS);
        assert.strictEqual(f1.morale, f2.morale);
    });
});
