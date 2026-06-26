import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';

import {
  buildEthnicGeoJSON,
  getCurrentEthnicForOsid,
  getMajorityEthnic,
} from '../src/ui/map/map/builders/buildEthnicGeoJSON.js';
import { buildGhostMapData } from '../src/ui/map/layers/buildGhostMapLayer.js';

describe('ethnic map truth helpers', () => {
  it('does not infer a majority from partial census ethnicity fields', () => {
    expect(getMajorityEthnic({
      population_total: 100,
      population_bosniaks: 45,
      population_serbs: 35,
    })).toBeNull();
  });

  it('omits majority_ethnic when source census fields are partial', () => {
    const baseGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [18, 44] },
        properties: { osid: 'op:test:a' },
      }],
    };

    const geojson = buildEthnicGeoJSON(baseGeoJson, {
      'op:test:a': {
        mun1990_id: 'testmun',
        population_total: 100,
        population_bosniaks: 45,
        population_serbs: 35,
      },
    });

    expect(geojson.features[0]?.properties?.majority_ethnic).toBeNull();
  });

  it('suppresses current ethnic readout when movement evidence exists but census fields are partial', () => {
    const current = getCurrentEthnicForOsid(
      'op:test:a',
      {
        'op:test:a': {
          mun1990_id: 'testmun',
          population_total: 100,
          population_bosniaks: 45,
          population_serbs: 35,
        },
      },
      {
        testmun: {
          originalPopulation: 100,
          currentPopulation: 90,
          arrivedByFaction: { RBiH: 10 },
        },
      },
      {
        'op:test:a': { RBiH: 5 },
      },
    );

    expect(current).toBeNull();
  });

  it('keeps complete census majority available', () => {
    expect(getMajorityEthnic({
      population_bosniaks: 45,
      population_serbs: 35,
      population_croats: 15,
      population_others: 5,
    })).toBe('Bosniak');
  });

  it('omits ghost-map dots for partial census ethnicity rows instead of zero-filling them', () => {
    const censusGeoJson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[18, 44], [18.1, 44], [18.1, 44.1], [18, 44.1], [18, 44]]] },
          properties: {
            settlement_name: 'Partial',
            population_total: 100,
            population_bosniaks: 45,
            population_serbs: 35,
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[19, 44], [19.1, 44], [19.1, 44.1], [19, 44.1], [19, 44]]] },
          properties: {
            settlement_name: 'Complete',
            population_total: 100,
            population_bosniaks: 45,
            population_serbs: 35,
            population_croats: 15,
            population_others: 5,
          },
        },
      ],
    };

    const data = buildGhostMapData(censusGeoJson);

    expect(data.map((datum) => datum.name)).toEqual(['Complete']);
    expect(data[0]).toMatchObject({
      bosniaks: 45,
      serbs: 35,
      croats: 15,
      others: 5,
    });
  });
});
