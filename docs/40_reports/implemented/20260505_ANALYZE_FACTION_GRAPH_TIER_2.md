# LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 — inner-loop optimization for analyzeFactionGraph

**Status:** GATES PASS (G1+G2+G3 all GREEN); commit remediation in progress (initial commit `a8257b30` contained wrong file set due to staging interaction with concurrent Wave 8 lane index state)
**Lane:** LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2
**Date:** 2026-05-05
**Predecessors:**
- Wave 7 Lane A `72a040fc` — per-turn memo wrapper for `analyzeFactionGraph` (4 of 5 call sites cached); leaves the function body unoptimized.
- Wave 5 audit `docs/40_reports/audits/20260504_BOT_ORDERS_HOT_PATH_PROFILE.md` — Tier 2 inner-loop optimization is the named successor.
- Mission C A0 Tarjan precedent (`a60d39c9`, 2026-05-04) — gate-discipline pattern for hot-path optimizations (G1+G2+G3 binding).

**Baseline (G3 pre-target):** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1640` final_state_hash `ef03ab4d6c5ecd28` (n1649 also identical post Wave 7 Lane A).

---

## Phase 0 findings — body cost analysis

The body of `analyzeFactionGraph` (`src/sim/combat/osid_graph_analysis.ts:204-427`) does several O(V), O(V·E), O(F·V) loops. The hidden hotspot:

**`getBrigadePowerAtOsid`** iterates `Object.entries(formations)` on EVERY call — O(F) per invocation, where F ~ 700-1000 formations late-war. The function calls it:

- once per controlled OSID (Loop 2: `brigadePower` for the analyzed faction) — up to V calls
- once per enemy neighbor of every controlled OSID (Loop 2: enemy threat) — up to V·avg_degree calls
- once per enemy front OSID (Loop 3: weak enemy) — up to E calls
- once per cluster OSID (Loop 4: pocket defense check) — up to V calls

For 712 OSIDs and ~700 formations, this is roughly O(V·F) ≈ 500k operations per faction per turn × 3 factions × 2 cached miss + 1 paramilitary uncached = ~1.5M-3M Object.entries iterations per turn. **That is the single dominating sub-cost.**

## Phase 1 — Optimization plan (safest first)

**O1: Pre-index formations by OSID (the big lever).** Walk `formations` ONCE at the start of the function and build:
- `factionTotalPowerByOsid: Map<Osid, number>` — total power for analyzed faction at each OSID.
- `factionBestAtOsid: Map<Osid, { id: string; power: number; formation: FormationState }>` — strongest single brigade/og at each OSID for the analyzed faction (preserves the legacy tie-break).
- `anyTotalPowerByOsid: Map<Osid, number>` — total power across ANY faction at each OSID (for enemy threat reads, where no faction filter applies).
- `anyBestAtOsid: Map<Osid, { formation: FormationState }>` — strongest single brigade at each OSID across any faction (used for the `formation` return in weak_enemy_osids check).
- `controllerFilteredPowerByOsid: Map<string /*osid|faction*/, number>` — per-(osid, faction) total for pocket-defense check.

This converts all `getBrigadePowerAtOsid` calls from O(F) to O(1) lookups. Pre-index cost: O(F).

**O2: Single-pass neighbor classification.** Loop 2 iterates `neighbors` twice (once for friendly/enemy split, once for `advance_enemy_adjacency`). Combine into one pass: while computing enemy/friendly counts, also count enemy adjacency (which is just `enemyNeighbors.length`). Saves one pass of the neighbor list per controlled OSID.

**O3: Avoid the conditional `controllerCache.get(...) ?? getPoliticalControllerOSID(...)` second-call pattern.** Loop 1 already populates `controllerCache` for ALL OSIDs in `allOsids`. Subsequent reads can use `controllerCache.get(n)` directly. (The second-call pattern with `?? getPoliticalControllerOSID(...)` is a vestigial defensive read since Loop 1 already covers every key in adjacency.)

**O4 (DEFER):** Sharing BFS frontier across factions OR short-circuiting on unchanged controlled-OSID set. Both cross-call optimizations — exactly the shape that bit Wave 7 Lane A in G3. **Skip these per the partial-fix-is-valid Mission C precedent.** The wrapper's per-turn cache already handles cross-call sharing; we don't need to introduce another timing surface.

## Phase 2 — Property test extension

The existing `tests/analyze_faction_graph_dedupe.test.ts` exercises `analyzeFactionGraphCached` against `__test_analyzeFactionGraphLegacy` (10k LCG-seeded property trials). After Tier 2 ships, the cached path calls the OPTIMIZED body but the legacy re-export must continue to provide the LEGACY body so the property test compares apples-to-apples.

Approach: rename the current function body to `analyzeFactionGraphLegacy` (private), add new `analyzeFactionGraphOptimized` (private), keep `analyzeFactionGraph` as the public exported name pointing to the optimized version, and update `__test_analyzeFactionGraphLegacy` re-export to point at the legacy body. Add a third re-export for the new optimized body so a direct optimized-vs-legacy property test can run alongside the existing cached-vs-legacy test.

## Phase 3 — G2 parity wrapper

Extend the existing `ANALYZE_FACTION_GRAPH_PARITY_CHECK` env flag to ALSO run the optimized vs legacy body comparison. Single env flag covers both layers: cache-correctness (cached vs fresh recompute, original use) AND body-correctness (optimized vs legacy body). On mismatch, dump same shape (turn + faction + adjacency size + first 10 errors).

## Phase 4 — G3 hash-identity smoke

Run 40w n1650 against baseline `ef03ab4d6c5ecd28`. Pure-equivalent body optimization should preserve hash by construction. If it drifts, bisect by reverting individual optimizations (O1, O2, O3) one at a time and re-run.

## Implementation log

- [PLANNING] Read predecessors + audit + Wave 7 Lane A report. Confirmed scope: body of `analyzeFactionGraph` only; no touch to `analyzeFactionGraphCached`, parity wrapper, WeakMap, or 4 cached call sites.
- [PLANNING] Identified O(F) hotspot: `getBrigadePowerAtOsid` called O(V) times per analysis, each iterating all formations.
- [DONE] Added `analyzeFactionGraphOptimized` private function with O1 (formations-by-OSID index), O2 (single-pass neighbor classification), O3 (vestigial defensive-fallback removal). Made `analyzeFactionGraph` public dispatch to optimized.
- [DONE] Renamed legacy body to `analyzeFactionGraphLegacy` (private, frozen reference) for property test + parity wrapper.
- [DONE] Updated `__test_analyzeFactionGraphLegacy` re-export to point at the legacy body (was the public dispatcher pre-Tier-2). Added `__test_analyzeFactionGraphOptimized` re-export for direct optimized-vs-legacy comparison.
- [DONE] Extended G2 parity wrapper with Tier 2 env flag `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK` (separate from existing Wave 7 `ANALYZE_FACTION_GRAPH_PARITY_CHECK`). Default off; when enabled, asserts cached/fresh result is structurally equal to legacy body output. Fires on both cache hit and cache miss paths.
- [DONE] `npx tsc --noEmit` clean (no errors).
- [DONE — G1 MILESTONE] `tests/analyze_faction_graph_dedupe.test.ts` 6/6 GREEN in 3.25s. The 10k-trial property loop confirms cached (which now calls optimized body) is structurally equal to legacy body across 10,000 randomized BiH-shape trials. **G1 PASS.**
- [DONE — G1 EXTENDED] Added 2 new tests: direct optimized-vs-legacy 10k property loop + Tier 2 parity-flag opt-in exercise. 8/8 GREEN in 5.11s. The new direct test (2.1s) bypasses the cache and asserts optimized body === legacy body across 10k trials independently of cache-correctness.
- [DONE — focused regression] `npx vitest run tests/bot_*.test.ts tests/osid_graph*.test.ts tests/analyze_faction_graph_dedupe.test.ts`: **70/70 GREEN across 9 suites in 9.26s.** No osid_graph*.test.ts files exist in the repo; bot_* surface confirmed clean.
- [DONE — paramilitary regression] `npx vitest run tests/paramilitary_sweep.test.ts tests/uncontested_occupation_priority.test.ts tests/operational_data_osid.test.ts tests/osid_adjacency_memoization.test.ts`: **55/55 GREEN.** Confirms the optimized body works correctly through paramilitary_sweep's direct call to `analyzeFactionGraph` (which routes to optimized) and through the cached path.
- [DONE — G2 MILESTONE] `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK=true npx vitest run [4 files]`: **56/56 GREEN in 8.44s.** Tier 2 parity wrapper fires on every cache hit AND cache miss; asserts structural equality between optimized and legacy bodies; zero throws across the property loop + paramilitary + bot + uncontested test surfaces. **G2 PASS.**
- [DONE — G3 MILESTONE] 40w smoke n1651: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1651`. final_state_hash `ef03ab4d6c5ecd28` — **byte-identical** to baseline n1640 / n1649 (post-Wave 7 Lane A) `ef03ab4d6c5ecd28`. **G3 PASS.** No bisect needed; the optimized body produces identical output to legacy in production.

