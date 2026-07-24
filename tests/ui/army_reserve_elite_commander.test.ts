// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArmyReservePanel } from '../../src/ui/map/components/ArmyReservePanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

function makeReserveState(onLoan: boolean): LoadedGameState {
  return {
    label: 'Army reserve elite commander test',
    turn: 16,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'arbih_general_staff',
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
        id: 'arbih_1st_corps',
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
        id: 'arbih_guards_brigade',
        faction: 'RBiH',
        name: 'Guards Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 64,
        fatigue: 3,
        status: 'active',
        createdTurn: 12,
        tags: [],
        corps_id: 'arbih_general_staff',
        location_osid: 'op:visoko:visoko_2',
        personnel: 480,
        eliteLoanState: {
          on_loan: onLoan,
          loaned_to_corps: onLoan ? 'arbih_1st_corps' : null,
          loan_start_turn: onLoan ? 12 : null,
          turns_deployed: onLoan ? 4 : 0,
          in_cooldown: false,
          permanently_degraded: false,
          current_episode_id: onLoan ? 1 : null,
          base_osid: 'op:visoko:visoko_2',
        },
        eliteCommander: {
          name: 'Dzevad Rado',
          competence: 4,
          aggressiveness: 3,
          defensive_skill: 3,
          origin: 'military',
        },
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
  } as LoadedGameState;
}

