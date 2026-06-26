import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
  buildOpProposalCardData,
  FORCE_LAUNCH_COST,
} = require('../src/desktop/autonomy_ipc_contract.cjs') as {
  getPendingProposalReviewsForPlayer: (state: any) => any[];
  resolvePendingProposalAccess: (
    proposals: any[],
    proposalId: string,
    playerFaction: string | null,
  ) => { index: number; error: string | null };
  resolveOpportunityDecisionPayload: (
    proposals: any[],
    payload: any,
    playerFaction: string | null,
  ) => {
    index: number;
    error: string | null;
    decision?: string;
    options?: Record<string, unknown>;
  };
  buildOpProposalCardData: (state: any, proposals: any[]) => any[];
  FORCE_LAUNCH_COST: number;
};

describe('desktop autonomy IPC boundary truth', () => {
  it('filters pending proposal reviews to the active player faction at the desktop boundary', () => {
    const state = {
      meta: {
        player_faction: 'RS',
        pending_proposal_reviews: [
          { id: 'rbih_1', faction: 'RBiH' },
          { id: 'rs_1', faction: 'RS' },
          { id: 'hrhb_1', faction: 'HRHB' },
        ],
      },
    };

    expect(getPendingProposalReviewsForPlayer(state).map((proposal) => proposal.id)).toEqual(['rs_1']);
  });

  it('keeps observer-mode readback broad when there is no active player faction', () => {
    const state = {
      meta: {
        pending_proposal_reviews: [
          { id: 'rbih_1', faction: 'RBiH' },
          { id: 'rs_1', faction: 'RS' },
        ],
      },
    };

    expect(getPendingProposalReviewsForPlayer(state).map((proposal) => proposal.id)).toEqual(['rbih_1', 'rs_1']);
  });

  it('rejects proposal ids that do not belong to the active player faction', () => {
    const proposals = [
      { id: 'rbih_1', faction: 'RBiH' },
      { id: 'rs_1', faction: 'RS' },
    ];

    expect(resolvePendingProposalAccess(proposals, 'rbih_1', 'RS')).toEqual({
      index: -1,
      error: 'proposal_not_owned_by_player',
    });
    expect(resolvePendingProposalAccess(proposals, 'rs_1', 'RS')).toEqual({
      index: 1,
      error: null,
    });
  });

  it('validates rich operation-opportunity decision payloads before mutation', () => {
    const proposals = [
      {
        id: 'PROP_176_opportunity_0',
        faction: 'RBiH',
        proposed_action: 'OPPORTUNITY:OPP_175_sana_95',
      },
      {
        id: 'PROP_176_stance_0',
        faction: 'RBiH',
        proposed_action: 'SET_STANCE:arbih_5th_corps:offensive',
      },
      {
        id: 'PROP_176_enemy_0',
        faction: 'RS',
        proposed_action: 'OPPORTUNITY:OPP_175_enemy',
      },
    ];

    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_opportunity_0', proposalId: 'OPP_175_sana_95', decision: 'delay', delayTurns: 2 },
      'RBiH',
    )).toEqual({
      index: 0,
      error: null,
      decision: 'delay',
      options: { delay_turns: 2 },
    });
    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_opportunity_0', proposalId: 'OPP_175_sana_95', decision: 'under_resource' },
      'RBiH',
    )).toEqual({
      index: 0,
      error: null,
      decision: 'under_resource',
      options: { commitment_profile: 'minimum' },
    });
    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_stance_0', proposalId: 'OPP_175_sana_95', decision: 'delay' },
      'RBiH',
    )).toEqual({ index: -1, error: 'not_operation_opportunity' });
    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_enemy_0', proposalId: 'OPP_175_enemy', decision: 'delay' },
      'RBiH',
    )).toEqual({ index: -1, error: 'proposal_not_owned_by_player' });
    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_opportunity_0', proposalId: 'OPP_175_sana_95', decision: 'storm_now' },
      'RBiH',
    )).toEqual({ index: -1, error: 'invalid_decision' });
    expect(resolveOpportunityDecisionPayload(
      proposals,
      { reviewId: 'PROP_176_opportunity_0', proposalId: 'OPP_999_other', decision: 'delay' },
      'RBiH',
    )).toEqual({ index: -1, error: 'proposal_id_mismatch' });
  });
});

describe('op-proposal decision card builder (desktop boundary)', () => {
  function state(opOverrides: Record<string, unknown>) {
    return {
      military: {
        formations: { '1st_corps': { name: '1st Corps' } },
        named_officer_data: [{ id: 'off_x', name: 'Atif Dudaković', rank: 'corps_commander' }],
        named_officers: { off_x: { status: 'active' } },
        corps_command: {
          '1st_corps': {
            active_operations: [
              { id: 'op_a', name: 'Operation A', plan_id: 'plan_a', tg_commander_officer_id: 'off_x', ...opOverrides },
            ],
          },
        },
      },
    };
  }
  const proposal = { id: 'PROP_30_ops_0', faction: 'RBiH', domain: 'ops', proposed_action: 'APPROVE_OP:1st_corps:plan_a' };

  it('matches the TS read-model shape: officer display, force ratio, override gate, CA cost', () => {
    const cards = buildOpProposalCardData(state({ force_ratio_estimate: 0.7, commander_assessment: 'abort' }), [proposal]);
    expect(cards).toHaveLength(1);
    const c = cards[0];
    expect(c.proposal_id).toBe('PROP_30_ops_0');
    expect(c.corps_name).toBe('1st Corps');
    expect(c.op_id).toBe('op_a');
    expect(c.commander.display).toBe('Corps Commander Atif Dudaković');
    expect(c.force_ratio_estimate).toBe(0.7);
    expect(c.commander_assessment).toBe('abort');
    expect(c.override_available).toBe(true);
    expect(c.override_ca_cost).toBe(FORCE_LAUNCH_COST);
  });

  it('drops non-ops + malformed proposals and is defensive on missing state', () => {
    expect(buildOpProposalCardData(state({}), [{ id: 'x', domain: 'military', proposed_action: 'SET_STANCE:1st_corps:offensive' }])).toEqual([]);
    expect(buildOpProposalCardData(state({}), [{ id: 'x', domain: 'ops', proposed_action: 'APPROVE_OP:' }])).toEqual([]);
    expect(buildOpProposalCardData(null, [proposal])).toHaveLength(1);
    expect(buildOpProposalCardData({}, [])).toEqual([]);
  });

  it('does not attach stale proposal plan ids to the first active desktop operation', () => {
    const staleProposal = { ...proposal, proposed_action: 'APPROVE_OP:1st_corps:stale_plan' };
    const cards = buildOpProposalCardData(state({ force_ratio_estimate: 0.7, commander_assessment: 'abort' }), [staleProposal]);

    expect(cards).toHaveLength(1);
    expect(cards[0].op_id).toBeNull();
    expect(cards[0].op_name).toBeNull();
    expect(cards[0].commander).toBeNull();
    expect(cards[0].force_ratio_estimate).toBeNull();
    expect(cards[0].commander_assessment).toBeNull();
    expect(cards[0].override_available).toBe(false);
  });
});
