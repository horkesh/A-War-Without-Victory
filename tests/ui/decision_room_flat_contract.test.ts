// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import {
  PresidentialDecisionRoomPanel,
  type PresidentialDecisionRoomPanelProps,
} from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import {
  __resetDecisionRoomLensRequestForTest,
  requestDecisionRoomLens,
} from '../../src/ui/map/utils/decisionRoomLensRequest.js';

const mockModel = vi.hoisted(() => ({
  cards: [] as Array<Record<string, unknown>>,
  selectedCardId: null as string | null,
  emptyState: 'No decisions awaiting the President.',
}));

vi.mock('../../src/ui/map/data/presidentialDecisionRoom.js', () => {
  const categoryLabels: Record<string, string> = {
    all: 'All',
    decision: 'Decisions',
    counter_offer: 'Counters',
    opportunity: 'Opportunity',
    operational: 'Operations',
    briefing: 'Briefing',
    command: 'Command',
    turn: 'Turn',
    cost: 'Cost',
    memory: 'Memory',
  };
  const categories = ['decision', 'opportunity', 'command', 'turn'];

  function lensFor(id: string) {
    const cards = id === 'all'
      ? mockModel.cards
      : mockModel.cards.filter((card) => card.category === id);
    return {
      id,
      label: categoryLabels[id],
      count: cards.length,
      urgentCount: cards.filter((card) => card.severity === 'blocking' || card.severity === 'critical').length,
      topCardId: (cards[0]?.id as string | undefined) ?? null,
      actionLabel: 'Review',
      navigationTarget: { kind: 'decision-room', lens: id },
    };
  }

  function buildPresidentialDecisionRoomView({ selectedCardId }: { selectedCardId?: string | null }) {
    mockModel.selectedCardId = selectedCardId ?? null;
    const selectedCard = mockModel.cards.find((card) => card.id === selectedCardId) ?? mockModel.cards[0] ?? null;
    const advanceItems = mockModel.cards.filter((card) => card.id === 'advance-sensitive');
    return {
      hasPlayerFaction: true,
      emptyState: mockModel.cards.length === 0 ? mockModel.emptyState : null,
      cards: mockModel.cards,
      lenses: [lensFor('all'), ...categories.map(lensFor).filter((lens) => lens.count > 0)],
      activeDossier: selectedCard
        ? {
            id: `dossier:${selectedCard.id as string}`,
            cardId: selectedCard.id,
            category: selectedCard.category,
            severity: selectedCard.severity,
            title: selectedCard.title,
            explanation: selectedCard.explanation,
            sourceOwner: selectedCard.sourceOwner,
            sourceLabel: selectedCard.sourceLabel,
            actionLabel: selectedCard.actionLabel,
            evidence: selectedCard.evidence,
            navigationTarget: selectedCard.navigationTarget,
            sourceHandoff: selectedCard.sourceHandoff ?? null,
             relatedCardIds: selectedCard.relatedCardIds ?? [],
             advanceSensitive: selectedCard.id === 'advance-sensitive',
             advanceLabel: selectedCard.id === 'advance-sensitive' ? 'Recommended before advance' : 'Not in advance review',
             directive: selectedCard.directive,
        }
        : null,
      advanceReadiness: {
        headline: 'Advance review required',
        blockedByExistingSystems: true,
        items: advanceItems,
      },
      metrics: {
        urgentCount: 2,
        pendingReviews: 6,
        opportunities: 2,
        hardTurns: 1,
        advanceReviewCount: advanceItems.length,
      },
    };
  }

  return {
    buildPresidentialDecisionRoomView,
  };
});

function makeCard(
  id: string,
  category: string,
  severity: 'blocking' | 'critical' | 'warning' | 'info',
  title: string,
) {
  return {
    id,
    category,
    severity,
    title,
    explanation: `${title} explanation.`,
    sourceOwner: 'Staff',
    sourceLabel: 'Decision Room fixture',
    actionLabel: 'Review',
    evidence: [`${title} evidence`],
    navigationTarget: { kind: 'none' },
    sortKey: 0,
  };
}

