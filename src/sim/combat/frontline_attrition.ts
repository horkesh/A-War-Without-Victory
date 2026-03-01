/**
 * Passive frontline attrition: brigades assigned to fronts lose a small
 * fraction of personnel per turn from sniping, shelling, disease, desertion.
 *
 * Modifiers:
 *   - Thin fronts (low density) → higher attrition (more exposed)
 *   - Dense fronts → lower attrition (mutual support)
 *   - Critical supply → doubled attrition (starvation, disease)
 *   - Strained supply → 30% increase
 *
 * Deterministic: sorted formation IDs, no randomness.
 */

import {
    initializeCasualtyLedger,
    recordBattleCasualties
} from '../../state/casualty_ledger.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import type {
    GameState,
    MilitiaPoolState
} from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { strictCompare } from '../../state/validateGameState.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base weekly attrition rate for frontline brigades. */
const BASE_ATTRITION_RATE = 0.005;

/** Fraction of attrition casualties that are KIA (match P9 value). */
const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;
// MIA_FRACTION = 0.15 (remainder)

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FrontlineAttritionReport {
    brigades_affected: number;
    total_casualties: number;
    by_faction: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply passive attrition to all brigades assigned to a front.
 * Mutates formation personnel and records casualties in ledger.
 * Also feeds casualties into pool.exhausted for demographic gating.
 */
export function applyFrontlineAttrition(
    state: GameState,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): FrontlineAttritionReport {
    const report: FrontlineAttritionReport = {
        brigades_affected: 0,
        total_casualties: 0,
        by_faction: {}
    };

    const formations = state.formations;
    if (!formations) return report;

    const assignments = state.brigade_front_assignment;
    if (!assignments) return report;

    if (!state.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    const localFronts = state.local_fronts ?? {};
    const pools = (state.militia_pools ?? {}) as Record<string, MilitiaPoolState>;

    const formationIds = Object.keys(assignments).sort(strictCompare);

    for (const fid of formationIds) {
        const frontId = assignments[fid];
        if (!frontId) continue;

        const formation = formations[fid];
        if (!formation || formation.status !== 'active') continue;

        const personnel = formation.personnel ?? 0;
        if (personnel <= MIN_COMBAT_PERSONNEL) continue;

        // Density modifier: thin fronts are more exposed
        const front = localFronts[frontId];
        let exposureMod = 1.0;
        if (front) {
            const density = front.assigned_brigade_ids.length / Math.max(1, front.coverage_length);
            if (density < 0.5) {
                exposureMod = 1.5; // thin front — more exposed
            } else if (density > 1.0) {
                exposureMod = 0.7; // dense front — mutual support
            }
        }

        // Supply modifier
        let supplyMod = 1.0;
        const locationOsid = (formation as { location_osid?: string }).location_osid;
        const factionId = formation.faction as string;
        if (supplyStateByOsid?.factions && locationOsid) {
            const facEntry = supplyStateByOsid.factions.find(f => f.faction_id === factionId);
            const entry = facEntry?.by_osid?.find(e => e.osid === locationOsid);
            if (entry) {
                let effectiveState = entry.state;
                if (state.meta.supply_reserves_enabled && state.general_supply_reserve) {
                    const reserveLevel = (state.general_supply_reserve as Record<string, number>)[factionId] ?? 100;
                    effectiveState = getEffectiveSupplyState(entry.state, reserveLevel);
                }
                if (effectiveState === 'critical') supplyMod = 2.0;
                else if (effectiveState === 'strained') supplyMod = 1.3;
            }
        }

        const casualties = Math.min(
            personnel - MIN_COMBAT_PERSONNEL,
            Math.max(1, Math.floor(personnel * BASE_ATTRITION_RATE * exposureMod * supplyMod))
        );
        if (casualties <= 0) continue;

        // Apply personnel loss
        formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, personnel - casualties);

        // Record in casualty ledger
        const killed = Math.floor(casualties * KIA_FRACTION);
        const wounded = Math.floor(casualties * WIA_FRACTION);
        const mia = Math.max(0, casualties - killed - wounded);
        recordBattleCasualties(state.casualty_ledger!, factionId, fid, {
            killed, wounded, missing_captured: mia
        });

        // Feed into pool.exhausted for demographic gating
        const originMun = formation.origin_mun;
        if (originMun) {
            const poolKey = militiaPoolKey(originMun, factionId);
            const pool = pools[poolKey];
            if (pool) {
                const permanentLoss = killed + mia;
                pool.exhausted = (pool.exhausted ?? 0) + permanentLoss;
            }
        }

        report.brigades_affected += 1;
        report.total_casualties += casualties;
        report.by_faction[factionId] = (report.by_faction[factionId] ?? 0) + casualties;
    }

    return report;
}
