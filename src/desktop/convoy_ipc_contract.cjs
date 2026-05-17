'use strict';

const VALID_CONVOY_DECISIONS = new Set(['allow', 'block', 'divert']);

function stageConvoyDecisionOnState(state, convoyId, decision) {
  if (!state || typeof convoyId !== 'string' || typeof decision !== 'string') {
    return { ok: false, error: 'No game loaded or invalid payload' };
  }
  if (!VALID_CONVOY_DECISIONS.has(decision)) {
    return { ok: false, error: 'Invalid decision' };
  }
  if (!state.military || typeof state.military !== 'object') {
    state.military = {};
  }

  const pending = Array.isArray(state.military.pending_convoy_decisions)
    ? [...state.military.pending_convoy_decisions]
    : [];
  let found = false;
  state.military.pending_convoy_decisions = pending.map((convoy) => {
    if (convoy?.id !== convoyId) return convoy;
    found = true;
    return { ...convoy, decision };
  });

  if (!found) return { ok: false, error: 'Convoy not found' };
  return { ok: true };
}

module.exports = { stageConvoyDecisionOnState, VALID_CONVOY_DECISIONS };
