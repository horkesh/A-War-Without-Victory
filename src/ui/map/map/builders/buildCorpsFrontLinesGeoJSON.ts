import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import type { CorpsFrontSectorView } from '../../data/types';
import { buildDisplayFrontEdgeOwnership, buildDisplayOsidAdjacency } from './displayFrontEdgeOwnership.js';

interface OsidProperties {
    osid: string;
    controller: string | null;
    [key: string]: unknown;
}

interface CorpsGlowProperties {
    lineType: 'glow';
    faction: string;
    corps_id: string;
    sector_id?: string;
    sub_segment_id?: string;
    offset_side?: 1 | -1;
    pressure_intensity?: number;
}

interface CorpsFrontProperties {
    lineType: 'front';
    factionA: string;
    factionB: string;
    corps_id: string;
    sector_id?: string;
    sub_segment_id?: string;
    avg_entrenchment?: number;
    brigade_count?: number;
    threat_intensity?: number;
}

type CorpsLineProperties = CorpsGlowProperties | CorpsFrontProperties;

// ═══════════════════════════════════════════════════════════════════════════
// Corps color palettes — 4 shades per faction, derived from faction base.
// ═══════════════════════════════════════════════════════════════════════════

const FACTION_CORPS_PALETTES: Record<string, string[]> = {
    RS: ['#c24040', '#d46a4a', '#a83030', '#e08858'],
    RBiH: ['#4a9a55', '#3a8a70', '#5aaa40', '#2a7a60'],
    HRHB: ['#4080b8', '#5070a0', '#3090d0', '#6060c0'],
};

export const FACTION_GLOW_COLORS: Record<string, string> = {
    RS: 'rgba(180, 50, 50, 0.6)',
    RBiH: 'rgba(55, 140, 75, 0.6)',
    HRHB: 'rgba(50, 110, 170, 0.6)',
};

/**
 * Build a plain Record<corpsId, hexColor> for use in UI panels/badges.
 */
export function buildCorpsColorMap(sectors: CorpsFrontSectorView[]): Record<string, string> {
    const byFaction: Record<string, string[]> = {};
    for (const s of sectors) {
        if (!byFaction[s.faction]) byFaction[s.faction] = [];
        if (!byFaction[s.faction].includes(s.corps_id)) {
            byFaction[s.faction].push(s.corps_id);
        }
    }
    for (const ids of Object.values(byFaction)) ids.sort((a, b) => a.localeCompare(b));

    const map: Record<string, string> = {};
    for (const [faction, ids] of Object.entries(byFaction)) {
        const palette = FACTION_CORPS_PALETTES[faction] ?? ['#888888'];
        for (let i = 0; i < ids.length; i++) {
            map[ids[i]] = palette[i % palette.length];
        }
    }
    return map;
}

/**
 * Build a MapLibre expression for line-color that colors by corps_id when available,
 * falling back to faction color for features without corps_id.
 */
