import { describe, expect, it } from 'vitest';

import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';
import {
    explainSupplyBlock,
    summarizeOwnFactionSupply,
} from '../src/sim/supply_comprehension.js';

/**
 * Deterministic fixture: two factions, each with its own per-faction by_osid slice.
 * RBiH has a mix (adequate / strained / critical); RS is all adequate. Insertion order
 * is intentionally shuffled so we can prove sorted, stable output.
 */
const REPORT: SupplyStateByOsidReport = {
    schema: 1,
    turn: 12,
    factions: [
        {
            faction_id: 'RBiH',
            by_osid: [
                { osid: 'op:sarajevo:centar', state: 'strained' },
                { osid: 'op:srebrenica:town', state: 'critical' },
                { osid: 'op:tuzla:core', state: 'adequate' },
                { osid: 'op:gorazde:town', state: 'critical' },
                { osid: 'op:zenica:core', state: 'adequate' },
            ],
        },
        {
            faction_id: 'RS',
            by_osid: [
                { osid: 'op:banja_luka:core', state: 'adequate' },
                { osid: 'op:pale:core', state: 'adequate' },
            ],
        },
    ],
};

describe('summarizeOwnFactionSupply (own-faction only)', () => {
    it('counts own-faction OSIDs by level and lists critical OSIDs sorted', () => {
        const s = summarizeOwnFactionSupply(REPORT, 'RBiH');
        expect(s).toBeDefined();
        expect(s!.faction_id).toBe('RBiH');
        expect(s!.adequate_count).toBe(2);
        expect(s!.strained_count).toBe(1);
        expect(s!.critical_count).toBe(2);
        expect(s!.total_count).toBe(5);
        // Sorted by strictCompare — gorazde before srebrenica.
        expect(s!.critical_osids).toEqual(['op:gorazde:town', 'op:srebrenica:town']);
        expect(s!.headline).toContain('2 of 5 positions are Critical');
    });

    it('produces an all-holding headline when nothing is strained or critical', () => {
        const s = summarizeOwnFactionSupply(REPORT, 'RS');
        expect(s!.critical_count).toBe(0);
        expect(s!.strained_count).toBe(0);
        expect(s!.adequate_count).toBe(2);
        expect(s!.headline).toContain('Supply lines are holding');
    });

    it('returns undefined for a faction with no known supply state (no enemy leak surface)', () => {
        expect(summarizeOwnFactionSupply(REPORT, 'HRHB')).toBeUndefined();
        expect(summarizeOwnFactionSupply(null, 'RBiH')).toBeUndefined();
    });

    it('is deterministic: identical report yields identical summary', () => {
        const a = summarizeOwnFactionSupply(REPORT, 'RBiH');
        const b = summarizeOwnFactionSupply(REPORT, 'RBiH');
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('honors the critical OSID limit', () => {
        const s = summarizeOwnFactionSupply(REPORT, 'RBiH', 1);
        expect(s!.critical_osids).toEqual(['op:gorazde:town']);
        // Count is unaffected by the display limit.
        expect(s!.critical_count).toBe(2);
    });
});

describe('explainSupplyBlock (own-faction staging legibility)', () => {
    it('explains a critical staging block in plain language', () => {
        const e = explainSupplyBlock(REPORT, 'RBiH', ['op:srebrenica:town', 'op:tuzla:core']);
        expect(e.constrained).toBe(true);
        expect(e.worst_state).toBe('critical');
        expect(e.staging.map((s) => s.osid)).toEqual(['op:srebrenica:town', 'op:tuzla:core']);
        expect(e.explanation).toContain('Critical (cut off)');
        expect(e.explanation).toContain('op:srebrenica:town');
    });

    it('explains a strained-only staging as supply-strained, not blocked', () => {
        const e = explainSupplyBlock(REPORT, 'RBiH', ['op:sarajevo:centar']);
        expect(e.constrained).toBe(true);
        expect(e.worst_state).toBe('strained');
        expect(e.explanation).toContain('brittle corridors');
    });

    it('reports adequate staging as unconstrained', () => {
        const e = explainSupplyBlock(REPORT, 'RBiH', ['op:tuzla:core', 'op:zenica:core']);
        expect(e.constrained).toBe(false);
        expect(e.worst_state).toBe('adequate');
        expect(e.explanation).toContain('do not constrain');
    });

    it('reads only own-faction supply (cannot see another faction\'s OSID state)', () => {
        // op:banja_luka:core is RS-controlled/critical-free; querying it as RBiH staging
        // must yield "unknown" — RBiH never sees RS supply truth.
        const e = explainSupplyBlock(REPORT, 'RBiH', ['op:banja_luka:core']);
        expect(e.staging).toEqual([]);
        expect(e.worst_state).toBeUndefined();
        expect(e.explanation).toContain('unknown');
    });

    it('dedups and sorts staging OSIDs deterministically', () => {
        const e = explainSupplyBlock(REPORT, 'RBiH', [
            'op:zenica:core',
            'op:tuzla:core',
            'op:zenica:core',
        ]);
        expect(e.staging.map((s) => s.osid)).toEqual(['op:tuzla:core', 'op:zenica:core']);
    });
});
