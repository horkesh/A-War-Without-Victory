// @vitest-environment jsdom

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommanderSelectionModal } from '../../src/ui/map/components/CommanderSelectionModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeCommanderSelectionState(): LoadedGameState {
  return {
    label: 'Commander selection copy test',
    turn: 12,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'arbih_1st_corps',
        faction: 'RBiH',
        name: '1st Corps',
        kind: 'corps',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
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
    activeOperations: [],
    operations: [
      {
        corps_id: 'arbih_1st_corps',
        corps_name: '1st Corps',
        faction: 'RBiH',
        name: 'cmd_arbih_1st_corps_t12',
        display_name: 'Operation North Bridge',
        type: 'sector_attack',
        phase: 'planning',
        participating_brigade_count: 0,
        started_turn: 12,
      },
    ],
    namedOfficerData: [
      {
        id: 'available',
        name: 'Available Commander',
        faction: 'RBiH',
        rank: 'corps_commander',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        origin: 'military',
        status: 'active',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
      },
      {
        id: 'assigned',
        name: 'Assigned Commander',
        faction: 'RBiH',
        rank: 'corps_commander',
        competence: 3,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        origin: 'military',
        status: 'active',
        assigned_corps_id: null,
        assigned_operation: 'cmd_arbih_1st_corps_t12',
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
      },
    ],
  } as LoadedGameState;
}

describe('CommanderSelectionModal player-facing operation copy', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeCommanderSelectionState(),
      commanderSelectionContext: {
        corpsId: 'arbih_1st_corps',
        operationName: 'cmd_arbih_1st_corps_t12',
      },
    });
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('uses display names in the title and unavailable-officer reason', () => {
    const { container } = render(React.createElement(CommanderSelectionModal, {
      isOpen: true,
      onClose: () => undefined,
    }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Operation North Bridge - 1st Corps');
    expect(copy).toContain('ASSIGNED: Operation North Bridge');
    expect(copy).not.toContain('cmd_arbih_1st_corps_t12');
  });
});
