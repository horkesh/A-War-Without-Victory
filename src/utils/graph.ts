import { strictCompare } from '../state/validateGameState.js';

/**
 * Find connected components in a graph via BFS.
 * Deterministic: seeds and neighbors iterated in strictCompare order.
 *
 * @param items    Set of items to partition into components
 * @param neighbors  Function returning neighbors for a given item
 * @returns Array of Sets, one per connected component
 */
export function findConnectedComponents(
    items: Iterable<string>,
    neighbors: (item: string) => Iterable<string>,
): Set<string>[] {
    const itemSet = new Set(items);
    const visited = new Set<string>();
    const components: Set<string>[] = [];

    for (const seed of [...itemSet].sort(strictCompare)) {
        if (visited.has(seed)) continue;
        const component = new Set<string>();
        const queue = [seed];
        visited.add(seed);
        let head = 0;
        while (head < queue.length) {
            const current = queue[head++]!;
            component.add(current);
            for (const nb of neighbors(current)) {
                if (!visited.has(nb) && itemSet.has(nb)) {
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        components.push(component);
    }

    return components;
}

/**
 * BFS reachable set from a seed through a neighbor function.
 * Deterministic iteration order.
 */
export function bfsReachable(
    seed: string,
    neighbors: (item: string) => Iterable<string>,
    filter?: (item: string) => boolean,
): Set<string> {
    const visited = new Set<string>();
    const queue = [seed];
    visited.add(seed);
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++]!;
        for (const nb of neighbors(current)) {
            if (!visited.has(nb) && (!filter || filter(nb))) {
                visited.add(nb);
                queue.push(nb);
            }
        }
    }
    return visited;
}
