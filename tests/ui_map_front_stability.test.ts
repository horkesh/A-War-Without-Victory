import { describe, expect, it } from 'vitest';

import { buildFrontStabilityGeoJSON } from '../src/ui/map/map/builders/buildFrontStabilityGeoJSON';

describe('buildFrontStabilityGeoJSON', () => {
  it('classifies high-pressure front features as fluid', () => {
    const result = buildFrontStabilityGeoJSON({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { lineType: 'front', factionA: 'RBiH', factionB: 'RS', threat_intensity: 0.75 },
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        },
      ],
    } as any);

    expect(result.features[0].properties.stability_class).toBe('fluid');
    expect(result.features[0].properties.stability_score).toBeCloseTo(0.75, 6);
  });

  it('classifies entrenched low-pressure front features as static', () => {
    const result = buildFrontStabilityGeoJSON({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            lineType: 'front',
            factionA: 'RBiH',
            factionB: 'RS',
            threat_intensity: 0.1,
            avg_entrenchment: 4,
            brigade_count: 3,
          },
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        },
      ],
    } as any);

    expect(result.features[0].properties.stability_class).toBe('static');
    expect(result.features[0].properties.stability_score).toBeCloseTo(0.1, 6);
  });

  it('preserves non-front glow features and marks them as support lines', () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { lineType: 'glow', faction: 'RS' },
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        },
      ],
    } as any;

    const result = buildFrontStabilityGeoJSON(input);
    expect(result.features[0].properties.lineType).toBe('glow');
    expect(result.features[0].properties.stability_class).toBe('support');
    expect(result.features[0].geometry).toEqual(input.features[0].geometry);
  });

  it('does not treat missing threat intensity as low-threat static truth', () => {
    const result = buildFrontStabilityGeoJSON({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            lineType: 'front',
            factionA: 'RBiH',
            factionB: 'RS',
            avg_entrenchment: 4,
            brigade_count: 3,
          },
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        },
      ],
    } as any);

    expect(result.features[0].properties.stability_class).toBe('fluid');
    expect(result.features[0].properties.stability_score).toBeNull();
    expect(result.features[0].properties.threat_reported).toBe(false);
  });
});
