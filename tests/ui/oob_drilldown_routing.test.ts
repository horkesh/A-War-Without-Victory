// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    formations: [
      {
        id: 'vrs_main_staff',
        faction: 'RS',
        name: 'Main Staff VRS',
        kind: 'army_hq',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'vrs_guard_bde',
        faction: 'RS',
        name: 'Guard Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 75,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 800,
        corps_id: 'vrs_main_staff',
      },
      {
        id: 'vrs_destroyed_guard_bde',
        faction: 'RS',
        name: 'Destroyed Guard Brigade',
        kind: 'brigade',
        readiness: 'destroyed',
        status: 'destroyed',
        cohesion: 0,
        fatigue: 100,
        createdTurn: 0,
        tags: [],
        personnel: 600,
        corps_id: 'vrs_main_staff',
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
    player_faction: 'RS',
    corpsFrontSectors: [
      {
        sector_id: 'sector_vrs_main_staff_north',
        display_name: 'Northern Line',
        faction: 'RS',
        corps_id: 'vrs_main_staff',
        assigned_brigade_ids: ['vrs_guard_bde'],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        length_edges: 2,
        density: 0.2,
        combat_strength_class: 'adequate',
        sub_segments: [{ sub_segment_id: 'north-1', friendly_osids: ['op:sarajevo:dobrinja_1'], enemy_osids: [] }],
      },
    ],
  } as unknown as LoadedGameState;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: makeState(),
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('OOBSidebar drilldown routing', () => {
  it('labels section accordions with explicit expand and collapse actions', () => {
    render(React.createElement(OOBSidebar));

    const sectorsToggle = screen.getByTestId('oob-section-sectors-toggle');
    expect(sectorsToggle.getAttribute('aria-label')).toBe('Expand Sectors');
    expect(sectorsToggle.getAttribute('title')).toBe('Expand Sectors');
    expect(sectorsToggle.getAttribute('aria-expanded')).toBe('false');
    expect(sectorsToggle.textContent).toContain('Sectors');
    expect(sectorsToggle.textContent).toContain('1');

    fireEvent.click(sectorsToggle);

    expect(sectorsToggle.getAttribute('aria-label')).toBe('Collapse Sectors');
    expect(sectorsToggle.getAttribute('title')).toBe('Collapse Sectors');
    expect(sectorsToggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders HQ reserve brigades and routes their labels to Army HQ formation drilldown', () => {
    useGameStore.setState({
      codexOpen: true,
      chronicleOpen: true,
      focusedAftermathTurn: 7,
      focusedOperationHistoryId: 'stale-aar',
    });
    const { container } = render(React.createElement(OOBSidebar));

    expect(container.textContent).toContain('Reserve HQ / Main Staff VRS');
    expect(container.textContent).toContain('Guard Brigade');
    expect(container.textContent).not.toContain('Destroyed Guard Brigade');
    const reserveButton = screen.getByRole('button', { name: /Guard Brigade/i });
    expect(reserveButton.getAttribute('data-testid')).toBe('oob-hq-reserve-brigade');
    expect(reserveButton.getAttribute('data-formation-id')).toBe('vrs_guard_bde');
    expect(reserveButton.getAttribute('data-army-hq-id')).toBe('vrs_main_staff');

    fireEvent.click(reserveButton);

    const store = useGameStore.getState();
    expect(store.selectedArmyHqId).toBe('vrs_main_staff');
    expect(store.selectedCorpsId).toBeNull();
    expect(store.selectedFormationId).toBe('vrs_guard_bde');
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
    expect(derivePanelRailState(store)).toEqual({
      panel: 'formation',
      trail: [{ panel: 'army_reserve', id: 'vrs_main_staff' }],
    });
  });

  it('surfaces missing army commander source and splits fielded versus reserve counts', () => {
    const { container } = render(React.createElement(OOBSidebar));

    expect(container.textContent).not.toContain('Army commander unreported');
    expect(container.textContent).toContain('0 fielded / 1 reserve');
    expect(container.textContent).not.toContain('1 formations');
  });

  it('renders command nodes even when their only subordinates are non-fielded phantom rows', () => {
    const state = makeState();
    state.formations = [
      {
        id: 'jna_herzegovina_command',
        faction: 'RS',
        name: 'JNA Herzegovina Command',
        kind: 'corps_asset',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'jna_phantom_1',
        faction: 'RS',
        name: 'JNA phantom battalion',
        kind: 'jna_phantom',
        readiness: 'ready',
        status: 'active',
        corps_id: 'jna_herzegovina_command',
        personnel: 900,
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = [];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    expect(container.textContent).toContain('JNA Herzegovina Command');
    expect(container.textContent).toContain('0 fielded brigades');
    expect(container.textContent).not.toContain('JNA phantom battalion');
    expect(container.textContent).not.toContain('No formations.');
    expect(screen.getByRole('button', { name: 'Inspect JNA Herzegovina Command command card: 0 personnel; 0 fielded brigades' })).toBeTruthy();
  });

  it('routes sector rows with their corps context preserved', () => {
    render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    const sectorRow = screen.getByTestId('oob-sector-row');
    expect(sectorRow.getAttribute('aria-label')).toBe('Inspect Northern Line on field under Main Staff VRS');
    expect(sectorRow.getAttribute('title')).toBe('Inspect Northern Line on field under Main Staff VRS');
    expect(`${sectorRow.getAttribute('aria-label')} ${sectorRow.getAttribute('title')}`).not.toMatch(/sector_vrs|vrs_main_staff|op:sarajevo/i);
    fireEvent.click(sectorRow);

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('vrs_main_staff');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_vrs_main_staff_north');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(derivePanelRailState(store)).toEqual({
      panel: 'sector',
      trail: [{ panel: 'corps', id: 'vrs_main_staff' }],
    });
  });

  it('sanitizes raw command ids in OOB sector owner copy', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => (
      formation.id === 'vrs_main_staff'
        ? { ...formation, name: 'vrs_main_staff' }
        : formation
    )) as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    const sectorRow = screen.getByTestId('oob-sector-row');
    const labelText = `${sectorRow.getAttribute('aria-label')} ${sectorRow.getAttribute('title')} ${sectorRow.textContent}`;

    expect(labelText).not.toContain('vrs_main_staff');
    expect(labelText).toContain('Main Staff');
  });

  it('does not route enemy-only sector segments as field settlement anchors', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      sub_segments: [{
        sub_segment_id: 'north-1',
        edge_ids: [],
        friendly_osids: [],
        enemy_osids: ['op:sarajevo:enemy_only_1'],
        length_edges: 1,
        primary_brigade_ids: [],
      }],
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    fireEvent.click(screen.getByTestId('oob-sector-row'));

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('vrs_main_staff');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_vrs_main_staff_north');
    expect(store.selectedOsid).toBeNull();
    expect(derivePanelRailState(store)).toEqual({
      panel: 'sector',
      trail: [{ panel: 'corps', id: 'vrs_main_staff' }],
    });
  });

  it('does not label zero-formation sectors as held coverage in OOB', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: [],
      density: 0.35,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    const row = screen.getByTestId('oob-sector-row');

    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('No coverage');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
    expect(row.getAttribute('data-coverage-tier')).toBe('uncovered');
    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-reserve-brigade-count')).toBe('0');
    expect(row.getAttribute('data-rear-brigade-count')).toBe('0');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
  });

  it('sanitizes raw sector labels in OOB sector rows', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      display_name: 'sector_vrs_main_staff_north',
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    expect(container.textContent).toContain('Assigned sector');
    expect(container.textContent).not.toMatch(/sector_vrs|vrs_main_staff|Main Staff North/i);
  });

  it('shows rear support in OOB without treating it as live line coverage', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['vrs_guard_bde'],
      density: 0.35,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    const row = screen.getByTestId('oob-sector-row');

    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('1 rear/support');
    expect(container.textContent).toContain('No coverage');
    expect(container.textContent).not.toMatch(/Held coverage|Dense coverage/i);
    expect(row.getAttribute('data-coverage-tier')).toBe('uncovered');
    expect(row.getAttribute('data-current-brigade-count')).toBe('0');
    expect(row.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(row.getAttribute('data-reserve-brigade-count')).toBe('0');
    expect(row.getAttribute('data-rear-brigade-count')).toBe('1');
    expect(row.getAttribute('data-command-directed-brigade-count')).toBe('0');
  });

  it('does not show stale strength badges for reserve-only sectors', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: ['vrs_guard_bde'],
      rear_brigade_ids: [],
      density: 0.35,
      combat_strength_class: 'adequate',
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    const row = screen.getByTestId('oob-sector-row');

    expect(container.textContent).toContain('0 on line');
    expect(container.textContent).toContain('1 held back');
    expect(container.textContent).toContain('No coverage');
    expect(container.textContent).not.toContain('Adequate');
    expect(row.getAttribute('data-coverage-tier')).toBe('uncovered');
    expect(row.getAttribute('data-current-brigade-count')).toBe('1');
    expect(row.getAttribute('data-reserve-brigade-count')).toBe('1');
  });

  it('derives OOB sector coverage from live line holders instead of stale saved density', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      length_edges: 4,
      density: 0,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));
    expect(screen.getByTestId('oob-sector-row').getAttribute('data-coverage-tier')).toBe('held');
  });

  it('renders player-safe sector strength labels instead of raw enum values', () => {
    const { container } = render(React.createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-sectors-toggle'));

    expect(container.textContent).toContain('Adequate');
    expect(container.textContent).not.toMatch(/\badequate\b/);
  });

  it('exposes no-corps brigades as individual drilldowns without fake ungrouped ORBAT routing', () => {
    const state = makeState();
    state.formations = [
      ...(state.formations ?? []),
      {
        id: 'vrs_field_corps',
        faction: 'RS',
        name: 'Field Corps',
        kind: 'corps',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 1200,
      },
      {
        id: 'field_corps_bde',
        faction: 'RS',
        name: 'Field Corps Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 500,
        corps_id: 'vrs_field_corps',
      },
      {
        id: 'independent_bde',
        faction: 'RS',
        name: 'Independent Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 65,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 450,
      },
    ] as LoadedGameState['formations'];
    delete (state as Partial<LoadedGameState>).namedOfficerData;
    delete (state as Partial<LoadedGameState>).namedOfficerStateById;
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));

    const orbatButtons = screen.getAllByRole('button', { name: 'Open Field Corps order of battle' });
    expect(orbatButtons).toHaveLength(1);
    expect(orbatButtons[0].textContent).toContain('Order of battle');
    expect(screen.queryByRole('button', { name: /^Ungrouped/i })).toBeNull();
    const ungroupedCard = Array.from(container.querySelectorAll('.rounded-lg'))
      .find((card) => (card.textContent ?? '').includes('Ungrouped'));
    expect(ungroupedCard?.textContent).toContain('Ungrouped');
    expect(ungroupedCard?.textContent).not.toContain('Commander record unreported');
    fireEvent.click(orbatButtons[0]);

    expect(useGameStore.getState().selectedFormationId).toBeNull();
    expect(useGameStore.getState().selectedOrbatCorpsId).toBe('vrs_field_corps');
    expect(useGameStore.getState().selectedOrbatCorpsId).not.toBe('_ungrouped');

    const independentButton = screen.getByTestId('oob-ungrouped-brigade');
    expect(independentButton.getAttribute('data-formation-id')).toBe('independent_bde');
    expect(independentButton.getAttribute('aria-label')).toBe('Inspect Independent Brigade on field');
    expect(independentButton.getAttribute('title')).toBe('Inspect Independent Brigade on field');
    fireEvent.click(independentButton);

    const store = useGameStore.getState();
    expect(store.selectedFormationId).toBe('independent_bde');
    expect(store.selectedOrbatCorpsId).toBeNull();
    expect(store.selectedCorpsId).toBeNull();
    expect(derivePanelRailState(store)).toEqual({ panel: 'formation', trail: [] });
  });

  it('names corps card flip actions as details and summary affordances', () => {
    const state = makeState();
    state.formations = [
      ...(state.formations ?? []),
      {
        id: 'vrs_field_corps',
        faction: 'RS',
        name: 'Field Corps',
        kind: 'corps',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 1200,
      },
      {
        id: 'field_corps_bde',
        faction: 'RS',
        name: 'Field Corps Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 500,
        corps_id: 'vrs_field_corps',
      },
    ] as LoadedGameState['formations'];
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(OOBSidebar));

    const detailsButton = screen.getByRole('button', { name: 'Show Field Corps details' });
    fireEvent.click(detailsButton);

    expect(screen.getByRole('button', { name: 'Show Field Corps summary' })).toBeTruthy();
    expect(document.body.textContent ?? '').toContain('Fielded brigades');
  });

  it('renders sparse mobilization reports as unreported without hiding explicit zeroes', () => {
    const state = makeState();
    state.mobilizationSummary = {
      RS: {
        total_available: 0,
        total_committed: undefined,
        total_exhausted: 0,
        exhaustion_pct: undefined,
        strategic_reserve: undefined,
        top_pools: [
          { mun_id: 'op:sarajevo:dobrinja_1', available: undefined },
          { mun_id: 'op:sarajevo:ilidza_1', available: 0 },
        ],
      },
    } as any;
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(OOBSidebar));
    fireEvent.click(screen.getByTestId('oob-section-mobilization-toggle'));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Available0');
    expect(copy).toContain('Committed--');
    expect(copy).toContain('Exhausted0');
    expect(copy).toContain('Exhaustion:--');
    expect(copy).toContain('Strategic reserve--');
    expect(copy).toContain('Dobrinja 1--');
    expect(copy).toContain('Ilidza 10');
    expect(copy).not.toMatch(/NaN|undefined/);
  });
});
