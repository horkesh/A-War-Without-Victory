/**
 * Tests for Phase II per-brigade AoR assignment.
 * Stage 1B of Brigade Operations System.
 */
import { describe, it, expect } from 'vitest';
import {
  initializeBrigadeAoR,
  validateBrigadeAoR,
  applyBrigadeMunicipalityOrders,
  getBrigadeAoRSettlements,
  computeBrigadeDensity,
  identifyFrontActiveSettlements,
  getSettlementGarrison,
  computeBrigadeOperationalCoverageCap
} from '../src/sim/phase_ii/brigade_aor.js';
import type { GameState, FormationState, FactionId, SettlementId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { BRIGADE_OPERATIONAL_AOR_HARD_CAP } from '../src/state/formation_constants.js';
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

function makeSettlementsMap(items: Array<{ sid: string; mun: string }>): Map<string, any> {
  const m = new Map<string, any>();
  for (const it of items) {
    m.set(it.sid, {
      sid: it.sid,
      source_id: it.sid,
      mun_code: it.mun,
      mun: it.mun,
      mun1990_id: it.mun
    });
  }
  return m;
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

  it('assigns AoR to both brigades when they share the same HQ (same home municipality)', () => {
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' },
      { a: 'S2', b: 'S3' },
      { a: 'S3', b: 'S4' },
      { a: 'S4', b: 'S5' },
      { a: 'S5', b: 'S6' },
    ];
    const pc: Record<string, FactionId> = {
      S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', S5: 'RBiH', S6: 'RBiH',
    };

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'aor-same-hq', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: {
        'rs-brig-a': makeFormation('rs-brig-a', 'RS', 'S2'),
        'rs-brig-b': makeFormation('rs-brig-b', 'RS', 'S2'),
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc
    } as GameState;

    initializeBrigadeAoR(state, edges);

    const aSids = getBrigadeAoRSettlements(state, 'rs-brig-a');
    const bSids = getBrigadeAoRSettlements(state, 'rs-brig-b');

    expect(aSids.length).toBeGreaterThan(0);
    expect(bSids.length).toBeGreaterThan(0);
    const overlap = aSids.filter((s) => bSids.includes(s));
    expect(overlap.length).toBe(0);
  });

  it('assigns AoR to active brigade without hq_sid via deterministic fallback seed', () => {
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' },
      { a: 'S2', b: 'S3' },
      { a: 'S3', b: 'S4' },
      { a: 'S4', b: 'S5' },
      { a: 'S5', b: 'S6' },
    ];
    const pc: Record<string, FactionId> = {
      S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', S5: 'RBiH', S6: 'RBiH',
    };
    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'aor-missing-hq', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: {
        'rs-brig-b': {
          ...makeFormation('rs-brig-b', 'RS', 'S2'),
          hq_sid: undefined
        },
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc
    } as GameState;

    initializeBrigadeAoR(state, edges);
    const bSids = getBrigadeAoRSettlements(state, 'rs-brig-b');
    expect(bSids.length).toBeGreaterThan(0);
  });

  it('uses corps lookup for rear brigades to keep sector assignment coherent', () => {
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' },
      { a: 'S2', b: 'S3' },
      { a: 'S3', b: 'S4' },
      { a: 'S4', b: 'S5' },
      { a: 'S5', b: 'S6' },
      { a: 'S6', b: 'S7' },
      { a: 'S7', b: 'S8' },
      { a: 'S8', b: 'S9' },
      { a: 'S9', b: 'S10' },
      { a: 'S1', b: 'E1' },
      { a: 'S10', b: 'E2' },
    ];

    const pc: Record<string, FactionId> = {
      S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', S5: 'RS', S6: 'RS', S7: 'RS', S8: 'RS', S9: 'RS', S10: 'RS',
      E1: 'RBiH', E2: 'RBiH',
    };

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'aor-corps-fallback', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: {
        'corps-a': {
          id: 'corps-a', faction: 'RS', name: 'Corps A', created_turn: 0, status: 'active',
          assignment: null, kind: 'corps_asset', tags: [], personnel: 0, hq_sid: 'S2'
        } as FormationState,
        'corps-b': {
          id: 'corps-b', faction: 'RS', name: 'Corps B', created_turn: 0, status: 'active',
          assignment: null, kind: 'corps_asset', tags: [], personnel: 0, hq_sid: 'S9'
        } as FormationState,
        'rs-brig-a': {
          ...makeFormation('rs-brig-a', 'RS', 'S8'),
          tags: ['corps:corps-a']
        },
        // Rear-positioned brigade with corps-b tag; without corps lookup this tends to claim the wrong side.
        'rs-brig-b': {
          ...makeFormation('rs-brig-b', 'RS', 'S3'),
          tags: ['corps:corps-b']
        },
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc
    } as GameState;

    initializeBrigadeAoR(state, edges);

    // Left front side should stay with corps-a brigade.
    expect(state.brigade_aor?.['S1']).toBe('rs-brig-a');
    // Right front side should be assigned using corps-b lookup despite rear HQ bias.
    expect(state.brigade_aor?.['S9']).toBe('rs-brig-b');
    expect(state.brigade_aor?.['S10']).toBe('rs-brig-b');
  });

  it('splits settlement coverage deterministically when brigades share one municipality', () => {
    const edges: EdgeRecord[] = [
      { a: 'A1', b: 'A2' },
      { a: 'A2', b: 'A3' },
      { a: 'A3', b: 'B1' }
    ];
    const settlements = makeSettlementsMap([
      { sid: 'A1', mun: 'm_shared' },
      { sid: 'A2', mun: 'm_shared' },
      { sid: 'A3', mun: 'm_shared' },
      { sid: 'B1', mun: 'm_enemy' }
    ]);
    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'aor-shared-mun', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: {
        'rbih-a': makeFormation('rbih-a', 'RBiH', 'A1'),
        'rbih-b': makeFormation('rbih-b', 'RBiH', 'A3')
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: { A1: 'RBiH', A2: 'RBiH', A3: 'RBiH', B1: 'RS' },
      brigade_municipality_assignment: {
        'rbih-a': ['m_shared'],
        'rbih-b': ['m_shared']
      }
    } as GameState;

    initializeBrigadeAoR(state, edges, settlements);
    const a = getBrigadeAoRSettlements(state, 'rbih-a');
    const b = getBrigadeAoRSettlements(state, 'rbih-b');
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a.filter((sid) => b.includes(sid)).length).toBe(0);
  });
});

