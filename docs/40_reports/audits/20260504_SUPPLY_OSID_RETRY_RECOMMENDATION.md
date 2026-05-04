# Supply-OSID Optimization Retry — Recommendation

**Date:** 2026-05-04
**Authors:** /determinism-auditor + /technical-architect (research-only)
**Predecessor:** Mission C (LANE-NIGHTSHIFT-SUPPLY-OSID-PERF), rolled back per `docs/PROJECT_LEDGER.md` 2026-05-04 trip-session-3 entry.
**Baseline to defend:** n1627 final-state hash `a2a51d4a9994a7f5` (40w `apr1992_definitive_40w`).
**Hot phase to attack:** `supply-osid` — 562.5 ms / turn, 18.2 % of 40w turn budget (`docs/40_reports/audits/20260503_PERF_BASELINE_ROUND2.md`).

The dominant cost lives in `deriveCorridorsOsid` → `isBridgeInSubgraphOsid`: per-edge BFS-removal over the per-faction reachable subgraph, O(E²). The C2/C2a memos already short-circuit cache-hit turns; the 562 ms is the remainder — turns where territory flipped and bridges must be recomputed.

## 1. Why Mission C drifted (hypotheses)

The rolled-back Tarjan code is gone from the tree (rollback was clean — no commit, no branch, not in reflog). Hypotheses ranked from algorithmic principles:

- **(a) Tie-breaking divergence — LIKELY.** `deriveCorridorsOsid` outputs a sorted `corridors[]` and downstream consumers (`deriveSupplyStateByOsid`, `openEdgesByFaction`) consume the *set*, so order should not matter. BUT: `isBridgeInSubgraphOsid` uses a `Set<string>` `without` and BFS from `a` with `queue.shift()`. JS `Set` iteration is insertion order — Tarjan inserts edges in DFS-discovery order, the legacy code inserts via the surrounding `for…of fac.controlled` neighbor loop. Different insertion orders → different `edges_used` ordering downstream → different `Set.from(edges_used).has(eid)` traversal in the *adequate-BFS in `computeFactionSupplyState`*, which still uses `queue.shift()` (FIFO over an array seeded `[...sources]`). FIFO order is stable, but the *set of open edges* fed into it would be byte-identical only if Tarjan's bridge classification is byte-identical — which it should be on a connected simple graph but is NOT guaranteed across articulation-point handling. **Most plausible root cause.**
- **(b) Edge-classification edge case — LIKELY.** BiH has 712 OSIDs, 2047 edges, with peninsulas/enclaves (Goražde, Žepa, Sarajevo pocket, Bihać). Per-faction *reachable* subgraphs disconnect into components. The legacy `isBridgeInSubgraphOsid` returns `false` early when `!reachableNodes.has(a) || !reachableNodes.has(b)`. Tarjan classifies bridges per DFS-tree per component — if the two implementations disagree on which edges are *between unreachable nodes*, output diverges. Multi-component handling is the textbook Tarjan footgun.
- **(c) Float arithmetic — RULED OUT.** Pure graph algorithm.
- **(d) Input mutation — POSSIBLE.** Tarjan needs visited/low-link/disc arrays. If keyed off the shared `adjacency: Map<string,string[]>` from `buildOsidAdjacency`, no mutation. If a custom adjacency was rebuilt with `.push()` over an unsorted `for (const e of edges)`, neighbor order would differ from C1-memoized adjacency — drift.
- **(e) Determinism plumbing gap — LIKELY.** Tarjan visits vertices in *some* order. The natural implementation uses `for (const v of adjacency.keys())` — Map iteration order is insertion order, which here matches `buildOsidAdjacency`'s edge-walk order, NOT sorted `localeCompare` order. The legacy code iterates `fac.controlled` (already `localeCompare`-sorted via `controlledByFaction[osid].push()` over `sortedOsids`). Mismatch.

