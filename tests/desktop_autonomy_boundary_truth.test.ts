import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
  buildOpProposalCardData,
  buildForceableReadyPlanData,
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
  buildForceableReadyPlanData: (state: any, proposals: any[]) => any[];
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

  it('excludes resolved proposal reviews from desktop pending readbacks', () => {
    const state = {
      meta: {
        player_faction: 'RS',
        pending_proposal_reviews: [
          { id: 'rs_open', faction: 'RS' },
          { id: 'rs_accepted', faction: 'RS', accepted: true },
          { id: 'rs_rejected', faction: 'RS', accepted: false },
          { id: 'rs_opportunity_resolved', faction: 'RS', opportunity_decision: 'approve' },
        ],
      },
    };

    expect(getPendingProposalReviewsForPlayer(state).map((proposal) => proposal.id)).toEqual(['rs_open']);
  });

  it('treats null proposal resolution fields as pending at the desktop boundary', () => {
    const state = {
      meta: {
        player_faction: 'RS',
        pending_proposal_reviews: [
          { id: 'rs_null_fields', faction: 'RS', accepted: null, resolved_turn: null, opportunity_decision: null },
          { id: 'rs_false_accepted', faction: 'RS', accepted: false },
        ],
      },
    };

    expect(getPendingProposalReviewsForPlayer(state).map((proposal) => proposal.id)).toEqual(['rs_null_fields']);
    expect(resolvePendingProposalAccess(state.meta.pending_proposal_reviews, 'rs_null_fields', 'RS')).toEqual({
      index: 0,
      error: null,
    });
    expect(resolvePendingProposalAccess(state.meta.pending_proposal_reviews, 'rs_false_accepted', 'RS')).toEqual({
      index: -1,
      error: 'already_resolved',
    });
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
        formations: {
          '1st_corps': { name: '1st Corps' },
          bde_alpha: { name: 'Alpha Brigade' },
        },
        named_officer_data: [{ id: 'off_x', name: 'Atif Dudaković', rank: 'corps_commander' }],
        named_officers: { off_x: { status: 'active', assigned_corps_id: '1st_corps' } },
        corps_command: {
          '1st_corps': {
            commander_state: {
              current_plan: {
                plan_id: 'plan_a',
                status: 'ready',
                objective_description: 'Relieve Jajce',
                target_osids: ['op:jajce:jajce_1'],
                assigned_brigades: ['bde_alpha'],
                concentration_progress: 1,
                viability_score: 0.65,
                staging_zone: 'zone:donji_vakuf:main_body',
              },
              threat_assessment: { overall_pressure: 'heavy' },
              intel_picture: { zone_confidence: { 'zone:donji_vakuf:main_body': 0.72 } },
              belief_state: { supply_continuity_confidence: 0.8 },
              last_plan_reason: 'Concentration complete; authorize launch.',
            },
            active_operations: [
              { id: 'op_a', name: 'Operation A', plan_id: 'plan_a', tg_commander_officer_id: 'off_x', ...opOverrides },
            ],
          },
        },
      },
    };
  }
  const proposal = { id: 'PROP_30_ops_0', faction: 'RBiH', domain: 'ops', proposed_action: 'APPROVE_OP:1st_corps:plan_a' };

  it('matches the ready-current-plan read model and ignores active-operation telemetry', () => {
    const cards = buildOpProposalCardData(state({ force_ratio_estimate: 0.7, commander_assessment: 'abort' }), [proposal]);
    expect(cards).toHaveLength(1);
    const c = cards[0];
    expect(c.proposal_id).toBe('PROP_30_ops_0');
    expect(c.corps_name).toBe('1st Corps');
    expect(c.op_id).toBeNull();
    expect(c.op_name).toBe('Relieve Jajce');
    expect(c.commander.display).toBe('Corps Commander Atif Dudaković');
    expect(c.objective).toBe('Relieve Jajce');
    expect(c.targets).toEqual(['Jajce']);
    expect(c.forces).toEqual(['Alpha Brigade']);
    expect(c.concentration_readiness).toBe('100% concentrated; ready');
    expect(c.intel_assessment).toBe('72% confidence');
    expect(c.supply_assessment).toBe('80% continuity confidence');
    expect(c.risk_assessment).toBe('High pressure; 65% plan viability');
    expect(c.recommendation).toBe('Concentration complete; authorize launch.');
    expect(c.decision_deadline).toBe('Before the next turn advances');
    expect(c.force_ratio).toBe('Unreported');
    expect(c.opportunity_cost).toBe('Unreported');
    expect(c.force_ratio_estimate).toBeNull();
    expect(c.commander_assessment).toBeNull();
    expect(c.override_available).toBe(false);
    expect(c.override_ca_cost).toBe(FORCE_LAUNCH_COST);
  });

  it('humanizes generated opportunity origin and target settlements at the desktop boundary', () => {
    const generated = state({});
    const corps = generated.military.corps_command['1st_corps'];
    corps.commander_state.current_plan.objective_description =
      'offensive opportunity from zone:vrs_2nd_krajina:op:bihac:racic';
    corps.commander_state.current_plan.target_osids = ['op:bihac:orasac_2'];

    const [card] = buildOpProposalCardData(generated, [proposal]);

    expect(card.op_name).toBe('Advance from Racic (Bihac)');
    expect(card.objective).toBe('Advance from Racic (Bihac)');
    expect(card.objective_origin_osid).toBe('op:bihac:racic');
    expect(card.targets).toEqual(['Orasac (Bihac)']);
    expect(card.target_osids).toEqual(['op:bihac:orasac_2']);
    expect(`${card.op_name} ${card.objective} ${card.targets.join(' ')} ${card.summary}`)
      .not.toMatch(/zone:|op:|vrs_2nd_krajina/);
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
    expect(cards[0].op_name).toBe('Unspecified operation');
    expect(cards[0].commander).toBeNull();
    expect(cards[0].force_ratio_estimate).toBeNull();
    expect(cards[0].commander_assessment).toBeNull();
    expect(cards[0].override_available).toBe(false);
  });
});

