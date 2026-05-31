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

// Phase 2 slice 1 "Back the Officer": force-launch (Level 3 Direct Intervention)
// command-authority cost. MUST match src/ui/map/utils/commandAuthority.ts
// (FORCE_LAUNCH_COST = 15) and the stage-operation-force-launch handler.
const FORCE_LAUNCH_COST = 15;
const APPROVE_OP_PREFIX = 'APPROVE_OP:';

function parseApproveOpAction(action) {
  if (typeof action !== 'string') return null;
  const parts = action.split(':');
  if (parts[0] !== 'APPROVE_OP' || !parts[1] || !parts[2]) return null;
  return { corpsId: parts[1], planId: parts.slice(2).join(':') };
}

function findActiveOpForPlan(cc, planId) {
  if (!cc || typeof cc !== 'object') return null;
  const ops = Array.isArray(cc.active_operations)
    ? cc.active_operations
    : (cc.active_operation && typeof cc.active_operation === 'object' ? [cc.active_operation] : []);
  if (ops.length === 0) return null;
  const byPlan = ops.find((o) => o && (o.plan_id === planId || o.id === planId));
  return byPlan || ops[0] || null;
}

function safeStr(v) {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function humanizeRank(rank) {
  return String(rank)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Build the named-officer decision cards for pending 'ops' proposals, joining
 * each APPROVE_OP:<corps>:<plan> proposal to the matching active operation.
 *
 * Pure / defensive: every join is best-effort; officer / op fields are null
 * when unresolved. Mirrors src/ui/map/data/backTheOfficer.ts buildOpProposalCards
 * for the LIVE get-autonomy-state IPC (AutonomyPanel does not see LoadedGameState).
 * Sorted by proposal id. Decision-only — never mutates state.
 */
function buildOpProposalCardData(state, proposals) {
  if (!Array.isArray(proposals) || proposals.length === 0) return [];
  const military = state && typeof state.military === 'object' ? state.military : null;
  const formations = military && typeof military.formations === 'object' ? military.formations : {};
  const corpsCommand = military && typeof military.corps_command === 'object' ? military.corps_command : {};

  // Player-safe officer roster (name + rank + status) from named_officer_data/_officers.
  const rosterById = new Map();
  const officerData = Array.isArray(military && military.named_officer_data) ? military.named_officer_data : [];
  const officerState = military && typeof military.named_officers === 'object' ? military.named_officers : {};
  for (const d of officerData) {
    const id = d && typeof d.id === 'string' ? d.id : '';
    if (!id) continue;
    const os = officerState[id];
    rosterById.set(id, {
      name: typeof d.name === 'string' ? d.name : 'the field commander',
      rank: typeof d.rank === 'string' ? d.rank : undefined,
      status: os && typeof os.status === 'string' ? os.status : 'active',
    });
  }

  const cards = [];
  for (const proposal of proposals) {
    if (!proposal || proposal.domain !== 'ops') continue;
    const parsed = parseApproveOpAction(proposal.proposed_action);
    if (!parsed) continue;
    const { corpsId, planId } = parsed;
    const cc = corpsCommand[corpsId] || null;
    const op = findActiveOpForPlan(cc, planId);

    const commanderId = op && (safeStr(op.tg_commander_officer_id) || safeStr(op.commander_officer_id));
    const rosterRow = commanderId ? rosterById.get(commanderId) : undefined;
    const commander = commanderId
      ? {
          officer_id: commanderId,
          name: rosterRow ? rosterRow.name : 'the field commander',
          rank: rosterRow ? rosterRow.rank : undefined,
        }
      : null;

    const forceRatio = op && typeof op.force_ratio_estimate === 'number' && Number.isFinite(op.force_ratio_estimate)
      ? op.force_ratio_estimate
      : null;
    const assessment = op && (op.commander_assessment === 'launch' || op.commander_assessment === 'postpone' || op.commander_assessment === 'abort')
      ? op.commander_assessment
      : null;
    const overrideAvailable = assessment === 'postpone' || assessment === 'abort';

    const corpsName = (formations[corpsId] && typeof formations[corpsId].name === 'string')
      ? formations[corpsId].name
      : corpsId;
    const opName = (op && (safeStr(op.name) || safeStr(op.objective_description))) || planId;

    cards.push({
      proposal_id: proposal.id,
      corps_id: corpsId,
      corps_name: corpsName,
      plan_id: planId,
      op_id: op && safeStr(op.id) ? op.id : null,
      op_name: opName,
      commander: commander
        ? { officer_id: commander.officer_id, name: commander.name, rank: commander.rank, display: commander.rank ? `${humanizeRank(commander.rank)} ${commander.name}` : commander.name }
        : null,
      force_ratio_estimate: forceRatio,
      commander_assessment: assessment,
      override_available: overrideAvailable,
      override_ca_cost: FORCE_LAUNCH_COST,
    });
  }

  cards.sort((a, b) => (a.proposal_id < b.proposal_id ? -1 : a.proposal_id > b.proposal_id ? 1 : 0));
  return cards;
}

module.exports = {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
  buildOpProposalCardData,
  FORCE_LAUNCH_COST,
};
