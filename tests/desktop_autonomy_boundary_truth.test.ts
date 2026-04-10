import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
} = require('../src/desktop/autonomy_ipc_contract.cjs') as {
  getPendingProposalReviewsForPlayer: (state: any) => any[];
  resolvePendingProposalAccess: (
    proposals: any[],
    proposalId: string,
    playerFaction: string | null,
  ) => { index: number; error: string | null };
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
});
