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
import { getMainCasualtySplit } from './casualty_realism_v2_gate.js';

/** Shipped (flag-OFF) main-path split. The live split is sourced from
 * getMainCasualtySplit() (casualty_realism_v2_gate.ts); these consts document the
 * flag-OFF baseline and are mirrored as the gate's SHIPPED_MAIN fractions. */
export const KIA_FRACTION = 0.22;
export const WIA_FRACTION = 0.74;
export const MIA_FRACTION = 0.04;

function removablePersonnel(formation: FormationState): number {
    return Math.max(0, (formation.personnel ?? 0) - MIN_COMBAT_PERSONNEL);
}

/**
 * Split a total casualty count into killed/wounded/missing-captured
 * using the canonical fractions. Remainder goes to MIA.
 */
export function splitKiaWiaMia(totalCasualties: number): FormationCasualties {
    // Routed through the B1 casualty-realism V2 gate. Flag-OFF returns the shipped
    // main-path split (KIA 0.22 / WIA 0.74 / MIA 0.04), byte-identical to before.
    const { kia, wia } = getMainCasualtySplit();
    const killed = Math.floor(totalCasualties * kia);
    const wounded = Math.floor(totalCasualties * wia);
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

/**
 * Deterministic bounded allocation for explicit defender weights.
 *
 * An eligible supplied primary keeps the existing proportional/remainder
 * policy. When the supplied primary is ineligible (zero/non-positive weight)
 * or absent, any rounding difference is assigned through the stable id order
 * of the eligible contributors, never to a noncontributor and never beyond
 * their removable personnel.
 */
function allocateExplicitWeightShares(
    defBrigades: FormationState[],
    sectorBrigadeWeights: Map<FormationId, number>,
    finalDefenderCas: number,
    primaryId?: FormationId,
): Map<FormationId, number> {
    const shares = new Map<FormationId, number>();
    for (const b of defBrigades) shares.set(b.id, 0);
    if (primaryId && !shares.has(primaryId)) shares.set(primaryId, 0);

    let totalWeight = 0;
    for (const b of defBrigades) totalWeight += Math.max(0, sectorBrigadeWeights.get(b.id) ?? 0);
    if (totalWeight <= 0) return shares;

    const removableById = new Map<FormationId, number>();
    for (const b of defBrigades) removableById.set(b.id, removablePersonnel(b));

    // Select one effective remainder owner: the supplied primary when it is a
    // positive contributor, otherwise the first positive contributor in stable
    // id order. The same proportional/remainder algorithm then applies.
    const eligibleIds = defBrigades
        .filter((b) => (sectorBrigadeWeights.get(b.id) ?? 0) > 0)
        .map((b) => b.id)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const effectivePrimaryId = primaryId
        && (sectorBrigadeWeights.get(primaryId) ?? 0) > 0
        && defBrigades.some((b) => b.id === primaryId)
        ? primaryId
        : eligibleIds[0];

    let primaryShare = 0;
    let cappedRemainder = 0;
    let primaryIsEligible = false;
    for (const b of defBrigades) {
        const w = sectorBrigadeWeights.get(b.id) ?? 0;
        if (w <= 0) continue;
        const rawShare = Math.round(finalDefenderCas * (w / totalWeight));
        if (effectivePrimaryId && b.id === effectivePrimaryId) {
            primaryIsEligible = true;
            primaryShare += rawShare;
            continue;
        }
        const cappedShare = Math.min(rawShare, removableById.get(b.id) ?? 0);
        shares.set(b.id, cappedShare);
        cappedRemainder += rawShare - cappedShare;
    }

    if (primaryIsEligible && effectivePrimaryId) {
        const primaryCapacity = removableById.get(effectivePrimaryId) ?? 0;
        shares.set(effectivePrimaryId, Math.min(primaryShare + cappedRemainder, primaryCapacity));
        const roundedTotal = [...shares.values()].reduce((sum, cas) => sum + cas, 0);
        if (roundedTotal !== finalDefenderCas) {
            const adjustedPrimaryShare = (shares.get(effectivePrimaryId) ?? 0) + finalDefenderCas - roundedTotal;
            shares.set(effectivePrimaryId, Math.max(0, Math.min(adjustedPrimaryShare, primaryCapacity)));
        }
    }
    return shares;
}

export function computeDefenderCasualtyShares(params: {
    defenderFormation: FormationState;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    finalDefenderCas: number;
}): Map<FormationId, number> {
    const { defenderFormation, sectorDefenseBrigades, sectorBrigadeWeights, finalDefenderCas } = params;
    const defBrigades = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
        ? sectorDefenseBrigades
        : [defenderFormation];

    // No weights: retain the single-primary allocation, but never record more
    // than the formation can actually lose.
    if (!sectorBrigadeWeights) {
        return new Map<FormationId, number>([[
            defenderFormation.id,
            Math.min(Math.max(0, finalDefenderCas), removablePersonnel(defenderFormation)),
        ]]);
    }

    // Explicit weights are contributions, not merely a distribution key.
    // Zero/non-positive entries are ineligible for casualties, including the
    // primary; zero entries stay in the map so diagnostic rows are truthful.
    return allocateExplicitWeightShares(
        defBrigades,
        sectorBrigadeWeights,
        finalDefenderCas,
        defenderFormation.id,
    );
}

export function distributeDefenderCasualties(params: {
    defenderFormation: FormationState;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    finalDefenderCas: number;
    casualtyLedger: CasualtyLedger;
}): void {
    const { defenderFormation, sectorDefenseBrigades, sectorBrigadeWeights, finalDefenderCas, casualtyLedger } = params;
    const shares = computeDefenderCasualtyShares({
        defenderFormation,
        sectorDefenseBrigades,
        sectorBrigadeWeights,
        finalDefenderCas,
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

/** Robustness fix (task #95, the #358 class): `bfsDistanceFriendly` returns Infinity
 *  for a reserve brigade with no friendly path to the battle OSID. The in-memory
 *  consumer (`getReactiveDistanceWeight`) already floor-handles non-finite (weight 0),
 *  but the raw hops were persisted verbatim into
 *  `turn_summaries[].battles[].defender_contributions[].distance_hops` —
 *  `JSON.stringify(Infinity)` emits `null` (2× `"distance_hops": null` verified in
 *  latest_run_final_save.json) and the #95 P1-A serializer guard now throws on it.
 *  Clamp at this single storage boundary; weights/casualty math are computed from the
 *  raw hops upstream and are untouched. Only reader of the persisted value is the
 *  AAR panel display. Convention: 99 = unreachable (#358 HOME_DISTANCE_UNREACHABLE_HOPS). */
export const DEFENDER_DISTANCE_UNREACHABLE_HOPS = 99;

export function buildDefenderContributions(params: {
    sectorDefenseBrigades: FormationState[];
    sectorBrigadeWeights: Map<FormationId, number>;
    sectorBrigadeMeta: Map<FormationId, { hops: number; isHome: boolean }>;
    finalDefenderCas: number;
    primaryDefenderId?: FormationId;
}): DefenderContribution[] {
    const { sectorDefenseBrigades, sectorBrigadeWeights, sectorBrigadeMeta, finalDefenderCas, primaryDefenderId } = params;
    const totalWeight = sectorDefenseBrigades.reduce((s, b) => s + Math.max(0, sectorBrigadeWeights.get(b.id) ?? 0), 0);
    const primaryDefender = primaryDefenderId
        ? sectorDefenseBrigades.find((b) => b.id === primaryDefenderId)
        : undefined;
    const cappedShares = primaryDefender
        ? computeDefenderCasualtyShares({
            defenderFormation: primaryDefender,
            sectorDefenseBrigades,
            sectorBrigadeWeights,
            finalDefenderCas,
        })
        : undefined;

    // Without a primary id there is no remainder sink, but explicit weights
    // still gate eligibility and capacity. Reuse the same bounded allocator so
    // odd rounding can never overreport or fall back to an equal split.
    const fallbackShares = cappedShares
        ? undefined
        : allocateExplicitWeightShares(
            sectorDefenseBrigades,
            sectorBrigadeWeights,
            finalDefenderCas,
        );

    const contributions: DefenderContribution[] = [];
    for (const b of sectorDefenseBrigades) {
        const w = sectorBrigadeWeights.get(b.id) ?? 0;
        const meta = sectorBrigadeMeta.get(b.id);
        const frac = totalWeight > 0 ? Math.max(0, w) / totalWeight : 0;
        const rawHops = meta?.hops ?? 0;
        contributions.push({
            brigade_id: b.id,
            // #95: persisted copy must be finite (see DEFENDER_DISTANCE_UNREACHABLE_HOPS).
            distance_hops: Number.isFinite(rawHops) ? rawHops : DEFENDER_DISTANCE_UNREACHABLE_HOPS,
            is_home_municipality: meta?.isHome ?? false,
            reactive_weight: Math.round(w * 100) / 100,
            casualties_taken: cappedShares?.get(b.id) ?? fallbackShares?.get(b.id) ?? Math.round(finalDefenderCas * frac),
        });
    }
    return contributions;
}