## Gate verdicts

- **G1 — PASS.** Property test extended in `tests/analyze_faction_graph_dedupe.test.ts`: now 8 tests total (was 6 in Wave 7 Lane A). Two 10,000-trial LCG-seeded property loops:
  1. Existing: cached (now calls optimized body) === legacy body, structurally equal across 10k trials. 2.31s.
  2. NEW: direct optimized body === legacy body, structurally equal across 10k trials, bypasses the cache. 2.10s.
  Plus the 4 cache-semantics tests + 2 parity-flag opt-in exercises. All deterministic via LCG; no Math.random; no Date; faction-rotated trials cover RBiH/RS/HRHB. 8/8 GREEN.
- **G2 — PASS.** New env flag `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK=true` (default off). When enabled, every cache hit AND cache miss in `analyzeFactionGraphCached` re-runs `analyzeFactionGraphLegacy` and asserts structural equality. Throws with state turn + faction + adjacency-size dump on mismatch. 56/56 GREEN under the flag (analyze_faction_graph_dedupe + paramilitary_sweep + bot_operation_objective_focus + uncontested_occupation_priority).
- **G3 — PASS at the shipped configuration.** 40w smoke n1651 final_state_hash `ef03ab4d6c5ecd28` — byte-identical to baseline `ef03ab4d6c5ecd28` (n1640 = pre-Wave-7-Lane-A; n1649 = post-Wave-7-Lane-A). The optimized body produces identical bytes to the legacy body in production. **No bisect needed**; G3 passed on first attempt.

