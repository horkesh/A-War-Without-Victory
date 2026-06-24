import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';

import {
  buildEthnicGeoJSON,
  getCurrentEthnicForOsid,
  getMajorityEthnic,
} from '../src/ui/map/map/builders/buildEthnicGeoJSON.js';

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
});
