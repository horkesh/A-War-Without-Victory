// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialDecisionRoomPanel } from '../../src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.js';
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
            sourceHandoff: null,
            relatedCardIds: [],
            advanceSensitive: selectedCard.id === 'advance-sensitive',
            advanceLabel: selectedCard.id === 'advance-sensitive' ? 'Review before advance' : 'Not in advance review',
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

function renderPanel() {
  useGameStore.setState({
    loadedGameState: { player_faction: 'RBiH' } as LoadedGameState,
    osidDisplayNames: null,
  });
  return render(createElement(PresidentialDecisionRoomPanel));
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
    __resetDecisionRoomLensRequestForTest();
  });

  it('renders every priority card in deterministic order without meta scaffolding', () => {
    installCards();
    const { container } = renderPanel();

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

  it('marks advance-sensitive cards while keeping the header advance chip', () => {
    installCards();
    renderPanel();

    const card = screen.getByTestId('decision-room-priority-card-advance-sensitive');
    expect(card.textContent).toContain('Advance-sensitive');
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
});
