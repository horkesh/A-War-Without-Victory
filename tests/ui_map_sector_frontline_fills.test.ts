import { describe, expect, it } from 'vitest';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { CorpsFrontSectorView, FormationView, FrontEdgeView } from '../src/ui/map/data/types.js';
import { buildDefenseStrengthGeoJSON } from '../src/ui/map/map/builders/buildDefenseStrengthGeoJSON.js';
import { buildDensityGeoJSON } from '../src/ui/map/map/builders/buildDensityGeoJSON.js';

const controlGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { osid: 'op:tuzla:front' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [18, 44],
          [18.1, 44],
          [18.1, 44.1],
          [18, 44.1],
          [18, 44],
        ]],
      },
    },
  ],
} satisfies FeatureCollection<Polygon | MultiPolygon>;

const frontEdges = [{
  edge_id: 'op:tuzla:front::op:doboj:front',
  a: 'op:tuzla:front',
  b: 'op:doboj:front',
  side_a: 'RBiH',
  side_b: 'RS',
}] satisfies FrontEdgeView[];

function makeSector(overrides: Partial<CorpsFrontSectorView>): CorpsFrontSectorView {
  return {
    sector_id: 'sector_rbih',
    corps_id: 'arbih_2nd_corps',
    corps_name: '2nd Corps',
    faction: 'RBiH',
    display_name: 'Tuzla Front',
    opposing_factions: ['RS'],
    edge_ids: ['op:tuzla:front::op:doboj:front'],
    sub_segment_count: 1,
    length_edges: 1,
    density: 1.5,
    threat_ratio: 0.9,
    assigned_brigade_ids: [],
    reserve_brigade_ids: [],
    defensive_power: 1,
    offensive_signs: false,
    intel_confidence: 0.7,
    combat_strength_class: 'adequate',
    ...overrides,
  };
}

const reserveFormation = {
  id: 'own_reserve',
  name: 'Reserve Brigade',
  faction: 'RBiH',
  kind: 'brigade',
  readiness: 'ready',
  cohesion: 80,
  fatigue: 0,
  status: 'active',
  createdTurn: 1,
  tags: [],
  location_osid: 'op:tuzla:rear',
  home_osid: 'op:tuzla:rear',
  personnel: 2000,
} satisfies FormationView;

const lineFormation = {
  ...reserveFormation,
  id: 'own_line',
  name: 'Line Brigade',
  location_osid: 'op:tuzla:rear',
  home_osid: 'op:tuzla:rear',
} satisfies FormationView;

describe('sector frontline map fills', () => {
  it('does not paint density for reserve-only sectors', () => {
    const density = buildDensityGeoJSON(
      controlGeoJson,
      [makeSector({ reserve_brigade_ids: ['own_reserve'] })],
      frontEdges,
      [reserveFormation],
    );

    expect(density.features).toHaveLength(0);
  });

  it('does not paint defense strength from reserve-only sectors', () => {
    const defense = buildDefenseStrengthGeoJSON(
      controlGeoJson,
      [makeSector({ reserve_brigade_ids: ['own_reserve'] })],
      frontEdges,
      [reserveFormation],
      { 'op:tuzla:front': 'RBiH', 'op:tuzla:rear': 'RBiH' },
      new Map([['op:tuzla:rear', ['op:tuzla:front']]]),
    );

    expect(defense.features).toHaveLength(0);
  });

  it('does not grant a defensive stance bonus when sector stance is unreported', () => {
    const missingStance = buildDefenseStrengthGeoJSON(
      controlGeoJson,
      [makeSector({ assigned_brigade_ids: ['own_line'] })],
      frontEdges,
      [lineFormation],
      { 'op:tuzla:front': 'RBiH', 'op:tuzla:rear': 'RBiH' },
      new Map([['op:tuzla:rear', ['op:tuzla:front']]]),
    );
    const defensiveStance = buildDefenseStrengthGeoJSON(
      controlGeoJson,
      [makeSector({ assigned_brigade_ids: ['own_line'], sector_stance: 'defend' })],
      frontEdges,
      [lineFormation],
      { 'op:tuzla:front': 'RBiH', 'op:tuzla:rear': 'RBiH' },
      new Map([['op:tuzla:rear', ['op:tuzla:front']]]),
    );

    const missingStrength = missingStance.features[0]?.properties?.defense_strength;
    const defensiveStrength = defensiveStance.features[0]?.properties?.defense_strength;

    expect(missingStrength).toBeGreaterThan(0);
    expect(defensiveStrength).toBeGreaterThan(missingStrength ?? 0);
  });
});
