import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { FeatureCollection } from 'geojson';
import { buildFrontEdgesHoverGeoJSON } from '../src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.js';
import { findPlayerFacingSectorById } from '../src/ui/shared/playerVisibility.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

describe('front sector player visibility', () => {
  it('refuses enemy sectors when resolving the selected sector for player-facing shells', () => {
    const state = {
      player_faction: 'RBiH',
      corpsFrontSectors: [
        {
          sector_id: 'sector:rbih:0',
          corps_id: 'arbih_1st_corps',
          corps_name: '1st Corps',
          faction: 'RBiH',
          display_name: 'Friendly front',
          opposing_factions: ['RS'],
          edge_ids: ['edge:a__b'],
          sub_segment_count: 1,
          length_edges: 1,
          density: 1,
          threat_ratio: 1,
          defensive_power: 1,
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
          offensive_signs: false,
          intel_confidence: 0.5,
          combat_strength_class: 'adequate',
        },
        {
          sector_id: 'sector:rs:0',
          corps_id: 'vrs_drina',
          corps_name: 'Drina Corps',
          faction: 'RS',
          display_name: 'Enemy front',
          opposing_factions: ['RBiH'],
          edge_ids: ['edge:a__b'],
          sub_segment_count: 1,
          length_edges: 1,
          density: 1,
          threat_ratio: 1,
          defensive_power: 1,
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
          offensive_signs: false,
          intel_confidence: 0.5,
          combat_strength_class: 'adequate',
        },
      ],
    } as unknown as LoadedGameState;

    expect(findPlayerFacingSectorById(state, 'sector:rbih:0')?.sector_id).toBe('sector:rbih:0');
    expect(findPlayerFacingSectorById(state, 'sector:rs:0')).toBeNull();
  });

  it('removes enemy sector ids from front-edge payloads in player mode', () => {
    const controlled: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          properties: { osid: 'op:a', controller: 'RBiH' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
          },
          properties: { osid: 'op:b', controller: 'RS' },
        },
      ],
    };

    const geo = buildFrontEdgesHoverGeoJSON(
      controlled,
      [{ edge_id: 'edge:a__b', a: 'op:a', b: 'op:b', side_a: 'RBiH', side_b: 'RS' }],
      [
        {
          sector_id: 'sector:rbih:0',
          corps_id: 'arbih_1st_corps',
          corps_name: '1st Corps',
          faction: 'RBiH',
          display_name: 'Friendly front',
          opposing_factions: ['RS'],
          edge_ids: ['edge:a__b'],
          sub_segment_count: 1,
          length_edges: 1,
          density: 1,
          threat_ratio: 1,
          defensive_power: 1,
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
          offensive_signs: false,
          intel_confidence: 0.5,
          combat_strength_class: 'adequate',
        },
        {
          sector_id: 'sector:rs:0',
          corps_id: 'vrs_drina',
          corps_name: 'Drina Corps',
          faction: 'RS',
          display_name: 'Enemy front',
          opposing_factions: ['RBiH'],
          edge_ids: ['edge:a__b'],
          sub_segment_count: 1,
          length_edges: 1,
          density: 1,
          threat_ratio: 1,
          defensive_power: 1,
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
          offensive_signs: false,
          intel_confidence: 0.5,
          combat_strength_class: 'adequate',
        },
      ],
      undefined,
      'RBiH',
    );

    const friendlyFeature = geo.features.find((feature) => feature.properties?.faction === 'RBiH');
    const enemyFeature = geo.features.find((feature) => feature.properties?.faction === 'RS');

    expect(friendlyFeature?.properties?.sector_id).toBe('sector:rbih:0');
    expect(enemyFeature?.properties?.sector_id).toBeUndefined();
    expect(enemyFeature?.properties?.corps_id).toBeUndefined();
  });

  it('keeps map and panel code on the player-facing sector helper', () => {
    const mapSource = readFileSync(
      new URL('../src/ui/map/map/MapContainer.tsx', import.meta.url),
      'utf8',
    );
    const panelSource = readFileSync(
      new URL('../src/ui/map/components/CorpsFrontPanel.tsx', import.meta.url),
      'utf8',
    );

    expect(mapSource).toContain('findPlayerFacingSectorById');
    expect(panelSource).toContain('findPlayerFacingSectorById');
  });
});