export function buildCorpsColorExpression(
    sectors: CorpsFrontSectorView[]
): unknown[] {
    const colorMap = buildCorpsColorMap(sectors);
    const corpsIds = Object.keys(colorMap).sort((a, b) => a.localeCompare(b));

    // ["case", ["has", "corps_id"], ["match", ["get", "corps_id"], id1, c1, id2, c2, ..., fallback],
    //   ["match", ["get", "faction"], "RS", ..., fallback]]
    const matchArgs: (string | unknown[])[] = ['match', ['get', 'corps_id']];
    for (const id of corpsIds) {
        matchArgs.push(id, colorMap[id]);
    }
    matchArgs.push('#888888'); // fallback for unknown corps

    const factionMatch: (string | unknown[])[] = ['match', ['get', 'faction'],
        'RS', FACTION_GLOW_COLORS.RS,
        'RBiH', FACTION_GLOW_COLORS.RBiH,
        'HRHB', FACTION_GLOW_COLORS.HRHB,
        'rgba(60, 60, 70, 0.3)',
    ];

    return ['case', ['has', 'corps_id'], matchArgs, factionMatch];
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// Helpers for property calculation
// ═══════════════════════════════════════════════════════════════════════════

function calculateAvgEntrenchment(
    sector: CorpsFrontSectorView | undefined,
    formationsById: Record<string, { entrenchment_turns?: number }> | undefined
): number {
    if (!sector || !formationsById) return 0;
    const ids = sector.assigned_brigade_ids;
    if (ids.length === 0) return 0;
    const total = ids.reduce((sum, brigadeId) => {
        const formation = formationsById[brigadeId];
        return sum + (typeof formation?.entrenchment_turns === 'number' ? formation.entrenchment_turns : 0);
    }, 0);
    return total / ids.length;
}

function createGlowProperties(
    faction: string,
    corpsId: string,
    sectorId: string | undefined,
    offset: 1 | -1 | undefined,
    pressureIntensity: number
): CorpsGlowProperties {
    const props: CorpsGlowProperties = {
        lineType: 'glow',
        faction,
        corps_id: corpsId,
        pressure_intensity: pressureIntensity
    };
    if (offset != null) props.offset_side = offset;
    if (sectorId) props.sector_id = sectorId;
    return props;
}

/** Merge consecutive segments that share endpoints into longer LineStrings. */
function mergeLineSegments<P extends CorpsLineProperties>(
    segments: Feature<LineString, P>[]
): Feature<LineString, P>[] {
    if (segments.length === 0) return [];

    const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const endpointMap = new Map<string, number[]>();

    segments.forEach((seg, i) => {
        const coords = seg.geometry.coordinates;
        const startKey = coordKey(coords[0]);
        const endKey = coordKey(coords[coords.length - 1]);
        if (!endpointMap.has(startKey)) endpointMap.set(startKey, []);
        if (!endpointMap.has(endKey)) endpointMap.set(endKey, []);
        endpointMap.get(startKey)!.push(i);
        endpointMap.get(endKey)!.push(i);
    });

    const used = new Set<number>();
    const merged: Feature<LineString, P>[] = [];

    for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        used.add(i);
        const props = segments[i].properties;
        let coords = [...segments[i].geometry.coordinates];
        let changed = true;

        while (changed) {
            changed = false;
            const endKey = coordKey(coords[coords.length - 1]);
            const candidates = endpointMap.get(endKey) || [];
            for (const j of candidates) {
                if (used.has(j)) continue;
                const seg = segments[j].geometry.coordinates;
                const segStart = coordKey(seg[0]);
                const segEnd = coordKey(seg[seg.length - 1]);
                if (segStart === endKey) {
                    coords.push(...seg.slice(1));
                    used.add(j);
                    changed = true;
                    break;
                } else if (segEnd === endKey) {
                    coords.push(...[...seg].reverse().slice(1));
                    used.add(j);
                    changed = true;
                    break;
                }
            }
        }

        merged.push({
            type: 'Feature',
            properties: props,
            geometry: { type: 'LineString', coordinates: coords },
        });
    }
    return merged;
}

