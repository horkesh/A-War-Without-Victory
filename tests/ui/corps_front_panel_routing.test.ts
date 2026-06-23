// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CorpsFrontPanel } from '../../src/ui/map/components/CorpsFrontPanel.js';
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
        morale: 64,
        createdTurn: 0,
        tags: [],
        personnel: 1200,
        location_osid: 'op:sarajevo:dobrinja_1',
        corps_id: 'arbih_1st_corps',
      },
      {
        id: 'arbih_unresolved_brigade',
        faction: 'RBiH',
        name: 'Unresolved Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 5,
        createdTurn: 0,
        tags: [],
        personnel: 800,
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
    operations: [
      {
        corps_id: 'arbih_1st_corps',
        operation_name: 'Known Supply Operation',
        name: 'Known Supply Operation',
        display_name: 'Known Supply Operation',
        faction: 'RBiH',
        type: 'sector_attack',
        phase: 'execution',
        sector_id: 'sector:arbih_1st_corps:0',
        started_turn: 0,
        participating_brigade_ids: ['arbih_101_brigade'],
        participating_brigade_count: 1,
        objectives: ['op:sarajevo:dobrinja_1'],
        current_objective_index: 0,
        objectives_count: 1,
        objectives_captured: 0,
        attacks: 0,
        weekly_log_length: 0,
        supply_readiness: 0,
      },
    ],
    activeOperations: [
      {
        corps_id: 'arbih_1st_corps',
        operation_name: 'Known Supply Operation',
        faction: 'RBiH',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 0,
        participating_brigades: ['arbih_101_brigade'],
        objectives_count: 1,
        objectives_captured: 0,
        attacks: 0,
        weekly_log_length: 0,
        supply_readiness: 0,
      },
    ],
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

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    fireEvent.click(screen.getByTestId('corps-front-brigade-row'));

    expect(useGameStore.getState()).toMatchObject({
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
      selectedFormationId: 'arbih_101_brigade',
      selectedOsid: 'op:sarajevo:dobrinja_1',
      codexOpen: false,
      chronicleOpen: false,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
    });
  });

  it('preserves corps context when a bare sector inspection drills into a brigade', () => {
    useGameStore.setState({
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    fireEvent.click(screen.getByTestId('corps-front-brigade-row'));

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('arbih_1st_corps');
    expect(store.selectedCorpsFrontSectorId).toBe('sector:arbih_1st_corps:0');
    expect(store.selectedFormationId).toBe('arbih_101_brigade');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(derivePanelRailState(store)).toEqual({ primary: 'sector', secondary: 'formation' });
  });

  it('exposes unresolved brigade proof hooks and preserves its field route', () => {
    const state = makeState();
    state.unresolvedSectorBrigades = ['arbih_unresolved_brigade'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    const unresolvedRow = screen.getByTestId('corps-front-brigade-row-unresolved');
    expect(unresolvedRow.getAttribute('data-testid')).toBe('corps-front-brigade-row-unresolved');
    expect(unresolvedRow.getAttribute('data-formation-id')).toBe('arbih_unresolved_brigade');
    expect(unresolvedRow.getAttribute('data-location-osid')).toBe('op:sarajevo:dobrinja_1');
    fireEvent.click(unresolvedRow);

    const store = useGameStore.getState();
    expect(store.selectedCorpsId).toBe('arbih_1st_corps');
    expect(store.selectedCorpsFrontSectorId).toBe('sector:arbih_1st_corps:0');
    expect(store.selectedFormationId).toBe('arbih_unresolved_brigade');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
  });

  it('keeps missing logistics priority and operational security unreported', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      logistics_priority: undefined,
      opsec_active: undefined,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Operational security:\s*Unreported/i);
    expect(container.textContent).toMatch(/Supply Priority\s*Unreported/i);
    expect(container.textContent).not.toMatch(/Supply Priority\s*1\.0x\s*\(neutral\)/i);
  });

  it('preserves explicit neutral logistics priority and inactive operational security', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      logistics_priority: 1,
      opsec_active: false,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Operational security:\s*Inactive/i);
    expect(container.textContent).toMatch(/Supply Priority\s*1\.0x\s*\(neutral\)/i);
  });

  it('does not treat unassessed operation supply readiness as zero percent', () => {
    const state = makeState();
    state.operations = [
      {
        corps_id: 'arbih_1st_corps',
        name: 'Unassessed Supply Operation',
        display_name: 'Unassessed Supply Operation',
        faction: 'RBiH',
        type: 'sector_attack',
        phase: 'execution',
        sector_id: 'sector:arbih_1st_corps:0',
        started_turn: 0,
        participating_brigade_ids: ['arbih_101_brigade'],
        participating_brigade_count: 1,
        objectives: ['op:sarajevo:dobrinja_1'],
        current_objective_index: 0,
      },
    ] as LoadedGameState['operations'];
    state.activeOperations = [
      {
        corps_id: 'arbih_1st_corps',
        operation_name: 'Unassessed Supply Operation',
        faction: 'RBiH',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 0,
        participating_brigades: ['arbih_101_brigade'],
        objectives_count: 1,
        objectives_captured: 0,
        attacks: 0,
        weekly_log_length: 0,
      },
    ] as LoadedGameState['activeOperations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));
    expect(container.textContent).toMatch(/Ops Supply Readiness\s*—/);
    expect(container.textContent).not.toMatch(/Ops Supply Readiness\s*0%/);
  });

  it('preserves explicit zero operation supply readiness', () => {
    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));
    expect(container.textContent).toContain('0%');
  });

  it('disables Corps Front command controls when the desktop command bridge is unavailable', () => {
    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect((screen.getByRole('button', { name: '0.5x' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '1.0x' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '1.5x' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Tighten sector security/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain('Desktop command bridge unavailable');
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
      combat_defense_per_edge: 900,
      combat_strength_class: 'adequate',
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
    expect(container.textContent).not.toMatch(/Adequate|Strong|Fortress/i);
  });

  it('does not describe reserve-only sectors as a friendly front line', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: ['arbih_101_brigade'],
      rear_brigade_ids: [],
      threat_ratio: 0.3,
      combat_personnel: 1200,
      combat_offensive_power: 600,
      combat_defensive_power: 1200,
      combat_defense_per_edge: 900,
      combat_strength_class: 'adequate',
      defensive_power: 1200,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/No friendly line/i);
    expect(container.textContent).not.toMatch(/SUPERIOR|clear advantage/i);
    expect(container.textContent).not.toMatch(/Adequate|Strong|Fortress/i);

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));
    expect(container.textContent).toMatch(/Total manpower\s*1[,.]200/i);
    expect(container.textContent).toMatch(/Reserve ratio\s*100%/i);
  });

  it('includes rear support elements in Corps Front logistics manpower', () => {
    const state = makeState();
    state.formations = [
      ...state.formations,
      {
        id: 'arbih_rear_support',
        faction: 'RBiH',
        name: 'Rear Support Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 5,
        createdTurn: 0,
        tags: [],
        personnel: 500,
        location_osid: 'op:sarajevo:centar_1',
        corps_id: 'arbih_1st_corps',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['arbih_rear_support'],
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));
    expect(container.textContent).toMatch(/Total manpower\s*500/i);
  });

  it('sanitizes raw sector labels in Corps Front', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      display_name: 'sector:arbih_1st_corps:0',
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({ loadedGameState: state });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toContain('Assigned sector');
    expect(container.textContent).not.toMatch(/sector:|arbih_1st_corps|1st Corps 0/i);
  });

  it('does not invent a defensive stance when sector stance is unreported', () => {
    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Sector Stance:\s*Unreported/i);
    expect(container.textContent).not.toMatch(/Sector Stance:\s*Defend/i);
  });

  it('uses current field assignment metrics when sector combat metrics are stale or absent', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      combat_personnel: 0,
      combat_morale_avg: undefined,
      combat_cohesion_avg: undefined,
      combat_fatigue_avg: undefined,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(screen.getByTestId('corps-front-combat-personnel').textContent).toMatch(/1[,.]200/);
    expect(screen.getByTestId('corps-front-combat-morale').textContent).toContain('64');
    expect(screen.getByTestId('corps-front-combat-cohesion').textContent).toContain('70');
    expect(screen.getByTestId('corps-front-combat-fatigue').textContent).toContain('5');
  });

  it('does not redact friendly force truth when hostile intel confidence is low', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      intel_confidence: 0.1,
      combat_personnel: 1200,
      combat_morale_avg: 64,
      combat_cohesion_avg: 70,
      combat_fatigue_avg: 5,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(screen.getByTestId('corps-front-combat-personnel').textContent).toMatch(/1[,.]200/);
    expect(screen.getByTestId('corps-front-combat-morale').textContent).toContain('64');
    expect(screen.getByTestId('corps-front-combat-cohesion').textContent).toContain('70');
    expect(screen.getByTestId('corps-front-combat-fatigue').textContent).toContain('5');

    fireEvent.click(screen.getByRole('tab', { name: /Order of battle/i }));
    expect(screen.getByTestId('corps-front-brigade-row').textContent).toMatch(/1[,.]200/);

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));
    expect(container.textContent).toMatch(/Total manpower\s*1[,.]200/i);
    expect(container.textContent).toMatch(/Reserve ratio\s*0%/i);
  });

  it('does not collapse known friendly line strength to a dash when strength class is unreported', () => {
    const state = makeState();
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      combat_strength_class: undefined,
      combat_personnel: 1200,
      combat_offensive_power: 600,
      combat_defensive_power: 1200,
      combat_defense_per_edge: 1200,
    }] as LoadedGameState['corpsFrontSectors'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Strength\s*Friendly line reported/i);
    expect(container.textContent).not.toMatch(/Strength\s*—/i);
  });

  it('includes command-directed brigades in Corps Front logistics manpower', () => {
    const state = makeState();
    state.formations = [
      ...state.formations,
      {
        id: 'arbih_directed_brigade',
        faction: 'RBiH',
        name: 'Directed Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 70,
        fatigue: 5,
        morale: 60,
        createdTurn: 0,
        tags: [],
        personnel: 900,
        location_osid: 'op:sarajevo:dobrinja_1',
        corps_id: 'arbih_1st_corps',
        sectorOverrideId: 'sector:arbih_1st_corps:0',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = [{
      ...state.corpsFrontSectors![0],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
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

    fireEvent.click(screen.getByRole('tab', { name: /Logistics/i }));

    expect(container.textContent).toContain('900');
    expect(container.textContent).not.toMatch(/Total manpower\s*0/i);
  });

  it('labels Corps Front metadata with a true turn number instead of a second date', () => {
    const state = makeState();
    state.turn = 8;
    state.label = '8 APR 1992';
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Date:\s*1 Jun 1992/i);
    expect(container.textContent).toMatch(/Turn:\s*8/i);
    expect(container.textContent).not.toMatch(/Turn:\s*\d+\s+\w+\s+1991/i);
  });

  it('routes operation objective focus through settlement inspection and clears stale shell context', () => {
    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops Snapshot/i }));
    fireEvent.click(screen.getByRole('button', { name: /Focus map on objective/i }));

    const store = useGameStore.getState();
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(store.selectedFormationId).toBeNull();
    expect(store.selectedOperationKey).toBeNull();
    expect(store.codexOpen).toBe(false);
    expect(store.chronicleOpen).toBe(false);
    expect(store.focusedAftermathTurn).toBeNull();
    expect(store.focusedOperationHistoryId).toBeNull();
  });

  it('renders unknown commander assessment as unreported instead of title-cased enum copy', () => {
    const state = makeState();
    state.operations = ([{
      ...state.operations![0],
      phase: 'planning',
      preparation_sub_phase: 'assessment',
      commander_assessment: 'wait_for_terrain_probe',
    }] as unknown) as LoadedGameState['operations'];
    state.activeOperations = ([{
      ...state.activeOperations![0],
      phase: 'planning',
      preparation_sub_phase: 'assessment',
      commander_assessment: 'wait_for_terrain_probe',
    }] as unknown) as LoadedGameState['activeOperations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops Snapshot/i }));
    expect(container.textContent).toContain('Cdr Assessment: Unreported');
    expect(container.textContent).not.toMatch(/Wait For Terrain Probe|wait_for_terrain_probe/i);
  });

  it('renders unknown operation prep phase as unreported instead of title-cased enum copy', () => {
    const state = makeState();
    state.operations = ([{
      ...state.operations![0],
      phase: 'planning',
      preparation_sub_phase: 'waiting_for_bridge_report',
      commander_assessment: 'launch',
    }] as unknown) as LoadedGameState['operations'];
    state.activeOperations = ([{
      ...state.activeOperations![0],
      phase: 'planning',
      preparation_sub_phase: 'waiting_for_bridge_report',
      commander_assessment: 'launch',
    }] as unknown) as LoadedGameState['activeOperations'];
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops Snapshot/i }));
    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toMatch(/Waiting For Bridge Report|waiting_for_bridge_report/i);
  });

  it('renders unknown corps stance as unreported instead of title-cased enum copy', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => formation.id === 'arbih_1st_corps'
      ? { ...formation, corpsStance: 'wait_for_orders' }
      : formation);
    useGameStore.setState({
      loadedGameState: state,
      selectedCorpsId: 'arbih_1st_corps',
      selectedCorpsFrontSectorId: 'sector:arbih_1st_corps:0',
    });

    const { container } = render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).toMatch(/Corps Stance:\s*Unreported/i);
    expect(container.textContent).not.toMatch(/Wait For Orders|wait_for_orders/i);
  });

  it('disables draft directive without the desktop command bridge', () => {
    render(React.createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: /Ops Snapshot/i }));
    const directiveButton = screen.getByTestId('corps-front-draft-directive') as HTMLButtonElement;
    expect(directiveButton.disabled).toBe(true);
  });
});
