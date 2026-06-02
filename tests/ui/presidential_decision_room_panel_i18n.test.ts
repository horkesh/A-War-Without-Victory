// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 24',
    turn: 24,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

describe('PresidentialDecisionRoomPanel i18n', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState({
      loadedGameState: null,
      osidDisplayNames: null,
    });
  });

  it('localizes static Decision Room panel chrome in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    expect(screen.getAllByText('Strateski prioriteti').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Prikaži napredno' })).toBeTruthy();
    expect(screen.getByText('Komandni krug')).toBeTruthy();
    expect(screen.getByText('Pregled prije nastavka')).toBeTruthy();
    expect(screen.queryByText('Strategic Priorities')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Prikaži napredno' }));

    expect(screen.getByRole('button', { name: 'Sakrij napredno' })).toBeTruthy();
    expect(screen.getByText('Napredni sto')).toBeTruthy();
    expect(screen.getAllByText('Hitno').length).toBeGreaterThan(0);
    expect(screen.getByText('Pregled nastavka')).toBeTruthy();
    expect(screen.getByText('Predaje izvora')).toBeTruthy();
  });
});
