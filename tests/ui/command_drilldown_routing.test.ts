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
  } as LoadedGameState;
}

describe('command drilldown routing', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('keeps CorpsDetail ORBAT brigade clicks inside the corps formation route', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /ORBAT/i }));
    const brigadeRow = container.querySelector('[data-formation-id="rbih_1_brigade"]');
    expect(brigadeRow).toBeTruthy();
    fireEvent.click(brigadeRow as Element);

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedFormationId).toBe('rbih_1_brigade');
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'formation' });
  });
});
