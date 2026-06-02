import type { ArmyHQRecordsSubTab, ArmyHQTab } from '../../shared/shellHandoff';
import type { CommandBriefingItemView, LoadedGameState } from './types';
import {
  buildTurnAftermathCampaignCost,
  buildTurnAftermathRecordViews,
  type TurnAftermathCostSeverity,
  type TurnAftermathView,
} from './turnAftermath';
import { buildPlayerSupplyVisibility } from './playerSupplyVisibility';
import { buildPlayerArmyCoPushbackVisibility } from './playerArmyCoPushbackVisibility';
import { t, type MessageKey } from '../i18n';
import { getDecisionSurface } from './decisionSurfaceRegistry';
import {
  STOP_OP_COST,
  REPLACE_CO_COST,
  ELITE_DEPLOY_COST,
  FRONT_VISIT_COST,
  REQUEST_OP_COST,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
} from '../utils/commandAuthority';
import { buildForceableReadyPlans } from './backTheOfficer';

/**
 * War-Direction directive the president can ISSUE from a Decision Room card
 * (Presidential Command Surface design §2 / LOCKED decision #1). ADDITIVE,
 * optional — flag-off / old saves leave `directive` undefined and the card
 * simply navigates as before. Populated ONLY where the source card already
 * carries the needed corps/op/proposal context (request-op → target OSID +
 * corpsId; authorize-op → proposalId; stop-op → opName + corpsId; force-launch
 * → opName + corpsId). The DirectiveCard component lifts the proven
 * OperationsSection act-flow (objection → force-anyway) for request/force, and
 * calls the no-objection IPC directly for stop/authorize. `cost` is read from
 * the canonical commandAuthority constants (authorize-op = 0: agreeing with the
 * officer is free).
 */
export interface PresidentialDecisionRoomDirective {
  lever:
    | 'request_op'
    | 'stop_op'
    | 'force_launch'
    | 'authorize_op'
    | 'replace_co'
    | 'elite_deploy'
    | 'front_visit';
  /**
   * Corps the directive acts on (request/stop/force/replace_co/elite_deploy).
   * Absent for authorize-op and front-visit (the latter targets a front, not a corps).
   */
  corpsId?: string;
  /** Command Authority cost (authorize-op = 0). */
  cost: number;
  /** Lever-specific payload forwarded verbatim to the IPC. */
  payload: Record<string, unknown>;
}

export type PresidentialDecisionRoomCategory =
  | 'decision'
  | 'counter_offer'
  | 'opportunity'
  | 'operational'
  | 'briefing'
  | 'command'
  | 'turn'
  | 'cost'
  | 'memory';

export type PresidentialDecisionRoomSeverity = 'blocking' | 'critical' | 'warning' | 'info';

export type PresidentialDecisionRoomNavigationTarget =
  | { kind: 'army-hq-tab'; tab: ArmyHQTab }
  | { kind: 'army-hq-records'; recordsSubTab: ArmyHQRecordsSubTab }
  | { kind: 'army-hq-aftermath-record'; turn: number }
  | { kind: 'counter-offer'; counterOfferId: string }
  | { kind: 'army-hq-corps-briefing'; corpsId: string | null }
  | { kind: 'inbox' }
  | { kind: 'chronicle' }
  | { kind: 'none' };

export interface PresidentialDecisionRoomCard {
  id: string;
  category: PresidentialDecisionRoomCategory;
  severity: PresidentialDecisionRoomSeverity;
  title: string;
  explanation: string;
  sourceOwner: string;
  sourceLabel: string;
  actionLabel: string;
  evidence: string[];
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
  /** Optional War-Direction directive this card can ISSUE inline (additive). */
  directive?: PresidentialDecisionRoomDirective;
  sortKey: number;
}

export interface PresidentialDecisionRoomAdvanceReadiness {
  headline: string;
  blockedByExistingSystems: boolean;
  items: PresidentialDecisionRoomCard[];
}

export interface PresidentialDecisionRoomMetrics {
  urgentCount: number;
  pendingReviews: number;
  opportunities: number;
  hardTurns: number;
  advanceReviewCount: number;
}

export type PresidentialDecisionRoomLensId = 'all' | PresidentialDecisionRoomCategory;

export interface PresidentialDecisionRoomLens {
  id: PresidentialDecisionRoomLensId;
  label: string;
  count: number;
  urgentCount: number;
  topCardId: string | null;
  actionLabel: string;
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
}

export type PresidentialDecisionRoomNextOrderRole = 'act' | 'inspect' | 'monitor';

export interface PresidentialDecisionRoomNextOrder {
  id: string;
  role: PresidentialDecisionRoomNextOrderRole;
  label: string;
  headline: string;
  instruction: string;
  cardId: string | null;
  urgent: boolean;
  actionLabel: string;
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
}

export type PresidentialDecisionRoomCommandQuestionId =
  | 'urgent'
  | 'pending'
  | 'fronts'
  | 'inspect'
  | 'advance';

export type PresidentialDecisionRoomLoopStepId =
  | 'brief'
  | 'inspect'
  | 'decide'
  | 'execute'
  | 'report'
  | 'cost'
  | 'judge'
  | 'next';

export interface PresidentialDecisionRoomCommandQuestion {
  id: PresidentialDecisionRoomCommandQuestionId;
  label: string;
  headline: string;
  summary: string;
  count: number;
  urgentCount: number;
  cardIds: string[];
  actionLabel: string;
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
}

export interface PresidentialDecisionRoomLoopStep {
  id: PresidentialDecisionRoomLoopStepId;
  label: string;
  headline: string;
  summary: string;
  count: number;
  urgentCount: number;
  cardIds: string[];
  actionLabel: string;
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
}

export interface PresidentialDecisionRoomSourceHandoff {
  id: string;
  label: string;
  summary: string;
  count: number;
  urgentCount: number;
  cardIds: string[];
  actionLabel: string;
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
}

export interface PresidentialDecisionRoomDossier {
  id: string;
  cardId: string;
  category: PresidentialDecisionRoomCategory;
  severity: PresidentialDecisionRoomSeverity;
  title: string;
  explanation: string;
  sourceOwner: string;
  sourceLabel: string;
  actionLabel: string;
  evidence: string[];
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
  /** Optional War-Direction directive the dossier can ISSUE inline (additive). */
  directive?: PresidentialDecisionRoomDirective;
  sourceHandoff: PresidentialDecisionRoomSourceHandoff | null;
  relatedCardIds: string[];
  advanceSensitive: boolean;
  advanceLabel: string;
}

export interface PresidentialDecisionRoomView {
  hasPlayerFaction: boolean;
  emptyState: string | null;
  cards: PresidentialDecisionRoomCard[];
  lenses: PresidentialDecisionRoomLens[];
  nextOrders: PresidentialDecisionRoomNextOrder[];
  commandQuestions: PresidentialDecisionRoomCommandQuestion[];
  loopSteps: PresidentialDecisionRoomLoopStep[];
  sourceHandoffs: PresidentialDecisionRoomSourceHandoff[];
  activeDossier: PresidentialDecisionRoomDossier | null;
  inspectNext: PresidentialDecisionRoomCard[];
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness;
  metrics: PresidentialDecisionRoomMetrics;
}

export interface PresidentialDecisionRoomInput {
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
  selectedCardId?: string | null;
}

type CandidateCard = Omit<PresidentialDecisionRoomCard, 'sortKey' | 'directive'> & {
  urgencySort: number;
  sourceSort: string;
  directive?: PresidentialDecisionRoomDirective;
};

type ManifestModalFamilyId = 'peace_plan' | 'dayton_negotiation' | 'convoy_decision';

function isManifestModalFamilyId(value: string): value is ManifestModalFamilyId {
  return value === 'peace_plan' || value === 'dayton_negotiation' || value === 'convoy_decision';
}

const LARGE_SORT = 999999;

const SEVERITY_RANK: Record<PresidentialDecisionRoomSeverity, number> = {
  blocking: 0,
  critical: 1,
  warning: 2,
  info: 3,
};

const CATEGORY_RANK: Record<PresidentialDecisionRoomCategory, number> = {
  decision: 0,
  counter_offer: 1,
  opportunity: 2,
  operational: 3,
  briefing: 4,
  command: 5,
  turn: 6,
  cost: 7,
  memory: 8,
};

const CATEGORY_LABEL_KEY: Record<PresidentialDecisionRoomCategory, MessageKey> = {
  decision: 'decisionRoom.category.decision',
  counter_offer: 'decisionRoom.category.counterOffer',
  opportunity: 'decisionRoom.category.opportunity',
  operational: 'decisionRoom.category.operational',
  briefing: 'decisionRoom.category.briefing',
  command: 'decisionRoom.category.command',
  turn: 'decisionRoom.category.turn',
  cost: 'decisionRoom.category.cost',
  memory: 'decisionRoom.category.memory',
};

const CATEGORY_ORDER = (Object.keys(CATEGORY_RANK) as PresidentialDecisionRoomCategory[])
  .sort((a, b) => CATEGORY_RANK[a] - CATEGORY_RANK[b]);

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function pluralize(value: number, singular: string, plural = `${singular}s`): string {
  return value === 1 ? singular : plural;
}

