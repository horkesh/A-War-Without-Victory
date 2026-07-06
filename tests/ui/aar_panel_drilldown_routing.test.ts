// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AARPanel } from '../../src/ui/map/components/AARPanel.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

function makeAarState(): LoadedGameState {
  return {
    label: 'Turn 7',
    turn: 7,
    phase: 'war',
    formations: [
      {
        id: 'brigade_alpha',
        name: 'Alpha Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        readiness: 'ready',
        location_osid: 'op:test:a',
        corps_id: 'corps_alpha',
      },
    ],
    militiaPools: [],
    controlBySettlement: { 'op:test:a': 'RBiH' },
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
    latestTurnSummary: {
      turn: 7,
      battles: [
        {
          osid: 'op:test:a',
          attacker_faction: 'RBiH',
          defender_faction: 'RS',
          outcome: 'victory',
          attacker_casualties: 0,
          defender_casualties: 0,
          territory_flipped: false,
          primary_attacker_id: 'brigade_alpha',
          all_attacker_ids: ['brigade_alpha'],
          was_concentrated: false,
        },
      ],
      territory_net: {},
      notable_flips: [],
      displacement_total: 0,
      displacement_by_ethnicity: {},
      decoration_awards: [],
      arc_transitions: [],
      formation_spawns: [],
      formation_destructions: [],
      supply_deltas: {},
      heavy_munitions_deltas: {},
      movements: [],
      supply_transitions: [],
      events_fired: [],
      notable_events: [],
    } as any,
    turnSummaries: [],
    player_faction: 'RBiH',
    corpsFrontSectors: [
      {
        sector_id: 'sector_alpha',
        display_name: 'Alpha Sector',
        corps_id: 'corps_alpha',
        faction: 'RBiH',
        edge_ids: [],
        assigned_brigade_ids: ['brigade_alpha'],
        reserve_brigade_ids: [],
      },
    ],
  } as unknown as LoadedGameState;
}

describe('AARPanel drilldown routing', () => {
  it('preserves sector context when opening a battle formation link', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeAarState(),
      armyHQOpen: true,
    });

    render(React.createElement(AARPanel, { isOpen: true, onClose: () => {}, embedded: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Alpha Brigade' }));

    const store = useGameStore.getState();
    expect(store.selectedFormationId).toBe('brigade_alpha');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_alpha');
    expect(store.selectedCorpsId).toBe('corps_alpha');
    expect(store.selectedOsid).toBe('op:test:a');
    expect(store.armyHQOpen).toBe(false);
    expect(derivePanelRailState(store)).toEqual({
      panel: 'formation',
      trail: [
        { panel: 'corps', id: 'corps_alpha' },
        { panel: 'sector', id: 'sector_alpha' },
      ],
    });
  });

  it('marks AAR battle casualties unreported when the turn summary lacks casualty sources', () => {
    const state = makeAarState();
    state.latestTurnSummary!.battles[0] = {
      ...state.latestTurnSummary!.battles[0],
      attacker_casualties: null,
      defender_casualties: null,
      casualties_reported: false,
    } as any;
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: state,
    });

    const { container } = render(React.createElement(AARPanel, { isOpen: true, onClose: () => {}, embedded: true }));

    expect(container.textContent).toContain('Casualties unreported');
    expect(container.textContent).not.toContain('Attacker −0');
    expect(container.textContent).not.toContain('Defender −0');
  });
});
