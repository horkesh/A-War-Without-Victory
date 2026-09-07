'use strict';

const {
  computeActionCadenceAvailability,
  responseOptionsForFire,
} = require('./action_cadence_contract.cjs');

const STRATEGIC_POSTURE_REVIEW_EVENT_BY_FACTION = {
  RBiH: 'strategic_posture_review_rbih',
  RS: 'strategic_posture_review_rs',
  HRHB: 'strategic_posture_review_hrhb',
};

function strategicPostureReviewEventIdForFaction(faction) {
  return STRATEGIC_POSTURE_REVIEW_EVENT_BY_FACTION[faction] ?? null;
}

function computeStrategicPostureReviewAvailability(state, playerFaction, eventDef) {
  if (!playerFaction) {
    return {
      ...computeActionCadenceAvailability(state, null, eventDef),
      reason: 'no_player_faction',
    };
  }
  const eventId = strategicPostureReviewEventIdForFaction(playerFaction);
  return computeActionCadenceAvailability(state, eventId, eventDef);
}

function buildStrategicPostureReviewPendingDecision(state, playerFaction, eventDef, availability) {
  if (!availability?.available) return null;
  const responseOptions = responseOptionsForFire(
    eventDef.response_options,
    availability.nextFireNumber,
  );
  if (responseOptions.length === 0) return null;
  const currentTurn = state?.meta?.turn ?? 0;
  const text = eventDef.effect?.text || eventDef.title || eventDef.id;
  const decision = {
    event_id: eventDef.id,
    event_title: eventDef.title || text,
    turn_fired: currentTurn,
    response_options: responseOptions,
    faction: eventDef.responding_faction ?? playerFaction,
  };
  for (const key of [
    'narrative',
    'category',
    'situation',
    'staff_assessment',
    'historical_source',
    'source_note',
    'source',
    'requires_player_response',
    'historical_default_response_id',
    'staff_recommended_response_id',
    'notifications_to_other_factions',
  ]) {
    if (eventDef[key] != null) decision[key] = eventDef[key];
  }
  if (Array.isArray(eventDef.trigger_evidence) && eventDef.trigger_evidence.length > 0) {
    decision.trigger_evidence = [...eventDef.trigger_evidence];
  }
  return decision;
}

function initiateStrategicPostureReviewOnState(state, playerFaction, eventDef, cost) {
  const availability = computeStrategicPostureReviewAvailability(state, playerFaction, eventDef);
  if (!availability.available) {
    return { ok: false, reason: availability.reason, error: availability.reason || 'unavailable' };
  }
  const decision = buildStrategicPostureReviewPendingDecision(
    state,
    playerFaction,
    eventDef,
    availability,
  );
  if (!decision) return { ok: false, reason: 'no_options', error: 'Failed to build strategic-posture-review decision' };

  const auth = state.military.command_authority;
  if (auth && auth.current < cost) {
    return {
      ok: false,
      reason: 'insufficient_ca',
      error: `Insufficient command authority (${auth.current}/${cost} needed)`,
    };
  }
  if (auth) {
    auth.current -= cost;
    auth.spent_this_turn = (auth.spent_this_turn ?? 0) + cost;
    auth.lifetime_spent = (auth.lifetime_spent ?? 0) + cost;
  }

  if (!state.military.pending_event_decisions) state.military.pending_event_decisions = [];
  state.military.pending_event_decisions.push(decision);
  if (!state.military.event_fire_counts) state.military.event_fire_counts = {};
  state.military.event_fire_counts[eventDef.id] = (state.military.event_fire_counts[eventDef.id] ?? 0) + 1;
  if (!state.military.event_last_fired_turn) state.military.event_last_fired_turn = {};
  state.military.event_last_fired_turn[eventDef.id] = state.meta?.turn ?? 0;

  return {
    ok: true,
    eventId: eventDef.id,
    caCost: auth ? cost : 0,
    offeredBranchIds: decision.response_options.map((option) => option.id),
  };
}

module.exports = {
  STRATEGIC_POSTURE_REVIEW_EVENT_BY_FACTION,
  strategicPostureReviewEventIdForFaction,
  computeStrategicPostureReviewAvailability,
  buildStrategicPostureReviewPendingDecision,
  initiateStrategicPostureReviewOnState,
};
