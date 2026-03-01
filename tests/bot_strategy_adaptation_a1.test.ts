import assert from 'node:assert';
import { test } from 'node:test';

import { getBotStrategyProfile, resolveAggression } from '../src/sim/bot/bot_strategy.js';

test('RS broad aggression tapers from 1992 to 1995 while planned ops remains viable', () => {
    const rs = getBotStrategyProfile('RS');
    const early = resolveAggression(rs, 'war', { global_week: 16 });
    const late = resolveAggression(rs, 'war', { global_week: 180 });
    assert.ok(early.broad_aggression > late.broad_aggression, 'RS broad aggression should reduce by late war');
    assert.ok(late.planned_ops_aggression >= rs.planned_ops_min_aggression, 'planned operations floor should persist');
});

test('without time context, aggression falls back to phase-based behavior', () => {
    const rs = getBotStrategyProfile('RS');
    const early = resolveAggression(rs, 'war');
    const late = resolveAggression(rs, 'war');
    assert.strictEqual(early.broad_aggression, late.broad_aggression, 'phase-only fallback should be deterministic without time context');
});
