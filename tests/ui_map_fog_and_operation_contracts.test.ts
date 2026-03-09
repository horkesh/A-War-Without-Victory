import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildFogOfWarGeoJSON } from '../src/ui/map/map/builders/buildFogOfWarGeoJSON.js';

test('parseGameState derives fog-of-war visibility from sector_intel', () => {
    const parsed = parseGameState({
  meta: { turn: 12, phase: 'war', player_faction: 'RS' },
  military: {
    formations: {
            rs_corps: { id: 'rs_corps', faction: 'RS', name: 'RS Corps', kind: 'corps', tags: [] },
            rs_b1: { id: 'rs_b1', faction: 'RS', corps_id: 'rs_corps', name: 'RS Brigade', kind: 'brigade', location_osid: 'op:rs:front', tags: [] },
            rbih_b1: { id: 'rbih_b1', faction: 'RBiH', corps_id: 'rbih_corps', name: 'RBiH Brigade', kind: 'brigade', location_osid: 'op:rbih:deep', tags: [] },
        },
    corps_front_sectors: {
            rs_sector: {
                sector_id: 'rs_sector',
                corps_id: 'rs_corps',
                faction: 'RS',
                opposing_factions: ['RBiH'],
                edge_ids: ['e1'],
                sub_segments: [{ friendly_osids: ['op:rs:front'], enemy_osids: ['op:rbih:frontline'] }],
                assigned_brigade_ids: ['rs_b1'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
            },
            rbih_sector: {
                sector_id: 'rbih_sector',
                corps_id: 'rbih_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['e1'],
                sub_segments: [{ friendly_osids: ['op:rbih:frontline'], enemy_osids: ['op:rs:front'] }],
                assigned_brigade_ids: ['rbih_b1'],
                reserve_brigade_ids: [],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1,
            }
        },
    sector_intel: {
            rs_sector: [
                {
                    enemy_sector_id: 'rbih_sector',
                    enemy_faction: 'RBiH',
                    enemy_corps_id: 'rbih_corps',
                    front_edge_count: 1,
                    strength_category: 'moderate',
                    posture_observed: 'defensive',
                    offensive_signs: false,
                    confidence: 1,
                    turns_in_contact: 2,
                    visible_brigade_ids: ['rbih_b1'],
                    last_updated_turn: 12,
                }
            ]
        }
  } as any,
  political: {
    political_controllers: {
            'op:rs:front': 'RS',
            'op:rbih:frontline': 'RBiH',
            'op:rbih:deep': 'RBiH',
        }
  } as any,
});

    assert.ok(parsed.fogOfWar);
    assert.deepEqual(parsed.fogOfWar?.visibleEnemyOsids, ['op:rbih:deep', 'op:rbih:frontline']);
    assert.deepEqual(parsed.fogOfWar?.visibleEnemySectorIds, ['rbih_sector']);
  });

test('fog builder uses sector-intel-derived visible enemy osids', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
                properties: { osid: 'op:rbih:frontline' }
            },
            {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [[[2, 0], [3, 0], [3, 1], [2, 0]]] },
                properties: { osid: 'op:rbih:rear' }
            }
        ]
    } as any;

    const fog = buildFogOfWarGeoJSON(
        geojson,
        {
            'op:rbih:frontline': 'RBiH',
            'op:rbih:rear': 'RBiH'
        },
        'RS',
        {
            visibleEnemyOsids: ['op:rbih:frontline'],
            visibleEnemySectorIds: ['rbih_sector']
        }
    );

    assert.equal(fog.features.length, 1);
    assert.equal((fog.features[0]!.properties as any).osid, 'op:rbih:rear');
});
