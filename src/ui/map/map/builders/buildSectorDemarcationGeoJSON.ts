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

  const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

  // Build edgeKey → { segment, owning OSIDs }
  const edgeOwners = new Map<string, { segment: number[][]; osids: Set<string> }>();
  const features = controlledOsidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];

  for (const feature of features) {
    const osid = feature.properties.osid;
    if (!osidToSector.has(osid)) continue; // skip non-front OSIDs (costly, unnecessary)

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

  // Collect segments per sector pair, then chain into continuous LineStrings
  const segmentsByPair = new Map<string, { segments: number[][][]; faction: string; sector_a: string; sector_b: string }>();

  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [oA, oB] = [...osids];
    const sA = osidToSector.get(oA);
    const sB = osidToSector.get(oB);
    if (!sA || !sB) continue;
    if (sA.faction !== sB.faction) continue;       // different factions → front line, not demarcation
    if (sA.sector_id === sB.sector_id) continue;   // same sector → internal edge

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

  // Chain adjacent segments into continuous LineStrings and emit one feature per chain
  const outFeatures: Feature<LineString, DemarcationProperties>[] = [];
  for (const { segments, faction, sector_a, sector_b } of segmentsByPair.values()) {
    const chains = chainSegments(segments, coordKey);
    for (const chain of chains) {
      outFeatures.push({
        type: 'Feature',
        properties: { faction, sector_a, sector_b },
        geometry: { type: 'LineString', coordinates: chain },
      });
    }
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

/** Chain 2-point segments that share endpoints into longer LineStrings. */
function chainSegments(segments: number[][][], coordKey: (c: number[]) => string): number[][][] {
  if (segments.length === 0) return [];
  const used = new Set<number>();
  const result: number[][][] = [];

  for (let startIdx = 0; startIdx < segments.length; startIdx++) {
    if (used.has(startIdx)) continue;
    let chain = [...segments[startIdx]];
    used.add(startIdx);

    let extended = true;
    while (extended) {
      extended = false;
      const headKey = coordKey(chain[0]);
      const tailKey = coordKey(chain[chain.length - 1]);

      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        const seg = segments[i];
        const segHead = coordKey(seg[0]);
        const segTail = coordKey(seg[seg.length - 1]);

        if (segHead === tailKey) {
          chain = [...chain, ...seg.slice(1)];
          used.add(i); extended = true; break;
        }
        if (segTail === tailKey) {
          chain = [...chain, ...[...seg].reverse().slice(1)];
          used.add(i); extended = true; break;
        }
        if (segTail === headKey) {
          chain = [...seg, ...chain.slice(1)];
          used.add(i); extended = true; break;
        }
        if (segHead === headKey) {
          chain = [...[...seg].reverse(), ...chain.slice(1)];
          used.add(i); extended = true; break;
        }
      }
    }
    result.push(chain);
  }
  return result;
}
