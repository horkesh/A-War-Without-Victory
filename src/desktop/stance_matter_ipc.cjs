'use strict';

/**
 * Stance matters (posture model option 2): the desktop side records the president's
 * answer only. The war pipeline step `resolve-stance-matters` is the single owner of
 * every consequence (hold, cost, receipt). Mirrors the accept-proposal / OPPORTUNITY
 * pattern: IPC writes intent, the sim consumes it next turn.
 *
 * Plan: docs/plans/2026-11-12-posture-model-option2-stance-matters.md (rev 3).
 * The handler runs under the pause-aware IPC mutex, so it is refused while a turn is
 * paused before combat (ipc_mutation_policy.cjs).
 */

const ANSWERS = new Set(['confirm', 'countermand', 'constrain']);

/**
 * Validate and record an answer on an open stance matter, in place.
 * @param {object} state Raw canonical GameState (mutated on success).
 * @param {{ matterId?: unknown, answer?: unknown, constraint?: unknown }} payload
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function recordStanceMatterAnswer(state, payload) {
  const meta = state && state.meta;
  if (!meta) return { ok: false, error: 'no_state' };
  const playerFaction = meta.player_faction ?? null;
  if (!playerFaction) return { ok: false, error: 'no_player_faction' };
  // Red-team condition 6: answers are taken only at autonomy 2, where matters exist.
  if (meta.autonomy_level !== 2) return { ok: false, error: 'autonomy_level_not_2' };
  const matterId = payload && typeof payload.matterId === 'string' ? payload.matterId : '';
  const answer = payload && typeof payload.answer === 'string' ? payload.answer : '';
  if (!matterId) return { ok: false, error: 'missing_matter_id' };
  if (!ANSWERS.has(answer)) return { ok: false, error: 'invalid_answer' };
  const matters = Array.isArray(meta.stance_matters) ? meta.stance_matters : [];
  const matter = matters.find((row) => row && row.id === matterId);
  if (!matter) return { ok: false, error: 'not_found' };
  if (matter.faction !== playerFaction) return { ok: false, error: 'wrong_faction' };
  if (typeof meta.turn === 'number' && typeof matter.deadline_turn === 'number' && meta.turn > matter.deadline_turn) {
    return { ok: false, error: 'deadline_passed' };
  }
  if (answer !== 'confirm' && matter.countermand_allowed !== true) {
    return { ok: false, error: 'overrule_window' };
  }
  if (answer === 'constrain') {
    const constraint = payload && typeof payload.constraint === 'string' ? payload.constraint : '';
    const options = Array.isArray(matter.constraint_options) ? matter.constraint_options : [];
    if (!options.includes(constraint)) return { ok: false, error: 'invalid_constraint' };
    matter.constraint = constraint;
  } else {
    delete matter.constraint;
  }
  // The president may change his answer until the deadline; the last one counts.
  matter.answer = answer;
  matter.answered_turn = meta.turn;
  return { ok: true };
}

module.exports = { recordStanceMatterAnswer };
