/**
 * Dayton settlement contiguity (owner, 2026-11-07: "There should be no isolated pockets on
 * final Dayton map").
 *
 * The OSID-level Dayton map is built municipality by municipality (peace_settlement.ts:
 * area quotas filled from wartime control), and packages and captured ground override it
 * cell by cell. Neither step looks at the neighbours, so the result can leave islands: an
 * RS village inside the Federation, Federation cells inside RS, or Goražde cut off from
 * the rest of the Federation when the corridor cells fall to RS by quota. The Inter-Entity
 * Boundary Line drawn at Dayton left no such islands; it gave Goražde a corridor.
 *
 * This pass makes each entity's territory one piece. Entities, not factions: RBiH and HRHB
 * are the Federation, RS the other entity.
 *  1. The largest component (by area) of each entity is its main territory.
 *  2. Any other component of at most POCKET_MAX_CELLS cells is absorbed by the entity
 *     around it; within the Federation each cell goes to the party holding most of its
 *     neighbouring Federation cells.
 *  3. A larger component gets a corridor: the shortest path of other-entity cells to its
 *     entity's main territory is given to the component's main party.
 * Exempt: a component that lies wholly in a municipality
 * named by `isProtectedExclave` (the Federation's Posavina canton, which borders Croatia
 * and was held at Dayton without a land link).
 *
 * Deterministic: sorted iteration, BFS over sorted adjacency lists, strictCompare ties.
 */
import type { FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Largest island absorbed outright; larger ones get a corridor instead. */
export const POCKET_MAX_CELLS = 6;
const MAX_PASSES = 64;

type Side = 'FED' | 'RS';
const sideOf = (f: string): Side => (f === 'RS' ? 'RS' : 'FED');

export interface ContiguityInput {
    controllers: Record<string, FactionId>;
    adjacency: Map<string, string[]>;
    areas: Record<string, number>;
    /** True for a component kept although detached (see module header). */
    isProtectedExclave: (side: Side, cells: string[]) => boolean;
}

export interface ContiguityResult {
    controllers: Record<string, FactionId>;
    /** OSID -> faction for every cell this pass changed, sorted by OSID. */
    changes: Record<string, FactionId>;
}

interface Component { side: Side; cells: string[]; area: number }

function components(ctl: Record<string, FactionId>, adjacency: Map<string, string[]>, areas: Record<string, number>): Component[] {
    const seen = new Set<string>();
    const out: Component[] = [];
    for (const start of Object.keys(ctl).sort(strictCompare)) {
        if (seen.has(start)) continue;
        const side = sideOf(ctl[start]!);
        const cells = [start];
        seen.add(start);
        for (let i = 0; i < cells.length; i++) {
            for (const n of adjacency.get(cells[i]!) ?? []) {
                const f = ctl[n];
                if (f && !seen.has(n) && sideOf(f) === side) { seen.add(n); cells.push(n); }
            }
        }
        cells.sort(strictCompare);
        out.push({ side, cells, area: cells.reduce((s, c) => s + (areas[c] ?? 0), 0) });
    }
    return out;
}

function majorityFaction(cells: string[], ctl: Record<string, FactionId>): FactionId {
    const count = new Map<string, number>();
    for (const c of cells) { const f = ctl[c]!; count.set(f, (count.get(f) ?? 0) + 1); }
    return [...count.entries()].sort((a, b) => (b[1] - a[1]) || strictCompare(a[0], b[0]))[0]![0];
}

/** Shortest run of other-entity cells from `from` to any cell of `target`; [] if none. */
function corridor(from: string[], target: Set<string>, ctl: Record<string, FactionId>, adjacency: Map<string, string[]>): string[] {
    const inFrom = new Set(from);
    const prev = new Map<string, string | null>();
    const queue: string[] = [];
    for (const c of from) { prev.set(c, null); queue.push(c); }
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!;
        for (const n of adjacency.get(cur) ?? []) {
            if (prev.has(n) || !ctl[n]) continue;
            prev.set(n, cur);
            if (target.has(n)) {
                const path: string[] = [];
                for (let p: string | null = cur; p !== null && !inFrom.has(p); p = prev.get(p) ?? null) path.push(p);
                return path.sort(strictCompare);
            }
            queue.push(n);
        }
    }
    return [];
}

export function enforceSettlementContiguity(input: ContiguityInput): ContiguityResult {
    const ctl: Record<string, FactionId> = { ...input.controllers };
    const changes: Record<string, FactionId> = {};
    for (let pass = 0; pass < MAX_PASSES; pass++) {
        const comps = components(ctl, input.adjacency, input.areas);
        const main = new Map<Side, Component>();
        for (const c of comps) {
            const m = main.get(c.side);
            if (!m || c.area > m.area || (c.area === m.area && strictCompare(c.cells[0]!, m.cells[0]!) < 0)) main.set(c.side, c);
        }
        const detached = comps
            .filter((c) => main.get(c.side) !== c)
            .filter((c) => !input.isProtectedExclave(c.side, c.cells))
            // Largest first: a corridor can reconnect small pieces that would otherwise be absorbed.
            .sort((a, b) => (b.cells.length - a.cells.length) || strictCompare(a.cells[0]!, b.cells[0]!));
        const next = detached[0];
        if (!next) break;
        if (next.cells.length <= POCKET_MAX_CELLS) {
            const inside = new Set(next.cells);
            const assign: Record<string, FactionId> = {};
            for (const o of next.cells) {
                const around = (input.adjacency.get(o) ?? []).filter((n) => !inside.has(n) && ctl[n] && sideOf(ctl[n]!) !== next.side);
                if (around.length === 0) continue;
                assign[o] = majorityFaction(around, ctl);
            }
            if (Object.keys(assign).length === 0) break;
            for (const o of Object.keys(assign).sort(strictCompare)) { ctl[o] = assign[o]!; changes[o] = assign[o]!; }
        } else {
            const target = new Set(main.get(next.side)?.cells ?? []);
            const path = corridor(next.cells, target, ctl, input.adjacency);
            if (path.length === 0) break;
            const owner = majorityFaction(next.cells, ctl);
            for (const o of path) {
                if (sideOf(ctl[o]!) === next.side) continue; // already on this side
                ctl[o] = owner;
                changes[o] = owner;
            }
        }
    }
    const sortedChanges: Record<string, FactionId> = {};
    for (const o of Object.keys(changes).sort(strictCompare)) sortedChanges[o] = changes[o]!;
    return { controllers: ctl, changes: sortedChanges };
}
