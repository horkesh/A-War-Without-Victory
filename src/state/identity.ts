export const POLITICAL_SIDES = ["RBiH", "RS", "HRHB"] as const;
export type PoliticalSideId = typeof POLITICAL_SIDES[number];

export const ARMY_LABELS = ["ARBiH", "VRS", "HVO"] as const;
export type ArmyLabel = typeof ARMY_LABELS[number];

/**
 * Canonicalizes a faction ID to a political side ID.
 * Maps legacy army labels to their political sides:
 * - "ARBiH" -> "RBiH"
 * - "VRS" -> "RS"
 * - "HVO" -> "HRHB"
 * Otherwise returns the input ID unchanged.
 */
export function canonicalizePoliticalSideId(id: string): PoliticalSideId | string {
    if (id === "ARBiH") return "RBiH";
    if (id === "VRS") return "RS";
    if (id === "HVO") return "HRHB";
    return id;
}

/**
 * Returns the default army label for a given political side.
 * Mapping:
 * - RBiH -> ARBiH
 * - RS -> VRS
 * - HRHB -> HVO
 */
/**
 * Normalizes any faction string variant to a canonical PoliticalSideId.
 * Handles: canonical (RS, RBiH, HRHB), army labels (VRS, ARBiH, HVO),
 * uppercase (RBIH, ARBIH), and lowercase (rs, rbih, hrhb, vrs, arbih, hvo).
 * Returns the input unchanged if no mapping is found.
 */
export function normalizeFactionId(id: string): PoliticalSideId | string {
    const upper = id.toUpperCase();
    if (upper === 'RS' || upper === 'VRS') return 'RS';
    if (upper === 'RBIH' || upper === 'ARBIH') return 'RBiH';
    if (upper === 'HRHB' || upper === 'HVO') return 'HRHB';
    return id;
}

export function defaultArmyLabelForSide(side: PoliticalSideId): ArmyLabel {
    if (side === "RBiH") return "ARBiH";
    if (side === "RS") return "VRS";
    if (side === "HRHB") return "HVO";
    // TypeScript exhaustiveness check - should never reach here
    const _exhaustive: never = side;
    return _exhaustive;
}
