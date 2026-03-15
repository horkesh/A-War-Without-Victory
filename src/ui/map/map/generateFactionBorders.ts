import type {
  FeatureCollection,
  Feature,
  Polygon,
  MultiPolygon,
  LineString,
} from 'geojson';

interface OsidProperties {
  osid: string;
  controller: string | null;
  [key: string]: unknown;
}

interface FrontLineProperties {
  lineType: 'front';
  factionA: string;
  factionB: string;
  tooth_rotation?: number;
  brigade_count?: number;
}

interface GlowLineProperties {
  lineType: 'glow';
  faction: string;
}

/** Merge consecutive segments that share endpoints into longer LineStrings. */
function mergeLineSegments(
  segments: Feature<LineString, FrontLineProperties>[]
): Feature<LineString, FrontLineProperties>[] {
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
  const merged: Feature<LineString, FrontLineProperties>[] = [];

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

/**
 * Given the enriched OSID FeatureCollection (with controller property),
 * compute shared edges between OSIDs with different controllers.
 * When rbihHrhbAllied is true, no front or glow is drawn between RBiH and HRHB (allied).
 * Returns a LineString FeatureCollection containing:
 * - "glow" features (lineType: "glow", faction): one per side for soft faction-colored border glow
 * - "front" features (lineType: "front", factionA, factionB): merged segments for HoI-style dashed front line
 */
export function generateFactionBorders(
  osidGeoJson: FeatureCollection,
  rbihHrhbAllied?: boolean,
  osidCentroids?: Map<string, [number, number]>
): FeatureCollection<LineString> {
  const features = osidGeoJson.features as Feature<
    Polygon | MultiPolygon,
    OsidProperties
  >[];

  const controllerMap = new Map<string, string | null>();
  for (const f of features) {
    controllerMap.set(f.properties.osid, f.properties.controller);
  }

  const edgeMap = new Map<string, Set<string>>();

  for (const feature of features) {
    const osid = feature.properties.osid;
    const rings =
      feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates
        : feature.geometry.coordinates.flat();

    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const keyA = `${a[0].toFixed(6)},${a[1].toFixed(6)}`;
        const keyB = `${b[0].toFixed(6)},${b[1].toFixed(6)}`;
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, new Set());
        }
        edgeMap.get(edgeKey)!.add(osid);
      }
    }
  }

  const glowFeatures: Feature<LineString, GlowLineProperties>[] = [];
  const frontSegmentsByPair = new Map<
    string,
    Feature<LineString, FrontLineProperties>[]
  >();

  for (const [edgeKey, osids] of edgeMap) {
    if (osids.size !== 2) continue;
    const [osidA, osidB] = [...osids];
    const ctrlA = controllerMap.get(osidA);
    const ctrlB = controllerMap.get(osidB);
    if (!ctrlA || !ctrlB || ctrlA === ctrlB) continue;
    if (rbihHrhbAllied && ((ctrlA === 'RBiH' && ctrlB === 'HRHB') || (ctrlA === 'HRHB' && ctrlB === 'RBiH'))) continue;

    const [pA, pB] = edgeKey.split('|');
    const [ax, ay] = pA.split(',').map(Number);
    const [bx, by] = pB.split(',').map(Number);
    const coords: [number, number][] = [[ax, ay], [bx, by]];

    glowFeatures.push({
      type: 'Feature',
      properties: { lineType: 'glow', faction: ctrlA },
      geometry: { type: 'LineString', coordinates: coords },
    });
    glowFeatures.push({
      type: 'Feature',
      properties: { lineType: 'glow', faction: ctrlB },
      geometry: { type: 'LineString', coordinates: coords },
    });

    const pairKey = [ctrlA, ctrlB].sort().join('-');
    let toothRotation: number | undefined;
    if (osidCentroids) {
      const centA = osidCentroids.get(osidA);
      const centB = osidCentroids.get(osidB);
      if (centA && centB) {
        const dx = bx - ax;
        const dy = by - ay;
        // Cross product to determine side
        const crossA = dx * (centA[1] - ay) - dy * (centA[0] - ax);
        toothRotation = crossA > 0 ? 180 : 0;
      }
    }

    if (!frontSegmentsByPair.has(pairKey)) {
      frontSegmentsByPair.set(pairKey, []);
    }
    frontSegmentsByPair.get(pairKey)!.push({
      type: 'Feature',
      properties: {
        lineType: 'front',
        factionA: ctrlA,
        factionB: ctrlB,
        tooth_rotation: toothRotation,
        brigade_count: 0 // In base mode, we don't have sector density info
      },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }

  const mergedFront: Feature<LineString, FrontLineProperties>[] = [];
  for (const segments of frontSegmentsByPair.values()) {
    mergedFront.push(...mergeLineSegments(segments));
  }

  const allFeatures: Feature<LineString>[] = [
    ...glowFeatures,
    ...mergedFront,
  ];

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}