function humanize(value: string | undefined): string {
  const text = (value ?? '').replace(/[_:-]/g, ' ').trim();
  if (!text) return 'Staff report';
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function toDecisionSeverity(state: LoadedGameState): PresidentialDecisionRoomSeverity {
  const queue = state.presidentialReviewQueue;
  if (!queue) return 'info';
  if (queue.eventDecisionCount > 0) return 'blocking';
  if (queue.criticalCount > 0) return 'critical';
  return 'warning';
}

function costToCardSeverity(severity: TurnAftermathCostSeverity): PresidentialDecisionRoomSeverity {
  if (severity === 'critical') return 'critical';
  if (severity === 'severe') return 'warning';
  return 'info';
}

function compareCandidates(a: CandidateCard, b: CandidateCard): number {
  const severityDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (severityDelta !== 0) return severityDelta;
  const categoryDelta = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
  if (categoryDelta !== 0) return categoryDelta;
  if (a.urgencySort !== b.urgencySort) return a.urgencySort - b.urgencySort;
  const sourceDelta = strictCompare(a.sourceSort, b.sourceSort);
  if (sourceDelta !== 0) return sourceDelta;
  return strictCompare(a.id, b.id);
}

function actionForBriefingItem(item: CommandBriefingItemView): Pick<CandidateCard, 'actionLabel' | 'navigationTarget'> {
  if (item.target.type === 'corps' && item.target.corpsId) {
    return {
      actionLabel: t('decisionRoom.action.inspectCorps'),
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: item.target.corpsId },
    };
  }
  if (item.target.type === 'operation') {
    const corpsId = item.target.operationKey?.split('|')[0] ?? item.corpsId ?? null;
    return {
      actionLabel: t('decisionRoom.action.inspectCorps'),
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId },
    };
  }
  if (item.target.type === 'sector' && item.corpsId) {
    return {
      actionLabel: t('decisionRoom.action.inspectCorps'),
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: item.corpsId },
    };
  }
  if (item.target.type === 'summary') {
    return {
      actionLabel: t('decisionRoom.action.warSummary'),
      navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
    };
  }
  if (item.target.type === 'officer_events') {
    return {
      actionLabel: t('decisionRoom.action.personnel'),
      navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
    };
  }
  return {
    actionLabel: item.actionLabel ?? t('decisionRoom.action.reviewBriefing'),
    navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
  };
}

function addReviewCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const queue = state.presidentialReviewQueue;
  if (!queue || queue.pendingCount <= 0) return;

  const evidence: string[] = [t('decisionRoom.card.review.evidence.pending', { count: queue.pendingCount })];
  if (queue.eventDecisionCount > 0) evidence.push(t('decisionRoom.card.review.evidence.eventDecision', { count: queue.eventDecisionCount }));
  if (queue.commandInterpretationCount > 0) evidence.push(t('decisionRoom.card.review.evidence.commandReaction', { count: queue.commandInterpretationCount }));
  if (queue.personnelDirectiveCount > 0) evidence.push(t('decisionRoom.card.review.evidence.personnel', { count: queue.personnelDirectiveCount }));
  if (queue.operationOpportunityCount > 0) evidence.push(t('decisionRoom.card.review.evidence.opDossier', { count: queue.operationOpportunityCount }));

  cards.push({
    id: 'review:pending',
    category: 'decision',
    severity: toDecisionSeverity(state),
    title: t('decisionRoom.card.review.title'),
    explanation: queue.eventDecisionCount > 0
      ? t('decisionRoom.card.review.explanation.blocking')
      : t('decisionRoom.card.review.explanation.openWork'),
    sourceOwner: t('decisionRoom.card.review.sourceOwner'),
    sourceLabel: 'Presidential Inbox',
    actionLabel: 'Open Desk',
    evidence,
    navigationTarget: { kind: 'inbox' },
    urgencySort: queue.eventDecisionCount > 0 ? 0 : 10,
    sourceSort: 'review',
  });
}

function addParamilitaryReviewCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const requests = state.pendingParamilitaryRequests ?? [];
  if (requests.length === 0) return;

  const surface = getDecisionSurface('paramilitary_request');
  const totalStrength = requests.reduce((sum, request) => sum + request.strength, 0);
  cards.push({
    id: 'paramilitary:pending',
    category: 'decision',
    severity: 'blocking',
    title: t('decisionRoom.card.paramilitary.title'),
    explanation: t('decisionRoom.card.paramilitary.explanation'),
    sourceOwner: t('decisionRoom.card.paramilitary.sourceOwner'),
    sourceLabel: t('decisionRoom.card.paramilitary.sourceLabel'),
    actionLabel: surface.actionLabel,
    evidence: [
      t('decisionRoom.card.paramilitary.evidence.deploymentRequests', { count: requests.length }),
      t('decisionRoom.card.paramilitary.evidence.estimatedStrength', { strength: totalStrength }),
      t('decisionRoom.card.paramilitary.evidence.warCrimesRisk'),
    ],
    navigationTarget: { kind: 'inbox' },
    urgencySort: 0,
    sourceSort: 'paramilitary',
  });
}

function addManifestDecisionCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const summary = state.playerDecisionSummary;
  if (!summary || summary.blockingCount <= 0) return;

  const existingIds = new Set(cards.map((card) => card.id));
  const cardSpecs: Record<string, {
    titleKey: MessageKey;
    explanationKey: MessageKey;
    sourceLabelKey: MessageKey;
    actionLabelKey: MessageKey;
  }> = {
    peace_plan: {
      titleKey: 'decisionRoom.card.manifest.peacePlan.title',
      explanationKey: 'decisionRoom.card.manifest.peacePlan.explanation',
      sourceLabelKey: 'decisionRoom.card.manifest.peacePlan.sourceLabel',
      actionLabelKey: 'decisionRoom.action.openInbox',
    },
    dayton_negotiation: {
      titleKey: 'decisionRoom.card.manifest.dayton.title',
      explanationKey: 'decisionRoom.card.manifest.dayton.explanation',
      sourceLabelKey: 'decisionRoom.card.manifest.dayton.sourceLabel',
      actionLabelKey: 'decisionRoom.action.openInbox',
    },
    convoy_decision: {
      titleKey: 'decisionRoom.card.manifest.convoy.title',
      explanationKey: 'decisionRoom.card.manifest.convoy.explanation',
      sourceLabelKey: 'decisionRoom.card.manifest.convoy.sourceLabel',
      actionLabelKey: 'decisionRoom.action.openInbox',
    },
  };

  for (const family of summary.families) {
    const blockingCount = family.blockingCount ?? (family.gatePolicy === 'advisory' ? 0 : family.count);
    if (blockingCount <= 0) continue;
    if (family.id === 'event_decision' || family.id === 'paramilitary_request') continue;
    if (!isManifestModalFamilyId(family.id)) continue;
    const spec = cardSpecs[family.id];
    const surface = getDecisionSurface(family.id);
    const id = `manifest:${family.id}`;
    if (existingIds.has(id)) continue;
    cards.push({
      id,
      category: 'decision',
      severity: 'blocking',
      title: t(spec.titleKey),
      explanation: t(spec.explanationKey),
      sourceOwner: t('decisionRoom.card.manifest.sourceOwner'),
      sourceLabel: surface.sourceLabel,
      actionLabel: surface.actionLabel,
      evidence: [t('decisionRoom.card.manifest.evidence.pendingItems', { count: blockingCount })],
      navigationTarget: { kind: 'inbox' },
      urgencySort: -1,
      sourceSort: `manifest:${family.id}`,
    });
    existingIds.add(id);
  }
}

function formatCounterOfferSplit(split: { RBiH: number; RS: number; HRHB: number }): string {
  return `RBiH ${split.RBiH} / RS ${split.RS} / HRHB ${split.HRHB}`;
}

function addCounterOfferCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const offers = [...(state.pendingCounterOffers ?? [])].sort((a, b) => strictCompare(a.id, b.id));
  for (const offer of offers) {
    const evidence = [
      formatCounterOfferSplit(offer.proposedSplit),
      offer.rider,
      offer.sourceCitation ? t('decisionRoom.card.counterOffer.evidence.source', { source: offer.sourceCitation }) : null,
    ].filter((entry): entry is string => Boolean(entry));

    cards.push({
      id: `counter-offer:${offer.id}`,
      category: 'counter_offer',
      severity: 'blocking',
      title: t('decisionRoom.card.counterOffer.title', { author: offer.author }),
      explanation: t('decisionRoom.card.counterOffer.explanation', { planName: offer.planName }),
      sourceOwner: t('decisionRoom.source.counterOfferDocket'),
      sourceLabel: offer.planName,
      actionLabel: t('decisionRoom.action.reviewCounter'),
      evidence,
      navigationTarget: { kind: 'counter-offer', counterOfferId: offer.id },
      urgencySort: offer.createdTurn,
      sourceSort: offer.id,
    });
  }
}

function addOpportunityCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const opportunities = [...(state.operationOpportunityProposals ?? [])].sort((a, b) => {
    const aExpiry = a.expires_turn ?? LARGE_SORT;
    const bExpiry = b.expires_turn ?? LARGE_SORT;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;
    const aEligibility = a.eligibility_turn ?? LARGE_SORT;
    const bEligibility = b.eligibility_turn ?? LARGE_SORT;
    if (aEligibility !== bEligibility) return aEligibility - bEligibility;
    return strictCompare(a.proposal_id, b.proposal_id);
  });

  for (const opportunity of opportunities) {
    const expires = opportunity.expires_turn ?? LARGE_SORT;
    const required = opportunity.required_axes_total != null
      ? t('decisionRoom.card.opportunity.evidence.requiredAxes', { green: opportunity.required_axes_green ?? 0, total: opportunity.required_axes_total })
      : null;
    const optional = opportunity.optional_axes_total != null
      ? t('decisionRoom.card.opportunity.evidence.optionalAxes', { green: opportunity.optional_axes_green ?? 0, total: opportunity.optional_axes_total })
      : null;
    const evidence = [
      opportunity.expires_turn != null ? t('decisionRoom.card.opportunity.evidence.expires', { turn: opportunity.expires_turn }) : t('decisionRoom.card.opportunity.evidence.liveDossier'),
      required,
      optional,
    ].filter((entry): entry is string => Boolean(entry));

    // AUTHORIZE-OP directive: when the officer's proposal carries an enabled
    // `approve` action, the card can ISSUE acceptance inline (acceptProposal).
    // Cost 0 — agreeing with the officer's own recommendation is free.
    const canApprove = opportunity.available_actions.some(
      (action) => action.id === 'approve' && action.enabled,
    );
    const directive: PresidentialDecisionRoomDirective | undefined = canApprove
      ? { lever: 'authorize_op', cost: 0, payload: { proposalId: opportunity.proposal_id } }
      : undefined;

    cards.push({
      id: `opportunity:${opportunity.proposal_id}`,
      category: 'opportunity',
      severity: opportunity.expires_turn != null && opportunity.expires_turn <= (state.turn ?? 0) + 1
        ? 'critical'
        : 'warning',
      title: opportunity.display_name,
      explanation: opportunity.recommendation ?? opportunity.description ?? t('decisionRoom.card.opportunity.fallbackExplanation'),
      sourceOwner: t('decisionRoom.card.opportunity.sourceOwner'),
      sourceLabel: t('decisionRoom.card.opportunity.sourceLabel'),
      actionLabel: t('decisionRoom.action.reviewDossier'),
      evidence,
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
      ...(directive ? { directive } : {}),
      urgencySort: expires,
      sourceSort: opportunity.proposal_id,
    });
  }
}

function addSupplyVisibilityCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const view = buildPlayerSupplyVisibility(state);
  if (!view || !view.hasSupplyData) return;
  if (view.severity !== 'critical' && view.severity !== 'warning') return;

  const cardSeverity: PresidentialDecisionRoomSeverity = view.severity === 'critical' ? 'critical' : 'warning';
  cards.push({
    id: 'supply:player-visibility',
    category: 'operational',
    severity: cardSeverity,
    title: view.headline,
    explanation:
      view.severity === 'critical'
        ? t('decisionRoom.card.supply.explanation.critical')
        : t('decisionRoom.card.supply.explanation.warning'),
    sourceOwner: t('decisionRoom.card.supply.sourceOwner'),
    sourceLabel: t('decisionRoom.card.sitrep.title'),
    actionLabel: t('decisionRoom.action.warSummary'),
    evidence: view.evidence,
    navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
    urgencySort: cardSeverity === 'critical' ? 0 : 5,
    sourceSort: 'supply:player-visibility',
  });
}

function addArmyCoPushbackCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const view = buildPlayerArmyCoPushbackVisibility(state);
  if (!view || !view.hasSignal) return;

  const cardSeverity: PresidentialDecisionRoomSeverity = view.severity === 'blocking'
    ? 'blocking'
    : view.severity === 'warning'
      ? 'warning'
      : 'info';

  cards.push({
    id: 'pushback:player-army-co',
    category: 'decision',
    severity: cardSeverity,
    title: view.headline,
    explanation: view.rationale,
    sourceOwner: t('decisionRoom.card.pushback.sourceOwner'),
    sourceLabel: t('decisionRoom.panel.title'),
    actionLabel: t('decisionRoom.action.reviewPushback'),
    evidence: view.evidence,
    navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    urgencySort: cardSeverity === 'blocking' ? 0 : 5,
    sourceSort: 'pushback:player-army-co',
  });
}

function addSitrepCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const alerts = [...(state.operationalSitrep?.alerts ?? [])].sort((a, b) => {
    const severityDelta = SEVERITY_RANK[a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info']
      - SEVERITY_RANK[b.severity === 'critical' ? 'critical' : b.severity === 'warning' ? 'warning' : 'info'];
    if (severityDelta !== 0) return severityDelta;
    const textDelta = strictCompare(a.text, b.text);
    if (textDelta !== 0) return textDelta;
    return strictCompare(a.id, b.id);
  });

  for (const alert of alerts) {
    cards.push({
      id: `sitrep:${alert.id}`,
      category: 'operational',
      severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
      title: t('decisionRoom.card.sitrep.title'),
      explanation: alert.text,
      sourceOwner: t('decisionRoom.card.sitrep.title'),
      sourceLabel: t('decisionRoom.action.warSummary'),
      actionLabel: t('decisionRoom.action.warSummary'),
      evidence: [
        t('decisionRoom.card.sitrep.evidence.exposedFronts', { count: state.operationalSitrep?.front.exposedCount ?? 0 }),
        t('decisionRoom.card.sitrep.evidence.criticalSustainment', { count: state.operationalSitrep?.sustainment.criticalCount ?? 0 }),
      ],
      navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
      urgencySort: 0,
      sourceSort: `${alert.text}:${alert.id}`,
    });
  }
}

function addBriefingCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const items = [...(state.commandBriefing?.items ?? [])].sort((a, b) => {
    const aSeverity = a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info';
    const bSeverity = b.severity === 'critical' ? 'critical' : b.severity === 'warning' ? 'warning' : 'info';
    const severityDelta = SEVERITY_RANK[aSeverity] - SEVERITY_RANK[bSeverity];
    if (severityDelta !== 0) return severityDelta;
    const titleDelta = strictCompare(a.title, b.title);
    if (titleDelta !== 0) return titleDelta;
    return strictCompare(a.id, b.id);
  });

  for (const item of items.slice(0, 4)) {
    const action = actionForBriefingItem(item);
    // STOP-OP directive: a briefing item targeting a live operation carries the
    // (corpsId, opName) pair as `operationKey` ("corpsId|opName"). The president
    // can HALT it inline (stageOpHaltOrder). Only populate when BOTH parts parse.
    const directive: PresidentialDecisionRoomDirective | undefined = (() => {
      if (item.target.type !== 'operation') return undefined;
      const key = item.target.operationKey;
      if (!key) return undefined;
      const sep = key.indexOf('|');
      if (sep <= 0 || sep >= key.length - 1) return undefined;
      const corpsId = key.slice(0, sep);
      const opName = key.slice(sep + 1);
      return {
        lever: 'stop_op',
        corpsId,
        cost: STOP_OP_COST,
        payload: { corpsId, opName },
      };
    })();

    cards.push({
      id: `briefing:${item.id}`,
      category: 'briefing',
      severity: item.severity === 'critical' ? 'critical' : item.severity === 'warning' ? 'warning' : 'info',
      title: item.title,
      explanation: item.detail,
      sourceOwner: t('decisionRoom.card.briefing.sourceOwner'),
      sourceLabel: humanize(item.kind),
      actionLabel: action.actionLabel,
      evidence: [item.category ? humanize(item.category) : humanize(item.kind)],
      navigationTarget: action.navigationTarget,
      ...(directive ? { directive } : {}),
      urgencySort: 0,
      sourceSort: `${item.title}:${item.id}`,
    });
  }
}

/**
 * COMMAND & PERSONNEL directives (Slice 2 / owner-locked decision #1: these levers
 * ISSUE INLINE as Decision-Room priority cards, not deep-link-only). Emits, in a
 * fixed deterministic order:
 *   1. replace-CO — one card per player-faction corps whose serving CO is eligible
 *      to be sacked (active, assigned, NOT acting). cost=REPLACE_CO_COST. The
 *      DirectiveCard issues stageCoReplacementOrder({ corpsId }) with the engine
 *      auto-picking the best reserve replacement (hybrid note: the heavy candidate
 *      picker stays in CommanderSection; inline confirm uses the proven auto-pick
 *      path the dismiss button already uses — single CA-cost confirm, no picker lift).
 *   2. elite-deploy — one card per pending army-reserve request. cost=ELITE_DEPLOY_COST.
 *      Issues approveReserveRequest(request_id, suggested_brigade_id). Requests with
 *      no suggested brigade carry no directive (the president must pick a brigade in
 *      the ArmyReservePanel — card still scans + deep-links).
 *   3. front-visit — a single leadership card. cost=FRONT_VISIT_COST. Reachability is
 *      computed async server-side (getFrontVisitAvailability); the DirectiveCard
 *      gates the ISSUE button on it and shows a disabled/reason state when the
 *      president cannot reach any front. Emitted once so the option is always visible
 *      to scan; never crashes when unreachable.
 *
 * Deterministic: corps + reserve requests are iterated in a stable strictCompare
 * order; the front-visit card is a fixed singleton. No nondeterministic or
 * time-based sources.
 */
function addCommandPersonnelCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const playerFaction = state.player_faction ?? null;
  if (!playerFaction) return;

  const officers = state.namedOfficerData ?? [];

  // 1. REPLACE-CO — player-faction corps with an eligible serving CO.
  const corps = [...(state.formations ?? [])]
    .filter((formation) => formation.faction === playerFaction && formation.kind === 'corps')
    .sort((a, b) => strictCompare(a.id, b.id));
  for (const formation of corps) {
    const commander = officers.find(
      (o) => o.assigned_corps_id === formation.id && o.status === 'active',
    );
    // Eligible only when there IS a serving CO to replace and they are not merely an
    // acting commander (mirrors CommanderSection's dismiss gate: `!isActing`).
    if (!commander || commander.acting_commander) continue;
    cards.push({
      id: `command:replace-co:${formation.id}`,
      category: 'command',
      severity: commander.political_reliability <= 2 ? 'warning' : 'info',
      title: t('decisionRoom.card.replaceCo.title', { corps: formation.name }),
      explanation: t('decisionRoom.card.replaceCo.explanation', { officer: commander.name }),
      sourceOwner: t('decisionRoom.card.command.sourceOwner'),
      sourceLabel: t('decisionRoom.card.replaceCo.sourceLabel'),
      actionLabel: t('decisionRoom.action.personnel'),
      evidence: [
        t('decisionRoom.card.replaceCo.evidence.serving', { officer: commander.name }),
        t('decisionRoom.card.replaceCo.evidence.loyalty', { value: commander.political_reliability }),
      ],
      navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
      directive: {
        lever: 'replace_co',
        corpsId: formation.id,
        cost: REPLACE_CO_COST,
        payload: { corpsId: formation.id },
      },
      urgencySort: commander.political_reliability <= 2 ? 5 : 20,
      sourceSort: `command:replace-co:${formation.id}`,
    });
  }

  // 2. ELITE-DEPLOY — pending army-reserve requests (the president releases an elite
  // brigade from the strategic reserve to a corps that asked for one).
  const reserveRequests = [...(state.pendingReserveRequests ?? [])]
    .filter((request) => request.faction === playerFaction)
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return strictCompare(a.request_id, b.request_id);
    });
  for (const request of reserveRequests) {
    const suggestedBrigadeId = request.suggested_brigade_id;
    // Only ISSUE inline when the request carries a concrete brigade to release; if
    // the staff named none, the card still scans + deep-links to the ArmyReservePanel
    // where the president selects one.
    const directive: PresidentialDecisionRoomDirective | undefined = suggestedBrigadeId
      ? {
          lever: 'elite_deploy',
          corpsId: request.corps_id,
          cost: ELITE_DEPLOY_COST,
          payload: { requestId: request.request_id, brigadeId: suggestedBrigadeId },
        }
      : undefined;
    cards.push({
      id: `command:elite-deploy:${request.request_id}`,
      category: 'command',
      severity: request.severityBand === 'critical' ? 'critical' : 'warning',
      // pendingReserveRequests carry only corps_id (no corps_name); resolve the
      // display name from state.formations as the sibling replace_co / request_op
      // cards do, so the title never leaks a raw corps id (e.g. arbih_1st_corps).
      title: t('decisionRoom.card.eliteDeploy.title', {
        corps:
          state.formations?.find((f) => f.id === request.corps_id)?.name ?? request.corps_id,
      }),
      explanation: request.why_needed ?? request.description,
      sourceOwner: t('decisionRoom.card.command.sourceOwner'),
      sourceLabel: t('decisionRoom.card.eliteDeploy.sourceLabel'),
      actionLabel: t('decisionRoom.action.personnel'),
      evidence: [
        t('decisionRoom.card.eliteDeploy.evidence.reason', { reason: humanize(request.reason) }),
        t('decisionRoom.card.eliteDeploy.evidence.travel', { hops: request.travel_hops }),
      ],
      navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
      ...(directive ? { directive } : {}),
      urgencySort: request.severityBand === 'critical' ? 0 : 5,
      sourceSort: `command:elite-deploy:${request.request_id}`,
    });
  }

  // 3. FRONT-VISIT — a single leadership card. Reachability + cap/cooldown are an
  // async server-side query (getFrontVisitAvailability) the DirectiveCard performs;
  // the card is emitted unconditionally so the option is always scannable, and the
  // ISSUE button disables (with a reason) when no front is reachable.
  cards.push({
    id: 'command:front-visit',
    category: 'command',
    severity: 'info',
    title: t('decisionRoom.card.frontVisit.title'),
    explanation: t('decisionRoom.card.frontVisit.explanation'),
    sourceOwner: t('decisionRoom.card.command.sourceOwner'),
    sourceLabel: t('decisionRoom.card.frontVisit.sourceLabel'),
    actionLabel: t('decisionRoom.action.personnel'),
    evidence: [t('decisionRoom.card.frontVisit.evidence.gesture')],
    navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
    directive: {
      lever: 'front_visit',
      cost: FRONT_VISIT_COST,
      payload: {},
    },
    urgencySort: 50,
    sourceSort: 'command:front-visit',
  });
}

/**
 * REQUEST-OP directives (headline War-Direction lever): one `command`-category
 * card per PLAYER-faction corps that has an ACTIVE serving CO (the same active /
 * assigned-CO gate `addCommandPersonnelCards`'s replace-CO path uses, so the
 * DirectiveCard objection lookup resolves to a real commander). The directive
 * payload is EMPTY — the president names the target OSID in the DirectiveCard's
 * in-card input, and the proven objection → force-anyway flow there handles
 * invalid / unreachable targets and commander pushback. No UI read-model of valid
 * targets exists; the in-card free-text OSID surface mirrors OperationsSection.
 *
 * Deterministic: corps are iterated in a stable strictCompare order. No
 * nondeterministic or time-based sources.
 */
function addRequestOpDirectiveCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const playerFaction = state.player_faction ?? null;
  if (!playerFaction) return;

  const officers = state.namedOfficerData ?? [];
  const corps = [...(state.formations ?? [])]
    .filter((formation) => formation.faction === playerFaction && formation.kind === 'corps')
    .sort((a, b) => strictCompare(a.id, b.id));

  for (const formation of corps) {
    const commander = officers.find(
      (o) => o.assigned_corps_id === formation.id && o.status === 'active',
    );
    // Need a real serving CO so the DirectiveCard objection lookup resolves.
    if (!commander) continue;
    cards.push({
      id: `command:request-op:${formation.id}`,
      category: 'command',
      severity: 'info',
      title: t('decisionRoom.card.requestOp.title', { corps: formation.name }),
      explanation: t('decisionRoom.card.requestOp.explanation', { officer: commander.name }),
      sourceOwner: t('decisionRoom.card.command.sourceOwner'),
      sourceLabel: t('decisionRoom.card.requestOp.sourceLabel'),
      actionLabel: t('decisionRoom.action.inspectCorps'),
      evidence: [
        t('decisionRoom.card.requestOp.evidence.serving', { officer: commander.name }),
        t('decisionRoom.card.requestOp.evidence.input'),
      ],
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: formation.id },
      directive: {
        lever: 'request_op',
        corpsId: formation.id,
        cost: REQUEST_OP_COST,
        payload: {},
      },
      urgencySort: 40,
      sourceSort: `command:request-op:${formation.id}`,
    });
  }
}

/**
 * FORCE-LAUNCH directives (headline War-Direction lever): one `command`-category
 * card per pending op proposal whose commander withheld approval but offers a
 * presidential override (`override_available === true`). The DirectiveCard's
 * force_launch branch consumes `{ corpsId, opName }` end-to-end with NO objection
 * re-query — the president overrides a known no-go directly (stageOperationForceLaunch).
 *
 * Deterministic: proposals are iterated in a stable strictCompare order by
 * proposal id. No nondeterministic or time-based sources.
 */
function addForceLaunchDirectiveCards(state: LoadedGameState, cards: CandidateCard[]): void {
  const proposals = [...(state.opProposalCards ?? [])]
    .filter((proposal) => proposal.override_available === true)
    .sort((a, b) => strictCompare(a.proposal_id, b.proposal_id));

  for (const proposal of proposals) {
    cards.push({
      id: `command:force-launch:${proposal.proposal_id}`,
      category: 'command',
      severity: 'warning',
      title: t('decisionRoom.card.forceLaunch.title', { opName: proposal.op_name }),
      explanation: t('decisionRoom.card.forceLaunch.explanation', {
        opName: proposal.op_name,
        corps: proposal.corps_name,
      }),
      sourceOwner: t('decisionRoom.card.command.sourceOwner'),
      sourceLabel: t('decisionRoom.card.forceLaunch.sourceLabel'),
      actionLabel: t('decisionRoom.action.inspectCorps'),
      evidence: [
        t('decisionRoom.card.forceLaunch.evidence.corps', { corps: proposal.corps_name }),
        t('decisionRoom.card.forceLaunch.evidence.override'),
      ],
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: proposal.corps_id },
      directive: {
        lever: 'force_launch',
        corpsId: proposal.corps_id,
        cost: FORCE_LAUNCH_COST,
        payload: { opName: proposal.op_name },
      },
      urgencySort: 5,
      sourceSort: `command:force-launch:${proposal.proposal_id}`,
    });
  }
}

