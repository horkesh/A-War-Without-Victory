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
 *   (2) Keep the deck hidden while the side-picker is open. The mount gate in
 *       `App.tsx` excludes `sidePickerOpen` so the HARD_MODAL deck never covers
 *       `SidePickerOverlay`; the deck defers until a side is chosen.
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

  describe('(2) side-picker mount gate', () => {
    it('App mount gate excludes sidePickerOpen so the deck cannot cover the faction picker', () => {
      const source = readFileSync('src/ui/map/App.tsx', 'utf8');
      // The deck mounts only on the in-game screen, with a loaded save, AND the
      // side picker closed.
      expect(source).toContain(
        "appScreen === 'game' && loadedGameState && !sidePickerOpen && <OnboardingOverlayWrapper />",
      );
    });

    it('OnboardingOverlayWrapper passes a null bridge when IPC is unavailable (mirrors SettingsScreen)', () => {
      const source = readFileSync('src/ui/map/App.tsx', 'utf8');
      // Codex #347 (1): the wrapper gates the bridge on ipc.isAvailable so the
      // overlay uses its in-memory preview fallback in browser/dev builds.
      expect(source).toContain('ipc.isAvailable');
    });
  });
});
