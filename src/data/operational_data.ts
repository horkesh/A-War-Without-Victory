/**
 * Single source for canonical↔operational settlement mapping and OSID-level data.
 * Used for: location_osid on formations, OSID control derivation, stable iteration.
 *
 * Determinism: All iteration over OSIDs or map keys uses sorted order (localeCompare).
 * Canon: OSID + Attack Resolution roadmap (data/state phase).
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEdges } from '../map/settlements_parse.js';
import type { EdgeRecord } from '../map/settlements.js';

// Re-export types and browser-safe pure functions for backward compatibility
export type {
    OperationalSettlementId,
    CanonicalToOperationalMap,
    OperationalToCanonicalReverseMap,
    OsidPopulationMap,
} from './operational_data_types.js';
export { resolveLocationOsid, buildReverseMap } from './operational_data_types.js';
import { resolveLocationOsid, buildReverseMap } from './operational_data_types.js';
import type { OperationalSettlementId, CanonicalToOperationalMap, OperationalToCanonicalReverseMap } from './operational_data_types.js';

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
    const path = resolve(
        baseDir ?? process.cwd(),
        'data/derived/operational/operational_contact_graph.json'
    );
    const content = await readFile(path, 'utf8');
    const raw = JSON.parse(content) as unknown;
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
    const path = resolve(
        baseDir ?? process.cwd(),
        'data/derived/operational/canonical_to_operational_map.json'
    );
    const content = await readFile(path, 'utf8');
    const raw = JSON.parse(content) as unknown;
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

// buildReverseMap is re-exported from operational_data_types.ts (browser-safe)

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

// resolveLocationOsid is re-exported from operational_data_types.ts (browser-safe)

/**
 * Backfill location_osid for all formations that have hq_sid but no location_osid.
 * Mutates state.formations. Call after formations are loaded/created and when canonicalToOperational is available.
 * Deterministic: formations iterated in sorted id order.
 */
import type { OsidPopulationMap } from './operational_data_types.js';

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

// ---------------------------------------------------------------------------
// OSID area data
// ---------------------------------------------------------------------------

export type OsidAreaMap = Record<string, number>;

export interface OsidAreaData {
    totalArea: number;
    areas: OsidAreaMap;
}

/**
 * Load precomputed OSID areas from osid_areas.json.
 * Returns total area and per-OSID area in km².
 */
export async function loadOsidAreas(baseDir?: string): Promise<OsidAreaData> {
    const areaPath = resolve(
        baseDir ?? process.cwd(),
        'data/derived/operational/osid_areas.json'
    );
    const content = await readFile(areaPath, 'utf8');
    const raw = JSON.parse(content) as { total_area_km2: number; areas: Record<string, number> };
    return {
        totalArea: raw.total_area_km2,
        areas: raw.areas,
    };
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
