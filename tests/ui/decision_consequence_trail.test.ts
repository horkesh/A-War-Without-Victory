import { describe, expect, it } from 'vitest';

import {
  buildDecisionConsequenceLedger,
  buildDecisionConsequenceLedgerSummary,
} from '../../src/ui/map/data/decisionConsequenceLedger.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 12',
    turn: 12,
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
    ...overrides,
  } as LoadedGameState;
}

describe('decision consequence trail', () => {
  it('turns resolved decision events into player-facing record entries', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      firedEvents: [
        {
          id: 'cabinet-crisis',
          turn: 8,
          title: 'Cabinet crisis response',
          narrative: 'The cabinet accepted the policy line.',
          category: 'political',
          effects: [{ kind: 'authority', description: 'Authority held.' }],
          isDecision: true,
        },
      ],
    }));

    expect(ledger).toEqual([
      expect.objectContaining({
        id: 'event:cabinet-crisis',
        family: 'Event decision',
        turn: 8,
        title: 'Cabinet crisis response',
        outcome: 'Decision recorded',
      }),
    ]);
    expect(JSON.stringify(ledger)).not.toMatch(/pending_required_decisions|_/);
  });

  it('includes resolved operation opportunities with their later AAR status', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      operationOpportunityRecords: [
        {
          proposal_id: 'p1',
          opportunity_id: 'corridor_push',
          display_name: 'Northern corridor push',
          status: 'approved',
          response: 'approve',
          response_turn: 10,
          executed_op_name: 'Operation Northern Corridor',
          executed_op_aar_id: 'aar-1',
          exit_class: 'partial_success',
        },
      ],
    }));

    expect(ledger[0]).toMatchObject({
      id: 'opportunity:p1',
      family: 'Operation opportunity',
      turn: 10,
      title: 'Northern corridor push',
      outcome: 'Approved',
      detail: 'Operation Northern Corridor: partial success',
    });
  });

  it('includes army reserve request decisions from the persisted reserve history', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      reserveRequestHistory: [
        {
          request_id: 'reserve:turn_12:vrs_drina_corps',
          turn: 12,
          faction: 'RS',
          corps_id: 'vrs_drina_corps',
          brigade_id: 'elite_guard_brigade',
          outcome: 'accepted',
          reason: 'Army CO accepted: request is actionable.',
          decided_by: 'player',
          purpose: 'defensive',
          why_needed: 'Drina Corps needs a reserve to stabilize the front.',
          how_to_use: 'Anchor the weakest sector.',
        },
        {
          request_id: 'reserve:turn_11:vrs_herzegovina_corps',
          turn: 11,
          faction: 'RS',
          corps_id: 'vrs_herzegovina_corps',
          brigade_id: null,
          outcome: 'declined',
          reason: 'Army CO declined: insufficient reserve margin.',
          decided_by: 'player',
          purpose: 'offensive',
          why_needed: 'Herzegovina Corps requested an assault reserve.',
          how_to_use: 'Commit on the main axis.',
        },
      ],
    } as Partial<LoadedGameState>));

    expect(ledger.slice(0, 2)).toEqual([
      expect.objectContaining({
        id: 'reserve:reserve:turn_12:vrs_drina_corps',
        family: 'Army reserve',
        turn: 12,
        title: 'Reserve request accepted',
        outcome: 'Accepted',
        detail: expect.stringContaining('Elite Guard Brigade assigned to Drina Corps'),
      }),
      expect.objectContaining({
        id: 'reserve:reserve:turn_11:vrs_herzegovina_corps',
        family: 'Army reserve',
        turn: 11,
        title: 'Reserve request declined',
        outcome: 'Declined',
        detail: expect.stringContaining('Herzegovina Corps request declined'),
      }),
    ]);
    expect(ledger.map((record) => `${record.family} ${record.title} ${record.outcome} ${record.detail}`).join(' ')).not.toMatch(/_/);
  });

  it('includes resolved peace-plan decisions from persisted negotiation history', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      peacePlanHistory: [
        {
          planId: 'vance_owen',
          planName: 'Vance-Owen Peace Plan',
          turnOffered: 40,
          playerFaction: 'RS',
          playerResponse: 'rejected',
          responses: {
            RBiH: 'accepted',
            RS: 'rejected',
            HRHB: 'accepted',
          },
          resolved: true,
        },
      ],
    } as Partial<LoadedGameState>));

    expect(ledger[0]).toMatchObject({
      id: 'peace:vance_owen:40',
      family: 'Peace proposal',
      turn: 40,
      title: 'Vance-Owen Peace Plan',
      outcome: 'Rejected',
      detail: 'Your government rejected the proposal; ARBiH accepted, VRS rejected, HVO accepted.',
    });
    expect(`${ledger[0]?.family} ${ledger[0]?.title} ${ledger[0]?.outcome} ${ledger[0]?.detail}`).not.toMatch(/_/);
  });

  it('includes the resolved Dayton settlement from the endgame verdict', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      gameVerdict: {
        outcome_type: 'dayton',
        outcome_label: 'Dayton Peace Agreement',
        turn: 188,
        date: '14 Dec 1995',
        duration_weeks: 188,
        faction_verdicts: {},
        dayton_result: {
          territorial_packages_accepted: ['sarajevo_corridor', 'posavina_adjustment'],
          territorial_packages_rejected: ['drina_revision'],
          institutional_choices: {
            presidency: 'decentralized',
          },
          final_territory_split: {
            RBiH: 51,
            RS: 49,
            HRHB: 0,
          },
          patron_overrides_applied: ['territorial:posavina_adjustment:RS'],
        },
      },
    } as Partial<LoadedGameState>));

    expect(ledger[0]).toMatchObject({
      id: 'dayton:188',
      family: 'Dayton settlement',
      turn: 188,
      title: 'Dayton Peace Agreement',
      outcome: 'Agreement signed',
      detail: 'Accepted 2 territorial packages; 1 left with default holders. Final territory split: ARBiH 51%, VRS 49%, HVO 0%. Patron overrides applied: 1.',
    });
    expect(`${ledger[0]?.family} ${ledger[0]?.title} ${ledger[0]?.outcome} ${ledger[0]?.detail}`).not.toMatch(/_/);
  });

  it('includes resolved humanitarian convoy decisions from persisted history', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      convoyDecisionHistory: [
        {
          id: 'convoy:64:srebrenica:RS',
          turn: 64,
          target_enclave: 'Srebrenica enclave',
          route_faction: 'RS',
          target_faction: 'RBiH',
          supply_amount: 0.5,
          decision: 'allow',
          decided_by: 'player',
        },
      ],
    } as Partial<LoadedGameState>));

    expect(ledger[0]).toMatchObject({
      id: 'convoy:convoy:64:srebrenica:RS',
      family: 'Humanitarian convoy',
      turn: 64,
      title: 'Convoy allowed',
      outcome: 'Allowed',
      detail: 'Convoy to Srebrenica enclave allowed through VRS lines; aid delivered to ARBiH.',
    });
    expect(`${ledger[0]?.family} ${ledger[0]?.title} ${ledger[0]?.outcome} ${ledger[0]?.detail}`).not.toMatch(/_/);
  });

  it('includes resolved paramilitary authorization decisions from persisted history', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      paramilitaryDecisionHistory: [
        {
          id: 'paramilitary:5:D',
          turn: 5,
          target_osid: 'D',
          faction: 'RS',
          strength: 150,
          decision: 'allow',
          estimated_civilian_risk: 12,
        },
      ],
    } as Partial<LoadedGameState>));

    expect(ledger[0]).toMatchObject({
      id: 'paramilitary:paramilitary:5:D',
      family: 'Paramilitary authorization',
      turn: 5,
      title: 'Paramilitary deployment authorized',
      outcome: 'Authorized',
      detail: 'Paramilitary deployment authorized for VRS rear-pocket cleanup. Estimated civilian risk: 12.',
    });
    expect(`${ledger[0]?.family} ${ledger[0]?.title} ${ledger[0]?.outcome} ${ledger[0]?.detail}`).not.toMatch(/_/);
  });

  it('includes resolved officer personnel decisions from persisted history', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      officerDecisionHistory: [
        {
          id: 'officer:9:evt-a:replacement_accepted',
          turn: 9,
          faction: 'RS',
          event_id: 'evt-a',
          event_type: 'replacement_suggested',
          officer_id: 'new_commander',
          officer_name: 'Gen. New Commander',
          current_commander_id: 'old_commander',
          current_commander_name: 'Gen. Old Commander',
          corps_id: 'vrs_drina_corps',
          corps_name: 'Drina Corps',
          decision: 'replacement_accepted',
          new_officer_id: 'new_commander',
          new_officer_name: 'Gen. New Commander',
          outgoing_officer_id: 'old_commander',
          outgoing_officer_name: 'Gen. Old Commander',
        },
      ],
    } as Partial<LoadedGameState>));

    expect(ledger[0]).toMatchObject({
      id: 'officer:officer:9:evt-a:replacement_accepted',
      family: 'Officer personnel',
      turn: 9,
      title: 'Commander replacement accepted',
      outcome: 'Accepted',
      detail: 'Gen. New Commander appointed to Drina Corps; Gen. Old Commander retired.',
    });
    expect(`${ledger[0]?.family} ${ledger[0]?.title} ${ledger[0]?.outcome} ${ledger[0]?.detail}`).not.toMatch(/_/);
  });

  it('orders newest consequences first and respects the limit', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      firedEvents: [
        { id: 'older', turn: 2, title: 'Older decision', narrative: '', category: 'political', effects: [], isDecision: true },
        { id: 'newer', turn: 9, title: 'Newer decision', narrative: '', category: 'political', effects: [], isDecision: true },
      ],
    }), 1);

    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.id).toBe('event:newer');
  });

  it('summarizes archive routes and tiebreaks same-turn records with stable id ordering', () => {
    const ledger = buildDecisionConsequenceLedger(makeState({
      firedEvents: [
        { id: 'b-decision', turn: 9, title: 'B decision', narrative: '', category: 'political', effects: [], isDecision: true },
        { id: 'a-decision', turn: 9, title: 'A decision', narrative: '', category: 'political', effects: [], isDecision: true },
      ],
      officerDecisionHistory: [
        {
          id: 'officer:9:replacement_accepted',
          turn: 9,
          faction: 'RS',
          event_id: 'evt-a',
          event_type: 'replacement_suggested',
          officer_id: 'new_commander',
          officer_name: 'Gen. New Commander',
          current_commander_id: 'old_commander',
          current_commander_name: 'Gen. Old Commander',
          corps_id: 'vrs_drina_corps',
          corps_name: 'Drina Corps',
          decision: 'replacement_accepted',
          new_officer_id: 'new_commander',
          new_officer_name: 'Gen. New Commander',
          outgoing_officer_id: 'old_commander',
          outgoing_officer_name: 'Gen. Old Commander',
        },
      ],
    } as Partial<LoadedGameState>), 10);

    expect(ledger.map((record) => record.id)).toEqual([
      'event:a-decision',
      'event:b-decision',
      'officer:officer:9:replacement_accepted',
    ]);

    expect(buildDecisionConsequenceLedgerSummary(ledger)).toEqual({
      total: 3,
      recordsRouteCount: 1,
      chronicleRouteCount: 2,
      latestTurn: 9,
      latestTitle: 'A decision',
      families: ['Event decision', 'Officer personnel'],
    });
  });
});
