// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRESIDENTIAL_COMMAND_CATEGORIES } from '../../src/ui/map/data/presidentialCategories.js';
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
