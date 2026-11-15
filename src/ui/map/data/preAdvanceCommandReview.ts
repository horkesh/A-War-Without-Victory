import {
  buildPresidentialDecisionRoomSourceHandoffs,
  buildPresidentialDecisionRoomView,
  type PresidentialDecisionRoomCard,
  type PresidentialDecisionRoomCategory,
  type PresidentialDecisionRoomInput,
  type PresidentialDecisionRoomMetrics,
  type PresidentialDecisionRoomNavigationTarget,
  type PresidentialDecisionRoomSeverity,
  type PresidentialDecisionRoomSourceHandoff,
} from './presidentialDecisionRoom';
import type { LoadedGameState } from './types';
import { derivePresidentialBlockers } from './presidentialBlockers';
import { t } from '../i18n';
import {
  countPresidentialPriorityBands,
  type PresidentialPriorityBand,
  type PresidentialPriorityReadModel,
} from './presidentialPriority';

export type PreAdvanceCommandReviewStatus = 'blocked' | 'review' | 'clear' | 'unavailable';

/** The two tiers the review chip counts. Information items are never counted (dispatch and Record). */
export type PreAdvanceReviewTier = 'required' | 'recommended';

/** The chip shows a true count up to this number, then "9+". */
export const REVIEW_CHIP_DISPLAY_CAP = 9;

export function formatReviewChipCount(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return safe > REVIEW_CHIP_DISPLAY_CAP ? `${REVIEW_CHIP_DISPLAY_CAP}+` : String(safe);
}

export interface PreAdvanceCommandReviewItem {
  id: string;
  /** Required items block Advance; recommended items are counted and advisory. */
  tier: PreAdvanceReviewTier;
  /** One line saying why this is on the list now, and for required items what happens if ignored. */
  whyNow: string;
  severity: PresidentialDecisionRoomSeverity;
  priorityBand: PresidentialPriorityBand;
  priorityModel: PresidentialPriorityReadModel;
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

export interface PreAdvanceCommandReviewInput
  extends Pick<PresidentialDecisionRoomInput, 'recruitmentMatter' | 'municipalityNames'> {
  state: LoadedGameState | null;
  osidNameMap?: Record<string, string> | null;
  /** Current-session aftermath already presented to the player. Not persisted. */
  reviewedAftermathTurn?: number | null;
}

const WHY_NOW_MAX_LENGTH = 110;

function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const end = trimmed.search(/[.!?](\s|$)/);
  const sentence = end >= 0 ? trimmed.slice(0, end + 1) : trimmed;
  return sentence.length <= WHY_NOW_MAX_LENGTH
    ? sentence
    : `${sentence.slice(0, WHY_NOW_MAX_LENGTH - 1).trimEnd()}…`;
}

function isStanceMatterCard(card: PresidentialDecisionRoomCard): boolean {
  return card.id.startsWith('command:stance-matter:') || card.directive?.lever === 'stance_matter';
}

function reviewTierFor(card: PresidentialDecisionRoomCard): PreAdvanceReviewTier {
  return card.priorityBand === 'required' ? 'required' : 'recommended';
}

function whyNowFor(card: PresidentialDecisionRoomCard, tier: PreAdvanceReviewTier): string {
  if (tier === 'required') return t('review.whyNow.required');
  if (isStanceMatterCard(card)) return t('review.whyNow.stance');
  return firstSentence(card.explanation) || t('review.whyNow.default');
}

function mapReadinessItem(card: PresidentialDecisionRoomCard): PreAdvanceCommandReviewItem {
  const tier = reviewTierFor(card);
  return {
    id: card.id,
    tier,
    whyNow: whyNowFor(card, tier),
    severity: card.severity,
    priorityBand: card.priorityBand,
    priorityModel: card.priorityModel,
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
      // A true count: one per listed row. A grouped card is one row, whatever it groups
      // (the chip's number must match the rows the list shows).
      advanceReviewCount: readinessCards.length,
    },
  };
}
