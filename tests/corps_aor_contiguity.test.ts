/**
 * Tests for corps-level AoR contiguity enforcement.
 * Validates that corps AoR (union of subordinate brigade settlements) is contiguous,
 * with enclave exceptions.
 */
import { describe, it, expect } from 'vitest';
import { checkCorpsContiguity, repairCorpsContiguity } from '../src/sim/phase_ii/aor_contiguity.js';
import { enforceCorpsLevelContiguity } from '../src/sim/phase_ii/corps_directed_aor.js';
import type { GameState, FormationState, FactionId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// --- Helpers ---

function makeFormation(id: string, faction: FactionId, hq: string): FormationState {
  return {
    id, faction, name: `Brigade ${id}`, created_turn: 1, status: 'active',
    assignment: null, kind: 'brigade', personnel: 1000, cohesion: 60, hq_sid: hq, tags: []
  };
}

function makeCorps(id: string, faction: FactionId, hq: string = 'S1'): FormationState {
  return {
    id, faction, name: `Corps ${id}`, created_turn: 1, status: 'active',
    assignment: null, kind: 'corps_asset', personnel: 50, cohesion: 80, hq_sid: hq, tags: []
  };
}

function buildAdj(edges: EdgeRecord[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adj.has(edge.a)) adj.set(edge.a, new Set());
    if (!adj.has(edge.b)) adj.set(edge.b, new Set());
    adj.get(edge.a)!.add(edge.b);
    adj.get(edge.b)!.add(edge.a);
  }
  return adj;
}

/**
 * Linear graph: S1—S2—S3—S4—S5—S6
 * Two corps, each with one brigade:
 *   Corps A: brig-a1 owns S1, S2, S3
 *   Corps B: brig-b1 owns S4, S5, S6
 */
function makeContiguousState(): { state: GameState; edges: EdgeRecord[] } {
  const brigA1 = makeFormation('brig-a1', 'RS', 'S1');
  brigA1.corps_id = 'corps-a';
  const brigB1 = makeFormation('brig-b1', 'RS', 'S4');
  brigB1.corps_id = 'corps-b';

  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' },
    { a: 'S3', b: 'S4' }, { a: 'S4', b: 'S5' },
    { a: 'S5', b: 'S6' },
  ];

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 20, seed: 'test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {
      'corps-a': makeCorps('corps-a', 'RS', 'S1'),
      'corps-b': makeCorps('corps-b', 'RS', 'S4'),
      'brig-a1': brigA1,
      'brig-b1': brigB1,
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', S5: 'RS', S6: 'RS' },
    brigade_aor: { S1: 'brig-a1', S2: 'brig-a1', S3: 'brig-a1', S4: 'brig-b1', S5: 'brig-b1', S6: 'brig-b1' },
  } as GameState;

  return { state, edges };
}

/**
 * Linear graph: S1—S2—S3—S4—S5—S6
 * Corps A owns S1, S2, S5 (discontiguous — S3, S4 belong to Corps B)
 * Corps B owns S3, S4, S6
 *
 * After repair, S5 should be reassigned to Corps B (adjacent to S4=corps-b).
 */
function makeDiscontiguousState(): { state: GameState; edges: EdgeRecord[] } {
  const brigA1 = makeFormation('brig-a1', 'RS', 'S1');
  brigA1.corps_id = 'corps-a';
  const brigA2 = makeFormation('brig-a2', 'RS', 'S5');
  brigA2.corps_id = 'corps-a';
  const brigB1 = makeFormation('brig-b1', 'RS', 'S3');
  brigB1.corps_id = 'corps-b';
  const brigB2 = makeFormation('brig-b2', 'RS', 'S6');
  brigB2.corps_id = 'corps-b';

  const edges: EdgeRecord[] = [
    { a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' },
    { a: 'S3', b: 'S4' }, { a: 'S4', b: 'S5' },
    { a: 'S5', b: 'S6' },
  ];

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 20, seed: 'test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {
      'corps-a': makeCorps('corps-a', 'RS', 'S1'),
      'corps-b': makeCorps('corps-b', 'RS', 'S3'),
      'brig-a1': brigA1,
      'brig-a2': brigA2,
      'brig-b1': brigB1,
      'brig-b2': brigB2,
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RS', S5: 'RS', S6: 'RS' },
    brigade_aor: {
      S1: 'brig-a1', S2: 'brig-a1',  // Corps A — contiguous
      S3: 'brig-b1', S4: 'brig-b1',  // Corps B
      S5: 'brig-a2',                   // Corps A — disconnected from S1, S2!
      S6: 'brig-b2',                   // Corps B
    },
  } as GameState;

  return { state, edges };
}

