// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { CorpsDetail } from '../../src/ui/map/components/CorpsDetail.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Opening week',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'rbih_1_corps',
        name: '1st Corps',
        faction: 'RBiH',
        kind: 'corps',
        status: 'active',
        readiness: 'ready',
        personnel: 0,
        fatigue: 0,
        cohesion: 70,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'rbih_1_brigade',
        name: '1st Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        readiness: 'ready',
        personnel: 1200,
        fatigue: 0,
        cohesion: 70,
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1_corps',
      },
      {
        id: 'rbih_destroyed_brigade',
        name: 'Destroyed Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        status: 'destroyed',
        readiness: 'destroyed',
        personnel: 900,
        fatigue: 100,
        cohesion: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1_corps',
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
    corpsFrontSectors: [
      {
        sector_id: 'sector:rbih_1_corps:0',
        display_name: 'Corps front',
        faction: 'RBiH',
        corps_id: 'rbih_1_corps',
        assigned_brigade_ids: ['rbih_1_brigade'],
        reserve_brigade_ids: [],
        length_edges: 1,
        density: 0.2,
      },
    ],
    operations: [
      {
        corps_id: 'rbih_1_corps',
        corps_name: '1st Corps',
        faction: 'RBiH',
        name: 'op_test_corps',
        display_name: 'Test Corps Operation',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 0,
        current_objective_index: 0,
        objectives: ['op:test_objective'],
        participating_brigade_count: 1,
      },
    ],
  } as unknown as LoadedGameState;
}

