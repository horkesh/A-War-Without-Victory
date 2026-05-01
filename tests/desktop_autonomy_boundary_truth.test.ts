import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
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

  it('wires the desktop handlers through the shared autonomy IPC helper', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');

    expect(source).toContain("require('./autonomy_ipc_contract.cjs')");
    expect(source).toContain('pending_proposal_reviews: getPendingProposalReviewsForPlayer(state)');
    expect(source).toContain('const proposalAccess = resolvePendingProposalAccess(proposals, proposalId, playerFaction);');
  });

  it('routes rich operation-opportunity decisions through a dedicated desktop bridge', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const preloadSource = readFileSync(resolve(process.cwd(), 'src/desktop/preload.cjs'), 'utf8');
    const useIpcSource = readFileSync(resolve(process.cwd(), 'src/ui/map/desktop/useIPC.ts'), 'utf8');

    expect(mainSource).toContain('resolve-operation-opportunity-decision');
    expect(mainSource).toContain('resolveOpportunityDecisionPayload(proposals, payload, playerFaction)');
    expect(mainSource).toContain('proposal.opportunity_decision = decisionAccess.decision;');
    expect(mainSource).toContain('proposal.opportunity_decision_options = decisionAccess.options;');
    expect(preloadSource).toContain('resolveOperationOpportunityDecision');
    expect(preloadSource).toContain("ipcRenderer.invoke('resolve-operation-opportunity-decision'");
    expect(useIpcSource).toContain('resolveOperationOpportunityDecision');
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
