/**
 * Dayton settlement contiguity (owner, 2026-11-07: "There should be no isolated pockets on
 * final Dayton map"). Synthetic grids for the pass itself, plus the real Dayton map.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { FactionId, GameState } from '../src/state/game_state.js';
import { enforceSettlementContiguity, POCKET_MAX_CELLS } from '../src/sim/negotiation/settlement_contiguity.js';
import { computeSettlementControllers, getSettlementAdjacency } from '../src/sim/negotiation/peace_settlement.js';

/** A w×h grid of cells `c:x:y`, 4-neighbour adjacency, unit area. */
function grid(w: number, h: number, owner: (x: number, y: number) => FactionId) {
    const controllers: Record<string, FactionId> = {};
    const adjacency = new Map<string, string[]>();
    const areas: Record<string, number> = {};
    const id = (x: number, y: number) => `c:${x}:${y}`;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            controllers[id(x, y)] = owner(x, y);
            areas[id(x, y)] = 1;
            const n: string[] = [];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx!, ny = y + dy!;
                if (nx >= 0 && ny >= 0 && nx < w && ny < h) n.push(id(nx, ny));
            }
            adjacency.set(id(x, y), n.sort());
        }
    }
    return { controllers, adjacency, areas, isProtectedExclave: (_side: 'FED' | 'RS', _cells: string[]) => false };
}

const sides = (ctl: Record<string, FactionId>) => Object.values(ctl).map((f) => (f === 'RS' ? 'RS' : 'FED'));

describe('enforceSettlementContiguity', () => {
    it('absorbs a small island into the entity around it', () => {
        // Left half Federation (RBiH), right half RS, one RS cell inside the Federation.
        const g = grid(8, 4, (x, y) => (x === 1 && y === 1 ? 'RS' : x < 4 ? 'RBiH' : 'RS'));
        const { controllers, changes } = enforceSettlementContiguity(g);
        expect(changes).toEqual({ 'c:1:1': 'RBiH' });
        expect(controllers['c:1:1']).toBe('RBiH');
    });

    it('gives an absorbed cell to the Federation party around it', () => {
        const g = grid(8, 4, (x, y) => (x === 1 && y === 1 ? 'RS' : x < 4 ? 'HRHB' : 'RS'));
        expect(enforceSettlementContiguity(g).changes).toEqual({ 'c:1:1': 'HRHB' });
    });

    it('cuts a corridor to a large detached territory instead of erasing it', () => {
        // Federation main block on the left; a 9-cell Federation block (x 6..8, y 0..2)
        // separated from it by a single RS column at x = 5.
        const g = grid(9, 6, (x, y) => (x <= 4 ? 'RBiH' : x >= 6 && y <= 2 ? 'RBiH' : 'RS'));
        const before = enforceSettlementContiguity({ ...g }).controllers;
        const fedCells = sides(before).filter((s) => s === 'FED').length;
        const { changes } = enforceSettlementContiguity(g);
        expect(Object.keys(changes)).toHaveLength(1); // one RS cell becomes the corridor
        expect(Object.values(changes)).toEqual(['RBiH']);
        expect(fedCells).toBe(5 * 6 + 9 + 1);
    });

    it('keeps a protected border exclave', () => {
        const g = grid(8, 4, (x, y) => (x === 7 && y === 0 ? 'RBiH' : x < 4 ? 'RBiH' : 'RS'));
        const protectedRun = enforceSettlementContiguity({
            ...g, isProtectedExclave: (side: 'FED' | 'RS', cells: string[]) => side === 'FED' && cells.includes('c:7:0'),
        });
        expect(protectedRun.changes).toEqual({});
        expect(enforceSettlementContiguity(g).changes).toEqual({ 'c:7:0': 'RS' });
    });

    it('caps outright absorption at the pocket size', () => {
        expect(POCKET_MAX_CELLS).toBe(6);
    });

    it('never absorbs protected ground (a won package, an enclave): it gets a corridor instead', () => {
        // One Federation cell at (6,1) inside RS, two RS cells from the Federation main block.
        const g = grid(8, 4, (x, y) => (x === 6 && y === 1 ? 'RBiH' : x < 4 ? 'RBiH' : 'RS'));
        const guarded = enforceSettlementContiguity({ ...g, isProtectedCell: (o) => o === 'c:6:1' });
        expect(guarded.controllers['c:6:1']).toBe('RBiH');
        expect(Object.values(guarded.changes).every((f) => f === 'RBiH')).toBe(true);
        expect(Object.keys(guarded.changes).sort()).toEqual(['c:4:1', 'c:5:1']);
        expect(enforceSettlementContiguity(g).changes).toEqual({ 'c:6:1': 'RS' });
    });

    it('a corridor never cuts through the other side\'s protected ground', () => {
        const g = grid(8, 4, (x, y) => (x === 6 && y === 1 ? 'RBiH' : x < 4 ? 'RBiH' : 'RS'));
        const result = enforceSettlementContiguity({
            ...g,
            isProtectedCell: (o) => o === 'c:6:1' || o === 'c:5:1' || o === 'c:4:1',
        });
        expect(result.changes['c:5:1']).toBeUndefined();
        expect(result.changes['c:4:1']).toBeUndefined();
        expect(result.controllers['c:6:1']).toBe('RBiH');
    });

    it('picks the corridor with the smallest area, not the fewest cells', () => {
        // The Federation island at (6,0) can join through (5,0),(4,0) [2 cells] or a detour;
        // make the direct cells huge so the corridor goes around through small cells.
        const g = grid(8, 3, (x, y) => (x === 6 && y === 0 ? 'RBiH' : x < 4 ? 'RBiH' : 'RS'));
        g.areas['c:4:0'] = 100;
        g.areas['c:5:0'] = 100;
        const { changes } = enforceSettlementContiguity({ ...g, isProtectedCell: (o) => o === 'c:6:0' });
        expect(changes['c:4:0']).toBeUndefined();
        expect(changes['c:5:0']).toBeUndefined();
        expect(Object.keys(changes).length).toBeGreaterThan(2);
    });

    it('moves on past a piece it cannot fix', () => {
        // A protected Federation island walled off by protected RS ground cannot be joined;
        // a separate RS pocket inside the Federation is still absorbed.
        const g = grid(10, 4, (x, y) => {
            if (x === 1 && y === 1) return 'RS';             // fixable RS pocket
            if (x === 8 && y === 1) return 'RBiH';           // unfixable protected island
            return x < 5 ? 'RBiH' : 'RS';
        });
        const result = enforceSettlementContiguity({
            ...g,
            isProtectedCell: (o, f) => o === 'c:8:1' || (f === 'RS' && o !== 'c:1:1'),
        });
        expect(result.changes['c:1:1']).toBe('RBiH');
        expect(result.controllers['c:8:1']).toBe('RBiH');
    });
});

