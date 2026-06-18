/**
 * derive_operational_settlements.ts
 *
 * Balanced ethnic-aware k-way partitioning of canonical settlements into
 * ~TARGET_OPS_PER_MUN operational settlements per municipality.
 *
 * Algorithm:
 *   Phase 0: Pre-clustering splits (Mostar along Neretva)
 *   Phase 1: Ethnic classification
 *   Phase 2: Municipality target allocation with ethnic partitions
 *   Phase 3: Seed selection via farthest-first heuristic
 *   Phase 4: Multi-source BFS cluster growth (graph Voronoi)
 *   Phase 5+6: Global topology → simplify → topological merge by cluster
 *   Phase 7: Output files
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { featureCollection, polygon } from '@turf/helpers';
import union from '@turf/union';
import bbox from '@turf/bbox';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-server';
import * as topojsonClient from 'topojson-client';
import * as topojsonSimplify from 'topojson-simplify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJ_ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(PROJ_ROOT, 'data');
const OUT_DIR = resolve(DATA_DIR, 'derived', 'operational');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ─── Data Loading ───────────────────────────────────────────────────────────
console.log('Loading source data...');
const substrateGeoJSON = JSON.parse(readFileSync(resolve(DATA_DIR, 'derived', 'settlements_wgs84_1990.geojson'), 'utf8'));
const contactGraph = JSON.parse(readFileSync(resolve(DATA_DIR, 'derived', 'settlement_contact_graph.json'), 'utf8'));
const ethnicityRaw = JSON.parse(readFileSync(resolve(DATA_DIR, 'derived', 'settlement_ethnicity_data.json'), 'utf8'));
const zoneConfig = JSON.parse(readFileSync(resolve(DATA_DIR, 'source', 'clustering_zone_config.json'), 'utf8'));

const TARGET = zoneConfig.parameters.TARGET_OPS_PER_MUN as number;
const ETHNIC_FLEX_POP = zoneConfig.parameters.ETHNIC_FLEX_POP as number;
const MAJORITY_THRESHOLD = zoneConfig.parameters.MAJORITY_THRESHOLD as number;

// Ethnicity data: by_settlement_id -> { majority, composition: { bosniak, croat, serb, other } }
const ethnicityData: Record<string, { majority: string; composition: Record<string, number> }> =
    ethnicityRaw.by_settlement_id ?? ethnicityRaw;

console.log(`Config: TARGET=${TARGET}, MAJORITY_THRESHOLD=${MAJORITY_THRESHOLD}`);

// ─── Adjacency Map ──────────────────────────────────────────────────────────
const adjMap = new Map<string, Set<string>>();
for (const edge of contactGraph.edges) {
    if (!adjMap.has(edge.a)) adjMap.set(edge.a, new Set());
    if (!adjMap.has(edge.b)) adjMap.set(edge.b, new Set());
    adjMap.get(edge.a)!.add(edge.b);
    adjMap.get(edge.b)!.add(edge.a);
}

// Feature map
const featuresBySid = new Map<string, any>();
for (const f of substrateGeoJSON.features) {
    featuresBySid.set(f.properties.sid, f);
}

// ─── Ethnic Key Computation ─────────────────────────────────────────────────
function getEthnicKey(sid: string): string {
    const d = ethnicityData[sid];
    if (!d || !d.composition) return 'X';
    const comp = d.composition;
    const pop = featuresBySid.get(sid)?.properties?.population_total ?? 0;
    if (pop === 0) return 'X';
    const bShare = comp.bosniak ?? 0;
    const sShare = comp.serb ?? 0;
    const cShare = comp.croat ?? 0;
    if (bShare >= MAJORITY_THRESHOLD) return 'B';
    if (sShare >= MAJORITY_THRESHOLD) return 'S';
    if (cShare >= MAJORITY_THRESHOLD) return 'C';
    // Mixed — pick plurality
    const max = Math.max(bShare, sShare, cShare);
    if (bShare === max) return 'Bm';
    if (sShare === max) return 'Sm';
    if (cShare === max) return 'Cm';
    return 'X';
}

// ─── Phase 0: Pre-Clustering Splits (Mostar) ───────────────────────────────
console.log('Phase 0: Pre-Clustering Splits...');
const newFeatures = new Map<string, any>();

for (const f of substrateGeoJSON.features) {
    if (f.properties.mun1990_id === 'mostar' && f.properties.settlement_name === 'Mostar') {
        process.stdout.write(`  Splitting Mostar (${f.properties.sid})... `);
        const bb = bbox(f);
        const splitLon = 17.810;

        const westBox = polygon([[[bb[0], bb[1]], [splitLon, bb[1]], [splitLon, bb[3]], [bb[0], bb[3]], [bb[0], bb[1]]]]);
        const westGeom = turf.intersect(turf.featureCollection([f, westBox]));
        const eastBox = polygon([[[splitLon, bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [splitLon, bb[3]], [splitLon, bb[1]]]]);
        const eastGeom = turf.intersect(turf.featureCollection([f, eastBox]));

        if (westGeom && eastGeom) {
            // Ethnic population split: Croats predominantly west, Bosniaks predominantly east
            // Reflects the historical Neretva divide in Mostar
            const B = f.properties.population_bosniaks || 0;
            const C = f.properties.population_croats || 0;
            const S = f.properties.population_serbs || 0;
            const O = f.properties.population_others || 0;
            const westB = Math.floor(B * 0.20);  // 20% of Bosniaks to west
            const westC = Math.floor(C * 0.75);  // 75% of Croats to west
            const westS = Math.floor(S * 0.55);  // Serbs split by area
            const westO = Math.floor(O * 0.55);  // Others split by area
            const westPop = westB + westC + westS + westO;
            const eastPop = (B - westB) + (C - westC) + (S - westS) + (O - westO);

            const westF = turf.feature(westGeom.geometry, {
                ...f.properties,
                sid: f.properties.sid + '_W',
                settlement_name: 'Mostar Zapad',
                population_total: westPop,
                population_bosniaks: westB,
                population_croats: westC,
                population_serbs: westS,
                population_others: westO,
                ethnic_key: 'C'
            });
            const eastF = turf.feature(eastGeom.geometry, {
                ...f.properties,
                sid: f.properties.sid + '_E',
                settlement_name: 'Mostar Istok',
                population_total: eastPop,
                population_bosniaks: B - westB,
                population_croats: C - westC,
                population_serbs: S - westS,
                population_others: O - westO,
                ethnic_key: 'B'
            });
            newFeatures.set(westF.properties.sid, westF);
            newFeatures.set(eastF.properties.sid, eastF);

            // Update adjacency
            const neighbors = adjMap.get(f.properties.sid) || new Set();
            adjMap.set(westF.properties.sid, new Set(neighbors));
            adjMap.set(eastF.properties.sid, new Set(neighbors));
            adjMap.get(westF.properties.sid)!.add(eastF.properties.sid);
            adjMap.get(eastF.properties.sid)!.add(westF.properties.sid);
            adjMap.delete(f.properties.sid);
            for (const [, nset] of adjMap.entries()) {
                if (nset.has(f.properties.sid)) {
                    nset.delete(f.properties.sid);
                    nset.add(westF.properties.sid);
                    nset.add(eastF.properties.sid);
                }
            }
            console.log('Done.');
        } else {
            console.log('Intersection failed, keeping unified.');
            const feat = JSON.parse(JSON.stringify(f));
            feat.properties.ethnic_key = getEthnicKey(f.properties.sid);
            newFeatures.set(f.properties.sid, feat);
        }
    } else {
        const feat = JSON.parse(JSON.stringify(f));
        feat.properties.ethnic_key = getEthnicKey(f.properties.sid);
        newFeatures.set(f.properties.sid, feat);
    }
}
console.log(`  Total settlements after splits: ${newFeatures.size}`);

// ─── Phase 1: Build municipality groups ─────────────────────────────────────
console.log('Phase 1: Grouping by municipality...');
const byMun = new Map<string, string[]>();
for (const [sid, f] of newFeatures.entries()) {
    const mun = f.properties.mun1990_id;
    if (!byMun.has(mun)) byMun.set(mun, []);
    byMun.get(mun)!.push(sid);
}
console.log(`  ${byMun.size} municipalities`);

// ─── BFS distance helper (within same municipality) ─────────────────────────
function bfsDistance(start: string, munSids: Set<string>): Map<string, number> {
    const dist = new Map<string, number>();
    dist.set(start, 0);
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++]!;
        const d = dist.get(cur)!;
        const neighbors = adjMap.get(cur);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!munSids.has(n)) continue;
            if (dist.has(n)) continue;
            dist.set(n, d + 1);
            queue.push(n);
        }
    }
    return dist;
}

// ─── Connected-component helper ──────────────────────────────────────────────
function findComponents(sids: string[], munSet: Set<string>): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const sid of sids) {
        if (visited.has(sid)) continue;
        const comp: string[] = [];
        const q = [sid];
        visited.add(sid);
        while (q.length > 0) {
            const cur = q.shift()!;
            comp.push(cur);
            const nb = adjMap.get(cur);
            if (!nb) continue;
            for (const n of nb) {
                if (!munSet.has(n) || visited.has(n)) continue;
                visited.add(n);
                q.push(n);
            }
        }
        components.push(comp);
    }
    return components.sort((a, b) => b.length - a.length); // largest first
}

// ─── OSID naming helper ─────────────────────────────────────────────────────
/** Slugify a settlement name for use in an OSID: lowercase, ASCII-only, underscores. */
function slugify(name: string): string {
    return name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[đĐ]/g, 'dj')
        .replace(/[čćČĆ]/g, 'c')
        .replace(/[šŠ]/g, 's')
        .replace(/[žŽ]/g, 'z')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

