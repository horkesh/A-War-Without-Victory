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
      corps_name: '1st Corps',
      opposing_factions: ['RS'],
      edge_ids: [],
      sub_segment_count: 0,
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 3,
      density: 0.42,
      combat_strength_class: 'adequate',
      sub_segments: [],
      threat_ratio: 9999,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as CorpsFrontSectorView;
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
    expect(row.getAttribute('data-rear-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
    expect(container.textContent).toContain('No friendly line');
    expect(container.textContent).not.toContain('0 on line');
    expect(container.textContent).not.toContain('density 0.00');
    expect(container.textContent).not.toContain('Troop density: 0.00');
    expect(container.textContent).not.toContain('//');
    expect(container.textContent).not.toContain(' RES ');
    expect(container.textContent).not.toContain('density 0.42');
    expect(container.textContent).not.toContain('Troop density: 0.42');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
    expect(container.textContent).not.toMatch(/current:\s*Defend/i);
    expect(container.textContent).not.toMatch(/Class\s*Adequate|Adequate/i);
  });

  it('shows stale sector roster ids without counting them as current fielded brigades', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:stale',
      display_name: 'Stale roster front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: ['missing_bde'],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 2,
      density: 0,
      sub_segments: [],
      threat_ratio: 1,
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

    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-stale-roster-count')).toBe('1');
    expect(screen.getByTestId('army-hq-sector-stale-roster').getAttribute('data-stale-roster-ids')).toBe('missing_bde');
    expect(screen.getByTestId('army-hq-sector-stale-roster').textContent).not.toContain('missing_bde');
    expect(container.textContent).toContain('1 stale roster entry');
  });

  it('keeps rear support separate from live line coverage in Army HQ', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:rear',
      display_name: 'Rear support front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['rear_brigade'],
      length_edges: 3,
      density: 0.42,
      combat_strength_class: 'adequate',
      sub_segments: [],
      threat_ratio: 1,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as unknown as CorpsFrontSectorView;
    const state = makeState(sector);
    state.formations = [
      ...state.formations,
      {
        id: 'rear_brigade',
        faction: 'RBiH',
        name: 'Rear Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

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
    expect(row.getAttribute('data-rear-brigade-count')).toBe('1');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
    expect(container.textContent).toContain('No friendly line');
    expect(container.textContent).not.toContain('0 on line');
    expect(container.textContent).toContain('1 rear/support');
    expect(container.textContent).not.toContain('density 0.00');
    expect(container.textContent).not.toContain('density 0.42');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
  });

  it('spells out reserve and directed sector summary counts for command scanning', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:covered',
      display_name: 'Main front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 4,
      density: 0,
      combat_strength_class: 'thin',
      sub_segments: [],
      threat_ratio: 1,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as unknown as CorpsFrontSectorView;
    const state = makeState(sector);
    state.formations = [
      ...state.formations,
      {
        id: 'front_brigade',
        faction: 'RBiH',
        name: 'Front Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
      },
      {
        id: 'reserve_brigade',
        faction: 'RBiH',
        name: 'Reserve Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
      },
      {
        id: 'directed_brigade',
        faction: 'RBiH',
        name: 'Directed Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
        sectorOverrideId: 'sector:arbih_1st_corps:covered',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = [{
      ...sector,
      assigned_brigade_ids: ['front_brigade'],
      reserve_brigade_ids: ['reserve_brigade'],
      rear_brigade_ids: [],
    } as unknown as CorpsFrontSectorView];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: state.corpsFrontSectors!,
      factionBattles: [],
      defaultOpen: true,
    }));

    expect(container.textContent).toContain('2 on line');
    expect(container.textContent).toContain('1 reserve');
    expect(container.textContent).toContain('4 front segments');
    expect(container.textContent).toContain('density 0.50');
    expect(container.textContent).toContain('1 command-directed');
    expect(container.textContent).not.toContain('//');
    expect(container.textContent).not.toContain('RES //');
  });

  it('uses command-directed brigades in collapsed and expanded sector density', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:covered',
      display_name: 'Main front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 4,
      density: 0,
      combat_strength_class: 'thin',
      sub_segments: [],
      threat_ratio: 1,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as unknown as CorpsFrontSectorView;
    const state = makeState(sector);
    state.formations = [
      ...state.formations,
      {
        id: 'directed_brigade',
        faction: 'RBiH',
        name: 'Directed Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
        sectorOverrideId: 'sector:arbih_1st_corps:covered',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));
    const row = screen.getByTestId('army-hq-sector-row');

    expect(row.getAttribute('data-current-brigade-count')).toBe('1');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('1');
    expect(container.textContent).toContain('1 on line');
    expect(container.textContent).toContain('1 command-directed');
    expect(container.textContent).toContain('density 0.25');
    expect(container.textContent).toContain('Brigades per front segment: 0.25');
    expect(container.textContent).not.toContain('Troop density: 0.25');
  });

  it('does not count lifecycle-free projection overrides as command-directed line force', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:covered',
      display_name: 'Main front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 4,
      density: 0,
      combat_strength_class: 'thin',
      sub_segments: [],
      threat_ratio: 1,
      intel_confidence: 0.8,
      offensive_signs: false,
    } as unknown as CorpsFrontSectorView;
    const state = makeState(sector);
    state.formations = [
      ...state.formations,
      {
        id: 'projection_only_brigade',
        faction: 'RBiH',
        name: 'Projection Only Brigade',
        kind: 'brigade',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
        sectorOverrideId: 'sector:arbih_1st_corps:covered',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));
    const row = screen.getByTestId('army-hq-sector-row');

    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
  });

  it('does not expose threat recommendations from low-confidence sector intelligence', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:uncertain',
      display_name: 'Uncertain front',
      faction: 'RBiH',
      corps_id: 'arbih_1st_corps',
      assigned_brigade_ids: ['front_brigade'],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      length_edges: 1,
      density: 1,
      combat_strength_class: 'adequate',
      sub_segments: [],
      threat_ratio: 9999,
      intel_confidence: 0.1,
      offensive_signs: true,
      sector_stance: 'screening',
    } as unknown as CorpsFrontSectorView;
    const state = makeState(sector);
    state.formations = [
      ...state.formations,
      {
        id: 'front_brigade',
        faction: 'RBiH',
        name: 'Front Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        corps_id: 'arbih_1st_corps',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));

    expect(container.textContent).toContain('Enemy picture unconfirmed');
    expect(container.textContent).not.toMatch(/OFFENSIVE SIGNS|Recommend|overmatch/i);
  });
});