## Bisect history

- n1651: SHIPPED CONFIG (Tier 2 optimized body active across all 5 call sites: corps_ai, brigade_ai, oob_early_war_entry, analyzeAllFactions internal, paramilitary_sweep). Hash `ef03ab4d6c5ecd28` — byte-identical to baseline. **No drift; no bisect required.**

## Perf delta (estimated, audit-derived)

Wave 5 audit measured `analyzeFactionGraph` body at 15,908 ms / 40 turns total across 240 calls (mean 66.3 ms / call). Wave 7 Lane A's per-turn memo wrapper deduplicated 4 of 5 call sites (paramilitary deferred), bringing the bot-orders pipeline from 562 ms/turn → ~364 ms/turn (~35% reduction).

Tier 2 optimizes the BODY itself. The dominant sub-cost was `getBrigadePowerAtOsid` iterating `Object.entries(formations)` (~700 formations late-war) on every call:
- Loop 2: O(V·avg_degree) calls per analysis
- Loop 3: O(E_front) calls per analysis
- Loop 4: O(V_pocket) calls per analysis

Tier 2 builds a formations-by-OSID index ONCE per call (single O(F) pass at the start). Every `getBrigadePowerAtOsid`-shaped lookup becomes O(1). Estimated speedup:
- Per-call mean before Tier 2: ~66 ms / call (Wave 5 audit baseline).
- Per-call mean after Tier 2: estimated ~20-30 ms / call (3-4× reduction; the index build replaces O(V·F) work with O(F+V) work).
- Bot-orders pipeline projection: ~364 ms/turn (post Wave 7 Lane A) → ~250-280 ms/turn (~25-30% additional reduction on top of Wave 7 Lane A).
- Cumulative (Wave 7 + Tier 2): bot-orders pipeline ~50-55% reduction from R2-4 baseline of 562 ms/turn.

