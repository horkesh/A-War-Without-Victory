// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { PresidentialToolbar } from '../../src/ui/map/components/PresidentialToolbar.js';
import { WarroomStatusBar } from '../../src/ui/map/components/warroom/WarroomStatusBar.js';
import { AdvanceTurnModal } from '../../src/ui/map/components/warroom/AdvanceTurnModal.js';
import { advanceTurnAndSync } from '../../src/ui/map/desktop/orderActions.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

vi.mock('../../src/ui/map/desktop/orderActions.js', () => ({
  advanceTurnAndSync: vi.fn(async () => undefined),
}));

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
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
    player_faction: 'RS',
    ...overrides,
  } as LoadedGameState;
}

function makeRequiredEventDecisions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    event_id: `required_event_${index + 1}`,
    event_title: `Required decision ${index + 1}`,
    faction: 'RS',
    turn_fired: 40,
    requires_player_response: true,
    response_options: [{ id: 'answer', label: 'Answer', effects: [] }],
  }));
}

function setLoadedState(state: LoadedGameState) {
  useGameStore.setState({
    loadedGameState: state,
    advanceTurnPending: false,
    osidDisplayNames: null,
    loadError: null,
  });
}

function installIpcBridge() {
  Object.defineProperty(window, 'awwv', {
    configurable: true,
    value: {
      advanceTurn: vi.fn(async () => ({ ok: true, stateJson: JSON.stringify(makeState({ turn: 41 })) })),
    },
  });
}

