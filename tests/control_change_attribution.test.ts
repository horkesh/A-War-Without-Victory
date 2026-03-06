import assert from 'node:assert';
import { test } from 'node:test';

import {
    countInitOverrideChanges,
    mergeControlChangeAttributionSummaries,
    summarizeControlChangeAttribution
} from '../src/scenario/control_change_attribution.js';

test('summarizeControlChangeAttribution counts live control-change mechanisms plus init overrides', () => {
    const summary = summarizeControlChangeAttribution([
        { mechanism: 'combat' },
        { mechanism: 'combat' },
        { mechanism: 'consolidation' },
        { mechanism: 'abandoned' },
        { mechanism: 'unknown_legacy' },
    ], 2);

    assert.deepStrictEqual(summary, {
        total_changes: 7,
        combat: 2,
        consolidation: 1,
        abandoned: 1,
        init_overrides: 2,
        other: 1,
    });
});

test('countInitOverrideChanges counts only real controller changes on existing overridden OSIDs', () => {
    const count = countInitOverrideChanges(
        {
            'op:a:x': 'RBiH',
            'op:b:y': 'RS',
            'op:c:z': null,
        },
        {
            'op:a:x': 'RS',
            'op:b:y': 'RS',
            'op:c:z': 'HRHB',
            'op:d:q': 'RBiH',
        },
        {
            'op:a:x': 'RS',
            'op:b:y': 'RS',
            'op:c:z': 'HRHB',
            'op:d:q': 'RBiH',
        }
    );

    assert.equal(count, 2);
});

test('mergeControlChangeAttributionSummaries adds bucket totals deterministically', () => {
    const merged = mergeControlChangeAttributionSummaries(
        {
            total_changes: 3,
            combat: 1,
            consolidation: 1,
            abandoned: 0,
            init_overrides: 1,
            other: 0,
        },
        {
            total_changes: 4,
            combat: 2,
            consolidation: 0,
            abandoned: 1,
            init_overrides: 0,
            other: 1,
        }
    );

    assert.deepStrictEqual(merged, {
        total_changes: 7,
        combat: 3,
        consolidation: 1,
        abandoned: 1,
        init_overrides: 1,
        other: 1,
    });
});
