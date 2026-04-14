/**
 * Build a GeoJSON source for sector demarcation lines.
 *
 * Finds polygon edges that lie between two front-adjacent OSIDs belonging
 * to different sectors of the same faction. These are the lateral boundaries
 * where one corps sector meets another along the friendly line.
 *
 * Output properties: { faction, sector_a, sector_b }
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import type { CorpsFrontSectorView } from '../../data/types';
import { buildDisplayOsidAdjacency, buildDisplayOsidSectorOwnership } from './displayFrontEdgeOwnership.js';

interface OsidProperties {
  osid: string;
  controller: string | null;
  [key: string]: unknown;
}

interface DemarcationProperties {
  faction: string;
  sector_id: string;
  sector_a: string;
  sector_b: string;
}

interface FrontEdgeView {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
}

const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

export function buildSectorDemarcationGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  corpsFrontSectors: CorpsFrontSectorView[],
  frontEdgesOsid: FrontEdgeView[],
): FeatureCollection<LineString, DemarcationProperties> {
  if (!corpsFrontSectors.length || !frontEdgesOsid.length) {
    return { type: 'FeatureCollection', features: [] };
  }

  const features = controlledOsidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];
  const controllerMap = new Map<string, string | null>();
  const osidFaction = new Map<string, string>();

  for (const feature of features) {
    const osid = feature.properties.osid;
    const controller = feature.properties.controller;
    controllerMap.set(osid, controller);
    if (controller) osidFaction.set(osid, controller);
  }
  for (const edge of frontEdgesOsid) {
    if (edge.side_a && !osidFaction.has(edge.a)) osidFaction.set(edge.a, edge.side_a);
    if (edge.side_b && !osidFaction.has(edge.b)) osidFaction.set(edge.b, edge.side_b);
  }

  const edgeOwners = new Map<string, { segment: number[][]; osids: Set<string> }>();
  for (const feature of features) {
    const osid = feature.properties.osid;
    if (!osidFaction.has(osid)) continue;

    const rings =
      feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates
        : feature.geometry.coordinates.flat();

    for (const ring of rings) {
      const pts = ring as number[][];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        if (a.length < 2 || b.length < 2) continue;
        const kA = coordKey(a);
        const kB = coordKey(b);
        const edgeKey = kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`;
        let entry = edgeOwners.get(edgeKey);
        if (!entry) {
          entry = { segment: [a, b], osids: new Set() };
          edgeOwners.set(edgeKey, entry);
        }
        entry.osids.add(osid);
      }
    }
  }

  // Collect front-line vertices: polygon edge vertices shared between opposing factions.
  const frontLineVertices = new Set<string>();
  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [oA, oB] = [...osids];
    const fA = osidFaction.get(oA);
    const fB = osidFaction.get(oB);
    if (fA && fB && fA !== fB) {
      frontLineVertices.add(coordKey(segment[0]));
      frontLineVertices.add(coordKey(segment[1]));
    }
  }

  const displayAdjacency = buildDisplayOsidAdjacency(
    new Map(
      [...edgeOwners.entries()].map(([edgeKey, entry]) => [edgeKey, entry.osids]),
    ),
  );
  const displaySectorByOsid = buildDisplayOsidSectorOwnership(
    corpsFrontSectors,
    controllerMap,
    displayAdjacency,
  );

  const segmentsByPair = new Map<string, { segments: number[][][]; faction: string; sector_a: string; sector_b: string }>();

  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [oA, oB] = [...osids];
    const factionA = osidFaction.get(oA);
    const factionB = osidFaction.get(oB);
    if (!factionA || factionA !== factionB) continue;
    const sectorA = displaySectorByOsid.get(oA);
    const sectorB = displaySectorByOsid.get(oB);
    if (!sectorA || !sectorB) continue;
    if (sectorA.sector_id === sectorB.sector_id) continue;
    const pairKey = sectorA.sector_id < sectorB.sector_id
      ? `${sectorA.sector_id}__${sectorB.sector_id}`
      : `${sectorB.sector_id}__${sectorA.sector_id}`;
    const [sector_a, sector_b] = pairKey.split('__');
    let entry = segmentsByPair.get(pairKey);
    if (!entry) {
      entry = { segments: [], faction: factionA, sector_a, sector_b };
      segmentsByPair.set(pairKey, entry);
    }
    entry.segments.push(segment);
  }

  const outFeatures: Feature<LineString, DemarcationProperties>[] = [];
  for (const { segments, faction, sector_a, sector_b } of segmentsByPair.values()) {
    const connectedNearFront = filterSegmentsConnectedToFront(segments, frontLineVertices);
    if (connectedNearFront.length === 0) continue;
    const chains = pickCanonicalDemarcationChains(mergeSegments(connectedNearFront));
    const props: DemarcationProperties = { faction, sector_id: sector_a, sector_a, sector_b };
    for (const chain of chains) {
      const simplified = simplifyLine(chain, 0.001);
      if (simplified.length < 2) continue;
      const smoothed = chaikinSmooth(simplified, 3);
      outFeatures.push({
        type: 'Feature',
        properties: { ...props, sector_id: sector_a },
        geometry: { type: 'LineString', coordinates: smoothed },
      });
    }
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

function pickCanonicalDemarcationChains(chains: number[][][]): number[][][] {
  if (chains.length <= 1) return chains;
  const scored = chains.map((chain) => ({
    chain,
    score: computePolylineLength(chain),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0] ? [scored[0].chain] : [];
}

function computePolylineLength(chain: number[][]): number {
  let total = 0;
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1]!;
    const curr = chain[i]!;
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    total += Math.hypot(dx, dy);
  }
  return total;
}

function filterSegmentsConnectedToFront(
  segments: number[][][],
  frontLineVertices: Set<string>,
): number[][][] {
  if (segments.length === 0) return [];

  const segmentEndpointKeys = segments.map((segment) => [
    coordKey(segment[0]),
    coordKey(segment[segment.length - 1]),
  ] as const);
  const endpointToSegments = new Map<string, number[]>();
  for (let i = 0; i < segmentEndpointKeys.length; i++) {
    for (const endpointKey of segmentEndpointKeys[i]!) {
      const bucket = endpointToSegments.get(endpointKey) ?? [];
      bucket.push(i);
      endpointToSegments.set(endpointKey, bucket);
    }
  }

  const keep = new Set<number>();
  const queue: number[] = [];
  for (let i = 0; i < segmentEndpointKeys.length; i++) {
    const [a, b] = segmentEndpointKeys[i]!;
    if (frontLineVertices.has(a) || frontLineVertices.has(b)) {
      keep.add(i);
      queue.push(i);
    }
  }
  if (queue.length === 0) return [];

  for (let i = 0; i < queue.length; i++) {
    const idx = queue[i]!;
    for (const endpointKey of segmentEndpointKeys[idx]!) {
      for (const neighborIdx of endpointToSegments.get(endpointKey) ?? []) {
        if (keep.has(neighborIdx)) continue;
        keep.add(neighborIdx);
        queue.push(neighborIdx);
      }
    }
  }

  return [...keep].sort((a, b) => a - b).map((idx) => segments[idx]!);
}

function mergeSegments(segments: number[][][]): number[][][] {
  if (segments.length === 0) return [];

  const endpointMap = new Map<string, number[]>();
  const addToMap = (key: string, idx: number) => {
    let arr = endpointMap.get(key);
    if (!arr) {
      arr = [];
      endpointMap.set(key, arr);
    }
    arr.push(idx);
  };
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    addToMap(coordKey(seg[0]), i);
    addToMap(coordKey(seg[seg.length - 1]), i);
  }

  const used = new Set<number>();
  const result: number[][][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    let chain = [...segments[i]];

    let changed = true;
    while (changed) {
      changed = false;
      const tailKey = coordKey(chain[chain.length - 1]);
      const candidates = endpointMap.get(tailKey);
      if (!candidates) break;
      for (const j of candidates) {
        if (used.has(j)) continue;
        const seg = segments[j];
        const segStart = coordKey(seg[0]);
        const segEnd = coordKey(seg[seg.length - 1]);
        if (segStart === tailKey) {
          chain.push(...seg.slice(1));
        } else if (segEnd === tailKey) {
          chain.push(...[...seg].reverse().slice(1));
        } else {
          continue;
        }
        used.add(j);
        changed = true;
        break;
      }
    }

    changed = true;
    while (changed) {
      changed = false;
      const headKey = coordKey(chain[0]);
      const candidates = endpointMap.get(headKey);
      if (!candidates) break;
      for (const j of candidates) {
        if (used.has(j)) continue;
        const seg = segments[j];
        const segStart = coordKey(seg[0]);
        const segEnd = coordKey(seg[seg.length - 1]);
        if (segEnd === headKey) {
          chain = [...seg.slice(0, -1), ...chain];
        } else if (segStart === headKey) {
          chain = [...[...seg].reverse().slice(0, -1), ...chain];
        } else {
          continue;
        }
        used.add(j);
        changed = true;
        break;
      }
    }

    result.push(chain);
  }
  return result;
}

function perpendicularDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return Math.sqrt((p[0] - projX) ** 2 + (p[1] - projY) ** 2);
}

function chaikinSmooth(coords: number[][], iterations: number): number[][] {
  if (coords.length <= 2) return coords;
  let pts = coords;
  for (let iter = 0; iter < iterations; iter++) {
    const next: number[][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      if (i > 0) {
        next.push([
          p0[0] * 0.75 + p1[0] * 0.25,
          p0[1] * 0.75 + p1[1] * 0.25,
        ]);
      }
      if (i < pts.length - 2) {
        next.push([
          p0[0] * 0.25 + p1[0] * 0.75,
          p0[1] * 0.25 + p1[1] * 0.75,
        ]);
      }
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

function simplifyLine(coords: number[][], tolerance: number): number[][] {
  if (coords.length <= 2) return coords;

  let maxDist = 0;
  let maxIdx = 0;
  const first = coords[0];
  const last = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = perpendicularDistance(coords[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyLine(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyLine(coords.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}
