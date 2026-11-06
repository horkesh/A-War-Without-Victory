// @vitest-environment jsdom
/**
 * Visual polish Phase B — diegetic warroom chrome.
 *
 * The inbox can be mounted as a dossier on the desk (lower, narrower, with a
 * folder tab) instead of a full-height panel; the warroom navigation reads as a
 * brass rail; command cards show their art first and reveal the blurb on hover
 * or focus. Buttons, labels, aria names and queue logic are unchanged.
 */
import React, { createElement } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { PRESIDENTIAL_COMMAND_CATEGORIES } from '../../src/ui/map/data/presidentialCategories.js';

let storeState: Record<string, any> = {
  loadedGameState: null,
  osidDisplayNames: {},
  openingBriefDismissed: false,
  setOpeningBriefDismissed: vi.fn(),
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
  useGameStore: Object.assign(
    (selector: (state: any) => any) => selector(storeState),
    {
      getState: () => storeState,
      setState: (partial: any) => { Object.assign(storeState, partial); },
      subscribe: () => () => {},
    },
  ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { PresidentialInbox, DOSSIER_LAYOUT } = await import('../../src/ui/map/components/PresidentialInbox.js');
// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { WarroomShellLayer } = await import('../../src/ui/map/components/warroom/WarroomShellLayer.js');
// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CommandCardStrip } = await import('../../src/ui/map/components/warroom/CommandCardStrip.js');

beforeEach(() => {
  storeState = {
    loadedGameState: null,
    osidDisplayNames: {},
    openingBriefDismissed: false,
    setOpeningBriefDismissed: vi.fn(),
  };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setLocale('en');
});

describe('presidential inbox materials', () => {
  it('mounts as the full-height panel by default', () => {
    render(createElement(PresidentialInbox, { onAction: vi.fn() }));
    const root = screen.getByTestId('presidential-inbox');
    expect(root.getAttribute('data-material')).toBeNull();
    expect(root.style.width).not.toBe(DOSSIER_LAYOUT.width);
    expect(screen.queryByTestId('presidential-inbox-tab')).toBeNull();
  });

  it('mounts as a dossier on the desk when asked: lower, narrower, with a folder tab', () => {
    render(createElement(PresidentialInbox, { onAction: vi.fn(), material: 'dossier' }));
    const root = screen.getByTestId('presidential-inbox');
    expect(root.getAttribute('data-material')).toBe('dossier');
    expect(root.style.width).toBe(DOSSIER_LAYOUT.width);
    expect(root.style.top).toBe(DOSSIER_LAYOUT.top);
    const tab = screen.getByTestId('presidential-inbox-tab');
    expect(tab.textContent).toMatch(/presidential inbox/i);
    // The inbox title still heads the panel for screen readers and the badge count.
    expect(within(root).getAllByText(/presidential inbox/i).length).toBeGreaterThan(0);
  });
});

describe('warroom navigation rail', () => {
  it('renders the accepted toolbar entries on a brass rail', () => {
    storeState = { ...storeState, loadedGameState: { player_faction: 'RBiH', metadata: { date: 'April 1993' } } };
    render(createElement(WarroomShellLayer, { onNavigate: vi.fn(), onOpenSidePicker: vi.fn() }));
    const nav = screen.getByRole('navigation', { name: 'Warroom navigation' });
    expect(nav.getAttribute('data-material')).toBe('rail');
    for (const label of ["President's Desk", 'Command Surface', 'War Map', 'Advance']) {
      expect(within(nav).getByRole('button', { name: label })).toBeTruthy();
    }
  });
});

describe('command cards are art first', () => {
  it('keeps the blurb in the card but reveals it only on hover or focus', () => {
    render(React.createElement(CommandCardStrip, {
      initialCategoryId: null,
      onOpenCategory: vi.fn(),
      onClose: vi.fn(),
    }));
    for (const category of PRESIDENTIAL_COMMAND_CATEGORIES) {
      const card = screen.getByTestId(`command-card-${category.id}`);
      expect(card.className).toMatch(/\bgroup\b/);
      const blurb = screen.getByTestId(`command-card-blurb-${category.id}`);
      expect(blurb.className).toMatch(/opacity-0/);
      expect(blurb.className).toMatch(/group-(hover|focus-visible):opacity-100/);
      expect(blurb.textContent?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
