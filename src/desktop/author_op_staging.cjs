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

function strictCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function currentOperationObjectiveForBrigade(operation, brigadeId) {
  const axes = Array.isArray(operation.axes) ? operation.axes : [];
  if (axes.length > 0) {
    const axis = axes.find((candidate) => (
      Array.isArray(candidate && candidate.assigned_brigades)
      && candidate.assigned_brigades.includes(brigadeId)
    ));
    if (!axis || axis.status !== 'executing') return null;
    const index = Number.isInteger(axis.current_objective_index)
      ? axis.current_objective_index
      : 0;
    const objective = Array.isArray(axis.objectives) ? axis.objectives[index] : null;
    return typeof objective === 'string' && objective.length > 0 ? objective : null;
  }

  const index = Number.isInteger(operation.current_objective_index)
    ? operation.current_objective_index
    : 0;
  const objectives = Array.isArray(operation.objectives)
    ? operation.objectives
    : operation.target_settlements;
  const objective = Array.isArray(objectives) ? objectives[index] : null;
  return typeof objective === 'string' && objective.length > 0 ? objective : null;
}

function isExecutingOperationAttack(state, brigadeId, targetSettlementId) {
  const corpsCommand = state.military && state.military.corps_command;
  if (!corpsCommand || typeof corpsCommand !== 'object') return false;

  for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
    const operations = corpsCommand[corpsId] && corpsCommand[corpsId].active_operations;
    if (!Array.isArray(operations)) continue;
    for (const operation of operations) {
      if (!operation || operation.phase !== 'execution') continue;
      if (!Array.isArray(operation.participating_brigades)
        || !operation.participating_brigades.includes(brigadeId)) continue;
      if (currentOperationObjectiveForBrigade(operation, brigadeId) === targetSettlementId) {
        return true;
      }
    }
  }
  return false;
}

function isValidCounterattack(state, formation, targetSettlementId) {
  const currentTurn = state.meta && state.meta.turn;
  const retreat = formation.last_retreat_from;
  return Number.isInteger(currentTurn)
    && currentTurn >= 1
    && retreat
    && retreat.osid === targetSettlementId
    && retreat.turn === currentTurn - 1
    && (formation.disrupted_turns ?? 0) === 0
    && formation.disrupted !== true;
}

/**
 * Stage a desktop attack only when it is backed by canon-authorized state.
 * Rejections are mutation-free; successful orders live in the canonical
 * military ledger consumed by attack resolution.
 *
 * @param {any} state Deserialized canonical GameState.
 * @param {any} payload Desktop IPC payload.
 * @returns {{ok:true,authorization:'operation'|'counterattack'}|{ok:false,error:string}}
 */
function stageCanonAttackOrder(state, payload) {
  const brigadeId = payload && payload.brigadeId;
  const targetSettlementId = payload && payload.targetSettlementId;
  if (typeof brigadeId !== 'string' || brigadeId.length === 0
    || typeof targetSettlementId !== 'string' || targetSettlementId.length === 0) {
    return { ok: false, error: 'invalid_payload' };
  }

  const military = state && state.military;
  const formations = military && military.formations;
  const formation = formations && formations[brigadeId];
  if (!formation) return { ok: false, error: 'brigade_not_found' };
  if ((formation.kind ?? 'brigade') !== 'brigade') {
    return { ok: false, error: 'invalid_brigade' };
  }
  if (formation.status !== 'active') {
    return { ok: false, error: 'brigade_not_active' };
  }
  if (typeof formation.location_osid !== 'string' || formation.location_osid.length === 0) {
    return { ok: false, error: 'brigade_not_located' };
  }

  const playerFaction = state && state.meta && state.meta.player_faction;
  if (typeof playerFaction !== 'string' || playerFaction.length === 0) {
    return { ok: false, error: 'player_faction_not_set' };
  }
  if (formation.faction !== playerFaction) {
    return { ok: false, error: 'brigade_not_owned_by_player' };
  }

  const controllers = state && state.political && state.political.political_controllers;
  if (!controllers || typeof controllers !== 'object'
    || !Object.prototype.hasOwnProperty.call(controllers, targetSettlementId)) {
    return { ok: false, error: 'target_not_found' };
  }
  if (controllers[targetSettlementId] === formation.faction) {
    return { ok: false, error: 'target_not_hostile' };
  }

  let authorization = null;
  if (isExecutingOperationAttack(state, brigadeId, targetSettlementId)) {
    authorization = 'operation';
  } else if (isValidCounterattack(state, formation, targetSettlementId)) {
    authorization = 'counterattack';
  }
  if (!authorization) {
    return { ok: false, error: 'attack_not_canon_authorized' };
  }

  if (!military.brigade_attack_orders || typeof military.brigade_attack_orders !== 'object') {
    military.brigade_attack_orders = {};
  }
  military.brigade_attack_orders[brigadeId] = targetSettlementId;
  return { ok: true, authorization };
}

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
  stageCanonAttackOrder,
};
