'use strict';

function getPendingProposalReviewsForPlayer(state) {
  const proposals = Array.isArray(state?.meta?.pending_proposal_reviews)
    ? state.meta.pending_proposal_reviews
    : [];
  const playerFaction = state?.meta?.player_faction ?? null;
  if (!playerFaction) return proposals;
  return proposals.filter((proposal) => proposal?.faction === playerFaction);
}

function resolvePendingProposalAccess(proposals, proposalId, playerFaction) {
  if (!Array.isArray(proposals) || typeof proposalId !== 'string') {
    return { index: -1, error: 'proposal_not_found' };
  }

  const proposalIndex = proposals.findIndex((proposal) => proposal?.id === proposalId);
  if (proposalIndex === -1) {
    return { index: -1, error: 'proposal_not_found' };
  }

  const proposal = proposals[proposalIndex];
  if (playerFaction && proposal?.faction !== playerFaction) {
    return { index: -1, error: 'proposal_not_owned_by_player' };
  }

  return { index: proposalIndex, error: null };
}

module.exports = {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
};
