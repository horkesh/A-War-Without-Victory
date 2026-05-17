import type { ArmyHQRecordsSubTab, ArmyHQTab } from '../../shared/shellHandoff';
import type { CommandBriefingItemView, LoadedGameState } from './types';
import {
  buildTurnAftermathCampaignCost,
  buildTurnAftermathRecordViews,
  type TurnAftermathCostSeverity,
  type TurnAftermathView,
} from './turnAftermath';

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

const CATEGORY_LABEL: Record<PresidentialDecisionRoomCategory, string> = {
  decision: 'Decision',
  counter_offer: 'Counter',
  opportunity: 'Opportunity',
  operational: 'SITREP',
  briefing: 'Briefing',
  turn: 'Turn',
  cost: 'Cost',
  memory: 'Memory',
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
      actionLabel: 'Inspect Corps',
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: item.target.corpsId },
    };
  }
  if (item.target.type === 'operation') {
    const corpsId = item.target.operationKey?.split('|')[0] ?? item.corpsId ?? null;
    return {
      actionLabel: 'Inspect Corps',
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId },
    };
  }
  if (item.target.type === 'sector' && item.corpsId) {
    return {
      actionLabel: 'Inspect Corps',
      navigationTarget: { kind: 'army-hq-corps-briefing', corpsId: item.corpsId },
    };
  }
  if (item.target.type === 'summary') {
    return {
      actionLabel: 'War Summary',
      navigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
    };
  }
  if (item.target.type === 'officer_events') {
    return {
      actionLabel: 'Personnel',
      navigationTarget: { kind: 'army-hq-tab', tab: 'personnel' },
    };
  }
  return {
    actionLabel: item.actionLabel ?? 'Review Briefing',
    navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
  };
}

