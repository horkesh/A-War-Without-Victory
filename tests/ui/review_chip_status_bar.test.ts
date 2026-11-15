// @vitest-environment jsdom
/**
 * Command-loop lane L1 (2C): the Warroom review chip carries a true count (capped "9+"), disappears
 * at zero, and opens a list of every item by tier in which every row is clickable.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState, OperationOpportunityProposalView } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { WarroomStatusBar } from '../../src/ui/map/components/warroom/WarroomStatusBar.js';
import { docketRowFallbackTarget } from '../../src/ui/map/data/warroomPriorityDocket.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

function makeOpportunity(index: number): OperationOpportunityProposalView {
  return {
    proposal_id: `opp_${index}`,
    opportunity_id: `window_${index}`,
    display_name: `Window ${index}`,
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 41,
    expires_turn: 41,
    review_id: `review_${index}`,
    description: `Staff reports window ${index} closing.`,
    recommendation: 'Review before ending the turn.',
    proposed_action: `OPPORTUNITY:opp_${index}`,
    required_axes_green: 1,
    required_axes_total: 2,
    optional_axes_green: 0,
    optional_axes_total: 1,
    prerequisite_axes: [],
    force_quality_traits: [],
    objectives: [],
    staging: [],
    redirect_variants: [],
    available_actions: [],
  } as OperationOpportunityProposalView;
}

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 41',
    turn: 41,
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

function setLoadedState(state: LoadedGameState) {
  useGameStore.setState({ loadedGameState: state, advanceTurnPending: false, osidDisplayNames: null, loadError: null });
}

afterEach(() => {
  cleanup();
  setLocale('en');
  useGameStore.setState({ loadedGameState: null, advanceTurnPending: false, osidDisplayNames: null, loadError: null });
});

describe('Warroom review chip', () => {
  it('is absent at zero', () => {
    setLoadedState(makeState());
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));
    expect(screen.queryByTestId('warroom-review-chip')).toBeNull();
    // The strip itself (phase, required count) stays.
    expect(screen.getByTestId('warroom-status-bar')).toBeTruthy();
    expect(screen.getByText('REQUIRED 0')).toBeTruthy();
  });

  it('shows the true number of rows, not the old floor of four', () => {
    setLoadedState(makeState({ operationOpportunityProposals: [makeOpportunity(1), makeOpportunity(2)] }));
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));
    const chip = screen.getByTestId('warroom-review-chip');
    expect(within(chip).getByText('2', { selector: '[data-review-count="before-advance"]' })).toBeTruthy();
    fireEvent.click(chip);
    expect(screen.getAllByTestId('warroom-review-row')).toHaveLength(2);
  });

  it('caps the display at "9+" but lists every item', () => {
    setLoadedState(makeState({
      operationOpportunityProposals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(makeOpportunity),
    }));
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));
    const chip = screen.getByTestId('warroom-review-chip');
    const count = chip.querySelector('[data-review-count="before-advance"]');
    expect(count?.textContent).toBe('9+');
    expect(count?.getAttribute('data-review-count-exact')).toBe('11');
    fireEvent.click(chip);
    expect(screen.getAllByTestId('warroom-review-row')).toHaveLength(11);
    // The list scrolls rather than growing past the screen.
    expect(screen.getByTestId('warroom-review-list').className).toContain('overflow-y-auto');
  });

  it('lists recommended items under a tier heading, each with its why-now line', () => {
    setLoadedState(makeState({ operationOpportunityProposals: [makeOpportunity(1), makeOpportunity(2)] }));
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));
    fireEvent.click(screen.getByTestId('warroom-review-chip'));
    expect(screen.getByText('Recommended (2)')).toBeTruthy();
    expect(screen.queryByText(/^Required \(/)).toBeNull();
    const rows = screen.getAllByTestId('warroom-review-row');
    expect(rows.every((row) => row.getAttribute('data-review-tier') === 'recommended')).toBe(true);
    expect(screen.getByText('Staff reports window 1 closing.')).toBeTruthy();
  });

  it('makes every row a live button that opens its own item', () => {
    const onReviewItem = vi.fn();
    setLoadedState(makeState({ operationOpportunityProposals: [makeOpportunity(1)] }));
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn(), onReviewItem }));
    fireEvent.click(screen.getByTestId('warroom-review-chip'));
    const [row] = screen.getAllByTestId('warroom-review-row');
    expect(row.hasAttribute('disabled')).toBe(false);
    fireEvent.click(row);
    expect(onReviewItem).toHaveBeenCalledTimes(1);
    expect(onReviewItem.mock.calls[0][0].id).toBe('opportunity:opp_1');
  });

  it('opens its card in the Decision Room for a row with no target of its own', () => {
    const item = {
      id: 'memory:orphan',
      navigationTarget: { kind: 'none' },
    } as unknown as Parameters<typeof docketRowFallbackTarget>[0];
    expect(docketRowFallbackTarget(item)).toEqual({ kind: 'decision-room', lens: 'all', cardId: 'memory:orphan' });
    const withTarget = {
      id: 'opportunity:opp_1',
      navigationTarget: { kind: 'decision-room', lens: 'opportunity', cardId: 'opportunity:opp_1' },
    } as unknown as Parameters<typeof docketRowFallbackTarget>[0];
    expect(docketRowFallbackTarget(withTarget)).toBeNull();
  });

  it('is localized in BCS', () => {
    setLocale('bcs');
    setLoadedState(makeState({ operationOpportunityProposals: [makeOpportunity(1)] }));
    render(createElement(WarroomStatusBar, { onReviewPriorities: vi.fn() }));
    fireEvent.click(screen.getByTestId('warroom-review-chip'));
    expect(screen.getByText('Preporučeno (1)')).toBeTruthy();
  });
});
