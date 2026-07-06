// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PersonnelContent } from '../../src/ui/map/components/army_hq/PersonnelContent.js';
import { derivePanelRailState, shouldRenderTacticalDetailRails } from '../../src/ui/map/components/panelRail.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { resolveCorpsCommanderDisplay } from '../../src/ui/map/utils/officerUtils.js';
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

function makeRawFutureOfficerState() {
  return {
    meta: { turn: 0, phase: 'war', player_faction: 'RS' },
    military: {
      formations: {
        vrs_drina: { id: 'vrs_drina', name: 'Drina Corps', faction: 'RS', kind: 'corps', status: 'active' },
      },
      brigade_movement_state: {},
      named_officer_data: [
        {
          id: 'current_commander',
          name: 'Current Commander',
          faction: 'RS',
          rank: 'corps_commander',
          competence: 4,
          aggressiveness: 3,
          defensive_skill: 4,
          political_reliability: 3,
          available_from_turn: 0,
        },
        {
          id: 'future_commander',
          name: 'Future Commander',
          faction: 'RS',
          rank: 'corps_commander',
          competence: 5,
          aggressiveness: 4,
          defensive_skill: 4,
          political_reliability: 3,
          available_from_turn: 12,
        },
      ],
      named_officers: {
        current_commander: {
          officer_id: 'current_commander',
          status: 'active',
          assigned_corps_id: 'vrs_drina',
          acting_commander: false,
          turns_in_command: 0,
          battles: 0,
          victories: 0,
        },
      },
    },
    political: { political_controllers: {} },
  };
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

  it('does not list opening read-model commanders as generic reserve officers', () => {
    useGameStore.setState({ loadedGameState: makeOpeningCommanderState(), selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Command vacancies1No active commander: Empty Corps');
    expect(container.textContent).toContain('OFFICER ROSTER (0 active, 0 reserve)');
    expect(container.textContent).not.toContain('Reserve officersAvailable: Svetozar Andric');
    expect(container.textContent).not.toContain('Reserve PoolSvetozar Andric');
  });

  it('skips operation-assigned officers when projecting opening corps commanders', () => {
    const state = makeOpeningCommanderState() as LoadedGameState & { namedOfficerData: NonNullable<LoadedGameState['namedOfficerData']> };
    state.namedOfficerData.unshift({
      id: 'vrs_operation_commander',
      name: 'Operation Commander',
      faction: 'RS',
      status: 'reserve',
      rank: 'corps_commander',
      home_corps_id: 'vrs_drina',
      assigned_operation: 'Operation Drina',
      competence: 5,
      aggressiveness: 3,
      defensive_skill: 5,
      political_reliability: 3,
      pool_tier: 'starter',
    } as NonNullable<LoadedGameState['namedOfficerData']>[number]);

    expect(resolveCorpsCommanderDisplay('vrs_drina', 'RS', state)).toEqual({
      name: 'Svetozar Andric',
      acting: true,
      source: 'opening_read_model',
    });
  });

  it('does not count future officers with no mutable state in the turn-0 roster', () => {
    const loaded = parseGameState(makeRawFutureOfficerState());
    const future = loaded.namedOfficerData?.find((officer) => officer.id === 'future_commander');

    expect(future?.status).not.toBe('active');
    expect(future?.status).not.toBe('reserve');

    useGameStore.setState({ loadedGameState: loaded, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('OFFICER ROSTER (1 active, 0 reserve)');
    expect(container.textContent).toContain('Current Commander');
    expect(container.textContent).not.toContain('Future Commander');
  });

  it('excludes active-but-forming brigades from personnel strength totals', () => {
    const state = makeState();
    state.formations.push({
      id: 'vrs_forming_bde',
      name: 'Forming Brigade',
      faction: 'RS',
      kind: 'brigade',
      status: 'active',
      readiness: 'forming',
      corps_id: 'vrs_drina',
      personnel: 700,
    } as any);
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent ?? '').toMatch(/1[,.]800Total Personnel/);
    expect(container.textContent).toContain('2Active Brigades');
    expect(container.textContent ?? '').not.toMatch(/2[,.]500Total Personnel/);
    expect(container.textContent).not.toContain('3Active Brigades');
  });

  it('uses the shared player-safe municipality display for mobilization pool names', () => {
    const state = makeState();
    state.mobilizationSummary = {
      RS: {
        faction: 'RS',
        total_available: 2500,
        total_committed: 300,
        total_exhausted: 450,
        strategic_reserve: 80,
        exhaustion_pct: 32.5,
        top_pools: [
          { mun_id: 'BANJA_LUKA', available: 1500 },
        ],
      },
    } as LoadedGameState['mobilizationSummary'];
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Banja Luka');
    expect(container.textContent).not.toContain('BANJA LUKA');
  });

  it('renders sparse supply reserves and mobilization fields as unreported instead of invented zeroes', () => {
    const state = makeState();
    state.factionReserves = {
      RS: { heavyMunitions: 42 } as any,
    };
    state.mobilizationSummary = {
      RS: {
        faction: 'RS',
        total_available: 2500,
        total_committed: undefined,
        total_exhausted: 450,
        strategic_reserve: undefined,
        exhaustion_pct: undefined,
        top_pools: [
          { mun_id: 'BANJA_LUKA', available: undefined },
        ],
      } as any,
    };
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));
    const copy = container.textContent ?? '';

    expect(copy).toContain('UnreportedSupply Reserve');
    expect(copy).toContain('UnreportedCommitted');
    expect(copy).toContain('UnreportedStrategic Reserve');
    expect(copy).toContain('UnreportedExhaustion');
    expect(copy).toContain('Banja Luka');
    expect(copy).not.toContain('0Supply Reserve');
    expect(copy).not.toContain('NaN');
    expect(copy).not.toContain('undefined');
  });

  it('renders missing officer roster source as unreported instead of a clean empty roster', () => {
    const state = makeState();
    delete (state as Partial<LoadedGameState>).namedOfficerData;
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));
    const copy = container.textContent ?? '';

    expect(copy).toContain('OFFICER ROSTER (Unreported)');
    expect(copy).toContain('Officer roster source is unreported.');
    expect(copy).not.toContain('OFFICER ROSTER (0 active, 0 reserve)');
    expect(copy).not.toContain('No reserve officers available.');
    expect(copy).not.toContain('No serving commander is flagged as low loyalty.');
  });

  it('preserves explicitly reported empty officer rosters as empty, not unreported', () => {
    const state = makeState();
    state.namedOfficerData = [];
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));
    const copy = container.textContent ?? '';

    expect(copy).toContain('OFFICER ROSTER (0 active, 0 reserve)');
    expect(copy).toContain('No reserve officers available.');
    expect(copy).not.toContain('OFFICER ROSTER (Unreported)');
  });

  it('keeps explicit zero supply and mobilization values as reported zeroes', () => {
    const state = makeState();
    state.factionReserves = {
      RS: { generalSupply: 0, heavyMunitions: 42 },
    };
    state.mobilizationSummary = {
      RS: {
        faction: 'RS',
        total_available: 0,
        total_committed: 0,
        total_exhausted: 0,
        strategic_reserve: 0,
        exhaustion_pct: 0,
        top_pools: [
          { mun_id: 'BANJA_LUKA', available: 0 },
        ],
      },
    } as LoadedGameState['mobilizationSummary'];
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));
    const copy = container.textContent ?? '';

    expect(copy).toContain('0Supply Reserve');
    expect(copy).toContain('0Committed');
    expect(copy).toContain('0Strategic Reserve');
    expect(copy).toContain('0.0%Exhaustion');
    expect(copy).not.toContain('UnreportedSupply Reserve');
  });

  it('renders HQ-assigned brigades and routes them to Army HQ drilldown', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RS',
      selectedArmyHqId: null,
      selectedCorpsId: null,
      selectedFormationId: null,
      armyHQOpen: true,
    });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Main Staff VRS');
    expect(container.textContent).toContain('HQ Officer');
    expect(container.textContent).toContain('Corps commander - Main Staff VRS');

    const hqBrigadeLink = screen.getByRole('button', { name: /Guard Brigade/i });
    expect(hqBrigadeLink.getAttribute('data-testid')).toBe('personnel-orbat-brigade-link');
    expect(hqBrigadeLink.getAttribute('data-command-id')).toBe('vrs_main_staff');
    expect(hqBrigadeLink.getAttribute('data-command-kind')).toBe('army_hq');
    expect(hqBrigadeLink.getAttribute('data-formation-id')).toBe('vrs_guard_bde');

    fireEvent.click(hqBrigadeLink);

    const store = useGameStore.getState();
    expect(store.selectedArmyHqId).toBe('vrs_main_staff');
    expect(store.selectedCorpsId).toBeNull();
    expect(store.selectedFormationId).toBe('vrs_guard_bde');
    expect(store.armyHQOpen).toBe(false);
    expect(derivePanelRailState(store)).toEqual({
      panel: 'formation',
      trail: [{ panel: 'army_reserve', id: 'vrs_main_staff' }],
    });
    expect(shouldRenderTacticalDetailRails({
      operationsPanelOpen: store.isOperationsPanelOpen,
      armyHQOpen: store.armyHQOpen,
      codexOpen: store.codexOpen,
      chronicleOpen: store.chronicleOpen,
    })).toBe(true);
  });

  it('labels HQ reserve brigades and keeps unreported personnel out of exact totals', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => formation.id === 'vrs_guard_bde'
      ? { ...formation, personnel: undefined }
      : formation) as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state, selectedArmyId: 'RS' });

    const { container } = render(React.createElement(PersonnelContent));

    expect(container.textContent).toContain('Main Staff reserve/security');
    expect(container.textContent).toContain('1 brigades - Unreported');
    const hqBrigadeLink = screen.getByRole('button', { name: /Guard Brigade/i });
    expect(hqBrigadeLink.textContent).toContain('Main Staff reserve/security');
    expect(hqBrigadeLink.textContent).toContain('Unreported');
    expect(container.textContent).not.toContain('1 brigades - 0');
  });
});
