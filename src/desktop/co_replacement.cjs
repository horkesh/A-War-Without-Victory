'use strict';

// REPLACE-CO staging contract (Presidential Command Model slice 3/N).
//
// Pure, side-effect-scoped staging logic for the `stage-co-replacement-order` IPC
// handler (electron-main.cjs). Mirrors op_halt.cjs exactly, but for SACKING a corps's
// commanding officer and installing a replacement:
//   - player-faction ownership restriction (corps_not_owned_by_player)
//   - confirm the corps HAS a current named CO (no_current_co)
//   - pick/validate a replacement from the reserve pool — accept an explicit
//     replacement_officer_id from the payload or auto-pick the best reserve officer
//     (replacement_not_in_reserve / no_reserve_officer_available)
//   - reject a duplicate replacement already staged (pending_co_replacement_exists)
//   - command-authority guard + debit (insufficient_command_authority)
//   - stages cc.pending_co_replacement (NEVER mutates named_officers here)
//
// The MECHANICAL sacking (retire CO → install replacement → morale hit → record)
// happens engine-side in the `apply-co-replacements` war-phase step, which consumes
// pending_co_replacement once via relieveOfficer. The cohesion-dimension cost is also
// applied engine-side. Nothing here touches officer state or any dimension.
//
// Mutates `state` in place (debits CA, sets pending_co_replacement). Returns { ok:true }
// on success or { ok:false, error } on rejection. On ANY rejection the function performs
// NO mutation (no CA debit, nothing staged).

const { REPLACE_CO_COST } = require('./autonomy_ipc_contract.cjs');

/**
 * Validate the co-replacement payload shape. Returns an error string or null.
 * Requires corpsId; replacementOfficerId is OPTIONAL (auto-pick when omitted).
 * @param {any} payload
 */
function validateCoReplacementPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'invalid_payload';
  if (typeof payload.corpsId !== 'string' || payload.corpsId.length === 0) return 'invalid_payload';
  if (payload.replacementOfficerId !== undefined
    && (typeof payload.replacementOfficerId !== 'string' || payload.replacementOfficerId.length === 0)) {
    return 'invalid_payload';
  }
  return null;
}

/**
 * Find the named officer currently commanding `corpsId` (status active + assigned).
 * Mirrors getCorpsCommander (officer_system.ts) — sorted iteration for determinism.
 * Returns the officer id or null.
 * @param {any} military state.military
 * @param {string} corpsId
 */
function findCurrentCommanderId(military, corpsId) {
  const officers = military && typeof military.named_officers === 'object' ? military.named_officers : null;
  if (!officers) return null;
  const ids = Object.keys(officers).sort();
  for (const id of ids) {
    const os = officers[id];
    if (os && os.status === 'active' && os.assigned_corps_id === corpsId) return id;
  }
  return null;
}

/**
 * Resolve a reserve replacement officer for `corpsId` (faction `faction`). If
 * `requestedId` is provided, validate it is a same-faction corps_commander currently
 * in reserve. Otherwise auto-pick the best reserve candidate using the SAME priority
 * relieveOfficer uses (home-corps first, then pool tier, then competence, then id) so
 * the staging preview matches what the engine will actually install. Returns
 * { id } on success or { error } on failure.
 *
 * @param {any} military state.military
 * @param {string} corpsId
 * @param {string} faction corps faction
 * @param {string|undefined} requestedId explicit replacement officer id (optional)
 */
function resolveReplacement(military, corpsId, faction, requestedId) {
  const officers = military && typeof military.named_officers === 'object' ? military.named_officers : {};
  const officerData = Array.isArray(military && military.named_officer_data) ? military.named_officer_data : [];

  // Explicit pick — validate it is a same-faction corps_commander in reserve.
  if (requestedId) {
    const data = officerData.find((o) => o && o.id === requestedId);
    const os = officers[requestedId];
    if (!data || data.faction !== faction || data.rank !== 'corps_commander'
      || !os || os.status !== 'reserve') {
      return { error: 'replacement_not_in_reserve' };
    }
    return { id: requestedId };
  }

  // Auto-pick — mirror relieveOfficer candidate ordering exactly.
  const TIER_PRIORITY = { starter: 0, tier_a: 1, tier_b: 2, tier_c: 3 };
  const candidates = officerData
    .filter((o) =>
      o
      && o.faction === faction
      && o.rank === 'corps_commander'
      && officers[o.id]
      && officers[o.id].status === 'reserve'
    )
    .sort((a, b) => {
      const aHome = a.home_corps_id === corpsId ? 0 : 1;
      const bHome = b.home_corps_id === corpsId ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
      const aTier = TIER_PRIORITY[a.pool_tier] ?? 99;
      const bTier = TIER_PRIORITY[b.pool_tier] ?? 99;
      if (aTier !== bTier) return aTier - bTier;
      if (a.competence !== b.competence) return b.competence - a.competence;
      return a.id.localeCompare(b.id);
    });

  if (candidates.length === 0) return { error: 'no_reserve_officer_available' };
  return { id: candidates[0].id };
}

