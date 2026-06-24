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
      reserveIds: [],
      rearIds: [],
      overrideIds: [],
      lineHoldingIds: [],
      allCurrentIds: [],
      unresolvedRosterIds: ['brigade_reserve'],
    });
    expect(buildSectorFormationAssignment(sectors[1], [formation], sectors)).toEqual({
      frontlineIds: [],
      reserveIds: [],
      rearIds: [],
      overrideIds: ['brigade_alpha'],
      lineHoldingIds: ['brigade_alpha'],
      allCurrentIds: ['brigade_alpha'],
      unresolvedRosterIds: [],
    });
  });

  it('resolves rear/support sector ownership without inflating current line coverage', () => {
    const rearSector = {
      sector_id: 'sector_rear',
      corps_id: 'corps_alpha',
      faction: 'RBiH',
      edge_ids: [],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      rear_brigade_ids: ['rear_brigade', 'forming_rear_brigade'],
    };
    const formations = [
      {
        id: 'rear_brigade',
        kind: 'brigade',
        faction: 'RBiH',
        corps_id: 'corps_alpha',
        status: 'active',
        readiness: 'ready',
      },
      {
        id: 'forming_rear_brigade',
        kind: 'brigade',
        faction: 'RBiH',
        corps_id: 'corps_alpha',
        status: 'active',
        readiness: 'forming',
      },
    ];

    expect(resolveCurrentSectorForFormation(formations[0], [rearSector])?.sector_id).toBe('sector_rear');
    expect(buildSectorFormationAssignment(rearSector, formations, [rearSector])).toEqual({
      frontlineIds: [],
      reserveIds: [],
      rearIds: ['rear_brigade'],
      overrideIds: [],
      lineHoldingIds: [],
      allCurrentIds: [],
      unresolvedRosterIds: [],
    });
  });

  it('reports stale roster ids without counting them as live sector strength', () => {
    const sector = {
      sector_id: 'sector_with_stale_rows',
      corps_id: 'corps_alpha',
      faction: 'RBiH',
      edge_ids: [],
      assigned_brigade_ids: ['missing_front_brigade'],
      reserve_brigade_ids: ['missing_reserve_brigade'],
      rear_brigade_ids: ['missing_rear_brigade'],
    };

    expect(buildSectorFormationAssignment(sector, [], [sector])).toEqual({
      frontlineIds: [],
      reserveIds: [],
      rearIds: [],
      overrideIds: [],
      lineHoldingIds: [],
      allCurrentIds: [],
      unresolvedRosterIds: ['missing_front_brigade', 'missing_rear_brigade', 'missing_reserve_brigade'],
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
