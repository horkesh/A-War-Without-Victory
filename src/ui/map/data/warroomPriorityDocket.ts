import {
  buildPreAdvanceCommandReviewView,
  type PreAdvanceCommandReviewInput,
  type PreAdvanceCommandReviewItem,
  type PreAdvanceCommandReviewMetrics,
  type PreAdvanceCommandReviewSourceHandoff,
  type PreAdvanceCommandReviewStatus,
} from './preAdvanceCommandReview';
import type { PresidentialDecisionRoomNavigationTarget } from './presidentialDecisionRoom';
import { t } from '../i18n';

export type WarroomPriorityDocketTone = 'danger' | 'attention' | 'clear' | 'quiet';

export type WarroomPriorityDocketItem = PreAdvanceCommandReviewItem;
export type WarroomPriorityDocketSourceHandoff = PreAdvanceCommandReviewSourceHandoff;

export interface WarroomPriorityDocketView {
  status: PreAdvanceCommandReviewStatus;
  statusLabel: string;
  tone: WarroomPriorityDocketTone;
  headline: string;
  summary: string;
  sourceHandoffSummary: string;
  canOpenBoard: boolean;
  openBoardLabel: string;
  items: WarroomPriorityDocketItem[];
  sourceHandoffs: WarroomPriorityDocketSourceHandoff[];
  metrics: PreAdvanceCommandReviewMetrics;
  blockingDecisionCount: number;
}

export interface WarroomPriorityDocketInput extends PreAdvanceCommandReviewInput {
  limit?: number;
}

/**
 * Every docket row is clickable. A row whose card has no navigation target of its own opens that
 * card in the Decision Room instead of sitting disabled; rows with a target return null here and
 * keep their own.
 */
export function docketRowFallbackTarget(item: WarroomPriorityDocketItem): PresidentialDecisionRoomNavigationTarget | null {
  if (item.navigationTarget.kind !== 'none') return null;
  return { kind: 'decision-room', lens: 'all', cardId: item.id };
}

function docketTone(status: PreAdvanceCommandReviewStatus): WarroomPriorityDocketTone {
  if (status === 'unavailable') return 'quiet';
  if (status === 'clear') return 'clear';
  if (status === 'blocked') return 'danger';
  return 'attention';
}

function formatSummary(metrics: PreAdvanceCommandReviewMetrics): string {
  return t('warroom.docket.summary', {
    advanceReviewCount: metrics.advanceReviewCount,
    advanceItemLabel: t(metrics.advanceReviewCount === 1 ? 'warroom.docket.advanceItem.one' : 'warroom.docket.advanceItem.many'),
    required: metrics.priorityCounts.required,
    recommended: metrics.priorityCounts.recommended,
    monitor: metrics.priorityCounts.monitor,
    record: metrics.priorityCounts.record,
    pendingReviews: metrics.pendingReviews,
  });
}

function formatSourceHandoffSummary(
  sourceHandoffs: WarroomPriorityDocketSourceHandoff[],
  metrics: PreAdvanceCommandReviewMetrics,
): string {
  return t('warroom.docket.sourceHandoffSummary', {
    sourceHandoffCount: sourceHandoffs.length,
    sourceHandoffLabel: t(sourceHandoffs.length === 1 ? 'warroom.docket.sourceHandoff.one' : 'warroom.docket.sourceHandoff.many'),
    required: metrics.priorityCounts.required,
    recommended: metrics.priorityCounts.recommended,
    monitor: metrics.priorityCounts.monitor,
    record: metrics.priorityCounts.record,
  });
}

function statusLabel(status: PreAdvanceCommandReviewStatus, hasLoadedState: boolean): string {
  if (status === 'blocked') return t('warroom.docket.status.blocked');
  if (status === 'review') return t('warroom.docket.status.review');
  if (status === 'clear') return t('warroom.docket.status.clear');
  if (hasLoadedState) return t('warroom.docket.status.noCampaignSide');
  return t('warroom.docket.status.unavailable');
}

export function buildWarroomPriorityDocketView(input: WarroomPriorityDocketInput): WarroomPriorityDocketView {
  const review = buildPreAdvanceCommandReviewView(input);
  // No default cap: the docket lists every counted item (the panel scrolls). A caller that wants
  // a short featured list passes `limit` explicitly.
  const limit = input.limit ?? review.items.length;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

  return {
    status: review.status,
    statusLabel: statusLabel(review.status, input.state != null),
    tone: docketTone(review.status),
    headline: review.headline,
    summary: formatSummary(review.metrics),
    sourceHandoffSummary: formatSourceHandoffSummary(review.sourceHandoffs, review.metrics),
    canOpenBoard: review.canReviewPriorities,
    openBoardLabel: t('warroom.docket.openDecisionRoom'),
    items: review.items.slice(0, safeLimit),
    sourceHandoffs: review.sourceHandoffs,
    metrics: review.metrics,
    blockingDecisionCount: review.blockingDecisionCount,
  };
}