/** Find the largest-population SID in a list of members. */
function largestMember(members: string[]): string {
    let best = members[0]!;
    let bestPop = newFeatures.get(best)?.properties?.population_total ?? 0;
    for (let i = 1; i < members.length; i++) {
        const pop = newFeatures.get(members[i]!)?.properties?.population_total ?? 0;
        if (pop > bestPop) { bestPop = pop; best = members[i]!; }
    }
    return best;
}

// ─── Phase 2: Import hand-curated merge groups from merge_progress.json ──────
// The merge_progress.json file contains manually curated merge groups created
// in the Settlement Merger tool. Each group has an osid and a list of memberSids.
// SIDs not in any group become singleton operational settlements.
console.log('Phase 2: Importing manual merge groups from merge_progress.json...');

const clusters = new Map<string, string[]>(); // clusterKey -> [sids]
const clusterSeed = new Map<string, string>(); // clusterKey -> seed sid
const mergedInto = new Map<string, string>(); // canonicalSid -> clusterKey (osid)

const mergeProgressPath = resolve(DATA_DIR, 'source', 'merge_progress.json');
const mergeProgress = JSON.parse(readFileSync(mergeProgressPath, 'utf8'));
const manualGroups: { osid: string; memberSids: string[] }[] = mergeProgress.mergeGroups;

