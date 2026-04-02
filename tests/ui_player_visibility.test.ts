import { describe, expect, it } from 'vitest';
import type { LoadedGameState, OperationView } from '../src/ui/map/data/types.js';
import {
  filterPlayerFacingFormations,
  filterPlayerFacingOperations,
  filterPlayerFacingSectors,
  getPlayerFacingFaction,
  filterPlayerVisibleMapFormations,
} from '../src/ui/shared/playerVisibility.js';
import { buildOperationArrowsGeoJSON } from '../src/ui/map/map/builders/buildOperationArrowsGeoJSON.js';
import { buildFormationsGeoJSON } from '../src/ui/map/map/builders/buildFormationsGeoJSON.js';

describe('player visibility helpers', () => {
  it('normalizes player faction and rejects unknown values', () => {
    expect(getPlayerFacingFaction({ player_faction: 'RBiH' } as LoadedGameState)).toBe('RBiH');
    expect(getPlayerFacingFaction({ player_faction: 'RS' } as LoadedGameState)).toBe('RS');
    expect(getPlayerFacingFaction({ player_faction: 'HRHB' } as LoadedGameState)).toBe('HRHB');
    expect(getPlayerFacingFaction({ player_faction: 'UNPROFOR' } as LoadedGameState)).toBeNull();
    expect(getPlayerFacingFaction({} as LoadedGameState)).toBeNull();
  });

  it('filters formations, sectors, and operations to the player faction only', () => {
    const state = {
      player_faction: 'RBiH',
      formations: [
        { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
        { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', kind: 'corps', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [] },
      ],
      corpsFrontSectors: [
        { sector_id: 's_1', corps_id: 'arbih_3rd_corps', faction: 'RBiH', display_name: 'Tuzla Front', edge_ids: [], length_edges: 2, density: 1, threat_ratio: 1, territory_osids: [], assigned_brigade_ids: [], reserve_brigade_ids: [], offensive_signs: false, intel_confidence: 0.5, combat_strength_class: 'adequate' },
        { sector_id: 's_2', corps_id: 'vrs_1st_krajina', faction: 'RS', display_name: 'Doboj Front', edge_ids: [], length_edges: 2, density: 1, threat_ratio: 1, territory_osids: [], assigned_brigade_ids: [], reserve_brigade_ids: [], offensive_signs: false, intel_confidence: 0.5, combat_strength_class: 'adequate' },
      ],
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, current_objective_index: 0, objectives: ['osid_a'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
    } as unknown as LoadedGameState;

    expect(filterPlayerFacingFormations(state).map((f) => f.id)).toEqual(['arbih_3rd_corps']);
    expect(filterPlayerFacingSectors(state).map((s) => s.sector_id)).toEqual(['s_1']);
    expect(filterPlayerFacingOperations(state).map((o) => o.name)).toEqual(['Op Tuzla']);
  });

  it('operation arrows are built only for player-facing operations', () => {
    const state = {
      player_faction: 'RBiH',
      operations: [
        { corps_id: 'arbih_3rd_corps', corps_name: '3rd Corps', faction: 'RBiH', name: 'Op Tuzla', type: 'sector_attack', phase: 'planning', started_turn: 1, staging_osid: 'osid_a', current_objective_index: 0, objectives: ['osid_b'], participating_brigade_count: 1 },
        { corps_id: 'vrs_1st_krajina', corps_name: '1st Krajina Corps', faction: 'RS', name: 'Op Doboj', type: 'sector_attack', phase: 'execution', started_turn: 1, staging_osid: 'osid_c', current_objective_index: 0, objectives: ['osid_d'], participating_brigade_count: 1 },
      ] satisfies OperationView[],
    } as unknown as LoadedGameState;

    const lookup = new Map<string, [number, number]>([
      ['osid_a', [18, 44]],
      ['osid_b', [18.2, 44.2]],
      ['osid_c', [19, 45]],
      ['osid_d', [19.2, 45.2]],
    ]);

    const geo = buildOperationArrowsGeoJSON(state, lookup);
    const names = geo.features.map((feature) => String((feature.properties as { op_name?: string }).op_name));

    expect(names.some((name) => name.includes('Op Tuzla'))).toBe(true);
    expect(names.some((name) => name.includes('Op Doboj'))).toBe(false);
  });

  it('keeps all own formations plus only fog-visible enemy formations on the map', () => {
    const state = {
      player_faction: 'RBiH',
      fogOfWar: {
        visibleEnemyOsids: ['osid_enemy_visible'],
        visibleEnemySectorIds: [],
      },
      formations: [
        { id: 'own_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_own' },
        { id: 'enemy_seen', faction: 'RS', name: 'Seen Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_enemy_visible' },
        { id: 'enemy_hidden', faction: 'RS', name: 'Hidden Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'osid_enemy_hidden' },
      ],
    } as unknown as LoadedGameState;

    expect(filterPlayerVisibleMapFormations(state).map((f) => f.id)).toEqual(['own_1', 'enemy_seen']);
  });

  it('formation geojson excludes enemy formations outside fog visibility', () => {
    const state = {
      player_faction: 'RBiH',
      fogOfWar: {
        visibleEnemyOsids: ['op:enemy_seen'],
        visibleEnemySectorIds: [],
      },
      controlBySettlement: {
        'op:own': 'RBiH',
        'op:enemy_seen': 'RS',
        'op:enemy_hidden': 'RS',
      },
      formations: [
        { id: 'own_1', faction: 'RBiH', name: 'Own Brigade', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:own', personnel: 1200 },
        { id: 'enemy_seen', faction: 'RS', name: 'Seen Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:enemy_seen', personnel: 1100 },
        { id: 'enemy_hidden', faction: 'RS', name: 'Hidden Enemy', kind: 'brigade', readiness: 'active', cohesion: 80, fatigue: 0, status: 'active', createdTurn: 1, tags: [], location_osid: 'op:enemy_hidden', personnel: 1000 },
      ],
    } as unknown as LoadedGameState;

    const baseGeo = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[18, 44], [18.4, 44], [18.4, 44.4], [18, 44.4], [18, 44]]] }, properties: { osid: 'op:own' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[19, 44], [19.4, 44], [19.4, 44.4], [19, 44.4], [19, 44]]] }, properties: { osid: 'op:enemy_seen' } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[20, 44], [20.4, 44], [20.4, 44.4], [20, 44.4], [20, 44]]] }, properties: { osid: 'op:enemy_hidden' } },
      ],
    } as const;

    const geo = buildFormationsGeoJSON(state, baseGeo as any);
    expect(geo.features.map((feature) => feature.properties.id)).toEqual(['enemy_seen', 'own_1']);
  });
});
