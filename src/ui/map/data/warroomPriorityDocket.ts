import {
  buildPreAdvanceCommandReviewView,
  type PreAdvanceCommandReviewInput,
  type PreAdvanceCommandReviewItem,
  type PreAdvanceCommandReviewMetrics,
  type PreAdvanceCommandReviewStatus,
} from './preAdvanceCommandReview';

export type WarroomPriorityDocketTone = 'danger' | 'attention' | 'clear' | 'quiet';

export type WarroomPriorityDocketItem = PreAdvanceCommandReviewItem;

export interface WarroomPriorityDocketView {
  status: PreAdvanceCommandReviewStatus;
  tone: WarroomPriorityDocketTone;
  headline: string;
  summary: string;
  canOpenBoard: boolean;
  openBoardLabel: string;
  items: WarroomPriorityDocketItem[];
  metrics: PreAdvanceCommandReviewMetrics;
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
  return `${metrics.advanceReviewCount} advance item${metrics.advanceReviewCount === 1 ? '' : 's'} / ${metrics.urgentCount} urgent / ${metrics.pendingReviews} pending`;
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
    canOpenBoard: review.canReviewPriorities,
    openBoardLabel: 'Open Decision Room',
    items: review.items.slice(0, safeLimit),
    metrics: review.metrics,
  };
}
