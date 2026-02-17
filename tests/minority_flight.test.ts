import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { processMinorityFlight } from '../src/state/minority_flight.js';
import type { SettlementRecord } from '../src/map/settlements.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 5, seed: 'mf-test', phase: 'phase_ii' },
    factions: [
      { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
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
    ['S_TZ', { sid: 'S_TZ', source_id: '1', mun_code: 'tuzla', mun: 'Tuzla', mun1990_id: 'tuzla' }],
    ['S_TR', { sid: 'S_TR', source_id: '2', mun_code: 'travnik', mun: 'Travnik', mun1990_id: 'travnik' }],
    ['S_MO', { sid: 'S_MO', source_id: '3', mun_code: 'mostar', mun: 'Mostar', mun1990_id: 'mostar' }]
  ]);
}

const pop1991: MunicipalityPopulation1991Map = {
  tuzla: { total: 1000, bosniak: 750, serb: 180, croat: 30, other: 40 },
  travnik: { total: 1000, bosniak: 700, serb: 180, croat: 80, other: 40 },
  mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 }
};

test('RBiH-controlled settlement with Serbs displaces 50% gradually over 26 turns', () => {
  const singleSettlement = new Map<string, SettlementRecord>([
    ['S_TZ', { sid: 'S_TZ', source_id: '1', mun_code: 'tuzla', mun: 'Tuzla', mun1990_id: 'tuzla' }]
  ]);
  const state = baseState();
  state.political_controllers = { S_TZ: 'RBiH' };
  state.displacement_state = {
    tuzla: { mun_id: 'tuzla', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  const report = processMinorityFlight(state, singleSettlement, pop1991);
  assert.ok(report.settlements_displaced >= 1, 'at least one RBiH settlement with Serbs should displace');
  assert.ok(report.displaced_total > 0, 'displaced total should be positive');
  const targetTotal = Math.floor(180 * 0.5);
  const perTurn = Math.max(1, Math.floor(targetTotal / 26));
  assert.ok(report.displaced_total <= perTurn + 2, 'first turn should displace ~1/26 of 50%');
});

test('HRHB-controlled settlement with Serbs displaces 100% immediately', () => {
  const state = baseState();
  state.political_controllers = { S_MO: 'HRHB', S_TR: 'RBiH', S_TZ: 'RBiH' };
  state.displacement_state = {
    mostar: { mun_id: 'mostar', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  const report = processMinorityFlight(state, settlementsFixture(), pop1991);
  assert.ok(report.settlements_displaced >= 1);
  assert.ok(report.displaced_total >= 40, 'Mostar has 50 Serbs; should displace ~100%');
});

test('RS-controlled settlement with Bosniaks/Croats displaces 100% immediately', () => {
  const state = baseState();
  state.political_controllers = { S_TZ: 'RS', S_TR: 'RBiH', S_MO: 'HRHB' };
  state.displacement_state = {
    tuzla: { mun_id: 'tuzla', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  const report = processMinorityFlight(state, settlementsFixture(), pop1991);
  assert.ok(report.settlements_displaced >= 1);
  assert.ok(report.displaced_total >= 700, 'Tuzla has 750+30+40 Bosniaks/Croats/other; should displace ~100%');
});

test('skips settlements in municipalities with active takeover timer', () => {
  const singleSettlement = new Map<string, SettlementRecord>([
    ['S_TZ', { sid: 'S_TZ', source_id: '1', mun_code: 'tuzla', mun: 'Tuzla', mun1990_id: 'tuzla' }]
  ]);
  const state = baseState();
  state.political_controllers = { S_TZ: 'RBiH' };
  state.hostile_takeover_timers = {
    tuzla: { mun_id: 'tuzla', from_faction: 'RS', to_faction: 'RBiH', started_turn: 3 }
  };

  const report = processMinorityFlight(state, singleSettlement, pop1991);
  assert.strictEqual(report.settlements_displaced, 0, 'should skip muns with active timer');
});

test('records civilian_casualties by faction (ethnicity)', () => {
  const state = baseState();
  state.political_controllers = { S_MO: 'HRHB', S_TR: 'RBiH', S_TZ: 'RBiH' };
  state.displacement_state = {
    mostar: { mun_id: 'mostar', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 }
  };

  const report = processMinorityFlight(state, settlementsFixture(), pop1991);
  assert.ok(report.settlements_displaced >= 1, 'Mostar has Serbs under HRHB; should displace 100%');
  assert.ok(state.civilian_casualties?.RS, 'civilian_casualties.RS should exist (Serbs displaced)');
  assert.ok(
    (state.civilian_casualties?.RS?.killed ?? 0) + (state.civilian_casualties?.RS?.fled_abroad ?? 0) > 0,
    'RS civilian casualties (Serbs) should be positive'
  );
});
