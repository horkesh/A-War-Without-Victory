// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CorpsDetail } from '../../src/ui/map/components/CorpsDetail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
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
        sector_id: 'sector:arbih_1st_corps:uncovered',
        display_name: 'Remote front',
        faction: 'RBiH',
        corps_id: 'arbih_1st_corps',
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        length_edges: 3,
        density: 0.42,
        combat_strength_class: 'adequate',
      },
    ],
  } as unknown as LoadedGameState;
}

describe('CorpsDetail sector truth', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeState(),
      selectedCorpsId: 'arbih_1st_corps',
    });
  });

  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('does not label zero-formation sectors as held coverage', () => {
    const { container } = render(React.createElement(CorpsDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Sectors/i }));
    const row = screen.getByTestId('corps-detail-sector-row');

    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('Coverage: No coverage');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
    expect(row.getAttribute('data-coverage-tier')).toBe('uncovered');
    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-reserve-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
  });
});
