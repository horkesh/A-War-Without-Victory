import type { LoadedGameState } from '../data/types.js';

type PendingPeacePlan = NonNullable<LoadedGameState['pendingPeacePlan']>;
type PendingEventDecisions = LoadedGameState['pendingEventDecisions'];

const PEACE_PLAN_EVENT_OWNERS: Record<string, ReadonlySet<string>> = {
  owen_stoltenberg: new Set([
    'owen_stoltenberg_plan_1993',
    'os_rbih_tactical_acceptance_1993',
  ]),
};

export function getPeacePlanDismissalKey(plan: PendingPeacePlan): string {
  return `${plan.planId}@${plan.turnOffered}`;
}

export function isPeacePlanOwnedByPendingEvent(
  plan: PendingPeacePlan | undefined,
  pendingEventDecisions: PendingEventDecisions,
): boolean {
  if (!plan) return false;
  const ownerIds = PEACE_PLAN_EVENT_OWNERS[plan.planId];
  if (!ownerIds) return false;
  return (pendingEventDecisions ?? []).some((decision) => ownerIds.has(decision.event_id));
}

export function shouldShowPeacePlanModal(
  plan: PendingPeacePlan | undefined,
  dismissedPeacePlanKey: string | null,
  pendingEventDecisions?: PendingEventDecisions,
): boolean {
  if (!plan) return false;
  if (isPeacePlanOwnedByPendingEvent(plan, pendingEventDecisions)) return false;
  return dismissedPeacePlanKey !== getPeacePlanDismissalKey(plan);
}
