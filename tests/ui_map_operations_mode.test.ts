import { describe, expect, it } from 'vitest';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import { buildOperationalWeightGeoJSON } from '../src/ui/map/map/builders/buildOperationalWeightGeoJSON.js';

function makeFieldedFormation(id: string, overrides: Record<string, unknown> = {}): LoadedGameState['formations'][number] {
    return {
        id,
        name: id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        readiness: 'ready',
        location_osid: 'op:gorazde:1',
        ...overrides,
    } as LoadedGameState['formations'][number];
}

describe('buildOperationalWeightGeoJSON', () => {
it('classifies frontline effort from live fielded sector assignment and tempo', () => {
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

    const formations = ['b1', 'b2', 'b3', 'b4'].map((id) => makeFieldedFormation(id));
    const result = buildOperationalWeightGeoJSON(geojson, sectors as any, frontEdges as any, operations, formations);
    expect(result.features.length).toBe(1);
    expect(result.features[0]?.properties.effort_class).toBe('main');
    expect(result.features[0]?.properties.has_active_operation).toBe(true);
});

it('does not paint effort from stale assigned roster ids', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: { osid: 'op:gorazde:1' },
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        }],
    } as any;
    const sectors = [{
        sector_id: 'rbih_sector',
        corps_id: 'rbih_corps',
        faction: 'RBiH',
        edge_ids: ['op:foe:1__op:gorazde:1'],
        assigned_brigade_ids: ['missing_brigade'],
        reserve_brigade_ids: [],
    }] as any;
    const frontEdges = [{ edge_id: 'op:foe:1__op:gorazde:1', a: 'op:gorazde:1', b: 'op:foe:1', side_a: 'RBiH', side_b: 'RS' }] as any;

    const result = buildOperationalWeightGeoJSON(geojson, sectors, frontEdges, undefined, []);

    expect(result.features).toHaveLength(0);
});

it('does not paint effort from forming or destroyed assigned formations', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: { osid: 'op:gorazde:1' },
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        }],
    } as any;
    const sectors = [{
        sector_id: 'rbih_sector',
        corps_id: 'rbih_corps',
        faction: 'RBiH',
        edge_ids: ['op:foe:1__op:gorazde:1'],
        assigned_brigade_ids: ['forming_bde', 'destroyed_bde'],
        reserve_brigade_ids: [],
    }] as any;
    const frontEdges = [{ edge_id: 'op:foe:1__op:gorazde:1', a: 'op:gorazde:1', b: 'op:foe:1', side_a: 'RBiH', side_b: 'RS' }] as any;
    const formations = [
        makeFieldedFormation('forming_bde', { readiness: 'forming' }),
        makeFieldedFormation('destroyed_bde', { status: 'destroyed', readiness: 'destroyed' }),
    ];

    const result = buildOperationalWeightGeoJSON(geojson, sectors, frontEdges, undefined, formations);

    expect(result.features).toHaveLength(0);
});

it('does not paint reserve-only sectors as operational effort', () => {
    const geojson = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: { osid: 'op:gorazde:1' },
            geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        }],
    } as any;
    const sectors = [{
        sector_id: 'rbih_sector',
        corps_id: 'rbih_corps',
        faction: 'RBiH',
        edge_ids: ['op:foe:1__op:gorazde:1'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: ['reserve_bde'],
    }] as any;
    const frontEdges = [{ edge_id: 'op:foe:1__op:gorazde:1', a: 'op:gorazde:1', b: 'op:foe:1', side_a: 'RBiH', side_b: 'RS' }] as any;

    const result = buildOperationalWeightGeoJSON(geojson, sectors, frontEdges, undefined, [makeFieldedFormation('reserve_bde')]);

    expect(result.features).toHaveLength(0);
});
});
