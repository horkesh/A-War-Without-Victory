// historical_source: Canonical decision records, event-causality log, cost ledger, and displacement summary contracts.
// source_tier: design_counterfactual
// source_note: The ledger renders deterministic estimates and observed live-run receipts; numeric civilian-risk and displacement values are simulation state, not historical totals.

import type {
  FormationView,
  LoadedGameState,
  OperationOpportunityRecordView,
  OfficerDecisionRecordView,
  ParamilitaryDecisionRecordView,
  PeacePlanDecisionRecordView,
  ReserveRequestDecisionRecordView,
} from './types';
import type { CorpsStance, ProposalDecisionRecord } from '../../../state/game_state.js';
import {
  proposalDecisionIdentity,
  proposalDecisionLedgerId,
} from '../../../state/proposal_decision_history.js';
import {
    getPlayerSafeCorpsName,
    getPlayerSafeOperationName,
    getPlayerSafeRecordDetail,
    getPlayerSafeMilitaryFactionName,
} from '../utils/playerSafeText.js';
import { t, type MessageKey } from '../i18n/index.js';
import { municipalityDisplayName } from '../../shared/bosnianPlaceNames.js';

/** The 1991 municipality named by an OSID ("op:<municipality>:<settlement>"), in census spelling. */
function receiptMunicipalityName(osid: string): string {
  const municipality = typeof osid === 'string' ? osid.split(':')[1] : undefined;
  if (!municipality) return 'rear';
  return municipalityDisplayName(municipality)
    ?? municipality.split('_').map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : '')).join(' ');
}
import { playerFactionMatch } from './playerFactionMatch.js';
import { stanceMatterReceiptLine } from './stanceMatterCopy.js';

const STANCE_MATTER_OUTCOME_KEYS: Record<string, MessageKey> = {
  stood: 'stanceMatter.outcome.stood',
  confirmed: 'stanceMatter.outcome.confirmed',
  countermanded: 'stanceMatter.outcome.countermanded',
  constrained: 'stanceMatter.outcome.constrained',
  not_put: 'stanceMatter.outcome.notPut',
  hold_lapsed: 'stanceMatter.outcome.holdLapsed',
  answered_lapsed: 'stanceMatter.outcome.answeredLapsed',
  hold_in_force: 'stanceMatter.outcome.holdInForce',
};

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
  | 'paramilitary-authorization'
  | 'paramilitary-receipt'
  | 'minority-policy-receipt'
  | 'patron-relations'
  | 'officer-personnel'
  | 'stance-matter'
  | 'army-clash';

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

const PROPOSAL_STANCE_LABEL_KEYS: Record<CorpsStance, MessageKey> = {
  defensive: 'corpsCard.stance.defensive',
  balanced: 'corpsCard.stance.balanced',
  offensive: 'corpsCard.stance.offensive',
  reorganize: 'corpsCard.stance.reorganize',
};

function isCorpsStance(value: unknown): value is CorpsStance {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(PROPOSAL_STANCE_LABEL_KEYS, value);
}

