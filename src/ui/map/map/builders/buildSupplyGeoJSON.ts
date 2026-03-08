/**
 * Build a GeoJSON FeatureCollection for supply map mode.
 * Colors OSIDs by the controlling faction's supply state:
 *   adequate  (general reserve ≥ 50) → green
 *   strained  (reserve 20–49)        → amber
 *   critical  (reserve < 20)         → red
 *   unknown   (no controller / supply disabled) → grey
 *
 * Prefers Phase A-E factionReserves (general_supply_reserve, 0–100).
 * Falls back to legacy warPhaseSupplyPressure when reserves not present.
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

export type OsidSupplyClass = 'adequate' | 'strained' | 'critical' | 'unknown';

// Thresholds matching supply_reserve_constants.ts
const RESERVE_ADEQUATE = 50;
const RESERVE_STRAINED = 20;

interface SupplyProperties {
  osid: string;
  supply_class: OsidSupplyClass;
  controller: string | null;
  supply_pressure: number;
}

function reserveToClass(reserve: number): OsidSupplyClass {
  if (reserve >= RESERVE_ADEQUATE) return 'adequate';
  if (reserve >= RESERVE_STRAINED) return 'strained';
  return 'critical';
}

function legacyPressureToClass(pressure: number): OsidSupplyClass {
  if (pressure >= 80) return 'adequate';
  if (pressure >= 50) return 'strained';
  return 'critical';
}

/**
 * Build supply-colored features from osid-control GeoJSON.
 * @param controlGeoJson        Existing control GeoJSON (from buildControlGeoJSON)
 * @param controlBySettlement   OSID → faction controller map
 * @param factionReserves       Phase A-E per-faction reserve levels (preferred)
 * @param warPhaseSupplyPressure Legacy faction → pressure fallback
 */
export function buildSupplyGeoJSON(
  controlGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  factionReserves: Record<string, { generalSupply: number; heavyMunitions: number }> | undefined,
  warPhaseSupplyPressure?: Record<string, number>
): FeatureCollection<Polygon | MultiPolygon, SupplyProperties> {
  const features: Feature<Polygon | MultiPolygon, SupplyProperties>[] = [];

  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid as string | undefined;
    if (!osid) continue;

    const controller = controlBySettlement[osid] ?? null;
    let supply_class: OsidSupplyClass = 'unknown';
    let supply_pressure = 0;

    if (controller) {
      const res = factionReserves?.[controller];
      if (res != null && isFinite(res.generalSupply)) {
        supply_pressure = res.generalSupply;
        supply_class = reserveToClass(res.generalSupply);
      } else if (warPhaseSupplyPressure) {
        const p = warPhaseSupplyPressure[controller];
        if (typeof p === 'number' && isFinite(p)) {
          supply_pressure = p;
          supply_class = legacyPressureToClass(p);
        }
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
