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
      { id: 'vrs_empty', name: 'Empty Corps', faction: 'RS', kind: 'corps', status: 'active' },
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
        political_reliability: 2,
      },
      {
        id: 'officer_2',
        name: 'Reserve Officer',
        faction: 'RS',
        status: 'reserve',
        rank: 'corps_commander',
        competence: 3,
        aggressiveness: 2,
        defensive_skill: 4,
      },
    ],
    mobilizationSummary: {
      RS: {
        total_available: 1200,
        total_committed: 300,
        total_exhausted: 450,
        strategic_reserve: 80,
        exhaustion_pct: 32.5,
        top_pools: [],
      },
    },
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

  it('starts with a presidential personnel dossier before raw ORBAT detail', () => {
    useGameStore.setState({ loadedGameState: makeState(), selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('PERSONNEL COMMAND DOSSIER');
    expect(container.textContent).toContain('Command vacancies');
    expect(container.textContent).toContain('No active commander: Empty Corps');
    expect(container.textContent).toContain('Low-loyalty commanders');
    expect(container.textContent).toContain('Review before trusting: Staff Officer');
    expect(container.textContent).toContain('Reserve officers');
    expect(container.textContent).toContain('Available: Reserve Officer');
    expect(container.textContent).toContain('Mobilization strain');
    expect(container.textContent).toContain('450 exhausted pool personnel.');
  });
});
