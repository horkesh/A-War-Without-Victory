'use strict';

// REQUEST-OP staging contract (Presidential Command Model slice 2/N).
//
// Pure, side-effect-scoped staging logic for the `stage-op-directive-order` IPC
// handler (electron-main.cjs). Mirrors op_halt.cjs exactly, but for REQUESTING an
// operation toward a strategic OBJECTIVE rather than halting a live one:
//   - player-faction ownership restriction (corps_not_owned_by_player)
//   - confirm the named corps exists (corps_not_found)
//   - reject a duplicate directive already staged (pending_op_directive_exists)
//   - command-authority guard + debit (insufficient_command_authority)
//   - stages cc.pending_op_directive (NEVER mutates active_operations here)
//
// The president names ONLY a target OSID. The MECHANICAL build (auto-select the
// force + an axis/staging toward the target, validate, inject the CorpsOperation)
// happens engine-side in the `inject-op-directive` war-phase step, which consumes
// pending_op_directive once. The president does NOT pick brigades or axes — that is
// the commander's domain. The political-consequence dimension (patron_confidence
// etc.) is a deliberate FOLLOW-UP, NOT this slice.
//
// Mutates `state` in place (debits CA, sets pending_op_directive). Returns
// { ok: true } on success or { ok: false, error } on rejection. On ANY rejection the
// function performs NO mutation (no CA debit, nothing staged).

const { REQUEST_OP_COST } = require('./autonomy_ipc_contract.cjs');

/**
 * Validate the op-directive payload shape. Returns an error string or null.
 * Requires corpsId and a non-empty targetOsid.
 * @param {any} payload
 */
function validateOpDirectivePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid_payload';
  if (typeof payload.corpsId !== 'string' || payload.corpsId.length === 0) return 'invalid_payload';
  if (typeof payload.targetOsid !== 'string' || payload.targetOsid.length === 0) return 'invalid_payload';
  return null;
}

/**
 * Stage a player REQUEST-OP directive onto state.military.corps_command[corpsId].
 * Mirrors stageOpHalt: ownership check → corps-exists → dup-directive reject → CA
 * guard+debit → stage. Mutates `state` only on success.
 *
 * @param {any} state Deserialized canonical GameState.
 * @param {any} payload IPC payload { corpsId, targetOsid }.
 * @returns {{ok:true}|{ok:false,error:string}}
 */
function stageOpDirective(state, payload) {
  const payloadError = validateOpDirectivePayload(payload);
  if (payloadError) return { ok: false, error: payloadError };

  const corpsId = payload.corpsId;
  const targetOsid = payload.targetOsid;
  const turn = (state && state.meta && typeof state.meta.turn === 'number') ? state.meta.turn : 0;

  // Resolve the corps command entry on military.corps_command (canonical engine
  // location). Reject + debit nothing if absent.
  const cc = state && state.military && state.military.corps_command
    ? state.military.corps_command[corpsId]
    : undefined;
  if (!cc) return { ok: false, error: 'corps_not_found' };

  // Player-ownership: only the player faction may direct its own corps.
  const playerFaction = (state.meta && state.meta.player_faction) ? state.meta.player_faction : null;
  const corpsFaction = (state.military.formations && state.military.formations[corpsId])
    ? state.military.formations[corpsId].faction
    : null;
  if (playerFaction && corpsFaction && corpsFaction !== playerFaction) {
    return { ok: false, error: 'corps_not_owned_by_player' };
  }

  // Single-slot staging field: pending_op_directive holds ONE order, consumed once by
  // inject-op-directive. A second stage call before the engine consumes the first would
  // overwrite it and silently lose the already-paid order. Reject (debit nothing) before
  // the CA guard so no double-charge.
  if (cc.pending_op_directive) {
    return { ok: false, error: 'pending_op_directive_exists' };
  }

  // Command-authority guard + debit — stage nothing if unaffordable.
  const auth = state.military.command_authority;
  if (auth) {
    if (auth.current < REQUEST_OP_COST) {
      return { ok: false, error: `insufficient_command_authority (${auth.current}/${REQUEST_OP_COST})` };
    }
    auth.current -= REQUEST_OP_COST;
    auth.spent_this_turn += REQUEST_OP_COST;
    auth.lifetime_spent += REQUEST_OP_COST;
  }

  // Stage — the engine step consumes this once. NEVER mutate active_operations here.
  // `forced_over_objection` is set ONLY when the UI confirmed past a shown commander
  // objection (queryDirectiveObjection recommendedAction !== 'launch'); the engine
  // consume step then tags the op was_force_launched + records a presidential override
  // on the CO. Default false (a plain request, no objection shown).
  cc.pending_op_directive = {
    target_osid: targetOsid,
    turn,
    ca_cost: REQUEST_OP_COST,
    ...(payload.forced_over_objection === true ? { forced_over_objection: true } : {}),
  };
  return { ok: true };
}

module.exports = {
  REQUEST_OP_COST,
  validateOpDirectivePayload,
  stageOpDirective,
};
