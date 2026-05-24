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

describe('combat movement BFS queue cursor contracts', () => {
    it('bot brigade movement BFS helpers use head cursors, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/combat/bot_brigade_movement_ai.ts'), 'utf8');
        const regions = [
            regionBetween(raw, 'export function findNearestFrontOsid(', '/** BFS to find the nearest OSID matching a substring pattern'),
            regionBetween(raw, 'export function findNearestOsidByPattern(', '/**\n * Compute BFS hop distance'),
            regionBetween(raw, 'export function computeHopsToFront(', '/**\n * Find the actual front-line destination OSID'),
            regionBetween(raw, 'export function findFrontDestinationForColumnMarch(', 'function getEffectiveCorpsFrontTargets('),
        ];

        for (const region of regions) {
            expect(region).not.toContain('.shift()');
            expect(region).not.toMatch(/\bDate\.now\s*\(/);
            expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
            expect(region).not.toMatch(/\bperformance\.now\s*\(/);
        }
    });

    it('brigade friendly shortest-path BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/combat/brigade_movement.ts'), 'utf8');
        const region = regionBetween(raw, 'export function shortestPathThroughFriendly(', '/**\n * Transit turns for a path');

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });

    it('return-to-corps evaluator BFS uses a head cursor, not Array.shift()', () => {
        const raw = readFileSync(resolve('src/sim/combat/bot_brigade_eval_front.ts'), 'utf8');
        const region = regionBetween(
            raw,
            "returnToCorpsProfileTime('.returnToCorps.bfs'",
            "returnToCorpsProfileTime('.returnToCorps.walkBack'",
        );

        expect(region).not.toContain('.shift()');
        expect(region).not.toMatch(/\bDate\.now\s*\(/);
        expect(region).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(region).not.toMatch(/\bperformance\.now\s*\(/);
    });
});