Best guess: (a) ∧ (e) compounded — Tarjan was deterministic per *adjacency-insertion-order*, but the surrounding code expects *localeCompare-sorted* iteration, and one bridge that sits on a multi-component boundary flipped from `brittle` → `open` (or vice-versa) → one corridor state differs → one OSID's `adequate` vs `strained` differs → predictor input differs → orders drift → final-state hash drifts.

## 2. Pre-merge gates for any retry

- **G1. Property test, 10 000 trials.** Generate BiH-shaped graphs (n=300–800, planar mesh, multi-component subgraphs forced via random source seeding). Run legacy `isBridgeInSubgraphOsid`-loop AND new Tarjan. Assert `Set(bridges_legacy) === Set(bridges_tarjan)` AND identical sorted `bridges` arrays.
- **G2. Production parity wrapper.** Behind `process.env.SUPPLY_OSID_PARITY_CHECK === '1'`, every `deriveCorridorsOsid` call runs both implementations and asserts `JSON.stringify(legacy) === JSON.stringify(tarjan)`. Run the full 40w scenario with the flag on; zero asserts → green.
- **G3. Hash-identity gate.** 40w smoke against n1627 `a2a51d4a9994a7f5`. Bit-identical or no merge.
- **Determinism plumbing:** Tarjan visits `[...adjacency.keys()].sort((a,b)=>a.localeCompare(b))`; neighbor iteration uses the C1-memoized adjacency lists (already sorted at build time — verify); bridge output sorted by `localeCompare(edgeId)`.

## 3. Alternative optimizations (ranked)

- **(A1) Region-keyed cache invalidation — RECOMMENDED PRIMARY.** Cache key per faction = `(region_id, last_territory_change_turn_in_region)`. ~150 OSIDs flip per turn out of 712; ~5 of ~30 regions touched. Hash-drift risk **NONE** (pure cache; same compute, fewer calls). Effort **S** (~80 lines: region partition table already exists in sector code; piggyback on `isBridgeInSubgraphOsid` per-faction-subgraph by hashing the controlled-OSID set per region). Expected: 562 ms → 120–180 ms (3–5× speedup, since the bridge-detection inner loop dominates and most regions are unchanged turn-to-turn).
- **(A2) Worker thread.** Hash-drift risk LOW (must serialize state in/out — fragile). Effort M. Speedup limited to wall-clock parallelism since main thread still awaits. **Not recommended now** — adds determinism surface for limited gain.
- **(A3) Lazy per-OSID supply.** Hash-drift risk MEDIUM (changes consumer contract). Effort L. **Not recommended** — `deriveSupplyStateByOsid` is read by combat predictor for every brigade, which would defeat laziness.
- **(A4) Pre-computed reachability tiles.** Hash-drift risk MEDIUM. Effort L. Worth revisiting as a v0.9.4+ optimization but premature now.
- **(A0) Tarjan retry with G1+G2+G3 gates.** Risk NARROW (gates catch drift). Effort M. Speedup expected 2–3× on bridge-detection alone. Less promising than A1 because it only attacks the inner loop, not the call-frequency.

## 4. Final recommendation

**Primary: A1 region-keyed cache invalidation.**

- Speedup: **562 ms → 120–180 ms / turn** (≈ 3–5× on this phase, ~10–14 % of total turn budget recovered, getting v0.9.3 from 3 094 ms → ~2 700 ms steady-state).
- Hash-drift risk: **NONE** (pure caching; legacy compute on cache-miss path is unchanged).
- Effort: **S** (~80 lines + 1 new region-partition derive, no API changes to consumers).
- STOP triggers: cache-key collision under any 40w hash != n1627 `a2a51d4a9994a7f5`; any region partition that crosses faction control boundaries (must be defined by static topology, not control); any test in the C2 cache-coherence suite turning red.

**Secondary (after A1 lands and re-baseline established): A0 Tarjan retry with G1+G2+G3 gates.** Tarjan still recovers the inner-loop O(E²)→O(V+E) win on cache-miss turns and compounds with A1. Pre-merge gates make the retry safe.

**Do not pursue: A2, A3, A4** until A1 + A0 land and a fresh perf baseline is captured.
