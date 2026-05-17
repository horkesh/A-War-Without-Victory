import { describe, expect, it } from 'vitest';

import { buildPoliticalMetricGeoJSON } from '../src/ui/map/map/builders/buildPoliticalMetricGeoJSON';

const baseGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { osid: 'op:test:alpha', controller: 'RBiH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
    },
    {
      type: 'Feature',
      properties: { osid: 'op:test:beta', controller: 'RS' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
      },
    },
  ],
} as any;

describe('buildPoliticalMetricGeoJSON', () => {
  it('projects authority scores onto OSID polygons', () => {
    const result = buildPoliticalMetricGeoJSON({
      controlGeoJson: baseGeoJson,
      metric: 'authority',
      politicalMetricsByOsid: {
        'op:test:alpha': { controller: 'RBiH', authority: 82, legitimacy: 41 },
        'op:test:beta': { controller: 'RS', authority: 25, legitimacy: 74 },
      },
    });

    expect(result.features.map((feature) => feature.properties.metric_value)).toEqual([82, 25]);
    expect(result.features[0].properties).toMatchObject({
      osid: 'op:test:alpha',
      controller: 'RBiH',
      metric: 'authority',
      metric_class: 'high',
    });
    expect(result.features[1].properties.metric_class).toBe('low');
  });

  it('projects legitimacy scores separately from authority scores', () => {
    const result = buildPoliticalMetricGeoJSON({
      controlGeoJson: baseGeoJson,
      metric: 'legitimacy',
      politicalMetricsByOsid: {
        'op:test:alpha': { controller: 'RBiH', authority: 82, legitimacy: 41 },
        'op:test:beta': { controller: 'RS', authority: 25, legitimacy: 74 },
      },
    });

    expect(result.features.map((feature) => feature.properties.metric_value)).toEqual([41, 74]);
    expect(result.features[0].properties.metric_class).toBe('medium');
    expect(result.features[1].properties.metric_class).toBe('high');
  });

  it('sorts output by OSID independent of source feature order', () => {
    const reversed = {
      ...baseGeoJson,
      features: [...baseGeoJson.features].reverse(),
    };
    const politicalMetricsByOsid = {
      'op:test:beta': { controller: 'RS', authority: 25, legitimacy: 74 },
      'op:test:alpha': { controller: 'RBiH', authority: 82, legitimacy: 41 },
    };

    const a = buildPoliticalMetricGeoJSON({ controlGeoJson: baseGeoJson, metric: 'authority', politicalMetricsByOsid });
    const b = buildPoliticalMetricGeoJSON({ controlGeoJson: reversed, metric: 'authority', politicalMetricsByOsid });

    expect(a.features.map((feature) => feature.properties.osid)).toEqual(['op:test:alpha', 'op:test:beta']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
