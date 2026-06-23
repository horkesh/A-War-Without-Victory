import { describe, expect, it } from 'vitest';

import { countFiledDecisionRecords, hasFiledRecord } from '../../src/ui/map/data/filedRecordTruth.js';
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
});
