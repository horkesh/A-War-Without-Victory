import type {
  FormationView,
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
  familyId: DecisionConsequenceFamilyId;
  family: string;
  title: string;
  outcome: string;
  detail: string;
  recordTarget: 'records' | 'chronicle';
}

export type DecisionConsequenceFamilyId =
  | 'event-decision'
  | 'operation-opportunity'
  | 'army-reserve'
  | 'peace-proposal'
  | 'dayton-settlement'
  | 'humanitarian-convoy'
  | 'paramilitary-authorization'
  | 'patron-relations'
  | 'officer-personnel';

export interface DecisionConsequenceLedgerSummary {
  total: number;
  recordsRouteCount: number;
  chronicleRouteCount: number;
  latestTurn: number | null;
  latestTitle: string | null;
  families: string[];
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
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

function authoredDisplayName(name: string | null | undefined, id: string | null | undefined): string | null {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return null;
  if (id && trimmed === id) return null;
  return trimmed;
}

function buildFormationDisplayMaps(formations: readonly FormationView[] | undefined): {
  formationNames: ReadonlyMap<string, string>;
  corpsNames: ReadonlyMap<string, string>;
} {
  const formationNames = new Map<string, string>();
  const corpsNames = new Map<string, string>();
  for (const formation of formations ?? []) {
    const name = authoredDisplayName(formation.name, formation.id);
    if (!name) continue;
    formationNames.set(formation.id, name);
    if (formation.kind.includes('corps')) {
      corpsNames.set(formation.id, getPlayerSafeCorpsName(name, formation.id, name));
    }
  }
  return { formationNames, corpsNames };
}

const RESERVE_REASON_LABELS: Record<string, string> = {
  offensive_support: 'offensive support',
  defensive_gap: 'defensive gap',
  exploitation: 'exploitation reserve',
  enclave_relief: 'enclave relief',
};

function safeReserveReasonCopy(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const mapped = RESERVE_REASON_LABELS[trimmed];
  if (mapped) return mapped;
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(trimmed)) return null;
  return trimmed;
}

function reserveDetail(
  record: ReserveRequestDecisionRecordView,
  displayMaps: { formationNames: ReadonlyMap<string, string>; corpsNames: ReadonlyMap<string, string> },
): string {
  const corps = record.corps_id
    ? displayMaps.corpsNames.get(record.corps_id) ?? 'this corps command'
    : 'this corps command';
  const brigade = record.brigade_id
    ? displayMaps.formationNames.get(record.brigade_id) ?? 'the reserve brigade'
    : null;
  if (record.outcome === 'accepted' && brigade) {
    return `${brigade} assigned to ${corps}. ${record.why_needed || safeReserveReasonCopy(record.reason) || 'Decision filed.'}`.trim();
  }
  if (record.outcome === 'declined') {
    return `${corps} request declined. ${safeReserveReasonCopy(record.reason) || record.why_needed || 'Reserve decision filed.'}`.trim();
  }
  if (record.outcome === 'terminated' && brigade) {
    return `${brigade} recalled from ${corps}. ${safeReserveReasonCopy(record.reason) || record.how_to_use || 'Reserve decision filed.'}`.trim();
  }
  return `${corps}: ${safeReserveReasonCopy(record.reason) || record.why_needed || 'Decision filed.'}`.trim();
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

function patronLabelForFaction(faction: string): string {
  if (faction === 'RS') return 'Serbia';
  if (faction === 'HRHB') return 'Croatia';
  return 'International Community';
}

function playerFactionFromState(state: LoadedGameState): string | null {
  if (typeof state.player_faction === 'string') return state.player_faction;
  const rawPlayerFaction = state.rawGameState?.meta?.player_faction;
  return typeof rawPlayerFaction === 'string' ? rawPlayerFaction : null;
}

function finiteReceiptNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  const corps = authoredDisplayName(record.corps_name, record.corps_id) || 'the command';
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
  return strictCompare(a.id, b.id);
}

