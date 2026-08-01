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
    getPlayerSafeOperationName,
    getPlayerSafeRecordDetail,
    getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText.js';
import { t, type MessageKey } from '../i18n/index.js';
import { playerFactionMatch } from './playerFactionMatch.js';

export interface DecisionConsequenceCopyToken {
  key: MessageKey;
  params?: Record<string, string | number>;
}

export interface DecisionConsequenceRecord {
  id: string;
  turn: number;
  familyId: DecisionConsequenceFamilyId;
  family: string;
  title: string;
  outcome: string;
  detail: string;
  titleToken?: DecisionConsequenceCopyToken;
  outcomeToken?: DecisionConsequenceCopyToken;
  detailToken?: DecisionConsequenceCopyToken;
  recordTarget: 'records' | 'chronicle';
}

export type DecisionConsequenceFamilyId =
  | 'event-decision'
  | 'autonomy-proposal'
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

export function resolveDecisionConsequenceCopy(
  record: DecisionConsequenceRecord,
  field: 'title' | 'outcome' | 'detail',
): string {
  const token = field === 'title'
    ? record.titleToken
    : field === 'outcome'
      ? record.outcomeToken
      : record.detailToken;
  if (token) return t(token.key, token.params);
  return record[field];
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

function opportunityOutcomeToken(record: OperationOpportunityRecordView): DecisionConsequenceCopyToken {
  switch (record.response) {
    case 'approve': return { key: 'decisionConsequences.outcome.approved' };
    case 'delay': return { key: 'decisionConsequences.outcome.delayed' };
    case 'redirect': return { key: 'decisionConsequences.outcome.redirected' };
    case 'under_resource': return { key: 'decisionConsequences.outcome.approvedWithLimits' };
    case 'decline': return { key: 'decisionConsequences.outcome.declined' };
    case 'expire': return { key: 'decisionConsequences.outcome.expired' };
    default: return { key: 'decisionConsequences.outcome.recorded' };
  }
}

function operationResultLabel(value: string | undefined): string {
  const result = value ?? '';
  if (result === 'success') return t('decisionConsequences.result.success');
  if (result === 'partial_success' || result === 'partial') return t('decisionConsequences.result.partialSuccess');
  if (result === 'failed' || result === 'failure') return t('decisionConsequences.result.failed');
  if (result === 'aborted') return t('decisionConsequences.result.aborted');
  return humanizeToken(result).toLowerCase();
}

function opportunityDetail(record: OperationOpportunityRecordView): string {
  const operation = record.executed_op_name
    ? getPlayerSafeOperationName(record.executed_op_name, null, 'Operation')
    : 'No operation launched';
  const result = humanizeToken(record.exit_class ?? record.aar_outcome).toLowerCase();
  return result ? `${operation}: ${result}` : operation;
}

function opportunityOperationTokenName(record: OperationOpportunityRecordView): string {
  return record.executed_op_name
    ? getPlayerSafeOperationName(record.executed_op_name, null, t('decisionConsequences.detail.operation.noLaunch'))
    : t('decisionConsequences.detail.operation.noLaunch');
}

function reserveOutcome(record: ReserveRequestDecisionRecordView): string {
  if (record.outcome === 'accepted') return 'Accepted';
  if (record.outcome === 'declined') return 'Declined';
  if (record.outcome === 'terminated') return 'Terminated';
  return sentenceToken(record.outcome) || 'Recorded';
}

function reserveOutcomeToken(record: ReserveRequestDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.outcome === 'accepted') return { key: 'decisionConsequences.outcome.accepted' };
  if (record.outcome === 'declined') return { key: 'decisionConsequences.outcome.declined' };
  if (record.outcome === 'terminated') return { key: 'decisionConsequences.outcome.terminated' };
  return { key: 'decisionConsequences.outcome.recorded' };
}

function reserveTitle(record: ReserveRequestDecisionRecordView): string {
  const outcome = reserveOutcome(record).toLowerCase();
  return `Reserve request ${outcome}`;
}

function reserveTitleToken(record: ReserveRequestDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.outcome === 'accepted') return { key: 'decisionConsequences.title.reserve.accepted' };
  if (record.outcome === 'declined') return { key: 'decisionConsequences.title.reserve.declined' };
  if (record.outcome === 'terminated') return { key: 'decisionConsequences.title.reserve.terminated' };
  return { key: 'decisionConsequences.title.reserve.recorded' };
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
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(trimmed) || /[:/\\]|\.json\b/i.test(trimmed)) return null;
  return trimmed;
}

