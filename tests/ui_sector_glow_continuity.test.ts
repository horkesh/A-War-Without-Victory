import { describe, expect, it } from 'vitest';
import type { Feature, LineString } from 'geojson';
import { mergeGlowSegments } from '../src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.js';

describe('sector glow continuity', () => {
  it('merges connected glow segments for the same selected sector trail', () => {
    const segments: Feature<LineString, any>[] = [
      {
        type: 'Feature',
        properties: {
          lineType: 'glow',
          faction: 'RS',
          corps_id: 'vrs_2nd_krajina',
          sector_id: 'sector:vrs_2nd_krajina:1',
          offset_side: 1,
          pressure_intensity: 0,
        },
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 0]],
        },
      },
      {
        type: 'Feature',
        properties: {
          lineType: 'glow',
          faction: 'RS',
          corps_id: 'vrs_2nd_krajina',
          sector_id: 'sector:vrs_2nd_krajina:1',
          offset_side: 1,
          pressure_intensity: 0,
        },
        geometry: {
          type: 'LineString',
          coordinates: [[1, 0], [2, 0]],
        },
      },
    ];

    const merged = mergeGlowSegments(segments, new Map(), new Map());

    expect(merged).toHaveLength(2);
    expect(merged[0]!.geometry.coordinates).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(merged[1]!.geometry.coordinates).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(merged.map(feature => feature.properties.offset_side).sort()).toEqual([-1, 1]);
  });
});
