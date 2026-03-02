/**
 * Single source for canonical↔operational settlement mapping and OSID-level data.
 * Used for: location_osid on formations, OSID control derivation, stable iteration.
 *
 * Determinism: All iteration over OSIDs or map keys uses sorted order (localeCompare).
 * Canon: OSID + Attack Resolution roadmap (data/state phase).
 */

import { parseEdges } from '../map/settlements_parse.js';
import type { EdgeRecord } from '../map/settlements.js';

async function readOperationalJson(baseDir: string | undefined, relativePath: string): Promise<unknown> {
    const [{ readFile }, pathModule] = await Promise.all([
        import('node:fs/promises'),
        import('node:path'),
    ]);
    const filePath = pathModule.resolve(baseDir ?? process.cwd(), relativePath);
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as unknown;
}

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

export interface LoadedOperationalData {
    /** SID (canonical) → OSID. Keys iterated in sorted order. */
    canonicalToOperational: CanonicalToOperationalMap;
    /** OSID → sorted SIDs. Use getOsidKeysSorted() for stable iteration. */
    operationalToCanonical: OperationalToCanonicalReverseMap;
    /** OSID adjacency edges from operational_contact_graph.json. */
    edges?: EdgeRecord[];
}

/**
 * Load operational contact graph edges (OSID adjacency).
 * Source: data/derived/operational/operational_contact_graph.json.
 * Determinism: parseEdges preserves array order from file; use sorted iteration when needed.
 */
export async function loadOperationalEdges(baseDir?: string): Promise<EdgeRecord[]> {
    const raw = await readOperationalJson(
        baseDir,
        'data/derived/operational/operational_contact_graph.json'
    );
    return parseEdges(raw);
}

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Load canonical_to_operational_map from JSON and build reverse map.
 * Single load point; call once and pass LoadedOperationalData where needed.
 * Determinism: reverse map values (SID arrays) are sorted per OSID.
 */
export async function loadOperationalData(
    baseDir?: string
): Promise<LoadedOperationalData> {
    const raw = await readOperationalJson(
        baseDir,
        'data/derived/operational/canonical_to_operational_map.json'
    );
    if (!isRecord(raw)) {
        throw new Error('canonical_to_operational_map: expected object');
    }
    const canonicalToOperational: CanonicalToOperationalMap = {};
    for (const [sid, osid] of Object.entries(raw)) {
        if (typeof sid === 'string' && typeof osid === 'string') {
            canonicalToOperational[sid] = osid;
        }
    }
    const operationalToCanonical = buildReverseMap(canonicalToOperational);
    return { canonicalToOperational, operationalToCanonical };
}

/**
 * Build OSID → sorted SIDs from SID → OSID map.
 * Determinism: each OSID's SID list is sorted with localeCompare.
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
    for (const [osid, list] of reverse) {
        list.sort((a, b) => a.localeCompare(b));
        reverse.set(osid, list);
    }
    return reverse;
}

/**
 * Return OSIDs in stable sorted order for iteration.
 */
export function getOsidKeysSorted(data: LoadedOperationalData): OperationalSettlementId[] {
    const osids = new Set<OperationalSettlementId>();
    for (const osid of data.operationalToCanonical.keys()) {
        osids.add(osid);
    }
    return Array.from(osids).sort((a, b) => a.localeCompare(b));
}

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
 * Backfill location_osid for all formations that have hq_sid but no location_osid.
 * Mutates state.formations. Call after formations are loaded/created and when canonicalToOperational is available.
 * Deterministic: formations iterated in sorted id order.
 */
/** Per-OSID estimated population (1991 census, divided evenly across OSIDs within each municipality). */
export type OsidPopulationMap = Map<string, number>;

/**
 * Compute per-OSID population by dividing municipality total population across OSIDs.
 * OSID format: `op:municipality:slug` — municipality extracted from second segment.
 * Deterministic: result depends only on reverseMap keys and munPopulation values.
 */
export function computeOsidPopulation(
    reverseMap: OperationalToCanonicalReverseMap,
    munPopulation: Record<string, { total: number }>
): OsidPopulationMap {
    // Count OSIDs per municipality
    const osidsByMun = new Map<string, string[]>();
    for (const osid of reverseMap.keys()) {
        const parts = osid.split(':');
        if (parts.length < 2) continue;
        const mun = parts[1]!;
        const list = osidsByMun.get(mun) ?? [];
        list.push(osid);
        osidsByMun.set(mun, list);
    }
    const result: OsidPopulationMap = new Map();
    for (const [mun, osids] of osidsByMun) {
        const entry = munPopulation[mun];
        if (!entry || entry.total <= 0) continue;
        const perOsid = Math.floor(entry.total / osids.length);
        for (const osid of osids) {
            result.set(osid, perOsid);
        }
    }
    return result;
}

export function backfillFormationLocationOsid(
    state: { formations?: Record<string, { hq_sid?: string; location_osid?: string }> },
    canonicalToOperational: CanonicalToOperationalMap
): void {
    const formations = state.formations;
    if (!formations || typeof formations !== 'object') return;
    const ids = Object.keys(formations).sort((a, b) => a.localeCompare(b));
    for (const id of ids) {
        const f = formations[id];
        if (!f || f.location_osid != null) continue;
        const osid = resolveLocationOsid(f.hq_sid, canonicalToOperational);
        if (osid != null) {
            (f as { location_osid?: string }).location_osid = osid;
        }
    }
}
