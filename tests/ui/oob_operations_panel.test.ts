// @vitest-environment jsdom
import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { OperationsPanel } from '../../src/ui/map/components/OperationsPanel.js';
import { OperationBriefingModal } from '../../src/ui/map/components/OperationBriefingModal.js';
import { OperationsSection } from '../../src/ui/map/components/army_hq/OperationsSection.js';
import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
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

function setOperationPatch(patch: Partial<OperationView>) {
  useGameStore.setState({
    loadedGameState: {
      ...loadedState(),
      operations: [{ ...operation(), ...patch }],
    } as LoadedGameState,
    selectedOperationKey: `${CORPS_ID}|${patch.name ?? RAW_OP_NAME}`,
  });
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

  it('routes standalone map and reserve-HQ selection through normalized context setters', () => {
    const mapSource = readFileSync('src/ui/map/map/MapContainer.tsx', 'utf8');
    const oobSource = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');

    expect(mapSource).toContain('inspectFormationFromMap(id, props)');
    expect(mapSource).toContain('resolveMapFormationInspectionTarget(formationId, properties, store.loadedGameState)');
    expect(mapSource).not.toContain('useGameStore.getState().setSelectedFormationId(formationId)');
    expect(oobSource).toContain('const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId)');
    expect(oobSource).toContain('onClick={() => setSelectedArmyHqId(hqId)}');
    expect(oobSource).not.toContain('useGameStore.setState({ selectedArmyHqId: hqId');
  });

  it('renders the operation commander rather than the parent corps commander', () => {
    const { container } = render(createElement(OperationsPanel));

    expect(screen.getByText(/Reserve Leader/)).toBeTruthy();
    expect(container.textContent).not.toContain('Corps Commander');
  });

  it('renders absent operation commanders as explicitly unassigned', () => {
    setOperationPatch({ commander_officer_id: undefined });

    const { container } = render(createElement(OperationsPanel));

    expect(container.textContent).toContain('Commander unassigned');
  });

  it('renders unresolved operation commander ids as explicitly unreported', () => {
    setOperationPatch({ commander_officer_id: 'missing_commander' });

    const { container } = render(createElement(OperationsPanel));

    expect(container.textContent).toContain('Commander record unreported');
  });

  it('renders operation phase age as duration copy instead of raw turn labels', () => {
    const { container } = render(createElement(OperationsPanel));

    expect(container.textContent).toContain('6 weeks in phase');
    expect(container.textContent).not.toContain('Turn 6');
  });

  it('uses player-facing operation phase labels in operation-card accessible names', () => {
    render(createElement(OperationsPanel));

    expect(screen.getByRole('option', {
      name: 'Operation Breakthrough, In execution, 1 brigades',
    })).toBeTruthy();
    expect(screen.queryByRole('option', {
      name: 'Operation Breakthrough, execution, 1 brigades',
    })).toBeNull();
  });

  it('closes the operations panel when the close button is clicked', () => {
    render(createElement(OperationsPanel));

    fireEvent.click(screen.getByRole('button', { name: 'Close operations panel' }));

    const state = useGameStore.getState();
    expect(state.isOperationsPanelOpen).toBe(false);
    expect(state.selectedOperationKey).toBeNull();
  });

  it('renders missing operation supply readiness as unassessed unless failures justify a warning', () => {
    setOperationPatch({ supply_readiness: undefined, failure_count: undefined, consecutive_failures_on_current: undefined });
    const view = render(createElement(OperationsPanel));

    expect(view.container.textContent).toContain('Unassessed');
    expect(view.container.textContent).not.toContain('Stable');

    cleanup();
    setOperationPatch({ supply_readiness: undefined, failure_count: 1, consecutive_failures_on_current: 0 });
    const strainedView = render(createElement(OperationsPanel));
    expect(strainedView.container.textContent).toContain('Strained');

    cleanup();
    setOperationPatch({ supply_readiness: undefined, failure_count: 1, consecutive_failures_on_current: 2 });
    const fragileView = render(createElement(OperationsPanel));
    expect(fragileView.container.textContent).toContain('Fragile');
  });

  it('routes allocated brigade clicks through corps-preserving field inspection', () => {
    render(createElement(OperationsPanel));

    fireEvent.click(screen.getByRole('button', { name: '1st Brigade' }));

    const state = useGameStore.getState();
    expect(state.selectedCorpsId).toBe(CORPS_ID);
    expect(state.selectedFormationId).toBe('arbih_brigade');
    expect(state.selectedOsid).toBe('op:test:objective');
    expect(state.isOperationsPanelOpen).toBe(false);
    expect(state.selectedOperationKey).toBeNull();
  });

  it('routes objective clicks through field inspection instead of pan-only focus', () => {
    render(createElement(OperationsPanel));

    fireEvent.click(screen.getByRole('option', { name: /Current objective: Objective Ridge/i }));

    const state = useGameStore.getState();
    expect(state.selectedOsid).toBe('op:test:objective');
    expect(state.isOperationsPanelOpen).toBe(false);
    expect(state.selectedOperationKey).toBeNull();
  });

  it('keeps operation briefing decisions read-only when the desktop bridge is unavailable', () => {
    useGameStore.setState({
      operationBriefingContext: { corpsId: CORPS_ID, operationName: RAW_OP_NAME },
    });

    render(createElement(OperationBriefingModal, {
      isOpen: true,
      onClose: () => {},
      commandBridgeAvailable: false,
    }));

    expect(screen.getByText('Desktop command bridge unavailable. Decision controls are read-only in this browser view.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Launch Operation' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Order Probe' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Postpone' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Abort Operation' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows explicit commander state in operation briefing when commander is absent or unresolved', () => {
    setOperationPatch({ commander_officer_id: undefined });
    useGameStore.setState({
      operationBriefingContext: { corpsId: CORPS_ID, operationName: RAW_OP_NAME },
    });
    const absent = render(createElement(OperationBriefingModal, {
      isOpen: true,
      onClose: () => {},
    }));
    expect(absent.container.textContent).toContain('Commander unassigned');

    cleanup();
    setOperationPatch({ commander_officer_id: 'missing_commander' });
    useGameStore.setState({
      operationBriefingContext: { corpsId: CORPS_ID, operationName: RAW_OP_NAME },
    });
    const unresolved = render(createElement(OperationBriefingModal, {
      isOpen: true,
      onClose: () => {},
    }));
    expect(unresolved.container.textContent).toContain('Commander record unreported');
  });

  it('renders Army HQ operation commanders and sparse brigade metrics as unreported instead of disappearing or zeroing', () => {
    const sparseState = {
      ...loadedState(),
      formations: loadedState().formations.map((formation) => formation.id === 'arbih_brigade'
        ? {
            ...formation,
            personnel: undefined,
            cohesion: undefined,
            morale: Number.NaN,
          }
        : formation),
      operations: [{ ...operation(), commander_officer_id: 'missing_commander' }],
    } as unknown as LoadedGameState;

    const { container } = render(createElement(OperationsSection, {
      corpsId: CORPS_ID,
      operations: sparseState.operations ?? [],
      gameState: sparseState,
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operation Breakthrough/i }));

    expect(container.textContent).toContain('Commander record unreported');
    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain(' 0 ');
  });

  it('preserves partial operation readiness and marks stale participants in the adapter', () => {
    const loaded = parseGameState({
      meta: {
        turn: 8,
        phase: 'war',
        player_faction: 'RBiH',
      },
      political: {
        political_controllers: {},
        initial_political_controllers: {},
      },
      military: {
        formations: {
          [CORPS_ID]: {
            id: CORPS_ID,
            faction: 'RBiH',
            name: '3rd Corps',
            kind: 'corps',
            readiness: 'ready',
            status: 'active',
          },
          arbih_brigade: {
            id: 'arbih_brigade',
            faction: 'RBiH',
            name: '1st Brigade',
            kind: 'brigade',
            readiness: 'ready',
            status: 'active',
            corps_id: CORPS_ID,
            personnel: 1200,
            cohesion: 70,
          },
        },
        corps_command: {
          [CORPS_ID]: {
            active_operations: [
              {
                name: RAW_OP_NAME,
                type: 'sector_attack',
                phase: 'planning',
                participating_brigades: ['arbih_brigade', 'stale_missing_brigade'],
                supply_readiness: 0.62,
                started_turn: 4,
              },
            ],
          },
        },
        sector_intel: {},
      },
    });

    expect(loaded.operations?.[0]).toEqual(expect.objectContaining({
      participating_brigade_count: 1,
      participating_brigade_ids: ['arbih_brigade'],
      stale_participating_brigade_count: 1,
      stale_participating_brigade_ids: ['stale_missing_brigade'],
      readiness: {
        supply: 0.62,
        cohesion: 0.7,
      },
    }));
    expect(loaded.operations?.[0].readiness).not.toHaveProperty('intel');
  });

  it('renders partial readiness as unreported dimensions instead of red zeroes', () => {
    const sparseState = {
      ...loadedState(),
      operations: [{
        ...operation(),
        phase: 'planning',
        readiness: {
          supply: 0.62,
          cohesion: 0.7,
        },
        stale_participating_brigade_count: 1,
        stale_participating_brigade_ids: ['stale_missing_brigade'],
      }],
    } as unknown as LoadedGameState;

    const { container } = render(createElement(OperationsSection, {
      corpsId: CORPS_ID,
      operations: sparseState.operations ?? [],
      gameState: sparseState,
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operation Breakthrough/i }));

    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).toContain('1 stale unit record');
    expect(container.textContent).toMatch(/UNITS:\s*1/i);
    expect(container.textContent).not.toContain('Intel0%');
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

  it('renders OOB operation objective progress as player-facing one-based progress', () => {
    const { container } = render(createElement(OOBSidebar));

    fireEvent.click(screen.getByRole('button', { name: /Operations/i }));

    expect(container.textContent).toContain('1/1');
    expect(container.textContent).not.toContain('0/1');
  });

  it('opens the operation drilldown when an OOB operation row is clicked', () => {
    useGameStore.setState({
      isOperationsPanelOpen: false,
      selectedOperationKey: null,
    });

    render(createElement(OOBSidebar));
    fireEvent.click(screen.getByRole('button', { name: /Operations/i }));
    fireEvent.click(screen.getByRole('button', { name: /Operation Breakthrough/i }));

    const state = useGameStore.getState();
    expect(state.selectedOperationKey).toBe(`${CORPS_ID}|${RAW_OP_NAME}`);
    expect(state.isOperationsPanelOpen).toBe(true);
  });

  it('shows planning-only operations on OOB corps cards instead of saying none are active', () => {
    const planning = { ...operation(), phase: 'planning' as const, display_name: 'Operation Queueing' };
    useGameStore.setState({
      loadedGameState: {
        ...loadedState(),
        operations: [planning],
      } as LoadedGameState,
    });

    const { container } = render(createElement(OOBSidebar));
    const corpsCard = screen
      .getAllByText('Corps Commander')
      .map((element) => element.closest('[role="button"]'))
      .find(Boolean);
    expect(corpsCard).toBeTruthy();
    fireEvent.click(corpsCard!);

    expect(container.textContent).toContain('Operation Queueing');
    expect(container.textContent).toContain('Planning');
    expect(container.textContent).not.toContain('No active operations');
  });

  it('labels OOB sector frontage as front segments instead of kilometers', () => {
    useGameStore.setState({
      loadedGameState: {
        ...loadedState(),
        corpsFrontSectors: [
          {
            sector_id: 'sector:arbih_3rd_corps:0',
            corps_id: CORPS_ID,
            faction: 'RBiH',
            display_name: 'Central Bosnia line',
            assigned_brigade_ids: ['arbih_brigade'],
            reserve_brigade_ids: [],
            length_edges: 4,
            density: 0.2,
            combat_strength_class: 'held',
          },
        ],
      } as any,
    });

    const { container } = render(createElement(OOBSidebar));
    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));

    const row = screen.getByTestId('oob-sector-row');
    expect(row.textContent).toContain('4 front segments');
    expect(container.textContent).not.toContain('~4 km');
  });
});
