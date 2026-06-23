// @vitest-environment jsdom

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArmyReservePanel } from '../../src/ui/map/components/ArmyReservePanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeReserveState(onLoan: boolean): LoadedGameState {
  return {
    label: 'Army reserve elite commander test',
    turn: 16,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'arbih_general_staff',
        faction: 'RBiH',
        name: 'General Staff ARBiH',
        kind: 'army_hq',
        readiness: 'ready',
        cohesion: 75,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
      },
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
      {
        id: 'arbih_guards_brigade',
        faction: 'RBiH',
        name: 'Guards Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 64,
        fatigue: 3,
        status: 'active',
        createdTurn: 12,
        tags: [],
        corps_id: 'arbih_general_staff',
        personnel: 480,
        eliteLoanState: {
          on_loan: onLoan,
          loaned_to_corps: onLoan ? 'arbih_1st_corps' : null,
          loan_start_turn: onLoan ? 12 : null,
          turns_deployed: onLoan ? 4 : 0,
          in_cooldown: false,
          permanently_degraded: false,
          current_episode_id: onLoan ? 1 : null,
          base_osid: 'op:visoko:visoko_2',
        },
        eliteCommander: {
          name: 'Dzevad Rado',
          competence: 4,
          aggressiveness: 3,
          defensive_skill: 3,
          origin: 'military',
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
    activeOperations: [],
  } as LoadedGameState;
}

describe('ArmyReservePanel elite commander identity', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeReserveState(false),
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
      osidDisplayNames: { 'op:visoko:visoko_2': 'Visoko' },
    });
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('shows elite commander identity in the reserve pool without raw origin ids', () => {
    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Elite commander');
    expect(copy).toContain('Dzevad Rado');
    expect(copy).toContain('Command 4');
    expect(copy).toContain('Tempo 3');
    expect(copy).toContain('Defense 3');
    expect(copy).not.toMatch(/\borigin\b|\bmilitary\b/i);
  });

  it('shows elite commander identity in active loan snapshots', () => {
    useGameStore.setState({
      loadedGameState: makeReserveState(true),
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Active Loans (1)');
    expect(copy).toContain('Elite commander');
    expect(copy).toContain('Dzevad Rado');
  });
});