function stitchSegmentsWithFriendlyBridges<P extends CorpsLineProperties>(
    segments: Feature<LineString, P>[],
    edgeMap: Map<string, Set<string>>,
    controllerMap: Map<string, string | null>,
): Feature<LineString, P>[] {
    if (segments.length === 0) return [];

    const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

    const segEndpoints = new Map<string, Array<{ idx: number; isEnd: boolean }>>();
    for (let i = 0; i < segments.length; i++) {
        const c = segments[i].geometry.coordinates;
        const sk = coordKey(c[0]);
        const ek = coordKey(c[c.length - 1]);
        if (!segEndpoints.has(sk)) segEndpoints.set(sk, []);
        segEndpoints.get(sk)!.push({ idx: i, isEnd: false });
        if (sk !== ek) {
            if (!segEndpoints.has(ek)) segEndpoints.set(ek, []);
            segEndpoints.get(ek)!.push({ idx: i, isEnd: true });
        }
    }

    const used = new Set<number>();
    const chains: Array<{ coords: [number, number][]; props: P } | null> = [];

    for (let seed = 0; seed < segments.length; seed++) {
        if (used.has(seed)) continue;
        used.add(seed);
        const seg = segments[seed];
        let line = [...seg.geometry.coordinates] as [number, number][];
        const props = seg.properties;

        let growing = true;
        while (growing) {
            growing = false;
            const tailKey = coordKey(line[line.length - 1]);
            for (const c of segEndpoints.get(tailKey) ?? []) {
                if (used.has(c.idx)) continue;
                used.add(c.idx);
                const other = segments[c.idx].geometry.coordinates;
                if (c.isEnd) {
                    line = line.concat([...other].reverse().slice(1) as [number, number][]);
                } else {
                    line = line.concat(other.slice(1) as [number, number][]);
                }
                growing = true;
                break;
            }
        }

        growing = true;
        while (growing) {
            growing = false;
            const headKey = coordKey(line[0]);
            for (const c of segEndpoints.get(headKey) ?? []) {
                if (used.has(c.idx)) continue;
                used.add(c.idx);
                const other = segments[c.idx].geometry.coordinates;
                if (c.isEnd) {
                    line = (other.slice(0, -1) as [number, number][]).concat(line);
                } else {
                    line = ([...other].reverse().slice(0, -1) as [number, number][]).concat(line);
                }
                growing = true;
                break;
            }
        }

        chains.push({ coords: line, props });
    }

    const hostileEdgeKeys = new Set<string>();
    for (const [ek, osids] of edgeMap) {
        if (osids.size !== 2) continue;
        const [a, b] = [...osids];
        const ca = controllerMap.get(a), cb = controllerMap.get(b);
        if (ca && cb && ca !== cb) hostileEdgeKeys.add(ek);
    }

    const friendlyAdj = new Map<string, string[]>();
    for (const [ek] of edgeMap) {
        if (hostileEdgeKeys.has(ek)) continue;
        const [partA, partB] = ek.split('|');
        if (!friendlyAdj.has(partA)) friendlyAdj.set(partA, []);
        if (!friendlyAdj.has(partB)) friendlyAdj.set(partB, []);
        friendlyAdj.get(partA)!.push(partB);
        friendlyAdj.get(partB)!.push(partA);
    }

    const MAX_BRIDGE_HOPS = 32;
    let bridging = true;
    while (bridging) {
        bridging = false;
        const deadEnds: Array<{ chainIdx: number; key: string; end: 'head' | 'tail' }> = [];
        for (let ci = 0; ci < chains.length; ci++) {
            const chain = chains[ci];
            if (!chain) continue;
            const c = chain.coords;
            deadEnds.push({ chainIdx: ci, key: coordKey(c[0]), end: 'head' });
            deadEnds.push({ chainIdx: ci, key: coordKey(c[c.length - 1]), end: 'tail' });
        }
        const deadEndByKey = new Map<string, typeof deadEnds[0]>();
        for (const de of deadEnds) deadEndByKey.set(de.key, de);

        for (const source of deadEnds) {
            const sourceChain = chains[source.chainIdx];
            if (!sourceChain) continue;
            const visited = new Map<string, string | null>();
            visited.set(source.key, null);
            let frontier = [source.key];
            let found = false;

            for (let hop = 0; hop < MAX_BRIDGE_HOPS && !found; hop++) {
                const next: string[] = [];
                for (const fk of frontier) {
                    for (const nk of friendlyAdj.get(fk) ?? []) {
                        if (visited.has(nk)) continue;
                        visited.set(nk, fk);
                        next.push(nk);

                        const target = deadEndByKey.get(nk);
                        if (target && target.chainIdx !== source.chainIdx && chains[target.chainIdx]) {
                            const srcChain = chains[source.chainIdx];
                            const dstChain = chains[target.chainIdx];
                            if (!srcChain || !dstChain) continue;
                            const path: [number, number][] = [];
                            let cur: string | null = nk;
                            while (cur !== null) {
                                const [x, y] = cur.split(',').map(Number);
                                path.unshift([x, y]);
                                cur = visited.get(cur) ?? null;
                            }

                            const bridge = path.slice(1, -1);

                            let mergedCoords: [number, number][];
                            if (source.end === 'tail' && target.end === 'head') {
                                mergedCoords = [...srcChain.coords, ...bridge, ...dstChain.coords];
                            } else if (source.end === 'tail' && target.end === 'tail') {
                                mergedCoords = [...srcChain.coords, ...bridge, ...dstChain.coords.slice().reverse()];
                            } else if (source.end === 'head' && target.end === 'tail') {
                                mergedCoords = [...dstChain.coords, ...bridge.reverse(), ...srcChain.coords];
                            } else {
                                mergedCoords = [...dstChain.coords.slice().reverse(), ...bridge.reverse(), ...srcChain.coords];
                            }

                            chains[source.chainIdx] = { coords: mergedCoords, props: srcChain.props };
                            chains[target.chainIdx] = null;
                            bridging = true;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
                frontier = next;
            }
            if (found) break;
        }
    }

    const stitched: Feature<LineString, P>[] = [];
    for (const chain of chains) {
        if (!chain || chain.coords.length < 2) continue;
        stitched.push({
            type: 'Feature',
            properties: chain.props,
            geometry: { type: 'LineString', coordinates: chain.coords },
        });
    }
    return stitched;
}

function projectPointToSegment(
    point: [number, number],
    start: [number, number],
    end: [number, number],
): [number, number] {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return start;
    const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lenSq));
    return [start[0] + t * dx, start[1] + t * dy];
}

function distanceSq(a: [number, number], b: [number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

function collectBoundaryMatchPoints(
    sourceVerts: [number, number][],
    targetVerts: [number, number][],
    thresholdSq: number,
): [number, number][] {
    const matches: [number, number][] = [];
    if (sourceVerts.length === 0 || targetVerts.length < 2) return matches;

    for (const vertex of sourceVerts) {
        let matched = false;
        for (let i = 0; i < targetVerts.length - 1; i++) {
            const projection = projectPointToSegment(vertex, targetVerts[i]!, targetVerts[i + 1]!);
            if (distanceSq(vertex, projection) <= thresholdSq) {
                matches.push(vertex);
                matched = true;
                break;
            }
        }
        if (!matched && targetVerts.length > 2) {
            const projection = projectPointToSegment(vertex, targetVerts[targetVerts.length - 1]!, targetVerts[0]!);
            if (distanceSq(vertex, projection) <= thresholdSq) {
                matches.push(vertex);
            }
        }
    }

    return matches;
}

function orderBoundaryPoints(points: [number, number][]): [number, number][] {
    if (points.length <= 2) return points;

    let startIdx = 0;
    let farthestDistance = -1;
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const d = distanceSq(points[i]!, points[j]!);
            if (d > farthestDistance) {
                farthestDistance = d;
                startIdx = i;
            }
        }
    }

    const ordered: [number, number][] = [points[startIdx]!];
    const remaining = new Set(points.map((_, index) => index));
    remaining.delete(startIdx);

    while (remaining.size > 0) {
        const last = ordered[ordered.length - 1]!;
        let bestIdx = -1;
        let bestDistance = Infinity;
        for (const index of remaining) {
            const d = distanceSq(last, points[index]!);
            if (d < bestDistance) {
                bestDistance = d;
                bestIdx = index;
            }
        }
        if (bestIdx < 0) break;
        remaining.delete(bestIdx);
        ordered.push(points[bestIdx]!);
    }

    return ordered;
}

export function mergeGlowSegments(
    segments: Feature<LineString, CorpsGlowProperties>[],
    edgeMap: Map<string, Set<string>>,
    controllerMap: Map<string, string | null>,
): Feature<LineString, CorpsGlowProperties>[] {
    const chainLength = (coords: [number, number][]) => {
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            total += Math.sqrt(distanceSq(coords[i - 1]!, coords[i]!));
        }
        return total;
    };
    const DETACHED_FRAGMENT_MAX_LENGTH = 0.02;
    const DETACHED_FRAGMENT_MAX_RATIO = 0.05;
    const connectChains = (
        features: Feature<LineString, CorpsGlowProperties>[],
    ): Feature<LineString, CorpsGlowProperties> => {
        const stableKey = (feature: Feature<LineString, CorpsGlowProperties>) =>
            JSON.stringify(feature.geometry.coordinates);
        const pending = [...features].sort((a, b) => stableKey(a).localeCompare(stableKey(b)));
        pending.sort((a, b) =>
            chainLength(b.geometry.coordinates as [number, number][])
            - chainLength(a.geometry.coordinates as [number, number][])
            || stableKey(a).localeCompare(stableKey(b)));
        let coords = [...pending.shift()!.geometry.coordinates] as [number, number][];

        while (pending.length > 0) {
            let bestIndex = 0;
            let bestMode: 'tail-head' | 'tail-tail' | 'head-tail' | 'head-head' = 'tail-head';
            let bestDistance = Infinity;
            for (let i = 0; i < pending.length; i++) {
                const other = pending[i]!.geometry.coordinates as [number, number][];
                const options = [
                    { mode: 'tail-head' as const, distance: distanceSq(coords[coords.length - 1]!, other[0]!) },
                    { mode: 'tail-tail' as const, distance: distanceSq(coords[coords.length - 1]!, other[other.length - 1]!) },
                    { mode: 'head-tail' as const, distance: distanceSq(coords[0]!, other[other.length - 1]!) },
                    { mode: 'head-head' as const, distance: distanceSq(coords[0]!, other[0]!) },
                ].sort((a, b) => a.distance - b.distance || a.mode.localeCompare(b.mode));
                const bestForOther = options[0]!;
                if (
                    bestForOther.distance < bestDistance
                    || (bestForOther.distance === bestDistance && stableKey(pending[i]!).localeCompare(stableKey(pending[bestIndex]!)) < 0)
                ) {
                    bestIndex = i;
                    bestMode = bestForOther.mode;
                    bestDistance = bestForOther.distance;
                }
            }

            const [next] = pending.splice(bestIndex, 1);
            if (!next) break;
            const other = next.geometry.coordinates as [number, number][];
            if (bestMode === 'tail-head') {
                coords = coords.concat(other);
            } else if (bestMode === 'tail-tail') {
                coords = coords.concat([...other].reverse());
            } else if (bestMode === 'head-tail') {
                coords = other.concat(coords);
            } else {
                coords = [...other].reverse().concat(coords);
            }
        }

        return {
            type: 'Feature',
            properties: features[0]!.properties,
            geometry: { type: 'LineString', coordinates: coords },
        };
    };

    const byGroup = new Map<string, Feature<LineString, CorpsGlowProperties>[]>();
    for (const segment of segments) {
        const props = segment.properties;
        const key = [
            props.faction,
            props.corps_id,
            props.sector_id ?? '',
        ].join('|');
        const list = byGroup.get(key) ?? [];
        list.push(segment);
        byGroup.set(key, list);
    }

    const merged: Feature<LineString, CorpsGlowProperties>[] = [];
    for (const group of byGroup.values()) {
        const stitched = stitchSegmentsWithFriendlyBridges(group, edgeMap, controllerMap);
        const measured = stitched.map((feature) => ({
            feature,
            length: chainLength(feature.geometry.coordinates as [number, number][]),
        }));
        const longest = measured.reduce((best, current) => Math.max(best, current.length), 0);
        const substantialChains = measured.filter(({ length }) => (
            length > DETACHED_FRAGMENT_MAX_LENGTH && length > longest * DETACHED_FRAGMENT_MAX_RATIO
        ));
        const selected = substantialChains.length === 0
            ? measured
            : measured.filter(({ length }) => (
                length > DETACHED_FRAGMENT_MAX_LENGTH || length > longest * DETACHED_FRAGMENT_MAX_RATIO
            ));

        const continuousFeatures = selected.length <= 1
            ? selected.map(({ feature }) => feature)
            : [connectChains(selected.map(({ feature }) => feature))];

        for (const feature of continuousFeatures) {
            merged.push({
                type: 'Feature',
                properties: { ...feature.properties, offset_side: 1 },
                geometry: feature.geometry,
            });
            merged.push({
                type: 'Feature',
                properties: { ...feature.properties, offset_side: -1 },
                geometry: feature.geometry,
            });
        }
    }
    return merged;
}

