/**
 * Tests for init_control_mode (ethnic_1991, hybrid_1992).
 * - init_control_mode resolution and backward compatibility
 * - ethnic_1991/hybrid_1992 init via prepareNewGameState (no full scenario run)
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { normalizeScenario } from '../src/scenario/scenario_loader.js';
import { prepareNewGameState } from '../src/state/initialize_new_game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';

function makeBaseState(seed: string): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 0,
      seed,
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 0,
      war_start_turn: 0
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 0
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 0
      },
      {
        id: 'HRHB',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 0
      }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
}

function assertAllControllersAssigned(pc: Record<string, string | null>): void {
  const total = Object.keys(pc).length;
  assert(total > 0, 'should have settlements');
  const nullCount = Object.values(pc).filter((c) => c === null).length;
  assert.strictEqual(nullCount, 0, 'init must not leave null controllers');
  const validControllers = Object.values(pc).filter((c) => c === 'RBiH' || c === 'RS' || c === 'HRHB');
  assert.strictEqual(validControllers.length, total, 'all controllers should be RBiH/RS/HRHB');
}

test('normalizeScenario preserves init_control_mode and ethnic_override_threshold', () => {
  const raw = {
    scenario_id: 'test',
    weeks: 4,
    init_control_mode: 'ethnic_1991'
  };
  const s = normalizeScenario(raw);
  assert.strictEqual(s.init_control_mode, 'ethnic_1991');

  const raw2 = {
    scenario_id: 'test2',
    weeks: 4,
    init_control_mode: 'hybrid_1992',
    ethnic_override_threshold: 0.75
  };
  const s2 = normalizeScenario(raw2);
  assert.strictEqual(s2.init_control_mode, 'hybrid_1992');
  assert.strictEqual(s2.ethnic_override_threshold, 0.75);
});

test('ethnic_1991 init yields deterministic control (no null)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) return;
  const graph = await loadSettlementGraph();

  const stateA = makeBaseState('init-mode-ethnic-A');
  await prepareNewGameState(stateA, graph, undefined, { init_control_mode: 'ethnic_1991' });
  const pcA = stateA.political_controllers ?? {};
  assertAllControllersAssigned(pcA);

  const stateB = makeBaseState('init-mode-ethnic-B');
  await prepareNewGameState(stateB, graph, undefined, { init_control_mode: 'ethnic_1991' });
  const pcB = stateB.political_controllers ?? {};
  assert.deepStrictEqual(pcA, pcB, 'ethnic_1991 init should be deterministic');
});

test('hybrid_1992 init yields deterministic control (no null)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) return;
  const graph = await loadSettlementGraph();
  const mappingPath = join(
    process.cwd(),
    'data',
    'source',
    'municipalities_1990_initial_political_controllers_apr1992.json'
  );

  const stateA = makeBaseState('init-mode-hybrid-A');
  await prepareNewGameState(stateA, graph, mappingPath, {
    init_control_mode: 'hybrid_1992',
    ethnic_override_threshold: 0.70
  });
  const pcA = stateA.political_controllers ?? {};
  assertAllControllersAssigned(pcA);

  const stateB = makeBaseState('init-mode-hybrid-B');
  await prepareNewGameState(stateB, graph, mappingPath, {
    init_control_mode: 'hybrid_1992',
    ethnic_override_threshold: 0.70
  });
  const pcB = stateB.political_controllers ?? {};
  assert.deepStrictEqual(pcA, pcB, 'hybrid_1992 init should be deterministic');
});
