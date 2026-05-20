import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import { strictCompare } from '../../../../state/validateGameState.js';

type PolygonFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties>;

export type SupplyReachClass = 'adequate' | 'strained' | 'critical';

export interface SupplyReachProperties {
  osid: string;
  controller: string | null;
  supply_reach_class: SupplyReachClass;
  supply_reach_score: number;
  isolated: boolean;
}

export interface BuildSupplyReachArgs {
  controlGeoJson: FeatureCollection;
  supplyStateByOsid?: Record<string, SupplyReachClass>;
}

function isPolygonFeature(feature: Feature): feature is PolygonFeature {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon';
}

function featureOsid(feature: Feature): string {
  const raw = (feature.properties as Record<string, unknown> | null | undefined)?.osid;
  return typeof raw === 'string' ? raw : '';
}

function featureController(feature: Feature): string | null {
  const raw = (feature.properties as Record<string, unknown> | null | undefined)?.controller;
  return typeof raw === 'string' ? raw : null;
}

function supplyScore(supplyClass: SupplyReachClass): number {
  if (supplyClass === 'adequate') return 1;
  if (supplyClass === 'strained') return 0.55;
  return 0.15;
}

export function buildSupplyReachGeoJSON(args: BuildSupplyReachArgs): FeatureCollection<Polygon | MultiPolygon, SupplyReachProperties> {
  const featuresByOsid = new Map<string, PolygonFeature>();
  for (const feature of args.controlGeoJson.features) {
    if (!isPolygonFeature(feature)) continue;
    const osid = featureOsid(feature);
    if (!osid) continue;
    featuresByOsid.set(osid, feature);
  }

  const supplyStateByOsid: Record<string, SupplyReachClass> = args.supplyStateByOsid ?? {};
  const features = Object.keys(supplyStateByOsid)
    .filter((osid) => featuresByOsid.has(osid))
    .sort(strictCompare)
    .map((osid) => {
      const source = featuresByOsid.get(osid)!;
      const supplyClass = supplyStateByOsid[osid];
      return {
        type: 'Feature' as const,
        geometry: source.geometry,
        properties: {
          osid,
          controller: featureController(source),
          supply_reach_class: supplyClass,
          supply_reach_score: supplyScore(supplyClass),
          isolated: supplyClass === 'critical',
        },
      };
    });

  return { type: 'FeatureCollection', features };
}
