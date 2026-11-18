/**
 * Build a GeoJSON FeatureCollection for supply map mode.
 * Colors OSIDs by supply state:
 *   adequate  (condition ≥ 50) → green
 *   strained  (condition 20–49) → amber
 *   critical  (condition < 20)  → red
 *   unknown   (no controller / no report) → grey
 *
 * Prefers explicit per-OSID supply state when present.
 * Falls back to faction supply condition, then legacy warPhaseSupplyPressure.
 * (The faction-reserve input was retired 2026-11-17 with the supply-reserve economy.)
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

export type OsidSupplyClass = 'adequate' | 'strained' | 'critical' | 'unknown';
type ExplicitOsidSupplyClass = Exclude<OsidSupplyClass, 'unknown'>;

// Faction supply-condition thresholds (formerly shared with the retired reserve thresholds).
const CONDITION_ADEQUATE = 50;
const CONDITION_STRAINED = 20;

interface SupplyProperties {
  osid: string;
  supply_class: OsidSupplyClass;
  controller: string | null;
  supply_pressure: number;
}

function conditionToClass(condition: number): OsidSupplyClass {
  if (condition >= CONDITION_ADEQUATE) return 'adequate';
  if (condition >= CONDITION_STRAINED) return 'strained';
  return 'critical';
}

function legacyPressureToClass(pressure: number): OsidSupplyClass {
  if (pressure >= 80) return 'critical';
  if (pressure >= 50) return 'strained';
  return 'adequate';
}

function localStateToPressure(supplyClass: ExplicitOsidSupplyClass): number {
  if (supplyClass === 'adequate') return 100;
  if (supplyClass === 'strained') return 55;
  return 15;
}

/**
 * Build supply-colored features from osid-control GeoJSON.
 * @param controlGeoJson        Existing control GeoJSON (from buildControlGeoJSON)
 * @param controlBySettlement   OSID → faction controller map
 * @param warPhaseSupplyPressure Legacy faction → pressure fallback
 * @param warPhaseSupplyCondition Live faction → condition fallback (higher is better)
 * @param supplyStateByOsid     Explicit OSID → supply state projection (preferred)
 */
export function buildSupplyGeoJSON(
  controlGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  warPhaseSupplyPressure?: Record<string, number>,
  warPhaseSupplyCondition?: Record<string, number>,
  supplyStateByOsid?: Partial<Record<string, ExplicitOsidSupplyClass>>
): FeatureCollection<Polygon | MultiPolygon, SupplyProperties> {
  const features: Feature<Polygon | MultiPolygon, SupplyProperties>[] = [];

  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid as string | undefined;
    if (!osid) continue;

    const controller = controlBySettlement[osid] ?? null;
    let supply_class: OsidSupplyClass = 'unknown';
    let supply_pressure = 0;

    const localSupply = supplyStateByOsid?.[osid];
    if (localSupply) {
      supply_class = localSupply;
      supply_pressure = localStateToPressure(localSupply);
    } else if (controller) {
      if (warPhaseSupplyCondition) {
        const c = warPhaseSupplyCondition[controller];
        if (typeof c === 'number' && isFinite(c)) {
          supply_pressure = c;
          supply_class = conditionToClass(c);
        } else if (warPhaseSupplyPressure) {
          const p = warPhaseSupplyPressure[controller];
          if (typeof p === 'number' && isFinite(p)) {
            supply_pressure = p;
            supply_class = legacyPressureToClass(p);
          }
        }
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
