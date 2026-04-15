import { expect, it } from 'vitest';

import { buildOperationalWeightGeoJSON } from '../src/ui/map/map/builders/buildOperationalWeightGeoJSON.js';

it('buildOperationalWeightGeoJSON classifies frontline effort from sector assignment and tempo', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: { osid: 'op:gorazde:1' },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
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
            edge_ids: ['op:foe:1__op:gorazde:1'],
            sub_segment_count: 1,
            length_edges: 1,
            assigned_brigade_ids: ['b1', 'b2', 'b3'],
            reserve_brigade_ids: ['b4'],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            intel_confidence: 1,
            offensive_signs: true,
        },
    ];

    const frontEdges = [
        { edge_id: 'op:foe:1__op:gorazde:1', a: 'op:gorazde:1', b: 'op:foe:1', side_a: 'RBiH', side_b: 'RS' },
    ];

    const operations = [
        {
            corps_id: 'rbih_corps',
            corps_name: '1st Corps',
            faction: 'RBiH',
            name: 'Operation Drina',
            type: 'sector_attack',
            phase: 'execution',
            sector_id: 'rbih_sector',
            participating_brigade_count: 3,
            started_turn: 5,
            tempo: 'all_out',
        },
    ] as any;

    const result = buildOperationalWeightGeoJSON(geojson, sectors as any, frontEdges as any, operations);
    expect(result.features.length).toBe(1);
    expect(result.features[0]?.properties.effort_class).toBe('main');
    expect(result.features[0]?.properties.has_active_operation).toBe(true);
});
