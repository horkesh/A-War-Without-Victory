'use strict';

// STOP-OP staging contract (Presidential Command Model slice 1/N).
//
// Pure, side-effect-scoped staging logic for the `stage-op-halt-order` IPC
// handler (electron-main.cjs). Mirrors author_op_staging.cjs exactly, but for
// HALTING a live operation rather than authoring a new one:
//   - player-faction ownership restriction (corps_not_owned_by_player)
//   - confirm a matching LIVE op exists in cc.active_operations (op_not_found)
//   - reject a duplicate halt already staged (pending_op_halt_exists)
//   - command-authority guard + debit (insufficient_command_authority)
//   - stages cc.pending_op_halt (NEVER mutates active_operations here)
//
// The MECHANICAL halt (release commander → remove op → record) happens engine-side
// in the `apply-op-halts` war-phase step, which consumes pending_op_halt once. The
// political-consequence dimension (patron_confidence gain etc.) is a deliberate
// FOLLOW-UP, NOT this slice — nothing here touches any dimension/consequence state.
//
// Mutates `state` in place (debits CA, sets pending_op_halt). Returns { ok: true }
// on success or { ok: false, error } on rejection. On ANY rejection the function
// performs NO mutation (no CA debit, nothing staged).

const { STOP_OP_COST } = require('./autonomy_ipc_contract.cjs');

/**
 * Validate the op-halt payload shape. Returns an error string or null.
 * Requires corpsId and at least one of opId / opName to identify the live op.
 * @param {any} payload
 */
function validateOpHaltPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid_payload';
  if (typeof payload.corpsId !== 'string' || payload.corpsId.length === 0) return 'invalid_payload';
  const hasId = typeof payload.opId === 'string' && payload.opId.length > 0;
  const hasName = typeof payload.opName === 'string' && payload.opName.length > 0;
  if (!hasId && !hasName) return 'invalid_payload';
  return null;
}

/**
 * Find the LIVE operation matching the payload in cc.active_operations. `name` is the
 * canonical CorpsOperation identifier (CorpsOperation has no `id` field), so matching is
 * by name: prefer an explicit opName, else treat opId as a name candidate (defensive —
 * some callers pass the op's display name as opId). Returns the op or null.
 * @param {any} cc Corps command state.
 * @param {any} payload IPC payload.
 */
function findLiveOp(cc, payload) {
  const ops = cc && Array.isArray(cc.active_operations) ? cc.active_operations : [];
  if (ops.length === 0) return null;
  const opName = typeof payload.opName === 'string' && payload.opName.length > 0 ? payload.opName : null;
  const opId = typeof payload.opId === 'string' && payload.opId.length > 0 ? payload.opId : null;
  if (opName) {
    const byName = ops.find((o) => o && o.name === opName);
    if (byName) return byName;
  }
  // CorpsOperation has no id; fall back to matching opId against the op name.
  if (opId) {
    const byId = ops.find((o) => o && (o.id === opId || o.name === opId));
    if (byId) return byId;
  }
  return null;
}

/**
 * Stage a player STOP-OP halt onto state.military.corps_command[corpsId].
 * Mirrors stageAuthoredOperation: ownership check → live-op confirm → dup-halt
 * reject → CA guard+debit → stage. Mutates `state` only on success.
 *
 * @param {any} state Deserialized canonical GameState.
 * @param {any} payload IPC payload.
 * @returns {{ok:true}|{ok:false,error:string}}
 */
function stageOpHalt(state, payload) {
  const payloadError = validateOpHaltPayload(payload);
  if (payloadError) return { ok: false, error: payloadError };

  const corpsId = payload.corpsId;
  const turn = (state && state.meta && typeof state.meta.turn === 'number') ? state.meta.turn : 0;

  // Resolve the corps command entry on military.corps_command (canonical engine
  // location). Reject + debit nothing if absent.
  const cc = state && state.military && state.military.corps_command
    ? state.military.corps_command[corpsId]
    : undefined;
  if (!cc) return { ok: false, error: 'corps_not_found' };

  // Player-ownership: only the player faction may halt its own corps' ops.
  const playerFaction = (state.meta && state.meta.player_faction) ? state.meta.player_faction : null;
  const corpsFaction = (state.military.formations && state.military.formations[corpsId])
    ? state.military.formations[corpsId].faction
    : null;
  if (playerFaction && corpsFaction && corpsFaction !== playerFaction) {
    return { ok: false, error: 'corps_not_owned_by_player' };
  }

  // Confirm a matching LIVE op exists — halting nothing is a no-op order.
  const op = findLiveOp(cc, payload);
  if (!op) return { ok: false, error: 'op_not_found' };

  // Single-slot staging field: pending_op_halt holds ONE order, consumed once by
  // apply-op-halts. A second stage call before the engine consumes the first would
  // overwrite it and silently lose the already-paid order. Reject (debit nothing)
  // before the CA guard so no double-charge.
  if (cc.pending_op_halt) {
    return { ok: false, error: 'pending_op_halt_exists' };
  }

  // Command-authority guard + debit — stage nothing if unaffordable.
  const auth = state.military.command_authority;
  if (auth) {
    if (auth.current < STOP_OP_COST) {
      return { ok: false, error: `insufficient_command_authority (${auth.current}/${STOP_OP_COST})` };
    }
    auth.current -= STOP_OP_COST;
    auth.spent_this_turn += STOP_OP_COST;
    auth.lifetime_spent += STOP_OP_COST;
  }

  // Stage — the engine step consumes this once. NEVER mutate active_operations here.
  cc.pending_op_halt = {
    op_id: typeof op.id === 'string' ? op.id : undefined,
    op_name: typeof op.name === 'string' ? op.name : undefined,
    turn,
    ca_cost: STOP_OP_COST,
  };
  return { ok: true };
}

module.exports = {
  STOP_OP_COST,
  validateOpHaltPayload,
  findLiveOp,
  stageOpHalt,
};
