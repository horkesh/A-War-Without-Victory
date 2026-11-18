import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { derivePresidentialBlockers } from '../../src/ui/map/data/presidentialBlockers.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 5',
    turn: 5,
    phase: 'war',
    formations: [],
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
    ...overrides,
  } as LoadedGameState;
}

describe('derivePresidentialBlockers', () => {
  it('returns only direct presidential blockers in priority order', () => {
    const blockers = derivePresidentialBlockers(makeState({
      pendingEventDecisions: [
        {
          event_id: 'evt_required',
          event_title: 'Cabinet Decision',
          faction: 'RBiH',
          turn_fired: 5,
          requires_player_response: true,
          response_options: [],
        },
      ],
      pendingPeacePlan: {
        planId: 'vance_owen',
        planName: 'Vance-Owen Plan',
        narrative: 'Proposal text',
        turnOffered: 5,
        proposedSplit: { RBiH: 50, RS: 45, HRHB: 5 },
        institutionalModel: 'cantonized',
        botResponses: {},
      },
      pendingReserveRequests: [
        {
          request_id: 'reserve_1',
          corps_id: 'first_corps',
          faction: 'RBiH',
          reason: 'Sector under pressure',
          purpose: 'defensive',
          priority: 1,
          severityBand: 'routine',
          travel_hops: 2,
          description: 'Needs reinforcement.',
          suggested_brigade_id: null,
          turn_requested: 5,
        },
      ],
    }), null);

    expect(blockers.map((blocker) => blocker.id)).toEqual([
      'event:evt_required',
      'peace:vance_owen',
    ]);
    expect(blockers[0]).toMatchObject({
      title: 'Cabinet Decision',
      action: 'event_modal',
      actionLabel: 'Decide now',
    });
    expect(blockers[1]).toMatchObject({
      title: 'Vance-Owen Plan',
      action: 'peace_plan_modal',
      actionLabel: 'Review proposal',
    });
  });

  it('does not treat advisory event decisions as presidential blockers', () => {
    const blockers = derivePresidentialBlockers(makeState({
      pendingEventDecisions: [
        {
          event_id: 'evt_advisory',
          event_title: 'Advisory Brief',
          faction: 'RBiH',
          turn_fired: 5,
          requires_player_response: false,
          response_options: [],
        },
      ],
    }), null);

    expect(blockers).toHaveLength(0);
  });

  it('blocks only tagged historical operation authorizations, not ordinary proposals', () => {
    const blockers = derivePresidentialBlockers(makeState({
      pendingProposalReviews: [
        {
          id: 'historical_jackal',
          turn: 5,
          faction: 'RBiH',
          domain: 'ops',
          description: 'Authorize Operation Jackal.',
          proposed_action: 'HISTORICAL_OP:triggered:arbih_1st_corps:Operation Jackal',
        },
        {
          id: 'ordinary_proposal',
          turn: 5,
          faction: 'RBiH',
          domain: 'ops',
          description: 'A general proposes a local operation.',
          proposed_action: 'REQUEST_OPERATION:arbih_1st_corps',
        },
      ],
    }), null);

    expect(blockers.map((entry) => entry.id)).toEqual([
      'command:review-proposal:historical_jackal',
    ]);
  });

  it('uses registry action copy for paramilitary blockers', () => {
    const blockers = derivePresidentialBlockers(makeState({
      pendingParamilitaryRequests: [
        {
          faction: 'RBiH',
          target_osid: 'bratunac_1',
          strength: 120,
          estimated_civilian_risk: 14,
        },
      ],
    }), { bratunac_1: 'Bratunac' });

    expect(blockers[0]).toMatchObject({
      type: 'paramilitary_request',
      title: 'Paramilitary authorization',
      action: 'paramilitary_review',
      actionLabel: 'Review paramilitary',
    });
  });

  it('localizes blocker registry action copy (paramilitary; convoy blockers retired F1i)', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    try {
      setLocale('bcs', undefined);
      const blockers = derivePresidentialBlockers(makeState({
        pendingParamilitaryRequests: [
          {
            faction: 'RBiH',
            target_osid: 'bratunac_1',
            strength: 120,
            estimated_civilian_risk: 14,
          },
        ],
      }), { bratunac_1: 'Bratunac' });

      expect(blockers[0]).toMatchObject({
        typeLabel: 'Paravojno odobrenje',
        actionLabel: 'Pregledaj paravojsku',
      });
      expect(`${blockers[0]?.typeLabel} ${blockers[0]?.actionLabel}`).not.toMatch(/Paramilitary authorization|Review paramilitary/);
    } finally {
      setLocale('en', undefined);
    }
  });
});
