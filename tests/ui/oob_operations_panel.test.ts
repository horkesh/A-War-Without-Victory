// @vitest-environment jsdom
import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { OperationsPanel } from '../../src/ui/map/components/OperationsPanel.js';
import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState, NamedOfficerView, OperationView } from '../../src/ui/map/data/types.js';

const CORPS_ID = 'arbih_3rd_corps';
const RAW_OP_NAME = 'operation_breakthrough_test_slug';
const DISPLAY_OP_NAME = 'Operation Breakthrough';

function officer(overrides: Partial<NamedOfficerView>): NamedOfficerView {
  return {
    id: 'officer',
    name: 'Officer',
    faction: 'RBiH',
    rank: 'corps_commander',
    competence: 3,
    aggressiveness: 3,
    defensive_skill: 3,
    political_reliability: 3,
    origin: 'local',
    status: 'active',
    battles: 0,
    victories: 0,
    turns_in_command: 4,
    assigned_corps_id: CORPS_ID,
    acting_commander: false,
    ...overrides,
  } as NamedOfficerView;
}

function operation(): OperationView {
  return {
    corps_id: CORPS_ID,
    corps_name: '3rd Corps',
    faction: 'RBiH',
    name: RAW_OP_NAME,
    display_name: DISPLAY_OP_NAME,
    type: 'sector_attack',
    phase: 'execution',
    objectives: ['op:test:objective'],
    current_objective_index: 0,
    participating_brigade_count: 1,
    participating_brigade_ids: ['arbih_brigade'],
    started_turn: 3,
    commander_officer_id: 'operation_commander',
  };
}

function loadedState(): LoadedGameState {
  return {
    label: 'test',
    turn: 8,
    phase: 'war',
    formations: [
      {
        id: CORPS_ID,
        faction: 'RBiH',
        name: '3rd Corps',
        kind: 'corps',
        readiness: 'ready',
        status: 'active',
        cohesion: 75,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 9000,
      },
      {
        id: 'arbih_brigade',
        faction: 'RBiH',
        name: '1st Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 1200,
        corps_id: CORPS_ID,
        location_osid: 'op:test:objective',
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
    player_faction: 'RBiH',
    operations: [operation()],
    corpsFrontSectors: [],
    namedOfficerData: [
      officer({ id: 'corps_commander', name: 'Corps Commander', assigned_corps_id: CORPS_ID }),
      officer({ id: 'operation_commander', name: 'Reserve Leader', assigned_corps_id: null }),
    ],
    namedOfficerStateById: {
      corps_commander: {
        officer_id: 'corps_commander',
        status: 'active',
        assigned_corps_id: CORPS_ID,
        acting_commander: false,
        turns_in_command: 4,
        battles: 0,
        victories: 0,
      },
      operation_commander: {
        officer_id: 'operation_commander',
        status: 'active',
        assigned_corps_id: null,
        acting_commander: false,
        turns_in_command: 4,
        battles: 0,
        victories: 0,
      },
    },
  } as LoadedGameState;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: loadedState(),
    isOperationsPanelOpen: true,
    selectedOperationKey: `${CORPS_ID}|${RAW_OP_NAME}`,
    osidDisplayNames: { 'op:test:objective': 'Objective Ridge' },
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('OOB and operations panel operation labels', () => {
  it('renders operation history names through the player-safe operation display helper', () => {
    const source = readFileSync('src/ui/map/components/OperationHistoryPanel.tsx', 'utf8');

    expect(source).toContain('function getOperationDisplayName');
    expect(source).toContain('operationDisplayName?: string | null');
    expect(source).toContain("getPlayerSafeOperationName(operationName, corpsId, 'Operation')");
    expect(source).not.toContain('>{op.operation_name}</span>');
  });

  it('routes standalone map and reserve-HQ selection through normalized cleanup setters', () => {
    const mapSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const oobSource = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');

    expect(mapSource).toContain('useGameStore.getState().setSelectedFormationId(formationId)');
    expect(oobSource).toContain('const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId)');
    expect(oobSource).toContain('onClick={() => setSelectedArmyHqId(hqId)}');
    expect(oobSource).not.toContain('useGameStore.setState({ selectedArmyHqId: hqId');
  });

  it('renders the operation commander rather than the parent corps commander', () => {
    const { container } = render(createElement(OperationsPanel));

    expect(screen.getByText(/Reserve Leader/)).toBeTruthy();
    expect(container.textContent).not.toContain('Corps Commander');
  });

  it('renders operation phase age as duration copy instead of raw turn labels', () => {
    const { container } = render(createElement(OperationsPanel));

    expect(container.textContent).toContain('6 weeks in phase');
    expect(container.textContent).not.toContain('Turn 6');
  });

  it('renders player-safe operation display names without the raw operation slug on OOB cards', () => {
    const { container } = render(createElement(OOBSidebar));

    const corpsCard = screen
      .getAllByText('Corps Commander')
      .map((element) => element.closest('[role="button"]'))
      .find(Boolean);
    expect(corpsCard).toBeTruthy();
    fireEvent.click(corpsCard!);

    expect(screen.getByText(DISPLAY_OP_NAME)).toBeTruthy();
    expect(container.textContent).not.toContain(RAW_OP_NAME);
  });
});
