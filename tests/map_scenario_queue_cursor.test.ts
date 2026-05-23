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

function expectNoTimingOrShift(region: string): void {
    expect(region).not.toContain('.shift()');
    expect(region).not.toMatch(/\bDate\.now\s*\(/);
    expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
    expect(region).not.toMatch(/\bperformance\.now\s*\(/);
}

describe('map and scenario FIFO queue cursor contracts', () => {
    it('front region component BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/map/front_regions.ts'), 'utf8');
        const region = regionBetween(raw, 'export function computeFrontRegions', 'regions.sort((a, b) =>');
        expectNoTimingOrShift(region);
    });

    it('anomaly detector BFS checks use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/scenario/anomaly_detector.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'function detectDisconnectedSectorTerritory', 'export function detectUnassignedFrontlineBrigades'),
            regionBetween(raw, 'export function detectBrigadeFarFromHome', 'const effectiveDistance = found ? distance'),
        ];

        for (const region of regions) expectNoTimingOrShift(region);
    });

    it('early-war OOB overstack BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/scenario/oob_early_war_entry.ts'), 'utf8');
        const region = regionBetween(raw, 'function findNearestOverstackedOsid', 'return null;');
        expectNoTimingOrShift(region);
    });

    it('early-war settlement holdout supply BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/early_war/settlement_control.ts'), 'utf8');
        const region = regionBetween(raw, 'function hasSupplyConnection', '// --- Types ---');
        expectNoTimingOrShift(region);
    });

    it('event corridor-severed BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/events/event_types.ts'), 'utf8');
        const region = regionBetween(raw, "case 'corridor_severed':", 'default:');
        expectNoTimingOrShift(region);
    });

    it('desktop movement-order contiguity BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/desktop/desktop_sim.ts'), 'utf8');
        const region = regionBetween(raw, 'export async function validateBrigadeMovementOrder', 'const startSid =');
        expectNoTimingOrShift(region);
    });
});
