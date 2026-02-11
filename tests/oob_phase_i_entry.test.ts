import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import {
  factionHasPresenceInMun,
  buildSidToMunFromSettlements,
  createOobFormationsAtPhaseIEntry
} from '../src/scenario/oob_phase_i_entry.js';
import type { OobBrigade, OobCorps } from '../src/scenario/oob_loader.js';

test('factionHasPresenceInMun returns false for fragmented mun', () => {
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 's' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { s1: 'RS' },
    municipalities: { prijedor: { control: 'fragmented' } }
  };
  const sidToMun = new Map([['s1', 'prijedor']]);
  assert.strictEqual(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun), false);
});

test('factionHasPresenceInMun returns true when controller matches', () => {
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 's' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { s1: 'RS', s2: 'RBiH' },
    municipalities: { prijedor: { control: 'consolidated' } }
  };
  const sidToMun = new Map([['s1', 'prijedor'], ['s2', 'prijedor']]);
  assert.strictEqual(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun), true);
  assert.strictEqual(factionHasPresenceInMun(state, 'RBiH', 'prijedor', sidToMun), true);
  assert.strictEqual(factionHasPresenceInMun(state, 'HRHB', 'prijedor', sidToMun), false);
});

test('buildSidToMunFromSettlements includes only entries with mun1990_id', () => {
  const settlements = new Map<string, { mun1990_id?: string }>([
    ['s1', { mun1990_id: 'prijedor' }],
    ['s2', {}],
    ['s3', { mun1990_id: 'banja_luka' }]
  ]);
  const out = buildSidToMunFromSettlements(settlements);
  assert.strictEqual(out.size, 2);
  assert.strictEqual(out.get('s1'), 'prijedor');
  assert.strictEqual(out.get('s3'), 'banja_luka');
});

test('createOobFormationsAtPhaseIEntry is idempotent and only creates when presence', () => {
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 1, seed: 's' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { sid_zenica: 'RBiH' },
    municipalities: { zenica: { control: 'consolidated' }, mostar: { control: 'consolidated' } }
  };
  const sidToMun = new Map([['sid_zenica', 'zenica'], ['sid_mostar', 'mostar']]);
  const hq: Record<string, string> = { zenica: 'sid_zenica', mostar: 'sid_mostar' };
  const corps: OobCorps[] = [{ id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', hq_mun: 'zenica' }];
  const brigades: OobBrigade[] = [
    { id: 'arbih_7th_muslim', faction: 'RBiH', name: '7th Muslim', home_mun: 'zenica', kind: 'brigade', corps: 'arbih_3rd_corps' }
  ];

  const r1 = createOobFormationsAtPhaseIEntry(state, corps, brigades, hq, sidToMun);
  assert.strictEqual(r1.corps_created, 1);
  assert.strictEqual(r1.brigades_created, 1);
  assert.ok(state.formations!['arbih_3rd_corps']);
  assert.ok(state.formations!['arbih_7th_muslim']);

  const r2 = createOobFormationsAtPhaseIEntry(state, corps, brigades, hq, sidToMun);
  assert.strictEqual(r2.corps_created, 0);
  assert.strictEqual(r2.brigades_created, 0);
});