describe('applyBrigadeMunicipalityOrders', () => {
  it('moves brigade assignment to adjacent municipality deterministically', () => {
    const edges: EdgeRecord[] = [
      { a: 'T1', b: 'S1' },
      { a: 'S1', b: 'S2' },
      { a: 'S2', b: 'S3' },
      { a: 'S3', b: 'S4' },
      { a: 'S4', b: 'E1' }
    ];
    const settlements = makeSettlementsMap([
      { sid: 'T1', mun: 'm3' },
      { sid: 'S1', mun: 'm1' },
      { sid: 'S2', mun: 'm1' },
      { sid: 'S3', mun: 'm2' },
      { sid: 'S4', mun: 'm2' },
      { sid: 'E1', mun: 'm_enemy' }
    ]);
    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'mun-orders', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: {
        'rs-a': makeFormation('rs-a', 'RS', 'T1'),
        'rs-b': makeFormation('rs-b', 'RS', 'S2')
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: { T1: 'RS', S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', E1: 'RBiH' },
      brigade_municipality_assignment: {
        'rs-a': ['m1'],
        'rs-b': ['m1']
      },
      brigade_mun_orders: {
        'rs-b': ['m3']
      }
    } as GameState;

    const report = applyBrigadeMunicipalityOrders(state, edges, settlements);
    expect(report.orders_applied).toBe(1);
    expect(state.brigade_municipality_assignment?.['rs-b']).toEqual(['m3']);
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

  it('applies dynamic operational coverage cap for oversized AoR', () => {
    const formationId = 'rs-brig-cap';
    const pc: Record<string, FactionId> = {};
    const brigadeAor: Record<string, string> = {};
    const formations: Record<string, FormationState> = {
      [formationId]: makeFormation(formationId, 'RS', 'S001', 3000)
    };

    for (let i = 1; i <= 100; i++) {
      const sid = `S${String(i).padStart(3, '0')}`;
      pc[sid] = 'RS';
      brigadeAor[sid] = formationId;
    }

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'aor-cap-test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations,
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc,
      brigade_aor: brigadeAor
    } as GameState;

    const cap = computeBrigadeOperationalCoverageCap(state, formationId);
    const density = computeBrigadeDensity(state, formationId);
    expect(cap).toBeGreaterThan(0);
    expect(cap).toBeLessThanOrEqual(BRIGADE_OPERATIONAL_AOR_HARD_CAP);
    expect(density).toBeCloseTo(3000 / cap, 6);

    // First settlements are in deterministic covered subset.
    expect(getSettlementGarrison(state, 'S001')).toBeCloseTo(density, 6);
    // Overflow settlement is assigned in AoR but not operationally covered.
    expect(getSettlementGarrison(state, 'S100')).toBe(0);
  });

  it('supports urban fortress concentration for large urban municipalities', () => {
    const formationId = 'rbih-sarajevo-brig';
    const formation = makeFormation(formationId, 'RBiH', 'S001', 3000);
    formation.tags = ['mun:centar_sarajevo'];
    formation.posture = 'defend';
    const pc: Record<string, FactionId> = {};
    const brigadeAor: Record<string, string> = {};
    for (let i = 1; i <= 30; i++) {
      const sid = `S${String(i).padStart(3, '0')}`;
      pc[sid] = 'RBiH';
      brigadeAor[sid] = formationId;
    }
    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'sarajevo-cap-test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: { [formationId]: formation },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc,
      brigade_aor: brigadeAor
    } as GameState;

    expect(computeBrigadeOperationalCoverageCap(state, formationId)).toBe(1);
    expect(getSettlementGarrison(state, 'S001')).toBeGreaterThan(0);
    expect(getSettlementGarrison(state, 'S002')).toBe(0);
  });

  it('does not collapse to one-settlement fortress for non-large-urban municipalities', () => {
    const formationId = 'rbih-non-urban-brig';
    const formation = makeFormation(formationId, 'RBiH', 'S001', 3000);
    formation.tags = ['mun:kiseljak']; // mixed override exists, but not in large-urban >=60k list
    formation.posture = 'defend';
    const pc: Record<string, FactionId> = {};
    const brigadeAor: Record<string, string> = {};
    for (let i = 1; i <= 30; i++) {
      const sid = `S${String(i).padStart(3, '0')}`;
      pc[sid] = 'RBiH';
      brigadeAor[sid] = formationId;
    }
    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'non-urban-cap-test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
      ] as any,
      formations: { [formationId]: formation },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: pc,
      brigade_aor: brigadeAor
    } as GameState;

    expect(computeBrigadeOperationalCoverageCap(state, formationId)).toBeGreaterThan(1);
  });
});