**Empirical perf measurement is deferred** — the Wave 5 audit pattern (instrumentation lane that emits then reverts) is the canonical way to capture per-callsite timings. This lane only enforces that the optimized body is hash-identical and structurally equivalent; the actual ms/turn delta will be measured in a follow-up instrumentation lane if needed.

## Determinism contract

- **Sorted iteration:** `analyzeFactionGraphOptimized` retains `Array.from(adjacency.keys()).sort(strictCompare)` as the canonical OSID order. All output arrays sorted via `strictCompare` at the end (semantics identical to legacy).
- **Tie-break preservation:** `factionBestByOsid` and `anyBestByOsid` use the same tie-break rule as legacy `getBrigadePowerAtOsid`: stronger power wins; on equal power, lexicographically-smaller id wins via `strictCompare`. Verified by 10k-trial property test passing.
- **No new `Math.random` / `Date.now` / `new Date` / locale-sort / environment leak:** only `process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK` is read (default off, exact-string compared).
- **Faction-agnostic:** Same code path for all three factions; the index is built once per analyzer call without regard to which faction is being analyzed; `factionKey(osid, fac)` is symmetric.
- **No new timing surface:** Tier 2 is inner-loop only. The Wave 7 Lane A G3 drift was a cross-step timing issue from a WeakMap cache crossing pipeline boundaries (paramilitary at war_phases:809 vs bot-orders at war_phases:1148). Tier 2 introduces no cross-step cache; the formations-by-OSID index is rebuilt on every call (lives within one function invocation, then garbage-collected).
- **Single-call O(F) pre-index cost:** the index build is bounded by the formation count F (~700 late-war), then released. No persisted state.

## Sensitive-history compliance assertions

- **Faction-agnostic:** SAME code path for all three factions; the formations-by-OSID index is built without faction-specific branching; `factionKey(osid, fac)` is symmetric in `fac`.
- **No `Math.random` / `Date.now` / `new Date` / locale-sort / environment leak:** verified by Grep — the optimized body adds zero references to these.
- **No FORAWWV touch:** `git status` confirms no `docs/10_canon/FORAWWV.md` modification.
- **No paint anchor / `political_controllers` / OOB / rupture-wiring / `enclave_resilience.ts` touch:** changes confined to `osid_graph_analysis.ts` (added `analyzeFactionGraphOptimized` + `buildFormationsIndex` + `analyzeFactionGraphLegacy` retention; extended parity wrapper) and `tests/analyze_faction_graph_dedupe.test.ts` (added 2 tests).
- **Ring 1 / no §6 surface:** no rupture-event, no atrocity-recording, no enclave-defense codepath touched. Pure perf optimization.
- **No combat-math number tuned:** all classification thresholds (interior / undefended / critical at 2.0× / threatened at 1.0× / active / quiet), MAX_POCKET_CLUSTER (6), 10000 chokepoint civilian-weight bonus, all PRESERVED VERBATIM in optimized body.
- **No Wave 7 Lane A wrapper / cache touched:** `analyzeFactionGraphCached` body unchanged except for the additive `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK` env flag block. WeakMap structure unchanged. 4 Wave 7 cached call sites unchanged. Paramilitary call site unchanged (still legacy `analyzeFactionGraph`, which now dispatches to optimized — still byte-identical per G3).

## Files changed (this lane only)

- `src/sim/combat/osid_graph_analysis.ts` — added `analyzeFactionGraphOptimized` (Tier 2 body) + `buildFormationsIndex` helper + `FormationPowerEntry`/`FormationsIndex` interfaces; renamed and retained pre-Tier-2 body as `analyzeFactionGraphLegacy` (private, frozen reference); changed public `analyzeFactionGraph` to a one-line dispatcher to optimized; extended parity wrapper with separate `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK` env flag block; updated `__test_analyzeFactionGraphLegacy` re-export to point at frozen legacy; added new `__test_analyzeFactionGraphOptimized` re-export for direct property test.
- `tests/analyze_faction_graph_dedupe.test.ts` — added 2 new tests in a separate `describe` block: direct optimized-vs-legacy 10k property loop (bypasses cache) + Tier 2 parity-flag opt-in exercise. Existing 6 tests unchanged.
- `docs/40_reports/implemented/20260505_ANALYZE_FACTION_GRAPH_TIER_2.md` (NEW — this file).