/**
 * Build a plain Record<corpsId, hexColor> for use in UI panels/badges.
 */
export function buildCorpsFrontLinesGeoJSON(
    osidGeoJson: FeatureCollection,
    corpsFrontSectors: CorpsFrontSectorView[],
    rbihHrhbAllied?: boolean,
    osidCentroids?: Map<string, [number, number]>,
    frontPressureByEdge?: Record<string, { value: number; max_abs: number }>,
    frontEdgesOsid?: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[],
    formationsById?: Record<string, { entrenchment_turns?: number }>
): FeatureCollection<LineString> {
    const features = osidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];

    const controllerMap = new Map<string, string | null>();
    for (const f of features) {
        controllerMap.set(f.properties.osid, f.properties.controller);
    }

    const authoritativePairs = new Set<string>();
    if (frontEdgesOsid) {
        for (const edge of frontEdgesOsid) {
            authoritativePairs.add(edge.edge_id);
        }
    }

    const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const edgeMap = new Map<string, Set<string>>();

    // Build per-OSID ring vertices for fallback boundary synthesis
    const osidRings = new Map<string, number[][][]>();
    for (const feature of features) {
        const osid = feature.properties.osid;
        const rings = feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates
            : feature.geometry.coordinates.flat();

        osidRings.set(osid, rings);
        for (const ring of rings) {
            for (let i = 0; i < ring.length - 1; i++) {
                const a = ring[i];
                const b = ring[i + 1];
                const keyA = coordKey(a);
                const keyB = coordKey(b);
                const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

                if (!edgeMap.has(edgeKey)) edgeMap.set(edgeKey, new Set());
                edgeMap.get(edgeKey)!.add(osid);
            }
        }
    }

    const displayAdjacency = buildDisplayOsidAdjacency(edgeMap);
    const {
        corpsByEdgeAndFaction: edgeFactionToCorps,
        sectorByEdgeAndFaction,
        subSegmentByEdgeAndFaction: edgeToSubSegment,
    } = buildDisplayFrontEdgeOwnership(
        corpsFrontSectors,
        frontEdgesOsid,
        controllerMap,
        displayAdjacency,
    );

    // Track which authoritative pairs get polygon-edge segments
    const pairsWithSegments = new Set<string>();

    const glowFeatures: Feature<LineString, CorpsGlowProperties>[] = [];
    const frontSegmentsByGroup = new Map<string, Feature<LineString, CorpsFrontProperties>[]>();

    for (const [edgeKey, osids] of edgeMap) {
        if (osids.size !== 2) continue;
        const [osidA, osidB] = [...osids];
        const ctrlA = controllerMap.get(osidA);
        const ctrlB = controllerMap.get(osidB);
        if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;
        if (rbihHrhbAllied && ((ctrlA === 'RBiH' && ctrlB === 'HRHB') || (ctrlA === 'HRHB' && ctrlB === 'RBiH'))) continue;

        const pairKey = osidA < osidB ? `${osidA}__${osidB}` : `${osidB}__${osidA}`;
        if (authoritativePairs.size > 0 && !authoritativePairs.has(pairKey)) continue;
        pairsWithSegments.add(pairKey);

        const [partA, partB] = edgeKey.split('|');
        const [ax, ay] = partA.split(',').map(Number);
        const [bx, by] = partB.split(',').map(Number);
        const coords: [number, number][] = [[ax, ay], [bx, by]];

        const corpsA = edgeFactionToCorps.get(`${pairKey}\0${ctrlA}`) ?? 'unknown';
        const corpsB = edgeFactionToCorps.get(`${pairKey}\0${ctrlB}`) ?? 'unknown';
        const sectorA = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlA}`);
        const sectorB = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlB}`);

        const avgEntrenchment = calculateAvgEntrenchment(sectorA, formationsById);

        let offsetA: 1 | -1 | undefined;
        let offsetB: 1 | -1 | undefined;
        if (osidCentroids) {
            const centA = osidCentroids.get(osidA);
            const centB = osidCentroids.get(osidB);
            if (centA && centB) {
                const dx = bx - ax;
                const dy = by - ay;
                const crossA = dx * (centA[1] - ay) - dy * (centA[0] - ax);
                offsetA = crossA > 0 ? -1 : 1;
                offsetB = crossA > 0 ? 1 : -1;
            }
        }

        const pressureData = frontPressureByEdge?.[pairKey];
        const pressureIntensity = pressureData && pressureData.max_abs > 0 ? Math.abs(pressureData.value) / pressureData.max_abs : 0;

        const subSegA = edgeToSubSegment.get(`${pairKey}\0${ctrlA}`);
        const subSegB = edgeToSubSegment.get(`${pairKey}\0${ctrlB}`);

        const glowPropsA = createGlowProperties(ctrlA, corpsA, sectorA?.sector_id, offsetA, pressureIntensity);
        if (subSegA) glowPropsA.sub_segment_id = subSegA;
        const glowPropsB = createGlowProperties(ctrlB, corpsB, sectorB?.sector_id, offsetB, pressureIntensity);
        if (subSegB) glowPropsB.sub_segment_id = subSegB;

        glowFeatures.push({
            type: 'Feature',
            properties: glowPropsA,
            geometry: { type: 'LineString', coordinates: coords },
        });
        glowFeatures.push({
            type: 'Feature',
            properties: glowPropsB,
            geometry: { type: 'LineString', coordinates: coords },
        });

        const pairFactionKey = [ctrlA, ctrlB].sort().join('-');
        const groupKey = sectorA?.sector_id ? `${sectorA.sector_id}:${pairFactionKey}` : `${corpsA}:${pairFactionKey}`;
        if (!frontSegmentsByGroup.has(groupKey)) frontSegmentsByGroup.set(groupKey, []);

        const frontProps: CorpsFrontProperties = {
            lineType: 'front',
            factionA: ctrlA,
            factionB: ctrlB,
            corps_id: corpsA,
            avg_entrenchment: avgEntrenchment,
            brigade_count: sectorA ? sectorA.assigned_brigade_ids.length : 0,
            threat_intensity: pressureIntensity
        };
        if (sectorA?.sector_id) frontProps.sector_id = sectorA.sector_id;
        if (subSegA) frontProps.sub_segment_id = subSegA;

        frontSegmentsByGroup.get(groupKey)!.push({
            type: 'Feature',
            properties: frontProps,
            geometry: { type: 'LineString', coordinates: coords },
        });
    }

    // ── Fallback: synthesize boundary for authoritative pairs with no shared polygon edges ──
    // Find near-coincident vertices between the two polygons and build approximate boundary.
    if (frontEdgesOsid && authoritativePairs.size > 0) {
        const SNAP_THRESHOLD = 0.0005; // ~55m in geographic coords
        const SNAP_THRESHOLD_SQ = SNAP_THRESHOLD * SNAP_THRESHOLD;

        for (const pairKey of authoritativePairs) {
            if (pairsWithSegments.has(pairKey)) continue;

            const [osidA, osidB] = pairKey.split('__');
            const ctrlA = controllerMap.get(osidA);
            const ctrlB = controllerMap.get(osidB);
            if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;
            if (rbihHrhbAllied && ((ctrlA === 'RBiH' && ctrlB === 'HRHB') || (ctrlA === 'HRHB' && ctrlB === 'RBiH'))) continue;

            const ringsA = osidRings.get(osidA);
            const ringsB = osidRings.get(osidB);
            if (!ringsA || !ringsB) continue;

            // Collect all vertices from each polygon.
            // We use vertex-to-segment proximity instead of only vertex-to-vertex
            // matches so fallback front lines can recover full shared boundaries
            // even when the two polygons do not share identical junction vertices.
            const vertsA: [number, number][] = [];
            for (const ring of ringsA) for (const v of ring) vertsA.push([v[0], v[1]]);
            const vertsB: [number, number][] = [];
            for (const ring of ringsB) for (const v of ring) vertsB.push([v[0], v[1]]);

            const candidatePoints = [
                ...collectBoundaryMatchPoints(vertsA, vertsB, SNAP_THRESHOLD_SQ),
                ...collectBoundaryMatchPoints(vertsB, vertsA, SNAP_THRESHOLD_SQ),
            ];

            // Deduplicate consecutive identical points
            if (candidatePoints.length < 2) continue;
            const ordered = orderBoundaryPoints(candidatePoints);
            const deduped: [number, number][] = [ordered[0]!];
            for (let i = 1; i < ordered.length; i++) {
                if (ordered[i]![0] !== ordered[i - 1]![0] || ordered[i]![1] !== ordered[i - 1]![1]) {
                    deduped.push(ordered[i]!);
                }
            }
            if (deduped.length < 2) continue;

            const corpsA = edgeFactionToCorps.get(`${pairKey}\0${ctrlA}`) ?? 'unknown';
            const sectorA = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlA}`);
            const sectorB = sectorByEdgeAndFaction.get(`${pairKey}\0${ctrlB}`);
            const corpsB = edgeFactionToCorps.get(`${pairKey}\0${ctrlB}`) ?? 'unknown';

            const avgEntrenchment = calculateAvgEntrenchment(sectorA, formationsById);
            const subSegA = edgeToSubSegment.get(`${pairKey}\0${ctrlA}`);
            const subSegB = edgeToSubSegment.get(`${pairKey}\0${ctrlB}`);
            const pressureData = frontPressureByEdge?.[pairKey];
            const pressureIntensity = pressureData && pressureData.max_abs > 0 ? Math.abs(pressureData.value) / pressureData.max_abs : 0;

            // Emit glow features for each synthesized point pair
            let offsetA: 1 | -1 | undefined;
            let offsetB: 1 | -1 | undefined;
            if (osidCentroids) {
                const centA = osidCentroids.get(osidA);
                const centB = osidCentroids.get(osidB);
                if (centA && centB && deduped.length >= 2) {
                    const dx = deduped[1][0] - deduped[0][0];
                    const dy = deduped[1][1] - deduped[0][1];
                    const crossA = dx * (centA[1] - deduped[0][1]) - dy * (centA[0] - deduped[0][0]);
                    offsetA = crossA > 0 ? -1 : 1;
                    offsetB = crossA > 0 ? 1 : -1;
                }
            }

            const glowPropsA = createGlowProperties(ctrlA, corpsA, sectorA?.sector_id, offsetA, pressureIntensity);
            if (subSegA) glowPropsA.sub_segment_id = subSegA;
            const glowPropsB = createGlowProperties(ctrlB, corpsB, sectorB?.sector_id, offsetB, pressureIntensity);
            if (subSegB) glowPropsB.sub_segment_id = subSegB;

            glowFeatures.push({
                type: 'Feature',
                properties: glowPropsA,
                geometry: { type: 'LineString', coordinates: deduped },
            });
            glowFeatures.push({
                type: 'Feature',
                properties: glowPropsB,
                geometry: { type: 'LineString', coordinates: deduped },
            });

            const pairFactionKey = [ctrlA, ctrlB].sort().join('-');
            const groupKey = sectorA?.sector_id ? `${sectorA.sector_id}:${pairFactionKey}` : `${corpsA}:${pairFactionKey}`;
            if (!frontSegmentsByGroup.has(groupKey)) frontSegmentsByGroup.set(groupKey, []);

            const frontProps: CorpsFrontProperties = {
                lineType: 'front',
                factionA: ctrlA,
                factionB: ctrlB,
                corps_id: corpsA,
                avg_entrenchment: avgEntrenchment,
                brigade_count: sectorA ? sectorA.assigned_brigade_ids.length : 0,
                threat_intensity: pressureIntensity,
            };
            if (sectorA?.sector_id) frontProps.sector_id = sectorA.sector_id;
            if (subSegA) frontProps.sub_segment_id = subSegA;

            frontSegmentsByGroup.get(groupKey)!.push({
                type: 'Feature',
                properties: frontProps,
                geometry: { type: 'LineString', coordinates: deduped },
            });
        }
    }

    // ── Stitch ALL front segments into continuous polylines ──
    // Flatten all groups, stitch via exact endpoint matching (cross-group),
    // then BFS-bridge remaining dead ends through friendly polygon edges.
    // Same algorithm as the edges viewer (proven working).
    const allFrontSegments: Feature<LineString, CorpsFrontProperties>[] = [];
    for (const segments of frontSegmentsByGroup.values()) {
        allFrontSegments.push(...segments);
    }

    const mergedFront = stitchSegmentsWithFriendlyBridges(allFrontSegments, edgeMap, controllerMap);
    const mergedGlow = mergeGlowSegments(glowFeatures, edgeMap, controllerMap);
    const allFeatures: Feature<LineString>[] = [...mergedGlow, ...mergedFront];
    return { type: 'FeatureCollection', features: allFeatures };
}
