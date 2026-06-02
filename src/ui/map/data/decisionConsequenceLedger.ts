import type {
  LoadedGameState,
  ConvoyDecisionRecordView,
  OperationOpportunityRecordView,
  OfficerDecisionRecordView,
  ParamilitaryDecisionRecordView,
  PeacePlanDecisionRecordView,
  ReserveRequestDecisionRecordView,
} from './types';
import {
  getPlayerSafeCorpsName,
  getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText.js';

export interface DecisionConsequenceRecord {
  id: string;
  turn: number;
  family: string;
  title: string;
  outcome: string;
  detail: string;
  recordTarget: 'records' | 'chronicle';
}

function humanizeToken(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function sentenceToken(value: string | undefined): string {
  const text = humanizeToken(value).trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function opportunityOutcome(record: OperationOpportunityRecordView): string {
  switch (record.response) {
    case 'approve': return 'Approved';
    case 'delay': return 'Delayed';
    case 'redirect': return 'Redirected';
    case 'under_resource': return 'Approved with limits';
    case 'decline': return 'Declined';
    case 'expire': return 'Expired';
    default: return sentenceToken(record.status) || 'Recorded';
  }
}

function opportunityDetail(record: OperationOpportunityRecordView): string {
  const operation = record.executed_op_name ?? 'No operation launched';
  const result = humanizeToken(record.exit_class ?? record.aar_outcome).toLowerCase();
  return result ? `${operation}: ${result}` : operation;
}

function reserveOutcome(record: ReserveRequestDecisionRecordView): string {
  if (record.outcome === 'accepted') return 'Accepted';
  if (record.outcome === 'declined') return 'Declined';
  if (record.outcome === 'terminated') return 'Terminated';
  return sentenceToken(record.outcome) || 'Recorded';
}

function reserveTitle(record: ReserveRequestDecisionRecordView): string {
  const outcome = reserveOutcome(record).toLowerCase();
  return `Reserve request ${outcome}`;
}

function reserveDetail(record: ReserveRequestDecisionRecordView): string {
  // Resolve via the corps display helper so a faction-slug-prefixed id
  // (e.g. `arbih_1st_corps`) renders as "1st Corps" instead of leaking the
  // faction slug as a word ("Arbih 1st Corps").
  const corps = getPlayerSafeCorpsName(record.corps_id, record.corps_id, 'corps');
  const brigade = record.brigade_id ? humanizeToken(record.brigade_id) : null;
  if (record.outcome === 'accepted' && brigade) {
    return `${brigade} assigned to ${corps}. ${record.why_needed || record.reason}`.trim();
  }
  if (record.outcome === 'declined') {
    return `${corps} request declined. ${record.reason || record.why_needed}`.trim();
  }
  if (record.outcome === 'terminated' && brigade) {
    return `${brigade} recalled from ${corps}. ${record.reason || record.how_to_use}`.trim();
  }
  return `${corps}: ${record.reason || record.why_needed || 'Decision filed.'}`.trim();
}

function peaceOutcome(record: PeacePlanDecisionRecordView): string {
  if (record.playerResponse === 'accepted') return 'Accepted';
  if (record.playerResponse === 'rejected') return 'Rejected';
  return 'Pending';
}

function peaceResponseLabel(response: 'accepted' | 'rejected' | 'pending'): string {
  if (response === 'accepted') return 'accepted';
  if (response === 'rejected') return 'rejected';
  return 'pending';
}

function peaceDetail(record: PeacePlanDecisionRecordView): string {
  const playerVerb = record.playerResponse === 'accepted'
    ? 'accepted'
    : record.playerResponse === 'rejected'
      ? 'rejected'
      : 'left pending';
  const responses = ['RBiH', 'RS', 'HRHB']
    .filter((faction) => record.responses[faction])
    .map((faction) => `${getPlayerSafeMilitaryFactionName(faction, faction)} ${peaceResponseLabel(record.responses[faction]!)}`)
    .join(', ');
  return responses
    ? `Your government ${playerVerb} the proposal; ${responses}.`
    : `Your government ${playerVerb} the proposal.`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function daytonDetail(verdict: NonNullable<LoadedGameState['gameVerdict']>): string {
  const result = verdict.dayton_result;
  if (!result) return 'Final settlement filed in the campaign record.';
  const accepted = result.territorial_packages_accepted?.length ?? 0;
  const rejected = result.territorial_packages_rejected?.length ?? 0;
  const split = ['RBiH', 'RS', 'HRHB']
    .filter((faction) => typeof result.final_territory_split?.[faction] === 'number')
    .map((faction) => `${getPlayerSafeMilitaryFactionName(faction, faction)} ${result.final_territory_split[faction]}%`)
    .join(', ');
  const overrideCount = result.patron_overrides_applied?.length ?? 0;
  const pieces = [`Accepted ${pluralize(accepted, 'territorial package')}; ${rejected} left with default holders.`];
  if (split) pieces.push(`Final territory split: ${split}.`);
  if (overrideCount > 0) pieces.push(`Patron overrides applied: ${overrideCount}.`);
  return pieces.join(' ');
}

function convoyOutcome(record: ConvoyDecisionRecordView): string {
  if (record.decision === 'allow') return 'Allowed';
  if (record.decision === 'block') return 'Blocked';
  return 'Diverted';
}

function convoyTitle(record: ConvoyDecisionRecordView): string {
  return `Convoy ${convoyOutcome(record).toLowerCase()}`;
}

function convoyDetail(record: ConvoyDecisionRecordView): string {
  const enclave = record.target_enclave
    ? record.target_enclave.includes(' ')
      ? record.target_enclave
      : humanizeToken(record.target_enclave)
    : 'the enclave';
  const route = record.route_faction
    ? getPlayerSafeMilitaryFactionName(record.route_faction, record.route_faction)
    : 'route faction';
  const target = record.target_faction
    ? getPlayerSafeMilitaryFactionName(record.target_faction, record.target_faction)
    : 'the enclave garrison';
  if (record.decision === 'allow') {
    return `Convoy to ${enclave} allowed through ${route} lines; aid delivered to ${target}.`;
  }
  if (record.decision === 'block') {
    return `Convoy to ${enclave} blocked on the ${route} route; diplomatic pressure increased.`;
  }
  return `Convoy to ${enclave} diverted through ${route} lines; aid split with ${target}.`;
}

function paramilitaryOutcome(record: ParamilitaryDecisionRecordView): string {
  if (record.decision === 'allow') return 'Authorized';
  if (record.decision === 'deny') return 'Refused';
  return 'Referred to regular forces';
}

function paramilitaryTitle(record: ParamilitaryDecisionRecordView): string {
  if (record.decision === 'allow') return 'Paramilitary deployment authorized';
  if (record.decision === 'deny') return 'Paramilitary deployment refused';
  return 'Regular forces prioritized';
}

function paramilitaryDetail(record: ParamilitaryDecisionRecordView): string {
  const risk = typeof record.estimated_civilian_risk === 'number'
    ? ` Estimated civilian risk: ${record.estimated_civilian_risk}.`
    : '';
  const faction = getPlayerSafeMilitaryFactionName(record.faction, record.faction);
  if (record.decision === 'allow') {
    return `Paramilitary deployment authorized for ${faction} rear-pocket cleanup.${risk}`;
  }
  if (record.decision === 'deny') {
    return `Paramilitary deployment refused for ${faction}; request removed from the authorization queue.${risk}`;
  }
  return `Regular forces directed to handle the ${faction} rear-pocket request.${risk}`;
}

function officerOutcome(record: OfficerDecisionRecordView): string {
  if (record.decision === 'replacement_accepted') return 'Accepted';
  if (record.decision === 'override_confirmed') return 'Override confirmed';
  return 'Acknowledged';
}

function officerTitle(record: OfficerDecisionRecordView): string {
  if (record.decision === 'replacement_accepted') return 'Commander replacement accepted';
  if (record.decision === 'override_confirmed') return 'Commander interpretation overridden';
  return record.event_type === 'replacement_suggested' ? 'Commander replacement reviewed' : 'Personnel matter reviewed';
}

function officerDetail(record: OfficerDecisionRecordView): string {
  const corps = record.corps_name || humanizeToken(record.corps_id) || 'the command';
  if (record.decision === 'replacement_accepted') {
    const incoming = record.new_officer_name || record.officer_name || 'New commander';
    const outgoing = record.outgoing_officer_name || record.current_commander_name;
    return outgoing
      ? `${incoming} appointed to ${corps}; ${outgoing} retired.`
      : `${incoming} appointed to ${corps}.`;
  }
  if (record.decision === 'override_confirmed') {
    return `${record.officer_name || 'Staff officer'} was directed to follow the presidential order for ${corps}.`;
  }
  return `${record.officer_name || 'Staff officer'} personnel matter reviewed for ${corps}.`;
}

function compareRecords(a: DecisionConsequenceRecord, b: DecisionConsequenceRecord): number {
  if (a.turn !== b.turn) return b.turn - a.turn;
  return a.id.localeCompare(b.id);
}

export function buildDecisionConsequenceLedger(
  state: LoadedGameState | null | undefined,
  limit = 5,
): DecisionConsequenceRecord[] {
  if (!state) return [];

  const records: DecisionConsequenceRecord[] = [];

  for (const event of state.firedEvents ?? []) {
    if (!event.isDecision) continue;
    records.push({
      id: `event:${event.id}`,
      turn: event.turn,
      family: 'Event decision',
      title: event.title || 'Recorded decision',
      outcome: 'Decision recorded',
      detail: event.effects?.[0]?.description ?? event.narrative ?? 'Filed in the campaign record.',
      recordTarget: 'chronicle',
    });
  }

  for (const opportunity of state.operationOpportunityRecords ?? []) {
    if (!opportunity.response_turn && opportunity.status === 'eligible_pending_review') continue;
    records.push({
      id: `opportunity:${opportunity.proposal_id}`,
      turn: opportunity.response_turn ?? opportunity.eligibility_turn ?? state.turn,
      family: 'Operation opportunity',
      title: opportunity.display_name,
      outcome: opportunityOutcome(opportunity),
      detail: opportunityDetail(opportunity),
      recordTarget: 'records',
    });
  }

  for (const reserve of state.reserveRequestHistory ?? []) {
    records.push({
      id: `reserve:${reserve.request_id}`,
      turn: reserve.turn,
      family: 'Army reserve',
      title: reserveTitle(reserve),
      outcome: reserveOutcome(reserve),
      detail: reserveDetail(reserve),
      recordTarget: 'records',
    });
  }

  for (const peace of state.peacePlanHistory ?? []) {
    if (!peace.resolved) continue;
    records.push({
      id: `peace:${peace.planId}:${peace.turnOffered}`,
      turn: peace.turnOffered,
      family: 'Peace proposal',
      title: peace.planName || 'Peace proposal',
      outcome: peaceOutcome(peace),
      detail: peaceDetail(peace),
      recordTarget: 'chronicle',
    });
  }

  if (state.gameVerdict?.outcome_type === 'dayton' && state.gameVerdict.dayton_result) {
    records.push({
      id: `dayton:${state.gameVerdict.turn}`,
      turn: state.gameVerdict.turn,
      family: 'Dayton settlement',
      title: state.gameVerdict.outcome_label || 'Dayton Peace Agreement',
      outcome: 'Agreement signed',
      detail: daytonDetail(state.gameVerdict),
      recordTarget: 'chronicle',
    });
  }

  for (const convoy of state.convoyDecisionHistory ?? []) {
    records.push({
      id: `convoy:${convoy.id}`,
      turn: convoy.turn,
      family: 'Humanitarian convoy',
      title: convoyTitle(convoy),
      outcome: convoyOutcome(convoy),
      detail: convoyDetail(convoy),
      recordTarget: 'chronicle',
    });
  }

  for (const paramilitary of state.paramilitaryDecisionHistory ?? []) {
    records.push({
      id: `paramilitary:${paramilitary.id}`,
      turn: paramilitary.turn,
      family: 'Paramilitary authorization',
      title: paramilitaryTitle(paramilitary),
      outcome: paramilitaryOutcome(paramilitary),
      detail: paramilitaryDetail(paramilitary),
      recordTarget: 'records',
    });
  }

  for (const officer of state.officerDecisionHistory ?? []) {
    records.push({
      id: `officer:${officer.id}`,
      turn: officer.turn,
      family: 'Officer personnel',
      title: officerTitle(officer),
      outcome: officerOutcome(officer),
      detail: officerDetail(officer),
      recordTarget: 'records',
    });
  }

  return records.sort(compareRecords).slice(0, Math.max(0, limit));
}