## Successor handoff

- **Tier 2 perf measurement (instrumentation lane).** This lane shipped optimized + hash-identity gated, but per-call ms-delta is estimated not measured. A future instrumentation lane (mirroring Wave 5 audit pattern: `process.hrtime.bigint()` wrappers around `analyzeFactionGraphCached` / `analyzeFactionGraphOptimized` / `buildFormationsIndex`, run 40w, emit audit, revert instrumentation) can capture the actual ms/turn drop. Expected per-call mean: 66 ms (pre-Tier-2 audit) → 20-30 ms (post-Tier-2 estimate). Bot-orders pipeline cumulative reduction: ~50-55% from R2-4 baseline.
- **Paramilitary cache lane (still deferred, Wave 7 Lane A handoff).** With Tier 2 shipped, paramilitary's call to `analyzeFactionGraph` runs the optimized body fresh-recompute. Bisect evidence still shows paramilitary cannot share the cache without G3 drift (the call's structural position pre-bot-orders means cache-fill timing matters). Future lane could investigate `OsidBotContext`-injected analysis or a separate cache scope keyed differently.
- **Next perf surface from audit JSON (`data/derived/bot_orders_profile.json`):** `executeFactionDirectives` (1,705 ms / 40 turns total — second-largest after analyzeFactionGraph) at `bot_brigade_ai_osid.ts:348` is the next-largest single hotspot. With analyzeFactionGraph dedup + Tier 2 shipped, executeFactionDirectives becomes the dominant remaining function. A future lane could profile its inner loop (`runCommanderForCorps` is also second-largest at 2,179 ms but is in `commander/commander_loop.ts` which has its own ownership boundary).
- **G2 parity wrappers:** both Wave 7 (`ANALYZE_FACTION_GRAPH_PARITY_CHECK`) and Tier 2 (`ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK`) flags ship default-off and zero production cost. Future maintainers debugging cache-correctness or body-correctness regressions can flip either flag for ongoing assertion.

## Durable lessons for KNOWLEDGE ledger

1. **Inner-loop optimization is hash-safe by construction when timing surface is single-call.** Wave 7 Lane A's G3 drift came from a CROSS-STEP timing surface (WeakMap cache served paramilitary's pre-mutation analysis to bot-orders post-mutation consumers). Tier 2 inner-loop optimization rebuilds the formations index on every call — lives within one function invocation, then GC'd. No cross-step state. G3 passed on first attempt; no bisect needed. **Rule:** when optimizing a hot function's body, prefer per-call indices over cross-call shared state. The G3 risk lives in the CACHE BOUNDARY, not in the algorithm itself.
2. **Frozen legacy body alongside optimized body is the right shape for Mission C-precedent gates.** Renaming the pre-optimization body to `*Legacy` and dispatching the public name to `*Optimized` lets G1 property test compare the two directly, lets G2 parity wrapper assert equivalence at runtime, and lets future readers compare the bodies side-by-side. The legacy retention costs ~200 lines but enables ongoing assertion via `ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK=true` — invaluable for catching regressions in any future Tier 3 optimization.
3. **Pre-indexing replaces repeated O(F) scans with one O(F) pass.** When a function calls a helper that does `Object.entries(...)` repeatedly — and the helper's output is keyed on a stable property of the iterated object (`location_osid` here) — pre-building a Map from that key to the helper's output, ONCE at the start, converts O(V·F) work to O(F+V) work. This is the most reliable single-stone perf win for analysis functions over collections of game objects (formations, brigades, units). Mirrors Mission C A0 Tarjan's O(E²) → O(V+E) shape: same algorithm-class transformation, applied to a different layer.
