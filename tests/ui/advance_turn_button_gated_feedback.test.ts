// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.queryByRole('button', { name: /advance/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /priorities/i }));

    expect(screen.getByText('Review before advance')).toBeTruthy();
    expect(screen.getByText('1 advance item / 1 urgent / 2 pending')).toBeTruthy();
    expect(onReviewPriorities).not.toHaveBeenCalled();
    expect(useGameStore.getState().advanceTurnPending).toBe(false);
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

  it('Warroom status dock localizes priority chrome in BCS mode without duplicating Advance', () => {
    setLocale('bcs');
    setLoadedState(makeState());

    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));

    expect(screen.getByText('RAT')).toBeTruthy();
    expect(screen.getByText('PRIORITETI')).toBeTruthy();
    expect(screen.queryByText('NASTAVI')).toBeNull();
    expect(screen.queryByText('WAR')).toBeNull();
    expect(screen.queryByText('PRIORITIES')).toBeNull();
    expect(screen.queryByText('ADVANCE')).toBeNull();

    fireEvent.click(screen.getByText('PRIORITETI'));

    expect(screen.getByText('Pregled prije nastavka')).toBeTruthy();
    expect(screen.getByText('Nijedna živa stavka stola neće biti zakopana sljedećim potezom.')).toBeTruthy();
    expect(screen.getByText('Predaje izvora')).toBeTruthy();
  });

  it('toolbar localizes the pending-decision advance gate title in BCS mode', () => {
    setLocale('bcs');
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
    expect(screen.getByText(/Sedmica 40/)).toBeTruthy();
    expect(screen.getByText(/SLJEDEĆI POTEZ/)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Komandni autoritet: 4/8' })).toBeTruthy();
    expect(screen.getByTitle('Kampanjska hronika')).toBeTruthy();
    expect(screen.getAllByTitle('Posjeti Armijski HQ [H]').length).toBeGreaterThan(0);
    expect(screen.queryByText('CHRONICLE')).toBeNull();
    expect(screen.queryByText('SUMMARY')).toBeNull();
    expect(screen.queryByText('EVENTS')).toBeNull();
  });
});
