import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';

import { buildBattleMarkersGeoJSON } from '../src/ui/map/map/builders/buildBattleMarkersGeoJSON.js';
import { buildCasualtiesGeoJSON } from '../src/ui/map/map/builders/buildCasualtiesGeoJSON.js';
import type { RecentControlEventView, FormationView } from '../src/ui/map/data/types.js';
import type { TurnBattle } from '../src/state/turn_summary.js';

function baseGeoJson(): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { osid: 'op:test:a' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ]],
        },
      },
      {
        type: 'Feature',
        properties: { osid: 'op:test:b' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [2, 0],
            [3, 0],
            [3, 1],
            [2, 1],
            [2, 0],
          ]],
        },
      },
    ],
  };
}

function battle(osid: string): TurnBattle {
  return {
    osid,
    attacker_faction: 'RBiH',
    defender_faction: 'RS',
    primary_attacker_id: 'brig_a',
    primary_defender_id: 'brig_b',
    all_attacker_ids: ['brig_a'],
    outcome: 'decisive_victory',
    attacker_casualties: 10,
    defender_casualties: 20,
    territory_flipped: false,
    was_concentrated: false,
  };
}

describe('map battle and casualty truth gates', () => {
  it('does not render turn-zero or future battle markers', () => {
    const events: RecentControlEventView[] = [
      { settlementId: 'op:test:a', from: 'RS', to: 'RBiH', turn: 0, mechanism: 'combat', municipalityId: 'test' },
      { settlementId: 'op:test:b', from: 'RS', to: 'RBiH', turn: 2, mechanism: 'combat', municipalityId: 'test' },
    ];

    const turnZero = buildBattleMarkersGeoJSON(events, baseGeoJson(), 0, [battle('op:test:a')]);
    const turnOne = buildBattleMarkersGeoJSON(events, baseGeoJson(), 1);

    expect(turnZero.features).toHaveLength(0);
    expect(turnOne.features).toHaveLength(0);
  });

  it('only enriches battle markers with current-turn battles', () => {
    const markers = buildBattleMarkersGeoJSON([], baseGeoJson(), 5, [
      battle('op:test:a'),
    ], 4);

    expect(markers.features).toHaveLength(0);
  });

  it('does not render turn-zero or future casualty overlays', () => {
    const formations: FormationView[] = [
      {
        id: 'brig_a',
        name: 'A Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 70,
        fatigue: 10,
        status: 'active',
        createdTurn: 0,
        tags: [],
        recent_engagements: [
          { turn: 0, osid: 'op:test:a', role: 'attacker', outcome: 'stalemate', casualties_taken: 100, territory_flipped: false },
          { turn: 7, osid: 'op:test:b', role: 'defender', outcome: 'retreat', casualties_taken: 100, territory_flipped: false },
        ],
      },
    ];

    const overlay = buildCasualtiesGeoJSON(baseGeoJson(), formations, 5);

    expect(overlay.features).toHaveLength(0);
  });
});
