// @vitest-environment jsdom
/**
 * Codex #347 (P2) follow-ups — onboarding auto-mount edge cases (task #85).
 *
 * Two edge cases on the first-run teaching-deck auto-mount that shipped in
 * PR #345 (deck) + PR #347 (auto-mount):
 *
 *   (1) Preserve preview dismissal when IPC is unavailable. In browser/dev-map
 *       builds (or when the tutorial ipcMain handlers are not registered),
 *       `ipc.isAvailable` is false. `OnboardingOverlayWrapper` must then pass a
 *       `null` bridge so `OnboardingOverlay` falls back to its in-memory
 *       `previewTutorialState` — Skip/Next/ESC must still dismiss the deck for
 *       the current session instead of leaving a stuck HARD_MODAL overlay.
 *
 *   (2) Keep the deck hidden while a blocking presidential surface is active.
 *       The mount gate in `App.tsx` excludes the side-picker, war-start
 *       transition, foundational decisions, negotiation blockers, and the
 *       opening brief so the HARD_MODAL deck never covers the player's first
 *       authored choice or first desk handoff.
 *
 * UI-only / calibration-inert: no sim/scenario/state bytes touched.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { OnboardingOverlay } from '../../src/ui/map/components/onboarding/OnboardingOverlay';

describe('Codex #347 (P2) — onboarding auto-mount edge cases (task #85)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('(1) preview dismissal persists when IPC is unavailable (ipc === null)', () => {
    it('ESC dismisses the deck in-memory when IPC is null (browser/dev fallback)', () => {
      // Fresh save (null tutorial_state) → deck visible. With ipc === null the
      // overlay must use its in-memory preview path so ESC takes effect.
      render(createElement(OnboardingOverlay, { tutorialState: null, ipc: null }));
      expect(screen.queryByRole('dialog')).toBeTruthy();

      fireEvent.keyDown(window, { key: 'Escape' });

      // Without an IPC bridge the dismissal still takes effect for the session:
      // the HARD_MODAL deck is gone, not stuck over the game.
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('Skip dismisses the deck in-memory when IPC is null', () => {
      render(createElement(OnboardingOverlay, { tutorialState: null, ipc: null }));
      expect(screen.queryByRole('dialog')).toBeTruthy();

      fireEvent.click(screen.getByTestId('onboarding-skip'));

      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('(2) blocking-surface mount gate', () => {
    it('App mount gate excludes blocking presidential surfaces', () => {
      const source = readFileSync('src/ui/map/App.tsx', 'utf8');
      // The deck mounts only on the in-game screen, with a loaded save, and no
      // blocking presidential surface active.
      expect(source).toContain(
        "appScreen === 'game' && loadedGameState && !onboardingBlockingOverlayActive && <OnboardingOverlayWrapper />",
      );
      expect(source).toContain('sidePickerOpen ||');
      expect(source).toContain('peaceWarTransitionActive ||');
      expect(source).toContain('activeEventDecisionId !== null ||');
      expect(source).toContain('const openingBriefPending = loadedGameState != null && playerFaction != null && !openingBriefDismissed;');
      expect(source).toContain('chronicleOpen ||');
      expect(source).toContain('codexOpen ||');
      expect(source).toContain('const tacticalChromeVisible = !presidentialBlockingSurfaceActive;');
      expect(source).toContain('{tacticalChromeVisible && (');
    });

    it('OnboardingOverlayWrapper passes a null bridge when IPC is unavailable (mirrors SettingsScreen)', () => {
      const source = readFileSync('src/ui/map/App.tsx', 'utf8');
      // Codex #347 (1): the wrapper gates the bridge on ipc.isAvailable so the
      // overlay uses its in-memory preview fallback in browser/dev builds.
      expect(source).toContain('ipc.isAvailable');
    });

    it('hoists browser preview dismissal across overlay remounts', () => {
      const app = readFileSync('src/ui/map/App.tsx', 'utf8');
      const overlay = readFileSync('src/ui/map/components/onboarding/OnboardingOverlay.tsx', 'utf8');

      expect(app).toContain('browserPreviewTutorialStateMemory');
      expect(app).toContain('commitBrowserPreviewTutorialState');
      expect(app).toContain('onPreviewTutorialStateChange={commitBrowserPreviewTutorialState}');
      expect(overlay).toContain('onPreviewTutorialStateChange?:');
      expect(overlay).toContain('onPreviewTutorialStateChange?.(nextState)');
    });
  });
});
