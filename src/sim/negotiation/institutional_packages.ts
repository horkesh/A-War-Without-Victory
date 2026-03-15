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
