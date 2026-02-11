/**
 * Formation HQ relocation: when HQ is in enemy-controlled territory,
 * relocate to a friendly settlement (same mun or adjacent mun). Deterministic.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runFormationHqRelocation } from '../src/sim/formation_hq_relocation.js';
import type { GameState, FormationId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord, SettlementRecord } from '../src/map/settlements.js';

function minimalState(formations: GameState['formations'], political_controllers: GameState['political_controllers']): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 1, seed: 'test', phase: 'phase_ii', referendum_held: false, referendum_turn: null, war_start_turn: null },
    factions: [],
    formations,
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: political_controllers ?? {},
    municipalities: {},
    phase_i_consolidation_until: {},
    phase_i_militia_strength: {}
  };
}

function settlementsMap(entries: Array<{ sid: string; mun: string; mun_code: string; mun1990_id?: string }>): Map<string, SettlementRecord> {
  const m = new Map<string, SettlementRecord>();
  for (const e of entries) {
    m.set(e.sid, {
      sid: e.sid,
      source_id: e.sid,
      mun_code: e.mun_code,
      mun: e.mun,
      mun1990_id: e.mun1990_id ?? e.mun_code
    });
  }
  return m;
}

test('relocates HQ from enemy-controlled settlement to friendly in same mun', () => {
  // M1: s1 (RBiH), s2 (RS). M2: s3 (RBiH). Edge s1-s3 so M1 and M2 adjacent.
  const formations: GameState['formations'] = {
    f1: {
      id: 'f1' as FormationId,
      faction: 'RBiH',
      name: 'Brigade 1',
      created_turn: 1,
      status: 'active',
      assignment: null,
      hq_sid: 's2' // enemy (RS)
    }
  };
  const state = minimalState(formations, { s1: 'RBiH', s2: 'RS', s3: 'RBiH' });
  const settlements = settlementsMap([
    { sid: 's1', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' },
    { sid: 's2', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' },
    { sid: 's3', mun: 'M2', mun_code: 'M2', mun1990_id: 'M2' }
  ]);
  const edges: EdgeRecord[] = [
    { a: 's1', b: 's2' },
    { a: 's2', b: 's3' }
  ];

  const report = runFormationHqRelocation(state, settlements, edges);

  assert.strictEqual(report.relocated, 1);
  assert.deepStrictEqual(report.formation_ids, ['f1']);
  assert.strictEqual(state.formations!.f1!.hq_sid, 's1'); // same mun, first friendly
});

test('relocates HQ to adjacent mun when same mun has no friendly settlement', () => {
  // M1: s1 (RS only). M2: s2 (RBiH). Edge s1-s2.
  const formations: GameState['formations'] = {
    f1: {
      id: 'f1' as FormationId,
      faction: 'RBiH',
      name: 'Brigade 1',
      created_turn: 1,
      status: 'active',
      assignment: null,
      hq_sid: 's1' // enemy (RS), no friendly in M1
    }
  };
  const state = minimalState(formations, { s1: 'RS', s2: 'RBiH' });
  const settlements = settlementsMap([
    { sid: 's1', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' },
    { sid: 's2', mun: 'M2', mun_code: 'M2', mun1990_id: 'M2' }
  ]);
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];

  const report = runFormationHqRelocation(state, settlements, edges);

  assert.strictEqual(report.relocated, 1);
  assert.strictEqual(state.formations!.f1!.hq_sid, 's2');
});

test('no relocation when HQ already in friendly territory', () => {
  const formations: GameState['formations'] = {
    f1: {
      id: 'f1' as FormationId,
      faction: 'RBiH',
      name: 'Brigade 1',
      created_turn: 1,
      status: 'active',
      assignment: null,
      hq_sid: 's1'
    }
  };
  const state = minimalState(formations, { s1: 'RBiH', s2: 'RS' });
  const settlements = settlementsMap([
    { sid: 's1', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' },
    { sid: 's2', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' }
  ]);
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];

  const report = runFormationHqRelocation(state, settlements, edges);

  assert.strictEqual(report.relocated, 0);
  assert.strictEqual(state.formations!.f1!.hq_sid, 's1');
});

test('no relocation when no friendly settlement in same or adjacent mun', () => {
  // M1: s1 (RS). M2: s2 (RS). No other muns; formation RBiH with HQ at s1 stays without friendly option.
  const formations: GameState['formations'] = {
    f1: {
      id: 'f1' as FormationId,
      faction: 'RBiH',
      name: 'Brigade 1',
      created_turn: 1,
      status: 'active',
      assignment: null,
      hq_sid: 's1'
    }
  };
  const state = minimalState(formations, { s1: 'RS', s2: 'RS' });
  const settlements = settlementsMap([
    { sid: 's1', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' },
    { sid: 's2', mun: 'M2', mun_code: 'M2', mun1990_id: 'M2' }
  ]);
  const edges: EdgeRecord[] = [{ a: 's1', b: 's2' }];

  const report = runFormationHqRelocation(state, settlements, edges);

  assert.strictEqual(report.relocated, 0);
  assert.strictEqual(state.formations!.f1!.hq_sid, 's1');
});

test('formation without hq_sid is skipped', () => {
  const formations: GameState['formations'] = {
    f1: {
      id: 'f1' as FormationId,
      faction: 'RBiH',
      name: 'Brigade 1',
      created_turn: 1,
      status: 'active',
      assignment: null
      // no hq_sid
    }
  };
  const state = minimalState(formations, { s1: 'RS' });
  const settlements = settlementsMap([{ sid: 's1', mun: 'M1', mun_code: 'M1', mun1990_id: 'M1' }]);
  const report = runFormationHqRelocation(state, settlements, []);
  assert.strictEqual(report.relocated, 0);
});
