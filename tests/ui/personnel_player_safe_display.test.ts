// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PersonnelContent } from '../../src/ui/map/components/army_hq/PersonnelContent.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
    phase: 'war',
    formations: [
      { id: 'vrs_drina', name: 'Drina Corps', faction: 'RS', kind: 'corps', status: 'active' },
      { id: 'vrs_bde_1', name: '1st Brigade', faction: 'RS', kind: 'brigade', status: 'active', corps_id: 'vrs_drina', personnel: 1000 },
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
    player_faction: 'RS',
    namedOfficerData: [
      {
        id: 'officer_1',
        name: 'Staff Officer',
        faction: 'RS',
        status: 'active',
        rank: 'corps_commander',
        assigned_corps_id: 'vrs_drina',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 5,
      },
    ],
  } as unknown as LoadedGameState;
}

afterEach(() => {
  cleanup();
  useGameStore.setState({ loadedGameState: null, selectedArmyId: null });
});

describe('PersonnelContent player-facing display', () => {
  it('uses labeled officer qualities instead of raw C/A stat abbreviations', () => {
    useGameStore.setState({ loadedGameState: makeState(), selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Command');
    expect(container.textContent).toContain('Initiative');
    expect(container.textContent).not.toMatch(/\bC:\d/);
    expect(container.textContent).not.toMatch(/\bA:\d/);
  });
});
