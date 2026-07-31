// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
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
    Reflect.deleteProperty(window, 'awwv');
    __resetDecisionRoomLensRequestForTest();
  });

  it('localizes static flat Decision Room panel chrome in BCS mode', () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    expect(screen.getByRole('button', { name: /Sve 3 stavki/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Komanda 3 stavki/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /napredno/i })).toBeNull();
    expect(screen.queryByText('Strategic Priorities')).toBeNull();
    expect(screen.queryByText(/ocekivano|ocekivanje|ocekove/i)).toBeNull();
    expect(screen.queryByText(/napredni/i)).toBeNull();
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
    expect(screen.queryByRole('button', { name: 'Hide Advanced' })).toBeNull();
    expect(screen.queryByText('Advanced Review')).toBeNull();
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

  it('retains an explicitly selected command category when that category becomes quiet', async () => {
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

    await waitFor(() => {
      expect(screen.queryByTestId('decision-room-priority-card-paramilitary:pending')).toBeNull();
      expect(screen.queryByTestId('decision-room-priority-card-turn:24:hard-turn')).toBeNull();
      expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_conscience');
      expect(screen.getByRole('status').textContent).toContain('Filtered by Conscience & Atrocity');
      expect(screen.getByRole('button', { name: 'Clear category filter' })).toBeTruthy();
      expect(screen.getByText('No items in this command category.')).toBeTruthy();
      expect(screen.queryByText('Priority Dossier')).toBeNull();
      expect(screen.getByTestId('decision-room-lens-all').getAttribute('aria-pressed')).toBe('false');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear category filter' }));

    await waitFor(() => {
      expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('');
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByTestId('decision-room-lens-all').getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByTestId('decision-room-priority-card-turn:24:hard-turn')).toBeTruthy();
      expect(screen.getByText('Priority Dossier')).toBeTruthy();
    });
  });

  it('does not render disabled quiet-state controls after removing meta scaffolding', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: null,
    });

    const { container } = render(createElement(PresidentialDecisionRoomPanel));

    const disabledButtons = [...container.querySelectorAll('button[disabled]')];
    expect(disabledButtons.every((button) => (
      (
        button.getAttribute('data-testid') === 'decision-room-dossier-review'
        || button.getAttribute('data-testid')?.startsWith('decision-room-card-action-')
      )
      && /Current Dossier/i.test(button.textContent ?? '')
    ))).toBe(true);
    expect(container.textContent).not.toContain('No current item is available for this action.');
    expect(screen.queryByRole('button', { name: 'View Advanced' })).toBeNull();
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

  it('groups six opening operation authorizations into one packet with one historical authorization action', async () => {
    const operationNames = ['Drina', 'Prijedor', 'Koridor', 'Vrbas', 'Hercegovina', 'Podrinje'];
    const acceptProposal = vi.fn(async (_proposalId: string) => ({ ok: true }));
    Object.defineProperty(window, 'awwv', {
      configurable: true,
      value: {
        acceptProposal,
        rejectProposal: async () => ({ ok: true }),
      },
    });
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RS',
        turn: 0,
        pendingProposalReviews: operationNames.map((name, index) => ({
          id: `opening_operation_${index + 1}`,
          turn: 0,
          faction: 'RS',
          domain: 'ops',
          description: `Authorize Operation ${name}.`,
          proposed_action: `HISTORICAL_OP:preplanned:vrs_corps_${index + 1}:Operation ${name}`,
          current_value: 'awaiting_authorization',
          proposed_value: 'authorize',
        })),
      } as Partial<LoadedGameState>),
      osidDisplayNames: null,
    });

    render(createElement(PresidentialDecisionRoomPanel));

    const packet = screen.getByTestId('operations-authorization-packet');
    expect(within(packet).getByText('Operations authorization packet')).toBeTruthy();
    expect(within(packet).getByText('6 independent authorizations')).toBeTruthy();
    const cards = packet.querySelectorAll('[data-testid^="decision-room-priority-card-command:review-proposal:"]');
    expect(cards).toHaveLength(6);
    fireEvent.click(within(packet).getByRole('button', { name: 'Authorize historical packet' }));
    await waitFor(() => {
      expect(acceptProposal.mock.calls.map(([proposalId]) => proposalId)).toEqual(
        operationNames.map((_name, index) => `opening_operation_${index + 1}`),
      );
    });

    for (const card of Array.from(cards)) {
      fireEvent.click(within(card as HTMLElement).getByRole('button', { name: 'Dossier' }));
      expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id'))
        .toBe(card.getAttribute('data-testid')?.replace('decision-room-priority-card-', ''));
      expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Withhold' })).toBeTruthy();
    }
  });
});
