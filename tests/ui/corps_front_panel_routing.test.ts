// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CorpsFrontPanel } from '../../src/ui/map/components/CorpsFrontPanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    formations: [
      {
        id: 'arbih_1st_corps',
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
        id: 'arbih_101_brigade',
        faction: 'RBiH',
        name: '101st Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 5,
        createdTurn: 0,
        tags: [],
        personnel: 1200,
        location_osid: 'op:sarajevo:dobrinja_1',
        corps_id: 'arbih_1st_corps',
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
    frontEdgesOsid: [],
    corpsFrontSectors: [
      {
        sector_id: 'sector:arbih_1st_corps:0',
        display_name: 'Sarajevo front',
        faction: 'RBiH',
        corps_id: 'arbih_1st_corps',
        assigned_brigade_ids: ['arbih_101_brigade'],
        reserve_brigade_ids: [],
        length_edges: 1,
        sub_segment_count: 1,
        density: 1,
        defensive_power: 1200,
        threat_ratio: 1,
        intel_confidence: 0.9,
        offensive_signs: false,
        opposing_factions: ['RS'],
        sub_segments: [{ sub_segment_id: 's1', friendly_osids: ['op:sarajevo:dobrinja_1'], enemy_osids: [] }],
      },
    ],
  } as unknown as LoadedGameState;
}

describe('CorpsFrontPanel field routing', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeState(),
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 4,
      focusedOperationHistoryId: 'stale-op',
    });
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('routes brigade rows through field inspection and clears stale shell context', () => {
    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /ORBAT/i }));
    fireEvent.click(screen.getByTestId('corps-front-brigade-row'));

    expect(useGameStore.getState()).toMatchObject({
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
      selectedFormationId: 'arbih_101_brigade',
      codexOpen: false,
      chronicleOpen: false,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
    });
  });

  it('does not describe an uncovered sector as a force-balance advantage', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      threat_ratio: 0.3,
      combat_personnel: 0,
      combat_offensive_power: 0,
      combat_defensive_power: 0,
      defensive_power: 0,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/No friendly line/i);
    expect(container.textContent).not.toMatch(/SUPERIOR|clear advantage/i);
  });
});
