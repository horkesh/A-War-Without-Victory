import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import type { PoliticalMetricView } from '../../data/types';
import { strictCompare } from '../../../../state/validateGameState.js';

type PolygonFeature = Feature<Polygon | MultiPolygon, GeoJsonProperties>;

export type PoliticalMetric = 'authority' | 'legitimacy';
export type PoliticalMetricClass = 'low' | 'medium' | 'high';

export interface PoliticalMetricProperties {
  osid: string;
  controller: string | null;
  metric: PoliticalMetric;
  metric_value: number;
  metric_class: PoliticalMetricClass;
}

export interface BuildPoliticalMetricArgs {
  controlGeoJson: FeatureCollection;
  metric: PoliticalMetric;
  politicalMetricsByOsid?: Record<string, PoliticalMetricView>;
}

function isPolygonFeature(feature: Feature): feature is PolygonFeature {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon';
}

function featureOsid(feature: Feature): string {
  const raw = (feature.properties as Record<string, unknown> | null | undefined)?.osid;
  return typeof raw === 'string' ? raw : '';
}

function metricClass(value: number): PoliticalMetricClass {
  if (value < 35) return 'low';
  if (value < 70) return 'medium';
  return 'high';
}

export function buildPoliticalMetricGeoJSON(args: BuildPoliticalMetricArgs): FeatureCollection<Polygon | MultiPolygon, PoliticalMetricProperties> {
  const featuresByOsid = new Map<string, PolygonFeature>();
  for (const feature of args.controlGeoJson.features) {
    if (!isPolygonFeature(feature)) continue;
    const osid = featureOsid(feature);
    if (!osid) continue;
    featuresByOsid.set(osid, feature);
  }

  const features = Object.keys(args.politicalMetricsByOsid ?? {})
    .filter((osid) => featuresByOsid.has(osid))
    .filter((osid) => {
      const metricValue = args.politicalMetricsByOsid?.[osid]?.[args.metric];
      return typeof metricValue === 'number' && Number.isFinite(metricValue);
    })
    .sort(strictCompare)
    .map((osid) => {
      const source = featuresByOsid.get(osid)!;
      const metrics = args.politicalMetricsByOsid![osid];
      const value = metrics[args.metric]!;
      return {
        type: 'Feature' as const,
        geometry: source.geometry,
        properties: {
          osid,
          controller: metrics.controller,
          metric: args.metric,
          metric_value: value,
          metric_class: metricClass(value),
        },
      };
    });

  return { type: 'FeatureCollection', features };
}
