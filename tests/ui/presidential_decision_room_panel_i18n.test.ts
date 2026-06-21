// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  __resetDecisionRoomLensRequestForTest,
  requestDecisionRoomLens,
} from '../../src/ui/map/utils/decisionRoomLensRequest.js';

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
    __resetDecisionRoomLensRequestForTest();
  });

  it('localizes static Decision Room panel chrome in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    expect(screen.getAllByText('Strateški prioriteti').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Prikaži napredno' })).toBeTruthy();
    expect(screen.getByText('Obavezne odluke i najsigurniji sljedeći pregledi')).toBeTruthy();
    expect(screen.getByText('Šta se očekuje od mene?')).toBeTruthy();
    expect(screen.getByText('Prioritetne trake')).toBeTruthy();
    expect(screen.getByText('Pregled prije nastavka')).toBeTruthy();
    expect(screen.queryByText('Strategic Priorities')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Prikaži napredno' }));

    expect(screen.getByRole('button', { name: 'Sakrij napredno' })).toBeTruthy();
    expect(screen.getByText('Napredni sto')).toBeTruthy();
    expect(screen.getAllByText('Hitno').length).toBeGreaterThan(0);
    expect(screen.getByText('Pregled nastavka')).toBeTruthy();
    expect(screen.getByText('Predaje izvora')).toBeTruthy();
  });

  it('opens an exact command category filter from a command-card request', async () => {
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
        playerDecisionSummary: {
          totalCount: 1,
          blockingCount: 1,
          families: [{ id: 'peace_plan', count: 1, gatePolicy: 'modal_required' }],
        },
      }),
      osidDisplayNames: null,
    });

    requestDecisionRoomLens('all', 'cat_conscience');
    render(createElement(PresidentialDecisionRoomPanel));

    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();
    expect(screen.queryByTestId('decision-room-priority-card-manifest:peace_plan')).toBeNull();
    expect(screen.getByRole('button', { name: 'Hide Advanced' })).toBeTruthy();
  });

  it('localizes priority-card severity badges in BCS mode', async () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            mode: 'offensive',
            strength: 80,
            target_osid: 'op:test:alpha',
            estimated_civilian_risk: 12,
          },
        ],
      }),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    const card = await screen.findByTestId('decision-room-priority-card-paramilitary:pending');
    expect(card.textContent).toContain('Blokira');
    expect(card.textContent).not.toMatch(/\bblocking\b/i);
  });
});
