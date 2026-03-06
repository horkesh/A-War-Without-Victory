import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import { buildFormationsGeoJSON } from '../src/ui/map/map/builders/buildFormationsGeoJSON.js';
import { buildOrderArrowsGeoJSON } from '../src/ui/map/map/builders/buildOrderArrowsGeoJSON.js';

function buildBaseState(playerFaction: string | null): LoadedGameState {
  return {
    label: 'test',
    turn: 1,
    phase: 'war',
    formations: [
      {
        id: 'f_rs',
        faction: 'RS',
        name: 'RS Brigade',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 70,
        fatigue: 10,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:rs',
      },
      {
        id: 'f_rbih',
        faction: 'RBiH',
        name: 'RBiH Brigade',
        kind: 'brigade',
        readiness: 'active',
        cohesion: 70,
        fatigue: 10,
        status: 'active',
        createdTurn: 1,
        tags: [],
        location_osid: 'op:rbih',
      },
    ],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [
      { brigadeId: 'f_rs', targetSettlementId: 'op:rbih' },
      { brigadeId: 'f_rbih', targetSettlementId: 'op:rs' },
    ],
    aorOrders: [],
    recentControlEvents: [],
    movementOrdersSettlement: [
      { brigadeId: 'f_rs', targetSettlementIds: ['op:rbih'] },
      { brigadeId: 'f_rbih', targetSettlementIds: ['op:rs'] },
    ],
    player_faction: playerFaction,
  };
}

function buildControlGeoJson(): FeatureCollection<Polygon, { osid: string }> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[17, 43], [17.1, 43], [17.1, 43.1], [17, 43.1], [17, 43]]],
        },
        properties: { osid: 'op:rs' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[18, 43], [18.1, 43], [18.1, 43.1], [18, 43.1], [18, 43]]],
        },
        properties: { osid: 'op:rbih' },
      },
    ],
  };
}

describe('formation fog-of-war filtering', () => {
  it('shows only player faction formations when player_faction is set', () => {
    const state = buildBaseState('RS');
    const geo = buildFormationsGeoJSON(state, buildControlGeoJson(), state.player_faction);
    expect(geo.features.map((f) => f.properties.id)).toEqual(['f_rs']);
  });

  it('shows all formations when player_faction is absent', () => {
    const state = buildBaseState(null);
    const geo = buildFormationsGeoJSON(state, buildControlGeoJson(), state.player_faction);
    expect(geo.features.map((f) => f.properties.id)).toEqual(['f_rbih', 'f_rs']);
  });

  it('filters order arrows to player faction when player_faction is set', () => {
    const state = buildBaseState('RS');
    const arrows = buildOrderArrowsGeoJSON(state, buildControlGeoJson(), state.player_faction);
    expect(arrows.features.map((f) => f.properties.brigadeId)).toEqual(['f_rs', 'f_rs']);
  });
});
