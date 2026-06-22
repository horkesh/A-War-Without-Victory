import { describe, expect, it } from 'vitest';
import {
  buildOsidToSectorMap,
  buildSectorFormationAssignment,
  resolveCurrentSectorForFormation,
} from '../src/ui/map/utils/sectorUtils.js';

describe('buildOsidToSectorMap', () => {
  it('maps sector territory osids, not only frontline-friendly osids', () => {
    const map = buildOsidToSectorMap(
      [
        {
          sector_id: 'sector:rs:0',
          faction: 'RS',
          edge_ids: ['edge:a__b'],
          territory_osids: ['op:rear:inside', 'op:front:line'],
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
        },
      ],
      [
        {
          edge_id: 'edge:a__b',
          a: 'op:front:line',
          b: 'op:enemy:line',
          side_a: 'RS',
          side_b: 'RBiH',
        },
      ],
    );

    expect(map.get('op:rear:inside')).toBe('sector:rs:0');
    expect(map.get('op:front:line')).toBe('sector:rs:0');
  });
});

describe('current sector assignment projection', () => {
  const sectors = [
    {
      sector_id: 'sector_north',
      corps_id: 'corps_alpha',
      faction: 'RBiH',
      edge_ids: [],
      assigned_brigade_ids: ['brigade_alpha'],
      reserve_brigade_ids: ['brigade_reserve'],
    },
    {
      sector_id: 'sector_south',
      corps_id: 'corps_alpha',
      faction: 'RBiH',
      edge_ids: [],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
    },
  ];

  it('prefers a valid same-corps player override over stale roster membership', () => {
    const formation = {
      id: 'brigade_alpha',
      kind: 'brigade',
      faction: 'RBiH',
      corps_id: 'corps_alpha',
      sectorOverrideId: 'sector_south',
    };

    expect(resolveCurrentSectorForFormation(formation, sectors)?.sector_id).toBe('sector_south');
    expect(buildSectorFormationAssignment(sectors[0], [formation], sectors)).toEqual({
      frontlineIds: [],
      reserveIds: ['brigade_reserve'],
      overrideIds: [],
      allCurrentIds: ['brigade_reserve'],
    });
    expect(buildSectorFormationAssignment(sectors[1], [formation], sectors)).toEqual({
      frontlineIds: [],
      reserveIds: [],
      overrideIds: ['brigade_alpha'],
      allCurrentIds: ['brigade_alpha'],
    });
  });

  it('falls back to physical roster membership when an override is stale or cross-corps', () => {
    expect(resolveCurrentSectorForFormation({
      id: 'brigade_alpha',
      kind: 'brigade',
      faction: 'RBiH',
      corps_id: 'corps_alpha',
      sectorOverrideId: 'sector_missing',
    }, sectors)?.sector_id).toBe('sector_north');

    expect(resolveCurrentSectorForFormation({
      id: 'brigade_alpha',
      kind: 'brigade',
      faction: 'RBiH',
      corps_id: 'corps_other',
      sectorOverrideId: 'sector_south',
    }, sectors)?.sector_id).toBe('sector_north');
  });
});
