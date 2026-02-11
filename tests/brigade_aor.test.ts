/**
 * Tests for Phase II per-brigade AoR assignment.
 * Stage 1B of Brigade Operations System.
 */
import { describe, it, expect } from 'vitest';
import {
  initializeBrigadeAoR,
  validateBrigadeAoR,
  getBrigadeAoRSettlements,
  computeBrigadeDensity,
  identifyFrontActiveSettlements
} from '../src/sim/phase_ii/brigade_aor.js';
import type { GameState, FormationState, FactionId, SettlementId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
  return {
    id,
    faction,
    name: `Brigade ${id}`,
    created_turn: 1,
    status: 'active',
    assignment: null,
    kind: 'brigade',
    personnel,
    cohesion: 60,
    hq_sid: hq,
    tags: []
  };
}

/**
 * Test scenario: 3-faction, 12-settlement linear graph.
 *
 * RS controls: S1, S2, S3, S4
 * RBiH controls: S5, S6, S7, S8
 * HRHB controls: S9, S10, S11, S12
 *
 * Edges: S1-S2, S2-S3, S3-S4, S4-S5, S5-S6, S6-S7, S7-S8, S8-S9, S9-S10, S10-S11, S11-S12
 * Front edges: S4-S5 (RS-RBiH), S8-S9 (RBiH-HRHB)
 */
function makeLinearScenario(): { state: GameState; edges: EdgeRecord[] } {
  const edges: EdgeRecord[] = [];
  for (let i = 1; i < 12; i++) {
    edges.push({ a: `S${i}`, b: `S${i + 1}` });
  }

  const pc: Record<string, FactionId> = {};
  for (let i = 1; i <= 4; i++) pc[`S${i}`] = 'RS';
  for (let i = 5; i <= 8; i++) pc[`S${i}`] = 'RBiH';
  for (let i = 9; i <= 12; i++) pc[`S${i}`] = 'HRHB';

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 20, seed: 'aor-test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
    ] as any,
    formations: {
      'rs-brig-1': makeFormation('rs-brig-1', 'RS', 'S2'),
      'rbih-brig-1': makeFormation('rbih-brig-1', 'RBiH', 'S6'),
      'hrhb-brig-1': makeFormation('hrhb-brig-1', 'HRHB', 'S10'),
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: pc
  } as GameState;

  return { state, edges };
}

describe('identifyFrontActiveSettlements', () => {
  it('identifies settlements on opposing-control edges', () => {
    const { state, edges } = makeLinearScenario();
    const frontActive = identifyFrontActiveSettlements(state, edges);

    expect(frontActive.has('S4')).toBe(true);  // RS side of RS-RBiH front
    expect(frontActive.has('S5')).toBe(true);  // RBiH side of RS-RBiH front
    expect(frontActive.has('S8')).toBe(true);  // RBiH side of RBiH-HRHB front
    expect(frontActive.has('S9')).toBe(true);  // HRHB side of RBiH-HRHB front
    expect(frontActive.has('S1')).toBe(false); // Deep rear
    expect(frontActive.has('S12')).toBe(false); // Deep rear
  });
});

describe('initializeBrigadeAoR', () => {
  it('assigns front-active settlements to brigades', () => {
    const { state, edges } = makeLinearScenario();
    const report = initializeBrigadeAoR(state, edges);

    expect(report.front_active_assigned).toBeGreaterThan(0);

    // S4 (front-active RS) should be assigned to rs-brig-1
    expect(state.brigade_aor?.['S4']).toBe('rs-brig-1');
    // S5 (front-active RBiH) should be assigned to rbih-brig-1
    expect(state.brigade_aor?.['S5']).toBe('rbih-brig-1');
    // S9 (front-active HRHB) should be assigned to hrhb-brig-1
    expect(state.brigade_aor?.['S9']).toBe('hrhb-brig-1');
  });

  it('assigns rear settlements as null', () => {
    const { state, edges } = makeLinearScenario();
    initializeBrigadeAoR(state, edges);

    // S1 is deep rear (2 hops from front) - should be null
    expect(state.brigade_aor?.['S1']).toBeNull();
    // S12 is deep rear
    expect(state.brigade_aor?.['S12']).toBeNull();
  });

  it('includes 1-hop rear depth settlements', () => {
    const { state, edges } = makeLinearScenario();
    initializeBrigadeAoR(state, edges);

    // S3 is 1-hop behind S4 (front) → included in expanded front-active → assigned
    expect(state.brigade_aor?.['S3']).toBe('rs-brig-1');
    // S6 is 1-hop behind S5 → included
    expect(state.brigade_aor?.['S6']).toBe('rbih-brig-1');
  });

  it('splits front between multiple brigades', () => {
    const { state, edges } = makeLinearScenario();
    // Add second RBiH brigade
    state.formations['rbih-brig-2'] = makeFormation('rbih-brig-2', 'RBiH', 'S8');
    initializeBrigadeAoR(state, edges);

    // RBiH has 4 settlements (S5-S8). With brigades at S6 and S8, BFS should split:
    // rbih-brig-1 (at S6) claims S5, S6 first; rbih-brig-2 (at S8) claims S7, S8
    const brig1Sids = getBrigadeAoRSettlements(state, 'rbih-brig-1');
    const brig2Sids = getBrigadeAoRSettlements(state, 'rbih-brig-2');

    // Both brigades should have settlements
    expect(brig1Sids.length).toBeGreaterThan(0);
    expect(brig2Sids.length).toBeGreaterThan(0);
    // No overlap
    const overlap = brig1Sids.filter(s => brig2Sids.includes(s));
    expect(overlap.length).toBe(0);
  });
});

describe('validateBrigadeAoR', () => {
  it('reassigns settlements from dissolved brigades', () => {
    const { state, edges } = makeLinearScenario();
    // Add two RS brigades
    state.formations['rs-brig-2'] = makeFormation('rs-brig-2', 'RS', 'S4');
    initializeBrigadeAoR(state, edges);

    // Dissolve rs-brig-2
    state.formations['rs-brig-2'].status = 'inactive';

    // Run validation
    validateBrigadeAoR(state, edges);

    // All RS settlements should now be assigned to rs-brig-1 (only surviving brigade)
    for (const sid of ['S3', 'S4']) {
      const assigned = state.brigade_aor?.[sid];
      if (assigned !== null) {
        expect(assigned).toBe('rs-brig-1');
      }
    }
  });

  it('assigns newly front-active settlements', () => {
    const { state, edges } = makeLinearScenario();
    initializeBrigadeAoR(state, edges);

    // Simulate S5 flipping from RBiH to RS → S6 becomes new front-active
    (state.political_controllers as Record<string, string>)['S5'] = 'RS';

    validateBrigadeAoR(state, edges);

    // S5 should now be assigned to an RS brigade
    const s5Assigned = state.brigade_aor?.['S5'];
    expect(s5Assigned).toBe('rs-brig-1');
  });
});

describe('computeBrigadeDensity', () => {
  it('computes personnel / settlement count', () => {
    const { state, edges } = makeLinearScenario();
    state.formations['rs-brig-1'].personnel = 800;
    initializeBrigadeAoR(state, edges);

    const density = computeBrigadeDensity(state, 'rs-brig-1');
    const settlements = getBrigadeAoRSettlements(state, 'rs-brig-1');

    expect(density).toBeCloseTo(800 / settlements.length, 1);
  });

  it('returns 0 for nonexistent brigade', () => {
    const { state, edges } = makeLinearScenario();
    initializeBrigadeAoR(state, edges);
    expect(computeBrigadeDensity(state, 'nonexistent')).toBe(0);
  });
});
