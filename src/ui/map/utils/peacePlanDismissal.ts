import type { LoadedGameState } from '../data/types.js';

type PendingPeacePlan = NonNullable<LoadedGameState['pendingPeacePlan']>;

export function getPeacePlanDismissalKey(plan: PendingPeacePlan): string {
  return `${plan.planId}@${plan.turnOffered}`;
}

export function shouldShowPeacePlanModal(
  plan: PendingPeacePlan | undefined,
  dismissedPeacePlanKey: string | null,
): boolean {
  if (!plan) return false;
  return dismissedPeacePlanKey !== getPeacePlanDismissalKey(plan);
}
