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

  // Emit one feature per polygon boundary segment per faction — same approach as
  // buildCorpsFrontLinesGeoJSON. Each segment gets its own offset computed from
  // the segment's direction + the friendly OSID centroid. This avoids offset
  // inversions that occur when long merged chains curve.
  const outFeatures: Array<{ type: 'Feature'; properties: FrontEdgeHoverProperties; geometry: { type: 'LineString'; coordinates: number[][] } }> = [];

  for (const edge of frontEdgesOsid) {
    const pairKey = edge.edge_id; // edge_id is already normalized as a__b with a < b
    const segs = pairToSegments.get(pairKey);
    if (!segs || segs.length === 0) continue;

    const factionA = edge.side_a ?? '';
    const factionB = edge.side_b ?? '';
    const sectorA = edgeFactionToSector.get(`${edge.edge_id}\0${factionA}`);
    const sectorB = edgeFactionToSector.get(`${edge.edge_id}\0${factionB}`);

    // factionA = side_a controls edge.a — use its centroid for offset computation
    const centA = osidCentroids?.get(edge.a);

    for (const seg of segs) {
      if (seg.length < 2) continue;
      const [ax, ay] = seg[0];
      const [bx, by] = seg[seg.length - 1];
      const dx = bx - ax;
      const dy = by - ay;

      // Compute offset per-segment from centroid cross product
      let offsetForA: 1 | -1 = 1;
      let offsetForB: 1 | -1 = -1;
      if (centA) {
        const cross = dx * (centA[1] - ay) - dy * (centA[0] - ax);
        offsetForA = cross > 0 ? -1 : 1;
        offsetForB = cross > 0 ? 1 : -1;
      }

      outFeatures.push({
        type: 'Feature',
        properties: {
          edge_id: `${edge.edge_id}:${factionA}`,
          faction: factionA,
          opposing_faction: factionB,
          offset_side: offsetForA,
          sector_id: sectorA?.sector_id,
          corps_id: sectorA?.corps_id,
        },
        geometry: { type: 'LineString', coordinates: seg },
      });
      outFeatures.push({
        type: 'Feature',
        properties: {
          edge_id: `${edge.edge_id}:${factionB}`,
          faction: factionB,
          opposing_faction: factionA,
          offset_side: offsetForB,
          sector_id: sectorB?.sector_id,
          corps_id: sectorB?.corps_id,
        },
        geometry: { type: 'LineString', coordinates: seg },
      });
    }
  }

  return { type: 'FeatureCollection', features: outFeatures };
}