// Track all SIDs that are in a manual group
const manuallyMergedSids = new Set<string>();

let importedGroups = 0;
let skippedSids = 0;
for (const group of manualGroups) {
    // Filter to only SIDs that exist in newFeatures (post-Phase 0 splits)
    const validMembers = group.memberSids.filter(sid => {
        if (newFeatures.has(sid)) return true;
        skippedSids++;
        return false;
    });
    if (validMembers.length === 0) continue;

    const osid = group.osid;
    const seed = largestMember(validMembers);
    clusters.set(osid, validMembers);
    clusterSeed.set(osid, seed);
    for (const sid of validMembers) {
        mergedInto.set(sid, osid);
        manuallyMergedSids.add(sid);
    }
    importedGroups++;
}

// Create singleton operational settlements for any SIDs not in a manual group
let singletonCount = 0;
const usedOsids = new Set<string>(clusters.keys());
for (const [sid] of newFeatures) {
    if (manuallyMergedSids.has(sid)) continue;
    // Generate an OSID for this singleton
    const f = newFeatures.get(sid)!;
    const mun = f.properties.mun1990_id;
    const name = f.properties.settlement_name ?? sid;
    let slug = slugify(name);
    if (!slug) slug = sid.replace(/^S/, '').toLowerCase();
    let osid = `op:${mun}:${slug}`;
    if (usedOsids.has(osid)) {
        let suffix = 2;
        while (usedOsids.has(`${osid}_${suffix}`)) suffix++;
        osid = `${osid}_${suffix}`;
    }
    usedOsids.add(osid);
    clusters.set(osid, [sid]);
    clusterSeed.set(osid, sid);
    mergedInto.set(sid, osid);
    singletonCount++;
}

console.log(`  Imported ${importedGroups} manual merge groups`);
if (skippedSids > 0) console.warn(`  Skipped ${skippedSids} SIDs not found in substrate`);
console.log(`  Created ${singletonCount} singleton ops for unmerged settlements`);
console.log(`  Total operational settlements: ${clusters.size}`);

