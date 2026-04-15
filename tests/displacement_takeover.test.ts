import { expect, test } from 'vitest';

import type { SettlementRecord } from '../src/map/settlements.js';
import { ENCLAVE_OVERRUN_KILL_FRACTION, processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 0, seed: 'disp-takeover-test', phase: 'war', rbih_hrhb_war_earliest_turn: 20 },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            },
            {
                id: 'RS',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            },
            {
                id: 'HRHB',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
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
    political_controllers: {}
  } as any,
        displacement: {} as any
    };
}

function settlementsFixture(): Map<string, SettlementRecord> {
    return new Map<string, SettlementRecord>([
        ['S_ZV', { sid: 'S_ZV', source_id: '1', mun_code: 'zvornik', mun: 'Zvornik', mun1990_id: 'zvornik' }],
        ['S_SR', { sid: 'S_SR', source_id: '2', mun_code: 'srebrenica', mun: 'Srebrenica', mun1990_id: 'srebrenica' }],
        ['S_TZ', { sid: 'S_TZ', source_id: '3', mun_code: 'tuzla', mun: 'Tuzla', mun1990_id: 'tuzla' }],
        ['S_GO', { sid: 'S_GO', source_id: '4', mun_code: 'gorazde', mun: 'Gorazde', mun1990_id: 'gorazde' }],
        ['S_TR', { sid: 'S_TR', source_id: '5', mun_code: 'travnik', mun: 'Travnik', mun1990_id: 'travnik' }],
        ['S_ZE', { sid: 'S_ZE', source_id: '6', mun_code: 'zenica', mun: 'Zenica', mun1990_id: 'zenica' }],
        ['S_PR', { sid: 'S_PR', source_id: '7', mun_code: 'prijedor', mun: 'Prijedor', mun1990_id: 'prijedor' }],
        ['S_OR', { sid: 'S_OR', source_id: '8', mun_code: 'orasje', mun: 'Orasje', mun1990_id: 'orasje' }],
        ['S_MO', { sid: 'S_MO', source_id: '9', mun_code: 'mostar', mun: 'Mostar', mun1990_id: 'mostar' }],
        ['S_LI', { sid: 'S_LI', source_id: '10', mun_code: 'livno', mun: 'Livno', mun1990_id: 'livno' }]
    ]);
}

const pop1991: MunicipalityPopulation1991Map = {
    zvornik: { total: 1000, bosniak: 800, serb: 150, croat: 20, other: 30 },
    srebrenica: { total: 1000, bosniak: 900, serb: 70, croat: 10, other: 20 },
    tuzla: { total: 1000, bosniak: 750, serb: 180, croat: 30, other: 40 },
    gorazde: { total: 1000, bosniak: 850, serb: 100, croat: 20, other: 30 },
    travnik: { total: 1000, bosniak: 700, serb: 180, croat: 80, other: 40 },
    zenica: { total: 1000, bosniak: 780, serb: 140, croat: 40, other: 40 },
    prijedor: { total: 1000, bosniak: 200, serb: 700, croat: 80, other: 20 },
    orasje: { total: 1000, bosniak: 300, serb: 100, croat: 550, other: 50 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
    livno: { total: 1000, bosniak: 200, serb: 50, croat: 700, other: 50 }
};

test('allied RBiH-HRHB flips before war turn do not seed an HRHB timer, but still seed hostile RS displacement', () => {
    const state = baseState();
    state.meta.turn = 5;
    state.political.war_alliance_rbih_hrhb = 0.8;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_TR: 'RBiH'
    };

    const report = processDisplacementTakeover(
        state,
        settlements,
        {
            battles: [
                {
                    settlement_flipped: true,
                    location: 'S_TR',
                    attacker_faction: 'RBiH',
                    defender_faction: 'HRHB'
                }
            ]
        },
        pop1991
    );

    expect(report.timers_started).toBe(1);
    expect(Object.keys(state.displacement.hostile_takeover_timers ?? {})).toEqual(['sid:S_TR|RS']);
});

