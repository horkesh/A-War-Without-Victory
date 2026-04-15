import { describe, expect, it } from 'vitest';

import {
  evaluateBotBenchmarks,
  validateBotBenchmarkSummary,
} from '../src/scenario/scenario_end_report.js';

describe('scenario reporting contracts', () => {
  it('accepts internally consistent bot benchmark summaries', () => {
    const summary = evaluateBotBenchmarks(
      [
        {
          turn: 26,
          control_share_by_faction: [
            { faction: 'RBiH', control_share: 0.21 },
            { faction: 'RS', control_share: 0.45 },
          ],
        },
      ],
      [
        { faction: 'RBiH', turn: 26, objective: 'hold_core_centers', expected_control_share: 0.2, tolerance: 0.1 },
        { faction: 'HRHB', turn: 52, objective: 'hold_central_bosnia_nodes', expected_control_share: 0.18, tolerance: 0.1 },
      ],
    );

    const status = validateBotBenchmarkSummary(summary);
    expect(status.contract_valid).toBe(true);
    expect(status.contract_issues).toEqual([]);
  });

  it('flags internally inconsistent bot benchmark summaries', () => {
    const status = validateBotBenchmarkSummary({
      evaluated: 1,
      passed: 1,
      failed: 0,
      not_reached: 0,
      results: [
        {
          faction: 'RS',
          turn: 26,
          objective: 'early_territorial_expansion',
          expected_control_share: 0.6,
          tolerance: 0.1,
          actual_control_share: null,
          deviation: null,
          passed: true,
          status: 'evaluated',
        },
      ],
    });

    expect(status.contract_valid).toBe(false);
    expect(status.contract_issues).toContain('evaluated_result_missing_actual_control_share');
  });
});
