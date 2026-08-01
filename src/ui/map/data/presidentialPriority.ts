import { strictCompare } from '../../../state/validateGameState';

/**
 * One presentation vocabulary for the presidential agenda.
 *
 * Threat/cost severity remains a separate field on source projections. A
 * critical report is not presidential work unless a filed lever or an
 * authored response exists.
 */
export type PresidentialPriorityBand = 'required' | 'recommended' | 'monitor' | 'record';

export type PresidentialPriorityDestination =
  | 'decision-room'
  | 'inbox'
  | 'army-hq'
  | 'field'
  | 'enclave-dashboard'
  | 'chronicle'
  | 'none';

export interface PresidentialPriorityReadModel {
  id: string;
  priorityBand: PresidentialPriorityBand;
  blocker: boolean;
  /** Deterministic agenda urgency. Lower values sort first; never rendered as copy. */
  urgency: number;
  source: { id: string };
  deadlineTurn: number | null;
  recommendedDestination: PresidentialPriorityDestination;
}

export interface PresidentialPriorityCounts {
  required: number;
  recommended: number;
  monitor: number;
  record: number;
}

export interface PresidentialPriorityFacts {
  required: boolean;
  hasPresidentialLever: boolean;
  recordOnly: boolean;
}

export interface PresidentialPriorityReadModelInput extends PresidentialPriorityFacts {
  id: string;
  sourceId: string;
  currentTurn: number;
  /** Source-owned within-band urgency used when no deadline exists. Lower sorts first. */
  urgency?: number | null;
  deadlineTurn?: number | null;
  recommendedDestination: PresidentialPriorityDestination;
}

export function classifyPresidentialPriority(facts: PresidentialPriorityFacts): PresidentialPriorityBand {
  if (facts.required) return 'required';
  if (facts.recordOnly) return 'record';
  if (facts.hasPresidentialLever) return 'recommended';
  return 'monitor';
}

const BAND_RANK: Record<PresidentialPriorityBand, number> = {
  required: 0,
  recommended: 1,
  monitor: 2,
  record: 3,
};

function normalizedDeadline(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

export function buildPresidentialPriorityReadModel(
  input: PresidentialPriorityReadModelInput,
): PresidentialPriorityReadModel {
  const priorityBand = classifyPresidentialPriority(input);
  const deadlineTurn = normalizedDeadline(input.deadlineTurn);
  const bandFloor = BAND_RANK[priorityBand] * 1_000_000;
  const sourceUrgency = typeof input.urgency === 'number' && Number.isFinite(input.urgency)
    ? Math.trunc(input.urgency)
    : 999_999;
  const urgencyOffset = deadlineTurn === null
    ? sourceUrgency
    : Math.max(0, deadlineTurn - Math.max(0, input.currentTurn));
  return {
    id: input.id,
    priorityBand,
    blocker: input.required,
    urgency: bandFloor + urgencyOffset,
    source: { id: input.sourceId },
    deadlineTurn,
    recommendedDestination: input.recommendedDestination,
  };
}

export function comparePresidentialPriorityReadModels(
  left: PresidentialPriorityReadModel,
  right: PresidentialPriorityReadModel,
): number {
  const bandDelta = BAND_RANK[left.priorityBand] - BAND_RANK[right.priorityBand];
  if (bandDelta !== 0) return bandDelta;
  if (left.urgency !== right.urgency) return left.urgency - right.urgency;
  const sourceDelta = strictCompare(left.source.id, right.source.id);
  if (sourceDelta !== 0) return sourceDelta;
  return strictCompare(left.id, right.id);
}

export function emptyPresidentialPriorityCounts(): PresidentialPriorityCounts {
  return { required: 0, recommended: 0, monitor: 0, record: 0 };
}

export function countPresidentialPriorityBands(
  items: readonly { priorityBand: PresidentialPriorityBand; countWeight?: number }[],
): PresidentialPriorityCounts {
  const counts = emptyPresidentialPriorityCounts();
  for (const item of items) {
    const weight = typeof item.countWeight === 'number' && Number.isFinite(item.countWeight) && item.countWeight > 0
      ? item.countWeight
      : 1;
    counts[item.priorityBand] += weight;
  }
  return counts;
}
