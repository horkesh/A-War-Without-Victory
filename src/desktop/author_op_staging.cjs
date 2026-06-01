'use strict';

// Author-new-op staging contract (Free War Phase 4, #67).
//
// Pure, side-effect-scoped staging logic for the `stage-corps-operation-order`
// IPC handler (electron-main.cjs). Extracted so the canon-safety contract can be
// unit-tested without the Electron closure:
//   - player-faction ownership restriction (corps_not_owned_by_player)
//   - command-authority guard + debit (insufficient_command_authority)
//   - stages cc.pending_authored_op (NEVER active_operations.push)
//
// Rich validation (objective ownership, staging adjacency, attack-floor, slot,
// brigade double-commit) is NOT done here — the CJS/ESM boundary forbids the TS
// operation factories. It happens engine-side in the `inject-authored-operations`
// war-phase step, which consumes pending_authored_op once.
//
// Mutates `state` in place (debits CA, sets pending_authored_op). Returns
// { ok: true } on success or { ok: false, error } on rejection. On any rejection
// the function performs NO mutation (no CA debit, nothing staged).

const { AUTHOR_OP_COST } = require('./autonomy_ipc_contract.cjs');

const VALID_OP_TYPES = ['general_offensive', 'sector_attack', 'strategic_defense', 'reorganization', 'feint', 'probe'];

/**
 * Validate the author-op payload shape. Returns an error string or null.
 * @param {any} payload
 */
function validateAuthorOpPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid_payload';
  if (typeof payload.corpsId !== 'string' || payload.corpsId.length === 0) return 'invalid_payload';
  if (typeof payload.name !== 'string' || payload.name.length === 0) return 'invalid_payload';
  if (typeof payload.type !== 'string') return 'invalid_payload';
  if (!VALID_OP_TYPES.includes(payload.type)) return `Invalid operation type: ${payload.type}`;
  return null;
}

/**
 * Build the AuthoredOpDef from a payload (no validation — call validateAuthorOpPayload first).
 * @param {any} payload
 */
function buildAuthoredOpDef(payload) {
  const p = payload || {};
  return {
    corps_id: p.corpsId,
    name: p.name,
    type: p.type,
    objectives: Array.isArray(p.objectives) ? p.objectives : [],
    axes: Array.isArray(p.axes) ? p.axes : undefined,
    participating_brigades: Array.isArray(p.participatingBrigades) ? p.participatingBrigades : [],
    sector_id: typeof p.sectorId === 'string' ? p.sectorId : undefined,
    staging_osid: typeof p.stagingOsid === 'string' ? p.stagingOsid : undefined,
    target_settlements: Array.isArray(p.targetSettlements) ? p.targetSettlements : [],
    tempo: typeof p.tempo === 'string' ? p.tempo : undefined,
    min_attack_outcome: typeof p.minAttackOutcome === 'string' ? p.minAttackOutcome : undefined,
    schwerpunkt_osid: typeof p.schwerpunktOsid === 'string' ? p.schwerpunktOsid : undefined,
    artillery_preparation: p.artilleryPreparation === true,
    planning_duration: typeof p.planningDuration === 'number' ? p.planningDuration : undefined,
  };
}

/**
 * Stage a player-authored operation onto state.military.corps_command[corpsId].
 * Mirrors proactive-force-launch-op: ownership check → CA guard+debit → stage.
 * Mutates `state` only on success.
 *
 * @param {any} state Deserialized canonical GameState.
 * @param {any} payload IPC payload.
 * @returns {{ok:true}|{ok:false,error:string}}
 */
function stageAuthoredOperation(state, payload) {
  const payloadError = validateAuthorOpPayload(payload);
  if (payloadError) return { ok: false, error: payloadError };

  const corpsId = payload.corpsId;
  const turn = (state && state.meta && typeof state.meta.turn === 'number') ? state.meta.turn : 0;

  // Resolve the corps command entry on military.corps_command (canonical engine
  // location). Reject + debit nothing if absent.
  const cc = state && state.military && state.military.corps_command
    ? state.military.corps_command[corpsId]
    : undefined;
  if (!cc) return { ok: false, error: 'corps_not_found' };

  // Player-ownership: only the player faction may author for its own corps.
  const playerFaction = (state.meta && state.meta.player_faction) ? state.meta.player_faction : null;
  const corpsFaction = (state.military.formations && state.military.formations[corpsId])
    ? state.military.formations[corpsId].faction
    : null;
  if (playerFaction && corpsFaction && corpsFaction !== playerFaction) {
    return { ok: false, error: 'corps_not_owned_by_player' };
  }

  // Single-slot staging field: pending_authored_op holds ONE order, consumed
  // once by inject-authored-operations. A second stage call before the engine
  // consumes the first would overwrite it and silently lose the already-paid
  // order. Reject (debit nothing) before the CA guard so no double-charge.
  if (cc.pending_authored_op) {
    return { ok: false, error: 'pending_authored_op_exists' };
  }

  // Command-authority guard + debit — stage nothing if unaffordable.
  const auth = state.military.command_authority;
  if (auth) {
    if (auth.current < AUTHOR_OP_COST) {
      return { ok: false, error: `insufficient_command_authority (${auth.current}/${AUTHOR_OP_COST})` };
    }
    auth.current -= AUTHOR_OP_COST;
    auth.spent_this_turn += AUTHOR_OP_COST;
    auth.lifetime_spent += AUTHOR_OP_COST;
  }

  // Stage — the engine step consumes this once. NEVER push to active_operations.
  cc.pending_authored_op = { def: buildAuthoredOpDef(payload), turn, ca_cost: AUTHOR_OP_COST };
  return { ok: true };
}

module.exports = {
  VALID_OP_TYPES,
  AUTHOR_OP_COST,
  validateAuthorOpPayload,
  buildAuthoredOpDef,
  stageAuthoredOperation,
};
