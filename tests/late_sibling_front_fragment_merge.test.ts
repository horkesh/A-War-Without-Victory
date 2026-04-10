import { describe, expect, it } from 'vitest';
import { mergeLateSiblingFrontFragments } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeSector(
  sectorId: string,
  edgeIds: string[],
  friendlyOsids: string[],
  enemyOsids: string[],
  territoryOsids: string[],
  assigned: string[],
): CorpsFrontSector {
  const subSegment: CorpsFrontSubSegment = {
    sub_segment_id: `subseg:${sectorId}`,
    edge_ids: edgeIds,
    friendly_osids: friendlyOsids,
    enemy_osids: enemyOsids,
    length_edges: edgeIds.length,
    primary_brigade_ids: assigned,
  };
  return {
    sector_id: sectorId,
    corps_id: 'vrs_2nd_krajina' as any,
    faction: 'RS' as any,
    opposing_factions: ['RBiH' as any],
    edge_ids: edgeIds,
    sub_segments: [subSegment],
    length_edges: edgeIds.length,
    territory_osids: territoryOsids,
    assigned_brigade_ids: assigned,
    reserve_brigade_ids: [],
    density: 0,
    threat_ratio: 0,
    defensive_power: 0,
    sector_stance: 'defend',
    stance_source: 'bot',
  };
}

describe('mergeLateSiblingFrontFragments', () => {
  it('re-merges a tiny sibling fragment left behind after front ownership canonicalization', () => {
    const sectors: Record<string, CorpsFrontSector> = {
      'sector:vrs_2nd_krajina:0': makeSector(
        'sector:vrs_2nd_krajina:0',
        [
          'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:donji_dubovik_2',
          'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:jasenica_2',
        ],
        ['op:bosanska_krupa:donji_dubovik_2', 'op:bosanska_krupa:jasenica_2'],
        ['op:bosanska_krupa:arapusa_2'],
        [
          'op:bosanska_krupa:donji_dubovik_2',
          'op:bosanska_krupa:ivanjska_2',
          'op:bosanska_krupa:jasenica_2',
          'op:bosanska_krupa:vranjska_2',
        ],
        ['rs_11th_krupa_light_infantry'],
      ),
      'sector:vrs_2nd_krajina:2': makeSector(
        'sector:vrs_2nd_krajina:2',
        [
          'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:ivanjska_2',
          'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:vranjska_2',
          'op:bosanska_krupa:ivanjska_2__op:bosanska_krupa:otoka_2',
          'op:bosanska_krupa:veliki_badic__op:bosanska_krupa:vranjska_2',
          'op:bosanska_krupa:gornja_suvaja__op:bosanska_krupa:veliki_badic',
        ],
        ['op:bosanska_krupa:gornja_suvaja', 'op:bosanska_krupa:ivanjska_2', 'op:bosanska_krupa:vranjska_2'],
        ['op:bosanska_krupa:arapusa_2', 'op:bosanska_krupa:otoka_2', 'op:bosanska_krupa:veliki_badic'],
        [
          'op:bosanska_krupa:gornja_suvaja',
          'op:bosanska_krupa:ivanjska_2',
          'op:bosanska_krupa:vranjska_2',
        ],
        ['rs_1st_drvar_light_infantry', 'rs_15th_biha_infantry'],
      ),
    };

    const adjacency = new Map<Osid, Osid[]>([
      ['op:bosanska_krupa:donji_dubovik_2' as Osid, ['op:bosanska_krupa:ivanjska_2' as Osid, 'op:bosanska_krupa:jasenica_2' as Osid]],
      ['op:bosanska_krupa:jasenica_2' as Osid, ['op:bosanska_krupa:donji_dubovik_2' as Osid, 'op:bosanska_krupa:vranjska_2' as Osid]],
      ['op:bosanska_krupa:ivanjska_2' as Osid, ['op:bosanska_krupa:donji_dubovik_2' as Osid, 'op:bosanska_krupa:vranjska_2' as Osid, 'op:bosanska_krupa:gornja_suvaja' as Osid]],
      ['op:bosanska_krupa:vranjska_2' as Osid, ['op:bosanska_krupa:ivanjska_2' as Osid, 'op:bosanska_krupa:jasenica_2' as Osid]],
      ['op:bosanska_krupa:gornja_suvaja' as Osid, ['op:bosanska_krupa:ivanjska_2' as Osid]],
    ]);
    const edgeMeta = new Map([
      ['op:bosanska_krupa:arapusa_2__op:bosanska_krupa:donji_dubovik_2', { a: 'op:bosanska_krupa:arapusa_2', b: 'op:bosanska_krupa:donji_dubovik_2', side_a: 'RBiH', side_b: 'RS' }],
      ['op:bosanska_krupa:arapusa_2__op:bosanska_krupa:jasenica_2', { a: 'op:bosanska_krupa:arapusa_2', b: 'op:bosanska_krupa:jasenica_2', side_a: 'RBiH', side_b: 'RS' }],
      ['op:bosanska_krupa:arapusa_2__op:bosanska_krupa:ivanjska_2', { a: 'op:bosanska_krupa:arapusa_2', b: 'op:bosanska_krupa:ivanjska_2', side_a: 'RBiH', side_b: 'RS' }],
      ['op:bosanska_krupa:arapusa_2__op:bosanska_krupa:vranjska_2', { a: 'op:bosanska_krupa:arapusa_2', b: 'op:bosanska_krupa:vranjska_2', side_a: 'RBiH', side_b: 'RS' }],
      ['op:bosanska_krupa:ivanjska_2__op:bosanska_krupa:otoka_2', { a: 'op:bosanska_krupa:ivanjska_2', b: 'op:bosanska_krupa:otoka_2', side_a: 'RS', side_b: 'RBiH' }],
      ['op:bosanska_krupa:veliki_badic__op:bosanska_krupa:vranjska_2', { a: 'op:bosanska_krupa:veliki_badic', b: 'op:bosanska_krupa:vranjska_2', side_a: 'RBiH', side_b: 'RS' }],
      ['op:bosanska_krupa:gornja_suvaja__op:bosanska_krupa:veliki_badic', { a: 'op:bosanska_krupa:gornja_suvaja', b: 'op:bosanska_krupa:veliki_badic', side_a: 'RS', side_b: 'RBiH' }],
    ]);

    mergeLateSiblingFrontFragments(sectors, adjacency, edgeMeta as any, adjacency);

    const remaining = Object.keys(sectors).sort();
    expect(remaining).toHaveLength(1);
    const merged = sectors[remaining[0]]!;
    expect(merged.edge_ids).toEqual([
      'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:donji_dubovik_2',
      'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:ivanjska_2',
      'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:jasenica_2',
      'op:bosanska_krupa:arapusa_2__op:bosanska_krupa:vranjska_2',
      'op:bosanska_krupa:gornja_suvaja__op:bosanska_krupa:veliki_badic',
      'op:bosanska_krupa:ivanjska_2__op:bosanska_krupa:otoka_2',
      'op:bosanska_krupa:veliki_badic__op:bosanska_krupa:vranjska_2',
    ]);
  });
});