// Validation: check for cross-municipality merges
let crossMunCount = 0;
for (const [osid, memberSids] of clusters) {
    if (memberSids.length < 2) continue;
    const muns = new Set<string>();
    for (const sid of memberSids) {
        const f = newFeatures.get(sid);
        if (f) muns.add(f.properties.mun1990_id);
    }
    if (muns.size > 1) {
        crossMunCount++;
        console.warn(`  WARNING: Cross-municipality cluster ${osid} spans ${[...muns].join(', ')}`);
    }
}
if (crossMunCount === 0) {
    console.log('  All clusters within single municipalities ✓');
} else {
    console.warn(`  Found ${crossMunCount} cross-municipality clusters!`);
}

// ─── Geometry Repair Helpers ──────────────────────────────────────────────────

/** Ensure a ring is properly closed (first point == last point). */
function closeRing(ring: number[][]): number[][] {
    if (ring.length < 2) return ring;
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0]!, first[1]!]);
    }
    return ring;
}

/** Compute signed area of a ring (positive = CCW, negative = CW). */
function ringSignedArea(ring: number[][]): number {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i]!;
        const [x2, y2] = ring[i + 1]!;
        area += (x2! - x1!) * (y2! + y1!);
    }
    return area / 2;
}

const MIN_RING_ABS_AREA = 1e-14;

function isFiniteLngLatPosition(position: unknown): position is number[] {
    if (!Array.isArray(position) || position.length < 2) return false;
    const lng = position[0];
    const lat = position[1];
    return typeof lng === 'number'
        && typeof lat === 'number'
        && Number.isFinite(lng)
        && Number.isFinite(lat)
        && lng >= -180
        && lng <= 180
        && lat >= -90
        && lat <= 90;
}

function sameLngLat(a: number[], b: number[]): boolean {
    return a[0] === b[0] && a[1] === b[1];
}

function isValidNormalizedRing(ring: number[][]): boolean {
    if (ring.length < 4) return false;
    if (!ring.every(isFiniteLngLatPosition)) return false;
    if (!sameLngLat(ring[0]!, ring[ring.length - 1]!)) return false;

    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    const unique = new Set<string>();
    for (const position of ring) {
        const lng = position[0]!;
        const lat = position[1]!;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        unique.add(`${lng},${lat}`);
    }

    return unique.size >= 3
        && maxLng > minLng
        && maxLat > minLat
        && Math.abs(ringSignedArea(ring)) > MIN_RING_ABS_AREA;
}

/** Minimum hole area in square meters - holes smaller than this are artifacts from TopoJSON merge. */
const MIN_HOLE_AREA_SQM = 50_000; // 50,000 m2 = 0.05 km2

/**
 * Normalize geometry: minimal cleanup that preserves shared boundary vertices.
 * - Unwrap single-part MultiPolygon -> Polygon (keep MultiPolygon if truly multi-part)
 * - Close all rings
 * - Remove invalid/tiny artifact holes and invalid MultiPolygon parts
 * - Ensure correct winding order (outer CCW, holes CW)
 *
 * IMPORTANT: Does NOT use buffer(0) or any operation that replaces coordinates,
 * because that would destroy shared boundary vertices from topological merge
 * and create inter-polygon gaps.
 */
function normalizeGeometry(geom: any, osid: string): any {
    if (!geom || !geom.type) return geom;

    if (geom.type === 'MultiPolygon') {
        if (geom.coordinates.length === 1) {
            geom = { type: 'Polygon', coordinates: geom.coordinates[0]! };
        } else {
            const parts: number[][][][] = [];
            for (const partCoords of geom.coordinates) {
                const normalized = normalizePolygonCoords(partCoords);
                if (normalized && normalized[0]?.length >= 4) parts.push(normalized);
            }
            if (parts.length === 0) throw new Error(`All polygon parts invalid after normalization for ${osid}`);
            if (parts.length === 1) return { type: 'Polygon', coordinates: parts[0]! };
            return { type: 'MultiPolygon', coordinates: parts };
        }
    }

    if (geom.type !== 'Polygon') return geom;
    const coords = normalizePolygonCoords(geom.coordinates);
    if (!coords || coords[0]?.length < 4) throw new Error(`Polygon invalid after normalization for ${osid}`);
    return { type: 'Polygon', coordinates: coords };
}