test.skip('east Bosnia Bosniak displacement routes to Srebrenica then Tuzla after camp delay', () => {
    const state = baseState();
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_ZV: 'RS',
        S_SR: 'RBiH',
        S_TZ: 'RBiH',
        S_GO: 'RBiH',
        S_TR: 'RBiH',
        S_ZE: 'RBiH'
    };
    // Camp reroute requires faction to have a brigade in destination mun (canon 2026-02-19).
    state.military.formations = {
        rbih_1: { id: 'rbih_1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'RBiH 1', created_turn: 0, assignment: null }
    };
    (state as import('../src/state/game_state.js').GameState & import('../src/state/game_state.js').LegacyBrigadeAoRState).brigade_aor = { S_SR: 'rbih_1', S_TZ: 'rbih_1' };
    state.displacement.displacement_state = {
        zvornik: { mun_id: 'zvornik', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        srebrenica: { mun_id: 'srebrenica', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        tuzla: { mun_id: 'tuzla', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        gorazde: { mun_id: 'gorazde', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    // Turn 0: flip starts timer.
    processDisplacementTakeover(
        state,
        settlements,
        {
            battles: [
                {
                    settlement_flipped: true,
                    location: 'S_ZV',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH'
                }
            ]
        },
        pop1991
    );
    expect(state.displacement.hostile_takeover_timers?.zvornik).toBeTruthy();

    // Turn 4: timer matures and creates camp population.
    state.meta.turn = 4;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    expect(mature.timers_matured > 0).toBeTruthy();
    expect((state.displacement.displacement_camp_state?.zvornik?.population ?? 0) > 0).toBeTruthy();

    // Turn 8: camp reroutes; east-bosnia order should prioritize Srebrenica then Tuzla.
    state.meta.turn = 8;
    const routed = processDisplacementTakeover(state, settlements, undefined, pop1991);
    const routesFromZvornik = routed.routing.filter((r) => r.from_mun === 'zvornik');
    expect(routesFromZvornik.length > 0).toBeTruthy();
    expect(routesFromZvornik[0].to_mun).toBe('srebrenica');
    expect(routesFromZvornik.some((r) => r.to_mun === 'tuzla')).toBeTruthy();
});

test('enclave overrun applies higher kill fraction on second displacement', () => {
    const state = baseState();
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_SR: 'RS',
        S_TZ: 'RBiH',
        S_GO: 'RBiH'
    };
    state.displacement.displacement_state = {
        srebrenica: {
            mun_id: 'srebrenica',
            original_population: 1000,
            displaced_out: 0,
            displaced_in: 500,
            displaced_in_by_faction: { RBiH: 500 },
            lost_population: 0,
            last_updated_turn: 0
        }
    };

    processDisplacementTakeover(
        state,
        settlements,
        {
            battles: [
                {
                    settlement_flipped: true,
                    location: 'S_SR',
                    attacker_faction: 'RS',
                    defender_faction: 'RBiH'
                }
            ]
        },
        pop1991
    );

    state.meta.turn = 4;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    const displaced = mature.displaced_total;
    const expectedStandardKills = Math.floor(displaced * 0.10);
    const expectedEnclaveKills = Math.floor(displaced * ENCLAVE_OVERRUN_KILL_FRACTION);
    expect(mature.killed_total).toBeGreaterThan(expectedStandardKills);
    expect(mature.killed_total).toBeGreaterThanOrEqual(expectedEnclaveKills - 1);
});

test.skip('HRHB taking from RS expels 100% of Serbs (hostile share override)', () => {
    const state = baseState();
    state.meta.turn = 20;
    state.political.war_alliance_rbih_hrhb = 0.1;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_PR: 'HRHB',
        S_MO: 'HRHB'
    };
    state.displacement.displacement_state = {
        prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'HRHB', defender_faction: 'RS' }] },
        pop1991
    );
    state.meta.turn = 24;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    expect(mature.displaced_total >= 900).toBeTruthy();
});

