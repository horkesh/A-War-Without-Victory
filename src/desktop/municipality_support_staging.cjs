'use strict';

const VALID_FACTIONS = ['RS', 'RBiH', 'HRHB'];
const SUPPORT_TYPE_BY_FACTION = {
  RBiH: 'weapons_shipment',
  RS: 'staff_priority',
  HRHB: 'croatian_support_package',
};

function validatePayload(payload) {
  const { faction, munId, type } = payload || {};
  if (typeof faction !== 'string' || typeof munId !== 'string' || typeof type !== 'string') {
    return { ok: false, error: 'No game loaded or invalid payload' };
  }
  if (!VALID_FACTIONS.includes(faction)) {
    return { ok: false, error: `Invalid faction: ${faction}` };
  }
  if (SUPPORT_TYPE_BY_FACTION[faction] !== type) {
    return { ok: false, error: `Invalid municipality support type for ${faction}: ${type}` };
  }
  return { ok: true };
}

function stageMunicipalitySupportOrderOnState(state, payload) {
  const payloadResult = validatePayload(payload);
  if (!payloadResult.ok) return payloadResult;

  const { faction, munId, type } = payload;
  const playerFaction = state && state.meta ? state.meta.player_faction : undefined;
  if (playerFaction && playerFaction !== faction) {
    return { ok: false, error: 'Can only stage municipality support for the current player faction' };
  }

  const pools = state && state.military && state.military.militia_pools && typeof state.military.militia_pools === 'object'
    ? state.military.militia_pools
    : {};
  const hasPool = Object.values(pools).some((pool) => pool && pool.mun_id === munId && pool.faction === faction);
  if (!hasPool) {
    return { ok: false, error: `No ${faction} militia pool found for municipality ${munId}` };
  }

  if (!state.military.municipality_support_orders || typeof state.military.municipality_support_orders !== 'object') {
    state.military.municipality_support_orders = {};
  }
  state.military.municipality_support_orders[faction] = {
    faction,
    mun_id: munId,
    type,
    staged_turn: (state.meta && typeof state.meta.turn === 'number') ? state.meta.turn : 0,
  };
  return { ok: true };
}

module.exports = {
  VALID_FACTIONS,
  SUPPORT_TYPE_BY_FACTION,
  validatePayload,
  stageMunicipalitySupportOrderOnState,
};
