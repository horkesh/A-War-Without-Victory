import { describe, expect, it } from 'vitest';

import { countFiledChronicleDecisionRecords, countFiledDecisionRecords, hasFiledRecord } from '../../src/ui/map/data/filedRecordTruth.js';
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

describe('filed record truth', () => {
  it('does not treat bot-only convoy or army-AI reserve histories as player-filed records', () => {
    const state = makeState({
      reserveRequestHistory: [
        {
          request_id: 'reserve:ai_decision',
          turn: 12,
          faction: 'RS',
          corps_id: 'vrs_drina_corps',
          brigade_id: null,
          outcome: 'declined',
          reason: 'defensive_gap',
          decided_by: 'army_ai',
          purpose: 'defensive',
          why_needed: 'AI filed this decision.',
          how_to_use: '',
        },
      ],
      convoyDecisionHistory: [
        {
          id: 'convoy:64:srebrenica:RS',
          turn: 64,
          target_enclave: 'Srebrenica enclave',
          route_faction: 'RS',
          target_faction: 'RBiH',
          supply_amount: 0.5,
          decision: 'allow',
          decided_by: 'bot',
        },
      ],
    } as Partial<LoadedGameState>);

    expect(countFiledDecisionRecords(state)).toBe(0);
    expect(hasFiledRecord(state)).toBe(false);
  });

  it('does not treat foreign operation history hidden from Records as a filed player record', () => {
    const state = makeState({
      player_faction: 'RS',
      operationHistory: [
        {
          operation_id: 'foreign-aar',
          operation_name: 'Foreign AAR',
          corps_id: 'hrhb_corps',
          faction: 'HRHB',
          started_turn: 8,
          ended_turn: 10,
          outcome: 'success',
          objectives_targeted: [],
          objectives_captured: [],
          total_attacks: 0,
          casualties_suffered: { killed: 0, wounded: 0 },
          casualties_inflicted: { killed: 0, wounded: 0 },
          equipment_lost: { tanks: 0, artillery: 0 },
          equipment_destroyed: { tanks: 0, artillery: 0 },
          equipment_captured: { tanks: 0, artillery: 0 },
          duration_turns: 2,
          weekly_log: [],
          axis_summaries: [],
        },
      ],
    } as Partial<LoadedGameState>);

    expect(hasFiledRecord(state)).toBe(false);
  });

  it('counts Records-routed and Chronicle-routed decision receipts separately', () => {
    const state = makeState({
      firedEvents: [
        {
          id: 'chronicle-decision',
          turn: 8,
          title: 'Chronicle decision',
          narrative: 'Recorded in Chronicle.',
          category: 'political',
          effects: [{ kind: 'authority', description: 'Filed.' }],
          isDecision: true,
        },
      ],
      officerDecisionHistory: [
        {
          id: 'officer:9:replacement_accepted',
          turn: 9,
          faction: 'RS',
          current_commander_id: 'old',
          current_commander_name: 'Old commander',
          corps_id: 'vrs_drina_corps',
          corps_name: 'Drina Corps',
          decision: 'replacement_accepted',
          new_officer_id: 'new',
          new_officer_name: 'New commander',
          outgoing_officer_id: 'old',
          outgoing_officer_name: 'Old commander',
        },
      ],
    } as Partial<LoadedGameState>);

    expect(countFiledDecisionRecords(state)).toBe(1);
    expect(countFiledChronicleDecisionRecords(state)).toBe(1);
    expect(hasFiledRecord(state)).toBe(true);
  });
});
