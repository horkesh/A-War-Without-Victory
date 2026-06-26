/**
 * Build a GeoJSON FeatureCollection for supply map mode.
 * Colors OSIDs by the controlling faction's supply state:
 *   adequate  (general reserve ≥ 50) → green
 *   strained  (reserve 20–49)        → amber
 *   critical  (reserve < 20)         → red
 *   unknown   (no controller / supply disabled) → grey
 *
 * Prefers explicit per-OSID supply state when present.
 * Falls back to faction reserves/conditions, then legacy warPhaseSupplyPressure.
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';

export type OsidSupplyClass = 'adequate' | 'strained' | 'critical' | 'unknown';
type ExplicitOsidSupplyClass = Exclude<OsidSupplyClass, 'unknown'>;

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
 * @param factionReserves       Phase A-E per-faction reserve levels (preferred)
 * @param warPhaseSupplyPressure Legacy faction → pressure fallback
 * @param warPhaseSupplyCondition Live faction → condition fallback (higher is better)
 * @param supplyStateByOsid     Explicit OSID → supply state projection (preferred)
 */
export function buildSupplyGeoJSON(
  controlGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  factionReserves: Record<string, { generalSupply?: number; heavyMunitions?: number }> | undefined,
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
      const res = factionReserves?.[controller];
      if (res != null && typeof res.generalSupply === 'number' && isFinite(res.generalSupply)) {
        supply_pressure = res.generalSupply;
        supply_class = reserveToClass(res.generalSupply);
      } else if (warPhaseSupplyCondition) {
        const c = warPhaseSupplyCondition[controller];
        if (typeof c === 'number' && isFinite(c)) {
          supply_pressure = c;
          supply_class = reserveToClass(c);
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
