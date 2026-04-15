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
        negotiation: { pressure: 50, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null },
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

const frontEdges: FrontEdge[] = [];

function militaryAndTerritorialClauses() {
  return [
    createClause('m1', 'military', 'monitoring_light', 'RBiH', ['RS'], { kind: 'global' }),
    createClause('t1', 'territorial', 'recognize_control_settlements', 'RBiH', ['RS'], { kind: 'settlements', sids: ['1'] }),
  ];
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

describe('Brcko completeness', () => {
  it('rejects peace-triggering treaties without brcko_special_status', () => {
    const state = createTestState();
    const draft = buildTreatyDraft(5, 'RBiH', militaryAndTerritorialClauses());
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('brcko_unresolved');
    expect(report.rejection_details?.constraint_type).toBe('require_brcko_resolution');
  });

  it('rejects transfer_settlements peace treaties without brcko_special_status', () => {
    const state = createTestState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      createClause('m1', 'military', 'monitoring_light', 'RBiH', ['RS'], { kind: 'global' }),
      createClause(
        't1',
        'territorial',
        'transfer_settlements',
        'RBiH',
        ['RS'],
        { kind: 'settlements', sids: ['1'] },
        undefined,
        'RS',
        'RBiH',
      ),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('brcko_unresolved');
    expect(report.rejection_details?.constraint_type).toBe('require_brcko_resolution');
  });

  it('keeps bundle violations ahead of brcko_unresolved in deterministic ordering', () => {
    const state = createTestState();
    const draft = buildTreatyDraft(5, 'RBiH', [
      ...militaryAndTerritorialClauses(),
      allocateClause('c1', 'customs', 'RBiH'),
    ]);
    const report = evaluateTreatyAcceptance(state, draft, frontEdges, undefined);

    expect(report.accepted_by_all_targets).toBe(false);
    expect(report.rejection_reason).toBe('competence_bundle_incomplete');
    expect(report.rejection_details?.constraint_type).toBe('require_bundle');
  });
});
