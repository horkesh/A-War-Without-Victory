import { describe, expect, it } from 'vitest';

import { buildContestedBandsGeoJSON } from '../src/ui/map/map/builders/buildContestedBandsGeoJSON';

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

describe('buildContestedBandsGeoJSON', () => {
  it('marks recently flipped OSIDs as contested and preserves their polygon geometry', () => {
    const result = buildContestedBandsGeoJSON({
      controlGeoJson: baseGeoJson,
      currentTurn: 12,
      recentControlEvents: [
        { turn: 11, settlementId: 'op:test:gamma', from: 'RS', to: 'RBiH', mechanism: 'combat' },
      ],
      frontEdgesOsid: [],
      formations: [],
    });

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toMatchObject({
      osid: 'op:test:gamma',
      controller: 'RBiH',
      contested_reason: 'recent_change',
      contested_score: 1,
      turns_since_flip: 1,
    });
    expect(result.features[0].geometry).toEqual(baseGeoJson.features[2].geometry);
  });

  it('marks frontline OSIDs as contested when adjacent hostile strength exceeds half of local friendly strength', () => {
    const result = buildContestedBandsGeoJSON({
      controlGeoJson: baseGeoJson,
      currentTurn: 20,
      recentControlEvents: [],
      frontEdgesOsid: [
        { edge_id: 'op:test:alpha__op:test:beta', a: 'op:test:alpha', b: 'op:test:beta', side_a: 'RBiH', side_b: 'RS' },
      ],
      formations: [
        { id: 'friendly', faction: 'RBiH', location_osid: 'op:test:alpha', personnel: 100 } as any,
        { id: 'hostile', faction: 'RS', location_osid: 'op:test:beta', personnel: 61 } as any,
      ],
    });

    expect(result.features).toHaveLength(2);
    const alpha = result.features.find((feature) => feature.properties.osid === 'op:test:alpha');
    expect(alpha?.properties).toMatchObject({
      osid: 'op:test:alpha',
      controller: 'RBiH',
      contested_reason: 'adjacent_pressure',
    });
    expect(alpha?.properties.enemy_pressure_ratio).toBeCloseTo(0.61, 6);
  });

  it('returns contested polygons sorted by OSID, independent of source feature order', () => {
    const reversed = {
      ...baseGeoJson,
      features: [...baseGeoJson.features].reverse(),
    };

    const args = {
      currentTurn: 8,
      recentControlEvents: [
        { turn: 8, settlementId: 'op:test:gamma', from: 'RS', to: 'RBiH', mechanism: 'combat' },
        { turn: 7, settlementId: 'op:test:alpha', from: 'RS', to: 'RBiH', mechanism: 'combat' },
      ],
      frontEdgesOsid: [],
      formations: [],
    };

    const a = buildContestedBandsGeoJSON({ controlGeoJson: baseGeoJson, ...args });
    const b = buildContestedBandsGeoJSON({ controlGeoJson: reversed, ...args });

    expect(a.features.map((feature) => feature.properties.osid)).toEqual([
      'op:test:alpha',
      'op:test:gamma',
    ]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
