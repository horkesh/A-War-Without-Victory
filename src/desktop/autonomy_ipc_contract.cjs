'use strict';

const OPPORTUNITY_PREFIX = 'OPPORTUNITY:';
const OPPORTUNITY_DECISIONS = new Set(['approve', 'delay', 'redirect', 'under_resource', 'decline']);
const COMMITMENT_PROFILES = new Set(['minimum', 'standard', 'reinforced']);

function isResolvedProposalReviewRecord(proposal) {
  return proposal?.accepted != null
    || proposal?.resolved_turn != null
    || proposal?.opportunity_decision != null;
}

function getPendingProposalReviewsForPlayer(state) {
  const proposals = Array.isArray(state?.meta?.pending_proposal_reviews)
    ? state.meta.pending_proposal_reviews
    : [];
  const playerFaction = state?.meta?.player_faction ?? null;
  const unresolved = proposals.filter((proposal) => !isResolvedProposalReviewRecord(proposal));
  if (!playerFaction) return unresolved;
  return unresolved.filter((proposal) => proposal?.faction === playerFaction);
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
  if (isResolvedProposalReviewRecord(proposal)) {
    return { index: -1, error: 'already_resolved' };
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
  if (isResolvedProposalReviewRecord(proposal)) {
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
// ELITE-DEPLOY presidential lever (Presidential Command Model) command-authority
// cost: releasing an elite/special formation from the strategic reserve to a corps.
// Priced equal to a STOP-OP / proactive force-launch (25). MUST match
// src/ui/map/utils/commandAuthority.ts (ELITE_DEPLOY_COST = 25). The debit lives
// ONLY in approveReserveRequest (player IPC path) — NEVER in deployEliteLoan or the
// headless/calibration reserve auto-deploy path.
const ELITE_DEPLOY_COST = 25;
// REPLACE-CO presidential lever (Presidential Command Model slice 3/N) command-authority
// cost: sacking a corps's commanding officer and installing a replacement trades command
// authority for a cohesion/morale cost. Priced equal to the other override levers (25).
// MUST match src/ui/map/utils/commandAuthority.ts (REPLACE_CO_COST = 25) and the
// stage-co-replacement-order handler (co_replacement.cjs). RS officer-revolt asymmetry
// emerges from officer-disposition DATA, NOT from a faction-keyed cost.
const REPLACE_CO_COST = 25;
// FRONT-VISIT presidential leadership action cost (Presidential Command Surface §10):
// the president visits the front as a morale/leadership gesture, force-queuing the
// authored visit_to_front_<faction> event. Priced LOWER than the override levers (10,
// matching the stabilize-command-relationship action) because it is a leadership
// gesture, not an officer override. MUST match src/ui/map/utils/commandAuthority.ts
// (FRONT_VISIT_COST = 10) and the initiate-front-visit IPC handler. Cooldown/cap reuse
// the event's OWN recurrence (max_fires 5 / cooldown 10t), not a CA-side timer.
const FRONT_VISIT_COST = 10;
// ADDRESS-THE-NATION presidential leadership action cost (Presidential Command
// Surface §10, deferred companion to front visit): the president addresses the
// nation as a morale/leadership gesture, force-queuing the authored
// address_to_nation_<faction> event. Priced like the front visit (10) — a
// leadership gesture, not an officer override. MUST match
// src/ui/map/utils/commandAuthority.ts (ADDRESS_NATION_COST = 10) and the
// initiate-address-nation IPC handler. Cooldown/cap reuse the event's OWN
// recurrence (max_fires 5 / cooldown 10t), not a CA-side timer.
const ADDRESS_NATION_COST = 10;
// DECORATE-A-UNIT presidential leadership action cost (Presidential Command
// Surface §10, deferred companion to front visit): the president decorates a
// REGULAR formation (bright line — never paramilitaries), force-queuing the
// authored decorate_a_unit_<faction> event with per-unit branches. Priced like
// the front visit (10). MUST match src/ui/map/utils/commandAuthority.ts
// (DECORATE_UNIT_COST = 10) and the initiate-decorate-unit IPC handler.
// Cooldown/cap reuse the event's OWN recurrence (max_fires 5 / cooldown 10t).
const DECORATE_UNIT_COST = 10;
const APPROVE_OP_PREFIX = 'APPROVE_OP:';

function parseApproveOpAction(action) {
  if (typeof action !== 'string') return null;
  const parts = action.split(':');
  if (parts[0] !== 'APPROVE_OP' || !parts[1] || !parts[2]) return null;
  return { corpsId: parts[1], planId: parts.slice(2).join(':') };
}

function findReadyPlan(cc, planId) {
  if (!cc || typeof cc !== 'object') return null;
  const commanderState = cc.commander_state && typeof cc.commander_state === 'object' ? cc.commander_state : null;
  const plan = commanderState && commanderState.current_plan && typeof commanderState.current_plan === 'object'
    ? commanderState.current_plan
    : null;
  if (!plan || plan.plan_id !== planId || plan.status !== 'ready') return null;
  return { commanderState, plan };
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

function humanizeIdentifier(value) {
  return String(value)
    .replace(/[:_-]+/g, ' ')
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function looksLikeRawToken(value) {
  const raw = safeStr(value);
  return Boolean(raw && (
    /\b(?:op|evt|event|csq|sector|formation|corps|cmd):[a-z0-9_:-]+\b/i.test(raw)
    || /\b[a-z]{2,}_[a-z0-9_]{2,}\b/i.test(raw)
    || /\b[A-Z]{2,}_[A-Z0-9_]{2,}\b/.test(raw)
  ));
}

function playerSafeCorpsName(name, id) {
  const rawName = safeStr(name);
  if (rawName && !looksLikeRawToken(rawName)) return rawName;
  const rawId = safeStr(id);
  if (!rawId) return 'Unreported command';
  const withoutFaction = rawId.replace(/^(?:arbih|rbih|vrs|rs|hrhb|hvo)_/i, '');
  return humanizeIdentifier(withoutFaction.replace(/_corps$/i, ' Corps')) || 'Unreported command';
}

function playerSafeFormationName(name) {
  const raw = safeStr(name);
  if (!raw) return 'Unreported formation';
  return looksLikeRawToken(raw) ? humanizeIdentifier(raw) : raw;
}

function humanizeOsid(value) {
  const parts = String(value || '').split(':').filter(Boolean);
  const slug = parts.length >= 3 ? parts[parts.length - 1] : parts[parts.length - 1] || '';
  const municipality = parts.length >= 3 ? parts[parts.length - 2] : '';
  const humanize = (token) => String(token || '')
    .replace(/_\d+$/, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const label = humanize(slug) || 'Unreported';
  const municipalityLabel = humanize(municipality);
  return municipalityLabel && municipalityLabel.toLowerCase() !== label.toLowerCase()
    ? `${label} (${municipalityLabel})`
    : label;
}

function zoneAnchorOsid(value) {
  const parts = String(value || '').split(':').filter(Boolean);
  if (parts[0] === 'zone' && parts.length >= 4) {
    const anchor = parts.slice(2).join(':');
    return anchor.startsWith('op:') ? anchor : null;
  }
  return parts[0] === 'op' && parts.length >= 3 ? parts.join(':') : null;
}

function playerSafePlanName(value, fallbackAnchor) {
  const candidates = [
    { raw: safeStr(value), fallback: false },
    { raw: safeStr(fallbackAnchor), fallback: true },
  ];
  for (const candidate of candidates) {
    const raw = candidate.raw;
    if (!raw) continue;
    const opportunityMatch = raw.match(/\boffensive opportunity from\s+((?:zone|op):[a-z0-9_:-]+)/i);
    if (opportunityMatch && opportunityMatch[1]) {
      const originOsid = zoneAnchorOsid(opportunityMatch[1]);
      if (originOsid) return { label: `Advance from ${humanizeOsid(originOsid)}`, originOsid };
    }
    const osid = zoneAnchorOsid(raw);
    if (osid) {
      return {
        label: `${candidate.fallback ? 'Advance from ' : ''}${humanizeOsid(osid)}`,
        originOsid: candidate.fallback ? osid : null,
      };
    }
    if (/^plan[_:-]|^op[_:-]|^[a-z0-9]+(?:[_:][a-z0-9]+)+$/i.test(raw)) continue;
    return { label: raw, originOsid: null };
  }
  return { label: 'Unspecified operation', originOsid: null };
}

function playerSafeTarget(value) {
  const raw = safeStr(value);
  if (!raw) return 'Unreported';
  const osid = zoneAnchorOsid(raw);
  return osid ? humanizeOsid(osid) : humanizeIdentifier(raw);
}

function percentage(value, suffix) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(Math.max(0, Math.min(1, value)) * 100)}% ${suffix}`
    : 'Unreported';
}

/**
 * Build the named-officer decision cards for pending 'ops' proposals from the
 * exact ready current_plan referenced by APPROVE_OP:<corps>:<plan>.
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
  const commanderIdByCorps = new Map();
  for (const officerId of Object.keys(officerState).sort()) {
    const officer = officerState[officerId];
    if (!officer || typeof officer !== 'object' || officer.status !== 'active') continue;
    const corpsId = safeStr(officer.assigned_corps_id);
    if (corpsId && !commanderIdByCorps.has(corpsId)) commanderIdByCorps.set(corpsId, officerId);
  }

  const cards = [];
  for (const proposal of proposals) {
    if (!proposal || proposal.domain !== 'ops') continue;
    const parsed = parseApproveOpAction(proposal.proposed_action);
    if (!parsed) continue;
    const { corpsId, planId } = parsed;
    const cc = corpsCommand[corpsId] || null;
    const ready = findReadyPlan(cc, planId);
    const plan = ready ? ready.plan : null;
    const commanderState = ready ? ready.commanderState : null;

    const commanderId = ready ? commanderIdByCorps.get(corpsId) : undefined;
    const rosterRow = commanderId ? rosterById.get(commanderId) : undefined;
    const commander = commanderId
      ? {
          officer_id: commanderId,
          name: rosterRow ? rosterRow.name : 'the field commander',
          rank: rosterRow ? rosterRow.rank : undefined,
        }
      : null;

    const corpsName = playerSafeCorpsName(formations[corpsId] && formations[corpsId].name, corpsId);
    const objective = playerSafePlanName(plan && plan.objective_description, plan && plan.staging_zone);
    const opName = objective.label;
    const targetIds = plan && Array.isArray(plan.target_osids) ? plan.target_osids : [];
    const targets = targetIds.length > 0 ? targetIds.map(playerSafeTarget) : ['Unreported'];
    const brigadeIds = plan && Array.isArray(plan.assigned_brigades) ? plan.assigned_brigades : [];
    const forces = brigadeIds.length > 0
      ? brigadeIds.map((id) => playerSafeFormationName(formations[id] && formations[id].name))
      : ['Unreported'];
    const concentration = percentage(plan && plan.concentration_progress, 'concentrated');
    const concentrationReadiness = concentration === 'Unreported' ? concentration : `${concentration}; ready`;
    const stagingZone = plan && safeStr(plan.staging_zone);
    const zoneConfidence = commanderState && commanderState.intel_picture && typeof commanderState.intel_picture.zone_confidence === 'object'
      ? commanderState.intel_picture.zone_confidence
      : {};
    const intelAssessment = percentage(stagingZone ? zoneConfidence[stagingZone] : undefined, 'confidence');
    const supplyAssessment = percentage(
      commanderState && commanderState.belief_state && commanderState.belief_state.supply_continuity_confidence,
      'continuity confidence',
    );
    const pressureMap = { low: 'Low', moderate: 'Moderate', heavy: 'High', critical: 'Critical' };
    const pressure = commanderState && commanderState.threat_assessment
      ? pressureMap[commanderState.threat_assessment.overall_pressure] || 'Unreported'
      : 'Unreported';
    const viability = percentage(plan && plan.viability_score, 'plan viability');
    const riskAssessment = pressure === 'Unreported' && viability === 'Unreported' ? 'Unreported' : `${pressure} pressure; ${viability}`;
    const rawRecommendation = safeStr(commanderState && commanderState.last_plan_reason);
    const recommendation = rawRecommendation && !looksLikeRawToken(rawRecommendation)
      ? rawRecommendation
      : ready ? 'Authorize launch' : 'Unreported';
    const forceSummary = forces.length > 0 ? forces.join(' and ') : 'forces unreported';
    const commanderSummary = commander && commander.name ? ` commander ${commander.name}` : '';
    const summary = ready
      ? `${corpsName}${commanderSummary} requests authorization to ${opName.charAt(0).toLowerCase()}${opName.slice(1)} with ${forceSummary}; decision due before the next turn advances.`
      : `${corpsName} has an operation approval record, but the ready plan is unreported.`;

    cards.push({
      proposal_id: proposal.id,
      corps_id: corpsId,
      corps_name: corpsName,
      plan_id: planId,
      op_id: null,
      op_name: opName,
      commander: commander
        ? { officer_id: commander.officer_id, name: commander.name, rank: commander.rank, display: commander.rank ? `${humanizeRank(commander.rank)} ${commander.name}` : commander.name }
        : null,
      force_ratio_estimate: null,
      commander_assessment: null,
      override_available: false,
      override_ca_cost: FORCE_LAUNCH_COST,
      objective: opName,
      ...(objective.originOsid ? { objective_origin_osid: objective.originOsid } : {}),
      targets,
      target_osids: targetIds.filter((value) => typeof value === 'string' && value.length > 0),
      forces,
      concentration_readiness: concentrationReadiness,
      intel_assessment: intelAssessment,
      supply_assessment: supplyAssessment,
      risk_assessment: riskAssessment,
      recommendation,
      decision_deadline: 'Before the next turn advances',
      force_ratio: 'Unreported',
      opportunity_cost: 'Unreported',
      summary,
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
      op_name: playerSafePlanName(plan.objective_description, plan.staging_zone).label,
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
  isResolvedProposalReviewRecord,
  buildOpProposalCardData,
  buildForceableReadyPlanData,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  AUTHOR_OP_COST,
  STOP_OP_COST,
  REQUEST_OP_COST,
  ELITE_DEPLOY_COST,
  REPLACE_CO_COST,
  FRONT_VISIT_COST,
  ADDRESS_NATION_COST,
  DECORATE_UNIT_COST,
};
