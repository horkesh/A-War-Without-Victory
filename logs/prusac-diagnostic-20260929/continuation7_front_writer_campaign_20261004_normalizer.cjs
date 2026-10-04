'use strict';

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    return value;
}
function stableText(value) { return JSON.stringify(stable(value)); }
function normalizeWeeklyRow(row) {
    const copy = structuredClone(row);
    delete copy.front_distribution_diagnostics;
    delete copy.movement_phase_diagnostics;
    delete copy.bot_order_diagnostics;
    if (copy.column_movement !== null && typeof copy.column_movement === 'object' && !Array.isArray(copy.column_movement)) {
        delete copy.column_movement.column_rejections;
    }
    return copy;
}

module.exports = { normalizeWeeklyRow, stableText };
