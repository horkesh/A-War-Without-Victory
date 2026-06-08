/**
 * OWNERSHIP: attack_casualty_distribution.ts
 * DOMAIN: Casualty calculation, KIA/WIA/MIA splitting, weighted distribution.
 *
 * Extracted from attack_resolution_osid.ts (tranche 3, 2026-04-13).
 * Pure helpers except distributeDefenderCasualties, which mutates formation
 * personnel and the casualty ledger.
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

export const KIA_FRACTION = 0.22;
export const WIA_FRACTION = 0.74;
export const MIA_FRACTION = 0.04;
export const SHARED_NON_PRIMARY_DEFENDER_CASUALTY_CAP_FRACTION = 0.15;

function removablePersonnel(formation: FormationState): number {
    return Math.max(0, (formation.personnel ?? 0) - MIN_COMBAT_PERSONNEL);
}

/**
 * Split a total casualty count into killed/wounded/missing-captured
 * using the canonical fractions. Remainder goes to MIA.
 */
export function splitKiaWiaMia(totalCasualties: number): FormationCasualties {
    const killed = Math.floor(totalCasualties * KIA_FRACTION);
    const wounded = Math.floor(totalCasualties * WIA_FRACTION);
    const missing_captured = Math.max(0, totalCasualties - killed - wounded);
    return { killed, wounded, missing_captured };
}

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

export interface AttackerCasualtyInput {
    id: FormationId;
    personnel: number;
    supportRole: 'support' | 'main' | 'none';
}

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

export function computeDefenderCasualtyShares(params: {
    defenderFormation: FormationState;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    finalDefenderCas: number;
    capNonPrimaryDefenders?: boolean;
}): Map<FormationId, number> {
    const { defenderFormation, sectorDefenseBrigades, sectorBrigadeWeights, finalDefenderCas, capNonPrimaryDefenders = false } = params;
    const defBrigades = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
        ? sectorDefenseBrigades
        : [defenderFormation];
    const shares = new Map<FormationId, number>();

    if (!sectorBrigadeWeights || defBrigades.length <= 1) {
        shares.set(defenderFormation.id, finalDefenderCas);
        return shares;
    }

    const totalWeight = defBrigades.reduce((s, b) => s + (sectorBrigadeWeights.get(b.id) ?? 0), 0);
    let primaryShare = 0;
    let cappedRemainder = 0;
    for (const b of defBrigades) {
        const w = sectorBrigadeWeights.get(b.id) ?? 0;
        const frac = totalWeight > 0 ? w / totalWeight : 1 / defBrigades.length;
        const rawShare = Math.round(finalDefenderCas * frac);
        if (b.id === defenderFormation.id) {
            primaryShare += rawShare;
            continue;
        }
        const nonPrimaryCap = capNonPrimaryDefenders
            ? Math.min(
                removablePersonnel(b),
                Math.round(Math.max(0, b.personnel ?? 0) * SHARED_NON_PRIMARY_DEFENDER_CASUALTY_CAP_FRACTION)
            )
            : removablePersonnel(b);
        const cappedShare = Math.min(rawShare, nonPrimaryCap);
        shares.set(b.id, cappedShare);
        cappedRemainder += rawShare - cappedShare;
    }
    shares.set(defenderFormation.id, Math.min(primaryShare + cappedRemainder, removablePersonnel(defenderFormation)));
    const roundedTotal = [...shares.values()].reduce((sum, cas) => sum + cas, 0);
    if (roundedTotal !== finalDefenderCas) {
        const adjustedPrimaryShare = (shares.get(defenderFormation.id) ?? 0) + finalDefenderCas - roundedTotal;
        shares.set(defenderFormation.id, Math.max(0, Math.min(adjustedPrimaryShare, removablePersonnel(defenderFormation))));
    }
    return shares;
}

export function distributeDefenderCasualties(params: {
    defenderFormation: FormationState;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    finalDefenderCas: number;
    casualtyLedger: CasualtyLedger;
    capNonPrimaryDefenders?: boolean;
}): void {
    const { defenderFormation, sectorDefenseBrigades, sectorBrigadeWeights, finalDefenderCas, casualtyLedger, capNonPrimaryDefenders } = params;
    const shares = computeDefenderCasualtyShares({
        defenderFormation,
        sectorDefenseBrigades,
        sectorBrigadeWeights,
        finalDefenderCas,
        capNonPrimaryDefenders,
    });
    const formationById = new Map<FormationId, FormationState>();
    for (const b of sectorDefenseBrigades ?? []) formationById.set(b.id, b);
    formationById.set(defenderFormation.id, defenderFormation);

    for (const [formationId, cas] of shares) {
        const formation = formationById.get(formationId);
        if (!formation || cas <= 0) continue;
        applyPersonnelLoss(formation, cas);
        recordBattleCasualties(casualtyLedger, formation.faction, formation.id, splitKiaWiaMia(cas));
    }
}

export function buildDefenderContributions(params: {
    sectorDefenseBrigades: FormationState[];
    sectorBrigadeWeights: Map<FormationId, number>;
    sectorBrigadeMeta: Map<FormationId, { hops: number; isHome: boolean }>;
    finalDefenderCas: number;
    primaryDefenderId?: FormationId;
    capNonPrimaryDefenders?: boolean;
}): DefenderContribution[] {
    const { sectorDefenseBrigades, sectorBrigadeWeights, sectorBrigadeMeta, finalDefenderCas, primaryDefenderId, capNonPrimaryDefenders } = params;
    const totalWeight = sectorDefenseBrigades.reduce((s, b) => s + (sectorBrigadeWeights.get(b.id) ?? 0), 0);
    const primaryDefender = primaryDefenderId
        ? sectorDefenseBrigades.find((b) => b.id === primaryDefenderId)
        : undefined;
    const cappedShares = primaryDefender
        ? computeDefenderCasualtyShares({
            defenderFormation: primaryDefender,
            sectorDefenseBrigades,
            sectorBrigadeWeights,
            finalDefenderCas,
            capNonPrimaryDefenders,
        })
        : undefined;
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
            casualties_taken: cappedShares?.get(b.id) ?? Math.round(finalDefenderCas * frac),
        });
    }
    return contributions;
}