function installCards() {
  mockModel.cards = [
    makeCard('urgent-alpha', 'decision', 'blocking', 'Alpha urgent decision'),
    makeCard('urgent-bravo', 'decision', 'critical', 'Bravo urgent decision'),
    makeCard('advance-sensitive', 'opportunity', 'warning', 'Sensitive order'),
    makeCard('opportunity-delta', 'opportunity', 'info', 'Delta opportunity'),
    makeCard('command-echo', 'command', 'info', 'Echo command matter'),
    makeCard('turn-foxtrot', 'turn', 'info', 'Foxtrot turn record'),
  ];
}

function renderPanel(onNavigateTarget?: PresidentialDecisionRoomPanelProps['onNavigateTarget']) {
  useGameStore.setState({
    loadedGameState: {
      player_faction: 'RBiH',
      commandAuthority: { current: 100, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
      namedOfficerData: [],
    } as unknown as LoadedGameState,
    osidDisplayNames: null,
  });
  const Panel = PresidentialDecisionRoomPanel as ComponentType<PresidentialDecisionRoomPanelProps>;
  return render(createElement(Panel, { onNavigateTarget }));
}

function priorityCards(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-testid^="decision-room-priority-card-"]'));
}

describe('PresidentialDecisionRoomPanel flat contract', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
    mockModel.cards = [];
    mockModel.selectedCardId = null;
    useGameStore.setState(useGameStore.getInitialState());
    Reflect.deleteProperty(window, 'awwv');
    __resetDecisionRoomLensRequestForTest();
  });

  it('renders every priority card in deterministic order without meta scaffolding', () => {
    installCards();
    const { container } = renderPanel();

    expect(screen.getByText('Decisions, staff reports, and campaign records.')).toBeTruthy();
    expect(screen.queryByText('Decisions awaiting the President.')).toBeNull();
    expect(screen.getAllByText('1 item').length).toBeGreaterThan(0);
    expect(screen.queryByText('1 items')).toBeNull();
    const allLens = screen.getAllByRole('button').find((button) => button.textContent?.includes('All'));
    expect(allLens?.textContent).toContain('2 urgent');
    expect(allLens?.getAttribute('data-testid')).toBe('decision-room-lens-all');
    expect(allLens?.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('decision-room-lens-command').getAttribute('aria-pressed')).toBe('false');
    expect(priorityCards(container).map((node) => node.getAttribute('data-testid'))).toEqual([
      'decision-room-priority-card-urgent-alpha',
      'decision-room-priority-card-urgent-bravo',
      'decision-room-priority-card-advance-sensitive',
      'decision-room-priority-card-opportunity-delta',
      'decision-room-priority-card-command-echo',
      'decision-room-priority-card-turn-foxtrot',
    ]);
    expect(screen.queryByText('What is expected of me?')).toBeNull();
    expect(screen.queryByText('Priority Lanes')).toBeNull();
    expect(screen.queryByText('Advanced Review')).toBeNull();
    expect(screen.queryByText('Decision Loop')).toBeNull();
    expect(container.querySelector('[data-testid="decision-room-advanced"]')).toBeNull();
  });

  it('places the first priority card before dossier content', () => {
    installCards();
    const { container } = renderPanel();

    const firstCard = screen.getByTestId('decision-room-priority-card-urgent-alpha');
    const dossier = screen.getByText('Priority Dossier');

    expect(
      firstCard.compareDocumentPosition(dossier) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.textContent?.indexOf('Alpha urgent decision')).toBeLessThan(
      container.textContent?.indexOf('Priority Dossier') ?? Number.POSITIVE_INFINITY,
    );
  });

  it('keeps a directive receipt visible after the resolved proposal card disappears', async () => {
    const acceptProposal = vi.fn(async () => ({ ok: true }));
    Object.defineProperty(window, 'awwv', {
      configurable: true,
      value: { acceptProposal, rejectProposal: vi.fn(async () => ({ ok: true })) },
    });
    mockModel.cards = [{
      ...makeCard('proposal-alpha', 'command', 'warning', 'Authorize Operation Alpha'),
      directive: { lever: 'review_proposal', cost: 0, payload: { proposalId: 'proposal-alpha' } },
    }];

    const { rerender } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(acceptProposal).toHaveBeenCalledWith('proposal-alpha'));
    const receipt = await screen.findByTestId('decision-room-action-receipt');
    expect(receipt.textContent).toContain('Directive staged for next turn');

    mockModel.cards = [];
    rerender(createElement(PresidentialDecisionRoomPanel));
    expect(screen.getByTestId('decision-room-action-receipt').textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('marks advance-sensitive cards while keeping the header advance chip', () => {
    installCards();
    renderPanel();

    const card = screen.getByTestId('decision-room-priority-card-advance-sensitive');
    expect(card.textContent).toContain('Recommended before advance');
    expect(screen.getByText('Advance review required')).toBeTruthy();
  });

  it('honors deep-linked lens and card focus without exposing advanced-mode artifacts', () => {
    installCards();
    requestDecisionRoomLens('opportunity', null, 'opportunity-delta');
    const { container } = renderPanel();

    expect(priorityCards(container).map((node) => node.getAttribute('data-testid'))).toEqual([
      'decision-room-priority-card-advance-sensitive',
      'decision-room-priority-card-opportunity-delta',
    ]);
    const opportunityLens = screen
      .getAllByRole('button', { name: /Opportunity/i })
      .find((button) => button.textContent?.includes('2 items'));
    expect(opportunityLens?.className).toContain('border-amber');
    expect(screen.getAllByText('Delta opportunity').length).toBeGreaterThan(0);
    expect(screen.queryByText('Advanced Review')).toBeNull();
    expect(screen.queryByText('Decision Loop')).toBeNull();
    expect(container.querySelector('[data-testid="decision-room-advanced"]')).toBeNull();
  });

  it('renders only the empty-state copy when no cards exist', () => {
    mockModel.cards = [];
    const { container } = renderPanel();

    expect(screen.getByText('No decisions awaiting the President.')).toBeTruthy();
    expect(priorityCards(container)).toHaveLength(0);
    expect(screen.queryByText('Priority Dossier')).toBeNull();
    expect(screen.queryByText('No priority dossier selected.')).toBeNull();
  });

  it('routes dossier Review through the source handoff when the card target only reselects itself', () => {
    mockModel.cards = [{
      ...makeCard('sitrep-hostile', 'operational', 'warning', 'Hostile Takeover Timers'),
      navigationTarget: { kind: 'decision-room', lens: 'operational', cardId: 'sitrep-hostile' },
      sourceHandoff: {
        id: 'army-hq-summary',
        label: 'Army HQ Summary',
        summary: '1 item',
        count: 1,
        urgentCount: 0,
        cardIds: ['sitrep-hostile'],
        actionLabel: 'Open Summary',
        navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
      },
    }];
    const navigate = vi.fn();
    renderPanel(navigate);

    fireEvent.click(screen.getByRole('button', { name: 'Open Summary' }));

    expect(navigate).toHaveBeenCalledWith({ kind: 'army-hq-tab', tab: 'summary' });
  });

  it("routes a selected grouped handoff card to that card's exact corps target", () => {
    const groupedHandoff = {
      id: 'army-hq-corps-briefings',
      label: 'Army HQ Corps Briefings',
      summary: '2 items',
      count: 2,
      urgentCount: 0,
      cardIds: ['corps-alpha', 'corps-bravo'],
      actionLabel: 'Review Corps Briefing',
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: 'corps_alpha' },
    };
    mockModel.cards = [
      {
        ...makeCard('corps-alpha', 'command', 'warning', 'Alpha Corps'),
        navigationTarget: { kind: 'decision-room', lens: 'command', cardId: 'corps-alpha' },
        sourceHandoffTarget: { kind: 'army-hq-corps-briefing', corpsId: 'corps_alpha' },
        sourceHandoff: groupedHandoff,
      },
      {
        ...makeCard('corps-bravo', 'command', 'warning', 'Bravo Corps'),
        navigationTarget: { kind: 'decision-room', lens: 'command', cardId: 'corps-bravo' },
        sourceHandoffTarget: { kind: 'army-hq-corps-briefing', corpsId: 'corps_bravo' },
        sourceHandoff: groupedHandoff,
      },
    ];
    requestDecisionRoomLens('command', null, 'corps-bravo');
    const navigate = vi.fn();
    renderPanel(navigate);

    fireEvent.click(screen.getByTestId('decision-room-dossier-review'));

    expect(navigate).toHaveBeenCalledWith({ kind: 'army-hq-corps-briefing', corpsId: 'corps_bravo' });
    expect(navigate).not.toHaveBeenCalledWith({ kind: 'army-hq-corps-briefing', corpsId: 'corps_alpha' });
  });

  it('disables the selected-card self-review action instead of dispatching an inert route', () => {
    mockModel.cards = [{
      ...makeCard('sitrep-hostile', 'operational', 'warning', 'Hostile Takeover Timers'),
      navigationTarget: { kind: 'decision-room', lens: 'operational', cardId: 'sitrep-hostile' },
    }];
    const navigate = vi.fn();
    renderPanel(navigate);

    const currentActions = screen.getAllByRole('button', { name: 'Current Dossier' });
    expect(currentActions.length).toBeGreaterThanOrEqual(1);
    for (const current of currentActions) {
      expect(current.hasAttribute('disabled')).toBe(true);
      fireEvent.click(current);
    }

    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables the selected priority-card self-review action in the list', () => {
    mockModel.cards = [{
      ...makeCard('reserve-drina', 'command', 'warning', 'Reserve request: Drina Corps'),
      navigationTarget: { kind: 'decision-room', lens: 'command', cardId: 'reserve-drina' },
      sourceHandoff: {
        id: 'army-hq-personnel',
        label: 'Army HQ Personnel',
        summary: '1 request',
        count: 1,
        urgentCount: 0,
        cardIds: ['reserve-drina'],
        actionLabel: 'Personnel',
        navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
      },
    }];
    const navigate = vi.fn();
    const { container } = renderPanel(navigate);

    const selectedCard = screen.getByTestId('decision-room-priority-card-reserve-drina');
    const listAction = Array.from(selectedCard.querySelectorAll('button'))
      .find((button) => button.textContent === 'Current Dossier') as HTMLButtonElement | undefined;

    expect(listAction).toBeTruthy();
    expect(listAction!.disabled).toBe(true);
    fireEvent.click(listAction!);

    expect(navigate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Personnel');
  });

  it('wraps primary priority-dossier text instead of truncating it', () => {
    const longOwner = 'Operational Situation Report Source With Important Long Command Context';
    const longLabel = 'War summary and hostile takeover timer dossier';
    const relatedTitle = 'Second operational situation report with distinct evidence';
    mockModel.cards = [
      {
        ...makeCard('sitrep-hostile', 'operational', 'warning', 'Operational Situation Report'),
        sourceOwner: longOwner,
        sourceLabel: longLabel,
        relatedCardIds: ['sitrep-related'],
      },
      {
        ...makeCard('sitrep-related', 'briefing', 'critical', relatedTitle),
        sourceOwner: longOwner,
        sourceLabel: longLabel,
      },
    ];
    renderPanel();

    const dossier = screen.getByText('Priority Dossier').closest('section');
    expect(dossier).toBeTruthy();
    for (const text of [longOwner, longLabel, 'Not in advance review', relatedTitle]) {
      const node = Array.from(dossier!.querySelectorAll('*')).find((el) => el.textContent === text) as HTMLElement | undefined;
      expect(node, text).toBeTruthy();
      expect(node!.className, text).not.toContain('truncate');
    }
  });
});