/**
 * PROACTIVE force-launch directives (override officer SILENCE): one
 * `command`-category card per corps plan the commander holds at 'ready' WITHOUT
 * ever surfacing it as a proposal. Unlike addForceLaunchDirectiveCards (which
 * overrides a surfaced no-go), this lets the president order an operation the
 * officer never asked for. Reuses the existing projection
 * `buildForceableReadyPlans` (held-but-unproposed ready plans) and the SAME
 * `force_launch` lever / `{ corpsId, opName }` payload — only the cost differs
 * (PROACTIVE_FORCE_LAUNCH_COST). The IPC + DirectiveCard already consume this.
 *
 * De-dup: buildForceableReadyPlans already excludes any plan that carries an
 * APPROVE_OP proposal, so a plan with a proposal-override card never produces a
 * proactive card here. Player-faction gating is enforced inside the projection.
 *
 * Deterministic: the projection returns plans in a stable order (corps id then
 * plan id). No nondeterministic or time-based sources.
 */
function addProactiveForceLaunchDirectiveCards(
  state: LoadedGameState,
  cards: CandidateCard[],
): void {
  if (!state.player_faction) return;
  const roster = (state.namedOfficerData ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    rank: o.rank,
    status: o.status,
  }));
  const plans = buildForceableReadyPlans(
    state.rawGameState,
    roster,
    state.pendingProposalReviews,
  );

  for (const plan of plans) {
    cards.push({
      id: `command:proactive-force-launch:${plan.corps_id}:${plan.plan_id}`,
      category: 'command',
      severity: 'warning',
      title: t('decisionRoom.card.proactiveForceLaunch.title', { opName: plan.op_name }),
      explanation: t('decisionRoom.card.proactiveForceLaunch.explanation', {
        opName: plan.op_name,
        corps: plan.corps_name,
      }),
      sourceOwner: t('decisionRoom.card.command.sourceOwner'),
      sourceLabel: t('decisionRoom.card.proactiveForceLaunch.sourceLabel'),
      actionLabel: t('decisionRoom.action.inspectCorps'),
      evidence: [
        t('decisionRoom.card.proactiveForceLaunch.evidence.corps', { corps: plan.corps_name }),
        t('decisionRoom.card.proactiveForceLaunch.evidence.held'),
      ],
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: plan.corps_id },
      directive: {
        lever: 'force_launch',
        corpsId: plan.corps_id,
        cost: PROACTIVE_FORCE_LAUNCH_COST,
        payload: { opName: plan.op_name },
      },
      urgencySort: 6,
      sourceSort: `command:proactive-force-launch:${plan.corps_id}:${plan.plan_id}`,
    });
  }
}

function turnCostPriority(record: TurnAftermathView): number {
  const severity = record.cost.severity === 'critical' ? 0 : 1;
  return severity * 1000 - record.turn;
}

function addHardTurnCards(
  state: LoadedGameState,
  osidNameMap: Record<string, string> | null,
  cards: CandidateCard[],
): void {
  const hardTurns = buildTurnAftermathRecordViews({
    state,
    osidNameMap,
    limit: 24,
  })
    .filter((record) => record.cost.severity === 'critical' || record.cost.severity === 'severe')
    .sort((a, b) => {
      const priorityDelta = turnCostPriority(a) - turnCostPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      if (a.cost.friendlyMilitaryCasualties !== b.cost.friendlyMilitaryCasualties) {
        return b.cost.friendlyMilitaryCasualties - a.cost.friendlyMilitaryCasualties;
      }
      if (a.cost.displacedThisTurn !== b.cost.displacedThisTurn) {
        return b.cost.displacedThisTurn - a.cost.displacedThisTurn;
      }
      return b.turn - a.turn;
    })
    .slice(0, 3);

  for (const record of hardTurns) {
    cards.push({
      id: `turn:${record.turn}:hard-turn`,
      category: 'turn',
      severity: costToCardSeverity(record.cost.severity),
      title: t('decisionRoom.card.hardTurn.title', { dateLabel: record.dateLabel }),
      explanation: record.cost.reasons.slice(0, 3).join(' / '),
      sourceOwner: t('decisionRoom.card.hardTurn.sourceOwner'),
      sourceLabel: t('decisionRoom.card.hardTurn.sourceLabel', { turn: record.turn }),
      actionLabel: t('decisionRoom.action.openTurnRecord'),
      evidence: [
        t('decisionRoom.card.hardTurn.evidence.net', { net: formatSigned(record.territory.friendlyNet) }),
        t('decisionRoom.card.hardTurn.evidence.casualties', { count: record.cost.friendlyMilitaryCasualties }),
        t('decisionRoom.card.hardTurn.evidence.displaced', { count: record.cost.displacedThisTurn }),
      ],
      navigationTarget: { kind: 'army-hq-aftermath-record', turn: record.turn },
      urgencySort: -record.turn,
      sourceSort: `turn:${String(record.turn).padStart(5, '0')}`,
    });
  }
}

function addCampaignCostCard(
  state: LoadedGameState,
  osidNameMap: Record<string, string> | null,
  cards: CandidateCard[],
): void {
  const campaignCost = buildTurnAftermathCampaignCost({ state, osidNameMap });
  if (campaignCost.recordCount <= 0 || campaignCost.severity === 'low') return;

  cards.push({
    id: 'campaign-cost',
    category: 'cost',
    severity: costToCardSeverity(campaignCost.severity),
    title: campaignCost.headline,
    explanation: campaignCost.briefing,
    sourceOwner: t('decisionRoom.card.campaignCost.sourceOwner'),
    sourceLabel: t('decisionRoom.card.campaignCost.sourceLabel'),
    actionLabel: t('decisionRoom.action.turnRecords'),
    evidence: [
      t('decisionRoom.card.campaignCost.evidence.turns', { count: campaignCost.recordCount }),
      t('decisionRoom.card.campaignCost.evidence.casualties', { count: campaignCost.totalFriendlyMilitaryCasualties }),
      t('decisionRoom.card.campaignCost.evidence.displaced', { count: campaignCost.totalDisplaced }),
    ],
    navigationTarget: { kind: 'army-hq-records', recordsSubTab: 'aftermath' },
    urgencySort: 0,
    sourceSort: 'campaign-cost',
  });
}

function addChronicleCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const turnCount = state.turnSummaries?.length ?? 0;
  if (turnCount <= 0) return;

  cards.push({
    id: 'chronicle:review-memory',
    category: 'memory',
    severity: 'info',
    title: t('decisionRoom.card.chronicle.title'),
    explanation: t('decisionRoom.card.chronicle.explanation'),
    sourceOwner: t('decisionRoom.source.chronicle'),
    sourceLabel: t('decisionRoom.card.chronicle.sourceLabel'),
    actionLabel: t('decisionRoom.action.showChronicle'),
    evidence: [t('decisionRoom.card.chronicle.evidence.recordedTurns', { count: turnCount })],
    navigationTarget: { kind: 'chronicle' },
    urgencySort: -((state.latestTurnSummary?.turn ?? state.turn) ?? 0),
    sourceSort: 'chronicle',
  });
}

function finalizeCards(cards: CandidateCard[]): PresidentialDecisionRoomCard[] {
  return cards
    .sort(compareCandidates)
    .map((card, index) => ({
      id: card.id,
      category: card.category,
      severity: card.severity,
      title: card.title,
      explanation: card.explanation,
      sourceOwner: card.sourceOwner,
      sourceLabel: card.sourceLabel,
      actionLabel: card.actionLabel,
      evidence: card.evidence,
      navigationTarget: card.navigationTarget,
      ...(card.directive ? { directive: card.directive } : {}),
      sortKey: index,
    }));
}

