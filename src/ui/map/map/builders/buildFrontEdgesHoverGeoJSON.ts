import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';
import type { CorpsFrontSectorView } from '../../data/types';

interface OsidProperties {
  osid: string;
  controller: string | null;
  [key: string]: unknown;
}

interface FrontEdgeHoverProperties {
  edge_id: string;
  faction: string;
  opposing_faction: string;
  offset_side: 1 | -1;
  sector_id?: string;
  corps_id?: string;
}

/**
 * Builds a GeoJSON source for front-edge hover/click: TWO features per edge
 * (one per faction side), each carrying offset_side, faction, sector_id, and corps_id.
 * This allows separate offset hitbox layers so each faction's sector is individually clickable.
 */
export function buildFrontEdgesHoverGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  frontEdgesOsid: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[],
  corpsFrontSectors?: CorpsFrontSectorView[],
  osidCentroids?: Map<string, [number, number]>
): FeatureCollection<LineString> {
  const features = controlledOsidGeoJson.features as Feature<Polygon | MultiPolygon, OsidProperties>[];

  const controllerMap = new Map<string, string | null>();
  for (const f of features) {
    controllerMap.set(f.properties.osid, f.properties.controller);
  }

  const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

  // Single pass: build edge→{segment, owning OSIDs} in O(total_vertices).
  const edgeOwners = new Map<string, { segment: number[][]; osids: Set<string> }>();

  for (const feature of features) {
    const osid = feature.properties.osid;
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
        const keyA = coordKey(a);
        const keyB = coordKey(b);
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

        let entry = edgeOwners.get(edgeKey);
        if (!entry) {
          entry = { segment: [a, b], osids: new Set() };
          edgeOwners.set(edgeKey, entry);
        }
        entry.osids.add(osid);
      }
    }
  }

  // Group shared boundary segments by OSID pair (only where controllers differ).
  const pairToSegments = new Map<string, number[][][]>();
  for (const { segment, osids } of edgeOwners.values()) {
    if (osids.size !== 2) continue;
    const [osidA, osidB] = [...osids].sort((x, y) => x.localeCompare(y));
    const ctrlA = controllerMap.get(osidA);
    const ctrlB = controllerMap.get(osidB);
    if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;

    const pairKey = `${osidA}__${osidB}`;
    if (!pairToSegments.has(pairKey)) pairToSegments.set(pairKey, []);
    pairToSegments.get(pairKey)!.push(segment);
  }

  // Build (edge_id + faction) → sector lookup
  const edgeFactionToSector = new Map<string, { sector_id: string; corps_id: string }>();
  if (corpsFrontSectors) {
    for (const sector of corpsFrontSectors) {
      for (const edgeId of sector.edge_ids) {
        const key = `${edgeId}\0${sector.faction}`;
        if (!edgeFactionToSector.has(key)) {
          edgeFactionToSector.set(key, { sector_id: sector.sector_id, corps_id: sector.corps_id });
        }
      }
    }
  }

  // Compute offset_side from centroids (same logic as buildCorpsFrontLinesGeoJSON)
  const pairToOffsets = new Map<string, { osidA: string; osidB: string; offsetA: 1 | -1; offsetB: 1 | -1 }>();
  if (osidCentroids) {
    for (const edge of frontEdgesOsid) {
      const a = edge.a;
      const b = edge.b;
      const pairKey = a < b ? `${a}__${b}` : `${b}__${a}`;
      if (pairToOffsets.has(pairKey)) continue;
      const segs = pairToSegments.get(pairKey);
      if (!segs || segs.length === 0) continue;
      // Use first segment to determine offset direction
      const seg = segs[0];
      const [ax, ay] = seg[0];
      const [bx, by] = seg[seg.length - 1];
      const dx = bx - ax;
      const dy = by - ay;
      const osidFirst = a < b ? a : b;
      const osidSecond = a < b ? b : a;
      const centFirst = osidCentroids.get(osidFirst);
      if (centFirst) {
        const cross = dx * (centFirst[1] - ay) - dy * (centFirst[0] - ax);
        // cross > 0 → centFirst is LEFT of directed edge; MapLibre positive line-offset = RIGHT,
        // so assign -1 to push glow LEFT into osidFirst's territory.
        const offsetFirst: 1 | -1 = cross > 0 ? -1 : 1;
        pairToOffsets.set(pairKey, { osidA: osidFirst, osidB: osidSecond, offsetA: offsetFirst, offsetB: cross > 0 ? 1 : -1 });
      }
    }
  }

  const outFeatures: Array<{ type: 'Feature'; properties: FrontEdgeHoverProperties; geometry: { type: 'LineString'; coordinates: number[][] } }> = [];
  for (const edge of frontEdgesOsid) {
    const a = edge.a;
    const b = edge.b;
    const pairKey = a < b ? `${a}__${b}` : `${b}__${a}`;
    const segs = pairToSegments.get(pairKey);
    if (!segs || segs.length === 0) continue;
    const coords = segs.length === 1 ? segs[0] : mergeSegmentCoords(segs);
    const factionA = edge.side_a ?? '';
    const factionB = edge.side_b ?? '';

    // Determine which offset_side each faction gets
    const offsets = pairToOffsets.get(pairKey);
    const ctrlFirst = controllerMap.get(a < b ? a : b);
    let offsetForA: 1 | -1 = 1;
    let offsetForB: 1 | -1 = -1;
    if (offsets) {
      // factionA = side_a = controller of edge.a
      // We need to map edge.a's controller to the correct offset
      const ctrlEdgeA = controllerMap.get(edge.a);
      if (ctrlEdgeA === ctrlFirst) {
        // edge.a corresponds to osidFirst (sorted first)
        offsetForA = offsets.offsetA;
        offsetForB = offsets.offsetB;
      } else {
        offsetForA = offsets.offsetB;
        offsetForB = offsets.offsetA;
      }
    }

    // Feature for faction A's side
    const sectorA = edgeFactionToSector.get(`${pairKey}\0${factionA}`);
    const propsA: FrontEdgeHoverProperties = {
      edge_id: `${edge.edge_id}:${factionA}`,
      faction: factionA,
      opposing_faction: factionB,
      offset_side: offsetForA,
    };
    if (sectorA) {
      propsA.sector_id = sectorA.sector_id;
      propsA.corps_id = sectorA.corps_id;
    }
    outFeatures.push({
      type: 'Feature',
      properties: propsA,
      geometry: { type: 'LineString', coordinates: coords },
    });

    // Feature for faction B's side
    const sectorB = edgeFactionToSector.get(`${pairKey}\0${factionB}`);
    const propsB: FrontEdgeHoverProperties = {
      edge_id: `${edge.edge_id}:${factionB}`,
      faction: factionB,
      opposing_faction: factionA,
      offset_side: offsetForB,
    };
    if (sectorB) {
      propsB.sector_id = sectorB.sector_id;
      propsB.corps_id = sectorB.corps_id;
    }
    outFeatures.push({
      type: 'Feature',
      properties: propsB,
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

function mergeSegmentCoords(segments: number[][][]): number[][] {
  if (segments.length === 0) return [];
  const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
  const used = new Set<number>();
  const result: number[][] = [];
  const current = segments[0];
  result.push(...current);
  used.add(0);

  while (used.size < segments.length) {
    const endKey = coordKey(result[result.length - 1]);
    let found = false;
    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;
      const seg = segments[i];
      const startKey = coordKey(seg[0]);
      const segEndKey = coordKey(seg[seg.length - 1]);
      if (startKey === endKey) {
        result.push(...seg.slice(1));
        used.add(i);
        found = true;
        break;
      }
      if (segEndKey === endKey) {
        result.push(...[...seg].reverse().slice(1));
        used.add(i);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return result;
}
