import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import { buildGhostPathsGeoJSON } from '../../src/ui/map/map/builders/buildGhostPathsGeoJSON.js';
import { buildOrderArrowsGeoJSON } from '../../src/ui/map/map/builders/buildOrderArrowsGeoJSON.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { StagedOrder } from '../../src/ui/map/store/gameStore.js';

function square(osid: string, x: number, y: number) {
  return {
    type: 'Feature' as const,
    properties: { osid },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ]],
    } satisfies Polygon,
  };
}

function makeControlledGeoJson(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      square('op:home:brigade', 0, 0),
      square('op:hq:anchor', 1, 0),
      square('op:aor:coverage', 2, 0),
      square('op:sector:far', 10, 0),
      square('op:sector:near', 3, 0),
      square('op:sector:front', 8, 0),
      square('op:enemy:target', 9, 0),
    ],
  };
}

function makeEqualDistanceGeoJson(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      square('op:home:brigade', 0, 0),
      square('op:sector:b', 2, 0),
      square('op:sector:a', 0, 2),
    ],
  };
}

function makeState(): LoadedGameState {
  return {
    label: 'Sector feedback test',
    turn: 1,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'rbih_test_brigade',
        faction: 'RBiH',
        name: 'Test Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 0,
        status: 'active',
        createdTurn: 0,
        tags: [],
        corps_id: 'rbih_1st_corps',
        location_osid: 'op:home:brigade',
      },
    ],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    activeOperations: [],
    corpsFrontSectors: [
      {
        sector_id: 'sector:central_line',
        corps_id: 'rbih_1st_corps',
        corps_name: '1st Corps',
        display_name: 'Central line',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: [],
        territory_osids: ['op:sector:far', 'op:sector:near'],
        sub_segment_count: 1,
        length_edges: 1,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 10,
        intel_confidence: 1,
        offensive_signs: false,
        sub_segments: [
          {
            sub_segment_id: 'segment:central',
            edge_ids: [],
            friendly_osids: ['op:sector:far', 'op:sector:near'],
            enemy_osids: [],
            length_edges: 1,
            primary_brigade_ids: [],
          },
        ],
      },
    ],
  } as LoadedGameState;
}

function makeEqualDistanceState(): LoadedGameState {
  const state = makeState();
  const sectors = state.corpsFrontSectors ?? [];
  state.corpsFrontSectors = sectors.map((sector) => ({
    ...sector,
    territory_osids: ['op:sector:b', 'op:sector:a'],
    sub_segments: (sector.sub_segments ?? []).map((segment) => ({
      ...segment,
      friendly_osids: ['op:sector:b', 'op:sector:a'],
    })),
  }));
  return state;
}

describe('sector staged order map feedback', () => {
  const stagedOrders: StagedOrder[] = [
    {
      id: 'sector_order',
      type: 'sector',
      formationId: 'rbih_test_brigade',
      targetSectorId: 'sector:central_line',
    },
  ];

  it('renders selected-sector ghost paths by resolving the sector id to a deterministic sector point', () => {
    const ghostPaths = buildGhostPathsGeoJSON(
      makeState(),
      stagedOrders,
      makeControlledGeoJson(),
      'rbih_test_brigade',
    );

    expect(ghostPaths.features).toHaveLength(1);
    expect(ghostPaths.features[0]?.properties).toMatchObject({
      type: 'ghost-path',
      formationId: 'rbih_test_brigade',
    });
    const coordinates = ghostPaths.features[0]?.geometry.coordinates ?? [];
    expect(coordinates.at(-1)).toEqual([3.5, 0.5]);
  });

  it('renders staged sector assignment arrows without leaking the sector id as an OSID target', () => {
    const arrows = buildOrderArrowsGeoJSON(makeState(), stagedOrders, makeControlledGeoJson());
    const movementArrow = arrows.features.find((feature) => feature.properties?.type === 'movement-staged');

    expect(movementArrow?.properties).toMatchObject({
      brigadeId: 'rbih_test_brigade',
      source_osid: 'op:home:brigade',
      target_osid: 'op:sector:near',
    });
    expect(movementArrow?.properties?.target_osid).not.toBe('sector:central_line');
  });

  it('breaks equal-distance sector target ties with stable bytewise OSID order', () => {
    const arrows = buildOrderArrowsGeoJSON(
      makeEqualDistanceState(),
      stagedOrders,
      makeEqualDistanceGeoJson(),
    );
    const movementArrow = arrows.features.find((feature) => feature.properties?.type === 'movement-staged');

    expect(movementArrow?.properties?.target_osid).toBe('op:sector:a');
  });

  it('does not render staged arrows or ghost paths from AoR/HQ-only anchors', () => {
    const state = makeState();
    state.formations = state.formations.map((formation) => ({
      ...formation,
      location_osid: undefined,
      hq_osid: 'op:hq:anchor',
      aorSettlementIds: ['op:aor:coverage'],
    }));

    const arrows = buildOrderArrowsGeoJSON(state, stagedOrders, makeControlledGeoJson());
    const ghostPaths = buildGhostPathsGeoJSON(
      state,
      stagedOrders,
      makeControlledGeoJson(),
      'rbih_test_brigade',
    );

    expect(arrows.features.some((feature) => feature.properties?.type === 'movement-staged')).toBe(false);
    expect(ghostPaths.features).toHaveLength(0);
  });

  it('keeps reserve-only order arrows anchored to physical brigade location', () => {
    const state = makeState();
    state.corpsFrontSectors = (state.corpsFrontSectors ?? []).map((sector) => ({
      ...sector,
      edge_ids: ['edge:front-target'],
      assigned_brigade_ids: [],
      reserve_brigade_ids: ['rbih_test_brigade'],
    }));
    state.frontEdgesOsid = [{
      edge_id: 'edge:front-target',
      a: 'op:sector:front',
      b: 'op:enemy:target',
      side_a: 'RBiH',
      side_b: 'RS',
    }];
    state.attackOrders = [{
      brigadeId: 'rbih_test_brigade',
      targetSettlementId: 'op:enemy:target',
    }];

    const arrows = buildOrderArrowsGeoJSON(state, [], makeControlledGeoJson());
    const originDot = arrows.features.find((feature) => feature.properties?.type === 'origin-dot');

    expect(originDot?.geometry.type).toBe('Point');
    if (originDot?.geometry.type !== 'Point') throw new Error('Expected reserve order origin dot');
    expect(originDot.geometry.coordinates).toEqual([0.5, 0.5]);
  });
});
