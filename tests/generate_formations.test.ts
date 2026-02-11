import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { generateFormationsFromPools } from '../src/cli/sim_generate_formations.js';

// Helper to create a minimal valid state
function createTestState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 5, seed: 'test-seed' },
    factions: [
      { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {
      '20168': {
        mun_id: '20168',
        faction: 'RBiH',
        available: 1000,
        committed: 0,
        exhausted: 0,
        updated_turn: 5
      },
      '20044': {
        mun_id: '20044',
        faction: 'RS',
        available: 800,
        committed: 0,
        exhausted: 0,
        updated_turn: 5
      },
      '21001': {
        mun_id: '21001',
        faction: null, // Should be skipped
        available: 500,
        committed: 0,
        exhausted: 0,
        updated_turn: 5
      },
      '22001': {
        mun_id: '22001',
        faction: 'RBiH',
        available: 250, // Less than batch size (300), should be skipped
        committed: 0,
        exhausted: 0,
        updated_turn: 5
      }
    }
  };
}

test('deterministic generation: same inputs produce identical outputs', () => {
  const state1 = createTestState();
  const state2 = createTestState();

  const report1 = generateFormationsFromPools(state1, 300, null, null, null, [], true, null);
  const report2 = generateFormationsFromPools(state2, 300, null, null, null, [], true, null);

  // Reports should be identical
  assert.deepStrictEqual(report1, report2, 'reports should be identical');

  // States should be identical after generation
  const serialized1 = serializeState(state1);
  const serialized2 = serializeState(state2);
  assert.strictEqual(serialized1, serialized2, 'states should be identical after generation');
});

test('correct pool movement: available decreases, committed increases', () => {
  const state = createTestState();
  const originalAvailable = state.militia_pools['20168'].available;
  const originalCommitted = state.militia_pools['20168'].committed;

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // With max_brigades_per_mun default 1: 1 formation from 20168, 1 from 20044 = 2 total
  assert.strictEqual(report.totals.formations_created, 2);
  assert.strictEqual(report.totals.manpower_moved_available_to_committed, 600); // 300 + 300

  // Mun 20168 pool should be updated (1 formation = 300)
  assert.strictEqual(state.militia_pools['20168'].available, originalAvailable - 300);
  assert.strictEqual(state.militia_pools['20168'].committed, originalCommitted + 300);
  assert.strictEqual(state.militia_pools['20168'].exhausted, 0); // Unchanged
  assert.strictEqual(state.militia_pools['20168'].updated_turn, 5);
});

test('deterministic formation IDs across municipalities', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // With max_brigades_per_mun default 1: 1 formation per mun
  const rBiHFormations = Object.values(state.formations).filter((f) => f.faction === 'RBiH');
  const rsFormations = Object.values(state.formations).filter((f) => f.faction === 'RS');

  assert.strictEqual(rBiHFormations.length, 1);
  assert.strictEqual(rBiHFormations[0].id, 'F_RBiH_0001');

  assert.strictEqual(rsFormations.length, 1);
  assert.strictEqual(rsFormations[0].id, 'F_RS_0001');

  // Formation names: deterministic fallback "Faction mun_id Brigade ordinal"
  assert.strictEqual(rBiHFormations[0].name, 'RBiH 20168 Brigade 1');
  assert.strictEqual(rsFormations[0].name, 'RS 20044 Brigade 1');
});

test('faction filter limits generation', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, 'RBiH', null, null, [], true, null);

  // Should only generate for RBiH (1 formation from mun 20168, max_brigades_per_mun=1)
  assert.strictEqual(report.totals.formations_created, 1);
  assert.strictEqual(report.totals.municipalities_touched, 1);

  // Only RBiH formations should exist
  const allFormations = Object.values(state.formations);
  assert.ok(allFormations.every((f) => f.faction === 'RBiH'));

  // RS pool should be unchanged
  assert.strictEqual(state.militia_pools['20044'].available, 800);
  assert.strictEqual(state.militia_pools['20044'].committed, 0);
});

test('mun filter limits generation', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, '20044', null, [], true, null);

  // Should only generate for mun 20044 (1 formation, max_brigades_per_mun=1)
  assert.strictEqual(report.totals.formations_created, 1);
  assert.strictEqual(report.totals.municipalities_touched, 1);
  assert.strictEqual(report.per_municipality[0].mun_id, '20044');

  // RBiH pool should be unchanged
  assert.strictEqual(state.militia_pools['20168'].available, 1000);
  assert.strictEqual(state.militia_pools['20168'].committed, 0);
});

