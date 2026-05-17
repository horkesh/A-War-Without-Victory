// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { BottomStatusStrip } from '../../src/ui/map/components/BottomStatusStrip.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
    phase: 'war',
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
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

describe('BottomStatusStrip labels', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState({
      loadedGameState: null,
      mapMode: 'political',
      devMode: false,
    });
  });

  it('does not render duplicate DEFENSE labels when the active secondary mode menu is expanded', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      mapMode: 'defense',
      devMode: false,
    });

    render(createElement(BottomStatusStrip));

    fireEvent.click(screen.getByRole('button', { name: 'Defense' }));

    expect(screen.getAllByRole('button', { name: 'Defense' })).toHaveLength(1);
  });
});
