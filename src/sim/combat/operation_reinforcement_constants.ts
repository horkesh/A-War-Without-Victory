/**
 * Constants for corps-wide operation reinforcement (brigade concentration).
 *
 * Data-driven from n855 40w run analysis:
 * - 67 invalid operation-turns from zero eligible attackers
 * - 2-brigade ops fail 75% of the time
 * - vrs_1st_krajina has +19 brigade surplus while neighboring corps starve
 * - Most corps have sectors in multiple disconnected components
 */

/** Max BFS hops from target sector friendly OSIDs to source brigade location.
 *  At 1 hop/turn column march, 6 hops = 6 turns — fits within 3-7 turn preparation windows.
 *  Beyond 6, brigades arrive too late for staging. */
export const MAX_OP_LOAN_DISTANCE = 6;

/** Max brigades that can be loaned from other sectors to a single operation.
 *  Combined with MAX_PARTICIPATING_BRIGADES (20), prevents over-concentration.
 *  A 36-brigade corps (vrs_1st_krajina) is capped at 6 loans — the target sector
 *  must contribute its own brigades too. */
export const MAX_LOANED_PER_OP = 6;

/** Source sector threat_ratio ceiling — don't pull from sectors already under pressure.
 *  At 1.5, the enemy has 50% more combat power than the sector's defenders.
 *  Stripping brigades from a sector above this threshold invites breakthrough. */
export const SOURCE_SECTOR_MAX_THREAT = 1.5;

/** Minimum sector_attack force (total: sector natives + loans).
 *  2-brigade ops had 75% failure rate and 3.1 invalid turns each in n855.
 *  Raising to 3 eliminates the worst failure mode. Probes stay at 2 (sector-scoped). */
export const MIN_BRIGADES_FOR_SECTOR_ATTACK = 3;

/** Fraction of loaned brigades that must arrive before staging can complete.
 *  Don't wait for stragglers — if 5 of 6 arrive and one got disrupted en route, launch.
 *  0.7 = 70% (e.g. 5 of 6, 4 of 5, 3 of 4). */
export const LOAN_ARRIVAL_THRESHOLD = 0.7;

/** Extra turns beyond max loan distance to wait for arrivals.
 *  Buffer for disruptions, path changes. Staging timeout = max_march_distance + this. */
export const LOAN_STAGING_BUFFER_TURNS = 2;