// --- Tests ---

describe('checkCorpsContiguity', () => {
  it('detects contiguous corps as contiguous', () => {
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' },
    ];
    const adj = buildAdj(edges);
    const result = checkCorpsContiguity('corps-a', ['S1', 'S2', 'S3'], adj);
    expect(result.contiguous).toBe(true);
    expect(result.orphans).toEqual([]);
  });

  it('detects discontiguous corps settlements', () => {
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' }, { a: 'S3', b: 'S4' },
    ];
    const adj = buildAdj(edges);
    // S1-S2 and S3-S4 are two separate components
    const result = checkCorpsContiguity('corps-a', ['S1', 'S2', 'S3', 'S4'], adj);
    expect(result.contiguous).toBe(false);
    expect(result.components.length).toBe(2);
    expect(result.orphans.length).toBe(2); // smaller component
  });

  it('returns empty orphans for single settlement', () => {
    const adj = new Map<string, Set<string>>();
    const result = checkCorpsContiguity('corps-a', ['S1'], adj);
    expect(result.contiguous).toBe(true);
    expect(result.orphans).toEqual([]);
  });

  it('returns empty for no settlements', () => {
    const adj = new Map<string, Set<string>>();
    const result = checkCorpsContiguity('corps-a', [], adj);
    expect(result.contiguous).toBe(true);
    expect(result.orphans).toEqual([]);
  });
});

describe('repairCorpsContiguity', () => {
  it('reassigns orphan to adjacent brigade of different corps', () => {
    const { state, edges } = makeDiscontiguousState();
    const adj = buildAdj(edges);

    // S5 belongs to brig-a2 (corps-a) but is disconnected from S1, S2
    // S5 is adjacent to S4 (brig-b1, corps-b) — should be reassigned there
    const count = repairCorpsContiguity(state, 'RS', 'corps-a', ['S5'], adj);
    expect(count).toBe(1);
    expect(state.brigade_aor!.S5).toBe('brig-b1');
  });

  it('unassigns orphan with no valid adjacent target', () => {
    // S5 is isolated — only neighbor is S4 which belongs to same corps
    const brigA1 = makeFormation('brig-a1', 'RS', 'S1');
    brigA1.corps_id = 'corps-a';
    const brigA2 = makeFormation('brig-a2', 'RS', 'S5');
    brigA2.corps_id = 'corps-a';

    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' },
      { a: 'S4', b: 'S5' },
    ];
    const adj = buildAdj(edges);

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
      ],
      formations: {
        'corps-a': makeCorps('corps-a', 'RS', 'S1'),
        'brig-a1': brigA1,
        'brig-a2': brigA2,
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: { S1: 'RS', S2: 'RS', S4: 'RS', S5: 'RS' },
      // S4 also belongs to corps-a, so S5's only neighbor is same-corps
      brigade_aor: { S1: 'brig-a1', S2: 'brig-a1', S4: 'brig-a2', S5: 'brig-a2' },
    } as GameState;

    const count = repairCorpsContiguity(state, 'RS', 'corps-a', ['S5'], adj);
    expect(count).toBe(1);
    expect(state.brigade_aor!.S5).toBeNull();
  });

  it('does not reassign to enemy faction brigade', () => {
    const brigA1 = makeFormation('brig-a1', 'RS', 'S1');
    brigA1.corps_id = 'corps-a';
    const brigEnemy = makeFormation('brig-enemy', 'RBiH', 'S3');
    brigEnemy.corps_id = 'corps-x';

    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' },
    ];
    const adj = buildAdj(edges);

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      ],
      formations: {
        'corps-a': makeCorps('corps-a', 'RS', 'S1'),
        'brig-a1': brigA1,
        'brig-enemy': brigEnemy,
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: { S1: 'RS', S2: 'RS', S3: 'RBiH' },
      brigade_aor: { S1: 'brig-a1', S2: 'brig-a1', S3: 'brig-enemy' },
    } as GameState;

    // S2's only neighbor with a brigade is S3 (enemy faction) — should be null
    const count = repairCorpsContiguity(state, 'RS', 'corps-a', ['S2'], adj);
    expect(count).toBe(1);
    // S2 stays null because the only adjacent brigade is enemy
    // S1 is same corps so it gets skipped; only S3 is adjacent and that's enemy
    expect(state.brigade_aor!.S2).toBeNull();
  });
});

