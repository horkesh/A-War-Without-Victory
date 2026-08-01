/**
 * One presentation vocabulary for the presidential agenda.
 *
 * Threat/cost severity remains a separate field on source projections. A
 * critical report is not presidential work unless a filed lever or an
 * authored response exists.
 */
export type PresidentialPriorityBand = 'required' | 'recommended' | 'monitor' | 'record';

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

export function classifyPresidentialPriority(facts: PresidentialPriorityFacts): PresidentialPriorityBand {
  if (facts.required) return 'required';
  if (facts.recordOnly) return 'record';
  if (facts.hasPresidentialLever) return 'recommended';
  return 'monitor';
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
