// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TacticalCard } from '../../src/ui/map/components/TacticalCard.js';
import type { FormationView } from '../../src/ui/map/data/types.js';

function makeFormation(overrides: Partial<FormationView> = {}): FormationView {
  return {
    id: 'rbih_sparse_brigade',
    faction: 'RBiH',
    name: 'Sparse Brigade',
    kind: 'brigade',
    readiness: 'unreported',
    status: 'unreported',
    createdTurn: 0,
    tags: [],
    ...overrides,
  };
}

describe('TacticalCard sparse truth', () => {
  afterEach(() => cleanup());

  it('renders missing personnel and condition as unreported instead of healthy zeroes', () => {
    render(React.createElement(TacticalCard, {
      formation: makeFormation({
        personnel: undefined,
        cohesion: undefined,
        fatigue: undefined,
        composition: undefined,
      }),
      isAssigned: false,
      onClick: vi.fn(),
    }));

    expect(screen.getByText('Unreported')).toBeTruthy();
    expect(screen.getByTitle('Cohesion: Unreported')).toBeTruthy();
    expect(screen.getByTitle('Fatigue: Unreported')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByTitle('Cohesion: 0%')).toBeNull();
    expect(screen.queryByTitle('Fatigue: 0%')).toBeNull();
  });
});
