/**
 * Shared test helper for OSID/string adjacency Map construction.
 *
 * Consolidates the inlined `makeAdjacency` factories previously duplicated
 * across 13+ test files (variants differing only in dedupe / sort / type
 * alias for the key/value):
 *   - Variant A (sort + push, Map<string,string[]>):
 *       anomaly_detector_deployment_truth, brigade_front_distribution,
 *       brigade_home_return, siege_mobilization
 *   - Variant B (includes-dedupe, Map<string,string[]>, no sort):
 *       brigade_aor_subsegment
 *   - Variant C (includes-dedupe, Map<Osid,Osid[]>, no sort):
 *       brigade_territory_reconciliation, rear_sector_bucket_truth,
 *       sector_coverage_truth_preservation, sector_frontline_truth,
 *       sector_false_owner_cleanup, sector_front_territory_contract,
 *       sector_split_brigade_assignment, trnovo_kalinovik_sector_fix
 *   - Variant D (Set + sorted entries, Map<Osid,Osid[]>):
 *       sector_severe_undercoverage_rebalance
 *
 * Semantic identity (verified): given UNIQUE input edges, all four variants
 * produce the same set of (key, neighbor-set) pairs. Neighbor list order is
 * never asserted by callers — engine code consumes the adjacency as a graph.
 *
 * The default behavior here (`dedupe: true, sort: true`) is the strict
 * superset that satisfies every variant's contract:
 *   - dedupe → makes the helper safe even if a test passes duplicate edges
 *   - sort   → deterministic neighbor lists (matches the Variant A and D
 *              shape; harmless for B and C consumers, which never depended
 *              on insertion order)
 *
 * NOT consolidated (semantically distinct):
 *   - Variant E (literal no-arg map):       drift_recall_precedence,
 *                                            sector_coverage_truth_preservation
 *   - Variant F (single-edge `loc, tooth`): tooth_guard
 *   - Variant G (`Map<any, any>` untyped):  unstaffed_front_annotation
 *
 * Determinism: no Math.random, no Date.now, no timestamps. Sort uses default
 * string ordering (stable, locale-independent for ASCII OSIDs).
 *
 * Faction-agnostic. Generic over the key type to support both `string` and
 * branded `Osid` aliases without `as` casts at the call site.
 */

/**
 * Build an undirected-adjacency Map from a list of edge pairs.
 *
 * @param pairs - Edge list. Each `[a, b]` adds `b` to `a`'s neighbours and
 *                `a` to `b`'s. Defaults to empty (returns empty Map).
 * @param options.dedupe - Skip neighbours that already appear in the list.
 *                         Default `true`.
 * @param options.sort   - Sort each neighbour list with the default string
 *                         comparator after population. Default `true`.
 *
 * @returns `Map<T, T[]>` where neighbour lists are deduped (when enabled)
 *          and sorted (when enabled).
 */
export function makeAdjacency<T extends string = string>(
    pairs: ReadonlyArray<readonly [T, T]> = [],
    options: { dedupe?: boolean; sort?: boolean } = {},
): Map<T, T[]> {
    const dedupe = options.dedupe ?? true;
    const sort = options.sort ?? true;

    const adj = new Map<T, T[]>();
    for (const [a, b] of pairs) {
        const la = adj.get(a) ?? [];
        if (!dedupe || !la.includes(b)) la.push(b);
        adj.set(a, la);

        const lb = adj.get(b) ?? [];
        if (!dedupe || !lb.includes(a)) lb.push(a);
        adj.set(b, lb);
    }

    if (sort) {
        for (const list of adj.values()) list.sort();
    }

    return adj;
}
