/**
 * Institutional negotiation packages for the Dayton negotiation.
 *
 * Each package represents a governance dimension of the post-war state.
 * The centralized option strengthens the central state (ARBiH goal),
 * while the decentralized option strengthens entity autonomy (RS goal).
 *
 * Costs are asymmetric: centralized outcomes cost RS capital (they must
 * concede autonomy), while decentralized outcomes cost RBiH capital
 * (they must accept a weaker central state).
 *
 * Deterministic: constant data, no randomness.
 */

import type { InstitutionalPackage } from '../../state/negotiation_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Package definitions
// ═══════════════════════════════════════════════════════════════════════════

export const INSTITUTIONAL_PACKAGES: readonly InstitutionalPackage[] = [
    {
        id: 'military',
        name: 'Military Structure',
        description:
            'Unified armed forces under central command vs. separate entity armies. ' +
            'Historically, Dayton created entity armies (VF and VRS) with a weak central MoD. ' +
            'Unification was not achieved until 2005.',
        centralized_cost: 15,
        decentralized_cost: 10,
    },
    {
        id: 'presidency',
        name: 'Presidency',
        description:
            'Single president elected by all citizens vs. tripartite rotating presidency ' +
            'with one member per constituent people. Historically, Dayton created the tripartite ' +
            'rotating presidency — widely criticized as dysfunctional but protective of group rights.',
        centralized_cost: 20,
        decentralized_cost: 5,
    },
    {
        id: 'police',
        name: 'Police Forces',
        description:
            'Central police force with nationwide jurisdiction vs. entity-level police. ' +
            'Historically, Dayton created entity police forces. Police reform remained a major ' +
            'EU condition for integration for decades afterward.',
        centralized_cost: 10,
        decentralized_cost: 5,
    },
    {
        id: 'judiciary',
        name: 'Judiciary',
        description:
            'Central court system with binding authority vs. entity courts with limited central oversight. ' +
            'Historically, Dayton created a Constitutional Court with mixed domestic/international judges ' +
            'but left most judiciary at entity level.',
        centralized_cost: 10,
        decentralized_cost: 8,
    },
    {
        id: 'economy',
        name: 'Economic Governance',
        description:
            'Unified taxation and economic policy under central institutions vs. entity economic autonomy. ' +
            'Historically, Dayton created a Central Bank and common currency but left most fiscal policy ' +
            'at entity level, creating significant economic fragmentation.',
        centralized_cost: 15,
        decentralized_cost: 10,
    },
    {
        id: 'education',
        name: 'Education System',
        description:
            'Unified national curriculum and education standards vs. entity-controlled education ' +
            'with separate curricula per community. Historically, Dayton left education entirely ' +
            'at entity/canton level, resulting in "two schools under one roof" and segregated education.',
        centralized_cost: 10,
        decentralized_cost: 3,
    },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Lookup helpers
// ═══════════════════════════════════════════════════════════════════════════

const packageMap = new Map<string, InstitutionalPackage>();
for (const pkg of INSTITUTIONAL_PACKAGES) {
    packageMap.set(pkg.id, pkg);
}

/** Get an institutional package by ID. Returns undefined if not found. */
export function getInstitutionalPackageById(id: string): InstitutionalPackage | undefined {
    return packageMap.get(id);
}

/** Get all institutional packages. */
export function getAllInstitutionalPackages(): readonly InstitutionalPackage[] {
    return INSTITUTIONAL_PACKAGES;
}

/**
 * Compute the cost of an institutional choice to a specific faction.
 *
 * - Centralized: costs RS (centralized_cost), benefits RBiH (0 cost)
 * - Decentralized: costs RBiH (decentralized_cost), benefits RS (0 cost)
 * - HRHB: pays half of whichever side loses (they're a swing faction)
 */
export function getInstitutionalCost(
    pkg: InstitutionalPackage,
    choice: 'centralized' | 'decentralized',
    faction: string
): number {
    if (choice === 'centralized') {
        if (faction === 'RS') return pkg.centralized_cost;
        if (faction === 'HRHB') return Math.floor(pkg.centralized_cost * 0.5);
        return 0; // RBiH benefits
    } else {
        if (faction === 'RBiH') return pkg.decentralized_cost;
        if (faction === 'HRHB') return Math.floor(pkg.decentralized_cost * 0.5);
        return 0; // RS benefits
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Entity Autonomy Index (D2, owner ruling Opt B)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derived, read-only entity-autonomy index (0-100): the weighted mean of the 6
 * granular institutional choices, where a *decentralized* choice means more entity
 * autonomy. 100 = every dimension decentralized = the historical Dayton default
 * (a residual-powers-to-the-Entities, highly-decentralized constitution). 0 = a
 * fully centralized (unitary) state.
 *
 * Per-dimension weights reflect how much each competency drives real entity
 * sovereignty (defense/economy/police weigh most; education least). Weights sum to
 * 1.0. No new authored content — this is a pure derivation over the existing 6
 * choices, exposed for display and as a verdict / peace-dysfunction input.
 *
 * DEFAULT: an unspecified or missing dimension is treated as decentralized (the
 * historical Dayton default), so an empty/partial choice map reads as maximally
 * autonomous — matching how dayton_negotiation defaults unmade choices.
 *
 * Pure & deterministic: sorted iteration via strictCompare, integer-rounded output.
 */
const AUTONOMY_DIMENSION_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
    military: 0.25,
    economy: 0.20,
    police: 0.18,
    judiciary: 0.15,
    presidency: 0.12,
    education: 0.10,
});

export function computeEntityAutonomyIndex(
    institutionalChoices: Record<string, 'centralized' | 'decentralized'>,
): number {
    let weighted = 0;
    let totalWeight = 0;
    // Iterate the canonical package set (sorted) so the result is independent of
    // input key order and of which keys the caller happened to populate.
    const ids = INSTITUTIONAL_PACKAGES.map(p => p.id).slice().sort(strictCompareLocal);
    for (const id of ids) {
        const weight = AUTONOMY_DIMENSION_WEIGHTS[id] ?? 0;
        if (weight <= 0) continue;
        // Default unspecified dimensions to decentralized (historical Dayton default).
        const choice = institutionalChoices?.[id] ?? 'decentralized';
        const autonomy = choice === 'decentralized' ? 100 : 0;
        weighted += autonomy * weight;
        totalWeight += weight;
    }
    if (totalWeight <= 0) return 100;
    return Math.round((weighted / totalWeight) * 10) / 10;
}

/** Local stable string comparator (avoids a cross-module import cycle). */
function strictCompareLocal(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}
