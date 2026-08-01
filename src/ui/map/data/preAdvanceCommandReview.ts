import {
  buildPresidentialDecisionRoomSourceHandoffs,
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomCategory,
  type PresidentialDecisionRoomMetrics,
  type PresidentialDecisionRoomNavigationTarget,
  type PresidentialDecisionRoomSeverity,
  type PresidentialDecisionRoomSourceHandoff,
} from './presidentialDecisionRoom';
import type { LoadedGameState } from './types';
import { derivePresidentialBlockers } from './presidentialBlockers';
import { t } from '../i18n';
import { countPresidentialPriorityBands, type PresidentialPriorityBand } from './presidentialPriority';

export type PreAdvanceCommandReviewStatus = 'blocked' | 'review' | 'clear' | 'unavailable';

export interface PreAdvanceCommandReviewItem {
  id: string;
  severity: PresidentialDecisionRoomSeverity;
  priorityBand: PresidentialPriorityBand;
  category: PresidentialDecisionRoomCategory;
  title: string;
  explanation: string;
  sourceOwner: string;
  sourceLabel: string;
  actionLabel: string;
  evidence: string[];
  sourceIds?: string[];
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
  sourceHandoffTarget?: PresidentialDecisionRoomNavigationTarget;
}

export type PreAdvanceCommandReviewMetrics = PresidentialDecisionRoomMetrics;
export type PreAdvanceCommandReviewSourceHandoff = PresidentialDecisionRoomSourceHandoff;

export interface PreAdvanceCommandReviewView {
  status: PreAdvanceCommandReviewStatus;
  headline: string;
  canReviewPriorities: boolean;
  blockingDecisionCount: number;
  items: PreAdvanceCommandReviewItem[];
  sourceHandoffs: PreAdvanceCommandReviewSourceHandoff[];
  metrics: PreAdvanceCommandReviewMetrics;
}

export interface PreAdvanceCommandReviewInput {
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
  /** Current-session aftermath already presented to the player. Not persisted. */
  reviewedAftermathTurn?: number | null;
}

function mapReadinessItem(card: PresidentialDecisionRoomCard): PreAdvanceCommandReviewItem {
  return {
    id: card.id,
    severity: card.severity,
    priorityBand: card.priorityBand,
    category: card.category,
    title: card.title,
    explanation: card.explanation,
    sourceOwner: card.sourceOwner,
    sourceLabel: card.sourceLabel,
    actionLabel: card.actionLabel,
    evidence: card.evidence,
    ...(card.sourceIds ? { sourceIds: card.sourceIds } : {}),
    navigationTarget: card.navigationTarget,
    ...(card.sourceHandoffTarget ? { sourceHandoffTarget: card.sourceHandoffTarget } : {}),
  };
}

function statusFor(
  hasState: boolean,
  blockedByExistingSystems: boolean,
  itemCount: number,
): PreAdvanceCommandReviewStatus {
  if (!hasState) return 'unavailable';
  if (blockedByExistingSystems) return 'blocked';
  if (itemCount > 0) return 'review';
  return 'clear';
}

function countBlockingDecisions(state: LoadedGameState | null): number {
  if (!state) return 0;
  const playerFaction = state.player_faction ?? null;
  const presidentialBlockerCount = derivePresidentialBlockers(state, null).length;
  const counterOfferCount = (state.pendingCounterOffers ?? [])
    .filter((offer) => !playerFaction || !offer.targetFaction || offer.targetFaction === playerFaction)
    .length;
  return presidentialBlockerCount + counterOfferCount;
}

export function formatPreAdvanceGateBlockTitle(view: { blockingDecisionCount: number }): string {
  const count = view.blockingDecisionCount;
  return t('preAdvance.gate.blockedTitle', {
    count,
    decisionLabel: t(count === 1 ? 'preAdvance.gate.decision.one' : 'preAdvance.gate.decision.many'),
  });
}

export function buildPreAdvanceCommandReviewView(input: PreAdvanceCommandReviewInput): PreAdvanceCommandReviewView {
  const decisionRoom = buildPresidentialDecisionRoomView(input);
  const liveBlockers = derivePresidentialBlockers(input.state, input.osidNameMap ?? null);
  const hasLiveParamilitaryBlocker = liveBlockers.some((blocker) => blocker.type === 'paramilitary_request');
  const candidateReadinessCards = decisionRoom.advanceReadiness.items
    .filter((card) => card.id !== 'paramilitary:pending' || hasLiveParamilitaryBlocker);
  const reviewedAftermathCards = candidateReadinessCards.filter((card) => {
    if (card.category !== 'turn' || input.reviewedAftermathTurn == null) return false;
    const target = card.sourceHandoffTarget ?? card.navigationTarget;
    return target.kind === 'army-hq-aftermath-record'
      && target.turn === input.reviewedAftermathTurn;
  });
  const reviewedAftermathIds = new Set(reviewedAftermathCards.map((card) => card.id));
  const readinessCards = candidateReadinessCards
    .filter((card) => !reviewedAftermathIds.has(card.id));
  const items = readinessCards.map(mapReadinessItem);
  const sourceHandoffs = buildPresidentialDecisionRoomSourceHandoffs(readinessCards);
  const blockingDecisionCount = countBlockingDecisions(input.state);
  const status = statusFor(
    input.state != null && decisionRoom.hasPlayerFaction,
    blockingDecisionCount > 0,
    items.length,
  );

  return {
    status,
    headline: status === 'blocked'
      ? t('decisionRoom.advance.reviewBeforeAdvance')
      : status === 'review'
        ? t('decisionRoom.advance.recommendedBeforeAdvance')
        : decisionRoom.advanceReadiness.headline,
    canReviewPriorities: decisionRoom.hasPlayerFaction,
    blockingDecisionCount,
    items,
    sourceHandoffs,
    metrics: {
      ...decisionRoom.metrics,
      priorityCounts: (() => {
        const reviewedCounts = countPresidentialPriorityBands(reviewedAftermathCards);
        return {
          required: Math.max(0, decisionRoom.metrics.priorityCounts.required - reviewedCounts.required),
          recommended: Math.max(0, decisionRoom.metrics.priorityCounts.recommended - reviewedCounts.recommended),
          monitor: Math.max(0, decisionRoom.metrics.priorityCounts.monitor - reviewedCounts.monitor),
          record: Math.max(0, decisionRoom.metrics.priorityCounts.record - reviewedCounts.record),
        };
      })(),
      hardTurns: Math.max(0, decisionRoom.metrics.hardTurns - reviewedAftermathCards.length),
      advanceReviewCount: readinessCards.reduce(
        (sum, card) => sum + (card.countWeight ?? 1),
        0,
      ),
    },
  };
}
