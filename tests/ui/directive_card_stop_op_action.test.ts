// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DirectiveCard } from '../../src/ui/map/components/army_hq/DirectiveCard';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { PresidentialDecisionRoomDirective } from '../../src/ui/map/data/presidentialDecisionRoom';

const baseGameState = {
  turn: 12,
  phase: 'war',
  formations: [
    { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps' },
  ],
  commandAuthority: { current: 60, max: 100, spentThisTurn: 0, recoveryPerTurn: 2 },
  namedOfficerData: [],
} as unknown as LoadedGameState;

const stopOpDirective: PresidentialDecisionRoomDirective = {
  lever: 'stop_op',
  corpsId: 'arbih_3rd_corps',
  cost: 25,
  payload: { corpsId: 'arbih_3rd_corps', opName: 'Operation Breakthrough' },
};

function installIpc(stageOpHaltOrder = vi.fn(async () => ({ ok: true }))) {
  Object.defineProperty(window, 'awwv', {
    configurable: true,
    value: { stageOpHaltOrder },
  });
  return { stageOpHaltOrder };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'awwv');
  vi.restoreAllMocks();
});

describe('DirectiveCard stop-op action host', () => {
  it('stages a halt directive and shows a next-turn receipt', async () => {
    const { stageOpHaltOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: stopOpDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Issue (25)' }));

    await waitFor(() => {
      expect(stageOpHaltOrder).toHaveBeenCalledWith({
        corpsId: 'arbih_3rd_corps',
        opName: 'Operation Breakthrough',
      });
    });
    expect((await screen.findByRole('status', { name: 'Directive receipt' })).textContent).toContain(
      'Directive staged for next turn',
    );
  });

  it('offers a cancel path that does not stage a halt', () => {
    const { stageOpHaltOrder } = installIpc();

    render(React.createElement(DirectiveCard, { directive: stopOpDirective, gameState: baseGameState }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel directive' }));

    expect(stageOpHaltOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Directive receipt' }).textContent).toContain(
      'Directive cancelled',
    );
  });
});