describe('ADVANCE_TURN gated feedback', () => {
  beforeEach(() => {
    installIpcBridge();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    setLocale('en');
    delete (window as unknown as { awwv?: unknown }).awwv;
    useGameStore.setState({
      loadedGameState: null,
      advanceTurnPending: false,
      osidDisplayNames: null,
      loadError: null,
    });
  });

  it('toolbar explains a pending-decision block and opens the existing advance review path instead of advancing', () => {
    setLoadedState(makeState({
      pendingEventDecisions: makeRequiredEventDecisions(2),
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(PresidentialToolbar, {
      pendingReviews: 2,
      pressureWarning: false,
    }));

    const button = screen.getByRole('button', { name: /resolve 2 pending decisions to continue/i });
    expect(button.getAttribute('title')).toContain('Resolve 2 pending decisions to continue');
    expect(button.textContent).toContain('REVIEW BLOCKERS');

    fireEvent.click(button);

    expect(advanceTurnAndSync).not.toHaveBeenCalled();
    expect(useGameStore.getState().advanceTurnPending).toBe(true);
  });

  it('toolbar keeps the normal advance action when the pre-advance gate is clear', () => {
    setLoadedState(makeState());

    render(createElement(PresidentialToolbar, {
      pendingReviews: 0,
      pressureWarning: false,
    }));

    fireEvent.click(screen.getByRole('button', { name: /advance turn/i }));

    expect(advanceTurnAndSync).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });

  it('advance modal disables the final advance action while review blockers remain', () => {
    const onReviewPriorities = vi.fn();
    setLoadedState(makeState({
      pendingEventDecisions: makeRequiredEventDecisions(2),
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));
    useGameStore.setState({ advanceTurnPending: true });

    render(createElement(AdvanceTurnModal, { onReviewPriorities }));

    expect(screen.getByText('Advance blocked')).toBeTruthy();
    expect(screen.getByText(/Resolve the pending presidential decisions/i)).toBeTruthy();
    const advanceButton = screen.getByRole('button', { name: 'Advance Turn' });
    expect(advanceButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Open review' }));

    expect(advanceTurnAndSync).not.toHaveBeenCalled();
    expect(onReviewPriorities).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });

  it('records a clear desk as deliberate restraint when advancing', () => {
    setLoadedState(makeState());
    useGameStore.setState({ advanceTurnPending: true });

    render(createElement(AdvanceTurnModal, { onReviewPriorities: vi.fn() }));

    expect(screen.getByText('No presidential act is required.')).toBeTruthy();
    expect(screen.getByText('Staff recommends holding present policy.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Advance while holding present policy' })).toBeTruthy();
  });

  it('distinguishes optional staff review from the clear hold-course path', () => {
    setLoadedState(makeState({
      pendingReserveRequests: [{
        request_id: 'reserve-advisory',
        corps_id: 'vrs_drina',
        faction: 'RS',
        reason: 'defensive_gap',
        priority: 40,
        severityBand: 'routine',
        travel_hops: 2,
        description: 'Staff recommends reviewing reserve posture.',
        suggested_brigade_id: null,
        turn_requested: 40,
      }],
    } as Partial<LoadedGameState>));
    useGameStore.setState({ advanceTurnPending: true });

    render(createElement(AdvanceTurnModal, { onReviewPriorities: vi.fn() }));

    expect(screen.getByText('Staff recommends review before the week closes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Advance with recorded decisions' })).toBeTruthy();
  });

  it('advance modal labels command and counter-offer review rows without Memory fallbacks', () => {
    setLoadedState(makeState({
      pendingCounterOffers: [
        {
          id: 'HRHB_001',
          author: 'HRHB',
          parentOfferId: 'owen_stoltenberg',
          planId: 'owen_stoltenberg',
          planName: 'Owen-Stoltenberg Plan',
          chainDepth: 1,
          createdTurn: 70,
          response: 'conditional_accept',
          proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
          institutionalModel: 'union_3_republics',
          sourceCitation: 'BB1 p.49',
          rider: 'withdraw territorial concessions',
        },
      ],
      pendingReserveRequests: [
        {
          request_id: 'reserve_named',
          faction: 'RS',
          corps_id: 'vrs_drina',
          reason: 'sector_threat',
          priority: 90,
          severityBand: 'critical',
          description: 'Drina Corps requests reserve reinforcement.',
          travel_hops: 1,
          suggested_brigade_id: 'elite_1',
          turn_requested: 40,
        },
      ],
    }));
    useGameStore.setState({ advanceTurnPending: true });

    const { container } = render(createElement(AdvanceTurnModal, { onReviewPriorities: vi.fn() }));

    expect(container.textContent).toContain('Counter');
    expect(container.textContent).toContain('Command');
    expect(container.textContent).not.toContain('Memory');
  });

  it('Warroom status dock does not duplicate the command-dock Advance control', () => {
    const onReviewPriorities = vi.fn();
    setLoadedState(makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(WarroomStatusBar, { onReviewPriorities }));

    expect(screen.queryByRole('button', { name: /resolve 2 pending decisions to continue/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^advance/i })).toBeNull();

    const prioritiesButton = screen.getByRole('button', { name: 'Review staff docket: 2 before-advance, 2 pending' });
    expect(prioritiesButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(prioritiesButton);

    expect(screen.getByText('Review before advance')).toBeTruthy();
    expect(screen.getByText('2 advance items / 0 required / 5 recommended / 0 monitor / 0 record / 2 pending')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Decision Room' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: "Open President's Desk" })).toBeNull();
    expect(screen.getByRole('button', { name: 'Review staff docket: 2 before-advance, 2 pending' }).getAttribute('aria-expanded')).toBe('true');
    expect(onReviewPriorities).not.toHaveBeenCalled();
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });

  it('separates required presidential obligations from staff review urgency', () => {
    setLoadedState(makeState({
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));

    expect(screen.getByText('REQUIRED 0')).toBeTruthy();
    const staffReview = screen.getByRole('button', {
      name: 'Review staff docket: 2 before-advance, 2 pending',
    });
    expect(within(staffReview).getByText('Review Before Advance')).toBeTruthy();
    expect(within(staffReview).getByText('2', { selector: '[data-review-count="before-advance"]' })).toBeTruthy();
    expect(within(staffReview).getByText('PENDING 2')).toBeTruthy();
    expect(staffReview.textContent).not.toContain('URG');
  });

  it('explains a capped-Authority decision drought in the weekly Warroom loop', () => {
    setLoadedState(makeState({
      commandAuthority: {
        current: 100,
        max: 100,
        reserve: 15,
        reserveMax: 15,
        spentThisTurn: 0,
        lifetimeSpent: 120,
      },
    }));

    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));

    const note = screen.getByRole('note', { name: /no sourced presidential initiative is filed this week/i });
    expect(note.getAttribute('data-testid')).toBe('warroom-cadence-hold');
    expect(note.textContent).toBe('NO SOURCED INITIATIVE · POLICY HOLDS');
    expect(within(note).queryByRole('button')).toBeNull();
  });

  it('does not claim a policy hold while a presidential action is filed', () => {
    setLoadedState(makeState({
      commandAuthority: {
        current: 100,
        max: 100,
        reserve: 15,
        reserveMax: 15,
        spentThisTurn: 0,
        lifetimeSpent: 120,
      },
      pendingEventDecisions: makeRequiredEventDecisions(1),
    }));

    render(createElement(WarroomStatusBar, {
      onReviewPriorities: vi.fn(),
      onResolveBlocker: vi.fn(),
    }));

    expect(screen.queryByTestId('warroom-cadence-hold')).toBeNull();
  });

  it('Warroom status dock explains disabled priority review controls', () => {
    const onReviewPriorities = vi.fn();
    setLoadedState(makeState({ player_faction: null as never }));

    render(createElement(WarroomStatusBar, { onReviewPriorities }));

    const prioritiesButton = screen.getByRole('button', { name: /Review priorities unavailable: no campaign side selected/i });
    expect(prioritiesButton.hasAttribute('disabled')).toBe(true);
    expect(prioritiesButton.getAttribute('title')).toBe('Review priorities unavailable: no campaign side selected');
    fireEvent.click(prioritiesButton);
    expect(onReviewPriorities).not.toHaveBeenCalled();
  });

  it('advance clearance opens a single hard blocker resolver directly', async () => {
    const onResolveBlocker = vi.fn();
    setLoadedState(makeState({
      pendingParamilitaryRequests: [
        { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
      ],
    }));
    useGameStore.setState({ advanceTurnPending: true, osidDisplayNames: { bratunac_1: 'Bratunac' } });

    render(createElement(AdvanceTurnModal, { onResolveBlocker }));

    expect(onResolveBlocker).toHaveBeenCalledWith('paramilitary_review', 'paramilitary:40');
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
  });

  it('Warroom opens a single required signature directly from the status dock', () => {
    const onResolveBlocker = vi.fn();
    setLoadedState(makeState({
      pendingEventDecisions: makeRequiredEventDecisions(1),
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(WarroomStatusBar, {
      onReviewPriorities: vi.fn(),
      onResolveBlocker,
    }));

    const signature = screen.getByRole('button', {
      name: 'Open required signature: Required decision 1',
    });
    expect(signature.textContent).toContain('SIGNATURE REQUIRED');
    fireEvent.click(signature);

    expect(onResolveBlocker).toHaveBeenCalledWith('event_modal', 'event:required_event_1');
    expect(screen.queryByText('Open Decision Room')).toBeNull();
  });

  it('advance clearance labels hard blocker families without enum-derived copy', () => {
    setLoadedState(makeState({
      pendingParamilitaryRequests: [
        { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
      ],
      pendingEventDecisions: [
        {
          event_id: 'evt_identity',
          event_title: 'Identity question',
          faction: 'RS',
          turn_fired: 40,
          requires_player_response: true,
          response_options: [{ id: 'answer', label: 'Answer', effects: [] }],
        },
      ],
    }));
    useGameStore.setState({ advanceTurnPending: true, osidDisplayNames: { bratunac_1: 'Bratunac' } });

    const { container } = render(createElement(AdvanceTurnModal, { onResolveBlocker: vi.fn() }));

    expect(screen.getByText('Event decision')).toBeTruthy();
    expect(screen.getAllByText('Paramilitary authorization').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/event_decision|paramilitary request|paramilitary_request/i);
  });

  it('Warroom status dock localizes priority chrome in BCS mode without duplicating Advance', () => {
    setLocale('bcs');
    setLoadedState(makeState());

    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));

    expect(screen.getByText('RAT')).toBeTruthy();
    expect(screen.getByText('OBAVEZNO 0')).toBeTruthy();
    expect(screen.getByText('Pregled prije napredovanja')).toBeTruthy();
    expect(screen.queryByText('NASTAVI')).toBeNull();
    expect(screen.queryByText('WAR')).toBeNull();
    expect(screen.queryByText('PRIORITIES')).toBeNull();
    expect(screen.queryByText('ADVANCE')).toBeNull();

    fireEvent.click(screen.getByText('Pregled prije napredovanja'));

    expect(screen.getByText('Pregled prije nastavka')).toBeTruthy();
    expect(screen.getByText('Nijedna živa stavka Sobe odluka ne zahtijeva pregled prije nastavka.')).toBeTruthy();
    expect(screen.getByText('Predaje izvora')).toBeTruthy();
  });

  it('Warroom priority severity badges are localized instead of hardcoded English', () => {
    const source = readFileSync('src/ui/map/components/warroom/WarroomStatusBar.tsx', 'utf8');
    const bcsMessages = readFileSync('src/ui/map/i18n/messages.bcs.ts', 'utf8');

    expect(source).toContain("t('warroom.severity.blocking')");
    expect(source).toContain("t('warroom.severity.critical')");
    expect(source).toContain("t('warroom.severity.warning')");
    expect(source).toContain("t('warroom.severity.info')");
    expect(bcsMessages).toContain("'warroom.severity.blocking': 'Blokira'");
    expect(bcsMessages).toContain("'warroom.severity.warning': 'Upozorenje'");
  });

  it('Advance Clearance modal localizes review severity and blocker chrome in BCS mode', () => {
    setLocale('bcs');
    setLoadedState(makeState({
      presidentialReviewQueue: {
        pendingCount: 1,
        criticalCount: 1,
        eventDecisionCount: 1,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
      pendingEventDecisions: [
        {
          event_id: 'evt_identity',
          event_title: 'Identity question',
          faction: 'RS',
          turn_fired: 40,
          requires_player_response: true,
          response_options: [{ id: 'answer', label: 'Answer', effects: [] }],
        },
      ],
      pendingParamilitaryRequests: [
        { faction: 'RS', target_osid: 'bratunac_1', strength: 120, estimated_civilian_risk: 14 },
      ],
    }));
    useGameStore.setState({ advanceTurnPending: true, osidDisplayNames: { bratunac_1: 'Bratunac' } });

    const { container } = render(createElement(AdvanceTurnModal, { onResolveBlocker: vi.fn() }));
    const copy = container.textContent ?? '';

    expect(screen.getByText('Riješi prije nastavka')).toBeTruthy();
    expect(screen.getAllByText('Obavezno').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blokira').length).toBeGreaterThan(0);
    expect(copy).not.toContain('Resolve before advancing');
    expect(copy).not.toContain('Required');
    expect(copy).not.toContain('blocking');
  });

  it('toolbar localizes the pending-decision advance gate title in BCS mode', () => {
    setLocale('bcs');
    setLoadedState(makeState({
      pendingEventDecisions: makeRequiredEventDecisions(2),
      presidentialReviewQueue: {
        pendingCount: 2,
        criticalCount: 1,
        eventDecisionCount: 2,
        commandInterpretationCount: 0,
        personnelDirectiveCount: 0,
        operationOpportunityCount: 0,
      },
    }));

    render(createElement(PresidentialToolbar, {
      pendingReviews: 2,
      pressureWarning: false,
    }));

    const button = screen.getByRole('button', { name: /riješite 2 odluke na čekanju za nastavak/i });

    expect(button.getAttribute('title')).toBe('Riješite 2 odluke na čekanju za nastavak. Otvara pregled sobe odluka.');
    expect(screen.queryByText(/Resolve 2 pending decisions to continue/i)).toBeNull();
  });

  it('toolbar localizes primary shell chrome in BCS mode', () => {
    setLocale('bcs');
    setLoadedState(makeState({
      commandAuthority: { current: 4, max: 8, spentThisTurn: 0, lifetimeSpent: 0 },
    }));

    render(createElement(PresidentialToolbar, {
      pendingReviews: 0,
      pressureWarning: false,
    }));

    expect(screen.getByText('STO')).toBeTruthy();
    expect(screen.getByText('RATNA MAPA')).toBeTruthy();
    expect(screen.getByText('ARMIJSKI HQ')).toBeTruthy();
    expect(screen.getByText('ZAPISI')).toBeTruthy();
    expect(screen.getByText('HRONIKA')).toBeTruthy();
    expect(screen.getByText('KODEKS')).toBeTruthy();
    expect(screen.getByText(/11 jan 1993/)).toBeTruthy();
    expect(screen.getByText(/SLJEDEĆI POTEZ/)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Ovlast: 4/8' })).toBeTruthy();
    expect(screen.getByTitle('Kampanjska hronika')).toBeTruthy();
    expect(screen.getAllByTitle('Posjeti Armijski HQ [H]').length).toBeGreaterThan(0);
    expect(screen.queryByText('CHRONICLE')).toBeNull();
    expect(screen.queryByText('SUMMARY')).toBeNull();
    expect(screen.queryByText('EVENTS')).toBeNull();
  });
});
