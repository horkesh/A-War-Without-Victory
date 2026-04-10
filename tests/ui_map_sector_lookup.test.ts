import { describe, expect, it } from 'vitest';
import { buildOsidToSectorMap } from '../src/ui/map/utils/sectorUtils.js';

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