/** Normalize a single polygon's coordinate rings (close, remove invalid/tiny holes, fix winding). */
function normalizePolygonCoords(polyCoords: number[][][]): number[][][] | null {
    if (!polyCoords || polyCoords.length === 0) return null;

    const outerRing = closeRing(polyCoords[0]!.map(position => [position[0]!, position[1]!]));
    if (!isValidNormalizedRing(outerRing)) return null;

    const keptRings: number[][][] = [outerRing];
    for (let i = 1; i < polyCoords.length; i++) {
        const holeRing = closeRing(polyCoords[i]!.map(position => [position[0]!, position[1]!]));
        if (!isValidNormalizedRing(holeRing)) continue;
        try {
            const holeGeom = { type: 'Polygon' as const, coordinates: [holeRing] };
            const holeArea = turf.area(turf.feature(holeGeom));
            if (holeArea >= MIN_HOLE_AREA_SQM) keptRings.push(holeRing);
        } catch {
            // Drop holes that cannot be measured; invalid geometry must not reach Deck.gl overlays.
        }
    }

    const outerArea = ringSignedArea(keptRings[0]!);
    if (outerArea > 0) keptRings[0] = keptRings[0]!.slice().reverse();
    for (let i = 1; i < keptRings.length; i++) {
        const holeArea = ringSignedArea(keptRings[i]!);
        if (holeArea < 0) keptRings[i] = keptRings[i]!.slice().reverse();
    }

    return keptRings;
}
// ─── Phase 5+6: Global topology → simplify → merge by cluster ───────────────
// Build ONE topology from all canonical settlements so that shared boundaries
// between adjacent settlements are shared arcs. Simplify at this level, then
// merge clusters via topological merge. This guarantees zero inter-polygon gaps.
console.log('Phase 5+6: Global topology build, simplification, and cluster merge...');

// 5a: Build global topology from all canonical settlement polygons
const canonicalFeatures: any[] = [];
const sidToTopoIdx = new Map<string, number>();
for (const [sid, f] of newFeatures.entries()) {
    sidToTopoIdx.set(sid, canonicalFeatures.length);
    canonicalFeatures.push(turf.feature(f.geometry, { sid }));
}
const canonicalFc = featureCollection(canonicalFeatures);
console.log(`  Building topology from ${canonicalFeatures.length} canonical settlements...`);
const globalTopo = topojson.topology({ settlements: canonicalFc });

// 5b: Simplify the global topology (shared arcs simplified together → no gaps)
const presimplified = topojsonSimplify.presimplify(globalTopo as any);
const simplifiedTopo = topojsonSimplify.simplify(presimplified, 0.0000005);
console.log(`  Topology simplified.`);

// 5c: For each cluster, merge constituent geometries using topological merge
const geoms = (simplifiedTopo as any).objects.settlements.geometries;
// Build SID → topology geometry index mapping
const sidToGeomIdx = new Map<string, number>();
for (let gi = 0; gi < geoms.length; gi++) {
    const sid = geoms[gi]?.properties?.sid;
    if (sid) sidToGeomIdx.set(sid, gi);
}

const clusteredFeatures = new Map<string, any>();
const constituentSizes = [...clusters.values()].map(c => c.length).sort((a, b) => b - a);

