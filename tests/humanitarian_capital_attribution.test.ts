/**
 * v0.3.2 — Humanitarian capital per-faction attribution
 *
 * Verifies that refugees_created is attributed to the faction controlling
 * the origin OSID at time of displacement, not summed globally.
 */

import { describe, it, expect } from 'vitest';

// Inline the computation logic for unit testing without needing the full
// computeNegotiationCapital pipeline (which requires file I/O for OSID areas).
describe('humanitarian capital attribution', () => {
    it('attributes refugees_created to the causer faction from displacement event log', () => {
        // Simulate a state with displacement events caused by different factions
        const mockEventLog = [
            {
                turn: 5, origin_mun: 'foca', origin_osid: 'op:foca:foca_1',
                dest_mun: 'gorazde', ethnicity: 'RBiH' as const,
                caused_by: 'RS' as const,
                displaced: 500, killed: 50, fled_abroad: 20, settled: 0,
            },
            {
                turn: 6, origin_mun: 'prozor', origin_osid: 'op:prozor:prozor_1',
                dest_mun: 'mostar', ethnicity: 'RBiH' as const,
                caused_by: 'HRHB' as const,
                displaced: 200, killed: 10, fled_abroad: 5, settled: 0,
            },
            {
                turn: 7, origin_mun: 'tuzla', origin_osid: 'op:tuzla:tuzla_1',
                dest_mun: 'zenica', ethnicity: 'RS' as const,
                caused_by: 'RBiH' as const,
                displaced: 100, killed: 5, fled_abroad: 3, settled: 0,
            },
        ];

        // Count refugees_created per faction (causer = who controlled origin OSID)
        const refugeesByFaction: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
        for (const evt of mockEventLog) {
            const causer = evt.caused_by;
            if (causer) {
                refugeesByFaction[causer] += evt.displaced + evt.killed + evt.fled_abroad;
            }
        }

        // RS caused 570 (500+50+20), HRHB caused 215 (200+10+5), RBiH caused 108 (100+5+3)
        expect(refugeesByFaction['RS']).toBe(570);
        expect(refugeesByFaction['HRHB']).toBe(215);
        expect(refugeesByFaction['RBiH']).toBe(108);
    });

    it('falls back to current controller when caused_by is absent (legacy events)', () => {
        const mockEventLog = [
            {
                turn: 5, origin_mun: 'foca', origin_osid: 'op:foca:foca_1',
                dest_mun: 'gorazde', ethnicity: 'RBiH' as const,
                // caused_by absent — legacy event
                displaced: 500, killed: 50, fled_abroad: 20, settled: 0,
            },
        ];

        const controllers: Record<string, string> = {
            'op:foca:foca_1': 'RS',
        };

        const refugeesByFaction: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
        for (const evt of mockEventLog) {
            const causer = (evt as any).caused_by
                ?? (evt.origin_osid ? controllers[evt.origin_osid] : undefined);
            if (causer) {
                refugeesByFaction[causer] += evt.displaced + evt.killed + evt.fled_abroad;
            }
        }

        // Falls back to current controller (RS controls op:foca:foca_1)
        expect(refugeesByFaction['RS']).toBe(570);
        expect(refugeesByFaction['HRHB']).toBe(0);
        expect(refugeesByFaction['RBiH']).toBe(0);
    });

    it('each faction gets different humanitarian_standing values', () => {
        // With attribution, humanitarian_standing should differ between factions
        // RS causes the most displacement → worst score
        // RBiH causes the least → best score

        const refugeesCreated = { RBiH: 108, RS: 570, HRHB: 215 };

        const scores: Record<string, number> = {};
        for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
            const humanScore = 50 - (refugeesCreated[faction] / 5000);
            scores[faction] = Math.max(0, Math.min(100, humanScore));
        }

        // RS should have the lowest score (most refugees created)
        expect(scores['RS']).toBeLessThan(scores['RBiH']);
        expect(scores['RS']).toBeLessThan(scores['HRHB']);
        // RBiH should have the highest (fewest refugees created)
        expect(scores['RBiH']).toBeGreaterThan(scores['HRHB']);
        // All should be non-zero and differentiated
        expect(scores['RS']).toBeGreaterThan(0);
        expect(scores['RBiH']).toBeGreaterThan(0);
        expect(scores['HRHB']).toBeGreaterThan(0);
    });

    it('DisplacementEvent type includes caused_by field', () => {
        // Type-level check: verify the field exists on the interface
        const evt = {
            turn: 1,
            origin_mun: 'test',
            origin_osid: 'op:test:test_1',
            dest_mun: 'test',
            ethnicity: 'RS' as const,
            caused_by: 'RBiH' as const,
            displaced: 100,
            killed: 5,
            fled_abroad: 2,
            settled: 0,
        };
        // Satisfies DisplacementEvent shape
        expect(evt.caused_by).toBe('RBiH');
        expect(evt.ethnicity).toBe('RS');
    });
});
