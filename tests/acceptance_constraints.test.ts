import { describe, expect, it } from 'vitest';

import type { FrontEdge } from '../src/map/front_edges.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { evaluateTreatyAcceptance } from '../src/state/treaty_acceptance.js';
import { buildTreatyDraft, createClause } from '../src/state/treaty_builder.js';

function createTestState(): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 5, seed: 'test', phase: 'war' } as any,
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
        areasOfResponsibility: ['1', '2'],
        supply_sources: [],
        negotiation: { pressure: 5, last_change_turn: 3, capital: 100, spent_total: 0, last_capital_change_turn: null },
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
        areasOfResponsibility: ['3', '4'],
        supply_sources: [],
        negotiation: { pressure: 15, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null },
      },
    ] as any,
    military: {
      formations: {},
      front_segments: {},
      front_posture: {},
      front_posture_regions: {},
      front_pressure: {},
      militia_pools: {},
    } as any,
    political: {
      negotiation_ledger: [],
    } as any,
    displacement: {} as any,
  } as GameState;
}

function createHighPressureState(): GameState {
  return {
    ...createTestState(),
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
        areasOfResponsibility: ['1', '2'],
        supply_sources: [],
        negotiation: { pressure: 5, last_change_turn: 3, capital: 100, spent_total: 0, last_capital_change_turn: null },
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
        areasOfResponsibility: ['3', '4'],
        supply_sources: [],
        negotiation: { pressure: 50, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null },
      },
    ] as any,
  } as GameState;
}

function createVeryHighPressureState(): GameState {
  return {
    ...createTestState(),
    factions: [
      {
        id: 'RBiH',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
        areasOfResponsibility: ['1', '2'],
        supply_sources: [],
        negotiation: { pressure: 5, last_change_turn: 3, capital: 100, spent_total: 0, last_capital_change_turn: null },
      },
      {
        id: 'RS',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
        areasOfResponsibility: ['3', '4'],
        supply_sources: [],
        negotiation: { pressure: 100, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null },
      },
    ] as any,
  } as GameState;
}

const frontEdges: FrontEdge[] = [];

function militaryAndTerritorialClauses() {
  return [
    createClause('m1', 'military', 'monitoring_light', 'RBiH', ['RS'], { kind: 'global' }),
    createClause('t1', 'territorial', 'recognize_control_settlements', 'RBiH', ['RS'], { kind: 'settlements', sids: ['1'] }),
  ];
}

function brckoClause() {
  return createClause('b1', 'territorial', 'brcko_special_status', 'RBiH', ['RS'], { kind: 'settlements', sids: ['1'] });
}

function allocateClause(id: string, competence: string, holder: string) {
  return createClause(
    id,
    'institutional',
    'allocate_competence',
    'RBiH',
    ['RS'],
    { kind: 'global' },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    competence,
    holder,
  );
}

describe('acceptance constraints', () => {
  it('rejects customs without indirect_taxation', () => {
    const state = createHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      allocateClause('c1', 'customs', 'RBiH'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_bundle_incomplete');
    expect(report.rejection_details?.constraint_type).toBe('require_bundle');
    expect(report.rejection_details?.competences).toEqual(['customs', 'indirect_taxation'].sort());
  });

  it('accepts the customs bundle when baseline acceptance passes', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'customs', 'RBiH'),
      allocateClause('c2', 'indirect_taxation', 'RBiH'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(true);
    expect(report.rejection_reason).toBeUndefined();
    expect(report.rejection_details).toBeUndefined();
  });

  it('rejects currency_authority when assigned to RS', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'currency_authority', 'RS'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_forbidden_to_faction');
    expect(report.rejection_details).toEqual({
      constraint_type: 'forbid_competence',
      competence: 'currency_authority',
      faction: 'RS',
    });
  });

  it('rejects airspace_control when assigned to RS', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'airspace_control', 'RS'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_forbidden_to_faction');
    expect(report.rejection_details).toEqual({
      constraint_type: 'forbid_competence',
      competence: 'airspace_control',
      faction: 'RS',
    });
  });

  it('rejects international_representation when RS is the holder', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'international_representation', 'RS'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_forbidden_holder');
    expect(report.rejection_details).toEqual({
      constraint_type: 'forbid_holder',
      competence: 'international_representation',
      holder: 'RS',
    });
  });

  it('leaves treaties with no competences unaffected', () => {
    const state = createTestState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      createClause('c1', 'military', 'monitoring_light', 'RBiH', ['RS'], { kind: 'global' }),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(true);
    expect(report.rejection_reason).toBeUndefined();
    expect(report.rejection_details).toBeUndefined();
  });

  it('keeps rejection details deterministic across repeated evaluation', () => {
    const state = createHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      allocateClause('c1', 'customs', 'RBiH'),
    ]);

    const report1 = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);
    const report2 = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report1.accepted_by_all_targets).toBe(false);
    expect(report2.accepted_by_all_targets).toBe(false);
    expect(report1.rejection_reason).toBe(report2.rejection_reason);
    expect(report1.rejection_details).toEqual(report2.rejection_details);
  });

  it('rejects defence_policy without armed_forces_command', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'defence_policy', 'RBiH'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_bundle_incomplete');
    expect(report.rejection_details?.constraint_type).toBe('require_bundle');
    expect(report.rejection_details?.competences).toEqual(['armed_forces_command', 'defence_policy'].sort());
  });

  it('rejects the defence bundle when split across different holders', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'defence_policy', 'RBiH'),
      allocateClause('c2', 'armed_forces_command', 'RS'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_bundle_incomplete');
    expect(report.rejection_details?.constraint_type).toBe('require_bundle');
  });

  it('accepts the defence bundle when allocated to the same holder', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'defence_policy', 'RBiH'),
      allocateClause('c2', 'armed_forces_command', 'RBiH'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(true);
    expect(report.rejection_reason).toBeUndefined();
  });

  it('rejects the customs bundle when split across different holders', () => {
    const state = createVeryHighPressureState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      brckoClause(),
      allocateClause('c1', 'customs', 'RBiH'),
      allocateClause('c2', 'indirect_taxation', 'RS'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_bundle_incomplete');
    expect(report.rejection_details?.constraint_type).toBe('require_bundle');
  });
});
