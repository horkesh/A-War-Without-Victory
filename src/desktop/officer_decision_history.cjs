'use strict';

function strictCompare(a, b) {
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function asTurn(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function replacementMatterKey(event, details) {
  if ((event.type ?? event.event_type) !== 'replacement_suggested') return null;
  const outgoingOfficerId = details.outgoing_officer_id ?? event.outgoing_officer_id ?? event.current_commander_id;
  const corpsId = event.corps_id;
  const proposedSuccessorId = details.new_officer_id ?? event.new_officer_id ?? event.officer_id;
  if (![outgoingOfficerId, corpsId, proposedSuccessorId].every((value) => typeof value === 'string' && value.length > 0)) {
    return null;
  }
  return `replacement:${outgoingOfficerId}:${corpsId}:${proposedSuccessorId}`;
}

function fileOfficerDecisionRecord(state, event, decision, details = {}) {
  if (!state || !event || !state.military) return;
  if (typeof event.event_id !== 'string' || typeof event.faction !== 'string' || typeof event.officer_id !== 'string') {
    return;
  }
  if (!['acknowledged', 'override_confirmed', 'replacement_accepted'].includes(decision)) {
    return;
  }

  const turn = asTurn(event.turn);
  const matterKey = replacementMatterKey(event, details);
  const record = {
    id: `officer:${turn}:${event.event_id}:${decision}`,
    turn,
    faction: event.faction,
    event_id: event.event_id,
    event_type: String(event.type ?? 'officer_event'),
    officer_id: event.officer_id,
    ...(typeof event.current_commander_id === 'string' ? { current_commander_id: event.current_commander_id } : {}),
    ...(typeof event.corps_id === 'string' ? { corps_id: event.corps_id } : {}),
    decision,
    ...(typeof details.new_officer_id === 'string' ? { new_officer_id: details.new_officer_id } : {}),
    ...(typeof details.outgoing_officer_id === 'string' ? { outgoing_officer_id: details.outgoing_officer_id } : {}),
    ...(matterKey ? { matter_key: matterKey } : {}),
  };

  const existing = Array.isArray(state.military.officer_decision_history)
    ? state.military.officer_decision_history.filter((entry) => (
      entry
      && entry.id !== record.id
      && (!matterKey || replacementMatterKey(entry, entry) !== matterKey)
    ))
    : [];
  existing.push(record);
  existing.sort((a, b) => {
    const turnDelta = asTurn(a.turn) - asTurn(b.turn);
    return turnDelta || strictCompare(a.id, b.id);
  });
  state.military.officer_decision_history = existing;
}

module.exports = {
  fileOfficerDecisionRecord,
};
