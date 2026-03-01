import type { FeatureCollection, Feature, Polygon, MultiPolygon, LineString } from 'geojson';

interface OsidProperties {
  osid: string;
  controller: string | null;
  [key: string]: unknown;
}

interface FrontEdgeHoverProperties {
  edge_id: string;
  factionA: string;
  factionB: string;
}

/**
 * Builds a GeoJSON source for front-edge hover: one feature per edge with edge_id.
 * Used so we can queryRenderedFeatures and show §7.3 tooltip.
 * Geometry is the shared boundary between the two OSIDs (same as in generateFactionBorders).
 */
export function buildFrontEdgesHoverGeoJSON(
  controlledOsidGeoJson: FeatureCollection,
  frontEdgesOsid: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[]
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
    outFeatures.push({
      type: 'Feature',
      properties: { edge_id: edge.edge_id, factionA, factionB },
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
  let current = segments[0];
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
