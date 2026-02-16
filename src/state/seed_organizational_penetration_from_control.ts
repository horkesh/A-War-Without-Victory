/**
 * Seed organizational_penetration from current political_controllers (harness/scenario).
 * When a scenario loads init_control but does not run Phase 0 investment, op is never set,
 * so Phase I militia strength stays 0 and no formations spawn. This function derives op
 * per municipality from settlement-level political_controllers so that militia_emergence
 * and formation spawn can produce non-zero pools.
 *
 * Deterministic: mun_ids and sids sorted; tie-break for majority controller by faction order.
 * Canon: Phase 0 Spec §4.6, §7; MILITIA_BRIGADE_FORMATION_DESIGN. Does not invent new mechanics;
 * derives op from control only when op would otherwise be missing.
 */

import type { GameState, FactionId, MunicipalityId, OrganizationalPenetration } from './game_state.js';
import type { SettlementRecord } from '../map/settlements.js';
import { strictCompare } from './validateGameState.js';

const FACTION_ORDER: FactionId[] = ['RBiH', 'HRHB', 'RS'];

/**
 * Build mun_id -> sorted list of sids. Deterministic.
 */
function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, string[]> {
  const byMun = new Map<MunicipalityId, string[]>();
  for (const [sid, rec] of settlements.entries()) {
    const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
    const list = byMun.get(munId) ?? [];
    list.push(sid);
    byMun.set(munId, list);
  }
  for (const list of byMun.values()) {
    list.sort(strictCompare);
  }
  return byMun;
}

/**
 * Return majority political controller for a municipality, or null if no majority.
 * Tie-break: FACTION_ORDER (RBiH < HRHB < RS), then null.
 */
function getMajorityController(
  state: GameState,
  sids: string[]
): FactionId | null {
  const counts: Record<string, number> = { RBiH: 0, HRHB: 0, RS: 0, _null: 0 };
  const pc = state.political_controllers ?? {};
  for (const sid of sids) {
    const c = pc[sid];
    const key = c ?? '_null';
    if (key in counts) counts[key] += 1;
    else counts['_null'] += 1;
  }
  let bestKey: string | null = null;
  let bestCount = 0;
  const order = [...FACTION_ORDER, '_null'];
  for (const key of order) {
    const n = counts[key] ?? 0;
    if (n > bestCount) {
      bestCount = n;
      bestKey = key;
    }
  }
  if (bestKey === null || bestKey === '_null') return null;
  return bestKey as FactionId;
}

/**
 * Derive organizational_penetration from majority controller.
 * Stub party/paramilitary so militia_emergence yields non-zero strength.
 */
function opFromController(controller: FactionId | null): OrganizationalPenetration {
  // War-start (April 1992) mobilization state: all factions have heavily mobilized
  // their party/paramilitary structures. Values reflect full wartime mobilization.
  if (controller === 'RBiH') {
    return {
      police_loyalty: 'loyal',
      to_control: 'controlled',
      sda_penetration: 85,
      patriotska_liga: 60
    };
  }
  if (controller === 'RS') {
    return {
      police_loyalty: 'hostile',
      to_control: 'controlled',
      sds_penetration: 85,
      paramilitary_rs: 60
    };
  }
  if (controller === 'HRHB') {
    return {
      police_loyalty: 'hostile',
      to_control: 'controlled',
      hdz_penetration: 85,
      paramilitary_hrhb: 60
    };
  }
  return {
    police_loyalty: 'mixed',
    to_control: 'contested'
  };
}

/**
 * Seed state.municipalities[].organizational_penetration from state.political_controllers
 * using settlement membership from the provided settlements map. Only sets op where
 * state.municipalities[munId] already exists (e.g. after political_control_init). Creates
 * state.municipalities[munId] if missing so that every mun with settlements gets an op.
 * Deterministic ordering.
 */
export function seedOrganizationalPenetrationFromControl(
  state: GameState,
  settlements: Map<string, SettlementRecord>
): void {
  if (!state.political_controllers || Object.keys(state.political_controllers).length === 0) return;

  const byMun = buildSettlementsByMun(settlements);
  const munIds = [...byMun.keys()].sort(strictCompare);

  if (!state.municipalities) state.municipalities = {};
  for (const munId of munIds) {
    const sids = byMun.get(munId);
    if (!sids?.length) continue;
    const controller = getMajorityController(state, sids);
    const op = opFromController(controller);
    let mun = state.municipalities[munId];
    if (!mun) {
      mun = {};
      state.municipalities[munId] = mun;
    }
    mun.organizational_penetration = op;
  }
}
