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
  } as unknown as LoadedGameState;
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

  it('filters non-fielded brigades from CorpsDetail ORBAT and active totals', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
    });

    const { container } = render(createElement(CorpsDetail, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/1[,.]200/);
    expect(container.textContent).not.toMatch(/2[,.]100/);

    fireEvent.click(screen.getByRole('tab', { name: /ORBAT/i }));

    expect(container.textContent).toContain('1st Brigade');
    expect(container.textContent).not.toContain('Destroyed Brigade');
  });

  it('routes CorpsDetail sector rows through field inspection and clears stale shell context', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyId: 'RBiH',
      selectedCorpsId: 'rbih_1_corps',
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 3,
      focusedOperationHistoryId: 'stale-op',
    });

    render(createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Sectors/i }));
    fireEvent.click(screen.getByTestId('corps-detail-sector-row'));

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('rbih_1_corps');
    expect(store.selectedCorpsFrontSectorId).toBe('sector:rbih_1_corps:0');
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
    expect(derivePanelRailState(store)).toEqual({ primary: 'corps', secondary: 'sector' });
  });
});
