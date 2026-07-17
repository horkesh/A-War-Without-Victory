import { describe, expect, it } from 'vitest';

import {
  countInitOverrideChanges,
  mergeControlChangeAttributionSummaries,
  summarizeControlChangeAttribution,
} from '../src/scenario/control_change_attribution.js';

describe('control change attribution', () => {
  it('counts live control-change mechanisms plus init overrides', () => {
    const summary = summarizeControlChangeAttribution([
      { mechanism: 'combat' },
      { mechanism: 'combat' },
      { mechanism: 'paramilitary' },
      { mechanism: 'consolidation' },
      { mechanism: 'abandoned' },
      { mechanism: 'unknown_legacy' },
    ], 2);

    expect(summary).toEqual({
      total_changes: 8,
      combat: 2,
      paramilitary: 1,
      consolidation: 1,
      abandoned: 1,
      init_overrides: 2,
      other: 1,
    });
  });

  it('counts only real controller changes on existing overridden OSIDs', () => {
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
      },
    );

    expect(count).toBe(2);
  });

  it('adds bucket totals deterministically', () => {
    const merged = mergeControlChangeAttributionSummaries(
      {
        total_changes: 3,
        combat: 1,
        paramilitary: 0,
        consolidation: 1,
        abandoned: 0,
        init_overrides: 1,
        other: 0,
      },
      {
        total_changes: 5,
        combat: 2,
        paramilitary: 1,
        consolidation: 0,
        abandoned: 1,
        init_overrides: 0,
        other: 1,
      },
    );

    expect(merged).toEqual({
      total_changes: 8,
      combat: 3,
      paramilitary: 1,
      consolidation: 1,
      abandoned: 1,
      init_overrides: 1,
      other: 1,
    });
  });
});
