// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArmyReservePanel } from '../../src/ui/map/components/ArmyReservePanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'arbih_main_staff',
        faction: 'RBiH',
        name: 'ARBiH Main Staff',
        kind: 'army_hq',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'arbih_guard',
        faction: 'RBiH',
        name: 'Guard Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 1000,
        corps_id: 'arbih_main_staff',
        eliteLoanState: {
          on_loan: false,
          in_cooldown: false,
          permanently_degraded: false,
          turns_deployed: 0,
          base_osid: 'op:sarajevo:centar',
        },
      },
    ],
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
  } as unknown as LoadedGameState;
}

describe('ArmyReservePanel hook order', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
    vi.restoreAllMocks();
  });

  it('keeps a stable hook order when the panel opens and closes around loaded state', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyHqId: 'arbih_main_staff',
    });
    rerender(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    useGameStore.setState({
      selectedArmyHqId: null,
      selectedFormationId: null,
    });
    rerender(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    expect(consoleError.mock.calls.flat().join('\n')).not.toMatch(/Rendered more hooks|Rendered fewer hooks|change in the order of Hooks/i);
  });
});
