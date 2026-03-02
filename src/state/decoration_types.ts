/**
 * Brigade decoration types.
 *
 * Three tiers per faction. Highest tier's bonus applies (no stacking).
 * Decorations can be historical (loaded from OOB) or earned during gameplay.
 * Once earned, decorations are permanent.
 */

import type { FactionId } from './game_state.js';

/** Faction-agnostic decoration tier. Maps to named decorations per faction. */
export type DecorationTier = 'tier_1' | 'tier_2' | 'tier_3';

/** A single decoration awarded to a brigade. */
export interface BrigadeDecoration {
    /** Decoration tier (tier_1 = basic, tier_3 = highest). */
    tier: DecorationTier;
    /** Turn when decoration was awarded (0 = historical/pre-assigned). */
    awarded_turn: number;
    /** Human-readable reason for the award. */
    reason: string;
}

/** Historical decoration entry in OOB data. */
export interface HistoricalDecoration {
    tier: DecorationTier;
    /** Display name (e.g. "Slavna", "Medalja Petra Mrkonjica"). */
    name: string;
}

/**
 * Decoration display names by faction and tier.
 *
 * ARBiH: Slavna / Viteška / Orden Zlatni Ljiljan
 * VRS:   Medalja Petra Mrkonjića / Orden Nemanjića / Orden Miloša Obilića
 * HVO:   Red N.Š. Zrinskog / Red Kneza Domagoja / Red Hrvatskog Trolista
 */
export const DECORATION_DISPLAY_NAMES: Record<string, Record<DecorationTier, string>> = {
    RBiH: {
        tier_1: 'Slavna',
        tier_2: 'Viteška',
        tier_3: 'Orden Zlatni Ljiljan',
    },
    RS: {
        tier_1: 'Medalja Petra Mrkonjića',
        tier_2: 'Orden Nemanjića',
        tier_3: 'Orden Miloša Obilića',
    },
    HRHB: {
        tier_1: 'Red Nikole Šubića Zrinskog',
        tier_2: 'Red Kneza Domagoja',
        tier_3: 'Red Hrvatskog Trolista',
    },
};

/** Short display names for compact UI (corps panel, map labels). */
export const DECORATION_SHORT_NAMES: Record<string, Record<DecorationTier, string>> = {
    RBiH: { tier_1: 'Slavna', tier_2: 'Viteška', tier_3: 'Zlatni Ljiljan' },
    RS: { tier_1: 'Mrkonjić', tier_2: 'Nemanjić', tier_3: 'Obilić' },
    HRHB: { tier_1: 'Zrinski', tier_2: 'Domagoj', tier_3: 'Trolist' },
};

/** Get the display name for a decoration tier and faction. */
export function getDecorationDisplayName(faction: FactionId, tier: DecorationTier): string {
    return DECORATION_DISPLAY_NAMES[faction]?.[tier] ?? tier;
}

/** Get the short name for a decoration tier and faction. */
export function getDecorationShortName(faction: FactionId, tier: DecorationTier): string {
    return DECORATION_SHORT_NAMES[faction]?.[tier] ?? tier;
}

/** Get the highest decoration tier from an array of decorations. Returns null if none. */
export function getHighestDecorationTier(decorations: BrigadeDecoration[]): DecorationTier | null {
    let maxRank = 0;
    let maxTier: DecorationTier | null = null;
    for (const d of decorations) {
        const rank = d.tier === 'tier_3' ? 3 : d.tier === 'tier_2' ? 2 : 1;
        if (rank > maxRank) {
            maxRank = rank;
            maxTier = d.tier;
        }
    }
    return maxTier;
}