function safeConsequenceDetail(value: string | null | undefined, fallback = 'Decision filed in the campaign record.'): string {
  return getPlayerSafeRecordDetail(value, fallback);
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
    return `${brigade} assigned to ${corps}. ${safeConsequenceDetail(record.why_needed, safeReserveReasonCopy(record.reason) || 'Decision filed.')}`.trim();
  }
  if (record.outcome === 'declined') {
    return `${corps} request declined. ${safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.why_needed, 'Reserve decision filed.')}`.trim();
  }
  if (record.outcome === 'terminated' && brigade) {
    return `${brigade} recalled from ${corps}. ${safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.how_to_use, 'Reserve decision filed.')}`.trim();
  }
  return `${corps}: ${safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.why_needed, 'Decision filed.')}`.trim();
}

function reserveDetailToken(
  record: ReserveRequestDecisionRecordView,
  displayMaps: { formationNames: ReadonlyMap<string, string>; corpsNames: ReadonlyMap<string, string> },
): DecisionConsequenceCopyToken {
  const corps = record.corps_id
    ? displayMaps.corpsNames.get(record.corps_id) ?? t('decisionConsequences.fallback.thisCorpsCommand')
    : t('decisionConsequences.fallback.thisCorpsCommand');
  const brigade = record.brigade_id
    ? displayMaps.formationNames.get(record.brigade_id) ?? t('decisionConsequences.fallback.reserveBrigade')
    : '';
  if (record.outcome === 'accepted' && brigade) {
    return {
      key: 'decisionConsequences.detail.reserve.accepted',
      params: { brigade, corps, detail: safeConsequenceDetail(record.why_needed, safeReserveReasonCopy(record.reason) || t('decisionConsequences.detail.decisionFiled')) },
    };
  }
  if (record.outcome === 'declined') {
    return {
      key: 'decisionConsequences.detail.reserve.declined',
      params: { corps, detail: safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.why_needed, t('decisionConsequences.detail.reserveDecisionFiled')) },
    };
  }
  if (record.outcome === 'terminated' && brigade) {
    return {
      key: 'decisionConsequences.detail.reserve.terminated',
      params: { brigade, corps, detail: safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.how_to_use, t('decisionConsequences.detail.reserveDecisionFiled')) },
    };
  }
  return {
    key: 'decisionConsequences.detail.reserve.generic',
    params: { corps, detail: safeReserveReasonCopy(record.reason) || safeConsequenceDetail(record.why_needed, t('decisionConsequences.detail.decisionFiled')) },
  };
}

function peaceOutcome(record: PeacePlanDecisionRecordView): string {
  if (record.playerResponse === 'accepted') return 'Accepted';
  if (record.playerResponse === 'rejected') return 'Rejected';
  return 'Pending';
}

function peaceOutcomeToken(record: PeacePlanDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.playerResponse === 'accepted') return { key: 'decisionConsequences.outcome.accepted' };
  if (record.playerResponse === 'rejected') return { key: 'decisionConsequences.outcome.rejected' };
  return { key: 'decisionConsequences.outcome.pending' };
}

function peaceResponseLabel(response: 'accepted' | 'rejected' | 'pending'): string {
  if (response === 'accepted') return 'accepted';
  if (response === 'rejected') return 'rejected';
  return 'pending';
}

function localizedPeaceResponseLabel(response: 'accepted' | 'rejected' | 'pending'): string {
  if (response === 'accepted') return t('decisionConsequences.response.accepted');
  if (response === 'rejected') return t('decisionConsequences.response.rejected');
  return t('decisionConsequences.response.pending');
}

function peaceDetail(record: PeacePlanDecisionRecordView): string {
  const playerVerb = record.playerResponse === 'accepted'
    ? 'accepted'
    : record.playerResponse === 'rejected'
      ? 'rejected'
      : 'left pending';
  const responses = ['RBiH', 'RS', 'HRHB']
    .filter((faction) => faction !== record.playerFaction && record.responses[faction])
    .map((faction) => `${getPlayerSafeMilitaryFactionName(faction, faction)} ${peaceResponseLabel(record.responses[faction]!)}`)
    .join(', ');
  return responses
    ? `Your government ${playerVerb} the proposal. Other delegations: ${responses}.`
    : `Your government ${playerVerb} the proposal.`;
}