/**
 * Stage a player REPLACE-CO order onto state.military.corps_command[corpsId].
 * Mirrors stageOpHalt: ownership check → current-CO confirm → replacement resolve →
 * dup reject → CA guard+debit → stage. Mutates `state` only on success.
 *
 * @param {any} state Deserialized canonical GameState.
 * @param {any} payload IPC payload ({ corpsId, replacementOfficerId? }).
 * @returns {{ok:true, replacementOfficerId:string}|{ok:false,error:string}}
 */
function stageCoReplacement(state, payload) {
  const payloadError = validateCoReplacementPayload(payload);
  if (payloadError) return { ok: false, error: payloadError };

  const corpsId = payload.corpsId;
  const turn = (state && state.meta && typeof state.meta.turn === 'number') ? state.meta.turn : 0;

  const cc = state && state.military && state.military.corps_command
    ? state.military.corps_command[corpsId]
    : undefined;
  if (!cc) return { ok: false, error: 'corps_not_found' };

  // Player-ownership: only the player faction may sack its own corps' CO.
  const playerFaction = (state.meta && state.meta.player_faction) ? state.meta.player_faction : null;
  const corpsFaction = (state.military.formations && state.military.formations[corpsId])
    ? state.military.formations[corpsId].faction
    : null;
  if (playerFaction && corpsFaction && corpsFaction !== playerFaction) {
    return { ok: false, error: 'corps_not_owned_by_player' };
  }

  // Confirm a current named CO exists — sacking nothing is a no-op order.
  const currentCoId = findCurrentCommanderId(state.military, corpsId);
  if (!currentCoId) return { ok: false, error: 'no_current_co' };

  // Resolve the replacement (explicit pick or auto-pick) from the reserve pool. The
  // faction is the CO's faction (== corps faction); fall back to corpsFaction.
  const coData = Array.isArray(state.military.named_officer_data)
    ? state.military.named_officer_data.find((o) => o && o.id === currentCoId)
    : null;
  const faction = (coData && coData.faction) || corpsFaction;
  if (!faction) return { ok: false, error: 'corps_not_found' };
  const resolution = resolveReplacement(state.military, corpsId, faction, payload.replacementOfficerId);
  if (resolution.error) return { ok: false, error: resolution.error };

  // Single-slot staging field: reject a second stage before the engine consumes the
  // first (would overwrite + silently lose the already-paid order). Reject before the
  // CA guard so no double-charge.
  if (cc.pending_co_replacement) {
    return { ok: false, error: 'pending_co_replacement_exists' };
  }

  // Command-authority guard + debit — stage nothing if unaffordable.
  const auth = state.military.command_authority;
  if (auth) {
    if (auth.current < REPLACE_CO_COST) {
      return { ok: false, error: `insufficient_command_authority (${auth.current}/${REPLACE_CO_COST})` };
    }
    auth.current -= REPLACE_CO_COST;
    auth.spent_this_turn += REPLACE_CO_COST;
    auth.lifetime_spent += REPLACE_CO_COST;
  }

  // Stage — the engine step consumes this once. NEVER mutate named_officers here.
  cc.pending_co_replacement = {
    replacement_officer_id: resolution.id,
    turn,
    ca_cost: REPLACE_CO_COST,
  };
  return { ok: true, replacementOfficerId: resolution.id };
}

module.exports = {
  REPLACE_CO_COST,
  validateCoReplacementPayload,
  findCurrentCommanderId,
  resolveReplacement,
  stageCoReplacement,
};
