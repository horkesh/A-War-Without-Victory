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

export type PresidentialDecisionRoomCategory =
  | 'decision'
  | 'counter_offer'
  | 'opportunity'
  | 'operational'
  | 'briefing'
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

type CandidateCard = Omit<PresidentialDecisionRoomCard, 'sortKey'> & {
  urgencySort: number;
  sourceSort: string;
};

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
  turn: 5,
  cost: 6,
  memory: 7,
};

const CATEGORY_LABEL_KEY: Record<PresidentialDecisionRoomCategory, MessageKey> = {
  decision: 'decisionRoom.category.decision',
  counter_offer: 'decisionRoom.category.counterOffer',
  opportunity: 'decisionRoom.category.opportunity',
  operational: 'decisionRoom.category.operational',
  briefing: 'decisionRoom.category.briefing',
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
    sourceLabel: t('decisionRoom.source.armyHqBriefing'),
    actionLabel: t('decisionRoom.action.reviewQueue'),
    evidence,
    navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    urgencySort: queue.eventDecisionCount > 0 ? 0 : 10,
    sourceSort: 'review',
  });
}

function addParamilitaryReviewCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const requests = state.pendingParamilitaryRequests ?? [];
  if (requests.length === 0) return;

  const totalStrength = requests.reduce((sum, request) => sum + request.strength, 0);
  cards.push({
    id: 'paramilitary:pending',
    category: 'decision',
    severity: 'blocking',
    title: t('decisionRoom.card.paramilitary.title'),
    explanation: t('decisionRoom.card.paramilitary.explanation'),
    sourceOwner: t('decisionRoom.card.paramilitary.sourceOwner'),
    sourceLabel: t('decisionRoom.card.paramilitary.sourceLabel'),
    actionLabel: t('decisionRoom.action.openInbox'),
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
    const spec = cardSpecs[family.id];
    if (!spec) continue;
    const id = `manifest:${family.id}`;
    if (existingIds.has(id)) continue;
    cards.push({
      id,
      category: 'decision',
      severity: 'blocking',
      title: t(spec.titleKey),
      explanation: t(spec.explanationKey),
      sourceOwner: t('decisionRoom.card.manifest.sourceOwner'),
      sourceLabel: t(spec.sourceLabelKey),
      actionLabel: t(spec.actionLabelKey),
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
      urgencySort: 0,
      sourceSort: `${item.title}:${item.id}`,
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
  addHardTurnCards(state, osidNameMap, candidates);
  addCampaignCostCard(state, osidNameMap, candidates);
  addChronicleCard(state, candidates);

  const cards = finalizeCards(candidates);
  const advanceReadiness = buildAdvanceReadiness(state, cards);
  const lenses = buildLenses(cards);
  const inspectNext = cards.filter((card) => card.navigationTarget.kind !== 'none').slice(0, 5);
  const sourceHandoffs = buildPresidentialDecisionRoomSourceHandoffs(cards);
  const commandQuestions = buildCommandQuestions(cards, inspectNext, advanceReadiness);
  const loopSteps = buildLoopSteps(state, cards, inspectNext, advanceReadiness);
  const activeDossier = buildActiveDossier(cards, sourceHandoffs, advanceReadiness, input.selectedCardId);

  return {
    hasPlayerFaction: true,
    emptyState: cards.length === 0 ? 'No urgent command priorities.' : null,
    cards,
    lenses,
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