export function buildDecisionConsequenceLedger(
  state: LoadedGameState | null | undefined,
  limit = 5,
): DecisionConsequenceRecord[] {
  if (!state) return [];

  const records: DecisionConsequenceRecord[] = [];
  const formationDisplayMaps = buildFormationDisplayMaps(state.formations);

  for (const event of state.firedEvents ?? []) {
    if (!event.isDecision) continue;
    records.push({
      id: `event:${event.id}`,
      turn: event.turn,
      familyId: 'event-decision',
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
      familyId: 'operation-opportunity',
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
      familyId: 'army-reserve',
      family: 'Army reserve',
      title: reserveTitle(reserve),
      outcome: reserveOutcome(reserve),
      detail: reserveDetail(reserve, formationDisplayMaps),
      recordTarget: 'records',
    });
  }

  for (const peace of state.peacePlanHistory ?? []) {
    if (!peace.resolved) continue;
    records.push({
      id: `peace:${peace.planId}:${peace.turnOffered}`,
      turn: peace.turnOffered,
      familyId: 'peace-proposal',
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
      familyId: 'dayton-settlement',
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
      familyId: 'humanitarian-convoy',
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
      familyId: 'paramilitary-authorization',
      family: 'Paramilitary authorization',
      title: paramilitaryTitle(paramilitary),
      outcome: paramilitaryOutcome(paramilitary),
      detail: paramilitaryDetail(paramilitary),
      recordTarget: 'records',
    });
  }

  const playerFaction = playerFactionFromState(state);
  const patronCuts = Array.isArray(state.rawGameState?.military?.patron_defiance_supply_cuts)
    ? state.rawGameState.military.patron_defiance_supply_cuts
    : [];
  for (const cut of patronCuts) {
    if (!playerFaction || cut?.faction !== playerFaction) continue;
    const turn = finiteReceiptNumber(cut.turn);
    const cutFraction = finiteReceiptNumber(cut.cut_fraction);
    const supportAfter = finiteReceiptNumber(cut.support_after);
    if (turn == null || cutFraction == null || supportAfter == null) continue;
    const forceLabel = getPlayerSafeMilitaryFactionName(playerFaction, playerFaction);
    records.push({
      id: `patron-defiance:${playerFaction}:${turn}:${cutFraction}:${supportAfter}`,
      turn,
      familyId: 'patron-relations',
      family: 'Patron relations',
      title: 'Patron defiance supply cut',
      outcome: 'Material support reduced',
      detail: `${patronLabelForFaction(playerFaction)} cut ${Math.round(cutFraction * 100)}% of material support for ${forceLabel}; support after cut ${Math.round(supportAfter * 100)}%.`,
      recordTarget: 'records',
    });
  }

  for (const officer of state.officerDecisionHistory ?? []) {
    records.push({
      id: `officer:${officer.id}`,
      turn: officer.turn,
      familyId: 'officer-personnel',
      family: 'Officer personnel',
      title: officerTitle(officer),
      outcome: officerOutcome(officer),
      detail: officerDetail(officer),
      recordTarget: 'records',
    });
  }

  return records.sort(compareRecords).slice(0, Math.max(0, limit));
}

export function buildDecisionConsequenceLedgerSummary(
  records: readonly DecisionConsequenceRecord[],
): DecisionConsequenceLedgerSummary {
  const familySet = new Set<string>();
  let recordsRouteCount = 0;
  let chronicleRouteCount = 0;

  for (const record of records) {
    familySet.add(record.family);
    if (record.recordTarget === 'chronicle') {
      chronicleRouteCount += 1;
    } else {
      recordsRouteCount += 1;
    }
  }

  const latest = records[0] ?? null;
  return {
    total: records.length,
    recordsRouteCount,
    chronicleRouteCount,
    latestTurn: latest?.turn ?? null,
    latestTitle: latest?.title ?? null,
    families: [...familySet].sort(strictCompare),
  };
}