test('RBiH taking from RS displaces 50% of Serbs', () => {
    const state = baseState();
    state.meta.turn = 20;
    state.political.war_alliance_rbih_hrhb = 0.1;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_PR: 'RBiH',
        S_TZ: 'RBiH',
        S_ZE: 'RBiH'
    };
    state.displacement.displacement_state = {
        prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'RBiH', defender_faction: 'RS' }] },
        pop1991
    );
    state.meta.turn = 24;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    const expectedApprox = Math.floor(1000 * 0.5 * 0.7);
    expect(mature.displaced_total >= expectedApprox * 0.8 && mature.displaced_total <= expectedApprox * 1.2).toBeTruthy();
});

test('Posavina takeover keeps an elevated flee-abroad share even with mixed hostile cohorts', () => {
    const state = baseState();
    state.meta.turn = 20;
    state.political.war_alliance_rbih_hrhb = 0.1;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_OR: 'RS',
        S_MO: 'HRHB',
        S_TR: 'HRHB'
    };
    state.displacement.displacement_state = {
        orasje: { mun_id: 'orasje', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'S_OR', attacker_faction: 'RS', defender_faction: 'HRHB' }] },
        pop1991
    );
    state.meta.turn = 24;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    const totalDisplaced = mature.displaced_total;
    const fledAbroad = mature.fled_abroad_total;
    const routed = mature.routed_total;
    const killed = mature.killed_total;
    const survivors = totalDisplaced - killed;
    const fleeFraction = survivors > 0 ? fledAbroad / survivors : 0;
    expect(fleeFraction).toBeGreaterThan(0.45);
});

test.skip('RS taking from RBiH expels 100% of Bosniaks/Croats', () => {
    const state = baseState();
    state.meta.turn = 5;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_ZV: 'RS',
        S_SR: 'RS',
        S_TZ: 'RBiH',
        S_GO: 'RBiH'
    };
    state.displacement.displacement_state = {
        zvornik: { mun_id: 'zvornik', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'S_ZV', attacker_faction: 'RS', defender_faction: 'RBiH' }] },
        pop1991
    );
    state.meta.turn = 9;
    const mature = processDisplacementTakeover(state, settlements, undefined, pop1991);
    expect(mature.displaced_total >= 900).toBeTruthy();
    expect(state.displacement.civilian_casualties?.RBiH).toBeTruthy();
    expect((state.displacement.civilian_casualties?.RBiH?.killed ?? 0) + (state.displacement.civilian_casualties?.RBiH?.fled_abroad ?? 0) > 0).toBeTruthy();
});

test.skip('Croat from Prijedor routes to Livno first (Herzegovina urban centers)', () => {
    const state = baseState();
    state.meta.turn = 20;
    state.political.war_alliance_rbih_hrhb = 0.1;
    const settlements = settlementsFixture();
    state.political.political_controllers = {
        S_PR: 'RS',
        S_LI: 'HRHB',
        S_MO: 'HRHB',
        S_TZ: 'RBiH'
    };
    // Camp reroute requires faction to have a brigade in destination mun (canon 2026-02-19).
    state.military.formations = {
        hrhb_1: { id: 'hrhb_1', faction: 'HRHB', kind: 'brigade', status: 'active', name: 'HRHB 1', created_turn: 0, assignment: null, location_osid: 'S_LI' }
    };
    (state as import('../src/state/game_state.js').GameState & import('../src/state/game_state.js').LegacyBrigadeAoRState).brigade_aor = { S_LI: 'hrhb_1', S_MO: 'hrhb_1' };
    state.displacement.displacement_state = {
        prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        livno: { mun_id: 'livno', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        mostar: { mun_id: 'mostar', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
    };

    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'RS', defender_faction: 'HRHB' }] },
        pop1991
    );
    state.meta.turn = 24;
    processDisplacementTakeover(state, settlements, undefined, pop1991);
    state.meta.turn = 28;
    const routed = processDisplacementTakeover(state, settlements, undefined, pop1991);
    const routesFromPrijedor = routed.routing.filter((r) => r.from_mun === 'prijedor');
    const firstDest = routesFromPrijedor[0]?.to_mun;
    expect(firstDest).toBe('livno');
});
