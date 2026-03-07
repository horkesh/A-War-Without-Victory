import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCorpsFrontLinesGeoJSON } from '../src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.js';

test('buildCorpsFrontLinesGeoJSON carries average entrenchment onto front features', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { osid: 'op:gorazde:gorazde_2', controller: 'RBiH' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                },
            },
            {
                type: 'Feature',
                properties: { osid: 'op:foe:line_1', controller: 'RS' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]],
                },
            },
        ],
    } as any;

    const sectors = [
        {
            sector_id: 'rbih_sector',
            corps_id: 'rbih_corps',
            corps_name: '1st Corps',
            display_name: '1st Corps - Gorazde',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: ['op:foe:line_1__op:gorazde:gorazde_2'],
            sub_segment_count: 1,
            length_edges: 1,
            assigned_brigade_ids: ['b1'],
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            intel_confidence: 1,
            offensive_signs: false,
        },
    ];

    const front = buildCorpsFrontLinesGeoJSON(
        geojson,
        sectors,
        false,
        undefined,
        undefined,
        [{ edge_id: 'op:foe:line_1__op:gorazde:gorazde_2', a: 'op:gorazde:gorazde_2', b: 'op:foe:line_1', side_a: 'RBiH', side_b: 'RS' }],
        {
            b1: { entrenchment_turns: 4 },
        }
    );

    const frontFeature = front.features.find((feature) => (feature.properties as any).lineType === 'front');
    assert.ok(frontFeature);
    assert.equal((frontFeature!.properties as any).avg_entrenchment, 4);
});
