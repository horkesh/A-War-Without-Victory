import type { LoadedGameState } from '../data/types.js';

type PendingPeacePlan = NonNullable<LoadedGameState['pendingPeacePlan']>;
type PendingEventDecisions = LoadedGameState['pendingEventDecisions'];

export function getPeacePlanDismissalKey(plan: PendingPeacePlan): string {
  return `${plan.planId}@${plan.turnOffered}`;
}

/**
 * §6 E3a2: a routed card owns its plan's answer. While any pending decision declares a
 * `plan_answer` for the plan, the fallback modal stays hidden (the engine never opens the
 * fallback over a pending routed card; this covers a pointer carried by an older save).
 * Ownership is read from the decision's own options, not from a table of event ids.
 */
export function isPeacePlanOwnedByPendingEvent(
  plan: PendingPeacePlan | undefined,
  pendingEventDecisions: PendingEventDecisions,
): boolean {
  if (!plan) return false;
  return (pendingEventDecisions ?? []).some((decision) => (decision.response_options ?? [])
    .some((option) => option.plan_answer?.plan_id === plan.planId));
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
