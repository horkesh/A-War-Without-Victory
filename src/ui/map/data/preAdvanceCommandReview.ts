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
import { t } from '../i18n';

export type PreAdvanceCommandReviewStatus = 'blocked' | 'review' | 'clear' | 'unavailable';

export interface PreAdvanceCommandReviewItem {
  id: string;
  severity: PresidentialDecisionRoomSeverity;
  category: PresidentialDecisionRoomCategory;
  title: string;
  explanation: string;
  sourceOwner: string;
  sourceLabel: string;
  actionLabel: string;
  evidence: string[];
  navigationTarget: PresidentialDecisionRoomNavigationTarget;
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
}

function mapReadinessItem(card: PresidentialDecisionRoomCard): PreAdvanceCommandReviewItem {
  return {
    id: card.id,
    severity: card.severity,
    category: card.category,
    title: card.title,
    explanation: card.explanation,
    sourceOwner: card.sourceOwner,
    sourceLabel: card.sourceLabel,
    actionLabel: card.actionLabel,
    evidence: card.evidence,
    navigationTarget: card.navigationTarget,
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
  if (state.playerDecisionSummary) return state.playerDecisionSummary.blockingCount;
  const eventDecisionCount = Math.max(
    state.presidentialReviewQueue?.eventDecisionCount ?? 0,
    state.pendingEventDecisions?.length ?? 0,
  );
  return eventDecisionCount + (state.pendingParamilitaryRequests?.length ?? 0);
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
  const items = decisionRoom.advanceReadiness.items.map(mapReadinessItem);
  const sourceHandoffs = buildPresidentialDecisionRoomSourceHandoffs(decisionRoom.advanceReadiness.items);
  const blockingDecisionCount = countBlockingDecisions(input.state);

  return {
    status: statusFor(
      input.state != null && decisionRoom.hasPlayerFaction,
      decisionRoom.advanceReadiness.blockedByExistingSystems,
      items.length,
    ),
    headline: decisionRoom.advanceReadiness.headline,
    canReviewPriorities: decisionRoom.hasPlayerFaction,
    blockingDecisionCount,
    items,
    sourceHandoffs,
    metrics: decisionRoom.metrics,
  };
}
