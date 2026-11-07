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
 *  2. A detached component of at most POCKET_MAX_CELLS cells is absorbed by the entity
 *     around it; within the Federation each cell goes to the party holding most of its
 *     neighbouring Federation cells.
 *  3. A larger component gets a corridor: the run of other-entity cells with the smallest
 *     total area that joins it to its entity's main territory goes to its main party.
 *  4. A component holding a protected cell (`isProtectedCell`: ground a package won at the
 *     table, or an enclave such as Goražde or Srebrenica) is never absorbed, whatever its
 *     size; it gets a corridor (RD-CONTIGUITY-PROTECTION, Pyrrhic panel 2026-11-07).
 * Exempt: a component `isProtectedExclave` names (the Federation's Posavina canton, which
 * borders Croatia and was held at Dayton without a land link).
 * A component that can be neither absorbed nor joined is left as it is and the pass moves
 * on to the next one.
 *
 * Deterministic: sorted iteration, sorted adjacency lists, strictCompare ties.
 */
import type { FactionId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Largest island absorbed outright; larger ones get a corridor instead. */
export const POCKET_MAX_CELLS = 6;
const MAX_PASSES = 64;

export type Side = 'FED' | 'RS';
const sideOf = (f: string): Side => (f === 'RS' ? 'RS' : 'FED');

export interface ContiguityInput {
    controllers: Record<string, FactionId>;
    adjacency: Map<string, string[]>;
    areas: Record<string, number>;
    /** True for a component kept although detached (see module header). */
    isProtectedExclave: (side: Side, cells: string[]) => boolean;
    /** True for a cell that must not be absorbed (won package ground, enclave). */
    isProtectedCell?: (osid: string, faction: FactionId) => boolean;
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

/**
 * The run of cells from `from` to any cell of `target` with the smallest total area of
 * other-entity cells (same-entity cells cost nothing). Returns the other-entity cells on
 * it, or null when no route exists. Dijkstra with deterministic tie-breaks.
 */
function cheapestCorridor(
    from: string[],
    target: Set<string>,
    side: Side,
    ctl: Record<string, FactionId>,
    adjacency: Map<string, string[]>,
    areas: Record<string, number>,
    isProtectedCell: (osid: string, faction: FactionId) => boolean,
): string[] | null {
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const done = new Set<string>();
    const frontier: string[] = [];
    for (const c of from) { dist.set(c, 0); prev.set(c, null); frontier.push(c); }
    while (frontier.length > 0) {
        frontier.sort((a, b) => (dist.get(a)! - dist.get(b)!) || strictCompare(a, b));
        const cur = frontier.shift()!;
        if (done.has(cur)) continue;
        done.add(cur);
        if (target.has(cur)) {
            const path: string[] = [];
            for (let p: string | null = cur; p !== null; p = prev.get(p) ?? null) {
                if (sideOf(ctl[p]!) !== side) path.push(p);
            }
            return path.sort(strictCompare);
        }
        for (const n of adjacency.get(cur) ?? []) {
            if (!ctl[n] || done.has(n)) continue;
            const ownSide = sideOf(ctl[n]!) === side;
            if (!ownSide && isProtectedCell(n, ctl[n]!)) continue; // never cut through protected ground
            const step = ownSide ? 0 : (areas[n] ?? 0);
            const d = dist.get(cur)! + step;
            const known = dist.get(n);
            if (known === undefined || d < known || (d === known && strictCompare(cur, prev.get(n) ?? '') < 0)) {
                dist.set(n, d);
                prev.set(n, cur);
                frontier.push(n);
            }
        }
    }
    return null;
}

export function enforceSettlementContiguity(input: ContiguityInput): ContiguityResult {
    const ctl: Record<string, FactionId> = { ...input.controllers };
    const changes: Record<string, FactionId> = {};
    const isProtectedCell = input.isProtectedCell ?? (() => false);
    const assign = (o: string, f: FactionId) => { ctl[o] = f; changes[o] = f; };

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

        let changed = false;
        for (const comp of detached) {
            const guarded = comp.cells.some((o) => isProtectedCell(o, ctl[o]!));
            if (comp.cells.length <= POCKET_MAX_CELLS && !guarded) {
                const inside = new Set(comp.cells);
                const take: Array<[string, FactionId]> = [];
                for (const o of comp.cells) {
                    const around = (input.adjacency.get(o) ?? [])
                        .filter((n) => !inside.has(n) && ctl[n] && sideOf(ctl[n]!) !== comp.side);
                    if (around.length > 0) take.push([o, majorityFaction(around, ctl)]);
                }
                if (take.length === 0) continue; // nothing around it to absorb it; try the next
                for (const [o, f] of take.sort((a, b) => strictCompare(a[0], b[0]))) assign(o, f);
                changed = true;
                break;
            }
            const target = new Set(main.get(comp.side)?.cells ?? []);
            const path = cheapestCorridor(comp.cells, target, comp.side, ctl, input.adjacency, input.areas, isProtectedCell);
            if (!path || path.length === 0) continue; // cannot be joined; leave it and move on
            const owner = majorityFaction(comp.cells, ctl);
            for (const o of path) assign(o, owner);
            changed = true;
            break;
        }
        if (!changed) break;
    }
    const sortedChanges: Record<string, FactionId> = {};
    for (const o of Object.keys(changes).sort(strictCompare)) sortedChanges[o] = changes[o]!;
    return { controllers: ctl, changes: sortedChanges };
}