describe('the Dayton settlement map has no isolated pockets', () => {
    it('on the current campaign baseline every piece of each entity is joined, except the Posavina canton', () => {
        const state = JSON.parse(readFileSync(resolve('data/derived/latest_run_final_save.json'), 'utf8')) as GameState;
        const ctl = computeSettlementControllers(state, 'dayton').controllers;
        const adjacency = getSettlementAdjacency();
        const side = (f: string) => (f === 'RS' ? 'RS' : 'FED');
        const seen = new Set<string>();
        const detached: string[] = [];
        const mains = new Map<string, number>();
        const comps: Array<{ side: string; cells: string[] }> = [];
        for (const s of Object.keys(ctl).sort()) {
            if (seen.has(s)) continue;
            const cells = [s];
            seen.add(s);
            for (let i = 0; i < cells.length; i++) {
                for (const n of adjacency.get(cells[i]!) ?? []) {
                    if (!seen.has(n) && ctl[n] && side(ctl[n]!) === side(ctl[s]!)) { seen.add(n); cells.push(n); }
                }
            }
            comps.push({ side: side(ctl[s]!), cells });
            mains.set(side(ctl[s]!), Math.max(mains.get(side(ctl[s]!)) ?? 0, cells.length));
        }
        for (const c of comps) {
            if (c.cells.length === mains.get(c.side)) continue;
            detached.push(...c.cells);
        }
        const POSAVINA = new Set(['orasje', 'bosanski_samac', 'odzak']);
        expect(detached.filter((o) => !POSAVINA.has(o.split(':')[1]!))).toEqual([]);
    });
});