describe('ArmyReservePanel elite commander identity', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeReserveState(false),
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
      osidDisplayNames: { 'op:visoko:visoko_2': 'Visoko' },
    });
  });

  afterEach(() => {
    cleanup();
    setLocale('en', undefined);
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('shows elite commander identity in the reserve pool without raw origin ids', () => {
    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Elite commander');
    expect(copy).toContain('Dzevad Rado');
    expect(copy).toContain('Command 4');
    expect(copy).toContain('Tempo 3');
    expect(copy).toContain('Defense 3');
    expect(copy).not.toMatch(/\borigin\b|\bmilitary\b/i);
    expect(screen.getByRole('button', { name: /^Inspect Guards Brigade$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Inspect active loan Guards Brigade$/i })).toBeNull();
  });

  it('shows elite commander identity in active loan snapshots', () => {
    useGameStore.setState({
      loadedGameState: makeReserveState(true),
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));
    const copy = container.textContent ?? '';

    expect(copy).toContain('Active Loans (1)');
    expect(copy).toContain('Elite commander');
    expect(copy).toContain('Dzevad Rado');
    expect(screen.getByRole('button', { name: /^Inspect active loan Guards Brigade$/i })).toBeTruthy();
  });

  it('lets active-loan snapshot rows inspect the loaned brigade with settlement context', () => {
    useGameStore.setState({
      loadedGameState: makeReserveState(true),
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
      selectedOsid: null,
    });

    const { getByTestId } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    fireEvent.click(getByTestId('army-reserve-active-loan-inspect-arbih_guards_brigade'));

    const state = useGameStore.getState();
    expect(state.selectedFormationId).toBe('arbih_guards_brigade');
    expect(state.selectedArmyHqId).toBe('arbih_general_staff');
    expect(state.selectedOsid).toBe('op:visoko:visoko_2');
  });

  it('renders missing reserve personnel as unreported instead of a critical red bar', () => {
    const state = makeReserveState(false);
    state.formations = state.formations.map((formation) => formation.id === 'arbih_guards_brigade'
      ? { ...formation, personnel: undefined } as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    expect(container.textContent ?? '').toMatch(/Personnel\s*Unreported/);
    expect(container.innerHTML).not.toContain('#d45555');
  });

  it('renders missing loaned command as unreported in the visible reserve-pool row', () => {
    const state = makeReserveState(true);
    state.formations = state.formations.map((formation) => formation.id === 'arbih_guards_brigade'
      ? {
          ...formation,
          eliteLoanState: {
            ...formation.eliteLoanState!,
            loaned_to_corps: null,
          },
        } as LoadedGameState['formations'][number]
      : formation);
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    const { container } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    expect(container.textContent ?? '').toContain('Assigned command unreported');
    expect(screen.getByRole('button', { name: 'Recall Guards Brigade from Assigned command unreported' })).toBeTruthy();
    expect(container.textContent ?? '').not.toContain('Assigned command (');
  });

  it('exposes campaign history as a stateful disclosure control', () => {
    const state = makeReserveState(false);
    state.eliteBrigadeTracker = {
      arbih_guards_brigade: {
        total_loans: 1,
        total_turns_deployed: 4,
        total_battles: 1,
        total_casualties_taken: 3,
        total_osids_captured: 0,
        episodes: [{
          episode_id: 1,
          corps_id: 'arbih_1st_corps',
          reason: 'defensive_gap',
          loan_start_turn: 12,
          loan_end_turn: 15,
          recall_reason: 'op_complete',
          travel_hops: 0,
          personnel_start: 1200,
          casualties_taken: 3,
          battles_fought: 1,
          osids_captured: 0,
        }],
      },
    };
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    const toggle = screen.getByRole('button', { name: 'Collapse campaign history' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const detailId = toggle.getAttribute('aria-controls');
    expect(detailId).toBeTruthy();
    expect(document.getElementById(detailId!)).toBeTruthy();

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Expand campaign history' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('routes a suggested pending reserve request to the Decision Room release card', () => {
    const onOpenDecisionRoomTarget = vi.fn();
    const state = makeReserveState(false);
    state.commandAuthority = { current: 30, max: 100, spentThisTurn: 0, lifetimeSpent: 0 } as LoadedGameState['commandAuthority'];
    state.pendingReserveRequests = [{
      request_id: 'req-arbih-1',
      corps_id: 'arbih_1st_corps',
      faction: 'RBiH',
      reason: 'defensive_gap',
      purpose: 'defensive',
      priority: 82,
      severityBand: 'critical',
      travel_hops: 2,
      description: '1st Corps requests reserve support.',
      suggested_brigade_id: 'arbih_guards_brigade',
      turn_requested: 16,
    }];
    state.corpsFrontSectors = [{
      sector_id: 'sector:sarajevo:north',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      display_name: 'Sarajevo North',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      edge_ids: [],
      sub_segment_count: 1,
      length_edges: 1,
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
    }];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    render(React.createElement(ArmyReservePanel, { railSlot: 'primary', onOpenDecisionRoomTarget }));

    const detail = screen.getByTestId('army-reserve-request-presentation-req-arbih-1');
    expect(detail.className).toContain('text-[12px]');
    expect(detail.getAttribute('aria-label')).toBe('Reserve request detail for 1st Corps');
    expect(detail.textContent).toContain('Requesting command1st Corps');
    expect(detail.textContent).toContain('Recipient sectorSarajevo North');
    expect(detail.textContent).toContain('Candidate forceGuards Brigade');
    expect(detail.textContent).toContain('ReadinessReady');
    expect(detail.textContent).toContain('Travel timeabout 1 week travel');
    expect(detail.textContent).toContain('Expected effectAnchor the thinnest sector-front line and stabilize local defensive depth.');
    expect(detail.textContent).toContain('Opportunity cost0 ready reserve formations remain; Visoko loses this immediate strategic-reserve fallback.');

    fireEvent.click(screen.getByRole('button', {
      name: 'Review Guards Brigade reserve release for 1st Corps',
    }));

    expect(onOpenDecisionRoomTarget).toHaveBeenCalledWith({
      kind: 'decision-room',
      lens: 'command',
      cardId: 'command:elite-deploy:req-arbih-1',
    });
  });

  it('keeps reserve request detail labels and unavailable truth in BCS', () => {
    setLocale('bcs', undefined);
    const state = makeReserveState(false);
    state.pendingReserveRequests = [{
      request_id: 'req-arbih-sparse',
      corps_id: 'arbih_1st_corps',
      faction: 'RBiH',
      reason: 'unknown',
      priority: 45,
      severityBand: 'routine',
      travel_hops: -1,
      description: '',
      suggested_brigade_id: null,
      turn_requested: 16,
    }];
    useGameStore.setState({
      loadedGameState: state,
      selectedArmyHqId: 'arbih_general_staff',
      selectedFormationId: 'arbih_general_staff',
    });

    render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    const detail = screen.getByTestId('army-reserve-request-presentation-req-arbih-sparse');
    expect(detail.textContent).toContain('Komanda koja trazi1st Corps');
    expect(detail.textContent).toContain('Sektor primateljNije prijavljeno');
    expect(detail.textContent).toContain('Predlozena snagaNije prijavljeno');
    expect(detail.textContent).toContain('SpremnostNije prijavljeno');
    expect(detail.textContent).toContain('Vrijeme putovanjaNije prijavljeno');
  });
});
