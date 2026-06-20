// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeFormationDetailState(): LoadedGameState {
  return {
    label: 'Formation detail test',
    turn: 8,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'rbih_1st_corps',
        faction: 'RBiH',
        name: '1st Corps',
        kind: 'corps',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'rbih_general_staff',
        faction: 'RBiH',
        name: 'General Staff ARBiH',
        kind: 'army_hq',
        readiness: 'ready',
        cohesion: 75,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'rbih_heroic_brigade',
        faction: 'RBiH',
        name: 'Heroic Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 64,
        fatigue: 3,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        narrativeArc: 'bloodied',
        personnel: 1400,
        posture: 'defend',
        warNarrative: 'The brigade has been tested in hard fighting.',
      },
      {
        id: 'rbih_hq_guard_brigade',
        faction: 'RBiH',
        name: 'HQ Guard Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 64,
        fatigue: 3,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_general_staff',
        homeDistanceMult: 0.7,
        personnel: 1200,
        posture: 'defend',
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
    activeOperations: [],
    corpsFrontSectors: [
      {
        sector_id: 'sector_north',
        corps_id: 'rbih_1st_corps',
        corps_name: '1st Corps',
        display_name: 'Northern line',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_1'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: ['rbih_heroic_brigade'],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
      },
      {
        sector_id: 'sector_south',
        corps_id: 'rbih_1st_corps',
        corps_name: '1st Corps',
        display_name: 'Southern line',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_2'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
      },
    ],
  } as LoadedGameState;
}

describe('Formation Detail parity display', () => {
  const assignBrigadeToSector = vi.fn(async () => ({ ok: true }));

  beforeEach(() => {
    assignBrigadeToSector.mockClear();
    (window as unknown as { awwv?: unknown }).awwv = { assignBrigadeToSector };
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeFormationDetailState(),
      selectedFormationId: 'rbih_heroic_brigade',
      isOperationsPanelOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { awwv?: unknown }).awwv;
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('uses player-safe narrative arc labels in formation history copy', () => {
    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Record' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Blooded in combat');
    expect(copy).not.toMatch(/\bBloodied\b/);
  });

  it('does not persist an override when clicking the automatic current sector row', () => {
    render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    fireEvent.click(screen.getByRole('button', { name: /Northern line/i }));

    expect(assignBrigadeToSector).not.toHaveBeenCalled();
  });

  it('uses the actual HQ parent name for army-HQ assigned brigades', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_hq_guard_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('General Staff ARBiH');
    expect(copy).not.toContain('Assigned command');
  });

  it('uses player-facing effectiveness modifier labels', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_hq_guard_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Distance from home 70%');
    expect(copy).not.toContain('homeDistance');
  });
});
