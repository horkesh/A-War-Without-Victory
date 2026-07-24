import { describe, expect, it } from 'vitest';
import { getBotStrategyProfile } from '../src/sim/bot/bot_strategy.js';
import { evaluateBotBenchmarks } from '../src/scenario/scenario_end_report.js';

const JAN_1993_RS_CONTROL_SHARE = 385 / 712;

describe('RS t40 consolidate_gains benchmark re-anchor', () => {
    it('uses the painted January 1993 RS control share as its center', () => {
        const benchmark = getBotStrategyProfile('RS').benchmarks.find(
            (entry) => entry.turn === 40 && entry.objective === 'consolidate_gains'
        );

        expect(benchmark).toBeDefined();
        expect(benchmark!.expected_control_share).toBeCloseTo(JAN_1993_RS_CONTROL_SHARE, 3);
        expect(benchmark!.tolerance).toBe(0.05);
    });

    it('accepts the post-consolidation equilibrium without widening tolerance', () => {
        const benchmark = getBotStrategyProfile('RS').benchmarks.find(
            (entry) => entry.turn === 40 && entry.objective === 'consolidate_gains'
        )!;
        const result = evaluateBotBenchmarks(
            [{ turn: 40, control_share_by_faction: [{ faction: 'RS', control_share: 364 / 712 }] }],
            [{ faction: 'RS', ...benchmark }]
        );

        expect(result.evaluated).toBe(1);
        expect(result.passed).toBe(1);
        expect(result.failed).toBe(0);
    });
});