function addReviewCard(state: LoadedGameState, cards: CandidateCard[]): void {
  const queue = state.presidentialReviewQueue;
  if (!queue || queue.pendingCount <= 0) return;

  const evidence: string[] = [`${queue.pendingCount} pending`];
  if (queue.eventDecisionCount > 0) evidence.push(`${queue.eventDecisionCount} event ${pluralize(queue.eventDecisionCount, 'decision')}`);
  if (queue.commandInterpretationCount > 0) evidence.push(`${queue.commandInterpretationCount} command ${pluralize(queue.commandInterpretationCount, 'reaction')}`);
  if (queue.personnelDirectiveCount > 0) evidence.push(`${queue.personnelDirectiveCount} personnel`);
  if (queue.operationOpportunityCount > 0) evidence.push(`${queue.operationOpportunityCount} op ${pluralize(queue.operationOpportunityCount, 'dossier')}`);

  cards.push({
    id: 'review:pending',
    category: 'decision',
    severity: toDecisionSeverity(state),
    title: 'Presidential reviews pending',
    explanation: queue.eventDecisionCount > 0
      ? 'A decision queue item needs your response before the next turn can proceed.'
      : 'Army HQ has unresolved command review work on the desk.',
    sourceOwner: 'Presidential review queue',
    sourceLabel: 'Army HQ Briefing',
    actionLabel: 'Review Queue',
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
    title: 'Paramilitary authorization pending',
    explanation: 'Paramilitary deployment requests require an explicit presidential decision before the turn should advance.',
    sourceOwner: 'Presidential Inbox',
    sourceLabel: 'Paramilitary review',
    actionLabel: 'Open Inbox',
    evidence: [
      `${requests.length} deployment ${pluralize(requests.length, 'request')}`,
      `estimated strength ${totalStrength}`,
      'war crimes risk',
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
    title: string;
    explanation: string;
    sourceLabel: string;
    actionLabel: string;
  }> = {
    peace_plan: {
      title: 'Peace plan response pending',
      explanation: 'A formal peace proposal still needs presidential review before the turn advances.',
      sourceLabel: 'Peace proposal',
      actionLabel: 'Open Inbox',
    },
    dayton_negotiation: {
      title: 'Dayton negotiation pending',
      explanation: 'The Dayton negotiation package requires a submitted presidential position.',
      sourceLabel: 'Dayton talks',
      actionLabel: 'Open Inbox',
    },
    convoy_decision: {
      title: 'Humanitarian convoy decision pending',
      explanation: 'A convoy request still needs an allow, block, or divert decision on the owning surface.',
      sourceLabel: 'Convoy review',
      actionLabel: 'Open Inbox',
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
      title: spec.title,
      explanation: spec.explanation,
      sourceOwner: 'Presidential decision manifest',
      sourceLabel: spec.sourceLabel,
      actionLabel: spec.actionLabel,
      evidence: [`${blockingCount} pending ${pluralize(blockingCount, 'item')}`],
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
      offer.sourceCitation ? `Source ${offer.sourceCitation}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    cards.push({
      id: `counter-offer:${offer.id}`,
      category: 'counter_offer',
      severity: 'blocking',
      title: `Counter-offer from ${offer.author}`,
      explanation: `${offer.planName} has a cited counter-proposal that needs presidential review before the docket is clean.`,
      sourceOwner: 'Negotiation counter-offer docket',
      sourceLabel: offer.planName,
      actionLabel: 'Review Counter',
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
      ? `${opportunity.required_axes_green ?? 0}/${opportunity.required_axes_total} required axes`
      : null;
    const optional = opportunity.optional_axes_total != null
      ? `${opportunity.optional_axes_green ?? 0}/${opportunity.optional_axes_total} optional axes`
      : null;
    const evidence = [
      opportunity.expires_turn != null ? `Expires T${opportunity.expires_turn}` : 'Live dossier',
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
      explanation: opportunity.recommendation ?? opportunity.description ?? 'An operation opportunity dossier is ready for presidential review.',
      sourceOwner: 'Operation opportunity dossiers',
      sourceLabel: 'Army HQ Opportunity',
      actionLabel: 'Review Dossier',
      evidence,
      navigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
      urgencySort: expires,
      sourceSort: opportunity.proposal_id,
    });
  }
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
      title: 'Operational SITREP',
      explanation: alert.text,
      sourceOwner: 'Operational SITREP',
      sourceLabel: 'War Summary',
      actionLabel: 'War Summary',
      evidence: [
        `${state.operationalSitrep?.front.exposedCount ?? 0} exposed fronts`,
        `${state.operationalSitrep?.sustainment.criticalCount ?? 0} critical sustainment`,
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
      sourceOwner: 'Command briefing',
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
      title: `Hard turn: ${record.dateLabel}`,
      explanation: record.cost.reasons.slice(0, 3).join(' / '),
      sourceOwner: 'Turn Aftermath records',
      sourceLabel: `Turn ${record.turn}`,
      actionLabel: 'Open Turn Record',
      evidence: [
        `Net ${formatSigned(record.territory.friendlyNet)}`,
        `${record.cost.friendlyMilitaryCasualties} casualties`,
        `${record.cost.displacedThisTurn} displaced`,
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
    sourceOwner: 'Active campaign cost',
    sourceLabel: 'Turn Aftermath archive',
    actionLabel: 'Turn Records',
    evidence: [
      `${campaignCost.recordCount} turns`,
      `${campaignCost.totalFriendlyMilitaryCasualties} casualties`,
      `${campaignCost.totalDisplaced} displaced`,
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
    title: 'Chronicle memory updated',
    explanation: 'Review campaign memory and cost markers from the archive.',
    sourceOwner: 'Chronicle',
    sourceLabel: 'Campaign memory',
    actionLabel: 'Show Chronicle',
    evidence: [`${turnCount} recorded ${pluralize(turnCount, 'turn')}`],
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
    headline: items.length > 0 || blockedByExistingSystems ? 'Review before advance' : 'Clear to advance',
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
  if (tab === 'briefing') return 'Army HQ Briefing';
  if (tab === 'summary') return 'Army HQ Summary';
  if (tab === 'records') return 'Army HQ Records';
  return 'Army HQ Personnel';
}

function armyHqRecordsLabel(recordsSubTab: ArmyHQRecordsSubTab): string {
  if (recordsSubTab === 'aftermath') return 'Army HQ Records';
  if (recordsSubTab === 'aar') return 'Army HQ AAR Records';
  if (recordsSubTab === 'ops') return 'Army HQ Operations Records';
  return 'Army HQ Opportunity Records';
}

function describeSourceHandoffTarget(
  target: PresidentialDecisionRoomNavigationTarget,
): SourceHandoffDescriptor | null {
  if (target.kind === 'army-hq-tab') {
    return {
      id: `army-hq-${target.tab}`,
      label: armyHqTabLabel(target.tab),
      actionLabel: `Open ${target.tab === 'briefing' ? 'Briefing' : target.tab === 'summary' ? 'Summary' : target.tab === 'records' ? 'Records' : 'Personnel'}`,
    };
  }
  if (target.kind === 'army-hq-records') {
    return {
      id: `army-hq-records-${target.recordsSubTab}`,
      label: armyHqRecordsLabel(target.recordsSubTab),
      actionLabel: 'Open Records',
    };
  }
  if (target.kind === 'army-hq-aftermath-record') {
    return {
      id: 'turn-aftermath-records',
      label: 'Turn Aftermath Records',
      actionLabel: 'Open Turn Record',
    };
  }
  if (target.kind === 'army-hq-corps-briefing') {
    return {
      id: 'army-hq-corps-briefings',
      label: 'Corps Briefings',
      actionLabel: 'Inspect Corps',
    };
  }
  if (target.kind === 'counter-offer') {
    return {
      id: 'counter-offer-docket',
      label: 'Counter-offer docket',
      actionLabel: 'Review Counter',
    };
  }
  if (target.kind === 'chronicle') {
    return {
      id: 'chronicle',
      label: 'Chronicle',
      actionLabel: 'Open Chronicle',
    };
  }
  return null;
}

function sourceHandoffSummary(count: number, urgentCount: number): string {
  const itemText = `${count} ${pluralize(count, 'item')}`;
  return urgentCount > 0 ? `${itemText} / ${urgentCount} urgent` : itemText;
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
    actionLabel: topCard?.actionLabel ?? 'Review',
    navigationTarget: topCard?.navigationTarget ?? { kind: 'none' },
  };
}

function buildLenses(cards: PresidentialDecisionRoomCard[]): PresidentialDecisionRoomLens[] {
  if (cards.length === 0) return [];
  const lenses: PresidentialDecisionRoomLens[] = [buildLens('all', 'All', cards)];
  for (const category of CATEGORY_ORDER) {
    const categoryCards = cards.filter((card) => card.category === category);
    if (categoryCards.length === 0) continue;
    lenses.push(buildLens(category, CATEGORY_LABEL[category], categoryCards));
  }
  return lenses;
}

function questionSummary(totalCount: number, urgentCount: number, noun: string): string {
  if (totalCount === 0) return `0 ${noun}`;
  if (urgentCount > 0) return `${totalCount} ${noun} / ${urgentCount} urgent`;
  return `${totalCount} ${noun}`;
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
    noun?: string;
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
      ? questionSummary(cards.length, urgentCount, options.noun ?? 'items')
      : options.fallbackSummary,
    count: cards.length,
    urgentCount,
    cardIds: visibleCards.map((card) => card.id),
    actionLabel: topCard?.actionLabel ?? options.fallbackActionLabel ?? 'Review',
    navigationTarget: topCard?.navigationTarget ?? { kind: 'none' },
  };
}

function buildCommandQuestions(
  cards: PresidentialDecisionRoomCard[],
  inspectNext: PresidentialDecisionRoomCard[],
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness,
): PresidentialDecisionRoomCommandQuestion[] {
  const urgentCards = cards.filter(isUrgentCard);
  const pendingCards = cards.filter((card) => card.category === 'decision' || card.category === 'counter_offer' || card.category === 'opportunity');
  const frontCards = cards.filter((card) => card.category === 'operational' || card.category === 'briefing');

  return [
    buildCommandQuestion('urgent', 'Urgent', urgentCards, {
      fallbackHeadline: 'No urgent desk item',
      fallbackSummary: '0 urgent',
      noun: 'urgent',
    }),
    buildCommandQuestion('pending', 'Decisions', pendingCards, {
      fallbackHeadline: 'No pending decision',
      fallbackSummary: '0 decisions',
      noun: 'decisions',
    }),
    buildCommandQuestion('fronts', 'Fronts', frontCards, {
      fallbackHeadline: 'No front alarm',
      fallbackSummary: '0 front cues',
      noun: 'front cues',
    }),
    buildCommandQuestion('inspect', 'Inspect', inspectNext, {
      fallbackHeadline: 'No inspection handoff',
      fallbackSummary: '0 handoffs',
      fallbackActionLabel: 'Inspect',
      limit: 5,
      noun: 'handoffs',
    }),
    buildCommandQuestion('advance', 'Advance', advanceReadiness.items, {
      fallbackHeadline: advanceReadiness.headline,
      fallbackSummary: '0 advance items',
      fallbackActionLabel: 'Review Advance',
      limit: 4,
      headlineOverride: advanceReadiness.headline,
      noun: 'advance items',
    }),
  ];
}

function loopStepSummary(count: number, urgentCount: number, noun: string): string {
  if (count === 0) return `0 ${noun}`;
  if (urgentCount > 0) return `${count} ${noun} / ${urgentCount} urgent`;
  return `${count} ${noun}`;
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
    noun?: string;
  },
): PresidentialDecisionRoomLoopStep {
  const topCard = cards[0] ?? null;
  const urgentCount = cards.filter(isUrgentCard).length;
  return {
    id,
    label,
    headline: topCard?.title ?? options.fallbackHeadline,
    summary: cards.length > 0
      ? loopStepSummary(cards.length, urgentCount, options.noun ?? 'items')
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
    label: 'Report',
    headline: turnCards[0]?.title ?? (latestTurn != null ? `Latest turn record: T${latestTurn}` : 'No turn records yet'),
    summary: recordCount > 0
      ? `${recordCount} recorded ${pluralize(recordCount, 'turn')}${urgentCount > 0 ? ` / ${urgentCount} urgent` : ''}`
      : '0 records',
    count: recordCount,
    urgentCount,
    cardIds: turnCards.map((card) => card.id),
    actionLabel: 'Turn Records',
    navigationTarget: recordCount > 0 ? { kind: 'army-hq-records', recordsSubTab: 'aftermath' } : { kind: 'none' },
  };
}

function buildCostLoopStep(
  state: LoadedGameState,
  costCards: PresidentialDecisionRoomCard[],
): PresidentialDecisionRoomLoopStep {
  const recordCount = state.turnSummaries?.length ?? 0;
  const cardStep = buildCardLoopStep('cost', 'Cost', costCards, {
    fallbackHeadline: recordCount > 0 ? 'Campaign cost archive available' : 'No campaign cost yet',
    fallbackSummary: recordCount > 0 ? `${recordCount} recorded ${pluralize(recordCount, 'turn')}` : '0 cost records',
    fallbackActionLabel: 'Turn Records',
    fallbackNavigationTarget: recordCount > 0 ? { kind: 'army-hq-records', recordsSubTab: 'aftermath' } : { kind: 'none' },
    noun: 'cost items',
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
  const cardStep = buildCardLoopStep('judge', 'Judge', memoryCards, {
    fallbackHeadline: recordCount > 0 ? 'Chronicle memory available' : 'No campaign memory yet',
    fallbackSummary: recordCount > 0 ? `${recordCount} recorded ${pluralize(recordCount, 'turn')}` : '0 memory records',
    fallbackActionLabel: 'Show Chronicle',
    fallbackNavigationTarget: recordCount > 0 ? { kind: 'chronicle' } : { kind: 'none' },
    noun: 'memory items',
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
  return buildCardLoopStep('next', 'Next', nextCards.length > 0 ? nextCards : cards.slice(0, 1), {
    fallbackHeadline: 'Return to the briefing',
    fallbackSummary: '0 next actions',
    fallbackActionLabel: 'Briefing',
    fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
    noun: 'next items',
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
    buildCardLoopStep('brief', 'Brief', briefCards, {
      fallbackHeadline: 'Open strategic briefing',
      fallbackSummary: '0 brief cues',
      fallbackActionLabel: 'War Summary',
      fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'summary' },
      noun: 'brief cues',
    }),
    buildCardLoopStep('inspect', 'Inspect', inspectNext, {
      fallbackHeadline: 'No inspection handoff',
      fallbackSummary: '0 handoffs',
      fallbackActionLabel: 'Inspect',
      noun: 'handoffs',
    }),
    buildCardLoopStep('decide', 'Decide', decideCards, {
      fallbackHeadline: 'No pending decision',
      fallbackSummary: '0 decisions',
      fallbackActionLabel: 'Review Queue',
      fallbackNavigationTarget: { kind: 'army-hq-tab', tab: 'briefing' },
      noun: 'decisions',
    }),
    {
      ...buildCardLoopStep('execute', 'Execute', advanceReadiness.items, {
        fallbackHeadline: advanceReadiness.headline,
        fallbackSummary: '0 advance items',
        fallbackActionLabel: 'Review Advance',
        fallbackNavigationTarget: { kind: 'none' },
        noun: 'advance items',
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
    advanceLabel: advanceSensitive ? 'Review before advance' : 'Not in advance review',
  };
}

export function buildPresidentialDecisionRoomView(input: PresidentialDecisionRoomInput): PresidentialDecisionRoomView {
  const state = input.state;
  const playerFaction = state?.player_faction ?? null;
  if (!state) {
    return {
      hasPlayerFaction: false,
      emptyState: 'No game state loaded.',
      cards: [],
      lenses: [],
      commandQuestions: [],
      loopSteps: [],
      sourceHandoffs: [],
      activeDossier: null,
      inspectNext: [],
      advanceReadiness: {
        headline: 'No state loaded',
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
      emptyState: 'No player faction loaded.',
      cards: [],
      lenses: [],
      commandQuestions: [],
      loopSteps: [],
      sourceHandoffs: [],
      activeDossier: null,
      inspectNext: [],
      advanceReadiness: {
        headline: 'No player faction loaded',
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
  addOpportunityCards(state, candidates);
  addSitrepCards(state, candidates);
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
