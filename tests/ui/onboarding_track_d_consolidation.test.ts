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
import { shouldShowOnboarding } from '../../src/ui/map/components/onboarding/OnboardingOverlay.js';
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

  it('auto-mounts the tutorial onboarding deck on the in-game screen (task #77)', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    // The deck is auto-mounted again — gated on the in-game screen + a loaded
    // save. (Task #77 re-enabled the auto-mount the prior Track-D consolidation
    // removed; the deck was previously reachable only via Settings → Restart.)
    expect(source).toContain('<OnboardingOverlayWrapper />');
    // Codex #347 (P2) plus first-turn choreography: the mount gate excludes
    // the side-picker, war-start transition, blocking presidential modals, and
    // the opening brief so the HARD_MODAL deck never covers the player's
    // authored first choice or first desk handoff.
    expect(source).toContain("appScreen === 'game' && loadedGameState && !presidentialBlockingSurfaceActive && !openingBriefPending && <OnboardingOverlayWrapper />");
    expect(source).toContain('activeEventDecisionId !== null ||');
    expect(source).toContain('const openingBriefPending = loadedGameState != null && playerFaction != null && !openingBriefDismissed;');

    // The legacy first-turn orientation surfaces stay retired — no resurrection.
    expect(source).not.toContain('<CoachmarkLayer');
    expect(source).not.toContain('FirstTurnOrientationWrapper');
    expect(source).not.toContain('FirstTurnOrientationCard');
    expect(source).not.toContain('buildFirstTurnOrientation');
  });

  it('shows the deck on a fresh campaign first run but not after dismiss/reload (task #77)', () => {
    // First run: a fresh campaign (turn 0) carries no `meta.tutorial_state`, so
    // GameStateAdapter surfaces `tutorial_state` as undefined → deck shows.
    expect(shouldShowOnboarding(undefined)).toBe(true);
    expect(shouldShowOnboarding(null)).toBe(true);
    expect(shouldShowOnboarding({ dismissed: false, completed_steps: [] })).toBe(true);

    // After the player dismisses/completes the deck, the IPC handler writes
    // `dismissed: true` — the deck must NOT re-show (this same flag is what a
    // reload of the same campaign reads back, and what the adapter defaults
    // progressed Continue saves to). No new persisted field is involved.
    expect(shouldShowOnboarding({ dismissed: true, completed_steps: [] })).toBe(false);
    expect(
      shouldShowOnboarding({ dismissed: true, current_step: 'thesis', completed_steps: ['thesis'] }),
    ).toBe(false);
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

  it('re-arms the war-start intro after a fresh campaign start', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');
    const start = source.indexOf('const handleSelectFaction = async');
    const end = source.indexOf('const handleMainMenuLoadGame', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = source.slice(start, end);
    expect(block).toContain('useGameStore.getState().setPeaceWarTransitionSeen(false)');
    expect(block.indexOf('setPeaceWarTransitionSeen(false)')).toBeLessThan(block.indexOf("setAppScreen('game')"));
  });

  it('honors the Warroom fresh-campaign intro query flag', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(source).toContain("params.get('intro') === 'war_start'");
    expect(source).toContain('setPeaceWarTransitionSeen(false)');
  });

  it('defines the first-hover coachmarks and their stable localStorage keys', () => {
    expect(COACHMARKS.map((coachmark) => coachmark.id)).toEqual([
      'decision-room',
      'operation-opportunity',
      'chronicle-filter',
      'codex',
    ]);

    for (const coachmark of COACHMARKS) {
      expect(Object.prototype.hasOwnProperty.call(coachmark, 'target')).toBe(false);
      expect(coachmark.title.length).toBeGreaterThan(0);
      expect(coachmark.body.length).toBeGreaterThan(0);
      expect(getCoachmarkStorageKey(coachmark.id)).toBe(`awwv.coachmark.${coachmark.id}.seen`);
    }
  });

  it('keeps the opening presidential briefs as three scan bullets plus read-later affordance', () => {
    const source = readFileSync('src/ui/map/components/PresidentialInbox.tsx', 'utf8');

    expect(source).toContain('bulletKeys: [');
    expect(source).toContain('inbox.openingBrief.readLater');
    expect(source).not.toContain('You command through Army HQ and your corps commanders. You set strategic direction and approve operations');
  });

  it.each(['RBiH', 'RS', 'HRHB'] as const)('routes the %s opening brief primary action to the President desk', (faction) => {
    const onAction = vi.fn();
    useGameStore.setState({
      loadedGameState: minimalState({ phase: 'war', turn: 0, player_faction: faction }),
      openingBriefDismissed: false,
      osidDisplayNames: {},
    });

    render(createElement(PresidentialInbox, { onAction }));
    fireEvent.click(screen.getByRole('button', { name: /open desk/i }));

    expect(onAction).toHaveBeenCalledWith('decision_room', 'opening-brief:desk');
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
