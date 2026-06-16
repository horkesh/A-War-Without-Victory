import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import { buildEnclaveGeoJSON } from '../src/ui/map/map/builders/buildEnclaveGeoJSON.js';

function squareFeature(osid: string, x: number): FeatureCollection<Polygon>['features'][number] {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [x, 0],
        [x + 0.1, 0],
        [x + 0.1, 0.1],
        [x, 0.1],
        [x, 0],
      ]],
    },
    properties: { osid },
  };
}

describe('enclave map player-visible-state scoping', () => {
  it('only emits player-faction enclave logistics features when player faction is set', () => {
    const base: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: [
        squareFeature('op:gorazde:gorazde_2', 0),
        squareFeature('op:zepce:zepce_2', 1),
      ],
    };

    const result = buildEnclaveGeoJSON(
      base,
      {
        'op:gorazde:gorazde_2': 'RBiH',
        'op:zepce:zepce_2': 'HRHB',
      },
      {
        gorazde: { resilience: 9, isolation_turns: 5, hardening_active: false, faction: 'RBiH' },
        zepce: { resilience: 7, isolation_turns: 6, hardening_active: true, faction: 'HRHB' },
      },
      'RBiH',
    );

    expect(result.polygons.features.map((feature) => feature.properties.enclave_id)).toEqual(['gorazde']);
    expect(result.labels.features.map((feature) => feature.properties.enclave_id)).toEqual(['gorazde']);
    expect(result.polygons.features[0]?.properties.resilience).toBe(9);
  });
});
