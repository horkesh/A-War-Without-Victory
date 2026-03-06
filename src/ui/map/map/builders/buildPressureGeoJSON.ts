import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { FrontEdgeView, FrontPressureView } from '../../data/types';

type PressureClass = 'low' | 'medium' | 'high';

interface PressureProperties {
  osid: string;
  controller: string | null;
  pressure_intensity: number;
  pressure_class: PressureClass;
}

function classifyPressure(intensity: number): PressureClass {
  if (intensity < 0.3) return 'low';
  if (intensity < 0.7) return 'medium';
  return 'high';
}

/**
 * Build pressure map mode data by projecting edge pressure onto adjacent OSIDs.
 * Pressure intensity is the maximum normalized value among edges touching each OSID.
 */
export function buildPressureGeoJSON(
  controlGeoJson: FeatureCollection,
  frontEdgesOsid: FrontEdgeView[],
  frontPressureByEdge: Record<string, FrontPressureView> | undefined,
  controlBySettlement: Record<string, string | null>
): FeatureCollection<Polygon | MultiPolygon, PressureProperties> {
  const pressureByOsid = new Map<string, number>();

  for (const edge of frontEdgesOsid) {
    const edgePressure = frontPressureByEdge?.[edge.edge_id];
    if (!edgePressure || edgePressure.max_abs <= 0) continue;
    const normalized = Math.min(1, Math.max(0, Math.abs(edgePressure.value) / edgePressure.max_abs));

    const ctrlA = controlBySettlement[edge.a] ?? edge.side_a ?? null;
    const ctrlB = controlBySettlement[edge.b] ?? edge.side_b ?? null;

    if (ctrlA && (edge.side_a == null || edge.side_a === ctrlA)) {
      const prev = pressureByOsid.get(edge.a) ?? 0;
      pressureByOsid.set(edge.a, normalized > prev ? normalized : prev);
    }
    if (ctrlB && (edge.side_b == null || edge.side_b === ctrlB)) {
      const prev = pressureByOsid.get(edge.b) ?? 0;
      pressureByOsid.set(edge.b, normalized > prev ? normalized : prev);
    }
  }

  const features: Feature<Polygon | MultiPolygon, PressureProperties>[] = [];
  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid;
    if (typeof osid !== 'string') continue;

    const controller = controlBySettlement[osid] ?? null;
    if (!controller) continue;

    const intensity = pressureByOsid.get(osid) ?? 0;
    features.push({
      type: 'Feature',
      geometry: feature.geometry as Polygon | MultiPolygon,
      properties: {
        osid,
        controller,
        pressure_intensity: intensity,
        pressure_class: classifyPressure(intensity),
      },
    });
  }

  return { type: 'FeatureCollection', features };
}
