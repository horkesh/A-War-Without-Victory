import { describe, expect, it, vi } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import type { FormationView } from '../../src/ui/map/data/types';
import { buildForceQualityData } from '../../src/ui/map/layers/buildForceQualityOverlay';

function polygonFeature(osid: string, ring: number[][]): FeatureCollection['features'][number] {
  const geometry: Polygon = { type: 'Polygon', coordinates: [ring] };
  return {
    type: 'Feature',
    properties: { osid },
    geometry,
  };
}

function brigade(id: string, osid: string): FormationView {
  return {
    id,
    faction: 'RBiH',
    name: id,
    kind: 'brigade',
    readiness: 'ready',
    cohesion: 70,
    fatigue: 0,
    status: 'active',
    createdTurn: 0,
    tags: [],
    location_osid: osid,
    officer_quality: 0.55,
  };
}

describe('force-quality overlay coordinate validity', () => {
  it('skips invalid polygon coordinates at the builder boundary and warns once for the OSID', () => {
    const polygons: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        polygonFeature('op:test:bad_force_coords', [
          [18, 44],
          [18.1, 91],
          [18.1, 44.1],
          [18, 44],
        ]),
        polygonFeature('op:test:degenerate_force_coords', [
          [18.2, 44.2],
          [18.2, 44.2],
          [18.2, 44.2],
        ]),
        polygonFeature('op:test:valid_force_coords', [
          [18, 44],
          [18.1, 44],
          [18.1, 44.1],
          [18, 44],
        ]),
      ],
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = buildForceQualityData(
      [
        brigade('b_bad_force_coords', 'op:test:bad_force_coords'),
        brigade('b_degenerate_force_coords', 'op:test:degenerate_force_coords'),
        brigade('b_valid_force_coords', 'op:test:valid_force_coords'),
      ],
      polygons,
    );

    expect(data.map((d) => d.osid)).toEqual(['op:test:valid_force_coords']);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      '[AWWV] Skipping force-quality-glow-overlay polygon with invalid coordinates: op:test:bad_force_coords',
    );
    expect(warn).toHaveBeenCalledWith(
      '[AWWV] Skipping force-quality-glow-overlay polygon with invalid coordinates: op:test:degenerate_force_coords',
    );

    warn.mockRestore();
  });
});