for (const [osid, memberSids] of clusters.entries()) {
    const repSid = largestMember(memberSids);
    const repFeature = newFeatures.get(repSid)!;

    // Topological merge: collect the topology geometries for this cluster's members
    let mergedGeom: any;
    if (memberSids.length === 1) {
        const gi = sidToGeomIdx.get(memberSids[0]!);
        if (gi !== undefined) {
            // Extract single geometry from topology (preserves simplified coordinates)
            const singleFc = topojsonClient.feature(simplifiedTopo as any, geoms[gi]);
            mergedGeom = (singleFc as any).geometry;
        } else {
            mergedGeom = newFeatures.get(memberSids[0]!)!.geometry;
        }
    } else {
        // Collect topology geometries for all members in this cluster
        const memberGeoms = memberSids
            .map(sid => sidToGeomIdx.get(sid))
            .filter((gi): gi is number => gi !== undefined)
            .map(gi => geoms[gi]);
        if (memberGeoms.length > 0) {
            mergedGeom = topojsonClient.merge(simplifiedTopo as any, memberGeoms);
        } else {
            // Fallback: merge using turf (shouldn't happen)
            const memberFeatures = memberSids.map((sid, idx) => {
                const f = newFeatures.get(sid)!;
                return turf.feature(f.geometry, { _idx: idx });
            });
            const fc = turf.featureCollection(memberFeatures);
            const topo = topojson.topology({ members: fc });
            mergedGeom = topojsonClient.merge(topo as any, (topo as any).objects.members.geometries);
        }
    }

    // Aggregate population
    let totPop = 0, totB = 0, totC = 0, totS = 0, totO = 0;
    for (const sid of memberSids) {
        const f = newFeatures.get(sid)!;
        totPop += (f.properties.population_total || 0);
        totB += (f.properties.population_bosniaks || 0);
        totC += (f.properties.population_croats || 0);
        totS += (f.properties.population_serbs || 0);
        totO += (f.properties.population_others || 0);
    }

    // Compute ethnic key from aggregated populations
    let aggEthKey = 'X';
    if (totPop > 0) {
        const bShare = totB / totPop;
        const sShare = totS / totPop;
        const cShare = totC / totPop;
        if (bShare >= MAJORITY_THRESHOLD) aggEthKey = 'B';
        else if (sShare >= MAJORITY_THRESHOLD) aggEthKey = 'S';
        else if (cShare >= MAJORITY_THRESHOLD) aggEthKey = 'C';
        else {
            const max = Math.max(bShare, sShare, cShare);
            if (bShare === max) aggEthKey = 'Bm';
            else if (sShare === max) aggEthKey = 'Sm';
            else if (cShare === max) aggEthKey = 'Cm';
        }
    }

    // Settlement name: largest settlement, with (+N) for multi-member clusters
    const repName = repFeature.properties.settlement_name;
    const name = memberSids.length === 1
        ? repName
        : `${repName} (+${memberSids.length - 1})`;

    // Normalize geometry: unwrap MultiPolygon, close rings, remove tiny holes
    const finalGeom = normalizeGeometry(mergedGeom, osid);

    const areaKm2 = turf.area(finalGeom) / 1e6;
    const osFeature = turf.feature(finalGeom, {
        osid,
        sid: repSid,
        mun1990_id: repFeature.properties.mun1990_id,
        mun1990_name: repFeature.properties.mun1990_name,
        settlement_name: name,
        constituent_sids: memberSids,
        population_total: totPop,
        population_bosniaks: totB,
        population_croats: totC,
        population_serbs: totS,
        population_others: totO,
        ethnic_key: aggEthKey,
        area_km2: Math.round(areaKm2 * 1000) / 1000,
    });

    clusteredFeatures.set(osid, osFeature);
}

// Stats
console.log(`  Max cluster size: ${constituentSizes[0]}, Median: ${constituentSizes[Math.floor(constituentSizes.length / 2)]}`);

