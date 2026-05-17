// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import {
  COACHMARKS,
  getCoachmarkStorageKey,
} from '../../src/ui/map/components/CoachmarkLayer.js';
import { PresidentialInbox } from '../../src/ui/map/components/PresidentialInbox.js';
import {
  shouldMarkPeaceWarTransitionSeenOnLoad,
  shouldShowPeaceWarTransition,
} from '../../src/ui/map/data/peaceWarTransitionGate.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function minimalState(overrides: Partial<LoadedGameState>): LoadedGameState {
  return {
    label: `Turn ${overrides.turn ?? 0}`,
    turn: overrides.turn ?? 0,
    phase: overrides.phase ?? 'peace',
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
    latestTurnSummary: null,
    ...overrides,
  } as LoadedGameState;
}

describe('Track D onboarding consolidation', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState({
      loadedGameState: null,
      openingBriefDismissed: false,
      osidDisplayNames: {},
    });
    vi.restoreAllMocks();
  });

  it('mounts onboarding through OnboardingOverlay only, without the legacy first-turn overlay', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(source).toContain('<OnboardingOverlayWrapper />');
    expect(source).not.toContain('FirstTurnOrientationWrapper');
    expect(source).not.toContain('FirstTurnOrientationCard');
    expect(source).not.toContain('buildFirstTurnOrientation');
  });

  it('arms the peace-war transition overlay only for an actual peace-to-war load transition', () => {
    const peace = minimalState({ phase: 'peace', turn: 9 });
    const firstWar = minimalState({ phase: 'war', turn: 10 });
    const laterWar = minimalState({ phase: 'war', turn: 40 });

    expect(shouldMarkPeaceWarTransitionSeenOnLoad(null, firstWar)).toBe(true);
    expect(shouldMarkPeaceWarTransitionSeenOnLoad(laterWar, firstWar)).toBe(true);
    expect(shouldMarkPeaceWarTransitionSeenOnLoad(peace, firstWar)).toBe(false);
    expect(shouldMarkPeaceWarTransitionSeenOnLoad(peace, peace)).toBe(false);

    expect(shouldShowPeaceWarTransition(firstWar, false)).toBe(true);
    expect(shouldShowPeaceWarTransition(firstWar, true)).toBe(false);
    expect(shouldShowPeaceWarTransition(peace, false)).toBe(false);
  });

  it('defines the first-hover coachmarks and their stable localStorage keys', () => {
    expect(COACHMARKS.map((coachmark) => coachmark.id)).toEqual([
      'decision-room',
      'operation-opportunity',
      'chronicle-filter',
      'codex',
    ]);

    for (const coachmark of COACHMARKS) {
      expect(coachmark.target).toBe(`[data-coachmark-id="${coachmark.id}"]`);
      expect(coachmark.title.length).toBeGreaterThan(0);
      expect(coachmark.body.length).toBeGreaterThan(0);
      expect(getCoachmarkStorageKey(coachmark.id)).toBe(`awwv.coachmark.${coachmark.id}.seen`);
    }
  });

  it('keeps the opening presidential briefs as three scan bullets plus read-later affordance', () => {
    const source = readFileSync('src/ui/map/components/PresidentialInbox.tsx', 'utf8');

    expect(source).toContain('bullets: [');
    expect(source).toContain('Read later');
    expect(source).not.toContain('You command through Army HQ and your corps commanders. You set strategic direction and approve operations');
  });

  it.each(['RBiH', 'RS', 'HRHB'] as const)('routes the %s opening brief primary action to the Decision Room', (faction) => {
    const onAction = vi.fn();
    useGameStore.setState({
      loadedGameState: minimalState({ phase: 'war', turn: 0, player_faction: faction }),
      openingBriefDismissed: false,
      osidDisplayNames: {},
    });

    render(createElement(PresidentialInbox, { onAction }));
    fireEvent.click(screen.getByRole('button', { name: /open decision room/i }));

    expect(onAction).toHaveBeenCalledWith('army_hq_briefing', 'opening-brief:decision-room');
    expect(useGameStore.getState().openingBriefDismissed).toBe(true);
  });

  it.each(['RBiH', 'RS', 'HRHB'] as const)('keeps the %s opening brief secondary action as read-later only', (faction) => {
    const onAction = vi.fn();
    useGameStore.setState({
      loadedGameState: minimalState({ phase: 'war', turn: 0, player_faction: faction }),
      openingBriefDismissed: false,
      osidDisplayNames: {},
    });

    render(createElement(PresidentialInbox, { onAction }));
    fireEvent.click(screen.getByRole('button', { name: /read later/i }));

    expect(onAction).not.toHaveBeenCalled();
    expect(useGameStore.getState().openingBriefDismissed).toBe(true);
  });
});
