/**
 * Address-the-Nation contract — pure logic for the player-initiated presidential
 * ADDRESS-THE-NATION leadership action (Presidential Command Surface design §10,
 * deferred companion to the shipped front-visit action).
 *
 * The president chooses to address the nation over the airwaves (a morale /
 * leadership gesture). This module force-queues the ALREADY-AUTHORED
 * `address_to_nation_<faction>` event (data/scenarios/events/war_1993.json) into
 * `state.military.pending_event_decisions` so EventDecisionModal surfaces it.
 * ZERO new sim/event code — the event's authored effects (morale / cohesion /
 * patron_pressure / standing shifts, all double-edged), recurrence (max_fires 5 /
 * cooldown 10t), and branches are reused verbatim.
 *
 * Unlike the front visit, an address is FACTION-WIDE: there is NO reachability /
 * enclave gate (the president broadcasts from the capital; no front is travelled
 * to). The only gates are the player-faction resolution and the event's OWN
 * recurrence (cap / cooldown). The CA debit lives in the IPC handler.
 *
 * Determinism: pure over (state). No Math.random / no Date.now. Iteration over
 * the authored response_options order (deterministic by construction;
 * player-IPC-only path).
 */

const ADDRESS_NATION_EVENT_BY_FACTION = {
  RBiH: 'address_to_nation_rbih',
  RS: 'address_to_nation_rs',
  HRHB: 'address_to_nation_hrhb',
};

/** Returns the authored address-to-nation event id for a faction, or null. */
function addressNationEventIdForFaction(faction) {
  return ADDRESS_NATION_EVENT_BY_FACTION[faction] ?? null;
}

/**
 * Compute address-the-nation availability for the player faction WITHOUT
 * mutating state. Used by both the read-only availability IPC and the
 * force-queue pre-checks.
 *
 * @returns {{
 *   available: boolean,
 *   reason: string|null,        // machine-readable when unavailable
 *   eventId: string|null,
 *   currentTurn: number,
 *   firesLeft: number,          // max_fires - fire_count (>=0)
 *   maxFires: number,
 *   cooldownUntil: number|null, // turn the cooldown expires (exclusive lower bound)
 *   onCooldown: boolean,
 * }}
 */
function computeAddressNationAvailability(state, playerFaction, eventDef) {
  const currentTurn = state?.meta?.turn ?? 0;
  const eventId = addressNationEventIdForFaction(playerFaction);

  const base = {
    available: false,
    reason: null,
    eventId,
    currentTurn,
    firesLeft: 0,
    maxFires: 0,
    cooldownUntil: null,
    onCooldown: false,
  };

  if (!playerFaction) return { ...base, reason: 'no_player_faction' };
  if (!eventId || !eventDef) return { ...base, reason: 'no_event' };

  // ── Cooldown / cap (reuse the event's OWN recurrence, canonical state) ──────
  const recurrence = eventDef.recurrence || {};
  const maxFires = typeof recurrence.max_fires === 'number' ? recurrence.max_fires : Infinity;
  const cooldownTurns = typeof recurrence.cooldown_turns === 'number' ? recurrence.cooldown_turns : 0;
  const fireCount = state?.military?.event_fire_counts?.[eventId] ?? 0;
  const lastFired = state?.military?.event_last_fired_turn?.[eventId];
  const firesLeft = Number.isFinite(maxFires) ? Math.max(0, maxFires - fireCount) : Infinity;
  const cooldownUntil =
    cooldownTurns > 0 && typeof lastFired === 'number' ? lastFired + cooldownTurns : null;
  const onCooldown = cooldownUntil != null && currentTurn < cooldownUntil;

  const out = {
    ...base,
    firesLeft: Number.isFinite(firesLeft) ? firesLeft : maxFires,
    maxFires: Number.isFinite(maxFires) ? maxFires : 0,
    cooldownUntil,
    onCooldown,
  };

  if (firesLeft <= 0) return { ...out, available: false, reason: 'exhausted' };
  if (onCooldown) return { ...out, available: false, reason: 'on_cooldown' };

  return { ...out, available: true, reason: null };
}

/**
 * Build the pending-event-decision payload that EventDecisionModal consumes,
 * mirroring the push at src/sim/events/evaluate_events.ts:577 (and
 * front_visit_contract.buildFrontVisitPendingDecision). ALL authored
 * response_options are offered (no reachability filter); branches gated by their
 * own authored `available_from_fire` are left to the downstream resolver.
 *
 * @returns the PendingEventDecision-shaped object (or null if not buildable).
 */
function buildAddressNationPendingDecision(state, playerFaction, eventDef, availability) {
  if (!availability?.available) return null;
  const currentTurn = state?.meta?.turn ?? 0;

  const text = (eventDef.effect && eventDef.effect.text) || eventDef.title || eventDef.id;
  const respondingFaction = eventDef.responding_faction ?? playerFaction;

  const decision = {
    event_id: eventDef.id,
    event_title: eventDef.title || text,
    turn_fired: currentTurn,
    response_options: [...(eventDef.response_options || [])],
    faction: respondingFaction,
  };
  if (eventDef.narrative) decision.narrative = eventDef.narrative;
  if (eventDef.category) decision.category = eventDef.category;
  if (eventDef.situation) decision.situation = eventDef.situation;
  if (eventDef.staff_assessment) decision.staff_assessment = eventDef.staff_assessment;
  if (Array.isArray(eventDef.trigger_evidence) && eventDef.trigger_evidence.length > 0) {
    decision.trigger_evidence = [...eventDef.trigger_evidence];
  }
  if (eventDef.historical_source) decision.historical_source = eventDef.historical_source;
  if (eventDef.source_note) decision.source_note = eventDef.source_note;
  if (eventDef.source) decision.source = eventDef.source;
  if (eventDef.requires_player_response != null) {
    decision.requires_player_response = eventDef.requires_player_response;
  }
  if (eventDef.historical_default_response_id) {
    decision.historical_default_response_id = eventDef.historical_default_response_id;
  }
  if (eventDef.staff_recommended_response_id) {
    decision.staff_recommended_response_id = eventDef.staff_recommended_response_id;
  }
  return decision;
}

module.exports = {
  ADDRESS_NATION_EVENT_BY_FACTION,
  addressNationEventIdForFaction,
  computeAddressNationAvailability,
  buildAddressNationPendingDecision,
};
