/**
 * Render-level smoke tests for the tactical map: critical layer builders and data paths
 * run without throwing and produce valid GeoJSON. Phase E Trust-and-Baseline.
 */
import { describe, it, expect } from 'vitest';
import { buildControlGeoJSON } from '../src/ui/map/map/builders/buildControlGeoJSON.js';
import { buildFogOfWarGeoJSON } from '../src/ui/map/map/builders/buildFogOfWarGeoJSON.js';
import { buildFormationsGeoJSON } from '../src/ui/map/map/builders/buildFormationsGeoJSON.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import type { FeatureCollection } from 'geojson';

describe('Tactical map render smoke', () => {
  const minimalBaseGeo: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[18, 44], [18.5, 44], [18.5, 44.5], [18, 44.5], [18, 44]]] },
        properties: { osid: 'op:sarajevo' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[19, 44], [19.5, 44], [19.5, 44.5], [19, 44.5], [19, 44]]] },
        properties: { osid: 'op:pale' },
      },
    ],
  };

  it('buildControlGeoJSON does not throw and returns FeatureCollection with controller property', () => {
    const control: Record<string, string | null> = { 'op:sarajevo': 'RBiH', 'op:pale': 'RS' };
    const result = buildControlGeoJSON(minimalBaseGeo, control);
    expect(result.type).toBe('FeatureCollection');
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features.length).toBe(2);
    const first = result.features[0];
    expect(first?.properties && 'controller' in first.properties).toBe(true);
    expect((first?.properties as { controller?: string }).controller).toBe('RBiH');
  });

  it('buildFogOfWarGeoJSON does not throw and returns obscured-feature collection', () => {
    const controllerByOsid: Record<string, string> = { 'op:rbih:front': 'RBiH', 'op:rbih:rear': 'RBiH' };
    const fog = buildFogOfWarGeoJSON(
      minimalBaseGeo,
      controllerByOsid,
      'RS',
      { visibleEnemyOsids: ['op:sarajevo'], visibleEnemySectorIds: [] }
    );
    expect(fog.type).toBe('FeatureCollection');
    expect(Array.isArray(fog.features)).toBe(true);
  });

  it('buildFormationsGeoJSON does not throw with minimal state and returns points', () => {
    const minimalState: LoadedGameState = {
      label: 'Turn 1',
      turn: 1,
      phase: 'war',
      formations: [
        {
          id: 'b1',
          faction: 'RBiH',
          name: '1st Brigade',
          kind: 'brigade',
          readiness: 'active',
          cohesion: 80,
          fatigue: 0,
          status: 'active',
          createdTurn: 1,
          tags: [],
          location_osid: 'op:sarajevo',
          personnel: 2000,
        },
      ],
      militiaPools: [],
      controlBySettlement: { 'op:sarajevo': 'RBiH', 'op:pale': 'RS' },
      statusBySettlement: {},
      brigadeAorByFormationId: { b1: ['op:sarajevo'] },
      attackOrders: [],
      aorOrders: [],
      recentControlEvents: [],
      latestTurnSummary: null,
    };
    const controlledGeo = buildControlGeoJSON(minimalBaseGeo, minimalState.controlBySettlement);
    const result = buildFormationsGeoJSON(minimalState, controlledGeo);
    expect(result.type).toBe('FeatureCollection');
    expect(Array.isArray(result.features)).toBe(true);
    if (result.features.length > 0) {
      expect(result.features[0]?.geometry?.type).toBe('Point');
      expect((result.features[0]?.properties as { location_osid?: string })?.location_osid).toBe('op:sarajevo');
    }
  });
});
