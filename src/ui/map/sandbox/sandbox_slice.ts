/**
 * Sandbox Data Slicer — Extract a geographic subset from full AWWV data.
 *
 * Fetches full data files and filters to a bounding box or settlement ID list.
 * Returns a SliceData object containing only settlements, edges, formations,
 * and political control within the slice.
 */

import type { RegionDef } from './sandbox_scenarios.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SliceSettlement {
    sid: string;
    name: string;
    mun1990_id: string;
    pop: number;
    pop_bosniaks: number;
    pop_serbs: number;
    pop_croats: number;
    geometry: { type: string; coordinates: number[][][] };
    centroid: [number, number];  // [lon, lat]
}

export interface SliceEdge {
    a: string;
    b: string;
}

export interface SliceFormation {
    id: string;
    faction: string;
    name: string;
    kind: string;
    personnel: number;
    cohesion: number;
    fatigue: number;
    experience: number;
    posture: string;
    hq_sid: string;
    status: string;
    corps_id?: string;
    composition?: {
        infantry?: number;
        tanks?: number;
        artillery?: number;
        aa_systems?: number;
        tank_condition?: { operational: number; degraded: number; non_operational: number };
        artillery_condition?: { operational: number; degraded: number; non_operational: number };
    };
    equipment_state?: Record<string, unknown>;
}

export interface SliceData {
    region: RegionDef;
    settlements: SliceSettlement[];
    edges: SliceEdge[];
    political_controllers: Record<string, string | null>;
    formations: Record<string, SliceFormation>;
    brigade_aor: Record<string, string | null>;
    sidSet: Set<string>;
    sidToMun: Map<string, string>;
}

