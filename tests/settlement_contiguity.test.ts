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