function peaceDetailToken(record: PeacePlanDecisionRecordView): DecisionConsequenceCopyToken {
  const playerVerb = record.playerResponse === 'accepted'
    ? t('decisionConsequences.response.accepted')
    : record.playerResponse === 'rejected'
      ? t('decisionConsequences.response.rejected')
      : t('decisionConsequences.response.leftPending');
  const responses = ['RBiH', 'RS', 'HRHB']
    .filter((faction) => faction !== record.playerFaction && record.responses[faction])
    .map((faction) => `${getPlayerSafeMilitaryFactionName(faction, faction)} ${localizedPeaceResponseLabel(record.responses[faction]!)}`)
    .join(', ');
  return responses
    ? { key: 'decisionConsequences.detail.peace.withResponses', params: { playerVerb, responses } }
    : { key: 'decisionConsequences.detail.peace.noResponses', params: { playerVerb } };
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

function daytonDetailToken(verdict: NonNullable<LoadedGameState['gameVerdict']>): DecisionConsequenceCopyToken {
  const result = verdict.dayton_result;
  if (!result) return { key: 'decisionConsequences.detail.finalSettlementFiled' };
  const accepted = result.territorial_packages_accepted?.length ?? 0;
  const rejected = result.territorial_packages_rejected?.length ?? 0;
  const split = ['RBiH', 'RS', 'HRHB']
    .filter((faction) => typeof result.final_territory_split?.[faction] === 'number')
    .map((faction) => `${getPlayerSafeMilitaryFactionName(faction, faction)} ${result.final_territory_split[faction]}%`)
    .join(', ');
  const overrideCount = result.patron_overrides_applied?.length ?? 0;
  return {
    key: 'decisionConsequences.detail.dayton',
    params: {
      accepted,
      territorialPackageLabel: t(accepted === 1 ? 'decisionConsequences.noun.territorialPackage.one' : 'decisionConsequences.noun.territorialPackage.many'),
      rejected,
      split: split ? t('decisionConsequences.detail.dayton.split', { split }) : '',
      overrides: overrideCount > 0 ? t('decisionConsequences.detail.dayton.overrides', { count: overrideCount }) : '',
    },
  };
}

function convoyOutcome(record: ConvoyDecisionRecordView): string {
  if (record.decision === 'allow') return 'Allowed';
  if (record.decision === 'block') return 'Blocked';
  return 'Diverted';
}

function convoyOutcomeToken(record: ConvoyDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'allow') return { key: 'decisionConsequences.outcome.allowed' };
  if (record.decision === 'block') return { key: 'decisionConsequences.outcome.blocked' };
  return { key: 'decisionConsequences.outcome.diverted' };
}

function convoyTitle(record: ConvoyDecisionRecordView): string {
  return `Convoy ${convoyOutcome(record).toLowerCase()}`;
}

function convoyTitleToken(record: ConvoyDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'allow') return { key: 'decisionConsequences.title.convoy.allowed' };
  if (record.decision === 'block') return { key: 'decisionConsequences.title.convoy.blocked' };
  return { key: 'decisionConsequences.title.convoy.diverted' };
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

function convoyDetailToken(record: ConvoyDecisionRecordView): DecisionConsequenceCopyToken {
  const enclave = record.target_enclave
    ? record.target_enclave.includes(' ')
      ? record.target_enclave
      : humanizeToken(record.target_enclave)
    : t('decisionConsequences.fallback.enclave');
  const route = record.route_faction
    ? getPlayerSafeMilitaryFactionName(record.route_faction, record.route_faction)
    : t('decisionConsequences.fallback.routeFaction');
  const target = record.target_faction
    ? getPlayerSafeMilitaryFactionName(record.target_faction, record.target_faction)
    : t('decisionConsequences.fallback.enclaveGarrison');
  if (record.decision === 'allow') {
    return { key: 'decisionConsequences.detail.convoy.allowed', params: { enclave, route, target } };
  }
  if (record.decision === 'block') {
    return { key: 'decisionConsequences.detail.convoy.blocked', params: { enclave, route } };
  }
  return { key: 'decisionConsequences.detail.convoy.diverted', params: { enclave, route, target } };
}

