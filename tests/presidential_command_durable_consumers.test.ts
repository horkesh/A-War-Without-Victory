import { describe, expect, it } from 'vitest';

import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import { deriveOperationOpportunityRecords } from '../src/ui/map/data/operationOpportunityLedger.js';

function costLedgerState(): GameState {
  return {
    meta: { turn: 43, phase: 'war', seed: 1 },
    factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    military: {
      formations: {},
      casualty_ledger: {},
      negotiation: {
        capital: Object.fromEntries(['RBiH', 'RS', 'HRHB'].map((faction) => [faction, createEmptyCapital()])),
        patron_relationships: Object.fromEntries(['RBiH', 'RS', 'HRHB'].map((faction) => [
          faction,
          createDefaultPatronRelationship(faction),
        ])),
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
        rupture_consequences: [],
      },
      operation_opportunities: [{
        opportunity_id: 'sana_95',
        proposal_id: 'proposal-rs',
        eligibility_turn: 40,
        expires_turn: 45,
        status: 'approved',
        approver_faction: 'RS',
        last_axis_evaluation: [],
      }],
      operation_opportunity_resolutions: [{
        proposal_id: 'proposal-rs',
        opportunity_id: 'sana_95',
        response: 'approve',
        response_turn: 43,
      }],
    },
    operation_history: [],
    political: { political_controllers: {} },
    displacement: { civilian_casualties: {} },
  } as unknown as GameState;
}

describe('presidential operation durable consumers', () => {
  it('projects the durable resolution into Records and the Cost Ledger', () => {
    const state = costLedgerState();

    expect(deriveOperationOpportunityRecords(state, 'RS')).toEqual([
      expect.objectContaining({
        proposal_id: 'proposal-rs',
        opportunity_id: 'sana_95',
        faction: 'RS',
        response: 'approve',
        response_turn: 43,
        status: 'approved',
      }),
    ]);
    expect(buildCostLedger(state).operation_opportunities).toMatchObject({
      total_decisions: 1,
      approved: 1,
      entries: [expect.objectContaining({
        proposal_id: 'proposal-rs',
        opportunity_id: 'sana_95',
        faction: 'RS',
        response: 'approve',
        response_turn: 43,
      })],
    });
  });
});
