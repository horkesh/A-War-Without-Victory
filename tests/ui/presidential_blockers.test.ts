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

  it('keeps convoy blockers player-facing and avoids raw faction/enclave ids', () => {
    const blockers = derivePresidentialBlockers(makeState({
      pendingConvoyDecisions: [
        {
          id: 'convoy_1',
          target_enclave: 'srebrenica_enclave',
          route_faction: 'RS',
          supply_amount: 25,
        },
      ],
    }), null);

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({
      id: 'convoy:convoy_1',
      action: 'convoy_decision_modal',
      actionLabel: 'Review convoy',
    });
    expect(blockers[0].summary).toContain('A humanitarian convoy request needs your instruction');
    expect(blockers[0].summary).not.toContain('RS route');
    expect(blockers[0].summary).not.toContain('srebrenica_enclave');
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
      actionLabel: 'Review deployment',
    });
  });

  it('localizes convoy blocker and registry action copy', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    try {
      setLocale('bcs', undefined);
      const blockers = derivePresidentialBlockers(makeState({
        pendingConvoyDecisions: [
          {
            id: 'convoy_1',
            target_enclave: 'srebrenica_enclave',
            route_faction: 'RS',
            supply_amount: 25,
          },
        ],
      }), null);

      expect(blockers[0]).toMatchObject({
        typeLabel: 'Humanitarni konvoj',
        actionLabel: 'Pregledaj konvoj',
        summary: 'Zahtjev za humanitarni konvoj treba vašu instrukciju prije napredovanja poteza.',
      });
      expect(`${blockers[0]?.typeLabel} ${blockers[0]?.actionLabel} ${blockers[0]?.summary}`).not.toMatch(/Humanitarian convoy|Review convoy|before the turn can proceed/);
    } finally {
      setLocale('en', undefined);
    }
  });
});
