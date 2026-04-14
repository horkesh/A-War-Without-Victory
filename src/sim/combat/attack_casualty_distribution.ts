/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: attack_casualty_distribution.ts
 * DOMAIN:    Casualty calculation, KIA/WIA/MIA splitting, weighted distribution
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 3, 2026-04-13).
 * Pure helpers — no strategic decisions, no state ownership.
 *
 * UPSTREAM:  attack_resolution_osid.ts (sole caller)
 * ═══════════════════════════════════════════════════════════════
 */

import type { FormationId, FormationState } from '../../state/game_state.js';
import type { FormationCasualties } from '../../state/casualty_ledger.js';
import {
    type CombatOutcome,
    BASE_ATTACKER_LOSS_RATE,
    BASE_DEFENDER_LOSS_RATE,
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
    getLanchesterConcentrationBonus,
} from './combat_math.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import { MAIN_CASUALTY_MULT, SUPPORT_CASUALTY_MULT } from './bot_constants.js';
import type { CasualtyLedger } from '../../state/casualty_ledger.js';
import { recordBattleCasualties } from '../../state/casualty_ledger.js';
import { applyPersonnelLoss } from './attack_retreat_displacement.js';
import type { DefenderContribution } from './attack_resolution_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

export const KIA_FRACTION = 0.30;
export const WIA_FRACTION = 0.55;
export const MIA_FRACTION = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// splitKiaWiaMia
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Split a total casualty count into killed/wounded/missing-captured
 * using the canonical fractions. Remainder goes to MIA (avoids rounding loss).
 */
export function splitKiaWiaMia(totalCasualties: number): FormationCasualties {
    const killed = Math.floor(totalCasualties * KIA_FRACTION);
    const wounded = Math.floor(totalCasualties * WIA_FRACTION);
    const missing_captured = Math.max(0, totalCasualties - killed - wounded);
    return { killed, wounded, missing_captured };
}

// ═══════════════════════════════════════════════════════════════════════════
// computeFinalCasualties
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute final attacker and defender casualty totals from the base formula.
 * Pure — no state mutation.
 */
export function computeFinalCasualties(params: {
    personnelAttacker: number;
    personnelDefender: number;
    outcome: CombatOutcome;
    lastStandCasMult: number;
    militiaOnlyMult: number;
    attCasMult: number;
    defCasMult: number;
    defensiveFireMult: number;
    bombardmentMult: number;
    attackerCount: number;
    powerRatio: number;
}): { finalAttackerCas: number; finalDefenderCas: number } {
    const baseAttackerCas = params.personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[params.outcome] ?? 1) * params.lastStandCasMult * params.militiaOnlyMult * params.attCasMult * params.defensiveFireMult;
    const baseDefenderCas = params.personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[params.outcome] ?? 1) * params.lastStandCasMult * params.bombardmentMult * params.defCasMult;
    const finalAttackerCas = Math.min(params.personnelAttacker - MIN_COMBAT_PERSONNEL, Math.max(0, Math.round(baseAttackerCas)));
    const finalDefenderCas = Math.min(params.personnelDefender, Math.max(0, Math.round(
        baseDefenderCas * getLanchesterConcentrationBonus(params.attackerCount, params.powerRatio)
    )));
    return { finalAttackerCas, finalDefenderCas };
}

// ═══════════════════════════════════════════════════════════════════════════
// computeAttackerCasualtyShares
// ═══════════════════════════════════════════════════════════════════════════

export interface AttackerCasualtyInput {
    id: FormationId;
    personnel: number;
    supportRole: 'support' | 'main' | 'none';
}

/**
 * Compute per-attacker casualty shares with role-based weighting.
 * Returns Map<FormationId, casualties> where the sum equals finalCas
 * (up to integer rounding).
 */
export function computeAttackerCasualtyShares(
    inputs: AttackerCasualtyInput[],
    totalPersonnel: number,
    finalCas: number,
): Map<FormationId, number> {
    const result = new Map<FormationId, number>();
    let weightSum = 0;
    const weights: { id: FormationId; w: number }[] = [];
    for (const input of inputs) {
        const frac = input.personnel / Math.max(1, totalPersonnel);
        const mult = input.supportRole === 'support' ? SUPPORT_CASUALTY_MULT
            : input.supportRole === 'main' ? MAIN_CASUALTY_MULT
            : 1.0;
        const w = frac * mult;
        weights.push({ id: input.id, w });
        weightSum += w;
    }
    for (const { id, w } of weights) {
        result.set(id, Math.round(finalCas * (weightSum > 0 ? w / weightSum : 0)));
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// distributeDefenderCasualties
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Distribute defender casualties across sector brigades (distance-weighted)
 * or to the single primary defender. Mutates personnel and casualty ledger.
 */
export function distributeDefenderCasualties(params: {
    defenderFormation: FormationState;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    finalDefenderCas: number;
    casualtyLedger: CasualtyLedger;
}): void {
    const { defenderFormation, sectorDefenseBrigades, sectorBrigadeWeights, finalDefenderCas, casualtyLedger } = params;
    const defBrigades = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
        ? sectorDefenseBrigades : [defenderFormation];

    if (sectorBrigadeWeights && defBrigades.length > 1) {
        // Distance-weighted distribution
        const totalWeight = defBrigades.reduce((s, b) => s + (sectorBrigadeWeights!.get(b.id) ?? 0), 0);
        for (const b of defBrigades) {
            const w = sectorBrigadeWeights.get(b.id) ?? 0;
            const frac = totalWeight > 0 ? w / totalWeight : 1 / defBrigades.length;
            const cas = Math.round(finalDefenderCas * frac);
            if (cas > 0) {
                applyPersonnelLoss(b, cas);
                recordBattleCasualties(casualtyLedger, b.faction, b.id, splitKiaWiaMia(cas));
            }
        }
    } else {
        // Single defender or no weights — all casualties to primary
        applyPersonnelLoss(defenderFormation, finalDefenderCas);
        recordBattleCasualties(casualtyLedger, defenderFormation.faction, defenderFormation.id, splitKiaWiaMia(finalDefenderCas));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// buildDefenderContributions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build per-brigade defender contribution records for Layer C battle reports.
 * Pure function — no state mutation.
 */
export function buildDefenderContributions(params: {
    sectorDefenseBrigades: FormationState[];
    sectorBrigadeWeights: Map<FormationId, number>;
    sectorBrigadeMeta: Map<FormationId, { hops: number; isHome: boolean }>;
    finalDefenderCas: number;
}): DefenderContribution[] {
    const { sectorDefenseBrigades, sectorBrigadeWeights, sectorBrigadeMeta, finalDefenderCas } = params;
    const totalWeight = sectorDefenseBrigades.reduce((s, b) => s + (sectorBrigadeWeights.get(b.id) ?? 0), 0);
    const contributions: DefenderContribution[] = [];
    for (const b of sectorDefenseBrigades) {
        const w = sectorBrigadeWeights.get(b.id) ?? 0;
        const meta = sectorBrigadeMeta.get(b.id);
        const frac = totalWeight > 0 ? w / totalWeight : 1 / sectorDefenseBrigades.length;
        contributions.push({
            brigade_id: b.id,
            distance_hops: meta?.hops ?? 0,
            is_home_municipality: meta?.isHome ?? false,
            reactive_weight: Math.round(w * 100) / 100,
            casualties_taken: Math.round(finalDefenderCas * frac),
        });
    }
    return contributions;
}
