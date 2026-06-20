// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandRelationshipSection } from '../../src/ui/map/components/army_hq/CommandRelationshipSection';
import { OperationOpportunityDossierPanel } from '../../src/ui/map/components/army_hq/OperationOpportunityDossierPanel';
import { OperationsSection } from '../../src/ui/map/components/army_hq/OperationsSection';
import { PresidentialAttentionPanel } from '../../src/ui/map/components/army_hq/PresidentialAttentionPanel';
import type { LoadedGameState, OperationOpportunityProposalView, OperationView } from '../../src/ui/map/data/types';
import { setLocale } from '../../src/ui/map/i18n';
import { turnToDateString } from '../../src/ui/map/utils/formatters';

const storeState: Record<string, any> = {
  armyHQExpandedSections: {},
  toggleArmyHQSection: (sectionKey: string) => {
    storeState.armyHQExpandedSections[sectionKey] = !storeState.armyHQExpandedSections[sectionKey];
  },
  setLoadError: () => {},
  setOperationBriefingContext: () => {},
  setOperationTargetOsids: () => {},
  osidDisplayNames: {},
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
  useGameStore: Object.assign(
    (selector: (s: any) => any) => selector(storeState),
    {
      getState: () => storeState,
      setState: (partial: any) => { Object.assign(storeState, partial); },
      subscribe: () => () => {},
    },
  ),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
  useIPC: () => ({ isAvailable: false }),
}));

function makeOperation(overrides: Partial<OperationView> = {}): OperationView {
  return {
    corps_id: 'arbih_3rd_corps',
    corps_name: '3rd Corps',
    faction: 'RBiH',
    name: 'operation_ridge',
    display_name: 'Operation Ridge',
    type: 'offensive',
    phase: 'execution',
    objectives: [],
    momentum: 0,
    phase_started_turn: 5,
    participating_brigade_count: 0,
    participating_brigade_ids: [],
    started_turn: 5,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    turn: 12,
    phase: 'war',
    formations: [],
    namedOfficerData: [],
    latestTurnSummary: null,
    turnSummaries: [],
    operationHistory: [
      {
        operation_id: 'aar_operation_ridge',
        operation_name: 'operation_ridge',
        corps_id: 'arbih_3rd_corps',
        faction: 'RBiH',
        started_turn: 3,
        ended_turn: 7,
        outcome: 'completed',
        objectives_targeted: [],
        objectives_captured: [],
        total_attacks: 2,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        grade: { stars: 3, verdict: 'orderly', factors: {} },
        duration_turns: 4,
        weekly_log: [],
      },
    ],
    ...overrides,
  } as unknown as LoadedGameState;
}

function makeOpportunity(overrides: Partial<OperationOpportunityProposalView> = {}): OperationOpportunityProposalView {
  return {
    proposal_id: 'opp_alpha',
    opportunity_id: 'sana_95',
    display_name: 'Sana 95',
    faction: 'RBiH',
    status: 'eligible_pending_review',
    eligibility_turn: 22,
    expires_turn: 24,
    review_id: 'review_alpha',
    description: 'Staff believes the window is open.',
    recommendation: 'Authorize',
    proposed_action: 'OPPORTUNITY:opp_alpha',
    required_axes_green: 1,
    required_axes_total: 2,
    optional_axes_green: 0,
    optional_axes_total: 1,
    prerequisite_axes: [],
    force_quality_traits: [],
    objectives: [],
    staging: [],
    redirect_variants: [],
    available_actions: [],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  storeState.armyHQExpandedSections = {};
  setLocale('en', undefined);
  vi.restoreAllMocks();
});