function buildAdvanceReadiness(
  state: LoadedGameState,
  cards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomAdvanceReadiness {
  const eligible = cards.filter((card) =>
    (card.category === 'decision'
      || card.category === 'counter_offer'
      || card.category === 'opportunity'
      || card.category === 'operational'
      || card.category === 'turn')
    && card.severity !== 'info',
  );
  const items: PresidentialDecisionRoomCard[] = [];
  const usedIds = new Set<string>();
  const usedCategories = new Set<PresidentialDecisionRoomCategory>();
  for (const card of eligible) {
    if (items.length >= 4) break;
    if (usedCategories.has(card.category)) continue;
    items.push(card);
    usedIds.add(card.id);
    usedCategories.add(card.category);
  }
  for (const card of eligible) {
    if (items.length >= 4) break;
    if (usedIds.has(card.id)) continue;
    items.push(card);
    usedIds.add(card.id);
  }

  const blockedByExistingSystems = state.playerDecisionSummary
    ? state.playerDecisionSummary.blockingCount > 0
    : (state.presidentialReviewQueue?.eventDecisionCount ?? 0) > 0
      || (state.pendingEventDecisions?.length ?? 0) > 0
      || (state.pendingParamilitaryRequests?.length ?? 0) > 0;

  return {
    headline: t(
      items.length > 0 || blockedByExistingSystems
        ? 'decisionRoom.advance.reviewBeforeAdvance'
        : 'decisionRoom.advance.clearToAdvance',
    ),
    blockedByExistingSystems,
    items,
  };
}

function isUrgentCard(card: PresidentialDecisionRoomCard): boolean {
  return card.severity === 'blocking' || card.severity === 'critical';
}

interface SourceHandoffDescriptor {
  id: string;
  label: string;
  actionLabel: string;
}

interface SourceHandoffAccumulator extends SourceHandoffDescriptor {
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
  topSortKey: number;
  cards: PresidentialDecisionRoomCard[];
}

function armyHqTabLabel(tab: ArmyHQTab): string {
  if (tab === 'briefing') return t('decisionRoom.source.armyHqBriefing');
  if (tab === 'summary') return t('decisionRoom.source.armyHqSummary');
  if (tab === 'records') return t('decisionRoom.source.armyHqRecords');
  return t('decisionRoom.source.armyHqPersonnel');
}

function armyHqRecordsLabel(recordsSubTab: ArmyHQRecordsSubTab): string {
  if (recordsSubTab === 'aftermath') return t('decisionRoom.source.armyHqRecords');
  if (recordsSubTab === 'aar') return t('decisionRoom.source.armyHqAarRecords');
  if (recordsSubTab === 'ops') return t('decisionRoom.source.armyHqOperationsRecords');
  return t('decisionRoom.source.armyHqOpportunityRecords');
}

function armyHqTabActionLabel(tab: ArmyHQTab): string {
  if (tab === 'briefing') return t('decisionRoom.action.openBriefing');
  if (tab === 'summary') return t('decisionRoom.action.openSummary');
  if (tab === 'records') return t('decisionRoom.action.openRecords');
  return t('decisionRoom.action.openPersonnel');
}

function describeSourceHandoffTarget(
  target: PresidentialDecisionRoomNavigationTarget,
): SourceHandoffDescriptor | null {
  if (target.kind === 'army-hq-tab') {
    return {
      id: `army-hq-${target.tab}`,
      label: armyHqTabLabel(target.tab),
      actionLabel: armyHqTabActionLabel(target.tab),
    };
  }
  if (target.kind === 'army-hq-records') {
    return {
      id: `army-hq-records-${target.recordsSubTab}`,
      label: armyHqRecordsLabel(target.recordsSubTab),
      actionLabel: t('decisionRoom.action.openRecords'),
    };
  }
  if (target.kind === 'army-hq-aftermath-record') {
    return {
      id: 'turn-aftermath-records',
      label: t('decisionRoom.source.turnAftermathRecords'),
      actionLabel: t('decisionRoom.action.openTurnRecord'),
    };
  }
  if (target.kind === 'army-hq-corps-briefing') {
    return {
      id: 'army-hq-corps-briefings',
      label: t('decisionRoom.source.corpsBriefings'),
      actionLabel: t('decisionRoom.action.inspectCorps'),
    };
  }
  if (target.kind === 'counter-offer') {
    return {
      id: 'counter-offer-docket',
      label: t('decisionRoom.source.counterOfferDocket'),
      actionLabel: t('decisionRoom.action.reviewCounter'),
    };
  }
  if (target.kind === 'inbox') {
    return {
      id: 'presidential-inbox',
      label: 'Presidential Inbox',
      actionLabel: 'Open Desk',
    };
  }
  if (target.kind === 'chronicle') {
    return {
      id: 'chronicle',
      label: t('decisionRoom.source.chronicle'),
      actionLabel: t('decisionRoom.action.openChronicle'),
    };
  }
  return null;
}

function sourceHandoffSummary(count: number, urgentCount: number): string {
  const itemLabel = t(count === 1 ? 'decisionRoom.noun.item.one' : 'decisionRoom.noun.item.many');
  return urgentCount > 0
    ? t('decisionRoom.summary.withUrgent', { count, noun: itemLabel, urgentCount })
    : t('decisionRoom.summary.countOnly', { count, noun: itemLabel });
}

export function buildPresidentialDecisionRoomSourceHandoffs(
  cards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomSourceHandoff[] {
  const groups = new Map<string, SourceHandoffAccumulator>();

  for (const card of cards) {
    const descriptor = describeSourceHandoffTarget(card.navigationTarget);
    if (!descriptor) continue;

    const existing = groups.get(descriptor.id);
    if (existing) {
      existing.cards.push(card);
      continue;
    }

    groups.set(descriptor.id, {
      ...descriptor,
      navigationTarget: card.navigationTarget,
      topSortKey: card.sortKey,
      cards: [card],
    });
  }

  return [...groups.values()]
    .sort((a, b) => {
      if (a.topSortKey !== b.topSortKey) return a.topSortKey - b.topSortKey;
      return strictCompare(a.id, b.id);
    })
    .map((group) => {
      const urgentCount = group.cards.filter(isUrgentCard).length;
      return {
        id: group.id,
        label: group.label,
        summary: sourceHandoffSummary(group.cards.length, urgentCount),
        count: group.cards.length,
        urgentCount,
        cardIds: group.cards.map((card) => card.id),
        actionLabel: group.actionLabel,
        navigationTarget: group.navigationTarget,
      };
    });
}

function buildLens(
  id: PresidentialDecisionRoomLensId,
  label: string,
  cards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomLens {
  const topCard = cards[0] ?? null;
  return {
    id,
    label,
    count: cards.length,
    urgentCount: cards.filter(isUrgentCard).length,
    topCardId: topCard?.id ?? null,
    actionLabel: topCard?.actionLabel ?? t('decisionRoom.action.review'),
    navigationTarget: topCard?.navigationTarget ?? { kind: 'none' },
  };
}

function buildLenses(cards: PresidentialDecisionRoomCard[]): PresidentialDecisionRoomLens[] {
  if (cards.length === 0) return [];
  const lenses: PresidentialDecisionRoomLens[] = [buildLens('all', t('decisionRoom.panel.lens.all'), cards)];
  for (const category of CATEGORY_ORDER) {
    const categoryCards = cards.filter((card) => card.category === category);
    if (categoryCards.length === 0) continue;
    lenses.push(buildLens(category, t(CATEGORY_LABEL_KEY[category]), categoryCards));
  }
  return lenses;
}

function localizedNoun(nounKey: MessageKey, count: number): string {
  return t(nounKey, { count });
}

function summaryCount(totalCount: number, urgentCount: number, nounKey: MessageKey): string {
  const noun = localizedNoun(nounKey, totalCount);
  if (urgentCount > 0 && totalCount > 0) {
    return t('decisionRoom.summary.withUrgent', { count: totalCount, noun, urgentCount });
  }
  return t('decisionRoom.summary.countOnly', { count: totalCount, noun });
}

function buildCommandQuestion(
  id: PresidentialDecisionRoomCommandQuestionId,
  label: string,
  cards: PresidentialDecisionRoomCard[],
  options: {
    fallbackHeadline: string;
    fallbackSummary: string;
    fallbackActionLabel?: string;
    limit?: number;
    headlineOverride?: string;
    nounKey?: MessageKey;
  },
): PresidentialDecisionRoomCommandQuestion {
  const visibleCards = cards.slice(0, options.limit ?? 3);
  const topCard = visibleCards[0] ?? null;
  const urgentCount = cards.filter(isUrgentCard).length;
  return {
    id,
    label,
    headline: options.headlineOverride ?? topCard?.title ?? options.fallbackHeadline,
    summary: cards.length > 0
      ? summaryCount(cards.length, urgentCount, options.nounKey ?? 'decisionRoom.noun.item.many')
      : options.fallbackSummary,
    count: cards.length,
    urgentCount,
    cardIds: visibleCards.map((card) => card.id),
    actionLabel: topCard?.actionLabel ?? options.fallbackActionLabel ?? t('decisionRoom.action.review'),
    navigationTarget: topCard?.navigationTarget ?? { kind: 'none' },
  };
}

function dedupeCommandQuestionHeadlines(
  questions: PresidentialDecisionRoomCommandQuestion[],
): PresidentialDecisionRoomCommandQuestion[] {
  const seenHeadlines = new Set<string>();
  return questions.map((question) => {
    if (!seenHeadlines.has(question.headline)) {
      seenHeadlines.add(question.headline);
      return question;
    }
    const headline = t('decisionRoom.duplicateHeadline', { label: question.label, headline: question.headline });
    seenHeadlines.add(headline);
    return { ...question, headline };
  });
}

function buildCommandQuestions(
  cards: PresidentialDecisionRoomCard[],
  inspectNext: PresidentialDecisionRoomCard[],
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness,
): PresidentialDecisionRoomCommandQuestion[] {
  const urgentCards = cards.filter(isUrgentCard);
  const pendingCards = cards.filter((card) => card.category === 'decision' || card.category === 'counter_offer' || card.category === 'opportunity');
  const frontCards = cards.filter((card) => card.category === 'operational' || card.category === 'briefing');

  return dedupeCommandQuestionHeadlines([
    buildCommandQuestion('urgent', t('decisionRoom.command.urgent'), urgentCards, {
      fallbackHeadline: t('decisionRoom.command.noUrgentDeskItem'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.urgent'),
      nounKey: 'decisionRoom.noun.urgent',
    }),
    buildCommandQuestion('pending', t('decisionRoom.command.decisions'), pendingCards, {
      fallbackHeadline: t('decisionRoom.command.noPendingDecision'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.decision.many'),
      nounKey: 'decisionRoom.noun.decision.many',
    }),
    buildCommandQuestion('fronts', t('decisionRoom.command.fronts'), frontCards, {
      fallbackHeadline: t('decisionRoom.command.noFrontAlarm'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.frontCue.many'),
      nounKey: 'decisionRoom.noun.frontCue.many',
    }),
    buildCommandQuestion('inspect', t('decisionRoom.command.inspect'), inspectNext, {
      fallbackHeadline: t('decisionRoom.command.noInspectionHandoff'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.handoff.many'),
      fallbackActionLabel: t('decisionRoom.action.inspect'),
      limit: 5,
      nounKey: 'decisionRoom.noun.handoff.many',
    }),
    buildCommandQuestion('advance', t('decisionRoom.command.advance'), advanceReadiness.items, {
      fallbackHeadline: advanceReadiness.headline,
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.advanceItem.many'),
      fallbackActionLabel: t('decisionRoom.action.reviewAdvance'),
      limit: 4,
      headlineOverride: advanceReadiness.headline,
      nounKey: 'decisionRoom.noun.advanceItem.many',
    }),
  ]);
}

function firstNavigableCard(
  cards: PresidentialDecisionRoomCard[],
  excludedCardIds: Set<string>,
): PresidentialDecisionRoomCard | null {
  return cards.find((card) => card.navigationTarget.kind !== 'none' && !excludedCardIds.has(card.id)) ?? null;
}

function buildNextOrders(
  cards: PresidentialDecisionRoomCard[],
  inspectNext: PresidentialDecisionRoomCard[],
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness,
): PresidentialDecisionRoomNextOrder[] {
  const selectedIds = new Set<string>();
  const decisionCards = cards.filter((card) =>
    card.category === 'decision'
    || card.category === 'counter_offer'
    || card.category === 'opportunity'
    || card.directive != null
    || isUrgentCard(card),
  );
  const actCard = firstNavigableCard(decisionCards, selectedIds) ?? firstNavigableCard(cards, selectedIds);
  if (actCard) selectedIds.add(actCard.id);

  const inspectCards = [
    ...inspectNext,
    ...cards.filter((card) =>
      card.category === 'operational'
      || card.category === 'briefing'
      || card.category === 'command'
      || card.category === 'cost'
      || card.category === 'turn',
    ),
  ];
  const inspectCard = firstNavigableCard(inspectCards, selectedIds);
  if (inspectCard) selectedIds.add(inspectCard.id);

  const monitorCard = firstNavigableCard(advanceReadiness.items, selectedIds)
    ?? firstNavigableCard(cards.filter((card) => card.category === 'turn' || card.category === 'cost' || card.category === 'memory'), selectedIds);

  const orders: PresidentialDecisionRoomNextOrder[] = [];
  if (actCard) {
    orders.push({
      id: `act:${actCard.id}`,
      role: 'act',
      label: t('decisionRoom.nextOrders.act'),
      headline: actCard.title,
      instruction: t('decisionRoom.nextOrders.actInstruction'),
      cardId: actCard.id,
      urgent: isUrgentCard(actCard),
      actionLabel: actCard.actionLabel,
      navigationTarget: actCard.navigationTarget,
    });
  }
  if (inspectCard) {
    orders.push({
      id: `inspect:${inspectCard.id}`,
      role: 'inspect',
      label: t('decisionRoom.nextOrders.inspect'),
      headline: inspectCard.title,
      instruction: t('decisionRoom.nextOrders.inspectInstruction'),
      cardId: inspectCard.id,
      urgent: isUrgentCard(inspectCard),
      actionLabel: inspectCard.actionLabel,
      navigationTarget: inspectCard.navigationTarget,
    });
  }
  orders.push({
    id: monitorCard ? `monitor:${monitorCard.id}` : 'monitor:advance-readiness',
    role: 'monitor',
    label: t('decisionRoom.nextOrders.monitor'),
    headline: advanceReadiness.headline,
    instruction: t('decisionRoom.nextOrders.monitorInstruction'),
    cardId: monitorCard?.id ?? null,
    urgent: advanceReadiness.blockedByExistingSystems || (monitorCard ? isUrgentCard(monitorCard) : false),
    actionLabel: monitorCard?.actionLabel ?? t('decisionRoom.action.reviewAdvance'),
    navigationTarget: monitorCard?.navigationTarget ?? { kind: 'none' },
  });

  return orders;
}

function loopStepSummary(count: number, urgentCount: number, nounKey: MessageKey): string {
  return summaryCount(count, urgentCount, nounKey);
}

function buildCardLoopStep(
  id: PresidentialDecisionRoomLoopStepId,
  label: string,
  cards: PresidentialDecisionRoomCard[],
  options: {
    fallbackHeadline: string;
    fallbackSummary: string;
    fallbackActionLabel: string;
    fallbackNavigationTarget?: PresidentialDecisionRoomNavigationTarget;
    nounKey?: MessageKey;
  },
): PresidentialDecisionRoomLoopStep {
  const topCard = cards[0] ?? null;
  const urgentCount = cards.filter(isUrgentCard).length;
  return {
    id,
    label,
    headline: topCard?.title ?? options.fallbackHeadline,
    summary: cards.length > 0
      ? loopStepSummary(cards.length, urgentCount, options.nounKey ?? 'decisionRoom.noun.item.many')
      : options.fallbackSummary,
    count: cards.length,
    urgentCount,
    cardIds: cards.map((card) => card.id),
    actionLabel: topCard?.actionLabel ?? options.fallbackActionLabel,
    navigationTarget: topCard?.navigationTarget ?? options.fallbackNavigationTarget ?? { kind: 'none' },
  };
}

function buildReportLoopStep(
  state: LoadedGameState,
  turnCards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomLoopStep {
  const recordCount = state.turnSummaries?.length ?? 0;
  const latestTurn = state.latestTurnSummary?.turn ?? null;
  const urgentCount = turnCards.filter(isUrgentCard).length;
  return {
    id: 'report',
    label: t('decisionRoom.loop.report'),
    headline: turnCards[0]?.title ?? (latestTurn != null ? t('decisionRoom.loop.latestTurnRecord', { turn: latestTurn }) : t('decisionRoom.loop.noTurnRecordsYet')),
    summary: recordCount > 0
      ? summaryCount(recordCount, urgentCount, 'decisionRoom.noun.recordedTurn.many')
      : summaryCount(0, 0, 'decisionRoom.noun.record.many'),
    count: recordCount,
    urgentCount,
    cardIds: turnCards.map((card) => card.id),
    actionLabel: t('decisionRoom.action.turnRecords'),
    navigationTarget: recordCount > 0 ? { kind: 'army-hq-records', recordsSubTab: 'aftermath' } : { kind: 'none' },
  };
}

function buildCostLoopStep(
  state: LoadedGameState,
  costCards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomLoopStep {
  const recordCount = state.turnSummaries?.length ?? 0;
  const cardStep = buildCardLoopStep('cost', t('decisionRoom.loop.cost'), costCards, {
    fallbackHeadline: recordCount > 0 ? t('decisionRoom.loop.campaignCostArchiveAvailable') : t('decisionRoom.loop.noCampaignCostYet'),
    fallbackSummary: recordCount > 0 ? summaryCount(recordCount, 0, 'decisionRoom.noun.recordedTurn.many') : summaryCount(0, 0, 'decisionRoom.noun.costRecord.many'),
    fallbackActionLabel: t('decisionRoom.action.turnRecords'),
    fallbackNavigationTarget: recordCount > 0 ? { kind: 'army-hq-records', recordsSubTab: 'aftermath' } : { kind: 'none' },
    nounKey: 'decisionRoom.noun.costItem.many',
  });
  if (costCards.length > 0) return cardStep;
  return {
    ...cardStep,
    count: recordCount,
  };
}

function buildJudgeLoopStep(
  state: LoadedGameState,
  memoryCards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomLoopStep {
  const recordCount = state.turnSummaries?.length ?? 0;
  const cardStep = buildCardLoopStep('judge', t('decisionRoom.loop.judge'), memoryCards, {
    fallbackHeadline: recordCount > 0 ? t('decisionRoom.loop.chronicleMemoryAvailable') : t('decisionRoom.loop.noCampaignMemoryYet'),
    fallbackSummary: recordCount > 0 ? summaryCount(recordCount, 0, 'decisionRoom.noun.recordedTurn.many') : summaryCount(0, 0, 'decisionRoom.noun.memoryRecord.many'),
    fallbackActionLabel: t('decisionRoom.action.showChronicle'),
    fallbackNavigationTarget: recordCount > 0 ? { kind: 'chronicle' } : { kind: 'none' },
    nounKey: 'decisionRoom.noun.memoryItem.many',
  });
  if (memoryCards.length > 0) return cardStep;
  return {
    ...cardStep,
    count: recordCount,
  };
}

function buildNextLoopStep(cards: PresidentialDecisionRoomCard[]): PresidentialDecisionRoomLoopStep {
  const nextCards = cards.filter((card) =>
    card.category === 'decision' || card.category === 'counter_offer' || card.category === 'opportunity' || isUrgentCard(card),
  );
  return buildCardLoopStep('next', t('decisionRoom.loop.next'), nextCards.length > 0 ? nextCards : cards.slice(0, 1), {
    fallbackHeadline: t('decisionRoom.loop.returnToBriefing'),
    fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.nextAction.many'),
    fallbackActionLabel: t('decisionRoom.action.briefing'),
    fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    nounKey: 'decisionRoom.noun.nextItem.many',
  });
}

function buildLoopSteps(
  state: LoadedGameState,
  cards: PresidentialDecisionRoomCard[],
  inspectNext: PresidentialDecisionRoomCard[],
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness,
): PresidentialDecisionRoomLoopStep[] {
  const briefCards = cards.filter((card) => card.category === 'operational' || card.category === 'briefing');
  const decideCards = cards.filter((card) => card.category === 'decision' || card.category === 'counter_offer' || card.category === 'opportunity');
  const turnCards = cards.filter((card) => card.category === 'turn');
  const costCards = cards.filter((card) => card.category === 'cost');
  const memoryCards = cards.filter((card) => card.category === 'memory');

  return [
    buildCardLoopStep('brief', t('decisionRoom.loop.brief'), briefCards, {
      fallbackHeadline: t('decisionRoom.loop.openStrategicBriefing'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.briefCue.many'),
      fallbackActionLabel: t('decisionRoom.action.warSummary'),
      fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
      nounKey: 'decisionRoom.noun.briefCue.many',
    }),
    buildCardLoopStep('inspect', t('decisionRoom.loop.inspect'), inspectNext, {
      fallbackHeadline: t('decisionRoom.command.noInspectionHandoff'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.handoff.many'),
      fallbackActionLabel: t('decisionRoom.action.inspect'),
      nounKey: 'decisionRoom.noun.handoff.many',
    }),
    buildCardLoopStep('decide', t('decisionRoom.loop.decide'), decideCards, {
      fallbackHeadline: t('decisionRoom.command.noPendingDecision'),
      fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.decision.many'),
      fallbackActionLabel: t('decisionRoom.action.reviewQueue'),
      fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
      nounKey: 'decisionRoom.noun.decision.many',
    }),
    {
      ...buildCardLoopStep('execute', t('decisionRoom.loop.execute'), advanceReadiness.items, {
        fallbackHeadline: advanceReadiness.headline,
        fallbackSummary: summaryCount(0, 0, 'decisionRoom.noun.advanceItem.many'),
        fallbackActionLabel: t('decisionRoom.action.reviewAdvance'),
        fallbackNavigationTarget: { kind: 'none' },
        nounKey: 'decisionRoom.noun.advanceItem.many',
      }),
      headline: advanceReadiness.headline,
    },
    buildReportLoopStep(state, turnCards),
    buildCostLoopStep(state, costCards),
    buildJudgeLoopStep(state, memoryCards),
    buildNextLoopStep(cards),
  ];
}

function buildActiveDossier(
  cards: PresidentialDecisionRoomCard[],
  sourceHandoffs: PresidentialDecisionRoomSourceHandoff[],
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness,
  selectedCardId: string | null | undefined,
): PresidentialDecisionRoomDossier | null {
  const selectedCard = selectedCardId
    ? cards.find((card) => card.id === selectedCardId) ?? null
    : null;
  const card = selectedCard ?? cards[0] ?? null;
  if (!card) return null;

  const sourceHandoff = sourceHandoffs.find((handoff) => handoff.cardIds.includes(card.id)) ?? null;
  const relatedCardIds = sourceHandoff?.cardIds
    .filter((cardId) => cardId !== card.id)
    .slice(0, 4) ?? [];
  const advanceSensitive = advanceReadiness.items.some((item) => item.id === card.id);

  return {
    id: `dossier:${card.id}`,
    cardId: card.id,
    category: card.category,
    severity: card.severity,
    title: card.title,
    explanation: card.explanation,
    sourceOwner: card.sourceOwner,
    sourceLabel: card.sourceLabel,
    actionLabel: card.actionLabel,
    evidence: card.evidence,
    navigationTarget: card.navigationTarget,
    ...(card.directive ? { directive: card.directive } : {}),
    sourceHandoff,
    relatedCardIds,
    advanceSensitive,
    advanceLabel: t(
      advanceSensitive
        ? 'decisionRoom.advance.reviewBeforeAdvance'
        : 'decisionRoom.advance.notInAdvanceReview',
    ),
  };
}

export function buildPresidentialDecisionRoomView(input: PresidentialDecisionRoomInput): PresidentialDecisionRoomView {
  const state = input.state;
  const playerFaction = state?.player_faction ?? null;
  if (!state) {
    return {
      hasPlayerFaction: false,
      emptyState: t('decisionRoom.empty.noGameState'),
      cards: [],
      lenses: [],
      nextOrders: [],
      commandQuestions: [],
      loopSteps: [],
      sourceHandoffs: [],
      activeDossier: null,
      inspectNext: [],
      advanceReadiness: {
        headline: t('decisionRoom.advance.noStateLoaded'),
        blockedByExistingSystems: false,
        items: [],
      },
      metrics: {
        urgentCount: 0,
        pendingReviews: 0,
        opportunities: 0,
        hardTurns: 0,
        advanceReviewCount: 0,
      },
    };
  }
  if (!playerFaction) {
    return {
      hasPlayerFaction: false,
      emptyState: t('decisionRoom.empty.noPlayerFaction'),
      cards: [],
      lenses: [],
      nextOrders: [],
      commandQuestions: [],
      loopSteps: [],
      sourceHandoffs: [],
      activeDossier: null,
      inspectNext: [],
      advanceReadiness: {
        headline: t('decisionRoom.advance.noPlayerFaction'),
        blockedByExistingSystems: false,
        items: [],
      },
      metrics: {
        urgentCount: 0,
        pendingReviews: 0,
        opportunities: 0,
        hardTurns: 0,
        advanceReviewCount: 0,
      },
    };
  }

  const osidNameMap = input.osidNameMap ?? null;
  const candidates: CandidateCard[] = [];
  addReviewCard(state, candidates);
  addParamilitaryReviewCard(state, candidates);
  addManifestDecisionCards(state, candidates);
  addCounterOfferCards(state, candidates);
  addArmyCoPushbackCard(state, candidates);
  addOpportunityCards(state, candidates);
  addSitrepCards(state, candidates);
  addSupplyVisibilityCard(state, candidates);
  addBriefingCards(state, candidates);
  addCommandPersonnelCards(state, candidates);
  addRequestOpDirectiveCards(state, candidates);
  addForceLaunchDirectiveCards(state, candidates);
  addProactiveForceLaunchDirectiveCards(state, candidates);
  addHardTurnCards(state, osidNameMap, candidates);
  addCampaignCostCard(state, osidNameMap, candidates);
  addChronicleCard(state, candidates);

  const cards = finalizeCards(candidates);
  const advanceReadiness = buildAdvanceReadiness(state, cards);
  const lenses = buildLenses(cards);
  const inspectNext = cards.filter((card) => card.navigationTarget.kind !== 'none').slice(0, 5);
  const nextOrders = buildNextOrders(cards, inspectNext, advanceReadiness);
  const sourceHandoffs = buildPresidentialDecisionRoomSourceHandoffs(cards);
  const commandQuestions = buildCommandQuestions(cards, inspectNext, advanceReadiness);
  const loopSteps = buildLoopSteps(state, cards, inspectNext, advanceReadiness);
  const activeDossier = buildActiveDossier(cards, sourceHandoffs, advanceReadiness, input.selectedCardId);

  return {
    hasPlayerFaction: true,
    emptyState: cards.length === 0 ? 'No urgent command priorities.' : null,
    cards,
    lenses,
    nextOrders,
    commandQuestions,
    loopSteps,
    sourceHandoffs,
    activeDossier,
    inspectNext,
    advanceReadiness,
    metrics: {
      urgentCount: cards.filter((card) => card.severity === 'blocking' || card.severity === 'critical').length,
      pendingReviews: state.playerDecisionSummary?.totalCount ?? state.presidentialReviewQueue?.pendingCount ?? 0,
      opportunities: state.operationOpportunityProposals?.length ?? 0,
      hardTurns: cards.filter((card) => card.category === 'turn').length,
      advanceReviewCount: advanceReadiness.items.length,
    },
  };
}
