/**
 * Phase C Step 9: Phase I turn structure and AoR prohibition tests.
 * - Phase I runTurn executes phases in exact roadmap order (Phase_I_Spec §5; ROADMAP Phase C).
 * - No AoRs in Phase I: areasOfResponsibility remain empty; no front-active brigade assignments.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Phase I step order (Phase_I_Spec §5; pipeline phaseIPhases). */
const EXPECTED_PHASE_I_ORDER = [
  'evaluate-events',
  'phase-i-militia-emergence',
  'phase-i-pool-population',
  'phase-i-minority-militia-decay',
  'phase-i-brigade-reinforcement',
  'phase-i-formation-spawn',
  'phase-i-alliance-update',
  'phase-i-ceasefire-check',
  'phase-i-washington-check',
  'phase-i-capability-update',
  'phase-i-control-flip',
  'phase-i-bilateral-flip-count',
  'phase-i-displacement-hooks',
  'phase-i-displacement-apply',
  'phase-i-control-strain',
  'phase-i-authority-update',
  'phase-i-jna-transition',
  'phase-i-minority-erosion'
];

function statePhaseI(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn: 10,
      seed: 'step9-fixture',
      phase: 'phase_i',
      referendum_held: true,
      referendum_turn: 6,
      war_start_turn: 10
    },
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: true,
        declaration_turn: 5
      },
      {
        id: 'HRHB',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
        areasOfResponsibility: [],
        supply_sources: [],
        declared: false,
        declaration_turn: null
      }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    phase_i_consolidation_until: {},
    phase_i_militia_strength: {
      MUN_A: { RBiH: 30, RS: 60, HRHB: 10 },
      MUN_B: { RBiH: 25, RS: 70, HRHB: 5 }
    }
  };
}

test('Phase I runTurn executes phases in exact roadmap order', async () => {
  const state = statePhaseI();
  const { report } = await runTurn(state, { seed: 'step9-fixture' });
  const names = report.phases.map((p) => p.name);
  assert.deepStrictEqual(
    names,
    EXPECTED_PHASE_I_ORDER,
    'Phase I phases must run in exact order per Phase_I_Spec §5 and ROADMAP Phase C'
  );
});

test('Phase I runTurn leaves areasOfResponsibility empty (no AoRs in Phase I)', async () => {
  const state = statePhaseI();
  const { nextState } = await runTurn(state, { seed: 'step9-fixture' });
  const factions = nextState.factions ?? [];
  for (const f of factions) {
    const aor = f.areasOfResponsibility ?? [];
    assert.strictEqual(
      aor.length,
      0,
      `Phase I must not instantiate AoRs; faction ${f.id} has areasOfResponsibility.length = ${aor.length}`
    );
  }
});

test('Phase I report contains only Phase I phase names (no Phase II front phases)', async () => {
  const state = statePhaseI();
  const { report } = await runTurn(state, { seed: 'step9-fixture' });
  const names = report.phases.map((p) => p.name);
  const forbidden = ['commitment', 'front_pressure', 'formation_fatigue', 'formation_lifecycle'];
  for (const n of names) {
    const allowed =
      n === 'evaluate-events' || n.startsWith('phase-i-');
    assert.ok(allowed, `Phase I turn must only run Phase I phases; got "${n}"`);
  }
  for (const key of forbidden) {
    const hasKey = names.some((n) => n.includes(key));
    assert.strictEqual(hasKey, false, `Phase I must not run Phase II phase: ${key}`);
  }
});

test('Phase I smoke: pool population and formation spawn with directive produce formations', async () => {
  const state = statePhaseI();
  state.formation_spawn_directive = {};
  const { nextState, report } = await runTurn(state, { seed: 'smoke-fixture' });
  assert.ok(report.phase_i_pool_population, 'Phase I must run pool population');
  assert.ok(report.phase_i_formation_spawn, 'With directive, Phase I must run formation spawn');
  const formationCount = Object.keys(nextState.formations ?? {}).length;
  assert.ok(formationCount >= 1, `With directive and pools from strength, at least one formation must be created; got ${formationCount}`);
});
