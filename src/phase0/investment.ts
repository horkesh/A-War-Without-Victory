/**
 * Phase B Step 3: Organizational Penetration Investment (Phase_0_Specification_v0_3_0.md §4.2).
 *
 * Investment types: Police, TO, Party, Paramilitary.
 * Costs: municipality-level vs region-level. Constraints: cannot invest in hostile-majority;
 * TO only for RBiH.
 */

import type { FactionId, GameState, MunicipalityId, OrganizationalPenetration } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { spendPrewarCapital } from './capital.js';

/** Investment type (Phase_0_Spec §4.2.1–4.2.4). */
export type InvestmentType = 'police' | 'to' | 'party' | 'paramilitary';

/** Scope: single municipality or region (3–5 municipalities). */
export type InvestmentScope = { kind: 'municipality'; mun_ids: MunicipalityId[] } | { kind: 'region'; mun_ids: MunicipalityId[] };

/** Deterministic display/apply order for investment types. */
const INVESTMENT_TYPES_ALL: readonly InvestmentType[] = ['police', 'party', 'paramilitary', 'to'] as const;
const INVESTMENT_TYPES_NON_TO: readonly InvestmentType[] = ['police', 'party', 'paramilitary'] as const;

/** Cost per type and scope (Phase_0_Spec §4.2). */
export const INVESTMENT_COST: Readonly<Record<InvestmentType, { municipality: number; region: number }>> = {
    police: { municipality: 5, region: 15 },
    to: { municipality: 8, region: 25 },
    party: { municipality: 4, region: 12 },
    paramilitary: { municipality: 10, region: 30 }
};

/** Coordinated RBiH/HRHB action cost multiplier (Phase 0 Spec §4.3). */
const COORDINATED_COST_MULTIPLIER = 0.8;

/** TO is only available to RBiH (Phase_0_Spec §4.2.2). */
export function isToAllowedForFaction(factionId: FactionId): boolean {
    return factionId === 'RBiH';
}

/** Available investment types for a faction, in deterministic UI order. */
export function getInvestmentTypesForFaction(factionId: FactionId): readonly InvestmentType[] {
    return isToAllowedForFaction(factionId) ? INVESTMENT_TYPES_ALL : INVESTMENT_TYPES_NON_TO;
}

/** Coordinated investment is only meaningful for the RBiH/HRHB relationship. */
export function isCoordinationEligibleFaction(factionId: FactionId): boolean {
    return factionId === 'RBiH' || factionId === 'HRHB';
}

/**
 * Stub: whether a municipality is hostile-majority for the investing faction (demographics).
 * Phase_0_Spec: "Cannot invest in hostile-majority municipalities (blocked by demographics)."
 * When no demographic data is provided, returns false (investment allowed). Replace with
 * census-based lookup when data/source/bih_census_1991.json is wired.
 */
export type IsHostileMajorityFn = (munId: MunicipalityId, factionId: FactionId) => boolean;

const DEFAULT_HOSTILE_MAJORITY: IsHostileMajorityFn = () => false;

export type ApplyInvestmentResult =
    | { ok: true; spent: number; remaining: number }
    | { ok: false; reason: string };

/**
 * Apply an organizational investment. Validates cost, faction (TO only RBiH), hostile-majority
 * constraint, deducts capital, updates state.municipalities[].organizational_penetration.
 * Deterministic: mun_ids are sorted before processing (Engine Invariants §11.3).
 */
export function applyInvestment(
    state: GameState,
    factionId: FactionId,
    investmentType: InvestmentType,
    scope: InvestmentScope,
    options?: { isHostileMajority?: IsHostileMajorityFn; coordinated?: boolean }
): ApplyInvestmentResult {
    const isHostileMajority = options?.isHostileMajority ?? DEFAULT_HOSTILE_MAJORITY;
    const coordinated = options?.coordinated === true && isCoordinationEligibleFaction(factionId);
    const munIds = [...scope.mun_ids].sort(strictCompare);

    if (munIds.length === 0) {
        return { ok: false, reason: 'scope must include at least one municipality' };
    }

    if (investmentType === 'to' && !isToAllowedForFaction(factionId)) {
        return { ok: false, reason: 'TO investment is only available to RBiH' };
    }

    for (const munId of munIds) {
        if (isHostileMajority(munId, factionId)) {
            return { ok: false, reason: `cannot invest in hostile-majority municipality: ${munId}` };
        }
    }

    const cost = getInvestmentCostWithCoordination(investmentType, scope, coordinated);

    const spendResult = spendPrewarCapital(state, factionId, cost);
    if (!spendResult.ok) {
        return { ok: false, reason: (spendResult as { reason: string }).reason };
    }

    if (!state.municipalities) {
        state.municipalities = {};
    }

    const increment = 15; // deterministic step per investment (0–100 scale)
    for (const munId of munIds) {
        let mun = state.municipalities[munId];
        if (!mun) {
            mun = {};
            state.municipalities[munId] = mun;
        }
        if (!mun.organizational_penetration) {
            mun.organizational_penetration = {};
        }
        const op = mun.organizational_penetration;
        applyInvestmentToPenetration(op, factionId, investmentType, increment);
    }

    return {
        ok: true,
        spent: cost,
        remaining: (spendResult as { remaining: number }).remaining
    };
}

function applyInvestmentToPenetration(
    op: OrganizationalPenetration,
    factionId: FactionId,
    investmentType: InvestmentType,
    increment: number
): void {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));

    switch (investmentType) {
        case 'police':
            op.police_loyalty = 'loyal';
            break;
        case 'to':
            op.to_control = 'controlled';
            break;
        case 'party':
            if (factionId === 'RS') {
                op.sds_penetration = clamp((op.sds_penetration ?? 0) + increment);
            } else if (factionId === 'RBiH') {
                op.sda_penetration = clamp((op.sda_penetration ?? 0) + increment);
            } else if (factionId === 'HRHB') {
                op.hdz_penetration = clamp((op.hdz_penetration ?? 0) + increment);
            }
            break;
        case 'paramilitary':
            if (factionId === 'RBiH') {
                op.patriotska_liga = clamp((op.patriotska_liga ?? 0) + increment);
            } else if (factionId === 'RS') {
                op.paramilitary_rs = clamp((op.paramilitary_rs ?? 0) + increment);
            } else if (factionId === 'HRHB') {
                op.paramilitary_hrhb = clamp((op.paramilitary_hrhb ?? 0) + increment);
            }
            break;
    }
}

/** Get cost for a given type and scope (for UI/validation). */
export function getInvestmentCost(investmentType: InvestmentType, scope: InvestmentScope): number {
    return getInvestmentCostWithCoordination(investmentType, scope, false);
}

/** Get deterministic investment cost, optionally applying coordinated discount. */
export function getInvestmentCostWithCoordination(
    investmentType: InvestmentType,
    scope: InvestmentScope,
    coordinated: boolean
): number {
    const cost = INVESTMENT_COST[investmentType];
    const baseCost = scope.kind === 'region' ? cost.region : cost.municipality;
    if (!coordinated) return baseCost;
    return Math.ceil(baseCost * COORDINATED_COST_MULTIPLIER);
}
