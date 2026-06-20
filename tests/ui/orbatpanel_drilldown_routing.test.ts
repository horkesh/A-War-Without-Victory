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
    corpsFrontSectors: [],
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
  it('routes brigade clicks to corps plus formation field inspection', () => {
    render(React.createElement(OrbatPanel));

    fireEvent.click(screen.getByRole('button', { name: /1st Brigade/i }));

    const store = useGameStore.getState();
    expect(store.selectedOrbatCorpsId).toBeNull();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedFormationId).toBe('rbih_1_brigade');
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'formation' });
  });
});
