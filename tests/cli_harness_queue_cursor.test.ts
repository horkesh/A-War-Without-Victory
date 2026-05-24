import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function regionBetween(raw: string, startNeedle: string, endNeedle: string): string {
    const start = raw.indexOf(startNeedle);
    expect(start, `missing region start: ${startNeedle}`).toBeGreaterThanOrEqual(0);
    const end = raw.indexOf(endNeedle, start + startNeedle.length);
    expect(end, `missing region end: ${endNeedle}`).toBeGreaterThan(start);
    return raw.slice(start, end);
}

function expectQueueCursor(region: string): void {
    expect(region).not.toContain('.shift()');
    expect(region).not.toMatch(/\bDate\.now\s*\(/);
    expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
    expect(region).not.toMatch(/\bperformance\.now\s*\(/);
}

describe('CLI audit harness FIFO queue cursor contracts', () => {
    it('phase3a AB harness BFS regions use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/cli/phase3a_ab_harness.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'function buildBfsSeedContextFromEffectiveEdges', 'if (nodes_bfs.length < N)'),
            regionBetween(raw, 'function buildBottleneckTwoClusterSeedContext', 'const clusterAFull = bfsNoCross(u);'),
            regionBetween(raw, 'function buildTwoClusterSeedFromLink', 'const clusterAFull = bfsNoCross(u);'),
        ];

        for (const region of regions) expectQueueCursor(region);
    });

    it('phase3abc audit harness BFS regions use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/cli/phase3abc_audit_harness.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'function buildBfsSeedContextFromEffectiveEdges', 'if (nodes_bfs.length < N)'),
            regionBetween(raw, 'const bfsNoCross = (start: string): { order: string[]; parent: Record<string, string | null>; depth: Record<string, number> } => {', 'const clusterAFull = bfsNoCross(u);'),
        ];

        for (const region of regions) expectQueueCursor(region);
    });
});