// ─── Phase 5d: Second topology pass — shared arcs between clusters ──────────
// After merging canonical settlements into clusters, the resulting cluster polygons
// do NOT share arcs for inter-cluster boundaries.
// Fix: snap near-miss boundary vertices between adjacent clusters.
// For each pair of adjacent OSIDs (from the contact graph), find vertices
// on each polygon that are close but not identical, and snap them to their
// midpoint. This creates shared vertices without altering polygon shapes
// (only micro-adjustments of <100m). (MAP_GEOMETRY_MASTER #1)
console.log('Phase 5d: Snapping shared boundary vertices between clusters...');
{
    const SNAP_THRESHOLD = 0.001; // ~111m — max distance to snap
    const coordKey6 = (c: number[]) => c[0].toFixed(6) + ',' + c[1].toFixed(6);

    // Build adjacency from the contact graph (already computed above as adjMap for canonical,
    // but we need operational adjacency — derive from clusters)
    const opAdj = new Map<string, Set<string>>();
    for (const edge of contactGraph.edges) {
        const pA = mergedInto.get(edge.a) || edge.a;
        const pB = mergedInto.get(edge.b) || edge.b;
        if (pA === pB) continue;
        if (!opAdj.has(pA)) opAdj.set(pA, new Set());
        if (!opAdj.has(pB)) opAdj.set(pB, new Set());
        opAdj.get(pA)!.add(pB);
        opAdj.get(pB)!.add(pA);
    }

    // For each pair of adjacent OSIDs, find near-miss vertices and snap
    let totalSnaps = 0;
    let pairsFixed = 0;
    const processed = new Set<string>();

    for (const [osidA, neighbors] of opAdj) {
        const fA = clusteredFeatures.get(osidA);
        if (!fA) continue;

        for (const osidB of neighbors) {
            const pairKey = osidA < osidB ? `${osidA}|${osidB}` : `${osidB}|${osidA}`;
            if (processed.has(pairKey)) continue;
            processed.add(pairKey);

            const fB = clusteredFeatures.get(osidB);
            if (!fB) continue;

            // Get all vertices from both polygons
            const getRings = (geom: any): number[][][] => {
                if (geom.type === 'Polygon') return geom.coordinates;
                if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
                return [];
            };

            const ringsA = getRings(fA.geometry);
            const ringsB = getRings(fB.geometry);

            // Check if they already share edges (skip if so)
            const bEdgeSet = new Set<string>();
            for (const ring of ringsB) {
                for (let i = 0; i < ring.length - 1; i++) {
                    const kA = coordKey6(ring[i]), kB = coordKey6(ring[i + 1]);
                    bEdgeSet.add(kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`);
                }
            }
            let hasSharedEdge = false;
            for (const ring of ringsA) {
                for (let i = 0; i < ring.length - 1; i++) {
                    const kA = coordKey6(ring[i]), kB = coordKey6(ring[i + 1]);
                    const ek = kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`;
                    if (bEdgeSet.has(ek)) { hasSharedEdge = true; break; }
                }
                if (hasSharedEdge) break;
            }
            if (hasSharedEdge) continue; // Already share edges, no fix needed

            // Find near-miss vertex pairs and snap to midpoint
            let pairSnaps = 0;
            for (const ringA of ringsA) {
                for (let i = 0; i < ringA.length; i++) {
                    const vA = ringA[i];
                    for (const ringB of ringsB) {
                        for (let j = 0; j < ringB.length; j++) {
                            const vB = ringB[j];
                            const dist = Math.sqrt((vA[0] - vB[0]) ** 2 + (vA[1] - vB[1]) ** 2);
                            if (dist > 0 && dist < SNAP_THRESHOLD) {
                                // Snap both to midpoint
                                const mid = [(vA[0] + vB[0]) / 2, (vA[1] + vB[1]) / 2];
                                ringA[i] = mid;
                                ringB[j] = mid;
                                pairSnaps++;
                            }
                        }
                    }
                }
            }

            if (pairSnaps > 0) {
                pairsFixed++;
                totalSnaps += pairSnaps;
            }
        }
    }

    // Re-close and re-normalize rings that were affected by snapping.
    for (const [osid, f] of clusteredFeatures) {
        const rings = f.geometry.type === 'Polygon' ? f.geometry.coordinates
            : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat()
            : [];
        for (const ring of rings) {
            if (ring.length >= 2) {
                ring[ring.length - 1] = ring[0]; // Ensure ring closure
            }
        }
        f.geometry = normalizeGeometry(f.geometry, osid);
    }

    console.log(`  Snapped ${totalSnaps} vertices across ${pairsFixed} OSID pairs.`);
}

const smoothedFc = featureCollection(Array.from(clusteredFeatures.values()));

// Final validation: count remaining non-Polygon and report
let finalMultiCount = 0;
let finalUnclosedRings = 0;
for (const f of (smoothedFc as any).features) {
    if (f.geometry.type !== 'Polygon') finalMultiCount++;
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
        : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates
        : [];
    for (const polygon of polygons) {
        for (const ring of polygon) {
            if (ring.length >= 2) {
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) finalUnclosedRings++;
            }
        }
    }
}
if (finalMultiCount > 0) console.warn(`  WARNING: ${finalMultiCount} features still non-Polygon after normalization`);
if (finalUnclosedRings > 0) console.warn(`  WARNING: ${finalUnclosedRings} unclosed rings after normalization`);
console.log(`  All features: ${(smoothedFc as any).features.length}, Polygon: ${(smoothedFc as any).features.length - finalMultiCount}`);

const SHARED_SEGMENT_EPSILON = 0.000001;

function getOuterRings(feature: any): number[][][] {
    const geom = feature?.geometry;
    if (!geom) return [];
    if (geom.type === 'Polygon') return geom.coordinates;
    if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
    return [];
}

function pointsMatch(a: number[], b: number[]): boolean {
    return Math.abs(a[0] - b[0]) <= SHARED_SEGMENT_EPSILON
        && Math.abs(a[1] - b[1]) <= SHARED_SEGMENT_EPSILON;
}

function segmentsMatch(a0: number[], a1: number[], b0: number[], b1: number[]): boolean {
    return (pointsMatch(a0, b0) && pointsMatch(a1, b1))
        || (pointsMatch(a0, b1) && pointsMatch(a1, b0));
}

