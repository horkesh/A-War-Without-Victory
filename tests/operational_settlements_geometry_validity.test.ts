import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { validateOperationalSettlementsGeometry } from '../src/map/operational_settlements_geometry_validator';

const GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const hasFixture = existsSync(GEO_PATH);

type OperationalCollection = FeatureCollection<Polygon | MultiPolygon, { osid: string }>;

describe('operational settlements geometry validity', () => {
  it('detects degenerate MultiPolygon parts', () => {
    const fixture: OperationalCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { osid: 'op:test:degenerate_multipart' },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [[
                [18, 44],
                [18.1, 44],
                [18.1, 44.1],
                [18, 44.1],
                [18, 44],
              ]],
              [[
                [19, 45],
                [19, 45],
                [19, 45],
                [19, 45],
              ]],
            ],
          },
        },
      ],
    };

    const report = validateOperationalSettlementsGeometry(fixture);

    expect(report.invalidRings).toEqual([
      expect.objectContaining({
        osid: 'op:test:degenerate_multipart',
        geometryType: 'MultiPolygon',
        polygonIndex: 1,
        ringIndex: 0,
        reason: 'lt3_unique_coords',
      }),
    ]);
  });

  it.skipIf(!hasFixture)('committed operational settlements artifact has no degenerate polygon parts', () => {
    const geo = JSON.parse(readFileSync(GEO_PATH, 'utf8')) as OperationalCollection;
    const report = validateOperationalSettlementsGeometry(geo);

    expect(report.invalidRings).toEqual([]);
  });
});
