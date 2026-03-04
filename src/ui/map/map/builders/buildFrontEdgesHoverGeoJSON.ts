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

  // Instead of an individual feature per edge, we group by (sector + faction)
  // and merge all contiguous segments for that group.
  const groupedCoords = new Map<string, { props: FrontEdgeHoverProperties; segments: number[][][] }>();

  for (const edge of frontEdgesOsid) {
    const a = edge.a;
    const b = edge.b;
    const pairKey = a < b ? `${a}__${b}` : `${b}__${a}`;
    const segs = pairToSegments.get(pairKey);
    if (!segs || segs.length === 0) continue;

    const factionA = edge.side_a ?? '';
    const factionB = edge.side_b ?? '';

    // Determine which offset_side each faction gets
    const offsets = pairToOffsets.get(pairKey);
    const ctrlFirst = controllerMap.get(a < b ? a : b);
    let offsetForA: 1 | -1 = 1;
    let offsetForB: 1 | -1 = -1;
    if (offsets) {
      const ctrlEdgeA = controllerMap.get(edge.a);
      if (ctrlEdgeA === ctrlFirst) {
        offsetForA = offsets.offsetA;
        offsetForB = offsets.offsetB;
      } else {
        offsetForA = offsets.offsetB;
        offsetForB = offsets.offsetA;
      }
    }

    const sectorA = edgeFactionToSector.get(`${pairKey}\0${factionA}`);
    const keyA = sectorA ? `sector_${sectorA.sector_id}_${factionA}` : `edge_${edge.edge_id}_${factionA}`;
    if (!groupedCoords.has(keyA)) {
      groupedCoords.set(keyA, {
        props: {
          edge_id: sectorA ? sectorA.sector_id : `${edge.edge_id}:${factionA}`,
          faction: factionA,
          opposing_faction: factionB,
          offset_side: offsetForA,
          sector_id: sectorA?.sector_id,
          corps_id: sectorA?.corps_id,
        },
        segments: [],
      });
    }
    groupedCoords.get(keyA)!.segments.push(...segs);

    const sectorB = edgeFactionToSector.get(`${pairKey}\0${factionB}`);
    const keyB = sectorB ? `sector_${sectorB.sector_id}_${factionB}` : `edge_${edge.edge_id}_${factionB}`;
    if (!groupedCoords.has(keyB)) {
      groupedCoords.set(keyB, {
        props: {
          edge_id: sectorB ? sectorB.sector_id : `${edge.edge_id}:${factionB}`,
          faction: factionB,
          opposing_faction: factionA,
          offset_side: offsetForB,
          sector_id: sectorB?.sector_id,
          corps_id: sectorB?.corps_id,
        },
        segments: [],
      });
    }
    groupedCoords.get(keyB)!.segments.push(...segs);
  }

  // Now export the groupings, merging segments where possible
  const outFeatures: Array<{ type: 'Feature'; properties: FrontEdgeHoverProperties; geometry: { type: 'LineString'; coordinates: number[][] } }> = [];
  for (const group of groupedCoords.values()) {
    const merged = mergeSegmentCoords(group.segments);
    if (merged.length > 0) {
      // Create one unified LineString for this block
      outFeatures.push({
        type: 'Feature',
        properties: group.props,
        geometry: { type: 'LineString', coordinates: merged },
      });
    }
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

function mergeSegmentCoords(segments: number[][][]): number[][] {
  if (segments.length === 0) return [];
  const coordKey = (c: number[]) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`;
  const used = new Set<number>();
  const result: number[][] = [...segments[0]];
  used.add(0);

  let added = true;
  while (added && used.size < segments.length) {
    added = false;
    const tailKey = coordKey(result[result.length - 1]);
    const headKey = coordKey(result[0]);

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;
      const seg = segments[i];
      const startKey = coordKey(seg[0]);
      const endKey = coordKey(seg[seg.length - 1]);

      // Connects to the tail?
      if (startKey === tailKey) {
        result.push(...seg.slice(1));
        used.add(i);
        added = true;
        break;
      }
      if (endKey === tailKey) {
        result.push(...[...seg].reverse().slice(1));
        used.add(i);
        added = true;
        break;
      }

      // Connects to the head?
      if (endKey === headKey) {
        result.unshift(...seg.slice(0, -1));
        used.add(i);
        added = true;
        break;
      }
      if (startKey === headKey) {
        result.unshift(...[...seg].reverse().slice(0, -1));
        used.add(i);
        added = true;
        break;
      }
    }
  }
  return result;
}
