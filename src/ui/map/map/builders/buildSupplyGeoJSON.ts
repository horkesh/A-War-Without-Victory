/**
 * Build a GeoJSON FeatureCollection for supply map mode.
 * Colors OSIDs by the controlling faction's supply pressure:
 *   adequate  (pressure ≥ 80) → green
 *   strained  (pressure 50–79) → amber
 *   critical  (pressure < 50)  → red
 *   unknown   (no controller / no data) → grey
 *
 * Uses faction-level war_supply_pressure as a proxy for per-OSID state.
 * No GameState changes required — derived from controlBySettlement + phaseIiSupplyPressure.
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

export type OsidSupplyClass = 'adequate' | 'strained' | 'critical' | 'unknown';

interface SupplyProperties {
  osid: string;
  supply_class: OsidSupplyClass;
  controller: string | null;
  supply_pressure: number;
}

function pressureToClass(pressure: number): OsidSupplyClass {
  if (pressure >= 80) return 'adequate';
  if (pressure >= 50) return 'strained';
  return 'critical';
}

/**
 * Build supply-colored features from osid-control GeoJSON.
 * @param controlGeoJson   Existing control GeoJSON (from buildControlGeoJSON)
 * @param controlBySettlement  OSID → faction controller map
 * @param phaseIiSupplyPressure  Faction → pressure value [0–100] map
 */
export function buildSupplyGeoJSON(
  controlGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  phaseIiSupplyPressure: Record<string, number> | undefined
): FeatureCollection<Polygon | MultiPolygon, SupplyProperties> {
  const features: Feature<Polygon | MultiPolygon, SupplyProperties>[] = [];

  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid as string | undefined;
    if (!osid) continue;

    const controller = controlBySettlement[osid] ?? null;
    let supply_class: OsidSupplyClass = 'unknown';
    let supply_pressure = 100;

    if (controller && phaseIiSupplyPressure) {
      const pressure = phaseIiSupplyPressure[controller];
      if (typeof pressure === 'number' && isFinite(pressure)) {
        supply_pressure = pressure;
        supply_class = pressureToClass(pressure);
      }
    }

    features.push({
      type: 'Feature',
      geometry: feature.geometry as Polygon | MultiPolygon,
      properties: { osid, supply_class, controller, supply_pressure },
    });
  }

  return { type: 'FeatureCollection', features };
}
