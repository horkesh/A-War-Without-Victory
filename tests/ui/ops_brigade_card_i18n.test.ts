// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrigadeCard } from '../../src/ui/map/components/ops_modal/BrigadeCard.js';
import { BrigadeTray } from '../../src/ui/map/components/ops_modal/BrigadeTray.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { FormationView } from '../../src/ui/map/data/types.js';
import type { OpsPlanState } from '../../src/ui/map/components/ops_modal/types.js';

function makeBrigade(overrides: Partial<FormationView> = {}): FormationView {
  return {
    id: 'rbih_test_mechanized',
    faction: 'RBiH',
    name: '1st Test Mechanized Brigade',
    kind: 'brigade',
    readiness: 'ready',
    cohesion: 76,
    fatigue: 3,
    status: 'active',
    createdTurn: 0,
    tags: [],
    personnel: 1450,
    composition: { infantry: 1200, tanks: 4, artillery: 7, aa_systems: 0 },
    ...overrides,
  } as FormationView;
}

function makePlan(brigadeIds: string[] = ['rbih_test_mechanized']): OpsPlanState {
  return {
    opName: 'Operation Test',
    opType: 'sector_attack',
    tempo: 'standard',
    tolerance: 'victory',
    artilleryPreparation: true,
    schwerpunktOsid: 'op:test:objective',
    defaultStagingOsid: 'op:test:staging',
    activeAxisId: 'axis_main',
    axes: [
      {
        id: 'axis_main',
        name: 'Main axis',
        brigadeIds,
        objectives: ['op:test:objective'],
        stagingOsid: 'op:test:staging',
      },
    ],
  };
}

describe('ops modal BrigadeCard i18n', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
  });

  it('renders BrigadeCard tooltip and march copy through localized EN labels', () => {
    setLocale('en');
    render(React.createElement(BrigadeCard, {
      brigade: makeBrigade(),
      isAssigned: true,
      isAutoProposed: true,
      marchTurns: 1,
      factionColor: '#4a9a55',
      onToggle: vi.fn(),
    }));

    const card = screen.getByRole('button', { name: /1st Test Mechanized Brigade/i });
    expect(card.getAttribute('title')).toContain('Personnel: 1,450');
    expect(card.getAttribute('title')).toContain('March: 1 turn');
    expect(screen.getByText('Mechanized')).toBeTruthy();
    expect(screen.getByText('1 turn march')).toBeTruthy();
  });

  it('renders missing BrigadeCard strength fields as unreported instead of zero or healthy defaults', () => {
    setLocale('en');
    render(React.createElement(BrigadeCard, {
      brigade: makeBrigade({
        personnel: undefined,
        composition: undefined,
        cohesion: undefined,
        fatigue: undefined,
      }),
      isAssigned: false,
      isAutoProposed: false,
      marchTurns: null,
      factionColor: '#4a9a55',
      onToggle: vi.fn(),
    }));

    const card = screen.getByRole('button', { name: /1st Test Mechanized Brigade/i });
    expect((card as HTMLButtonElement).disabled).toBe(false);
    expect(card.getAttribute('title')).toContain('Personnel: Unreported');
    expect(card.getAttribute('title')).toContain('Tanks: Unreported');
    expect(card.getAttribute('title')).toContain('Cohesion: Unreported');
    expect(card.getAttribute('title')).toContain('Fatigue: Unreported');
    expect(card.getAttribute('title')).not.toContain('Personnel: 0');
    expect(card.getAttribute('title')).not.toContain('Cohesion: 50');
    expect(card.getAttribute('title')).not.toContain('Fatigue: 0');
    expect(card.textContent).toContain('Unreported');
    expect(card.textContent).not.toContain('COMBAT INEFFECTIVE');
    expect(card.textContent).not.toMatch(/\bFRESH\b/i);
  });

  it('renders BrigadeCard and BrigadeTray copy through localized BCS labels', () => {
    setLocale('bcs');

    const { container, rerender } = render(React.createElement(BrigadeTray, {
      plan: makePlan(),
      onUpdate: vi.fn(),
      corpsBrigades: [makeBrigade()],
      autoProposed: [{ brigadeId: 'rbih_test_mechanized', score: 10, marchTurns: 2, isAutoProposed: true }],
      factionColor: '#4a9a55',
    }));

    const card = screen.getByRole('button', { name: /1\. test mehanizovana brigada/i });
    expect(card.getAttribute('title')).toContain('Ljudstvo: 1.450');
    expect(card.getAttribute('title')).toContain('Marš: 2 poteza');
    expect(screen.getByText('MEHANIZOVANA')).toBeTruthy();
    expect(screen.getByText('2 poteza marša')).toBeTruthy();
    expect(container.textContent).toContain('Puna spremnost:');
    expect(container.textContent).toContain('(1 brigada dodijeljena)');
    expect(container.textContent).not.toMatch(/Full assembly|turns|brigades assigned|MECHANIZED/);

    rerender(React.createElement(BrigadeTray, {
      plan: makePlan([]),
      onUpdate: vi.fn(),
      corpsBrigades: [],
      autoProposed: [],
      factionColor: '#4a9a55',
    }));

    expect(screen.getByText('Nema dostupnih brigada za ovaj korpus')).toBeTruthy();
    expect(container.textContent).not.toContain('No brigades available for this corps');
  });
});
