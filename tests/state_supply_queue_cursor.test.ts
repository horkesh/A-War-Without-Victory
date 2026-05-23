import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function regionBetween(raw: string, start: string, end: string): string {
    const startIdx = raw.indexOf(start);
    expect(startIdx, `missing region start: ${start}`).toBeGreaterThanOrEqual(0);
    const endIdx = raw.indexOf(end, startIdx + start.length);
    expect(endIdx, `missing region end: ${end}`).toBeGreaterThan(startIdx);
    return raw.slice(startIdx, endIdx);
}

describe('state supply and enclave BFS queue cursor contracts', () => {
    it('supply reachability BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/state/supply_reachability.ts'), 'utf8');
        const region = regionBetween(raw, 'export function runSupplyBfs', 'export function computeSupplyReachability');

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });

    it('supply state derivation BFS regions use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/state/supply_state_derivation.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'function isBridgeInSubgraph(', 'export function deriveCorridors'),
            regionBetween(raw, 'export function deriveSupplyState', 'export function deriveLocalProductionCapacity'),
            regionBetween(raw, 'function isBridgeInSubgraphOsidLegacy(', 'function findBridgesInSubgraphOsid('),
            regionBetween(raw, 'function findHeartlandComponent(', 'function computeFactionSupplyState'),
            regionBetween(raw, 'function computeFactionSupplyState(', 'export function deriveSupplyStateByOsid'),
        ];

        for (const region of regions) {
            expect(region).not.toContain('.shift()');
            expect(region).not.toMatch(/\bDate\.now\s*\(/);
            expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
            expect(region).not.toMatch(/\bperformance\.now\s*\(/);
        }
    });

    it('supply reserve siege pocket BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/state/supply_reserves.ts'), 'utf8');
        const region = regionBetween(raw, 'function computeCriticalPockets(', 'export function updateSiegeTurnCounters');

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });

    it('sustainability surrounded-search BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/state/sustainability.ts'), 'utf8');
        const region = regionBetween(raw, 'function isMunicipalitySurrounded(', 'function countPersistentBreaches');

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });

    it('enclave component BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/state/enclave_integrity.ts'), 'utf8');
        const region = regionBetween(raw, 'function findComponents(', 'export interface EnclaveIntegrityReport');

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });
});
