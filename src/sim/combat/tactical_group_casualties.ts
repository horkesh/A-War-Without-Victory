/**
 * Tactical Group casualty distribution (ADR-0005 v2.1).
 *
 * Pure math helper: takes a battle's total casualties, splits them across
 * the TG's anchor and donors per ADR-0005 §Battle resolution:
 *
 *   anchor.personnel -= floor(C * 0.50)            // anchor floor: ≥50%
 *   for each donor:
 *     share = donor.personnel_lent / sum(personnel_lent)
 *     donor.personnel -= floor(C * 0.50 * share)
 *
 * Integer pro-rata via **largest-remainder method**; ties broken by donor
 * `brigade_id` strictCompare (determinism).
 *
 * Hard Invariant #5 (casualties capped at donated amount): cumulative
 * per-donor casualties never exceed `personnel_lent`. Each battle is capped
 * at the donor's remaining loan. Any excess from the pro-rata
 * pool is reassigned to the anchor — see §Edge cases below.
 *
 * v2.1 scope: personnel only. v2.2 extends to heavy equipment using the
 * same anchor-floor + pro-rata pattern. v2.1 is purely additive — no call
 * site yet; v2.2 wires this into `attack_resolution_osid.ts` battle math
 * alongside combat power synthesis.
 *
 * Edge cases:
 *   - totalCasualties = 0           → returns zero distribution
 *   - donors empty                  → anchor takes 100%
 *   - sum(personnel_lent) = 0       → anchor takes 100% (defensive)
 *   - pro-rata cap (Hard Inv #5)    → overflow reassigned to anchor
 *   - all-equal donations + odd     → largest-remainder tiebreak by
 *     remainder count → deterministic order by brigade_id strictCompare
 */

import type { FormationId, TgDonorContribution } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface CasualtyDistribution {
    /** Casualties absorbed by the anchor brigade (≥50% of totalCasualties). */
    anchor_casualties: number;
    /** Per-donor casualties; keyed by donor brigade_id. */
    donor_casualties: Record<FormationId, number>;
}

/** Anchor casualty floor per ADR-0005 §Battle resolution. Non-negotiable. */
export const ANCHOR_CASUALTY_FLOOR_FRACTION = 0.5;

/**
 * Distribute total battle casualties across a TG's anchor + donors.
 *
 * Returns the per-formation casualty counts. Caller is responsible for
 * applying them to FormationState personnel and updating
 * `donor.casualties_so_far` (Hard Invariant #3 per-brigade tally).
 */
export function distributeCasualtiesAcrossTg(
    totalCasualties: number,
    anchorBrigadeId: FormationId,
    donors: readonly TgDonorContribution[],
): CasualtyDistribution {
    if (totalCasualties <= 0) {
        return { anchor_casualties: 0, donor_casualties: {} };
    }

    // Anchor floor: at least 50%, non-negotiable.
    const anchorBase = Math.floor(totalCasualties * ANCHOR_CASUALTY_FLOOR_FRACTION);
    const donorPool = totalCasualties - anchorBase;

    // No donors → anchor takes everything (defensive; pure-anchor TG case).
    if (donors.length === 0) {
        return { anchor_casualties: totalCasualties, donor_casualties: {} };
    }

    const totalLent = donors.reduce((sum, d) => sum + d.personnel_lent, 0);
    if (totalLent <= 0) {
        // Donors exist but lent nothing. Anchor absorbs the full pool.
        return { anchor_casualties: totalCasualties, donor_casualties: {} };
    }

    // Largest-remainder method for integer pro-rata.
    interface Allocation {
        brigade_id: FormationId;
        floor: number;
        remainder: number;
        cap: number;
    }
    const allocations: Allocation[] = donors.map((d) => {
        const exact = (donorPool * d.personnel_lent) / totalLent;
        const floor = Math.floor(exact);
        return {
            brigade_id: d.brigade_id,
            floor,
            remainder: exact - floor,
            cap: Math.max(0, d.personnel_lent - d.casualties_so_far), // Hard Invariant #5
        };
    });

    const allocatedFloors = allocations.reduce((sum, a) => sum + a.floor, 0);
    let leftover = donorPool - allocatedFloors;

    // Distribute leftover by largest remainder; deterministic tiebreak by brigade_id.
    if (leftover > 0) {
        const sortedByRemainder = [...allocations].sort((a, b) => {
            if (b.remainder !== a.remainder) return b.remainder - a.remainder;
            return strictCompare(a.brigade_id, b.brigade_id);
        });
        let i = 0;
        while (leftover > 0 && i < sortedByRemainder.length) {
            const alloc = sortedByRemainder[i];
            alloc.floor += 1;
            leftover -= 1;
            i += 1;
        }
    }

    // Apply Hard Invariant #5: cap at the remaining loan, reassign overflow to anchor.
    let anchorOverflow = 0;
    for (const alloc of allocations) {
        if (alloc.floor > alloc.cap) {
            anchorOverflow += alloc.floor - alloc.cap;
            alloc.floor = alloc.cap;
        }
    }

    const donor_casualties: Record<FormationId, number> = {};
    for (const alloc of allocations) {
        donor_casualties[alloc.brigade_id] = alloc.floor;
    }

    return {
        anchor_casualties: anchorBase + anchorOverflow,
        donor_casualties,
    };
}
