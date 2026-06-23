import { strictCompare } from '../../../state/validateGameState';

export interface RecentEngagementLike {
  turn: number;
  osid: string;
  role: string;
  outcome: string;
}

export function compareRecentEngagements(a: RecentEngagementLike, b: RecentEngagementLike): number {
  if (a.turn !== b.turn) return b.turn - a.turn;
  return strictCompare(a.osid, b.osid)
    || strictCompare(a.role, b.role)
    || strictCompare(a.outcome, b.outcome);
}

export function sortRecentEngagements<T extends RecentEngagementLike>(engagements: readonly T[] | null | undefined): T[] {
  return [...(engagements ?? [])].sort(compareRecentEngagements);
}