test('max-per-mun cap respected', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, 2, [], true, null);

  // getMaxBrigadesPerMun default is 1, so 1 per mun; maxPerMun=2 does not increase (min(1,2)=1)
  assert.strictEqual(report.totals.formations_created, 2); // 1 from each of 2 municipalities
  assert.strictEqual(report.totals.municipalities_touched, 2);

  const mun20168Entry = report.per_municipality.find((e) => e.mun_id === '20168');
  assert.ok(mun20168Entry);
  assert.strictEqual(mun20168Entry.created.length, 1);
  assert.strictEqual(mun20168Entry.after.available, 1000 - 300);
});

test('dry run changes nothing', () => {
  const state = createTestState();
  const originalSerialized = serializeState(state);

  // Dry run (applyChanges = false)
  const report = generateFormationsFromPools(state, 300, null, null, null, [], false, null);

  // Report should still show what would be created (2 with max_brigades_per_mun=1)
  assert.strictEqual(report.totals.formations_created, 2);

  // But state should be unchanged
  const afterSerialized = serializeState(state);
  assert.strictEqual(originalSerialized, afterSerialized, 'state should be unchanged in dry run');

  // No formations should be added
  assert.strictEqual(Object.keys(state.formations).length, 0);

  // Pools should be unchanged
  assert.strictEqual(state.militia_pools['20168'].available, 1000);
  assert.strictEqual(state.militia_pools['20168'].committed, 0);
});

test('custom tags are included', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, 'RBiH', null, null, ['custom1', 'custom2'], true, null);

  // Check that formations have the expected tags
  const formations = Object.values(state.formations).filter((f) => f.faction === 'RBiH');
  assert.ok(formations.length > 0);

  for (const formation of formations) {
    assert.ok(formation.tags);
    assert.ok(formation.tags.includes('generated_phase_i0'));
    assert.ok(formation.tags.includes('kind:brigade'));
    assert.ok(formation.tags.includes('mun:20168'));
    assert.ok(formation.tags.includes('custom1'));
    assert.ok(formation.tags.includes('custom2'));
    // Tags should be sorted
    const sorted = [...formation.tags].sort();
    assert.deepStrictEqual(formation.tags, sorted);
  }
});

test('report has no timestamps', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  const json = JSON.stringify(report);
  assert.ok(!json.includes('generated_at'));
  assert.ok(!json.includes('timestamp'));
  assert.ok(!json.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), 'should not include ISO timestamps');
});

test('report per_municipality is sorted deterministically', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // Should be sorted by mun_id
  const munIds = report.per_municipality.map((e) => e.mun_id);
  const sorted = [...munIds].sort();
  assert.deepStrictEqual(munIds, sorted, 'per_municipality should be sorted by mun_id');
});

test('report created formations are sorted deterministically', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // Each municipality's created formations should be sorted by formation_id
  for (const entry of report.per_municipality) {
    const ids = entry.created.map((c) => c.formation_id);
    const sorted = [...ids].sort();
    assert.deepStrictEqual(ids, sorted, `created formations for ${entry.mun_id} should be sorted by id`);
  }
});

test('pools with null faction are skipped', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // Should not generate from mun 21001 (null faction)
  const mun21001Entry = report.per_municipality.find((e) => e.mun_id === '21001');
  assert.strictEqual(mun21001Entry, undefined);

  // Pool should be unchanged
  assert.strictEqual(state.militia_pools['21001'].available, 500);
});

test('pools with insufficient available are skipped', () => {
  const state = createTestState();

  const report = generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  // Should not generate from mun 22001 (only 250 available, need 300)
  const mun22001Entry = report.per_municipality.find((e) => e.mun_id === '22001');
  assert.strictEqual(mun22001Entry, undefined);

  // Pool should be unchanged
  assert.strictEqual(state.militia_pools['22001'].available, 250);
});

test('remainder stays in available', () => {
  const state = createTestState();

  generateFormationsFromPools(state, 300, 'RBiH', null, null, [], true, null);

  // 1 formation (max_brigades_per_mun=1), 300 committed, remainder 700 in available
  assert.strictEqual(state.militia_pools['20168'].available, 700);
  assert.strictEqual(state.militia_pools['20168'].committed, 300);
});

test('formation assignment is null', () => {
  const state = createTestState();

  generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  const formations = Object.values(state.formations);
  assert.ok(formations.length > 0);
  for (const formation of formations) {
    assert.strictEqual(formation.assignment, null);
  }
});

test('formation status is active', () => {
  const state = createTestState();

  generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  const formations = Object.values(state.formations);
  assert.ok(formations.length > 0);
  for (const formation of formations) {
    assert.strictEqual(formation.status, 'active');
  }
});

test('formation created_turn matches current turn', () => {
  const state = createTestState();
  const currentTurn = state.meta.turn;

  generateFormationsFromPools(state, 300, null, null, null, [], true, null);

  const formations = Object.values(state.formations);
  assert.ok(formations.length > 0);
  for (const formation of formations) {
    assert.strictEqual(formation.created_turn, currentTurn);
  }
});
