// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => cleanup());

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
});
