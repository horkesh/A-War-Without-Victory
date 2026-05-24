import {
  buildPreAdvanceCommandReviewView,
  type PreAdvanceCommandReviewInput,
  type PreAdvanceCommandReviewItem,
  type PreAdvanceCommandReviewMetrics,
  type PreAdvanceCommandReviewSourceHandoff,
  type PreAdvanceCommandReviewStatus,
} from './preAdvanceCommandReview';
import { t } from '../i18n';

export type WarroomPriorityDocketTone = 'danger' | 'attention' | 'clear' | 'quiet';

export type WarroomPriorityDocketItem = PreAdvanceCommandReviewItem;
export type WarroomPriorityDocketSourceHandoff = PreAdvanceCommandReviewSourceHandoff;

export interface WarroomPriorityDocketView {
  status: PreAdvanceCommandReviewStatus;
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

function docketTone(
  status: PreAdvanceCommandReviewStatus,
  urgentCount: number,
): WarroomPriorityDocketTone {
  if (status === 'unavailable') return 'quiet';
  if (status === 'clear') return 'clear';
  if (status === 'blocked' || urgentCount > 0) return 'danger';
  return 'attention';
}

function formatSummary(metrics: PreAdvanceCommandReviewMetrics): string {
  return t('warroom.docket.summary', {
    advanceReviewCount: metrics.advanceReviewCount,
    advanceItemLabel: t(metrics.advanceReviewCount === 1 ? 'warroom.docket.advanceItem.one' : 'warroom.docket.advanceItem.many'),
    urgentCount: metrics.urgentCount,
    pendingReviews: metrics.pendingReviews,
  });
}

function formatSourceHandoffSummary(
  sourceHandoffs: WarroomPriorityDocketSourceHandoff[],
  urgentCount: number,
): string {
  return t('warroom.docket.sourceHandoffSummary', {
    sourceHandoffCount: sourceHandoffs.length,
    sourceHandoffLabel: t(sourceHandoffs.length === 1 ? 'warroom.docket.sourceHandoff.one' : 'warroom.docket.sourceHandoff.many'),
    urgentCount,
  });
}

export function buildWarroomPriorityDocketView(input: WarroomPriorityDocketInput): WarroomPriorityDocketView {
  const review = buildPreAdvanceCommandReviewView(input);
  const limit = input.limit ?? 4;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

  return {
    status: review.status,
    tone: docketTone(review.status, review.metrics.urgentCount),
    headline: review.headline,
    summary: formatSummary(review.metrics),
    sourceHandoffSummary: formatSourceHandoffSummary(review.sourceHandoffs, review.metrics.urgentCount),
    canOpenBoard: review.canReviewPriorities,
    openBoardLabel: t('warroom.docket.openDecisionRoom'),
    items: review.items.slice(0, safeLimit),
    sourceHandoffs: review.sourceHandoffs,
    metrics: review.metrics,
    blockingDecisionCount: review.blockingDecisionCount,
  };
}
