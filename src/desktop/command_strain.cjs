'use strict';

/**
 * Command Strain — CJS helper for Electron main process.
 *
 * Mirrors the numeric strain formula used at two IPC handler sites in
 * electron-main.cjs (stage-corps-stance-order gate + stabilize-command-relationship).
 * Extracted verbatim to a single owner so both sites cannot drift.
 *
 * Source of truth (semantics): src/ui/map/data/command_strain.ts
 * NOTE: The UI TS canonical adds a third strain source (corps exhaustion) which
 * the CJS IPC sites historically do NOT apply. This helper preserves the CJS
 * behavior (Sources 1+2 only — force launches + unresolved friction events).
 * If and when the CJS handlers need Source 3 parity, extend this helper in ONE
 * place; do not resurrect inline duplication.
 *
 * Determinism: sorted corps ops by name, sorted officer IDs, per-officer
 * sorted friction events by turn. Addition is commutative so the final
 * total is invariant to iteration order, but sorts are preserved to match
 * the pre-extraction behavior exactly.
 */

const FORCE_LAUNCH_STRAIN = 3;
const FRICTION_EVENT_STRAIN = 2;
const DECAY_PER_TURN = 1;
const COMPROMISED_THRESHOLD = 6;

/**
 * Compute command strain for a corps from raw CJS-deserialized state.
 *
 * @param {object} state - Raw GameState (deserialized). Reads `state.corps_command`
 *                         and `state.military.{friction_events, named_officers}`.
 * @param {string} corpsId - Corps formation id.
 * @param {number} currentTurn - Turn index used for decay (typically state.meta.turn).
 * @returns {{ totalStrain: number, isCompromised: boolean }}
 *          totalStrain is floored at 0 and rounded; isCompromised is
 *          totalStrain >= COMPROMISED_THRESHOLD (6).
 */
function computeCorpsCommandStrain(state, corpsId, currentTurn) {
  let totalStrain = 0;

  // ── Source 1: force-launched active operations on this corps ──────────
  const corpsCmd = state && state.corps_command ? state.corps_command[corpsId] : undefined;
  if (corpsCmd) {
    const activeOps = [...(corpsCmd.active_operations || [])].sort((a, b) => a.name.localeCompare(b.name));
    for (const op of activeOps) {
      if (op.was_force_launched !== true) continue;
      const launchTurn = op.started_turn != null ? op.started_turn : currentTurn;
      const turnAge = Math.max(0, currentTurn - launchTurn);
      totalStrain += Math.max(0, FORCE_LAUNCH_STRAIN - turnAge * DECAY_PER_TURN);
    }
  }

  // ── Source 2: unresolved friction events for this corps's commander ───
  const military = (state && state.military) || {};
  const frictionEvents = military.friction_events || [];
  const namedOfficers = military.named_officers || {};
  const officerIds = Object.keys(namedOfficers).sort();
  for (const officerId of officerIds) {
    const os = namedOfficers[officerId];
    if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
    const officerEvents = frictionEvents
      .filter(e => e.officer_id === officerId && !e.resolved)
      .sort((a, b) => a.turn - b.turn);
    for (const event of officerEvents) {
      const turnAge = Math.max(0, currentTurn - event.turn);
      totalStrain += Math.max(0, FRICTION_EVENT_STRAIN - turnAge * DECAY_PER_TURN);
    }
  }

  const rounded = Math.max(0, Math.round(totalStrain));
  return {
    totalStrain: rounded,
    isCompromised: rounded >= COMPROMISED_THRESHOLD,
  };
}

module.exports = {
  computeCorpsCommandStrain,
  FORCE_LAUNCH_STRAIN,
  FRICTION_EVENT_STRAIN,
  DECAY_PER_TURN,
  COMPROMISED_THRESHOLD,
};
