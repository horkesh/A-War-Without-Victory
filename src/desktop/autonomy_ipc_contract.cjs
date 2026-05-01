'use strict';

const OPPORTUNITY_PREFIX = 'OPPORTUNITY:';
const OPPORTUNITY_DECISIONS = new Set(['approve', 'delay', 'redirect', 'under_resource', 'decline']);
const COMMITMENT_PROFILES = new Set(['minimum', 'standard', 'reinforced']);

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

function sanitizeOpportunityDecisionOptions(payload, decision) {
  const options = {};
  if (decision === 'delay') {
    if (payload.delayTurns !== undefined) {
      if (!Number.isInteger(payload.delayTurns) || payload.delayTurns < 1) {
        return { error: 'invalid_delay_turns' };
      }
      options.delay_turns = payload.delayTurns;
    }
  }
  if (decision === 'redirect') {
    if (typeof payload.redirectVariantId !== 'string' || payload.redirectVariantId.length === 0) {
      return { error: 'missing_redirect_variant' };
    }
    options.redirect_variant_id = payload.redirectVariantId;
  }
  if (decision === 'under_resource') {
    options.commitment_profile = 'minimum';
  } else if (payload.commitmentProfile !== undefined) {
    if (!COMMITMENT_PROFILES.has(payload.commitmentProfile)) {
      return { error: 'invalid_commitment_profile' };
    }
    options.commitment_profile = payload.commitmentProfile;
  }
  return { options };
}

function resolveOpportunityDecisionPayload(proposals, payload, playerFaction) {
  if (!payload || typeof payload !== 'object') {
    return { index: -1, error: 'invalid_payload' };
  }
  const { reviewId, proposalId, decision } = payload;
  if (typeof reviewId !== 'string' || typeof proposalId !== 'string') {
    return { index: -1, error: 'invalid_payload' };
  }
  if (typeof decision !== 'string' || !OPPORTUNITY_DECISIONS.has(decision)) {
    return { index: -1, error: 'invalid_decision' };
  }

  const proposalAccess = resolvePendingProposalAccess(proposals, reviewId, playerFaction);
  if (proposalAccess.index === -1) {
    return proposalAccess;
  }

  const proposal = proposals[proposalAccess.index];
  const action = typeof proposal?.proposed_action === 'string' ? proposal.proposed_action : '';
  if (!action.startsWith(OPPORTUNITY_PREFIX)) {
    return { index: -1, error: 'not_operation_opportunity' };
  }
  if (action.slice(OPPORTUNITY_PREFIX.length) !== proposalId) {
    return { index: -1, error: 'proposal_id_mismatch' };
  }
  if (proposal.accepted !== undefined || proposal.opportunity_decision !== undefined) {
    return { index: -1, error: 'already_resolved' };
  }

  const optionResult = sanitizeOpportunityDecisionOptions(payload, decision);
  if (optionResult.error) {
    return { index: -1, error: optionResult.error };
  }
  return {
    index: proposalAccess.index,
    error: null,
    decision,
    options: optionResult.options,
  };
}

module.exports = {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
};
