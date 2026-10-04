'use strict';
const assert = require('node:assert/strict');
const { normalizeWeeklyRow, stableText } = require('./continuation7_front_writer_campaign_20261004_normalizer.cjs');

const input = {
    week_index: 139,
    control_counts: { RS: 12, RBiH: 13 },
    front_distribution_diagnostics: { writes: [1] },
    movement_phase_diagnostics: null,
    bot_order_diagnostics: { route: true },
    column_movement: { column_rejections: [{ formation_id: 'actor' }], retained_null: null, retained_nested: { flag: true } },
    unrelated: { array: [1, null, { present: true }], absent_vs_null: null },
};
const before = structuredClone(input);
const normalized = normalizeWeeklyRow(input);
assert.deepEqual(input, before);
assert.equal(Object.hasOwn(normalized, 'front_distribution_diagnostics'), false);
assert.equal(Object.hasOwn(normalized, 'movement_phase_diagnostics'), false);
assert.equal(Object.hasOwn(normalized, 'bot_order_diagnostics'), false);
assert.equal(Object.hasOwn(normalized.column_movement, 'column_rejections'), false);
assert.deepEqual(normalized.column_movement, { retained_null: null, retained_nested: { flag: true } });
assert.deepEqual(normalized.unrelated, input.unrelated);
assert.equal(stableText(normalizeWeeklyRow(input)), stableText(normalizeWeeklyRow(input)));
assert.deepEqual(normalizeWeeklyRow({ week_index: 1, column_movement: { column_rejections: [] } }), { week_index: 1, column_movement: {} });
assert.deepEqual(normalizeWeeklyRow({ week_index: 2, column_movement: null }), { week_index: 2, column_movement: null });
assert.deepEqual(normalizeWeeklyRow({ week_index: 3 }), { week_index: 3 });
const changedCount = structuredClone(input); changedCount.control_counts.RS = 99;
assert.notEqual(stableText(normalizeWeeklyRow(input)), stableText(normalizeWeeklyRow(changedCount)));
const changedControl = structuredClone(input); changedControl.control_counts = { RS: 12, RBiH: 12, HRHB: 1 };
assert.notEqual(stableText(normalizeWeeklyRow(input)), stableText(normalizeWeeklyRow(changedControl)));
process.stdout.write(`${JSON.stringify({ verdict: 'PASS_NORMALIZER_FIXTURE', assertions: 13 })}\n`);
