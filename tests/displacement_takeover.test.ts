import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { processPhaseIIDisplacementTakeover, ENCLAVE_OVERRUN_KILL_FRACTION } from '../src/state/displacement_takeover.js';
import type { SettlementRecord } from '../src/map/settlements.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'disp-takeover-test', phase: 'phase_ii', rbih_hrhb_war_earliest_turn: 20 },
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
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: {}
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
    ['S_MO', { sid: 'S_MO', source_id: '9', mun_code: 'mostar', mun: 'Mostar', mun1990_id: 'mostar' }]
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
  mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 }
};

test('does not start takeover timer for allied RBiH-HRHB flips before war turn', () => {
  const state = baseState();
  state.meta.turn = 5;
  state.phase_i_alliance_rbih_hrhb = 0.8;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_TR: 'RBiH'
  };

  const report = processPhaseIIDisplacementTakeover(
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

  assert.strictEqual(report.timers_started, 0);
  assert.deepStrictEqual(state.hostile_takeover_timers ?? {}, {});
});

test('east Bosnia Bosniak displacement routes to Srebrenica then Tuzla after camp delay', () => {
  const state = baseState();
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_ZV: 'RS',
    S_SR: 'RBiH',
    S_TZ: 'RBiH',
    S_GO: 'RBiH',
    S_TR: 'RBiH',
    S_ZE: 'RBiH'
  };
  state.displacement_state = {
    zvornik: { mun_id: 'zvornik', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
    srebrenica: { mun_id: 'srebrenica', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
    tuzla: { mun_id: 'tuzla', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
    gorazde: { mun_id: 'gorazde', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  // Turn 0: flip starts timer.
  processPhaseIIDisplacementTakeover(
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
  assert.ok(state.hostile_takeover_timers?.zvornik, 'takeover timer should be created');

  // Turn 4: timer matures and creates camp population.
  state.meta.turn = 4;
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  assert.ok(mature.timers_matured > 0);
  assert.ok((state.displacement_camp_state?.zvornik?.population ?? 0) > 0, 'camp should hold displaced population');

  // Turn 8: camp reroutes; east-bosnia order should prioritize Srebrenica then Tuzla.
  state.meta.turn = 8;
  const routed = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  const routesFromZvornik = routed.routing.filter((r) => r.from_mun === 'zvornik');
  assert.ok(routesFromZvornik.length > 0, 'expected reroute records from camp');
  assert.strictEqual(routesFromZvornik[0].to_mun, 'srebrenica');
  assert.ok(
    routesFromZvornik.some((r) => r.to_mun === 'tuzla'),
    'overflow from srebrenica should continue to tuzla'
  );
});

test('enclave overrun applies higher kill fraction on second displacement', () => {
  const state = baseState();
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_SR: 'RS',
    S_TZ: 'RBiH',
    S_GO: 'RBiH'
  };
  state.displacement_state = {
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

  processPhaseIIDisplacementTakeover(
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
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  const displaced = mature.displaced_total;
  const expectedStandardKills = Math.floor(displaced * 0.10);
  const expectedEnclaveKills = Math.floor(displaced * ENCLAVE_OVERRUN_KILL_FRACTION);
  assert.ok(
    mature.killed_total >= expectedEnclaveKills,
    `expected enclave kill fraction to apply (>= ${expectedEnclaveKills}, got ${mature.killed_total})`
  );
  assert.ok(
    mature.killed_total > expectedStandardKills,
    'enclave overrun kill total should be higher than standard 10% displacement kills'
  );
});

test('HRHB taking from RS expels 100% of Serbs (hostile share override)', () => {
  const state = baseState();
  state.meta.turn = 20;
  state.phase_i_alliance_rbih_hrhb = 0.1;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_PR: 'HRHB',
    S_MO: 'HRHB'
  };
  state.displacement_state = {
    prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  processPhaseIIDisplacementTakeover(
    state,
    settlements,
    { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'HRHB', defender_faction: 'RS' }] },
    pop1991
  );
  state.meta.turn = 24;
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  assert.ok(mature.displaced_total >= 900, 'HRHB should displace ~100% of population (hostile_share=1.0)');
});

test('RBiH taking from RS displaces 50% of Serbs', () => {
  const state = baseState();
  state.meta.turn = 20;
  state.phase_i_alliance_rbih_hrhb = 0.1;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_PR: 'RBiH',
    S_TZ: 'RBiH',
    S_ZE: 'RBiH'
  };
  state.displacement_state = {
    prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  processPhaseIIDisplacementTakeover(
    state,
    settlements,
    { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'RBiH', defender_faction: 'RS' }] },
    pop1991
  );
  state.meta.turn = 24;
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  const expectedApprox = Math.floor(1000 * 0.5 * 0.7);
  assert.ok(
    mature.displaced_total >= expectedApprox * 0.8 && mature.displaced_total <= expectedApprox * 1.2,
    `RBiH should displace ~50% of Serbs (~${expectedApprox}), got ${mature.displaced_total}`
  );
});

test('Posavina Croats have higher flee-abroad fraction (70%)', () => {
  const state = baseState();
  state.meta.turn = 20;
  state.phase_i_alliance_rbih_hrhb = 0.1;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_OR: 'RS',
    S_MO: 'HRHB',
    S_TR: 'HRHB'
  };
  state.displacement_state = {
    orasje: { mun_id: 'orasje', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  processPhaseIIDisplacementTakeover(
    state,
    settlements,
    { battles: [{ settlement_flipped: true, location: 'S_OR', attacker_faction: 'RS', defender_faction: 'HRHB' }] },
    pop1991
  );
  state.meta.turn = 24;
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  const totalDisplaced = mature.displaced_total;
  const fledAbroad = mature.fled_abroad_total;
  const routed = mature.routed_total;
  const killed = mature.killed_total;
  const survivors = totalDisplaced - killed;
  const fleeFraction = survivors > 0 ? fledAbroad / survivors : 0;
  assert.ok(
    fleeFraction >= 0.65,
    `Posavina Croats should have ~70% flee-abroad (got ${(fleeFraction * 100).toFixed(1)}%)`
  );
});

test('RS taking from RBiH expels 100% of Bosniaks/Croats', () => {
  const state = baseState();
  state.meta.turn = 5;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_ZV: 'RS',
    S_SR: 'RS',
    S_TZ: 'RBiH',
    S_GO: 'RBiH'
  };
  state.displacement_state = {
    zvornik: { mun_id: 'zvornik', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  processPhaseIIDisplacementTakeover(
    state,
    settlements,
    { battles: [{ settlement_flipped: true, location: 'S_ZV', attacker_faction: 'RS', defender_faction: 'RBiH' }] },
    pop1991
  );
  state.meta.turn = 9;
  const mature = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  assert.ok(mature.displaced_total >= 900, 'RS should displace ~100% of Bosniaks/Croats (hostile_share=1.0)');
  assert.ok(state.civilian_casualties?.RBiH, 'civilian_casualties.RBiH should exist (Bosniaks displaced)');
  assert.ok(
    (state.civilian_casualties?.RBiH?.killed ?? 0) + (state.civilian_casualties?.RBiH?.fled_abroad ?? 0) > 0,
    'RBiH civilian casualties (killed + fled_abroad) should be positive'
  );
});

test('Croat from Prijedor routes to Herzegovina (Mostar) first', () => {
  const state = baseState();
  state.meta.turn = 20;
  state.phase_i_alliance_rbih_hrhb = 0.1;
  const settlements = settlementsFixture();
  state.political_controllers = {
    S_PR: 'RS',
    S_MO: 'HRHB',
    S_TZ: 'RBiH'
  };
  state.displacement_state = {
    prijedor: { mun_id: 'prijedor', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
    mostar: { mun_id: 'mostar', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  processPhaseIIDisplacementTakeover(
    state,
    settlements,
    { battles: [{ settlement_flipped: true, location: 'S_PR', attacker_faction: 'RS', defender_faction: 'HRHB' }] },
    pop1991
  );
  state.meta.turn = 24;
  processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  state.meta.turn = 28;
  const routed = processPhaseIIDisplacementTakeover(state, settlements, undefined, pop1991);
  const routesFromPrijedor = routed.routing.filter((r) => r.from_mun === 'prijedor');
  const firstDest = routesFromPrijedor[0]?.to_mun;
  assert.strictEqual(firstDest, 'mostar', 'Croat from Prijedor should route to Mostar (Herzegovina) first');
});
