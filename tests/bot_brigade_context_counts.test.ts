import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import {
  buildActiveFormationLocationsByFaction,
  buildCorpsBrigadeCountsByOsid,
  countCorpsBrigadesAtOsid,
  getCorpsBrigadeCountAtOsid,
  hasActiveFormationAtOsid,
} from '../src/sim/combat/bot_brigade_context.js';

describe('bot brigade corps OSID count cache', () => {
  it('matches countCorpsBrigadesAtOsid for corps and all-faction fallback counts', () => {
    const state = {
      military: {
        formations: {
          rbih_brigade_a: {
            id: 'rbih_brigade_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'brigade',
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:test:a',
          },
          rbih_og_a: {
            id: 'rbih_og_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'og',
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:test:a',
          },
          rbih_other_corps_a: {
            id: 'rbih_other_corps_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'operational_group',
            corps_id: 'arbih_2nd_corps',
            location_osid: 'op:test:a',
          },
          rbih_no_corps_b: {
            id: 'rbih_no_corps_b',
            faction: 'RBiH',
            status: 'active',
            kind: 'brigade',
            location_osid: 'op:test:b',
          },
          rbih_militia_a: {
            id: 'rbih_militia_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'militia',
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:test:a',
          },
          rbih_destroyed_a: {
            id: 'rbih_destroyed_a',
            faction: 'RBiH',
            status: 'destroyed',
            kind: 'brigade',
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:test:a',
          },
          rs_brigade_a: {
            id: 'rs_brigade_a',
            faction: 'RS',
            status: 'active',
            kind: 'brigade',
            corps_id: 'vrs_drina',
            location_osid: 'op:test:a',
          },
        },
      },
    } as unknown as GameState;

    const counts = buildCorpsBrigadeCountsByOsid(state, 'RBiH');

    expect(getCorpsBrigadeCountAtOsid(counts, 'arbih_1st_corps', 'op:test:a' as Osid))
      .toBe(countCorpsBrigadesAtOsid(state, 'RBiH', 'arbih_1st_corps', 'op:test:a' as Osid));
    expect(getCorpsBrigadeCountAtOsid(counts, 'arbih_2nd_corps', 'op:test:a' as Osid))
      .toBe(countCorpsBrigadesAtOsid(state, 'RBiH', 'arbih_2nd_corps', 'op:test:a' as Osid));
    expect(getCorpsBrigadeCountAtOsid(counts, null, 'op:test:a' as Osid))
      .toBe(countCorpsBrigadesAtOsid(state, 'RBiH', null, 'op:test:a' as Osid));
    expect(getCorpsBrigadeCountAtOsid(counts, null, 'op:test:b' as Osid))
      .toBe(countCorpsBrigadesAtOsid(state, 'RBiH', null, 'op:test:b' as Osid));
    expect(getCorpsBrigadeCountAtOsid(counts, 'arbih_1st_corps', 'op:test:missing' as Osid)).toBe(0);
  });
});

describe('bot brigade active formation location index', () => {
  it('matches active controller-faction formation presence by OSID', () => {
    const state = {
      military: {
        formations: {
          rbih_brigade_a: {
            id: 'rbih_brigade_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'brigade',
            location_osid: 'op:test:a',
          },
          rbih_hq_a: {
            id: 'rbih_hq_a',
            faction: 'RBiH',
            status: 'active',
            kind: 'corps_asset',
            location_osid: 'op:test:a',
          },
          rbih_destroyed_b: {
            id: 'rbih_destroyed_b',
            faction: 'RBiH',
            status: 'destroyed',
            kind: 'brigade',
            location_osid: 'op:test:b',
          },
          rbih_no_location: {
            id: 'rbih_no_location',
            faction: 'RBiH',
            status: 'active',
            kind: 'brigade',
          },
          rs_brigade_a: {
            id: 'rs_brigade_a',
            faction: 'RS',
            status: 'active',
            kind: 'brigade',
            location_osid: 'op:test:a',
          },
        },
      },
    } as unknown as GameState;

    const locations = buildActiveFormationLocationsByFaction(state);

    expect(hasActiveFormationAtOsid(locations, 'RBiH', 'op:test:a' as Osid)).toBe(true);
    expect(hasActiveFormationAtOsid(locations, 'RS', 'op:test:a' as Osid)).toBe(true);
    expect(hasActiveFormationAtOsid(locations, 'RBiH', 'op:test:b' as Osid)).toBe(false);
    expect(hasActiveFormationAtOsid(locations, 'RBiH', 'op:test:missing' as Osid)).toBe(false);
  });
});
