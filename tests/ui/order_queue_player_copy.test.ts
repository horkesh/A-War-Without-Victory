// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OrderQueue } from '../../src/ui/map/components/OrderQueue.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeLoadedGameState(): LoadedGameState {
  return {
    label: 'Order queue test',
    turn: 3,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'rbih_test_brigade',
        faction: 'RBiH',
        name: 'Test Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
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
        sector_id: 'sector:central_front',
        corps_id: 'rbih_1st_corps',
        corps_name: '1st Corps',
        display_name: 'Central line',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: ['edge_1'],
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

describe('OrderQueue player copy', () => {
  beforeEach(() => {
    setLocale('en');
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeLoadedGameState(),
      osidDisplayNames: {
        'op:vitez:vitez_1': 'Vitez',
      },
      stagedOrders: [
        {
          id: 'order_attack',
          type: 'attack',
          formationId: 'rbih_test_brigade',
          targetOsid: 'op:vitez:vitez_1',
        },
        {
          id: 'order_posture',
          type: 'posture',
          formationId: 'rbih_test_brigade',
          postureName: 'attack',
        },
        {
          id: 'order_sector',
          type: 'sector',
          formationId: 'rbih_test_brigade',
          targetSectorId: 'sector:central_front',
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('renders staged order labels with player-safe localized copy', () => {
    const view = render(React.createElement(OrderQueue));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Staged orders (3)');
    expect(copy).toContain('Attack order');
    expect(copy).toContain('Posture order');
    expect(copy).toContain('Sector assignment');
    expect(copy).toContain('Vitez');
    expect(copy).toContain('Attacking');
    expect(copy).toContain('Central line');

    expect(copy).not.toMatch(/\battack\b/);
    expect(copy).not.toMatch(/\bposture\b/);
    expect(copy).not.toMatch(/\bsector\b/);
    expect(copy).not.toContain('sector:central_front');
  });

  it('uses stateful accessible names for staged order queue expand and collapse controls', () => {
    render(React.createElement(OrderQueue));

    const collapseButton = screen.getByRole('button', { name: 'Collapse staged orders queue' });
    expect(collapseButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(collapseButton);

    const expandButton = screen.getByRole('button', { name: 'Expand staged orders queue' });
    expect(expandButton.getAttribute('aria-expanded')).toBe('false');
  });
});