describe('Army HQ timing copy', () => {
  it('renders operation execution and completed AAR timing as calendar dates', () => {
    render(React.createElement(OperationsSection, {
      corpsId: 'arbih_3rd_corps',
      operations: [makeOperation()],
      gameState: makeGameState(),
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operation Ridge/i }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain(turnToDateString(5));
    expect(copy).toContain(`${turnToDateString(3)} - ${turnToDateString(7)}`);
    expect(copy).not.toContain('W5');
    expect(copy).not.toContain('W3 - W7');
  });

  it('renders corps operation weekly rows without raw operation shorthand', () => {
    storeState.osidDisplayNames = { 'op:ridge:ridge_1': 'Ridge One' };

    render(React.createElement(OperationsSection, {
      corpsId: 'arbih_3rd_corps',
      operations: [makeOperation()],
      gameState: makeGameState({
        operationHistory: [
          {
            ...makeGameState().operationHistory![0],
            weekly_log: [
              {
                turn: 6,
                phase: 'execution',
                attacks_this_turn: 2,
                objectives_captured_this_turn: ['op:ridge:ridge_1'],
                notable_events: ['supply_crisis'],
                casualties_suffered: { killed: 3, wounded: 8 },
                casualties_inflicted: { killed: 4, wounded: 9 },
              },
            ],
          },
        ],
      }),
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operation Ridge/i }));

    const copy = document.body.textContent ?? '';
    const weeklyCopy = copy.slice(copy.indexOf('WEEKLY OPERATIONS LOG'));
    expect(weeklyCopy).toContain('In execution');
    expect(weeklyCopy).toContain('2 attacks');
    expect(weeklyCopy).toContain('Held at close: Ridge One');
    expect(weeklyCopy).toContain('11 casualties');
    expect(weeklyCopy).toContain('13 inflicted');
    expect(weeklyCopy).toContain('Notable development');
    expect(weeklyCopy).not.toMatch(/\b2\s*ATK\b/);
    expect(weeklyCopy).not.toMatch(/\bOBJ\b/);
    expect(weeklyCopy).not.toMatch(/\+13e\b/);
    expect(weeklyCopy).not.toMatch(/supply_crisis/i);
  });

  it('renders expanded operation command details without compact staff shorthand', () => {
    storeState.osidDisplayNames = { 'op:ridge:ridge_1': 'Ridge One' };
    const gameState = makeGameState({
      namedOfficerData: [{
        id: 'op_commander',
        name: 'Commander One',
        faction: 'RBiH',
        rank: 'corps_commander',
        competence: 0.82,
        aggressiveness: 0.61,
        defensive_skill: 0.65,
        political_reliability: 0.5,
        origin: 'historical',
        status: 'active',
        assigned_corps_id: 'arbih_3rd_corps',
        acting_commander: false,
        turns_in_command: 4,
        battles: 3,
        victories: 2,
        operations_commanded: 2,
      }],
      formations: [{
        id: 'bde_1',
        faction: 'RBiH',
        name: '1st Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 65,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        personnel: 900,
        morale: 70,
        disrupted_turns: 1,
      }],
      operationHistory: [{
        ...makeGameState().operationHistory![0],
        objectives_targeted: ['op:ridge:ridge_1'],
        objectives_captured: ['op:ridge:ridge_1'],
        casualties_suffered: { killed: 3, wounded: 8 },
        casualties_inflicted: { killed: 4, wounded: 9 },
      }],
    });

    render(React.createElement(OperationsSection, {
      corpsId: 'arbih_3rd_corps',
      operations: [
        makeOperation({
          commander_officer_id: 'op_commander',
          objectives: ['op:ridge:ridge_1'],
          current_objective_index: 0,
          participating_brigade_count: 1,
          participating_brigade_ids: ['bde_1'],
          axes: [{
            axis_id: 'axis_north',
            name: 'Northern axis',
            assigned_brigades: ['bde_1'],
            objectives: ['op:ridge:ridge_1'],
            current_objective_index: 0,
            status: 'executing',
            momentum: 1.2,
          }],
        }),
        makeOperation({
          name: 'operation_planning',
          display_name: 'Planning Operation',
          phase: 'planning',
          preparation_sub_phase: 'intel_gathering',
          readiness: { intel: 0.75, supply: 0.65, cohesion: 0.55 },
        }),
      ],
      gameState,
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Planning Operation/i }));
    let copy = document.body.textContent ?? '';
    expect(copy).toContain('Intelligence');
    expect(copy).toContain('Supply');
    expect(copy).toContain('Cohesion');

    fireEvent.click(screen.getByRole('button', { name: /Operation Ridge/i }));
    copy = document.body.textContent ?? '';
    expect(copy).toContain('Operation commander:');
    expect(copy).toContain('Corps commander');
    expect(copy).toContain('Competence');
    expect(copy).toContain('Aggression');
    expect(copy).toContain('Defense');
    expect(copy).toContain('Operations');
    expect(copy).toContain('2 wins');
    expect(copy).toContain('Primary objective');
    expect(copy).toContain('Objective');
    expect(copy).toContain('Momentum');
    expect(copy).toContain('Personnel');
    expect(copy).toContain('Morale');
    expect(copy).toContain('Status');
    expect(copy).toContain('Disrupted');
    expect(copy).toContain('3 killed / 8 wounded');
    expect(copy).toContain('4 killed / 9 wounded');
    expect(copy).toContain('4 turns / 2 attacks');
    expect(copy).toContain('1 / 1 held at close');
    expect(copy).not.toContain('corps_commander');
    expect(copy).not.toMatch(/\bCOMP\b|\bAGGR\b|\bDEF\b|\bOPS\b|\bINTEL\b|\bCOHESN\b|\bPRIMARY OBJ\b|\bOBJ\b|\bMOM\b|\bPERS\b|\bCOH\b|\bMOR\b|\bSTS\b|\bCMDR\b|\bKIA\b|\bWIA\b|\b2W\b/);
  });

  it('renders planning preparation timing and delays as player-facing copy', () => {
    render(React.createElement(OperationsSection, {
      corpsId: 'arbih_3rd_corps',
      operations: [makeOperation({
        phase: 'planning',
        preparation_sub_phase: 'intel_gathering',
        preparation_turns_elapsed: 2,
        preparation_max_turns: 4,
        commander_assessment: 'postpone',
        postponement_count: 2,
      })],
      gameState: makeGameState(),
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Operation Ridge/i }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain('Prepared for 2 of 4 weeks');
    expect(copy).toContain('Delayed 2 times');
    expect(copy).not.toContain('T+2');
    expect(copy).not.toContain('DELAYS');
  });

  it('renders command friction and stabilization cooldown timing as calendar dates', () => {
    const { container } = render(React.createElement(CommandRelationshipSection, {
      corpsId: 'arbih_3rd_corps',
      commandStrain: 3,
      commandStrainLabel: 'strained',
      recoveryForecast: null,
      frictionEvents: [{
        compositeKey: 'officer_alpha:11:ignored_order',
        officerId: 'officer_alpha',
        typeLabel: 'Ignored order',
        turn: 11,
        resolved: false,
      }],
      corpsExhaustion: 0,
      delegationSummary: null,
      stabilizationAvailable: false,
      stabilizationCooldownUntil: 15,
      stabilizationCostCA: 10,
      currentTurn: 12,
    }));

    const copy = container.textContent ?? '';
    expect(copy).toContain(turnToDateString(11));
    expect(copy).toContain(turnToDateString(15));
    expect(copy).not.toContain('Wk 11');
    expect(copy).not.toContain('resumes turn 15');

    const stabilize = screen.getByRole('button', { name: /Stabilize Command Relationship/i });
    expect(stabilize.getAttribute('title')).toContain(turnToDateString(15));
    expect(stabilize.getAttribute('title')).not.toContain('resumes turn 15');
  });

  it('renders opportunity review expiry as a calendar date', () => {
    render(React.createElement(OperationOpportunityDossierPanel, {
      gameState: makeGameState({
        operationOpportunityProposals: [makeOpportunity({
          status: 'eligible_pending_review',
          expires_turn: 24,
          recommendation: 'approve',
          prerequisite_axes: [
            { axis: 'axis_north', label: 'Northern Axis', mode: 'optional', green: false, state: 'not_applicable', reason: '' },
          ],
          force_quality_traits: [
            { trait: 'reserve_weight', label: 'Reserve weight', band: 'adequate', reason: 'Enough reserve brigades are near the axis.' },
          ],
        })],
      }),
      playerFaction: 'RBiH',
    }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain(`Review by ${turnToDateString(24)}`);
    expect(copy).toContain('Recommend authorization');
    expect(copy).toContain('Not applicable');
    expect(copy).toContain('Adequate');
    expect(copy).not.toContain('Expires w24');
    expect(copy).not.toMatch(/\bIstice\s+s24\b/);
    expect(copy).not.toContain('approve');
    expect(copy).not.toContain('eligible pending review');
    expect(copy).not.toContain('not applicable');
  });

  it('localizes opportunity dossier labels in BCS without raw proposal enums', () => {
    setLocale('bcs');

    render(React.createElement(OperationOpportunityDossierPanel, {
      gameState: makeGameState({
        operationOpportunityProposals: [makeOpportunity({
          status: 'eligible_pending_review',
          recommendation: 'approve',
          prerequisite_axes: [
            { axis: 'axis_north', label: 'Sjeverna osovina', mode: 'optional', green: false, state: 'not_applicable', reason: '' },
          ],
          force_quality_traits: [
            { trait: 'reserve_weight', label: 'Rezerva', band: 'adequate', reason: 'Dovoljno rezervi je blizu osovine.' },
          ],
        })],
      }),
      playerFaction: 'RBiH',
    }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain('Preporuka: odobriti');
    expect(copy).toContain('Nije primjenjivo');
    expect(copy).toContain('Dovoljno');
    expect(copy).not.toMatch(/\bapprove\b/i);
    expect(copy).not.toMatch(/\beligible_pending_review\b/i);
    expect(copy).not.toMatch(/\bnot_applicable\b/i);
  });

  it('renders pending presidential decision timing as a calendar date', () => {
    render(React.createElement(PresidentialAttentionPanel, {
      gameState: makeGameState({
        pendingEventDecisions: [
          {
            event_id: 'evt_cabinet_crisis',
            event_title: 'Cabinet crisis',
            faction: 'RBiH',
            turn_fired: 14,
            response_options: [{ id: 'hold_line', label: 'Hold the line', effects: [] }],
          },
        ],
      }),
      playerFaction: 'RBiH',
    }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain(turnToDateString(14));
    expect(copy).not.toContain('Pending since week 14');
    expect(copy).not.toMatch(/\bweek 14\b/i);
  });
});
