/**
 * Render-level smoke tests for the tactical map: critical layer builders and data paths
 * run without throwing and produce valid GeoJSON. Phase E Trust-and-Baseline.
 */
import { describe, it, expect } from 'vitest';
import { buildControlGeoJSON } from '../src/ui/map/map/builders/buildControlGeoJSON.js';
import { buildMajorCityLabelGeoJSON } from '../src/ui/map/map/builders/buildMajorCityLabelGeoJSON.js';
import { buildFogOfWarGeoJSON } from '../src/ui/map/map/builders/buildFogOfWarGeoJSON.js';
import { buildFormationsGeoJSON } from '../src/ui/map/map/builders/buildFormationsGeoJSON.js';
import { buildOperationArrowsGeoJSON } from '../src/ui/map/map/builders/buildOperationArrowsGeoJSON.js';
import { deriveUrbanTier } from '../src/ui/map/map/builders/urbanSettlementTiers.js';
import { generateThreatAssessment } from '../src/ui/map/components/army_hq/generateThreatAssessment.js';
import {
  getAssignedCommandLabel,
  getPlayerFacingCorpsName,
  getPlayerFacingSectorName,
  getPlayerVisibleFactions,
  getPlayerVisibleOperations,
} from '../src/ui/shared/playerFacingLabels.js';
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
    expect((first?.properties as { urban_tier?: string }).urban_tier).toBeUndefined();
  });

  it('deriveUrbanTier is deterministic for major list, population threshold, and rural default', () => {
    expect(deriveUrbanTier('centar_sarajevo', 0)).toBe('major');
    expect(deriveUrbanTier('unknown_mun', 5000)).toBe('urban');
    expect(deriveUrbanTier('unknown_mun', 4999)).toBe('rural');
  });

  it('buildMajorCityLabelGeoJSON picks highest pop per mun and stable mun ordering', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          properties: {
            osid: 'op:z',
            mun1990_id: 'zenica',
            mun1990_name: 'Zenica',
            population_total: 100,
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]] },
          properties: {
            osid: 'op:a',
            mun1990_id: 'zenica',
            mun1990_name: 'Zenica',
            population_total: 500,
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[4, 0], [5, 0], [5, 1], [4, 1], [4, 0]]] },
          properties: {
            osid: 'op:b',
            mun1990_id: 'banja_luka',
            mun1990_name: 'Banja Luka',
            population_total: 200,
          },
        },
      ],
    };
    const labels = buildMajorCityLabelGeoJSON(fc);
    expect(labels.features.length).toBe(2);
    expect(labels.features[0]?.properties?.mun1990_id).toBe('banja_luka');
    expect(labels.features[1]?.properties?.mun1990_id).toBe('zenica');
    const g = labels.features[1]?.geometry;
    expect(g?.type).toBe('Point');
    if (g?.type === 'Point') {
      // Ring includes closing duplicate vertex — centroid is mean of 5 points.
      expect(g.coordinates[0]).toBeCloseTo(2.4, 5);
      expect(g.coordinates[1]).toBeCloseTo(0.4, 5);
    }
  });

  it('buildMajorCityLabelGeoJSON breaks population ties by lexicographic osid', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
          properties: {
            osid: 'op:m',
            mun1990_id: 'tuzla',
            population_total: 1000,
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]] },
          properties: {
            osid: 'op:k',
            mun1990_id: 'tuzla',
            population_total: 1000,
          },
        },
      ],
    };
    const labels = buildMajorCityLabelGeoJSON(fc);
    expect(labels.features.length).toBe(1);
    const g0 = labels.features[0]?.geometry;
    expect(g0?.type).toBe('Point');
    if (g0?.type === 'Point') {
      expect(g0.coordinates[0]).toBeCloseTo(2.4, 5);
    }
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
  militiaPools: [],
  controlBySettlement: { 'op:sarajevo': 'RBiH', 'op:pale': 'RS' },
  statusBySettlement: {},
  brigadeAorByFormationId: { b1: ['op:sarajevo'] },
  attackOrders: [],
  aorOrders: [],
  recentControlEvents: [],
  allControlEvents: [],
  displacementEventLog: [],
  battlesByOsid: {},
  movementsByOsid: {},
  supplyTransitionsByOsid: {},
  historicalEventsByTurn: [],
  latestTurnSummary: null,
  turnSummaries: [],
  pressureWarning: false,
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
      ]
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

  it('generateThreatAssessment keeps player-facing language on friendly fronts', () => {
    const state = {
      formations: [
        { id: 'arbih_3rd_corps', name: '3rd Corps', faction: 'RBiH', kind: 'corps' },
        { id: 'vrs_1st_krajina', name: '1st Krajina Corps', faction: 'RS', kind: 'corps' },
      ],
      corpsFrontSectors: [
        { sector_id: 'sector:arbih_3rd:0', corps_id: 'arbih_3rd_corps', faction: 'RBiH' },
      ],
      operations: [
        {
          corps_id: 'vrs_1st_krajina',
          faction: 'RS',
          phase: 'execution',
          preparation_sub_phase: null,
          momentum: 2,
          name: 'op_vrs_secret_thunder',
          current_objective_index: 1,
          objectives: ['osid_a', 'osid_b'],
        },
        {
          corps_id: 'vrs_1st_krajina',
          faction: 'RS',
          phase: 'planning',
          preparation_sub_phase: 'force_staging',
          momentum: 0,
          name: 'op_vrs_followup',
          current_objective_index: 0,
          objectives: ['osid_c'],
        },
      ],
      sectorIntel: [
        {
          friendly_sector_id: 'sector:arbih_3rd:0',
          enemy_corps_id: 'vrs_1st_krajina',
          offensive_signs: true,
          strength_category: 'strong',
          confidence: 0.72,
        },
      ],
    } as LoadedGameState & {
      sectorIntel: Array<{
        friendly_sector_id: string;
        enemy_corps_id?: string;
        offensive_signs: boolean;
        strength_category?: string;
        confidence: number;
      }>;
    };

    const items = generateThreatAssessment(state, 'RBiH');
    const rendered = items.map((item) => `${item.title} ${item.detail}`).join(' || ');

    expect(rendered).toContain('3rd Corps front');
    expect(rendered).toContain('hostile offensive preparation');
    expect(rendered).toContain('hostile operation in execution');
    expect(rendered).not.toContain('vrs_1st_krajina');
    expect(rendered).not.toContain('1st Krajina Corps');
    expect(rendered).not.toContain('op_vrs_secret_thunder');
    expect(rendered).not.toContain('op_vrs_followup');
  });

  it('player-facing label helpers never fall back to raw ids', () => {
    const corpsNameById = new Map([
      ['arbih_3rd_corps', '3rd Corps'],
    ]);
    const sectors = [
      { sector_id: 'sector:arbih_3rd:0', display_name: 'Ozren Sector' },
    ];

    expect(getPlayerFacingCorpsName('arbih_3rd_corps', corpsNameById)).toBe('3rd Corps');
    expect(getPlayerFacingSectorName('sector:arbih_3rd:0', sectors)).toBe('Ozren Sector');
    expect(getAssignedCommandLabel('arbih_3rd_corps', corpsNameById)).toBe('3rd Corps');

    expect(getPlayerFacingCorpsName('arbih_5th_corps', new Map())).toBe('This corps');
    expect(getPlayerFacingSectorName('sector:arbih_5th:0', [])).toBe('Assigned sector');
    expect(getAssignedCommandLabel('arbih_5th_corps', new Map())).toBe('Assigned command');
  });

  it('player-facing operation filtering hides non-player factions from omniscient state', () => {
    const visible = getPlayerVisibleOperations(
      [
        { faction: 'RBiH', name: 'Own Op' },
        { faction: 'RS', name: 'Enemy Op' },
      ],
      'RBiH',
    );

    expect(visible).toEqual([{ faction: 'RBiH', name: 'Own Op' }]);
  });

  it('player-facing faction filtering hides non-player formations and sectors', () => {
    const formations = getPlayerVisibleFactions(
      [
        { faction: 'RBiH', id: 'arbih_3rd_corps' },
        { faction: 'RS', id: 'vrs_1st_krajina' },
      ],
      'RBiH',
    );
    const sectors = getPlayerVisibleFactions(
      [
        { faction: 'RBiH', sector_id: 's_1' },
        { faction: 'HRHB', sector_id: 's_2' },
      ],
      'RBiH',
    );

    expect(formations).toEqual([{ faction: 'RBiH', id: 'arbih_3rd_corps' }]);
    expect(sectors).toEqual([{ faction: 'RBiH', sector_id: 's_1' }]);
  });

  it('operation arrows ignore enemy operations in player mode', () => {
    const state = {
      player_faction: 'RBiH',
      operations: [
        { faction: 'RBiH', corps_id: 'arbih_3rd_corps', name: 'Own Op', objectives: ['osid_b'], staging_osid: 'osid_a' },
        { faction: 'RS', corps_id: 'vrs_1st_krajina', name: 'Enemy Op', objectives: ['osid_d'], staging_osid: 'osid_c' },
      ],
    } as LoadedGameState;

    const lookup = new Map<string, [number, number]>([
      ['osid_a', [18, 44]],
      ['osid_b', [18.2, 44.2]],
      ['osid_c', [19, 45]],
      ['osid_d', [19.2, 45.2]],
    ]);

    const geo = buildOperationArrowsGeoJSON(state, lookup);
    const names = geo.features.map((feature) => String((feature.properties as { op_name?: string }).op_name ?? ''));

    expect(names.some((name) => name.includes('Own Op'))).toBe(true);
    expect(names.some((name) => name.includes('Enemy Op'))).toBe(false);
  });
});
