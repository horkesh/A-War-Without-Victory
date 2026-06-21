// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRESIDENTIAL_COMMAND_CATEGORIES } from '../../src/ui/map/data/presidentialCategories.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import {
  __resetDecisionRoomLensRequestForTest,
  peekRequestedDecisionRoomLens,
} from '../../src/ui/map/utils/decisionRoomLensRequest.js';

vi.mock('../../src/ui/map/store/gameStore', () => ({
  useGameStore: Object.assign(
    (selector: (state: any) => any) => selector({
      loadedGameState: null,
      osidDisplayNames: {},
    }),
    {
      getState: () => ({ loadedGameState: null, osidDisplayNames: {} }),
      setState: vi.fn(),
      subscribe: () => () => {},
    },
  ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CommandCardStrip } = await import('../../src/ui/map/components/warroom/CommandCardStrip.js');

afterEach(() => {
  cleanup();
  setLocale('en');
  __resetDecisionRoomLensRequestForTest();
});

describe('CommandCardStrip accessibility', () => {
  it('focuses the command surface dialog and closes on Escape', () => {
    const onClose = vi.fn();

    render(React.createElement(CommandCardStrip, {
      initialCategoryId: null,
      onOpenCategory: vi.fn(),
      onClose,
    }));

    const dialog = screen.getByRole('dialog', { name: 'Presidential command surface' });
    expect(dialog).toBe(document.activeElement);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('localizes BCS command-surface strip chrome and card labels', () => {
    setLocale('bcs');

    render(React.createElement(CommandCardStrip, {
      initialCategoryId: null,
      onOpenCategory: vi.fn(),
      onClose: vi.fn(),
    }));

    const dialog = screen.getByRole('dialog', { name: 'Predsjednička komandna ploča' });
    expect(dialog.textContent).toContain('Komandna ploča');
    expect(dialog.textContent).toContain('Gdje ćete usmjeriti rat?');
    expect(screen.getByRole('button', { name: 'Zatvori komandnu ploču' })).toBeTruthy();
    expect(screen.getByText('Ratno usmjerenje')).toBeTruthy();
    expect(screen.getByText('Diplomatija i pokrovitelji')).toBeTruthy();
    expect(screen.getAllByText('Djeluj').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0 na čekanju').length).toBeGreaterThan(0);

    expect(dialog.textContent).not.toContain('Command Surface');
    expect(dialog.textContent).not.toContain('Where will you direct the war?');
    expect(dialog.textContent).not.toContain('War Direction');
    expect(dialog.textContent).not.toContain('Diplomacy & Patrons');
    expect(dialog.textContent).not.toContain('Act');
    expect(dialog.textContent).not.toContain('0 pending');
  });

  it('routes every command category through the warroom host callback', () => {
    const onOpenCategory = vi.fn();

    render(React.createElement(CommandCardStrip, {
      initialCategoryId: null,
      onOpenCategory,
      onClose: vi.fn(),
    }));

    for (const category of PRESIDENTIAL_COMMAND_CATEGORIES) {
      const expectedLens = category.sources.length === 1 ? category.sources[0] : 'all';

      fireEvent.click(screen.getByTestId(`command-card-${category.id}`));

      expect(onOpenCategory).toHaveBeenLastCalledWith(expect.objectContaining({
        id: category.id,
        lens: expectedLens,
      }));
      expect(peekRequestedDecisionRoomLens()).toEqual({
        lens: expectedLens,
        commandCategoryId: category.id,
        cardId: null,
      });
    }

    expect(onOpenCategory).toHaveBeenCalledTimes(PRESIDENTIAL_COMMAND_CATEGORIES.length);
  });
});
