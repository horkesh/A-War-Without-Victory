// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OrbatPanel } from '../../src/ui/map/components/OrbatPanel.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    formations: [
      {
        id: 'rbih_1_corps',
        faction: 'RBiH',
        name: '1st Corps',
        kind: 'corps',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'rbih_1_brigade',
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
        corps_id: 'rbih_1_corps',
        location_osid: 'op:sarajevo:centar_1',
        sectorOverrideId: 'sector_south',
      },
      {
        id: 'rbih_destroyed_brigade',
        faction: 'RBiH',
        name: 'Destroyed Brigade',
        kind: 'brigade',
        readiness: 'destroyed',
        status: 'destroyed',
        cohesion: 0,
        fatigue: 100,
        createdTurn: 0,
        tags: [],
        personnel: 800,
        corps_id: 'rbih_1_corps',
        location_osid: 'op:sarajevo:centar_1',
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
    corpsFrontSectors: [
      {
        sector_id: 'sector_north',
        display_name: 'North Line',
        faction: 'RBiH',
        corps_id: 'rbih_1_corps',
        assigned_brigade_ids: ['rbih_1_brigade'],
        reserve_brigade_ids: [],
        length_edges: 2,
        density: 0.2,
      },
      {
        sector_id: 'sector_south',
        display_name: 'South Line',
        faction: 'RBiH',
        corps_id: 'rbih_1_corps',
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        length_edges: 2,
        density: 0.2,
      },
    ],
  } as unknown as LoadedGameState;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: makeState(),
    selectedOrbatCorpsId: 'rbih_1_corps',
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('OrbatPanel drilldown routing', () => {
  it('routes brigade clicks to the current sector plus formation field inspection', () => {
    const { container } = render(React.createElement(OrbatPanel));

    expect(container.textContent).toMatch(/1[,.]200/);
    expect(container.textContent).not.toMatch(/2[,.]000/);
    expect(container.textContent).not.toContain('Destroyed Brigade');

    fireEvent.click(screen.getByRole('button', { name: /1st Brigade/i }));

    const store = useGameStore.getState();
    expect(store.selectedOrbatCorpsId).toBeNull();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_south');
    expect(store.selectedFormationId).toBe('rbih_1_brigade');
    expect(store.selectedOsid).toBe('op:sarajevo:centar_1');
    expect(derivePanelRailState(store)).toEqual({ primary: 'sector', secondary: 'formation' });
  });

  it('renders partial personnel totals when ORBAT brigade reports are incomplete', () => {
    const state = makeState();
    state.formations = [
      ...state.formations,
      {
        id: 'rbih_unreported_brigade',
        faction: 'RBiH',
        name: 'Unreported Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1_corps',
        location_osid: 'op:sarajevo:centar_1',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OrbatPanel));

    expect(container.textContent).toMatch(/Total Personnel\s*Partial 1[,.]200/i);
    expect(container.textContent).not.toMatch(/Total Personnel\s*1[,.]200\s*Brigades/i);
  });

  it('gives brigade rows a readable command summary instead of collapsed DOM text', () => {
    render(React.createElement(OrbatPanel));

    expect(document.body.textContent).not.toContain('AWWV v0.6.0-TAC');

    const row = screen.getByRole('button', { name: /1st Brigade/i });
    expect(row.getAttribute('aria-label')).toMatch(/1st Brigade/i);
    expect(row.getAttribute('aria-label')).toMatch(/1[,.]200 personnel/i);
    expect(row.getAttribute('aria-label')).toMatch(/Supply unreported/i);
    expect(row.getAttribute('aria-label')).toMatch(/cohesion 70/i);
    expect(row.getAttribute('aria-label')).toMatch(/fatigue 0/i);
    expect(row.getAttribute('aria-label')).toMatch(/Active/i);
    expect(row.textContent ?? '').not.toContain('1st Brigade1200ACTIVE');
  });

  it('highlights the override sector on brigade hover instead of stale roster membership', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_1_brigade'
      ? {
        ...formation,
        aorSettlementIds: ['op:stale:aor_1', 'op:stale:aor_2'],
      }
      : formation) as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(OrbatPanel));

    fireEvent.mouseEnter(screen.getByRole('button', { name: /1st Brigade/i }));

    expect(useGameStore.getState().hoveredSectorId).toBe('sector_south');
    expect(useGameStore.getState().hoveredOsids).toEqual(['op:sarajevo:centar_1']);
  });
});