function compareId(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function canonicalEdge(a: string, b: string): SliceEdge {
    return compareId(a, b) <= 0 ? { a, b } : { a: b, b: a };
}

function edgeKey(edge: SliceEdge): string {
    return `${edge.a}:${edge.b}`;
}

/**
 * Canonicalize slice ordering for determinism:
 * - settlements by SID
 * - edges by canonical edge id a:b with a <= b
 * - object/map/set keys by SID or formation ID
 */
export function canonicalizeSliceData(input: SliceData): SliceData {
    const settlements = [...input.settlements].sort((a, b) => compareId(a.sid, b.sid));
    const sortedSids = settlements.map((s) => s.sid);

    const edges = input.edges
        .map((e) => canonicalEdge(e.a, e.b))
        .sort((a, b) => compareId(edgeKey(a), edgeKey(b)));

    const political_controllers: Record<string, string | null> = {};
    for (const sid of sortedSids) {
        political_controllers[sid] = input.political_controllers[sid] ?? null;
    }

    const formations: Record<string, SliceFormation> = {};
    for (const fid of Object.keys(input.formations).sort(compareId)) {
        formations[fid] = input.formations[fid]!;
    }

    const brigade_aor: Record<string, string | null> = {};
    for (const sid of sortedSids) {
        if (Object.prototype.hasOwnProperty.call(input.brigade_aor, sid)) {
            brigade_aor[sid] = input.brigade_aor[sid] ?? null;
        }
    }

    const sidSet = new Set<string>(sortedSids);
    const sidToMun = new Map<string, string>();
    for (const sid of sortedSids) {
        const mun = input.sidToMun.get(sid);
        if (mun) sidToMun.set(sid, mun);
    }

    return {
        region: input.region,
        settlements,
        edges,
        political_controllers,
        formations,
        brigade_aor,
        sidSet,
        sidToMun,
    };
}

// ---------------------------------------------------------------------------
// GeoJSON types (minimal)
// ---------------------------------------------------------------------------

interface GeoFeature {
    type: 'Feature';
    properties: {
        sid: string;
        settlement_name: string;
        mun1990_id: string;
        population_total: number;
        population_bosniaks: number;
        population_serbs: number;
        population_croats: number;
        population_others: number;
    };
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
}

interface SettlementsGeoJSON {
    type: 'FeatureCollection';
    features: GeoFeature[];
}

interface EdgesJSON {
    edges: Array<{ a: string; b: string }>;
}

interface GameSave {
    political_controllers: Record<string, string | null>;
    formations: Record<string, SliceFormation>;
    brigade_aor: Record<string, string | null>;
    meta?: { turn?: number; phase?: string };
    recruitment_state?: Record<string, unknown>;
    corps_command?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute centroid of a polygon ring (WGS84 [lon, lat] coords). */
function polygonCentroid(coords: number[][][]): [number, number] {
    let sumLon = 0, sumLat = 0, count = 0;
    const ring = coords[0];
    if (!ring) return [0, 0];
    for (const pt of ring) {
        sumLon += pt[0]!;
        sumLat += pt[1]!;
        count++;
    }
    return count > 0 ? [sumLon / count, sumLat / count] : [0, 0];
}

/** Check if a centroid falls within a bounding box. */
function inBbox(lon: number, lat: number, bbox: [number, number, number, number]): boolean {
    return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

// ---------------------------------------------------------------------------
// Main slicer
// ---------------------------------------------------------------------------

/**
 * Load full data and slice to a region.
 * Fetches settlements GeoJSON, edges, and optionally a game save.
 */
export async function loadSliceData(
    region: RegionDef,
    runId?: string | null,
    saveFile?: string,
): Promise<SliceData> {
    const settlementsUrl = '/data/derived/settlements_wgs84_1990.geojson';
    const edgesUrl = '/data/derived/settlement_edges.json';
    const saveUrl = runId ? `/runs/${runId}/${saveFile ?? 'initial_save.json'}` : null;

    // Parallel fetch
    const fetches = [fetch(settlementsUrl), fetch(edgesUrl)];
    if (saveUrl) fetches.push(fetch(saveUrl));

    const responses = await Promise.all(fetches);
    const [stRes, edRes] = responses;
    const saveRes = responses[2] ?? null;

    if (!stRes!.ok) throw new Error(`Settlements fetch failed: HTTP ${stRes!.status}`);
    if (!edRes!.ok) throw new Error(`Edges fetch failed: HTTP ${edRes!.status}`);

    const settlementsGeo = (await stRes!.json()) as SettlementsGeoJSON;
    const edgesJson = (await edRes!.json()) as EdgesJSON;
    let gameSave: GameSave | null = null;
    if (saveRes && saveRes.ok) {
        gameSave = (await saveRes.json()) as GameSave;
    }

    // 1. Filter settlements by bbox centroid
    const bbox = region.bbox;
    const sliceSettlements: SliceSettlement[] = [];
    const sidSet = new Set<string>();
    const sidToMun = new Map<string, string>();

    for (const feat of settlementsGeo.features) {
        const props = feat.properties;
        const geom = feat.geometry;
        // Compute centroid from geometry
        let centroid: [number, number];
        if (geom.type === 'MultiPolygon') {
            centroid = polygonCentroid((geom.coordinates as number[][][][])[0] ?? []);
        } else {
            centroid = polygonCentroid(geom.coordinates as number[][][]);
        }

        if (!inBbox(centroid[0], centroid[1], bbox)) continue;

        sidSet.add(props.sid);
        sidToMun.set(props.sid, props.mun1990_id);

        sliceSettlements.push({
            sid: props.sid,
            name: props.settlement_name,
            mun1990_id: props.mun1990_id,
            pop: props.population_total,
            pop_bosniaks: props.population_bosniaks,
            pop_serbs: props.population_serbs,
            pop_croats: props.population_croats,
            geometry: geom as { type: string; coordinates: number[][][] },
            centroid,
        });
    }

    // 2. Filter edges: both endpoints in slice
    const sliceEdges: SliceEdge[] = [];
    for (const e of edgesJson.edges) {
        if (sidSet.has(e.a) && sidSet.has(e.b)) {
            sliceEdges.push({ a: e.a, b: e.b });
        }
    }

    // 3. Political controllers: use game save or derive from ethnic majority
    const political_controllers: Record<string, string | null> = {};
    if (gameSave?.political_controllers) {
        for (const sid of sidSet) {
            political_controllers[sid] = gameSave.political_controllers[sid] ?? null;
        }
    } else {
        // Sandbox default: all settlements start uncontrolled (true sandbox)
        for (const s of sliceSettlements) {
            political_controllers[s.sid] = null;
        }
    }

    // 4. Formations: only those with HQ in slice (with safe defaults)
    const formations: Record<string, SliceFormation> = {};
    if (gameSave?.formations) {
        for (const [fid, f] of Object.entries(gameSave.formations)) {
            if (sidSet.has(f.hq_sid)) {
                formations[fid] = {
                    id: fid,
                    faction: f.faction,
                    name: f.name,
                    kind: f.kind,
                    personnel: f.personnel ?? 0,
                    cohesion: f.cohesion ?? 70,
                    fatigue: f.fatigue ?? 0,
                    experience: f.experience ?? 0,
                    posture: f.posture ?? 'defend',
                    hq_sid: f.hq_sid,
                    status: f.status ?? 'active',
                    corps_id: f.corps_id,
                    composition: f.composition,
                    equipment_state: f.equipment_state,
                };
            }
        }
    }

    // 5. Brigade AoR: only slice settlements
    const brigade_aor: Record<string, string | null> = {};
    if (gameSave?.brigade_aor) {
        for (const sid of sidSet) {
            if (gameSave.brigade_aor[sid] !== undefined) {
                brigade_aor[sid] = gameSave.brigade_aor[sid];
            }
        }
    }

    console.log(`[sandbox-slice] Region "${region.name}": ${sliceSettlements.length} settlements, ${sliceEdges.length} edges, ${Object.keys(formations).length} formations`);

    const slice: SliceData = {
        region,
        settlements: sliceSettlements,
        edges: sliceEdges,
        political_controllers,
        formations,
        brigade_aor,
        sidSet,
        sidToMun,
    };
    return canonicalizeSliceData(slice);
}
