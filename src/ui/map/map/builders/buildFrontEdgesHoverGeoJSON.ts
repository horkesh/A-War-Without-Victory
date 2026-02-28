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

  const edgeMap = new Map<string, number[][][]>();
  const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

  for (const feature of features) {
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

        if (!edgeMap.has(edgeKey)) edgeMap.set(edgeKey, []);
        edgeMap.get(edgeKey)!.push([a, b]);
      }
    }
  }

  const pairToSegments = new Map<string, number[][][]>();
  for (const [edgeKey, segList] of edgeMap) {
    if (segList.length === 0) continue;
    const segment = segList[0];
    const osids = new Set<string>();
    for (const f of features) {
      const rings =
        f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
      for (const r of rings) {
        const ring = r as number[][];
        for (let i = 0; i < ring.length - 1; i++) {
          const pa = coordKey(ring[i]);
          const pb = coordKey(ring[i + 1]);
          const pk = pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
          if (pk === edgeKey) osids.add(f.properties.osid);
        }
      }
    }
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
