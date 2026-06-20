// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      { id: 'vrs_main_staff', name: 'Main Staff VRS', faction: 'RS', kind: 'army_hq', status: 'active' },
      { id: 'vrs_empty', name: 'Empty Corps', faction: 'RS', kind: 'corps', status: 'active' },
      { id: 'vrs_bde_1', name: '1st Brigade', faction: 'RS', kind: 'brigade', status: 'active', corps_id: 'vrs_drina', personnel: 1000 },
      { id: 'vrs_guard_bde', name: 'Guard Brigade', faction: 'RS', kind: 'brigade', status: 'active', corps_id: 'vrs_main_staff', personnel: 800 },
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
        id: 'officer_hq',
        name: 'HQ Officer',
        faction: 'RS',
        status: 'active',
        rank: 'corps_commander',
        assigned_corps_id: 'vrs_main_staff',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 5,
        political_reliability: 3,
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

function makeOpeningCommanderState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    formations: [
      { id: 'vrs_drina', name: 'Drina Corps', faction: 'RS', kind: 'corps', status: 'active' },
      { id: 'jna_herzegovina_command', name: 'JNA Herzegovina Command', faction: 'RS', kind: 'corps_asset', status: 'active' },
      { id: 'vrs_empty', name: 'Empty Corps', faction: 'RS', kind: 'corps', status: 'active' },
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
        id: 'vrs_andric',
        name: 'Svetozar Andric',
        faction: 'RS',
        status: 'reserve',
        rank: 'corps_commander',
        home_corps_id: 'vrs_drina',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 4,
        political_reliability: 3,
      },
    ],
    namedOfficerStateById: {
      vrs_andric: {
        officer_id: 'vrs_andric',
        status: 'reserve',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
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

  it('renders officer rank labels without raw rank ids', () => {
    useGameStore.setState({ loadedGameState: makeState(), selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Corps commander');
    expect(container.textContent).not.toContain('corps_commander');
    expect(container.textContent).not.toContain('corps commander');
  });

  it('renders tactical commander rank labels without raw ids or generic fallbacks', () => {
    const state = makeState() as LoadedGameState & { namedOfficerData: NonNullable<LoadedGameState['namedOfficerData']> };
    state.namedOfficerData.push({
      id: 'officer_3',
      name: 'Tactical Officer',
      faction: 'RS',
      status: 'active',
      rank: 'tactical_commander',
      competence: 3,
      aggressiveness: 4,
      defensive_skill: 3,
      political_reliability: 3,
      origin: 'test',
      assigned_corps_id: null,
      acting_commander: false,
      turns_in_command: 0,
      battles: 0,
      victories: 0,
    });
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Tactical commander');
    expect(container.textContent).not.toContain('tactical_commander');
    expect(container.textContent).not.toContain('Tactical OfficerStaff officer');
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

  it('does not count opening read-model or synthetic command displays as command vacancies', () => {
    useGameStore.setState({ loadedGameState: makeOpeningCommanderState(), selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Command vacancies1No active commander: Empty Corps');
    expect(container.textContent).not.toContain('Command vacancies3');
    expect(container.textContent).not.toContain('No active commander: JNA Herzegovina Command, Drina Corps, Empty Corps');
  });

  it('renders HQ-assigned brigades and routes them to Army HQ drilldown', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RS',
      selectedArmyHqId: null,
      selectedCorpsId: null,
      selectedFormationId: null,
    });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Main Staff VRS');
    expect(container.textContent).toContain('HQ Officer');
    expect(container.textContent).toContain('Corps commander - Main Staff VRS');

    fireEvent.click(screen.getByRole('button', { name: /Guard Brigade/i }));

    const store = useGameStore.getState();
    expect(store.selectedArmyHqId).toBe('vrs_main_staff');
    expect(store.selectedCorpsId).toBeNull();
    expect(store.selectedFormationId).toBe('vrs_guard_bde');
  });
});