function paramilitaryOutcome(record: ParamilitaryDecisionRecordView): string {
  if (record.decision === 'allow') return 'Authorized';
  if (record.decision === 'deny') return 'Refused';
  return 'Referred to regular forces';
}

function paramilitaryOutcomeToken(record: ParamilitaryDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'allow') return { key: 'decisionConsequences.outcome.authorized' };
  if (record.decision === 'deny') return { key: 'decisionConsequences.outcome.refused' };
  return { key: 'decisionConsequences.outcome.regularForces' };
}

function paramilitaryTitle(record: ParamilitaryDecisionRecordView): string {
  if (record.decision === 'allow') return 'Paramilitary deployment authorized';
  if (record.decision === 'deny') return 'Paramilitary deployment refused';
  return 'Regular forces prioritized';
}

function paramilitaryTitleToken(record: ParamilitaryDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'allow') return { key: 'decisionConsequences.title.paramilitary.authorized' };
  if (record.decision === 'deny') return { key: 'decisionConsequences.title.paramilitary.refused' };
  return { key: 'decisionConsequences.title.paramilitary.regularForces' };
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

function paramilitaryDetailToken(record: ParamilitaryDecisionRecordView): DecisionConsequenceCopyToken {
  const risk = typeof record.estimated_civilian_risk === 'number'
    ? t('decisionConsequences.detail.paramilitary.risk', { risk: record.estimated_civilian_risk })
    : '';
  const faction = getPlayerSafeMilitaryFactionName(record.faction, record.faction);
  if (record.decision === 'allow') {
    return { key: 'decisionConsequences.detail.paramilitary.authorized', params: { faction, risk } };
  }
  if (record.decision === 'deny') {
    return { key: 'decisionConsequences.detail.paramilitary.refused', params: { faction, risk } };
  }
  return { key: 'decisionConsequences.detail.paramilitary.regularForces', params: { faction, risk } };
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

function hasRawPlayerFiledDecision(
  state: LoadedGameState,
  eventId: string,
  playerFaction: string | null,
): boolean {
  const rawLog = state.rawGameState?.military?.event_decision_log;
  if (!Array.isArray(rawLog)) return true;
  return rawLog.some((entry: {
    event_id?: unknown;
    decision_source?: unknown;
    faction?: string | null;
  }) => (
    entry.event_id === eventId
    && entry.decision_source === 'player'
    && playerFactionMatch(entry.faction, playerFaction)
  ));
}

function finiteReceiptNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function officerOutcome(record: OfficerDecisionRecordView): string {
  if (record.decision === 'replacement_accepted') return 'Accepted';
  if (record.decision === 'override_confirmed') return 'Override confirmed';
  return 'Acknowledged';
}

function officerOutcomeToken(record: OfficerDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'replacement_accepted') return { key: 'decisionConsequences.outcome.accepted' };
  if (record.decision === 'override_confirmed') return { key: 'decisionConsequences.outcome.overrideConfirmed' };
  return { key: 'decisionConsequences.outcome.acknowledged' };
}

function officerTitle(record: OfficerDecisionRecordView): string {
  if (record.decision === 'replacement_accepted') return 'Commander replacement accepted';
  if (record.decision === 'override_confirmed') return 'Commander interpretation overridden';
  return record.event_type === 'replacement_suggested' ? 'Commander replacement reviewed' : 'Personnel matter reviewed';
}