function countSharedSegments(featureA: any, featureB: any): number {
    const ringsA = getOuterRings(featureA);
    const ringsB = getOuterRings(featureB);
    const segmentsB: Array<[number[], number[]]> = [];
    for (const ring of ringsB) {
        for (let i = 1; i < ring.length; i++) segmentsB.push([ring[i - 1], ring[i]]);
    }

    let total = 0;
    for (const ring of ringsA) {
        for (let i = 1; i < ring.length; i++) {
            const a0 = ring[i - 1];
            const a1 = ring[i];
            for (const [b0, b1] of segmentsB) {
                if (segmentsMatch(a0, a1, b0, b1)) {
                    total++;
                    break;
                }
            }
        }
    }
    return total;
}

// ─── Phase 7: Write Outputs ─────────────────────────────────────────────────
console.log('Phase 7: Writing outputs...');
writeFileSync(resolve(OUT_DIR, 'operational_settlements.geojson'), JSON.stringify(smoothedFc, null, 2));

const mapping = Object.fromEntries([...mergedInto.entries()].sort((a, b) => a[0].localeCompare(b[0])));
const operationalTargetCount = new Set(Object.values(mapping)).size;
const CALIBRATED_OPERATIONAL_TARGET_COUNT = 712;
if (operationalTargetCount !== CALIBRATED_OPERATIONAL_TARGET_COUNT) {
    throw new Error(
        `Operational mapping target count drifted to ${operationalTargetCount}; `
        + `expected calibrated count ${CALIBRATED_OPERATIONAL_TARGET_COUNT}.`,
    );
}
writeFileSync(resolve(OUT_DIR, 'canonical_to_operational_map.json'), JSON.stringify(mapping, null, 2));

// Rebuild contact graph
console.log('  Deriving operational contact graph...');
const opEdges = new Map<string, any>();
for (const edge of contactGraph.edges) {
    const parentA = mergedInto.get(edge.a) || edge.a;
    const parentB = mergedInto.get(edge.b) || edge.b;
    if (parentA === parentB) continue;
    const [p1, p2] = parentA < parentB ? [parentA, parentB] : [parentB, parentA];
    const edgeKey = `${p1}||${p2}`;
    if (!opEdges.has(edgeKey)) {
        opEdges.set(edgeKey, { a: p1, b: p2, type: edge.type, min_dist: edge.min_dist });
    } else {
        const e = opEdges.get(edgeKey);
        if (edge.type === 'voronoi_border' || edge.type === 'manual_point_touch') e.type = edge.type;
        if (edge.min_dist < e.min_dist) e.min_dist = edge.min_dist;
    }
}

const opContactGraph = {
    schema_version: 1,
    parameters: { derived_from: 'canonical_contact_graph' },
    nodes: Array.from(clusteredFeatures.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([id, feat]) => {
        const ctr = turf.centroid(feat).geometry.coordinates;
        return { id, lat: ctr[1], lon: ctr[0] };
    }),
    edges: Array.from(opEdges.values())
        .sort((a: any, b: any) => {
            const ka = `${a.a}||${a.b}`;
            const kb = `${b.a}||${b.b}`;
            return ka.localeCompare(kb);
        })
        .map((edge: any) => ({
            ...edge,
            shared_segments: countSharedSegments(clusteredFeatures.get(edge.a), clusteredFeatures.get(edge.b)),
        })),
};
writeFileSync(resolve(OUT_DIR, 'operational_contact_graph.json'), JSON.stringify(opContactGraph, null, 2));

// ─── Summary ────────────────────────────────────────────────────────────────
const byMunOut = new Map<string, number>();
for (const [osid] of clusters) {
    const feat = clusteredFeatures.get(osid);
    const mun = feat?.properties?.mun1990_id ?? osid.split(':')[1] ?? '?';
    byMunOut.set(mun, (byMunOut.get(mun) || 0) + 1);
}
const munCounts = [...byMunOut.values()].sort((a, b) => a - b);
console.log(`\nSummary:`);
console.log(`  Total operational settlements: ${clusters.size}`);
console.log(`  Municipalities: ${byMunOut.size}`);
console.log(`  Ops per mun: min=${munCounts[0]}, median=${munCounts[Math.floor(munCounts.length / 2)]}, max=${munCounts[munCounts.length - 1]}`);
console.log(`  Max cluster constituents: ${constituentSizes[0]}`);
console.log('Done.');
