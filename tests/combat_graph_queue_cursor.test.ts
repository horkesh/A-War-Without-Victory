import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function regionBetween(raw: string, startNeedle: string, endNeedle: string): string {
    const start = raw.indexOf(startNeedle);
    expect(start).toBeGreaterThanOrEqual(0);
    const end = raw.indexOf(endNeedle, start);
    expect(end).toBeGreaterThan(start);
    return raw.slice(start, end);
}

describe('combat graph BFS queue cursor contracts', () => {
    it('OSID graph BFS regions use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/combat/osid_graph_analysis.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'function bfsReachable(', '/**\n * Check if removing an OSID'),
            regionBetween(raw, 'function analyzeFactionGraphOptimized(', '/**\n * LEGACY body'),
            regionBetween(raw, 'function analyzeFactionGraphLegacy(', '/**\n * Compute graph analysis for ALL factions'),
        ];

        for (const region of regions) {
            expect(region).not.toContain('.shift()');
            expect(region).not.toMatch(/\bDate\.now\s*\(/);
            expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
            expect(region).not.toMatch(/\bperformance\.now\s*\(/);
        }
    });

    it('rear-pocket and contiguous-set BFS regions use head cursors, not Array.shift()', () => {
        const rearRaw = readFileSync(resolve('src/sim/combat/rear_pocket_consolidation.ts'), 'utf8');
        const rearRegion = regionBetween(
            rearRaw,
            'export function consolidateRearPockets(',
            '        // Mark all cluster members as checked',
        );

        const warAdjRaw = readFileSync(resolve('src/sim/combat/war_adjacency.ts'), 'utf8');
        const contiguousRegion = regionBetween(
            warAdjRaw,
            'export function isSettlementSetContiguous(',
            '/**\n * Get all active brigades',
        );

        const retreatRaw = readFileSync(resolve('src/sim/combat/attack_retreat_displacement.ts'), 'utf8');
        const componentsRegion = regionBetween(
            retreatRaw,
            'export function buildFriendlyComponentsLocal(',
            '/** Find the component index with the most OSIDs.',
        );

        for (const region of [rearRegion, contiguousRegion, componentsRegion]) {
            expect(region).not.toContain('.shift()');
            expect(region).not.toMatch(/\bDate\.now\s*\(/);
            expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
            expect(region).not.toMatch(/\bperformance\.now\s*\(/);
        }
    });
});
