export interface EventDecisionRoutingFields {
  requires_player_response?: boolean;
}

export function isRequiredPendingEventDecision(decision: EventDecisionRoutingFields | null | undefined): boolean {
  return decision?.requires_player_response === true;
}
