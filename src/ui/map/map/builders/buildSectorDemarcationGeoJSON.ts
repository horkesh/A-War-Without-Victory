/**
 * Build a GeoJSON source for sector demarcation lines.
 *
 * Finds OSID polygon edges that lie between two front-adjacent OSIDs belonging
 * to DIFFERENT sectors of the SAME faction. These are the lateral boundaries
 * where one corps sector meets another along the friendly line.
 *
 * Output properties: { faction, sector_a, sector_b }
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import type { CorpsFrontSectorView } from '../../data/types';
import { collectSectorFriendlyOsids } from '../../utils/sectorUtils';

interface OsidProperties {
  osid: string;
  controller: string | null;
  [key: string]: unknown;
}

interface DemarcationProperties {
  faction: string;
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

  // Build osid → { sector_id, faction } for every front-adjacent OSID
  const osidToSector = new Map<string, { sector_id: string; faction: string }>();
  for (const sector of corpsFrontSectors) {
    const friendlyOsids = collectSectorFriendlyOsids(sector, frontEdgesOsid);
    for (const osid of friendlyOsids) {
      if (!osidToSector.has(osid)) {
        osidToSector.set(osid, { sector_id: sector.sector_id, faction: sector.faction });
      }
    }
  }

  // Build OSID → faction lookup for front-line proximity filtering
  const osidFaction = new Map<string, string>();
  for (const sector of corpsFrontSectors) {
    for (const osid of collectSectorFriendlyOsids(sector, frontEdgesOsid)) {
      if (!osidFaction.has(osid)) osidFaction.set(osid, sector.faction);
    }
  }
  // Also record enemy-side OSIDs from front edges
  for (const edge of frontEdgesOsid) {
    if (edge.side_a && !osidFaction.has(edge.a)) osidFaction.set(edge.a, edge.side_a);
    if (edge.side_b && !osidFaction.has(edge.b)) osidFaction.set(edge.b, edge.side_b);
  }

  // Build edgeKey → { segment, owning OSIDs }
  const edgeOwners = new Map<string, { segment: number[][]; osids: Set<string> }>();
  const features = controlledOsidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];

  for (const feature of features) {
    const osid = feature.properties.osid;
    if (!osidToSector.has(osid) && !osidFaction.has(osid)) continue;

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

  // Collect front-line vertices: polygon edge vertices shared between opposing-faction OSIDs.
  // These mark where the actual contact line runs. Demarcation segments far from these are deep-rear.
  const frontLineVertices = new Set<string>();
  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [oA, oB] = [...osids];
    const fA = osidFaction.get(oA);
    const fB = osidFaction.get(oB);
    if (fA && fB && fA !== fB) {
      // This polygon edge is on the actual front line
      frontLineVertices.add(coordKey(segment[0]));
      frontLineVertices.add(coordKey(segment[1]));
    }
  }

  // Collect segments per sector pair
  const segmentsByPair = new Map<string, { segments: number[][][]; faction: string; sector_a: string; sector_b: string }>();

  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [oA, oB] = [...osids];
    const sA = osidToSector.get(oA);
    const sB = osidToSector.get(oB);
    if (!sA || !sB) continue;
    if (sA.faction !== sB.faction) continue;       // different factions → front line, not demarcation
    if (sA.sector_id === sB.sector_id) continue;   // same sector → internal edge

    // Only include demarcation segments near the front line (at least one vertex
    // shared with a front-line polygon edge). Filters deep-rear boundary noise.
    const nearFront =
      frontLineVertices.has(coordKey(segment[0])) ||
      frontLineVertices.has(coordKey(segment[1]));
    if (!nearFront) continue;

    const pairKey = sA.sector_id < sB.sector_id
      ? `${sA.sector_id}__${sB.sector_id}`
      : `${sB.sector_id}__${sA.sector_id}`;
    let entry = segmentsByPair.get(pairKey);
    if (!entry) {
      entry = { segments: [], faction: sA.faction, sector_a: sA.sector_id, sector_b: sB.sector_id };
      segmentsByPair.set(pairKey, entry);
    }
    entry.segments.push(segment);
  }

  // Merge segments with endpoint-map, simplify, and emit features
  const outFeatures: Feature<LineString, DemarcationProperties>[] = [];
  for (const { segments, faction, sector_a, sector_b } of segmentsByPair.values()) {
    const chains = mergeSegments(segments);
    const props: DemarcationProperties = { faction, sector_a, sector_b };
    for (const chain of chains) {
      const simplified = simplifyLine(chain, 0.0008);
      if (simplified.length < 2) continue;
      outFeatures.push({
        type: 'Feature',
        properties: props,
        geometry: { type: 'LineString', coordinates: simplified },
      });
    }
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

// ─── Endpoint-map segment merger (O(n) average instead of O(n²)) ────────────

/** Merge 2-point segments sharing endpoints into longer LineStrings using an endpoint index. */
function mergeSegments(segments: number[][][]): number[][][] {
  if (segments.length === 0) return [];

  // Build endpoint → segment-index lookup
  const endpointMap = new Map<string, number[]>();
  const addToMap = (key: string, idx: number) => {
    let arr = endpointMap.get(key);
    if (!arr) { arr = []; endpointMap.set(key, arr); }
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

    // Extend tail
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

    // Extend head
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

// ─── Douglas-Peucker line simplification ─────────────────────────────────────

/** Perpendicular distance from point p to line segment a–b (in degrees, good enough for small areas). */
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

/** Douglas-Peucker simplification. Tolerance in degrees (~0.001° ≈ 110m). */
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
