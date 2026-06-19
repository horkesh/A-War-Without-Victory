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
        operationOpportunityProposals: [makeOpportunity({ expires_turn: 24 })],
      }),
      playerFaction: 'RBiH',
    }));

    const copy = document.body.textContent ?? '';
    expect(copy).toContain(`Review by ${turnToDateString(24)}`);
    expect(copy).not.toContain('Expires w24');
    expect(copy).not.toMatch(/\bIstice\s+s24\b/);
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
