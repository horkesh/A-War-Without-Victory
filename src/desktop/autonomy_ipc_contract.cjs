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
// Proactive presidential force-launch (override-without-proposal) command-authority
// cost. MUST match src/ui/map/utils/commandAuthority.ts (PROACTIVE_FORCE_LAUNCH_COST
// = 25) and the proactive-force-launch-op handler.
const PROACTIVE_FORCE_LAUNCH_COST = 25;
// Author-new-op (Free War Phase 4, #67) command-authority cost. MUST match
// src/ui/map/utils/commandAuthority.ts (AUTHOR_OP_COST = 25).
const AUTHOR_OP_COST = 25;
// STOP-OP presidential lever (Presidential Command Model slice 1/N) command-authority
// cost: halting a LIVE operation trades the military opportunity for command authority.
// Priced equal to a proactive force-launch (25) — the president is overriding the
// officer's in-progress effort. MUST match src/ui/map/utils/commandAuthority.ts
// (STOP_OP_COST = 25) and the stage-op-halt-order handler (op_halt.cjs).
const STOP_OP_COST = 25;
// REQUEST-OP presidential lever (Presidential Command Model slice 2/N) command-authority
// cost: the president names a strategic OBJECTIVE (target OSID) for a corps and the engine
// builds the operation a commander would (auto-selecting brigades + axis). Priced equal to
// AUTHOR_OP_COST / STOP_OP_COST (25). MUST match src/ui/map/utils/commandAuthority.ts
// (REQUEST_OP_COST = 25) and the stage-op-directive-order handler (op_directive_staging.cjs).
const REQUEST_OP_COST = 25;
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

/**
 * Build the list of corps plans held at 'ready' with NO surfaced proposal —
 * the candidates for a PROACTIVE presidential force-launch (override without
 * proposal). Mirrors src/ui/map/data/backTheOfficer.ts buildForceableReadyPlans
 * for the LIVE get-autonomy-state IPC (AutonomyPanel does not see LoadedGameState).
 *
 * A plan is forceable iff corps.commander_state.current_plan.status === 'ready'
 * AND no pending proposal carries APPROVE_OP:<corps>:<plan_id> for it.
 * Pure / defensive / deterministic — sorted by corps id then plan id. Never mutates.
 */
function buildForceableReadyPlanData(state, proposals) {
  const military = state && typeof state.military === 'object' ? state.military : null;
  if (!military) return [];
  const corpsCommand = military && typeof military.corps_command === 'object' ? military.corps_command : null;
  if (!corpsCommand) return [];
  const formations = military && typeof military.formations === 'object' ? military.formations : {};

  // Player-ownership: only surface plans for the player faction's own corps.
  // Corps→faction is the corps formation's faction (corps_command key is a
  // FormationId in military.formations). When player_faction is unknown (null),
  // keep all (defensive — mirrors getPendingProposalReviewsForPlayer).
  const playerFaction = state && state.meta && typeof state.meta.player_faction === 'string'
    ? state.meta.player_faction
    : null;

  // Player-safe officer roster (name + rank + status).
  const rosterById = new Map();
  const officerData = Array.isArray(military.named_officer_data) ? military.named_officer_data : [];
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

  // Active corps commander per corps (status active + assigned to the corps).
  const commanderIdByCorps = new Map();
  for (const oid of Object.keys(officerState).sort()) {
    const os = officerState[oid];
    if (!os || typeof os !== 'object') continue;
    if (os.status !== 'active') continue;
    const corpsId = typeof os.assigned_corps_id === 'string' ? os.assigned_corps_id : '';
    if (corpsId && !commanderIdByCorps.has(corpsId)) commanderIdByCorps.set(corpsId, oid);
  }

  // Plan ids already surfaced as a proposal — excluded (existing path owns those).
  const proposedPlanKeys = new Set();
  for (const p of Array.isArray(proposals) ? proposals : []) {
    const parsed = parseApproveOpAction(p && p.proposed_action);
    if (parsed) proposedPlanKeys.add(`${parsed.corpsId}:${parsed.planId}`);
  }

  const views = [];
  for (const corpsId of Object.keys(corpsCommand).sort()) {
    const cc = corpsCommand[corpsId];
    if (!cc || typeof cc !== 'object') continue;
    // Skip corps that don't belong to the player faction.
    const corpsFaction = formations[corpsId] && typeof formations[corpsId].faction === 'string'
      ? formations[corpsId].faction
      : null;
    if (playerFaction && corpsFaction && corpsFaction !== playerFaction) continue;
    const cmdState = cc.commander_state && typeof cc.commander_state === 'object' ? cc.commander_state : null;
    const plan = cmdState && cmdState.current_plan && typeof cmdState.current_plan === 'object' ? cmdState.current_plan : null;
    if (!plan) continue;
    if (plan.status !== 'ready') continue;
    const planId = safeStr(plan.plan_id);
    if (!planId) continue;
    if (proposedPlanKeys.has(`${corpsId}:${planId}`)) continue;

    const commanderId = commanderIdByCorps.get(corpsId);
    const rosterRow = commanderId ? rosterById.get(commanderId) : undefined;
    const corpsName = (formations[corpsId] && typeof formations[corpsId].name === 'string')
      ? formations[corpsId].name
      : corpsId;
    views.push({
      corps_id: corpsId,
      corps_name: corpsName,
      plan_id: planId,
      op_name: safeStr(plan.objective_description) || planId,
      commander: commanderId
        ? {
            officer_id: commanderId,
            name: rosterRow ? rosterRow.name : 'the field commander',
            rank: rosterRow ? rosterRow.rank : undefined,
            display: rosterRow && rosterRow.rank
              ? `${humanizeRank(rosterRow.rank)} ${rosterRow.name}`
              : (rosterRow ? rosterRow.name : 'the field commander'),
          }
        : null,
      commander_assessment: safeStr(cmdState.last_plan_reason) || null,
      force_ca_cost: PROACTIVE_FORCE_LAUNCH_COST,
    });
  }

  views.sort((a, b) => (a.corps_id < b.corps_id ? -1 : a.corps_id > b.corps_id ? 1 : (a.plan_id < b.plan_id ? -1 : a.plan_id > b.plan_id ? 1 : 0)));
  return views;
}

module.exports = {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
  buildOpProposalCardData,
  buildForceableReadyPlanData,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  AUTHOR_OP_COST,
  STOP_OP_COST,
  REQUEST_OP_COST,
};
