// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
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

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
  return {
    turn: 24,
    battles: [],
    territory_net: {},
    notable_flips: [],
    displacement_total: 0,
    displacement_by_ethnicity: {},
    decoration_awards: [],
    arc_transitions: [],
    formation_spawns: [],
    formation_destructions: [],
    supply_deltas: {},
    heavy_munitions_deltas: {},
    movements: [],
    supply_transitions: [],
    events_fired: [],
    notable_events: [],
    ...overrides,
  };
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

  it('clears a stale requested card id instead of leaving a blank dossier', async () => {
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

    requestDecisionRoomLens('turn', null, 'missing-card');
    render(createElement(PresidentialDecisionRoomPanel));

    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText('No priority dossier selected.')).toBeNull();
    });
  });

  it('clears a stale command category filter when live cards remain elsewhere', async () => {
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
    const { rerender } = render(createElement(PresidentialDecisionRoomPanel));
    expect(await screen.findByTestId('decision-room-priority-card-paramilitary:pending')).toBeTruthy();

    useGameStore.setState({
      loadedGameState: makeState({
        latestTurnSummary: makeSummary({ territory_net: { RBiH: -1 }, displacement_total: 2000 }),
        turnSummaries: [makeSummary({ territory_net: { RBiH: -1 }, displacement_total: 2000 })],
      }),
      osidDisplayNames: null,
    });
    rerender(createElement(PresidentialDecisionRoomPanel));

    expect(await screen.findByTestId('decision-room-priority-card-turn:24:hard-turn')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByTestId('decision-room-priority-card-paramilitary:pending')).toBeNull();
    });
  });

  it('explains disabled quiet-state actions instead of rendering dead controls', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    const { container } = render(createElement(PresidentialDecisionRoomPanel));

    const disabledButtons = [...container.querySelectorAll('button[disabled]')];
    expect(disabledButtons.length).toBeGreaterThan(0);
    for (const button of disabledButtons) {
      expect(button.getAttribute('title')).toBe('No current item is available for this action.');
      expect(button.getAttribute('aria-label')).toMatch(/No current item is available for this action\.$/);
    }
    expect(container.textContent).toContain('No current item is available for this action.');

    fireEvent.click(screen.getByRole('button', { name: 'View Advanced' }));
    const advancedDisabledButtons = [...container.querySelectorAll('button[disabled]')];
    expect(advancedDisabledButtons.length).toBeGreaterThan(disabledButtons.length);
    for (const button of advancedDisabledButtons) {
      expect(button.getAttribute('title')).toBe('No current item is available for this action.');
      expect(button.getAttribute('aria-label')).toMatch(/No current item is available for this action\.$/);
    }
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
