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

  it('keeps supply unreported when no explicit supply state exists', () => {
    const { rerender } = render(React.createElement(BrigadeRow, {
      formation: makeFormation({ cohesion: 62, fatigue: 35 }),
    }));

    const fatiguedRow = screen.getByRole('button');
    expect(fatiguedRow.getAttribute('title')).toBe('Supply: Supply unreported | Fatigue: 35 | Cohesion: 62%');
    expect(screen.getByLabelText('Supply unreported')).toBeTruthy();
    expect(screen.queryByLabelText('Supply strained')).toBeNull();

    rerender(React.createElement(BrigadeRow, {
      formation: makeFormation({ cohesion: 25, fatigue: 8 }),
    }));

    const lowCohesionRow = screen.getByRole('button');
    expect(lowCohesionRow.getAttribute('title')).toBe('Supply: Supply unreported | Fatigue: 8 | Cohesion: 25%');
    expect(screen.getByLabelText('Supply unreported')).toBeTruthy();
    expect(screen.queryByLabelText('Supply strained')).toBeNull();
  });

  it('renders localized supply copy only from explicit supply state fields', () => {
    const { rerender } = render(React.createElement(BrigadeRow, {
      formation: makeFormation({ supply_state: 'strained' }),
    }));

    const strainedRow = screen.getByRole('button');
    expect(strainedRow.getAttribute('title')).toBe('Supply: Supply strained | Fatigue: 5 | Cohesion: 70%');
    expect(screen.getByLabelText('Supply strained')).toBeTruthy();
    expect(strainedRow.getAttribute('title')).not.toMatch(/\bSTRAINED\b/);

    rerender(React.createElement(BrigadeRow, {
      formation: makeFormation({ supply_state: 'critical' }),
    }));

    const criticalRow = screen.getByRole('button');
    expect(criticalRow.getAttribute('title')).toBe('Supply: Critical supply | Fatigue: 5 | Cohesion: 70%');
    expect(screen.getByLabelText('Critical supply')).toBeTruthy();
    expect(criticalRow.getAttribute('title')).not.toMatch(/\bCRITICAL\b/);
  });

  it('renders terminal lifecycle badges instead of falling back to active', () => {
    const { rerender } = render(React.createElement(BrigadeRow, {
      formation: makeFormation({ status: 'destroyed', readiness: 'destroyed' }),
    }));

    expect(screen.getByText('DESTROYED')).toBeTruthy();
    expect(screen.queryByText('ACTIVE')).toBeNull();

    rerender(React.createElement(BrigadeRow, {
      formation: makeFormation({ status: 'collapsed', readiness: 'destroyed' }),
    }));

    expect(screen.getByText('COLLAPSED')).toBeTruthy();
    expect(screen.queryByText('ACTIVE')).toBeNull();
  });

  it('renders unknown lifecycle badges as recorded state instead of active', () => {
    render(React.createElement(BrigadeRow, {
      formation: makeFormation({ status: 'awaiting_reconstitution', readiness: 'degraded' }),
    }));

    expect(screen.getByText('RECORDED')).toBeTruthy();
    expect(screen.queryByText('ACTIVE')).toBeNull();
    expect(screen.queryByText('AWAITING_RECONSTITUTION')).toBeNull();
  });
});
