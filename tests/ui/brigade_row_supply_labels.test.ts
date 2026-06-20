// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BrigadeRow } from '../../src/ui/map/components/BrigadeRow.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { FormationView } from '../../src/ui/map/data/types.js';

function makeFormation(overrides: Partial<FormationView> = {}): FormationView {
  return {
    id: 'rbih_test_brigade',
    faction: 'RBiH',
    name: 'Test Brigade',
    kind: 'brigade',
    readiness: 'ready',
    cohesion: 70,
    fatigue: 5,
    status: 'active',
    createdTurn: 0,
    tags: [],
    ...overrides,
  };
}

describe('BrigadeRow supply labels', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
  });

  it('renders localized supply copy instead of raw supply state ids', () => {
    const { rerender } = render(React.createElement(BrigadeRow, {
      formation: makeFormation({ cohesion: 62, fatigue: 35 }),
    }));

    const strainedRow = screen.getByRole('button');
    expect(strainedRow.getAttribute('title')).toBe('Supply: Supply strained | Fatigue: 35 | Cohesion: 62%');
    expect(screen.getByLabelText('Supply strained')).toBeTruthy();
    expect(strainedRow.getAttribute('title')).not.toMatch(/\bSTRAINED\b/);
    expect(screen.queryByLabelText('strained')).toBeNull();

    rerender(React.createElement(BrigadeRow, {
      formation: makeFormation({ cohesion: 68, fatigue: 8, status: 'isolated' }),
    }));

    const cutoffRow = screen.getByRole('button');
    expect(cutoffRow.getAttribute('title')).toBe('Supply: Cut off | Fatigue: 8 | Cohesion: 68%');
    expect(screen.getByLabelText('Cut off')).toBeTruthy();
    expect(cutoffRow.getAttribute('title')).not.toMatch(/\bCUTOFF\b|\bcutoff\b/);
    expect(screen.queryByLabelText('cutoff')).toBeNull();
  });
});
