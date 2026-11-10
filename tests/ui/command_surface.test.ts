// @vitest-environment jsdom
/**
 * Command Surface (owner redesign 2026-11-10): one surface with the six areas, the
 * chosen area's matters grouped by what they ask of the president, and the selected
 * matter with its action. Carries over the guarantees of the retired strip and
 * Decision Room tests (deep links, receipts, review routing, the historical packet,
 * BCS chrome) onto the new surface, with the real read model.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { CommandSurface, matterGroup } from '../../src/ui/map/components/command_surface/CommandSurface.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { PresidentialDecisionRoomCard } from '../../src/ui/map/data/presidentialDecisionRoom.js';
import { PRESIDENTIAL_COMMAND_CATEGORIES } from '../../src/ui/map/data/presidentialCategories.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import {
  __resetDecisionRoomLensRequestForTest,
  requestDecisionRoomLens,
} from '../../src/ui/map/utils/decisionRoomLensRequest.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 24', turn: 24, phase: 'war', formations: [], militiaPools: [], controlBySettlement: {},
    statusBySettlement: {}, brigadeAorByFormationId: {}, attackOrders: [], aorOrders: [], recentControlEvents: [],
    allControlEvents: [], displacementEventLog: [], battlesByOsid: {}, movementsByOsid: {}, supplyTransitionsByOsid: {},
    historicalEventsByTurn: [], pressureWarning: false, latestTurnSummary: null, turnSummaries: [], player_faction: 'RBiH',
    commandAuthority: { current: 90, max: 100, spentThisTurn: 10, recoveryPerTurn: 2 },
    namedOfficerData: [],
    ...overrides,
  } as LoadedGameState;
}

const paramilitary = {
  pendingParamilitaryRequests: [{ faction: 'RBiH', mode: 'offensive', strength: 80, target_osid: 'op:test:alpha', estimated_civilian_risk: 12 }],
} as Partial<LoadedGameState>;

function renderSurface(state: LoadedGameState, props: Partial<Parameters<typeof CommandSurface>[0]> = {}) {
  useGameStore.setState({ loadedGameState: state, osidDisplayNames: null });
  return render(createElement(CommandSurface, { onClose: vi.fn(), ...props }));
}

afterEach(() => {
  cleanup();
  setLocale('en');
  useGameStore.setState({ loadedGameState: null, osidDisplayNames: null });
  Reflect.deleteProperty(window, 'awwv');
  __resetDecisionRoomLensRequestForTest();
});

describe('Command Surface layout', () => {
  it('shows the six areas with plain status lines and no priority jargon', () => {
    renderSurface(makeState(paramilitary));
    const rail = screen.getByTestId('command-card-strip');
    for (const category of PRESIDENTIAL_COMMAND_CATEGORIES) {
      expect(within(rail).getByTestId(`command-card-${category.id}`)).toBeTruthy();
    }
    const text = screen.getByTestId('warroom-decision-room-host').textContent ?? '';
    expect(text).not.toMatch(/REQ \d|REC \d|MON \d/);
    expect(text).toContain('Authority');
    expect(text).toContain('90 / 100');
  });

  it('opens on the area that needs a decision and selects its first matter', () => {
    renderSurface(makeState(paramilitary));
    expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_conscience');
    expect(screen.getByTestId('command-card-cat_conscience').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id')).toBe('paramilitary:pending');
  });

  it('groups matters by what they ask of the president', () => {
    const card = (over: Partial<PresidentialDecisionRoomCard>) => ({ priorityBand: 'recommended', ...over }) as PresidentialDecisionRoomCard;
    expect(matterGroup(card({ priorityBand: 'required', directive: { lever: 'review_proposal', cost: 0, payload: {} } }))).toBe('needs');
    expect(matterGroup(card({ directive: { lever: 'front_visit', cost: 10, payload: {} } }))).toBe('actions');
    expect(matterGroup(card({}))).toBe('review');
    expect(matterGroup(card({ priorityBand: 'monitor' }))).toBe('watch');
    expect(matterGroup(card({ priorityBand: 'record' }))).toBe('record');
  });

  it('switches area by click and by keys 1–6, and says plainly when an area is empty', () => {
    renderSurface(makeState(paramilitary));
    fireEvent.click(screen.getByTestId('command-card-cat_home_front'));
    expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_home_front');
    expect(screen.getByText('Nothing waits here this week.')).toBeTruthy();
    expect(screen.queryByTestId('decision-room-active-dossier')).toBeNull();
    fireEvent.keyDown(screen.getByTestId('warroom-decision-room-host'), { key: '5' });
    expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_conscience');
  });

  it('closes on Escape and on Close', () => {
    const onClose = vi.fn();
    renderSurface(makeState(), { onClose });
    fireEvent.keyDown(screen.getByTestId('warroom-decision-room-host'), { key: 'Escape' });
    fireEvent.click(screen.getByTestId('warroom-decision-room-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('opens on the area a toolbar or hotspot entry names', () => {
    renderSurface(makeState(paramilitary), { initialCategoryId: 'cat_record' });
    expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_record');
  });
});

describe('Command Surface deep links', () => {
  it('honours a requested area', async () => {
    requestDecisionRoomLens('all', 'cat_home_front');
    renderSurface(makeState(paramilitary));
    await waitFor(() => expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_home_front'));
  });

  it('selects a requested card in its own area, and ignores a stale card id', async () => {
    requestDecisionRoomLens('decision', null, 'paramilitary:pending');
    renderSurface(makeState(paramilitary), { initialCategoryId: 'cat_record' });
    await waitFor(() => expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id')).toBe('paramilitary:pending'));
    cleanup();
    requestDecisionRoomLens('turn', null, 'missing-card');
    renderSurface(makeState(paramilitary));
    expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id')).toBe('paramilitary:pending');
  });
});

describe('Command Surface actions', () => {
  it('routes the review handoff through the host navigation', () => {
    const navigate = vi.fn();
    renderSurface(makeState(paramilitary), { onNavigateTarget: navigate });
    fireEvent.click(screen.getByTestId('decision-room-dossier-review'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0]![0].kind).not.toBe('none');
  });

  it('authorizes the opening historical operations as one packet and keeps each reviewable', async () => {
    const names = ['Drina', 'Prijedor', 'Koridor', 'Vrbas', 'Hercegovina', 'Podrinje'];
    const acceptProposal = vi.fn(async (_id: string) => ({ ok: true }));
    Object.defineProperty(window, 'awwv', { configurable: true, value: { acceptProposal, rejectProposal: async () => ({ ok: true }) } });
    renderSurface(makeState({
      player_faction: 'RS',
      turn: 0,
      pendingProposalReviews: names.map((name, index) => ({
        id: `opening_operation_${index + 1}`, turn: 0, faction: 'RS', domain: 'ops',
        description: `Authorize Operation ${name}.`,
        proposed_action: `HISTORICAL_OP:preplanned:vrs_corps_${index + 1}:Operation ${name}`,
        current_value: 'awaiting_authorization', proposed_value: 'authorize',
      })),
    } as Partial<LoadedGameState>));
    expect(screen.getByTestId('presidential-decision-room').getAttribute('data-command-category-id')).toBe('cat_war_direction');
    const cards = document.querySelectorAll('[data-testid^="decision-room-priority-card-command:review-proposal:"]');
    expect(cards).toHaveLength(6);
    fireEvent.click(screen.getByTestId('operations-authorization-packet'));
    await waitFor(() => expect(acceptProposal.mock.calls.map(([id]) => id)).toEqual(names.map((_n, i) => `opening_operation_${i + 1}`)));
    expect((await screen.findByTestId('decision-room-action-receipt')).textContent).toContain('6');
    for (const card of Array.from(cards)) {
      fireEvent.click(card);
      expect(screen.getByTestId('decision-room-active-dossier').getAttribute('data-card-id'))
        .toBe(card.getAttribute('data-testid')?.replace('decision-room-priority-card-', ''));
      expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Withhold' })).toBeTruthy();
    }
  });
});

describe('Command Surface in BCS', () => {
  it('localizes the chrome', () => {
    setLocale('bcs');
    renderSurface(makeState(paramilitary));
    const text = screen.getByTestId('warroom-decision-room-host').textContent ?? '';
    for (const bcs of ['Autoritet', 'OVE SEDMICE', 'Potrebna odluka', 'TRAŽI VAŠU ODLUKU']) expect(text).toContain(bcs);
    for (const en of ['This week', 'Decision needed', 'Needs your decision', 'Nothing waiting']) expect(text).not.toContain(en);
  });
});
