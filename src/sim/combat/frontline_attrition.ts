/**
 * Passive frontline attrition: brigades assigned to fronts lose a small
 * fraction of personnel per turn from sniping, shelling, disease, desertion.
 *
 * Modifiers:
 *   - Thin fronts (low density) → higher attrition (more exposed)
 *   - Dense fronts → lower attrition (mutual support)
 *   - Critical supply → doubled attrition (starvation, disease)
 *   - Strained supply → 30% increase
 *   - Bombardment exposure: brigades facing superior enemy heavy weapons
 *     take additional casualties from shelling (equipment deficit driven)
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
import { ensureBrigadeComposition } from './equipment_effects.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base weekly attrition rate for frontline brigades.
 * n159→0.003 (RS/HRHB running 2-3× historical). n303→0.005 (total casualties
 * too low at 97k/40w; first year was bloodiest with ~30k KIA target).
 * At 0.005: +67% frontline attrition → targets ~130k total casualties.
 */
const BASE_ATTRITION_RATE = 0.005;

/**
 * Bombardment exposure: additional attrition for brigades facing superior
 * enemy heavy weapons. Uses a ratio-based vulnerability model with log scaling:
 * brigades with very low own firepower facing high enemy firepower are
 * exponentially more vulnerable (no counter-battery fire, no suppression).
 *
 * The firepower RATIO (incoming/own) is what matters, not the absolute deficit.
 * ln(ratio) provides natural diminishing returns and better differentiation:
 *   - ARBiH (own FP ~1.8, incoming ~13) → ratio 7.2, ln=1.98 → near-full effect
 *   - HVO (own FP ~5, incoming ~13) → ratio 2.6, ln=0.96 → half effect
 *   - VRS (own FP ~17, incoming ~2) → ratio 0.13, ln<0 → zero effect
 */
/** Reduced from 0.012 to 0.008 (n159 audit: background losses too dominant vs active combat). */
const BOMBARDMENT_EXPOSURE_RATE = 0.008;
/** ln(firepower ratio) divisor for full bombardment effect. ln(7)≈2.0 */
const BOMBARDMENT_RATIO_SCALE = 2.0;
/** Minimum own firepower floor (prevents division by zero). */
const MIN_COUNTERBATTERY_FP = 1.0;

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

    // Compute per-faction total heavy weapons firepower for front-assigned brigades.
    // Used to determine bombardment exposure: brigades facing superior enemy
    // firepower take additional passive casualties from persistent shelling.
    const factionFrontFP: Record<string, { totalFP: number; count: number }> = {};
    for (const fid of formationIds) {
        const frontId = assignments[fid];
        if (!frontId) continue;
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const fac = f.faction as string;
        if (!factionFrontFP[fac]) factionFrontFP[fac] = { totalFP: 0, count: 0 };
        const comp = f.composition ?? ensureBrigadeComposition(f);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        factionFrontFP[fac].totalFP += artEff + tankEff * 0.5;
        factionFrontFP[fac].count += 1;
    }

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

        // Base attrition (sniping, disease, desertion)
        const baseAttritionCas = Math.floor(personnel * BASE_ATTRITION_RATE * exposureMod * supplyMod);

        // Bombardment exposure: ratio-based vulnerability model.
        // Brigades with low own firepower facing high enemy firepower take extra losses.
        // Uses ln(incoming/own) for natural diminishing returns and steep low-equipment penalty.
        const comp = formation.composition ?? ensureBrigadeComposition(formation);
        const ownArt = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const ownTank = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        const ownFP = Math.max(MIN_COUNTERBATTERY_FP, ownArt + ownTank * 0.5);
        const totalFrontBrigades = Object.values(factionFrontFP).reduce((s, d) => s + d.count, 0);
        let incomingFPPerBrigade = 0;
        for (const fac of Object.keys(factionFrontFP).sort(strictCompare)) {
            if (fac !== factionId) {
                const targetCount = totalFrontBrigades - factionFrontFP[fac].count;
                incomingFPPerBrigade += factionFrontFP[fac].totalFP / Math.max(1, targetCount);
            }
        }
        const firepowerRatio = incomingFPPerBrigade / ownFP;
        const logRatio = Math.max(0, Math.log(firepowerRatio));
        const bombardmentFraction = Math.min(1.0, logRatio / BOMBARDMENT_RATIO_SCALE);
        const bombardmentCas = Math.floor(personnel * BOMBARDMENT_EXPOSURE_RATE * bombardmentFraction);

        const casualties = Math.min(
            personnel - MIN_COMBAT_PERSONNEL,
            Math.max(1, baseAttritionCas + bombardmentCas)
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

        // Feed into pool.exhausted for demographic gating (25% rate — see applyCasualtyPoolExhaustion).
        const originMun = formation.origin_mun;
        if (originMun) {
            const poolKey = militiaPoolKey(originMun, factionId);
            const pool = pools[poolKey];
            if (pool) {
                const permanentLoss = killed + mia;
                pool.exhausted = (pool.exhausted ?? 0) + Math.round(permanentLoss * 0.25);
            }
        }

        report.brigades_affected += 1;
        report.total_casualties += casualties;
        report.by_faction[factionId] = (report.by_faction[factionId] ?? 0) + casualties;
    }

    return report;
}
