import { describe, expect, it, vi } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import {
  buildOsidDamageData,
  type OsidDamageSeed,
} from '../../src/ui/map/layers/buildOsidDamageOverlay';

function polygonFeature(osid: string, ring: number[][]): FeatureCollection['features'][number] {
  const geometry: Polygon = { type: 'Polygon', coordinates: [ring] };
  return {
    type: 'Feature',
    properties: { osid },
    geometry,
  };
}

function damageSeed(osids: string[]): OsidDamageSeed {
  const seed: OsidDamageSeed = {};
  for (const osid of osids) {
    seed[osid] = {
      damage_score: 25,
      battles: 1,
      casualties_total: 10,
      flips: 0,
      displacement_spike_turns: [],
    };
  }
  return seed;
}

describe('OSID damage overlay coordinate validity', () => {
  it('skips invalid polygon coordinates at the builder boundary and warns once for the OSID', () => {
    const polygons: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        polygonFeature('op:test:bad_damage_coords', [
          [18, 44],
          [Number.NaN, 44],
          [18.1, 44.1],
          [18, 44],
        ]),
        polygonFeature('op:test:valid_damage_coords', [
          [18, 44],
          [18.1, 44],
          [18.1, 44.1],
          [18, 44],
        ]),
      ],
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = buildOsidDamageData(
      damageSeed(['op:test:bad_damage_coords', 'op:test:valid_damage_coords']),
      polygons,
    );

    expect(data.map((d) => d.osid)).toEqual(['op:test:valid_damage_coords']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[AWWV] Skipping osid-damage-overlay polygon with invalid coordinates: op:test:bad_damage_coords',
    );

    warn.mockRestore();
  });
});
