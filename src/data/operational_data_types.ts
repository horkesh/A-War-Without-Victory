/**
 * Browser-safe type definitions extracted from operational_data.ts.
 * Import these types instead of operational_data.ts in browser bundles
 * (warroom, tactical map) to avoid pulling in Node-only APIs.
 */

/** Operational settlement ID (e.g. op:mun1990:cluster). Same value space as SettlementId when graph is operational. */
export type OperationalSettlementId = string;

/**
 * Canonical SID → OSID. One canonical settlement maps to exactly one operational settlement.
 * Source: data/derived/operational/canonical_to_operational_map.json
 */
export type CanonicalToOperationalMap = Record<string, OperationalSettlementId>;

/**
 * OSID → list of canonical SIDs that map to it. SIDs per OSID are sorted for determinism.
 * Built from canonical_to_operational_map.
 */
export type OperationalToCanonicalReverseMap = Map<OperationalSettlementId, string[]>;

/** Per-OSID estimated population (1991 census, divided evenly across OSIDs within each municipality). */
export type OsidPopulationMap = Map<string, number>;

/** Per-OSID centroid coordinate from the contact graph (lat/lon). */
export interface OsidCentroid { lat: number; lon: number; }
/** OSID → Centroid. Used for topological Case B adjacency checks. */
export type OsidCentroidMap = Map<string, OsidCentroid>;

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}


// ── Browser-safe pure functions (no Node APIs) ─────────────────────────────

/**
 * Resolve location_osid for a formation: map hq_sid (canonical SID) to OSID, or use hq_sid if already OSID.
 * Deterministic: when hq_sid is in map, return map[hq_sid]; else return hq_sid when already op: prefix.
 */
export function resolveLocationOsid(
    hqSid: string | undefined,
    canonicalToOperational: CanonicalToOperationalMap
): OperationalSettlementId | undefined {
    if (hqSid == null || hqSid === '') return undefined;
    const osid = canonicalToOperational[hqSid];
    return osid ?? (hqSid.startsWith('op:') ? hqSid : undefined);
}

/**
 * Build OSID → sorted SIDs from SID → OSID map.
 * Determinism: each OSID's SID list is sorted by strict code-unit order.
 */
export function buildReverseMap(
    canonicalToOperational: CanonicalToOperationalMap
): OperationalToCanonicalReverseMap {
    const reverse = new Map<OperationalSettlementId, string[]>();
    for (const [sid, osid] of Object.entries(canonicalToOperational)) {
        const list = reverse.get(osid) ?? [];
        list.push(sid);
        reverse.set(osid, list);
    }
    for (const [, list] of reverse) {
        list.sort(strictCompare);
    }
    return reverse;
}