function officerTitleToken(record: OfficerDecisionRecordView): DecisionConsequenceCopyToken {
  if (record.decision === 'replacement_accepted') return { key: 'decisionConsequences.title.officer.replacementAccepted' };
  if (record.decision === 'override_confirmed') return { key: 'decisionConsequences.title.officer.overrideConfirmed' };
  return record.event_type === 'replacement_suggested'
    ? { key: 'decisionConsequences.title.officer.replacementReviewed' }
    : { key: 'decisionConsequences.title.officer.personnelReviewed' };
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

function officerDetailToken(record: OfficerDecisionRecordView): DecisionConsequenceCopyToken {
  const corps = authoredDisplayName(record.corps_name, record.corps_id) || t('decisionConsequences.fallback.command');
  if (record.decision === 'replacement_accepted') {
    const incoming = record.new_officer_name || record.officer_name || t('decisionConsequences.fallback.newCommander');
    const outgoing = record.outgoing_officer_name || record.current_commander_name;
    return outgoing
      ? { key: 'decisionConsequences.detail.officer.replacementWithOutgoing', params: { incoming, corps, outgoing } }
      : { key: 'decisionConsequences.detail.officer.replacement', params: { incoming, corps } };
  }
  if (record.decision === 'override_confirmed') {
    return {
      key: 'decisionConsequences.detail.officer.override',
      params: { officer: record.officer_name || t('decisionConsequences.fallback.staffOfficer'), corps },
    };
  }
  return {
    key: 'decisionConsequences.detail.officer.reviewed',
    params: { officer: record.officer_name || t('decisionConsequences.fallback.staffOfficer'), corps },
  };
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
  const playerFaction = playerFactionFromState(state);

  const archivedProposals = state.rawGameState?.meta?.proposal_decision_history ?? [];
  const archivedProposalKeys = new Set(
    archivedProposals.map((proposal) => `${proposal.id}::${proposal.resolved_turn}`),
  );
  const currentResolvedProposals = (state.rawGameState?.meta?.pending_proposal_reviews ?? [])
    .filter((proposal) => (
      proposal.proposed_action.startsWith('SET_STANCE:')
      && typeof proposal.accepted === 'boolean'
      && Number.isInteger(proposal.resolved_turn)
      && !archivedProposalKeys.has(`${proposal.id}::${proposal.resolved_turn}`)
    ));
  for (const proposal of [...archivedProposals, ...currentResolvedProposals]) {
    if (playerFaction && !playerFactionMatch(proposal.faction, playerFaction)) continue;
    if (typeof proposal.accepted !== 'boolean'
      || typeof proposal.resolved_turn !== 'number'
      || !Number.isInteger(proposal.resolved_turn)) continue;
    const accepted = proposal.accepted;
    const resolvedTurn = proposal.resolved_turn;
    records.push({
      id: `proposal:${proposal.id}`,
      turn: resolvedTurn,
      familyId: 'autonomy-proposal',
      family: 'Staff proposal',
      title: accepted ? 'Staff proposal accepted' : 'Staff proposal declined',
      titleToken: {
        key: accepted
          ? 'decisionConsequences.title.autonomyProposal.accepted'
          : 'decisionConsequences.title.autonomyProposal.declined',
      },
      outcome: accepted ? 'Accepted' : 'Declined',
      outcomeToken: {
        key: accepted
          ? 'decisionConsequences.outcome.accepted'
          : 'decisionConsequences.outcome.declined',
      },
      detail: safeConsequenceDetail(
        proposal.description,
        'Staff proposal disposition filed in the campaign record.',
      ),
      detailToken: {
        key: 'decisionConsequences.detail.autonomyProposal',
        params: {
          detail: safeConsequenceDetail(
            proposal.description,
            t('decisionConsequences.detail.autonomyProposal.fallback'),
          ),
        },
      },
      recordTarget: 'records',
    });
  }

  for (const event of state.firedEvents ?? []) {
    if (!event.isDecision) continue;
    if (!hasRawPlayerFiledDecision(state, event.id, playerFaction)) continue;
    records.push({
      id: `event:${event.id}`,
      turn: event.turn,
      familyId: 'event-decision',
      family: 'Event decision',
      title: event.title || 'Recorded decision',
      outcome: 'Decision recorded',
      outcomeToken: { key: 'decisionConsequences.outcome.decisionRecorded' },
      detail: safeConsequenceDetail(
        event.effects?.[0]?.description,
        safeConsequenceDetail(event.narrative, 'Filed in the campaign record.'),
      ),
      recordTarget: 'chronicle',
    });
  }

  for (const opportunity of state.operationOpportunityRecords ?? []) {
    if (!opportunity.response_turn && opportunity.status === 'eligible_pending_review') continue;
    if (playerFaction && !playerFactionMatch(opportunity.faction, playerFaction)) continue;
    records.push({
      id: `opportunity:${opportunity.proposal_id}`,
      turn: opportunity.response_turn ?? opportunity.eligibility_turn ?? state.turn,
      familyId: 'operation-opportunity',
      family: 'Operation opportunity',
      title: opportunity.display_name,
      outcome: opportunityOutcome(opportunity),
      outcomeToken: opportunityOutcomeToken(opportunity),
      detail: opportunityDetail(opportunity),
      detailToken: opportunityDetail(opportunity).trim()
        ? (() => {
            const operation = opportunityOperationTokenName(opportunity);
            const result = operationResultLabel(opportunity.exit_class ?? opportunity.aar_outcome);
            const token: DecisionConsequenceCopyToken = result
              ? { key: 'decisionConsequences.detail.operation', params: { operation, result } }
              : { key: 'decisionConsequences.detail.operation.noResult', params: { operation } };
            return token;
          })()
        : undefined,
      recordTarget: 'records',
    });
  }

  for (const reserve of state.reserveRequestHistory ?? []) {
    if (reserve.decided_by !== 'player') continue;
    records.push({
      id: `reserve:${reserve.request_id}`,
      turn: reserve.turn,
      familyId: 'army-reserve',
      family: 'Army reserve',
      title: reserveTitle(reserve),
      titleToken: reserveTitleToken(reserve),
      outcome: reserveOutcome(reserve),
      outcomeToken: reserveOutcomeToken(reserve),
      detail: reserveDetail(reserve, formationDisplayMaps),
      detailToken: reserveDetailToken(reserve, formationDisplayMaps),
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
      outcomeToken: peaceOutcomeToken(peace),
      detail: peaceDetail(peace),
      detailToken: peaceDetailToken(peace),
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
      outcomeToken: { key: 'decisionConsequences.outcome.agreementSigned' },
      detail: daytonDetail(state.gameVerdict),
      detailToken: daytonDetailToken(state.gameVerdict),
      recordTarget: 'chronicle',
    });
  }

  for (const convoy of state.convoyDecisionHistory ?? []) {
    if (convoy.decided_by !== 'player') continue;
    records.push({
      id: `convoy:${convoy.id}`,
      turn: convoy.turn,
      familyId: 'humanitarian-convoy',
      family: 'Humanitarian convoy',
      title: convoyTitle(convoy),
      titleToken: convoyTitleToken(convoy),
      outcome: convoyOutcome(convoy),
      outcomeToken: convoyOutcomeToken(convoy),
      detail: convoyDetail(convoy),
      detailToken: convoyDetailToken(convoy),
      recordTarget: 'chronicle',
    });
  }

  for (const paramilitary of state.paramilitaryDecisionHistory ?? []) {
    if (playerFaction && !playerFactionMatch(paramilitary.faction, playerFaction)) continue;
    records.push({
      id: `paramilitary:${paramilitary.id}`,
      turn: paramilitary.turn,
      familyId: 'paramilitary-authorization',
      family: 'Paramilitary authorization',
      title: paramilitaryTitle(paramilitary),
      titleToken: paramilitaryTitleToken(paramilitary),
      outcome: paramilitaryOutcome(paramilitary),
      outcomeToken: paramilitaryOutcomeToken(paramilitary),
      detail: paramilitaryDetail(paramilitary),
      detailToken: paramilitaryDetailToken(paramilitary),
      recordTarget: 'records',
    });
  }

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
      titleToken: { key: 'decisionConsequences.title.patron.defianceSupplyCut' },
      outcome: 'Material support reduced',
      outcomeToken: { key: 'decisionConsequences.outcome.materialSupportReduced' },
      detail: `${patronLabelForFaction(playerFaction)} cut ${Math.round(cutFraction * 100)}% of material support for ${forceLabel}; support after cut ${Math.round(supportAfter * 100)}%.`,
      detailToken: {
        key: 'decisionConsequences.detail.patron.defianceSupplyCut',
        params: {
          patron: patronLabelForFaction(playerFaction),
          cutPct: Math.round(cutFraction * 100),
          force: forceLabel,
          supportPct: Math.round(supportAfter * 100),
        },
      },
      recordTarget: 'records',
    });
  }

  for (const officer of state.officerDecisionHistory ?? []) {
    if (playerFaction && !playerFactionMatch(officer.faction, playerFaction)) continue;
    records.push({
      id: `officer:${officer.id}`,
      turn: officer.turn,
      familyId: 'officer-personnel',
      family: 'Officer personnel',
      title: officerTitle(officer),
      titleToken: officerTitleToken(officer),
      outcome: officerOutcome(officer),
      outcomeToken: officerOutcomeToken(officer),
      detail: officerDetail(officer),
      detailToken: officerDetailToken(officer),
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
