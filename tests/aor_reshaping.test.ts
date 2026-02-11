/**
 * Tests for Phase II AoR reshaping (Stage 4A).
 * Validates settlement transfers between brigades, adjacency checks,
 * cohesion costs, and disruption flags.
 */
import { describe, it, expect } from 'vitest';
import {
  validateReshapeOrder,
  applyReshapeOrders
} from '../src/sim/phase_ii/aor_reshaping.js';
import type { GameState, FormationState, FactionId, BrigadeAoROrder } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
  return {
    id, faction, name: `Brigade ${id}`, created_turn: 1, status: 'active',
    assignment: null, kind: 'brigade', personnel, cohesion: 60, hq_sid: hq, tags: []
  };
}

/**
 * Test scenario: 4 settlements in a line, all RS-controlled.
 *
 *   S1 -- S2 -- S3 -- S4
 *   [rs-brig-1 ] [rs-brig-2 ]
 *
 * rs-brig-1 AoR = {S1, S2}
 * rs-brig-2 AoR = {S3, S4}
 */
function makeScenario(): { state: GameState; edges: EdgeRecord[] } {
  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S2' },
    { a: 'S2', b: 'S3' },
    { a: 'S3', b: 'S4' }
  ];

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 20, seed: 'reshape-test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {
      'rs-brig-1': makeFormation('rs-brig-1', 'RS', 'S1'),
      'rs-brig-2': makeFormation('rs-brig-2', 'RS', 'S3')
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS' },
    brigade_aor: { S1: 'rs-brig-1', S2: 'rs-brig-1', S3: 'rs-brig-2', S4: 'rs-brig-2' },
    brigade_aor_orders: []
  } as GameState;

  return { state, edges };
}

describe('AoR reshaping - validateReshapeOrder', () => {
  it('returns null for a valid transfer of S2 from rs-brig-1 to rs-brig-2 (adjacent via S3)', () => {
    const { state, edges } = makeScenario();
    const order: BrigadeAoROrder = {
      settlement_id: 'S2',
      from_brigade: 'rs-brig-1',
      to_brigade: 'rs-brig-2'
    };
    const result = validateReshapeOrder(state, order, edges);
    expect(result).toBeNull();
  });

  it('rejects transfer when settlement is not adjacent to target AoR (S1 to rs-brig-2)', () => {
    const { state, edges } = makeScenario();
    const order: BrigadeAoROrder = {
      settlement_id: 'S1',
      from_brigade: 'rs-brig-1',
      to_brigade: 'rs-brig-2'
    };
    // S1 is only adjacent to S2; S2 belongs to rs-brig-1, not rs-brig-2
    const result = validateReshapeOrder(state, order, edges);
    expect(result).not.toBeNull();
    expect(result).toContain('not adjacent');
  });

  it('rejects transfer when from_brigade would have 0 settlements', () => {
    const { state, edges } = makeScenario();
    // Give rs-brig-1 only S2 (remove S1 from its AoR)
    state.brigade_aor!['S1'] = null;

    const order: BrigadeAoROrder = {
      settlement_id: 'S2',
      from_brigade: 'rs-brig-1',
      to_brigade: 'rs-brig-2'
    };
    const result = validateReshapeOrder(state, order, edges);
    expect(result).not.toBeNull();
    expect(result).toContain('0 settlements');
  });

  it('rejects transfer across factions', () => {
    const { state, edges } = makeScenario();
    // Add an RBiH brigade
    state.formations['rbih-brig-1'] = makeFormation('rbih-brig-1', 'RBiH', 'S4');
    state.brigade_aor!['S4'] = 'rbih-brig-1';

    const order: BrigadeAoROrder = {
      settlement_id: 'S2',
      from_brigade: 'rs-brig-1',
      to_brigade: 'rbih-brig-1'
    };
    const result = validateReshapeOrder(state, order, edges);
    expect(result).not.toBeNull();
    expect(result).toContain('not same faction');
  });
});

describe('AoR reshaping - applyReshapeOrders', () => {
  it('applies valid transfers, updates brigade_aor, reduces cohesion, and sets disrupted=true', () => {
    const { state, edges } = makeScenario();
    state.brigade_aor_orders = [
      { settlement_id: 'S2', from_brigade: 'rs-brig-1', to_brigade: 'rs-brig-2' }
    ];

    const report = applyReshapeOrders(state, edges);

    expect(report.transfers_applied).toBe(1);
    expect(report.transfers_rejected).toBe(0);

    // S2 now belongs to rs-brig-2
    expect(state.brigade_aor!['S2']).toBe('rs-brig-2');

    // Cohesion costs: from_brigade -2 (60 -> 58), to_brigade -3 (60 -> 57)
    expect(state.formations['rs-brig-1'].cohesion).toBe(58);
    expect(state.formations['rs-brig-2'].cohesion).toBe(57);

    // Disrupted flags set
    expect(state.formations['rs-brig-1'].disrupted).toBe(true);
    expect(state.formations['rs-brig-2'].disrupted).toBe(true);
  });

  it('clears orders after processing', () => {
    const { state, edges } = makeScenario();
    state.brigade_aor_orders = [
      { settlement_id: 'S2', from_brigade: 'rs-brig-1', to_brigade: 'rs-brig-2' }
    ];

    applyReshapeOrders(state, edges);

    expect(state.brigade_aor_orders).toEqual([]);
  });
});