function proposalDetailToken(
  proposal: Pick<ProposalDecisionRecord, 'proposed_action' | 'current_value' | 'proposed_value'>,
  displayMaps: { formationNames: ReadonlyMap<string, string>; corpsNames: ReadonlyMap<string, string> },
): DecisionConsequenceCopyToken {
  const [actionKind, formationId, actionStance, ...unexpected] = proposal.proposed_action.split(':');
  const currentStance = isCorpsStance(proposal.current_value) ? proposal.current_value : null;
  const proposedStance = isCorpsStance(proposal.proposed_value)
    ? proposal.proposed_value
    : isCorpsStance(actionStance)
      ? actionStance
      : null;
  if (actionKind === 'SET_STANCE'
    && formationId
    && unexpected.length === 0
    && currentStance
    && proposedStance) {
    const authoredName = displayMaps.corpsNames.get(formationId)
      ?? displayMaps.formationNames.get(formationId);
    const corps = authoredName
      ? getPlayerSafeCorpsName(authoredName, formationId, t('decisionConsequences.fallback.thisCorpsCommand'))
      : t('decisionConsequences.fallback.thisCorpsCommand');
    return {
      key: 'decisionConsequences.detail.autonomyProposal.stanceChange',
      params: {
        corps,
        current: t(PROPOSAL_STANCE_LABEL_KEYS[currentStance]),
        proposed: t(PROPOSAL_STANCE_LABEL_KEYS[proposedStance]),
      },
    };
  }
  return { key: 'decisionConsequences.detail.autonomyProposal.fallback' };
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

// ── Staff reading of policy (command-loop 2A, step A0) ────────────────────────────────────────
// The army reads a political directive every week, for a President who never gave one. For his
// own faction that reading is one line in Army HQ Records, replaced each week. It is deliberately
// not a ledger record: a weekly record would crowd out the decisions the ledger exists to keep.

const STAFF_READING_AUTONOMOUS_TRACE_ROLE = 'AUTONOMOUS_LAUNCH_PROPOSAL';

const STAFF_READING_VERB_KEYS: Record<string, MessageKey> = {
  HOLD_AT_ALL_COSTS: 'review.record.verb.holdAtAllCosts',
  PRESS_OFFENSIVE: 'review.record.verb.pressOffensive',
  MAINTAIN_CORRIDOR: 'review.record.verb.maintainCorridor',
  PREPARE_RESERVE: 'review.record.verb.prepareReserve',
  HONOR_TRUCE: 'review.record.verb.honorTruce',
  BALANCE_FRONTS: 'review.record.verb.balanceFronts',
};

const STAFF_READING_ROLE_ORDER = ['primary', 'secondary', 'economy', 'contain'] as const;

const STAFF_READING_ROLE_KEYS: Record<(typeof STAFF_READING_ROLE_ORDER)[number], MessageKey> = {
  primary: 'review.record.role.primary',
  secondary: 'review.record.role.secondary',
  economy: 'review.record.role.economy',
  contain: 'review.record.role.contain',
};

export interface StaffReadingLine {
  /** The week the army read the directive. */
  turn: number;
  /** "Staff reading of policy". */
  label: string;
  /** "{verb}, carried out as {role summary}." */
  text: string;
}

/**
 * The latest staff reading of policy for the player's own faction, or null when the army has not
 * read one (no directive was interpreted, or this is not a live player's state).
 */
export function buildStaffReadingLine(state: LoadedGameState | null | undefined): StaffReadingLine | null {
  const playerFaction = state ? playerFactionFromState(state) : null;
  if (!state || !playerFaction) return null;
  const traces = (state.armyCoDecisionTraces?.[playerFaction] ?? [])
    .filter((trace) => trace.campaign_role !== STAFF_READING_AUTONOMOUS_TRACE_ROLE);
  const latest = traces.reduce<typeof traces[number] | null>(
    (best, trace) => (best === null || trace.turn >= best.turn ? trace : best),
    null,
  );
  if (!latest) return null;

  const verbKey = STAFF_READING_VERB_KEYS[latest.campaign_role];
  const verb = verbKey
    ? t(verbKey)
    : humanizeToken(latest.campaign_role).toLowerCase() || t('review.record.verb.unreported');

  const counts = new Map<string, number>();
  for (const directive of state.armyCorpsDirectives ?? []) {
    counts.set(directive.role, (counts.get(directive.role) ?? 0) + 1);
  }
  const roleParts = STAFF_READING_ROLE_ORDER
    .filter((role) => (counts.get(role) ?? 0) > 0)
    .map((role) => t(STAFF_READING_ROLE_KEYS[role], { count: counts.get(role) ?? 0 }));

  return {
    turn: latest.turn,
    label: t('review.record.label'),
    text: roleParts.length > 0
      ? t('review.record.text', { verb, roles: roleParts.join(t('review.record.listSeparator')) })
      : t('review.record.textNoRoles', { verb }),
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
    archivedProposals.map(proposalDecisionIdentity),
  );
  const currentResolvedProposals = (state.rawGameState?.meta?.pending_proposal_reviews ?? [])
    .filter((proposal) => (
      proposal.proposed_action.startsWith('SET_STANCE:')
      && typeof proposal.accepted === 'boolean'
      && Number.isInteger(proposal.resolved_turn)
      && !archivedProposalKeys.has(proposalDecisionIdentity({
        id: proposal.id,
        resolved_turn: proposal.resolved_turn!,
      }))
    ));
  for (const proposal of [...archivedProposals, ...currentResolvedProposals]) {
    if (playerFaction && !playerFactionMatch(proposal.faction, playerFaction)) continue;
    if (typeof proposal.accepted !== 'boolean'
      || typeof proposal.resolved_turn !== 'number'
      || !Number.isInteger(proposal.resolved_turn)) continue;
    const accepted = proposal.accepted;
    const resolvedTurn = proposal.resolved_turn;
    const identitySource = { id: proposal.id, resolved_turn: resolvedTurn };
    const detailToken = proposalDetailToken(proposal, formationDisplayMaps);
    // Player-override model (§14.10a): a decision left unanswered is the staff's, not their.
    const bySilence = (proposal as { resolved_by?: unknown }).resolved_by === 'silence';
    const titleKey = bySilence
      ? 'decisionConsequences.title.autonomyProposal.staffProceeded'
      : accepted
        ? 'decisionConsequences.title.autonomyProposal.accepted'
        : 'decisionConsequences.title.autonomyProposal.declined';
    const outcomeKey = bySilence
      ? 'decisionConsequences.outcome.staffProceeded'
      : accepted
        ? 'decisionConsequences.outcome.accepted'
        : 'decisionConsequences.outcome.declined';
    records.push({
      id: proposalDecisionLedgerId(identitySource),
      turn: resolvedTurn,
      familyId: 'autonomy-proposal',
      family: 'Staff proposal',
      title: bySilence ? 'Staff proceeded' : accepted ? 'Staff proposal accepted' : 'Staff proposal declined',
      titleToken: { key: titleKey },
      outcome: bySilence ? 'Staff proceeded' : accepted ? 'Accepted' : 'Declined',
      outcomeToken: { key: outcomeKey },
      detail: t(detailToken.key, detailToken.params),
      detailToken,
      recordTarget: 'records',
    });
  }

  // Posture model option 2: every stance matter leaves a record, including the ones the
  // president let stand and the changes that were not put to him.
  for (const receipt of state.stanceMatterHistory ?? []) {
    const outcomeKey = STANCE_MATTER_OUTCOME_KEYS[receipt.outcome] ?? 'stanceMatter.outcome.stood';
    records.push({
      id: `stance-matter:${receipt.id}:${receipt.outcome}:${receipt.resolvedTurn}`,
      turn: receipt.resolvedTurn,
      familyId: 'stance-matter',
      family: t('decisionConsequences.family.stanceMatter'),
      title: t('stanceMatter.recordTitle', { subject: receipt.corpsName }),
      outcome: t(outcomeKey),
      outcomeToken: { key: outcomeKey },
      detail: stanceMatterReceiptLine(receipt),
      recordTarget: 'records',
    });
  }

  // Command loop L7: every army clash leaves a Record line (answered, lapsed, noted or not put).
  for (const receipt of state.armyClashHistory ?? []) {
    const outcomeKey = `clash.outcome.${receipt.outcome}` as const;
    records.push({
      id: `army-clash:${receipt.id}:${receipt.outcome}:${receipt.resolvedTurn}`,
      turn: receipt.resolvedTurn,
      familyId: 'army-clash',
      family: t('clash.family'),
      title: t('clash.recordTitle', { officer: receipt.armyCommanderName ?? t('clash.armyCommanderFallback') }),
      outcome: t(outcomeKey),
      outcomeToken: { key: outcomeKey },
      detail: receipt.cost > 0
        ? t('clash.recordDetailCost', { corps: receipt.corpsName, cost: receipt.cost })
        : t('clash.recordDetail', { corps: receipt.corpsName }),
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

  // A paramilitary action carried out for the player's side with no request ever reaching the player (§6 D1 stage 2: only the
  // standing order Always allow sends one, at any command level; a pre-stage-2 save also holds staff sweeps sent under any order).
  // It still counts against the side, so the player is told where and why instead of meeting the count at Dayton. The "why" is one
  // cause derived from the saved basis at the sweep's turn (GameStateAdapter `deriveParamilitaryReceiptCause`); with no derivable
  // cause the stage-1 text stays. The wording lives in the message catalog only (EN and BCS), never as a literal here.
  for (const unrequested of state.paramilitaryUnrequested ?? []) {
    if (playerFaction && !playerFactionMatch(unrequested.faction, playerFaction)) continue;
    // Municipality scale only: the record speaks at that scale, and a settlement name would assert village-level history.
    const place = receiptMunicipalityName(unrequested.target_osid);
    const faction = getPlayerSafeMilitaryFactionName(unrequested.faction, unrequested.faction);
    // Only an action that took its target is booked against the side; one that dissolved without taking it gets its own outcome
    // line (Codex finding on #740).
    const suffix = unrequested.captured ? 'unrequested' : 'unrequestedDissolved';
    const titleKey = `decisionConsequences.title.paramilitary.${suffix}` as MessageKey;
    const outcomeKey = `decisionConsequences.outcome.${suffix}` as MessageKey;
    const causeSuffix = unrequested.cause === 'standing_order'
      ? 'StandingOrder'
      : unrequested.cause === 'standing_order_automatic'
        ? 'AutomaticOrder'
        : unrequested.cause === 'neutral'
          ? 'Neutral'
          : unrequested.cause === 'historical_default_staff'
            ? 'HistoricalDefault'
            : '';
    const detailKey = `decisionConsequences.detail.paramilitary.${suffix}${causeSuffix}` as MessageKey;
    records.push({
      id: `paramilitary-staff:${unrequested.id}`,
      turn: unrequested.turn,
      familyId: 'paramilitary-receipt',
      family: t('decisionConsequences.family.paramilitaryReceipt'),
      title: t(titleKey),
      titleToken: { key: titleKey },
      outcome: t(outcomeKey),
      outcomeToken: { key: outcomeKey },
      detail: t(detailKey, { place, faction }),
      detailToken: { key: detailKey, params: { place, faction } },
      recordTarget: 'records',
    });
  }

  // RB5 halt card: the human HRHB side answered the card with the historical default (no halt ordered) and the policy ran.
  // Derived in GameStateAdapter `deriveMinorityPolicyReceipt`; it states the number of municipalities only. The wording lives in
  // the message catalog (EN and BCS), never as a literal here. Booked to the player's own side; Records only, never Chronicle.
  const minorityReceipt = state.minorityPolicyReceipt;
  if (minorityReceipt && (!playerFaction || playerFactionMatch(minorityReceipt.faction, playerFaction))) {
    const variant = minorityReceipt.automatic ? 'automatic' : 'inPerson';
    const detailVariant = minorityReceipt.warCrime
      ? variant
      : (minorityReceipt.automatic ? 'noWarCrimeAutomatic' : 'noWarCrimeInPerson');
    const titleKey = `decisionConsequences.title.minorityPolicy.${variant}` as MessageKey;
    const outcomeKey = 'decisionConsequences.outcome.minorityPolicy.chip' as MessageKey;
    // The signed outcome sentence and detail sentence are one composed detail line (the outcome chip stays short).
    const detailKey = `decisionConsequences.detail.minorityPolicyFull.${detailVariant}.${minorityReceipt.municipalities === 1 ? 'one' : 'other'}` as MessageKey;
    const detailParams = { municipalities: minorityReceipt.municipalities };
    records.push({
      id: `minority-policy:${minorityReceipt.faction}`,
      turn: minorityReceipt.turn,
      familyId: 'minority-policy-receipt',
      family: t('decisionConsequences.family.minorityPolicy'),
      title: t(titleKey),
      titleToken: { key: titleKey },
      outcome: t(outcomeKey),
      outcomeToken: { key: outcomeKey },
      detail: t(detailKey, detailParams),
      detailToken: { key: detailKey, params: detailParams },
      recordTarget: 'records',
    });
  }

  const patronCuts = Array.isArray(state.rawGameState?.military?.patron_defiance_supply_cuts)
    ? state.rawGameState.military.patron_defiance_supply_cuts
    : [];
  // Patron-defiance panel (2026-11-17): one record per defiance answer whose patron_supply_cut
  // applied. Pre-panel entries (no tag) recorded a term that never reached combat and are skipped.
  for (const cut of patronCuts) {
    if (!playerFaction || cut?.faction !== playerFaction) continue;
    if (typeof cut.tag !== 'string' || cut.tag.length === 0) continue;
    const turn = finiteReceiptNumber(cut.turn);
    const cutFraction = finiteReceiptNumber(cut.cut_fraction);
    const expiresTurn = finiteReceiptNumber(cut.expires_turn);
    if (turn == null || cutFraction == null || expiresTurn == null) continue;
    const weeks = expiresTurn - turn;
    const cutPct = Math.round(cutFraction * 100);
    const combinedPct = Math.round((1 - (finiteReceiptNumber(cut.combined_multiplier) ?? 1)) * 100);
    const floorBinding = cut.floor_binding === true;
    const forceLabel = getPlayerSafeMilitaryFactionName(playerFaction, playerFaction);
    const patron = patronLabelForFaction(playerFaction);
    records.push({
      id: `patron-defiance:${playerFaction}:${turn}:${cut.tag}`,
      turn,
      familyId: 'patron-relations',
      family: 'Patron relations',
      title: 'Patron supply cut',
      titleToken: { key: 'decisionConsequences.title.patron.defianceSupplyCut' },
      outcome: 'Combat effectiveness reduced',
      outcomeToken: { key: 'decisionConsequences.outcome.combatEffectivenessReduced' },
      detail: floorBinding
        ? `${forceLabel}: ${patron} held back part of its materiel; -${cutPct}% for ${weeks} weeks. With earlier cuts in force, the combined cut reached its limit: combat effectiveness -${combinedPct}% in all.`
        : `${forceLabel}: ${patron} held back part of its materiel; combat effectiveness -${cutPct}% for ${weeks} weeks.`,
      detailToken: {
        key: floorBinding
          ? 'decisionConsequences.detail.patron.defianceSupplyCutFloor'
          : 'decisionConsequences.detail.patron.defianceSupplyCut',
        params: { patron, cutPct, force: forceLabel, weeks, combinedPct },
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
    } else if (record.familyId !== 'paramilitary-receipt') {
      // A paramilitary action carried out without a request is a receipt, not a filed decision of the President.
      recordsRouteCount += 1;
    }
  }

  // Receipts are listed in Records but are not filed decisions: they stay out of the total and the "latest decision".
  const decisions = records.filter((record) => record.familyId !== 'paramilitary-receipt');
  const latest = decisions[0] ?? null;
  return {
    total: decisions.length,
    recordsRouteCount,
    chronicleRouteCount,
    latestTurn: latest?.turn ?? null,
    latestTitle: latest?.title ?? null,
    families: [...familySet].sort(strictCompare),
  };
}
