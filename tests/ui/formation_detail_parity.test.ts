// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
  getPlayerSafeFormationPostureLabel,
  getPlayerSafeSectorStanceLabel,
} from '../../src/ui/map/utils/playerSafeText.js';

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
        municipalityId: 'vogosca',
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
        morale: 58,
        officer_quality: 0.64,
        posture: 'defend',
        eliteCommander: {
          name: 'Dzevad Rado',
          competence: 4,
          aggressiveness: 3,
          defensive_skill: 3,
          origin: 'military',
        },
      },
      {
        id: 'rbih_moving_brigade',
        faction: 'RBiH',
        name: 'Moving Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 62,
        fatigue: 4,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        movementStatus: 'packing',
        movementStance: 'hold',
        personnel: 1000,
        posture: 'defend',
      },
      {
        id: 'rbih_record_brigade',
        faction: 'RBiH',
        name: 'Record Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 66,
        fatigue: 2,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        personnel: 1100,
        posture: 'defend',
        recent_engagements: [
          {
            turn: 7,
            osid: 'op:test_sector:known',
            role: 'attacker',
            outcome: 'decisive_victory',
            casualties_taken: 10,
            casualties_inflicted: 20,
            territory_flipped: true,
          },
          {
            turn: 9,
            osid: 'op:test_sector:unknown',
            role: 'defender',
            outcome: 'probe_failed_badly',
            casualties_taken: 5,
            casualties_inflicted: 8,
            territory_flipped: false,
          },
          {
            turn: 8,
            osid: 'op:test_sector:middle',
            role: 'attacker',
            outcome: 'victory',
            casualties_taken: 7,
            casualties_inflicted: 11,
            territory_flipped: false,
          },
        ],
      },
      {
        id: 'rbih_rear_brigade',
        faction: 'RBiH',
        name: 'Rear Brigade',
        kind: 'brigade',
        readiness: 'forming',
        cohesion: 55,
        fatigue: 1,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        personnel: 900,
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
        rear_brigade_ids: ['rbih_rear_brigade'],
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

  it('renders known municipality slugs as player-facing names', () => {
    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Home municipality: Vogosca');
    expect(copy).not.toContain('Home municipality: vogosca');
  });

  it('shows recent engagements newest first', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_record_brigade' });
    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Record' }));

    const copy = view.container.textContent ?? '';
    expect(copy.indexOf('8 Jun 1992')).toBeLessThan(copy.indexOf('1 Jun 1992'));
    expect(copy.indexOf('1 Jun 1992')).toBeLessThan(copy.indexOf('25 May 1992'));
  });

  it('does not persist an override when clicking the automatic current sector row', () => {
    render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    fireEvent.click(screen.getByRole('button', { name: /Northern line/i }));

    expect(assignBrigadeToSector).not.toHaveBeenCalled();
  });

  it('resets to overview when the selected formation changes', async () => {
    render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    expect(screen.getByRole('tab', { name: 'Orders' }).getAttribute('aria-selected')).toBe('true');

    useGameStore.setState({ selectedFormationId: 'rbih_record_brigade' });

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true'));
    expect(screen.getByText('Record Brigade')).toBeTruthy();
  });

  it('preserves settlement context when drilling into parent corps or sector', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? { ...formation, location_osid: 'op:sarajevo:dobrinja_1' }
      : formation);
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('button', { name: /1st Corps/i }));
    expect(useGameStore.getState().selectedOsid).toBe('op:sarajevo:dobrinja_1');

    useGameStore.setState({ selectedFormationId: 'rbih_heroic_brigade', selectedOsid: null });
    fireEvent.click(screen.getByRole('button', { name: /Northern line/i }));
    expect(useGameStore.getState().selectedOsid).toBe('op:sarajevo:dobrinja_1');
  });

  it('does not expose sector assignment controls for non-fielded brigades', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? { ...formation, status: 'destroyed', readiness: 'destroyed', sectorOverrideId: 'sector_south' }
      : formation);
    useGameStore.setState({ loadedGameState: state });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    expect(view.container.textContent).not.toContain('Sector assignment');
    expect(screen.queryByText('Clear override')).toBeNull();
    expect(screen.queryByRole('button', { name: /Southern line/i })).toBeNull();
  });

  it('does not expose sector assignment controls for active-but-forming brigades', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_rear_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    expect(view.container.textContent).not.toContain('Sector assignment');
    expect(screen.queryByText('Clear override')).toBeNull();
    expect(screen.queryByRole('button', { name: /Northern line/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Southern line/i })).toBeNull();
  });

  it('renders corps posture and exhaustion without brigade defaults or double scaling', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_1st_corps'
      ? { ...formation, corpsStance: undefined, corpsExhaustion: 12.5 }
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_1st_corps' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Stance unreported');
    expect(copy).toContain('13%');
    expect(copy).not.toContain('Hold');
    expect(copy).not.toContain('1250%');
  });

  it('does not invent a field posture for army headquarters', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_general_staff' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Command posture unreported');
    expect(copy).not.toContain('Hold');
  });

  it('presents a player override sector as the active assignment instead of the stale roster sector', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? { ...formation, sectorOverrideId: 'sector_south' }
      : formation);
    useGameStore.setState({ loadedGameState: state });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    const overviewCopy = view.container.textContent ?? '';
    expect(overviewCopy).toContain('Southern line');
    expect(overviewCopy).not.toContain('Northern lineOverride');

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    const southButton = screen.getByRole('button', { name: /Southern line/i });
    const northButton = screen.getByRole('button', { name: /Northern line/i });

    expect(southButton.textContent ?? '').toContain('Override');
    expect(southButton.textContent ?? '').not.toContain('Current');
    expect(northButton.textContent ?? '').not.toContain('Current');
  });

  it('uses shared sector assignment projection for current sector ownership', () => {
    const state = makeFormationDetailState();
    state.formations = [
      ...state.formations,
      {
        id: 'rbih_override_brigade',
        faction: 'RBiH',
        name: 'Override Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 62,
        fatigue: 4,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        personnel: 1000,
        posture: 'defend',
        sectorOverrideId: 'sector_south',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = state.corpsFrontSectors?.map((sector) => sector.sector_id === 'sector_north'
      ? { ...sector, assigned_brigade_ids: ['rbih_heroic_brigade', 'rbih_override_brigade'] }
      : sector);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_override_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Southern line');
    expect(copy).toContain('Override');
    expect(copy).not.toContain('Northern line');
  });

  it('uses projected current brigade counts in the sector assignment picker', () => {
    const state = makeFormationDetailState();
    state.formations = [
      ...state.formations,
      {
        id: 'rbih_override_brigade',
        faction: 'RBiH',
        name: 'Override Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 62,
        fatigue: 4,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        personnel: 1000,
        posture: 'defend',
        sectorOverrideId: 'sector_south',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = state.corpsFrontSectors?.map((sector) => {
      if (sector.sector_id === 'sector_north') {
        return { ...sector, assigned_brigade_ids: ['rbih_heroic_brigade', 'rbih_override_brigade'] };
      }
      if (sector.sector_id === 'sector_south') {
        return { ...sector, reserve_brigade_ids: ['rbih_rear_brigade'] };
      }
      return sector;
    });
    useGameStore.setState({ loadedGameState: state });

    render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    const southButton = screen.getByRole('button', { name: /Southern line/i });
    const northButton = screen.getByRole('button', { name: /Northern line/i });
    expect(southButton.textContent ?? '').toContain('1 current brigade');
    expect(southButton.textContent ?? '').not.toContain('1 current brigades');
    expect(southButton.getAttribute('aria-label')).toBe('Southern line, 1 current brigade');
    expect(southButton.textContent ?? '').not.toMatch(/\b0b\b/);
    expect(northButton.textContent ?? '').toContain('1 current brigade');
    expect(northButton.textContent ?? '').not.toContain('1 current brigades');
    expect(northButton.getAttribute('aria-label')).toBe('Northern line, 1 current brigade');
    expect(northButton.textContent ?? '').not.toContain('2 current brigades');
  });

  it('describes sector overrides as command responsibility rather than physical movement orders', () => {
    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('sector command responsibility');
    expect(copy).toContain('physical movement remains governed by field orders');
    expect(copy).not.toMatch(/new frontline position/i);
  });

  it('exposes sector picker proof hooks for zero-current options', () => {
    const state = makeFormationDetailState();
    state.corpsFrontSectors = state.corpsFrontSectors?.map((sector) => sector.sector_id === 'sector_south'
      ? { ...sector, assigned_brigade_ids: [], reserve_brigade_ids: [], rear_brigade_ids: [] }
      : sector);
    useGameStore.setState({ loadedGameState: state });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    const southButton = view.container.querySelector('[data-testid="formation-detail-sector-option"][data-sector-id="sector_south"]');
    expect(southButton).not.toBeNull();
    expect(southButton?.getAttribute('data-current-brigade-count')).toBe('0');
    expect(southButton?.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(southButton?.getAttribute('data-rear-brigade-count')).toBe('0');
    expect(southButton?.getAttribute('aria-label')).toContain('Southern line');
    expect(southButton?.textContent ?? '').toContain('0 current brigades');
  });

  it('keeps rear support out of sector picker current counts', () => {
    const state = makeFormationDetailState();
    state.formations = [
      ...state.formations,
      {
        id: 'rbih_ready_rear_support',
        faction: 'RBiH',
        name: 'Ready Rear Support',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 62,
        fatigue: 4,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        personnel: 1000,
        posture: 'defend',
      },
    ] as LoadedGameState['formations'];
    state.corpsFrontSectors = state.corpsFrontSectors?.map((sector) => sector.sector_id === 'sector_south'
      ? { ...sector, assigned_brigade_ids: [], reserve_brigade_ids: [], rear_brigade_ids: ['rbih_ready_rear_support'] }
      : sector);
    useGameStore.setState({ loadedGameState: state });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    const southButton = view.container.querySelector('[data-testid="formation-detail-sector-option"][data-sector-id="sector_south"]');
    expect(southButton).not.toBeNull();
    expect(southButton?.getAttribute('data-current-brigade-count')).toBe('0');
    expect(southButton?.getAttribute('data-frontline-brigade-count')).toBe('0');
    expect(southButton?.getAttribute('data-rear-brigade-count')).toBe('1');
    expect(southButton?.textContent ?? '').toContain('0 current brigades');
  });

  it('does not badge a stale missing override as the active sector assignment', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? { ...formation, sectorOverrideId: 'sector_missing' }
      : formation);
    useGameStore.setState({ loadedGameState: state });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));

    const overviewCopy = view.container.textContent ?? '';
    expect(overviewCopy).toContain('Northern line');
    expect(overviewCopy).not.toContain('Northern lineOverride');
  });

  it('uses the actual HQ parent name for army-HQ assigned brigades', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_hq_guard_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('General Staff ARBiH');
    expect(copy).not.toContain('Assigned command');
  });

  it('shows elite brigade commander identity without raw sidecar origin ids', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_hq_guard_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Elite commander');
    expect(copy).toContain('Dzevad Rado');
    expect(copy).toContain('Command 4');
    expect(copy).toContain('Tempo 3');
    expect(copy).toContain('Defense 3');
    expect(copy).not.toMatch(/\borigin\b|\bmilitary\b/i);
  });

  it('labels brigade lifecycle state separately from force readiness', () => {
    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Lifecycle:');
    expect(copy).not.toContain('Readiness:Ready');
  });

  it('renders unreported lifecycle and condition metrics without readiness-pending or zero fallbacks', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? {
        ...formation,
        readiness: 'unreported',
        cohesion: undefined,
        fatigue: undefined,
      } as unknown as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_heroic_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Lifecycle:Unreported');
    expect(copy).toContain('CohesionUnreported');
    expect(copy).toContain('FatigueUnreported');
    expect(copy).not.toContain('Readiness pending');
    expect(copy).not.toContain('Cohesion0');
    expect(copy).not.toContain('Fatigue0');
  });

  it('renders missing morale and personnel as unreported detail rows', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? {
        ...formation,
        morale: undefined,
        personnel: undefined,
      } as unknown as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_heroic_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('MoraleUnreported');
    expect(copy).toContain('PersonnelUnreported');
  });

  it('does not synthesize zero combat or loss records when brigade records are absent', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? {
        ...formation,
        campaignKia: undefined,
        campaignWia: undefined,
        campaignMia: undefined,
        combatSummary: undefined,
      } as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_heroic_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Record' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Campaign Losses');
    expect(copy).toContain('KilledUnreported');
    expect(copy).toContain('WoundedUnreported');
    expect(copy).toContain('Missing or capturedUnreported');
    expect(copy).toContain('No combat record');
    expect(copy).toContain('No brigade combat record has reached headquarters.');
    expect(copy).not.toMatch(/Killed0|Wounded0|Missing or captured0/);
    expect(copy).not.toMatch(/Battles\s*0|Win Rate\s*0\.0%|Men Lost\s*0/i);
  });

  it('setup-labels turn-zero captured territory history instead of narrating it as campaign history', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? {
        ...formation,
        notableMoments: [
          { turn: 0, description: 'Captured op:test:before_start before play began.' },
          { turn: 3, description: 'Held the line after staff review.' },
        ],
      } as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_heroic_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Record' }));

    const copy = view.container.textContent ?? '';
    expect(copy).toContain('Setup record:');
    expect(copy).toContain('Initial deployment record before player command.');
    expect(copy).toContain('Held the line after staff review.');
    expect(copy).not.toContain('Captured');
    expect(copy).not.toContain('before play began');
  });

  it('renders sparse equipment condition as unreported instead of crashing', () => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_heroic_brigade'
      ? {
        ...formation,
        composition: {
          tanks: 3,
          artillery: 2,
          aa_systems: 0,
        },
      } as unknown as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({ loadedGameState: state, selectedFormationId: 'rbih_heroic_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('TO&E (Equipment)');
    expect(copy).toContain('Tanks');
    expect(copy).toContain('Artillery');
    expect(copy).toContain('Condition unreported');
    expect(copy).not.toMatch(/NaN|undefined|\[object Object\]/);
  });

  it('labels rear sector ownership distinctly and recognizes forming readiness', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_rear_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Southern line');
    expect(copy).toContain('Rear/support');
    expect(copy).toContain('Lifecycle:Forming');
    expect(copy).not.toContain('Readiness pending');
  });

  it('uses player-facing effectiveness modifier labels', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_hq_guard_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Distance from home 70%');
    expect(copy).not.toContain('homeDistance');
  });

  it.each([
    ['packing', 'Preparing to move'],
    ['in_transit', 'In transit'],
    ['unpacking', 'Deploying into position'],
  ] as const)('uses explicit player-facing movement copy for %s', (movementStatus, label) => {
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => formation.id === 'rbih_moving_brigade'
      ? { ...formation, movementStatus }
      : formation);
    useGameStore.setState({
      loadedGameState: state,
      selectedFormationId: 'rbih_moving_brigade',
    });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain(label);
    expect(copy).not.toContain('Packing');
    expect(copy).not.toContain('In Transit');
    expect(copy).not.toContain('Unpacking');
  });

  it('renders movement stance through a full player-facing label without a hardcoded march suffix', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_moving_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Movement stance: hold the line');
    expect(copy).not.toMatch(/\bHold march\b|\bmarch\)/i);
  });

  it('recognizes canonical formation postures and sector stances as player-facing copy', () => {
    const postureLabels = [
      getPlayerSafeFormationPostureLabel('dig_in'),
      getPlayerSafeFormationPostureLabel('counterattack'),
      getPlayerSafeFormationPostureLabel('elastic_defense'),
      getPlayerSafeFormationPostureLabel('defend_at_all_costs'),
      getPlayerSafeFormationPostureLabel('assault'),
    ];
    const stanceLabels = [
      getPlayerSafeSectorStanceLabel('defensive'),
      getPlayerSafeSectorStanceLabel('balanced'),
      getPlayerSafeSectorStanceLabel('offensive'),
    ];

    expect(postureLabels).toEqual([
      'Digging in',
      'Counterattacking',
      'Elastic defense',
      'Defending at all costs',
      'Assaulting',
    ]);
    expect(stanceLabels).toEqual([
      'defensive posture',
      'balanced posture',
      'offensive posture',
    ]);
    expect([...postureLabels, ...stanceLabels]).not.toContain('Posture pending');
    expect([...postureLabels, ...stanceLabels]).not.toContain('review posture');
  });

  it('disables formation command controls when the desktop command bridge is unavailable', () => {
    delete (window as unknown as { awwv?: unknown }).awwv;
    const state = makeFormationDetailState();
    state.formations = state.formations.map((formation) => {
      if (formation.id === 'rbih_hq_guard_brigade') {
        return {
          ...formation,
          eliteLoanState: {
            on_loan: true,
            loaned_to_corps: 'rbih_1st_corps',
            loan_start_turn: 1,
            turns_deployed: 3,
            in_cooldown: false,
            permanently_degraded: false,
            current_episode_id: 1,
            base_osid: 'op:test:hq',
          },
        };
      }
      return formation.id === 'rbih_heroic_brigade'
        ? { ...formation, sectorOverrideId: 'sector_south' }
        : formation;
    });
    useGameStore.setState({
      loadedGameState: state,
      selectedFormationId: 'rbih_hq_guard_brigade',
    });

    render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    expect((screen.getByRole('button', { name: /Recall to Reserve/i }) as HTMLButtonElement).disabled).toBe(true);

    useGameStore.setState({ selectedFormationId: 'rbih_heroic_brigade' });
    cleanup();
    render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));
    expect((screen.getByRole('button', { name: /Clear Override/i }) as HTMLButtonElement).disabled).toBe(true);
    const southButton = screen.getAllByTestId('formation-detail-sector-option')
      .find((button) => button.getAttribute('data-sector-id') === 'sector_north') as HTMLButtonElement | undefined;
    expect(southButton?.disabled).toBe(true);
  });

  it('uses shared combat labels and neutral fallback copy for recent engagement outcomes', () => {
    useGameStore.setState({ selectedFormationId: 'rbih_record_brigade' });

    const view = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Record' }));
    const copy = view.container.textContent ?? '';

    expect(copy).toContain('Decisive');
    expect(copy).toContain('Engagement recorded');
    expect(copy).not.toContain('Decisive Victory');
    expect(copy).not.toContain('Probe Failed Badly');
    expect(copy).not.toContain('probe_failed_badly');
  });
});
