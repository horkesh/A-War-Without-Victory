import { describe, expect, it } from 'vitest';

import { buildSupplyReachGeoJSON } from '../src/ui/map/map/builders/buildSupplyReachGeoJSON';

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
      properties: { osid: 'op:test:beta', controller: 'RBiH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
      },
    },
    {
      type: 'Feature',
      properties: { osid: 'op:test:gamma', controller: 'RBiH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]],
      },
    },
  ],
} as any;

describe('buildSupplyReachGeoJSON', () => {
  it('projects current supply states onto OSID polygons', () => {
    const result = buildSupplyReachGeoJSON({
      controlGeoJson: baseGeoJson,
      supplyStateByOsid: {
        'op:test:alpha': 'adequate',
        'op:test:beta': 'strained',
        'op:test:gamma': 'critical',
      },
    });

    expect(result.features).toHaveLength(3);
    expect(result.features.map((feature) => feature.properties.supply_reach_class)).toEqual([
      'adequate',
      'strained',
      'critical',
    ]);
    expect(result.features[0].properties.supply_reach_score).toBe(1);
    expect(result.features[1].properties.supply_reach_score).toBe(0.55);
    expect(result.features[2].properties).toMatchObject({
      osid: 'op:test:gamma',
      controller: 'RBiH',
      isolated: true,
      supply_reach_score: 0.15,
    });
  });

  it('omits polygons without current player-visible supply state', () => {
    const result = buildSupplyReachGeoJSON({
      controlGeoJson: baseGeoJson,
      supplyStateByOsid: {
        'op:test:beta': 'strained',
      },
    });

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.osid).toBe('op:test:beta');
  });

  it('returns supply polygons sorted by OSID independent of source feature order', () => {
    const reversed = {
      ...baseGeoJson,
      features: [...baseGeoJson.features].reverse(),
    };
    const supplyStateByOsid = {
      'op:test:gamma': 'critical',
      'op:test:alpha': 'adequate',
    } as const;

    const a = buildSupplyReachGeoJSON({ controlGeoJson: baseGeoJson, supplyStateByOsid });
    const b = buildSupplyReachGeoJSON({ controlGeoJson: reversed, supplyStateByOsid });

    expect(a.features.map((feature) => feature.properties.osid)).toEqual([
      'op:test:alpha',
      'op:test:gamma',
    ]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
