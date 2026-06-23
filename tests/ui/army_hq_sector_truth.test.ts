// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SectorsSection } from '../../src/ui/map/components/army_hq/SectorsSection.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { CorpsFrontSectorView, LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(sector: CorpsFrontSectorView): LoadedGameState {
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
    corpsFrontSectors: [sector],
  } as unknown as LoadedGameState;
}

describe('Army HQ sector truth', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('exposes current assignment truth for zero-formation sectors', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:uncovered',
      display_name: 'Remote front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      length_edges: 3,
      density: 0.42,
      combat_strength_class: 'adequate',
      sub_segments: [],
      threat_ratio: 9999,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as unknown as CorpsFrontSectorView;
    useGameStore.setState({ loadedGameState: makeState(sector) });

    const { container } = render(React.createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));
    const row = screen.getByTestId('army-hq-sector-row');

    expect(row.getAttribute('data-coverage-tier')).toBe('uncovered');
    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-reserve-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('density 0.00');
    expect(container.textContent).toContain('Troop density: 0.00');
    expect(container.textContent).not.toContain('density 0.42');
    expect(container.textContent).not.toContain('Troop density: 0.42');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
    expect(container.textContent).not.toMatch(/current:\s*Defend/i);
    expect(container.textContent).not.toMatch(/Class\s*Adequate|Adequate/i);
  });
});
