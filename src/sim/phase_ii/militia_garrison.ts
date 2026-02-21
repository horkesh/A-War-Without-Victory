/**
 * Phase II: Militia garrison computation (Brigade AoR Redesign Phase B).
 *
 * Settlements not covered by a brigade have a militia garrison derived from
 * Phase 0 org penetration and militia_pools. Garrison = base_militia(mun) × org_pen_mult(mun, faction).
 * Deterministic: sorted iteration over settlements and keys.
 */

import { MILITIA_GARRISON_FRACTION } from '../../state/formation_constants.js';
import type { FactionId, GameState, MilitiaPoolState, MunicipalityId, OrganizationalPenetration, SettlementId } from '../../state/game_state.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Org-pen multiplier for militia garrison (0..1). From study: party penetration,
 * police loyalty (loyal/neutral/hostile → 1.0/0.3/0.0), paramilitary, to_control (RBiH).
 */
export function computeMilitiaGarrisonOrgPenMultiplier(
    op: OrganizationalPenetration | undefined,
    faction: FactionId,
    controllerIsFaction: boolean
): number {
    if (!op) return 0;
    let party = 0;
    let paramilitary = 0;
    switch (faction) {
        case 'RS':
            party = (op.sds_penetration ?? 0) / 100;
            paramilitary = (op.paramilitary_rs ?? 0) / 100;
            break;
        case 'RBiH':
            party = (op.sda_penetration ?? 0) / 100;
            paramilitary = (op.patriotska_liga ?? 0) / 100;
            break;
        case 'HRHB':
            party = (op.hdz_penetration ?? 0) / 100;
            paramilitary = (op.paramilitary_hrhb ?? 0) / 100;
            break;
        default:
            return 0;
    }
    const police = op.police_loyalty === 'loyal' && controllerIsFaction ? 1.0
        : op.police_loyalty === 'mixed' ? 0.3
            : 0;
    const toControl = faction === 'RBiH'
        ? (op.to_control === 'controlled' ? 1.0 : op.to_control === 'contested' ? 0.5 : 0)
        : 0;
    const sum = party + paramilitary + police + toControl;
    return Math.min(1, Math.max(0, sum / 4));
}

/**
 * Compute state.militia_garrison for all settlements that are controlled by a faction
 * but not assigned to any brigade. Uses militia_pools and municipalities' org_penetration.
 * Only populates entries for settlements with garrison > 0; omitted = 0.
 * Deterministic: sorted iteration.
 */
export function computeMilitiaGarrisons(
    state: GameState,
    sidToMun: Record<SettlementId, MunicipalityId>
): void {
    const pc = state.political_controllers ?? {};
    const brigadeAor = state.brigade_aor ?? {};
    const pools = state.militia_pools ?? {};
    const municipalities = state.municipalities ?? {};
    const out: Record<SettlementId, number> = {};

    const sids = Object.keys(pc).filter((sid): sid is SettlementId => pc[sid] != null).sort(strictCompare);
    for (const sid of sids) {
        const controller = pc[sid] as FactionId | null;
        if (!controller) continue;
        if (brigadeAor[sid]) continue; // brigade covers this settlement
        const mun = sidToMun[sid];
        if (!mun) continue;
        const poolKey = militiaPoolKey(mun, controller);
        const pool = pools[poolKey] as MilitiaPoolState | undefined;
        if (!pool || (pool.available ?? 0) <= 0) continue;
        const munState = municipalities[mun];
        const op = munState?.organizational_penetration;
        const mult = computeMilitiaGarrisonOrgPenMultiplier(op, controller, true);
        if (mult <= 0) continue;
        const base = Math.floor((pool.available ?? 0) * MILITIA_GARRISON_FRACTION);
        const garrison = Math.max(0, Math.floor(base * mult));
        if (garrison > 0) out[sid] = garrison;
    }
    state.militia_garrison = out;
}
