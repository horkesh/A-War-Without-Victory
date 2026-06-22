// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    formations: [
      {
        id: 'vrs_main_staff',
        faction: 'RS',
        name: 'Main Staff VRS',
        kind: 'army_hq',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'vrs_guard_bde',
        faction: 'RS',
        name: 'Guard Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 75,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 800,
        corps_id: 'vrs_main_staff',
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
    player_faction: 'RS',
    corpsFrontSectors: [
      {
        sector_id: 'sector_vrs_main_staff_north',
        display_name: 'Northern Line',
        faction: 'RS',
        corps_id: 'vrs_main_staff',
        assigned_brigade_ids: ['vrs_guard_bde'],
        reserve_brigade_ids: [],
        length_edges: 2,
        density: 0.2,
        combat_strength_class: 'adequate',
      },
    ],
  } as unknown as LoadedGameState;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: makeState(),
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('OOBSidebar drilldown routing', () => {
  it('renders HQ reserve brigades and routes their labels to Army HQ formation drilldown', () => {
    useGameStore.setState({
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 7,
      focusedOperationHistoryId: 'stale-aar',
    });
    const { container } = render(React.createElement(OOBSidebar));

    expect(container.textContent).toContain('Reserve HQ / Main Staff VRS');
    expect(container.textContent).toContain('Guard Brigade');
    const reserveButton = screen.getByRole('button', { name: /Guard Brigade/i });
    expect(reserveButton.getAttribute('data-testid')).toBe('oob-hq-reserve-brigade');
    expect(reserveButton.getAttribute('data-formation-id')).toBe('vrs_guard_bde');
    expect(reserveButton.getAttribute('data-army-hq-id')).toBe('vrs_main_staff');

    fireEvent.click(reserveButton);

    const store = useGameStore.getState();
    expect(store.selectedArmyHqId).toBe('vrs_main_staff');
    expect(store.selectedCorpsId).toBeNull();
    expect(store.selectedFormationId).toBe('vrs_guard_bde');
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
    expect(derivePanelRailState(store)).toEqual({ primary: 'army_reserve', secondary: 'formation' });
  });

  it('routes sector rows with their corps context preserved', () => {
    render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    fireEvent.click(screen.getByTestId('oob-sector-row'));

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('vrs_main_staff');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_vrs_main_staff_north');
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'sector' });
  });

  it('does not label zero-formation sectors as held coverage in OOB', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      density: 0.35,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));

    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('No coverage');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
  });
});