describe('command drilldown routing', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('keeps CorpsDetail order-of-battle brigade clicks inside the corps formation route', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    expect(screen.getByRole('tab', { name: 'Order of battle, 1 brigades' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Sectors, 1 sectors' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Ops Snapshot, 1 operations' })).toBeTruthy();
    expect(container.textContent).toContain('Order of battle 1');
    expect(container.textContent).not.toContain('Order of battle1');

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    const brigadeRow = container.querySelector('[data-formation-id="rbih_1_brigade"]');
    expect(brigadeRow).toBeTruthy();
    fireEvent.click(brigadeRow as Element);

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedFormationId).toBe('rbih_1_brigade');
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'formation' });
  });

  it('filters non-fielded brigades from CorpsDetail order of battle and active totals', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/1[,.]200/);
    expect(container.textContent).not.toMatch(/2[,.]100/);
    expect(container.textContent).toContain('Fielded brigades');

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));

    expect(container.textContent).toContain('1st Brigade');
    expect(container.textContent).not.toContain('Destroyed Brigade');
  });

  it('highlights only physical brigade location on CorpsDetail order-of-battle hover', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => (
      formation.id === 'rbih_1_brigade'
        ? {
          ...formation,
          location_osid: 'op:real:front',
          aorSettlementIds: ['op:stale:aor_1', 'op:stale:aor_2'],
        }
        : formation
    ));
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    const brigadeRow = container.querySelector('[data-formation-id="rbih_1_brigade"]');
    expect(brigadeRow).toBeTruthy();

    fireEvent.mouseEnter(brigadeRow as Element);

    expect(useGameStore.getState().hoveredOsids).toEqual(['op:real:front']);
  });

  it('routes CorpsDetail sector rows through field inspection and clears stale shell context', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      sub_segments: [{
        sub_segment_id: 'front-1',
        edge_ids: [],
        friendly_osids: ['op:friendly:anchor_1'],
        enemy_osids: ['op:enemy:hidden_1'],
        length_edges: 1,
        primary_brigade_ids: ['rbih_1_brigade'],
      }],
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 3,
      focusedOperationHistoryId: 'stale-op',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Sectors/i }));
    const sectorRow = screen.getByTestId('corps-detail-sector-row');
    expect(sectorRow.getAttribute('data-coverage-tier')).toBe('dense');
    expect(container.textContent).toContain('Dense coverage');
    fireEvent.click(sectorRow);

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedCorpsFrontSectorId).toBe('sector:rbih_1_corps:0');
    expect(store.selectedOsid).toBe('op:friendly:anchor_1');
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'sector' });
  });

  it('routes CorpsDetail operation rows through canonical field inspection', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector:stale',
      selectedFormationId: 'rbih_1_brigade',
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 2,
      focusedOperationHistoryId: 'stale-history',
    });

    render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops/i }));
    const operationRow = screen.getByTestId('corps-detail-operation-row');
    expect(operationRow.getAttribute('data-operation-key')).toBe('rbih_1_corps|op_test_corps');
    fireEvent.click(operationRow);

    const store = useGameStore.getState();
    expect(store.selectedOperationKey).toBe('rbih_1_corps|op_test_corps');
    expect(store.isOperationsPanelOpen).toBe(true);
    expect(store.selectedCorpsId).toBeNull();
    expect(store.selectedCorpsFrontSectorId).toBeNull();
    expect(store.selectedFormationId).toBeNull();
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
  });

  it('renders unreported CorpsDetail operation phase as status pending instead of planning', () => {
    const state = makeState();
    state.operations = state.operations?.map((operation) => ({
      ...operation,
      phase: 'planning',
      phase_unreported: true,
    })) as LoadedGameState['operations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops/i }));

    expect(container.textContent).toContain('Status pending');
    expect(container.textContent).not.toContain('Planning');
  });

  it('renders missing CorpsDetail operation momentum as unreported instead of green zero', () => {
    const state = makeState();
    state.operations = [{
      ...state.operations![0],
      phase: 'execution',
      momentum: undefined,
    }] as LoadedGameState['operations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops/i }));

    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toContain('0.0');
  });

  it('renders non-finite CorpsDetail operation momentum as unreported', () => {
    const state = makeState();
    state.operations = [{
      ...state.operations![0],
      phase: 'execution',
      momentum: Number.POSITIVE_INFINITY,
    }] as LoadedGameState['operations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops/i }));

    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toContain('Infinity');
  });

  it('does not render fake 0/0 objective progress for empty CorpsDetail operation chains', () => {
    const state = makeState();
    state.operations = [{
      ...state.operations![0],
      objectives: [],
      current_objective_index: 0,
    }] as LoadedGameState['operations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: /Ops/i }));

    expect(container.textContent).not.toContain('Obj 0/0');
  });

  it('names the sector used when opening CorpsDetail operation planning', () => {
    const state = makeState();
    state.corpsFrontSectors = [
      {
        ...state.corpsFrontSectors![0],
        sector_id: 'sector:rbih_1_corps:quiet',
        display_name: 'Quiet line',
        sub_segments: [{
          sub_segment_id: 'quiet-1',
          edge_ids: [],
          friendly_osids: ['op:quiet:friendly'],
          enemy_osids: [],
          length_edges: 1,
          primary_brigade_ids: ['rbih_1_brigade'],
        }],
      },
      {
        ...state.corpsFrontSectors![0],
        sector_id: 'sector:rbih_1_corps:contact',
        display_name: 'Contact line',
        sub_segments: [{
          sub_segment_id: 'contact-1',
          edge_ids: [],
          friendly_osids: ['op:contact:friendly'],
          enemy_osids: ['op:contact:enemy'],
          length_edges: 1,
          primary_brigade_ids: ['rbih_1_brigade'],
        }],
      },
    ] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Orders/i }));
    const planButton = screen.getByRole('button', { name: /Prepare Operation in HQ for Contact line/i });
    expect(planButton.getAttribute('title')).toBe('Prepare Operation in HQ for Contact line');
    fireEvent.click(planButton);

    expect(useGameStore.getState().opsPlanningCorpsId).toBe('rbih_1_corps');
    expect(useGameStore.getState().opsPlanningOriginSectorId).toBe('sector:rbih_1_corps:contact');
  });
});
