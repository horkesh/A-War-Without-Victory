/**
 * Tests for OSID data/state: canonical_to_operational_map, location_osid, OSID control.
 * Determinism: same inputs yield same location_osid and same getPoliticalControllerOSID result.
 */

import { describe, expect, it } from 'vitest';
import {
    buildReverseMap,
    getOsidKeysSorted,
    loadOperationalData,
    resolveLocationOsid,
    backfillFormationLocationOsid,
    type CanonicalToOperationalMap
} from '../src/data/operational_data.js';
import { getPoliticalControllerOSID } from '../src/state/settlement_control.js';
import type { GameState } from '../src/state/game_state.js';

describe('operational_data', () => {
    const sampleMap: CanonicalToOperationalMap = {
        S100013: 'op:banovici:banovici_2',
        S100021: 'op:banovici:banovici_selo_2',
        S100030: 'op:banovici:seona',
        S100056: 'op:banovici:banovici_2'
    };

    it('resolveLocationOsid returns map value for canonical SID', () => {
        expect(resolveLocationOsid('S100013', sampleMap)).toBe('op:banovici:banovici_2');
        expect(resolveLocationOsid('S100030', sampleMap)).toBe('op:banovici:seona');
    });

    it('resolveLocationOsid returns undefined for unknown SID', () => {
        expect(resolveLocationOsid('S999999', sampleMap)).toBeUndefined();
    });

    it('resolveLocationOsid returns osid when hq_sid is already op: prefix', () => {
        expect(resolveLocationOsid('op:banovici:banovici_2', sampleMap)).toBe('op:banovici:banovici_2');
    });

    it('buildReverseMap produces sorted SIDs per OSID', () => {
        const reverse = buildReverseMap(sampleMap);
        expect(reverse.get('op:banovici:banovici_2')).toEqual(['S100013', 'S100056']);
        expect(reverse.get('op:banovici:seona')).toEqual(['S100030']);
    });

    it('getOsidKeysSorted returns stable sorted OSIDs', () => {
        const reverse = buildReverseMap(sampleMap);
        const data = { canonicalToOperational: sampleMap, operationalToCanonical: reverse };
        const osids = getOsidKeysSorted(data);
        expect(osids).toEqual([
            'op:banovici:banovici_2',
            'op:banovici:banovici_selo_2',
            'op:banovici:seona'
        ]);
    });

    it('backfillFormationLocationOsid sets location_osid from hq_sid', () => {
        const state = {
            military: { formations: {
                f1: { hq_sid: 'S100013', location_osid: undefined as string | undefined },
                f2: { hq_sid: 'S100030', location_osid: undefined as string | undefined }
            } }
        };
        backfillFormationLocationOsid(state, sampleMap);
        expect(state.military.formations.f1.location_osid).toBe('op:banovici:banovici_2');
        expect(state.military.formations.f2.location_osid).toBe('op:banovici:seona');
    });

    it('backfillFormationLocationOsid skips formations that already have location_osid', () => {
        const state = {
            military: { formations: {
                f1: { hq_sid: 'S100013', location_osid: 'op:existing' }
            } }
        };
        backfillFormationLocationOsid(state, sampleMap);
        expect(state.military.formations.f1.location_osid).toBe('op:existing');
    });

    it('loadOperationalData loads map and builds reverse (integration)', async () => {
        const data = await loadOperationalData();
        const keys = Object.keys(data.canonicalToOperational).sort();
        expect(keys.length).toBeGreaterThan(0);
        expect(keys[0]).toMatch(/^S\d+$/);
        const osids = getOsidKeysSorted(data);
        expect(osids.length).toBeGreaterThan(0);
        expect(osids[0]).toMatch(/^op:/);
    });
});

describe('getPoliticalControllerOSID', () => {
    const reverseMap = new Map<string, string[]>([
        ['op:test:cluster1', ['S1', 'S2', 'S3']],
        ['op:test:cluster2', ['S4']]
    ]);

    it('returns controller when state has OSID key (operational graph)', () => {
        const state = {
  factions: [],
  political: {
    political_controllers: {
                'op:test:cluster1': 'RS',
                'op:test:cluster2': 'RBiH'
            }
  } as any,
} as unknown as GameState;
        expect(getPoliticalControllerOSID(state, 'op:test:cluster1', reverseMap)).toBe('RS');
        expect(getPoliticalControllerOSID(state, 'op:test:cluster2', reverseMap)).toBe('RBiH');
    });

    it('derives majority from canonical SIDs when OSID not in state', () => {
        const state = {
  factions: [],
  political: {
    political_controllers: {
                S1: 'RS',
                S2: 'RS',
                S3: 'RBiH'
            }
  } as any,
} as unknown as GameState;
        expect(getPoliticalControllerOSID(state, 'op:test:cluster1', reverseMap)).toBe('RS');
    });

    it('returns null when no controller in derived SIDs', () => {
        const state = {
  factions: [],
  political: {
    political_controllers: {}
  } as any,
} as unknown as GameState;
        expect(getPoliticalControllerOSID(state, 'op:test:cluster1', reverseMap)).toBe(null);
    });

    it('is deterministic: same state and OSID always same result', () => {
        const state = {
  factions: [],
  political: {
    political_controllers: { S1: 'HRHB', S2: 'HRHB', S3: 'RBiH' }
  } as any,
} as unknown as GameState;
        const a = getPoliticalControllerOSID(state, 'op:test:cluster1', reverseMap);
        const b = getPoliticalControllerOSID(state, 'op:test:cluster1', reverseMap);
        expect(a).toBe(b);
        expect(a).toBe('HRHB');
    });
});
