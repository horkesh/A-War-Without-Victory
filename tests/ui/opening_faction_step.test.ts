// @vitest-environment jsdom
/**
 * Visual polish Phase E — the opening faction step.
 *
 * After "New War" the player sees the faction rail over the neutral monitoring
 * room and nothing else: no empty console box and no second "Choose your
 * faction" heading. The console returns when a faction is chosen (the dossier
 * over that faction's room) and whenever an error must be shown.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { MainMenu } from '../../src/ui/map/components/MainMenu';
import { setLocale } from '../../src/ui/map/i18n';

function renderMenu(extra: Partial<Parameters<typeof MainMenu>[0]> = {}) {
  render(createElement(MainMenu, {
    hasSave: false,
    onNewGame: vi.fn(),
    onContinue: vi.fn(),
    onLoadGame: vi.fn(),
    onSettings: vi.fn(),
    onCredits: vi.fn(),
    onQuit: vi.fn(),
    ...extra,
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
  fireEvent.click(screen.getByRole('button', { name: 'New War' }));
}

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('opening faction step', () => {
  it('describes each faction, not its army, on the rail', () => {
    renderMenu();
    const rail = screen.getByRole('complementary', { name: 'Choose your faction' });
    for (const army of ['ARBiH', 'VRS', 'HVO']) {
      expect(within(rail).queryByText(army)).toBeNull();
    }
    expect(within(rail).getByText('Firm command, scarce means.')).toBeTruthy();
    expect(within(rail).getByText('Overwhelming force, uncertain loyalty.')).toBeTruthy();
    expect(within(rail).getByText('Capable, but not your own master.')).toBeTruthy();
  });

  it('shows only the faction rail before a faction is chosen', () => {
    renderMenu();
    expect(screen.getAllByRole('heading', { name: 'Choose your faction' })).toHaveLength(1);
    expect(document.querySelector('.main-menu-opening__console')).toBeNull();
    expect(document.querySelector('.command-console-stack--standby')).toBeNull();
    expect(screen.getByRole('main').getAttribute('data-opening-scene')).toBe('neutral');
  });

  it('opens the dossier console over the chosen room once a faction is picked', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));
    expect(document.querySelector('.main-menu-opening__console')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Republic of Bosnia and Herzegovina' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Choose your faction' })).toHaveLength(1);
    expect(screen.getByRole('main').getAttribute('data-opening-scene')).toBe('RBiH');
  });

  it('still shows an error on the faction step when one is set', () => {
    renderMenu({ errorMessage: 'Campaign start failed.' });
    expect(screen.getByRole('alert').textContent).toContain('Campaign start failed');
  });
});
