'use strict';

/** Shared deterministic gate for player-initiated authored event actions. */
function computeActionCadenceAvailability(state, eventId, eventDef) {
  const currentTurn = state?.meta?.turn ?? 0;
  const base = {
    available: false,
    reason: null,
    eventId: eventId ?? null,
    currentTurn,
    firesLeft: 0,
    maxFires: 0,
    cooldownUntil: null,
    onCooldown: false,
    nextFireNumber: 0,
  };
  if (!eventId || !eventDef) return { ...base, reason: 'no_event' };
  const actionCadence = eventDef.action_cadence;
  if (!actionCadence) return { ...base, reason: 'no_action_cadence' };

  const maxFires = actionCadence.max_fires;
  const cooldownTurns = actionCadence.cooldown_turns;
  const fireCount = state?.military?.event_fire_counts?.[eventId] ?? 0;
  const lastFired = state?.military?.event_last_fired_turn?.[eventId];
  const firesLeft = Number.isFinite(maxFires) ? Math.max(0, maxFires - fireCount) : Infinity;
  const cooldownUntil = cooldownTurns > 0 && typeof lastFired === 'number'
    ? lastFired + cooldownTurns
    : null;
  const onCooldown = cooldownUntil != null && currentTurn < cooldownUntil;
  const alreadyPending = (state?.military?.pending_event_decisions ?? [])
    .some((decision) => decision?.event_id === eventId);
  const out = {
    ...base,
    firesLeft: Number.isFinite(firesLeft) ? firesLeft : maxFires,
    maxFires: Number.isFinite(maxFires) ? maxFires : 0,
    cooldownUntil,
    onCooldown,
    nextFireNumber: fireCount + 1,
  };
  if (alreadyPending) return { ...out, reason: 'already_pending' };
  if (firesLeft <= 0) return { ...out, reason: 'exhausted' };
  if (onCooldown) return { ...out, reason: 'on_cooldown' };
  return { ...out, available: true };
}

/** Preserve authored order while exposing only options reached by this fire. */
function responseOptionsForFire(responseOptions, nextFireNumber) {
  return (responseOptions ?? []).filter((option) => {
    const availableFrom = option?.available_from_fire;
    return availableFrom == null || (
      Number.isInteger(availableFrom)
      && availableFrom > 0
      && nextFireNumber >= availableFrom
    );
  });
}

module.exports = { computeActionCadenceAvailability, responseOptionsForFire };