describe('proactive force-launch card builder (desktop boundary)', () => {
  it('humanizes a generated opportunity origin instead of exposing zone and corps ids', () => {
    const state = {
      military: {
        formations: {
          vrs_1st_krajina: { name: '1st Krajina Corps' },
        },
        named_officer_data: [],
        named_officers: {},
        corps_command: {
          vrs_1st_krajina: {
            commander_state: {
              current_plan: {
                plan_id: 'plan_vrs_1st_krajina_t5_opportunity',
                status: 'ready',
                objective_description:
                  'offensive opportunity from zone:vrs_1st_krajina:op:banja_luka:banja_luka_2',
              },
            },
          },
        },
      },
    };

    const [plan] = buildForceableReadyPlanData(state, []);

    expect(plan.op_name).toBe('Advance from Banja Luka');
    expect(plan.op_name).not.toMatch(/zone:|op:|vrs_1st_krajina|banja_luka_2/);
  });

  it('uses the staging settlement for an opaque pre-planned objective', () => {
    const state = {
      military: {
        formations: {
          vrs_1st_krajina: { name: '1st Krajina Corps' },
        },
        named_officer_data: [],
        named_officers: {},
        corps_command: {
          vrs_1st_krajina: {
            commander_state: {
              current_plan: {
                plan_id: 'plan_vrs_1st_krajina_t18_pre_planned_op',
                status: 'ready',
                objective_description: 'pre_planned_op',
                staging_zone: 'zone:vrs_1st_krajina:op:banja_luka:banja_luka_2',
              },
            },
          },
        },
      },
    };

    const [plan] = buildForceableReadyPlanData(state, []);

    expect(plan.op_name).toBe('Advance from Banja Luka');
    expect(plan.op_name).not.toBe('Unspecified operation');
  });
});
