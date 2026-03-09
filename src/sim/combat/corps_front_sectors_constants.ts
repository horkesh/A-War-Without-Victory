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

/** Maximum reserve brigades per front edge (proportional cap). ~1 per typical 10-18 edge sector. */
export const RESERVE_PER_EDGE_CAP = 0.07;

/** Maximum territory OSIDs a single sector can claim via Voronoi BFS. */
export const MAX_TERRITORY_OSIDS = 40;

/** Maximum BFS hops from sector front for a brigade to qualify as reserve. */
export const MAX_RESERVE_HOPS = 3;

/** Corps IDs exempt from sector assignment (army staff, future-conflict reserves). */
export const EXEMPT_CORPS_IDS = new Set<string>([
    'arbih_general_staff',
    'vrs_main_staff',
    'hvo_general_staff',
    'hvo_central_bosnia', // Reserved for Bosniak-Croat conflict
]);