describe('enforceCorpsLevelContiguity', () => {
  it('does not modify contiguous corps AoR', () => {
    const { state, edges } = makeContiguousState();
    const original = { ...state.brigade_aor! };
    enforceCorpsLevelContiguity(state, edges);
    expect(state.brigade_aor).toEqual(original);
  });

  it('repairs discontiguous corps AoR', () => {
    const { state, edges } = makeDiscontiguousState();
    // Before: S5 belongs to brig-a2 (corps-a) but is disconnected
    expect(state.brigade_aor!.S5).toBe('brig-a2');
    enforceCorpsLevelContiguity(state, edges);
    // After: S5 should be reassigned to a corps-b brigade (adjacent)
    const newBrigade = state.brigade_aor!.S5;
    if (newBrigade) {
      const formation = state.formations![newBrigade];
      expect(formation.corps_id).toBe('corps-b');
    }
  });

  it('excludes enclave settlements from contiguity check', () => {
    // Setup: two disconnected territories (main + enclave) for RS
    // Corps A has a brigade in main territory and a brigade in the enclave
    // The enclave disconnect should NOT be treated as a contiguity violation
    const brigA1 = makeFormation('brig-a1', 'RS', 'S1');
    brigA1.corps_id = 'corps-a';
    const brigA2 = makeFormation('brig-a2', 'RS', 'S5');
    brigA2.corps_id = 'corps-a';

    // S1—S2—S3 (RS) and S5—S6 (RS) are disconnected (S4 is RBiH)
    const edges: EdgeRecord[] = [
      { a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' },
      { a: 'S3', b: 'S4' }, { a: 'S4', b: 'S5' },
      { a: 'S5', b: 'S6' },
    ];

    const state: GameState = {
      schema_version: CURRENT_SCHEMA_VERSION,
      meta: { turn: 20, seed: 'test', phase: 'phase_ii' } as any,
      factions: [
        { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
      ],
      formations: {
        'corps-a': makeCorps('corps-a', 'RS', 'S1'),
        'brig-a1': brigA1,
        'brig-a2': brigA2,
      },
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
      political_controllers: { S1: 'RS', S2: 'RS', S3: 'RS', S4: 'RBiH', S5: 'RS', S6: 'RS' },
      brigade_aor: { S1: 'brig-a1', S2: 'brig-a1', S3: 'brig-a1', S4: null, S5: 'brig-a2', S6: 'brig-a2' },
    } as GameState;

    const original = { ...state.brigade_aor! };
    enforceCorpsLevelContiguity(state, edges);
    // Enclave settlements (S5, S6) should NOT be touched — the disconnect is legitimate
    expect(state.brigade_aor).toEqual(original);
  });

  it('produces identical result when run twice (determinism)', () => {
    const { state, edges } = makeDiscontiguousState();
    enforceCorpsLevelContiguity(state, edges);
    const afterFirst = { ...state.brigade_aor! };
    enforceCorpsLevelContiguity(state, edges);
    const afterSecond = { ...state.brigade_aor! };
    expect(afterSecond).toEqual(afterFirst);
  });
});
