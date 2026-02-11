import assert from 'node:assert';
import { test } from 'node:test';

import { evaluateBotBenchmarks } from '../src/scenario/scenario_end_report.js';

test('bot benchmark evaluation marks pass/fail and not_reached deterministically', () => {
  const summary = evaluateBotBenchmarks(
    [
      {
        turn: 26,
        control_share_by_faction: [
          { faction: 'HRHB', control_share: 0.14 },
          { faction: 'RBiH', control_share: 0.21 },
          { faction: 'RS', control_share: 0.45 }
        ]
      }
    ],
    [
      { faction: 'RBiH', turn: 26, objective: 'hold_core_centers', expected_control_share: 0.2, tolerance: 0.1 },
      { faction: 'RS', turn: 26, objective: 'early_territorial_expansion', expected_control_share: 0.45, tolerance: 0.15 },
      { faction: 'HRHB', turn: 52, objective: 'hold_central_bosnia_nodes', expected_control_share: 0.18, tolerance: 0.1 }
    ]
  );

  assert.strictEqual(summary.evaluated, 2);
  assert.strictEqual(summary.passed, 2);
  assert.strictEqual(summary.failed, 0);
  assert.strictEqual(summary.not_reached, 1);
  assert.strictEqual(summary.results.length, 3);
  assert.strictEqual(summary.results[0]?.faction, 'RBiH');
  assert.strictEqual(summary.results[1]?.faction, 'RS');
  assert.strictEqual(summary.results[2]?.status, 'not_reached');
});
