export interface EventDecisionRoutingFields {
  requires_player_response?: boolean;
  observer_drainable?: boolean;
}

/**
 * The renderer's one rule for "this card holds the player": it blocks Advance, files a blocking inbox item,
 * auto-opens the event modal and locks the toolbar. A required card the Observer drain will answer
 * (`observer_drainable`, set by GameStateAdapter from the same predicate the manifest's Advance gate reads)
 * is advisory (§6 mechanics item 6): the player may still open and answer it.
 */
export function isRequiredPendingEventDecision(decision: EventDecisionRoutingFields | null | undefined): boolean {
  return decision?.requires_player_response === true && decision.observer_drainable !== true;
}

export interface PendingEventDecisionRoutingRow extends EventDecisionRoutingFields {
  event_id: string;
  faction: string;
  turn_fired: number;
}

function comparePendingEventDecisionPriority(a: PendingEventDecisionRoutingRow, b: PendingEventDecisionRoutingRow): number {
  const aRequired = isRequiredPendingEventDecision(a) ? 0 : 1;
  const bRequired = isRequiredPendingEventDecision(b) ? 0 : 1;
  if (aRequired !== bRequired) return aRequired - bRequired;
  if (a.turn_fired !== b.turn_fired) return a.turn_fired - b.turn_fired;
  if (a.event_id < b.event_id) return -1;
  if (a.event_id > b.event_id) return 1;
  return 0;
}

/** The card App auto-opens in the non-dismissible EventDecisionModal: only a required (blocking) card. */
export function selectNextPendingEventDecision<T extends PendingEventDecisionRoutingRow>(
  decisions: readonly T[] | undefined,
  playerFaction: string | null,
  excludedEventId: string | null = null,
): T | null {
  if (!playerFaction) return null;
  const playerDecisions = (decisions ?? [])
    .filter((decision) => decision.faction === playerFaction)
    .filter(isRequiredPendingEventDecision)
    .filter((decision) => decision.event_id !== excludedEventId)
    .sort(comparePendingEventDecisionPriority);
  return playerDecisions[0] ?? null;
}
