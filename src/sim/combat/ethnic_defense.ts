/**
 * Ethnic homeland defense mechanics.
 *
 * Defenders fight harder when defending territory where their co-ethnic
 * population is the majority (1991 census). This models the documented
 * "homeland defense" motivation that was especially strong for ARBiH
 * defending Bosniak towns and VRS defending Serb-majority areas.
 *
 * Deterministic: no randomness, no timestamps.
 */

/** Per-OSID ethnic composition (averaged from canonical settlements' 1991 census). */
export type OsidEthnicComposition = Map<string, { bosniak: number; serb: number; croat: number }>;

/**
 * Get the co-ethnic population share for a faction in an OSID.
 * Returns 0.0–1.0 (fraction of population that is co-ethnic with the faction).
 *
 * Faction → ethnicity mapping:
 *   RS → serb, RBiH → bosniak, HRHB → croat
 */
export function getCoEthnicShare(
    osid: string,
    faction: string,
    ethnicMap: OsidEthnicComposition | undefined | null
): number {
    if (!ethnicMap) return 0;
    const comp = ethnicMap.get(osid);
    if (!comp) return 0;
    switch (faction) {
        case 'RS': return comp.serb;
        case 'RBiH': return comp.bosniak;
        case 'HRHB': return comp.croat;
        default: return 0;
    }
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Maximum ethnic defense bonus (multiplicative: ×1.12 at full effect). */
const MAX_ETHNIC_DEFENSE_BONUS = 0.12;

/** Co-ethnic share threshold below which no bonus applies. */
const ETHNIC_DEFENSE_THRESHOLD = 0.30;

/** Co-ethnic share at which full bonus applies. */
const ETHNIC_DEFENSE_FULL = 0.60;

/**
 * Ethnic homeland defense bonus for defenders.
 *
 * When a formation defends an OSID where its co-ethnic population is significant,
 * it gets a graduated defense bonus:
 *   - <30% co-ethnic: 0% bonus (not defending "their" people)
 *   - 30–60% co-ethnic: graduated 0%→12%
 *   - ≥60% co-ethnic: full 12% bonus
 *
 * Returns 0.0 to MAX_ETHNIC_DEFENSE_BONUS (applied as × (1 + bonus) in defender power).
 */
export function getEthnicDefenseBonus(coEthnicShare: number): number {
    if (coEthnicShare >= ETHNIC_DEFENSE_FULL) return MAX_ETHNIC_DEFENSE_BONUS;
    if (coEthnicShare >= ETHNIC_DEFENSE_THRESHOLD) {
        return MAX_ETHNIC_DEFENSE_BONUS * (coEthnicShare - ETHNIC_DEFENSE_THRESHOLD)
            / (ETHNIC_DEFENSE_FULL - ETHNIC_DEFENSE_THRESHOLD);
    }
    return 0;
}
