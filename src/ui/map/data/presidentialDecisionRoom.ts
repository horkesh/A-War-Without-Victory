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
  | { kind: 'army-hq-corps-briefing'; corpsId: string | null }
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

export interface PresidentialDecisionRoomView {
  hasPlayerFaction: boolean;
  emptyState: string | null;
  cards: PresidentialDecisionRoomCard[];
  inspectNext: PresidentialDecisionRoomCard[];
  advanceReadiness: PresidentialDecisionRoomAdvanceReadiness;
  metrics: PresidentialDecisionRoomMetrics;
}

export interface PresidentialDecisionRoomInput {
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
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
  opportunity: 1,
  operational: 2,
  briefing: 3,
  turn: 4,
  cost: 5,
  memory: 6,
};

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
  const items = cards
    .filter((card) =>
      (card.category === 'decision'
        || card.category === 'opportunity'
        || card.category === 'operational'
        || card.category === 'turn')
      && card.severity !== 'info',
    )
    .slice(0, 4);

  return {
    headline: items.length > 0 ? 'Review before advance' : 'Clear to advance',
    blockedByExistingSystems: (state.presidentialReviewQueue?.eventDecisionCount ?? 0) > 0
      || (state.pendingEventDecisions?.length ?? 0) > 0,
    items,
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
  addOpportunityCards(state, candidates);
  addSitrepCards(state, candidates);
  addBriefingCards(state, candidates);
  addHardTurnCards(state, osidNameMap, candidates);
  addCampaignCostCard(state, osidNameMap, candidates);
  addChronicleCard(state, candidates);

  const cards = finalizeCards(candidates);
  const advanceReadiness = buildAdvanceReadiness(state, cards);

  return {
    hasPlayerFaction: true,
    emptyState: cards.length === 0 ? 'No urgent command priorities.' : null,
    cards,
    inspectNext: cards.filter((card) => card.navigationTarget.kind !== 'none').slice(0, 5),
    advanceReadiness,
    metrics: {
      urgentCount: cards.filter((card) => card.severity === 'blocking' || card.severity === 'critical').length,
      pendingReviews: state.presidentialReviewQueue?.pendingCount ?? 0,
      opportunities: state.operationOpportunityProposals?.length ?? 0,
      hardTurns: cards.filter((card) => card.category === 'turn').length,
      advanceReviewCount: advanceReadiness.items.length,
    },
  };
}
