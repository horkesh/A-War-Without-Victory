/**
 * Constants for corps front sector building and territory assignment.
 * Extracted from corps_front_sectors.ts (Phase C Trust-and-Baseline split).
 */

/** Minimum front edges for a sub-segment to be promoted to its own sector. */
export const MIN_SECTOR_EDGES = 5;

/** Maximum edges per sector before forced split at midpoint. */
export const MAX_SECTOR_EDGES = 25;

/** Maximum brigades per sector before forced split. */
export const MAX_SECTOR_BRIGADES = 8;

/** Maximum reserve brigades per sector. One reserve, 1 hop behind the front. */
export const MAX_RESERVES_PER_SECTOR = 1;

// MAX_TERRITORY_OSIDS removed — every friendly OSID must be claimed.
// GOLDEN RULE: every brigade must be in a sector, which requires every
// friendly OSID to belong to a sector's territory.

/** Corps IDs exempt from sector assignment (army staff, future-conflict reserves). */
export const EXEMPT_CORPS_IDS = new Set<string>([
    'arbih_general_staff',
    'vrs_main_staff',
    'hvo_general_staff',
]);
