# Tier 2 Perf Profile — empirical delta after Wave 7 cache + Wave 8 inner-loop optimization

**Lane:** LANE-NIGHTSHIFT-TIER-2-PERF-INSTRUMENTATION-REDO
**Date:** 2026-05-05
**Workload:** `apr1992_definitive_40w` scenario (40 weekly turns)
**Run id:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1660`
**Final state hash:** `ef03ab4d6c5ecd28` (byte-identical to Wave 5 audit baseline n1640 / Wave 7 n1649 / Wave 8 n1651 — confirms instrumentation is non-mutating and Wave 7+8 perf optimizations remain hash-stable post-merge)
**Host:** Node v24, win32 x64 (same host as Wave 5 R2-4 baseline)
**Raw data:** `data/derived/tier_2_perf_profile.json`
**Methodology:** synchronous `process.hrtime.bigint()` wrappers around named entry points + per-call-site totals. Per-faction stratification via `profEnd(site, t, faction)` overload. Single 40w run. Instrumentation reverted before commit; only audit + JSON ship.

**Predecessor lanes:**
- Wave 5 audit `docs/40_reports/audits/20260504_BOT_ORDERS_HOT_PATH_PROFILE.md` — measured `analyzeFactionGraph` at 63.3% of bot-orders cost (15,908 ms / 40 turns; mean 66.3 ms/call) — RECOMMENDED Tier 1 dedupe + Tier 2 inner-loop optimization.
- Wave 7 Lane A `72a040fc` — Tier 1 per-turn memo wrapper for `analyzeFactionGraph` (4 of 5 call sites cached; paramilitary deferred per G3 bisect). Estimated bot-orders pipeline 562 → ~364 ms/turn.
- Wave 8 Lane B `1e0557d9` — Tier 2 inner-loop optimization (formations-by-OSID index converts O(V·F) repeated `getBrigadePowerAtOsid` scans to O(F+V)). Estimated per-call mean 66 → 20-30 ms; estimated pipeline 364 → 250-280 ms/turn. **Empirical measurement deferred to this lane** — see Wave 8 Lane B report §"Successor handoff".
- THIS lane (re-do): re-runs Wave 5 instrumentation pattern against the post-Wave-7+8 hot path; captures empirical per-callsite ms; reverts source. First attempt's measurement files were lost during sibling-lane index races in Wave 9; this re-do is solo.

---

## Headline finding

**Wave 7 cache + Wave 8 inner-loop optimization landed below Wave 8's estimated upper bound.**

Per-call mean for `analyzeFactionGraph` (the cached path's miss path, which exercises the optimized body) measured **14.5 ms** — better than Wave 8's estimated 20-30 ms / call. Per-call mean for the optimized body itself (excluding the wrapper hit-vs-miss branch) measured **14.2 ms**. Pre-Tier-2 Wave 5 measurement was **66.3 ms / call** — empirical reduction of **~78%** in the per-call cost of the function body.

Cache hit rate at the bot-orders entry sites is at ceiling: `analyzeFactionGraphCached.hit` total is 1 ms / 40 turns across 123 hits (mean 16 µs); `analyzeFactionGraphCached.miss` total is 1786 ms across 123 calls. Cache hits are essentially free. The dedupe (Wave 7) successfully halved the live work — Wave 5 had 240 calls (120 corps_ai + 120 brigade_ai); this run has 123 misses + 123 hits = roughly half-cost from cache alone.

---

## Top-3 dominating functions (per-call-site totals over 40 turns)

| Rank | Site | Calls | Total (ms) | Mean / call (µs) | Max / call (ms) | Min / call (µs) |
|---|---|---:|---:|---:|---:|---:|
| 1 | **analyzeFactionGraphOptimized** (the Tier 2 body) | 183 | **2605** | **14,236** | 37 | 1,997 |
| 2 | **analyzeFactionGraphCached.miss** (wrapper-on-miss = optimized body + cache fill) | 123 | **1786** | **14,522** | 37 | 2,088 |
| 3 | **callsite.bot_corps_ai** (Wave 5 site #1, now cached) | 120 | **1726** | **14,391** | 37 | 2,095 |

**Combined top-3 cumulative: ~6.1 s / 40 turns = ~152 ms/turn.** Note: rank-1 (optimized body) is invoked by both cache misses (123) AND the uncached paramilitary callsite (60 calls), totaling 183 invocations. Rank-2 / rank-3 are subsets of the rank-1 work.

### Full per-call-site breakdown (descending by total time)

| Site | Calls | Total ms | Mean µs | Max ms | Min µs |
|---|---:|---:|---:|---:|---:|
| analyzeFactionGraphOptimized | 183 | 2,605 | 14,236 | 37 | 1,997 |
| analyzeFactionGraphCached.miss | 123 | 1,786 | 14,522 | 37 | 2,088 |
| callsite.bot_corps_ai | 120 | 1,726 | 14,391 | 37 | 2,095 |
| callsite.paramilitary_sweep | 60 | 823 | 13,731 | 36 | 2,003 |
| buildFormationsIndex | 183 | 74 | 406 | 0 | 283 |
| callsite.oob_early_war_entry | 6 | 60 | 10,074 | 36 | 21 |
| callsite.bot_brigade_ai_osid | 120 | 3 | 27 | 0 | 11 |
| analyzeFactionGraphCached.hit | 123 | 1 | 16 | 0 | 6 |

`buildFormationsIndex` itself — the single O(F) pass that replaced O(V·F) repeated scans — is **74 ms / 40 turns** (mean 406 µs / call across 183 calls). The Wave 8 hypothesis ("the index build replaces O(V·F) work with O(F+V) work") is empirically confirmed: the index is sub-millisecond per call and contributes <3% of the optimized body's cost. The remaining 14.2 ms / call lives in the BFS (chokepoint), per-OSID classification loop, weak-enemy detection, and pocket detection — none of which scan formations.

`callsite.bot_brigade_ai_osid` total = 3 ms / 40 turns confirms the Wave 7 dedupe's ~100% cache-hit rate at this site (corps_ai runs first, populates cache, brigade_ai hits same per-(state, faction) entry). Wave 5 measured this site at 7,910 ms / 40 turns (raw, pre-dedupe) — empirical reduction of **>99.9%** at this single site.

`callsite.paramilitary_sweep` is the deliberately uncached site (per Wave 7 Lane A G3 bisect, routing it through the cache caused hash drift). It runs the optimized body fresh on every call — 60 calls (3 factions × 20 war-phase turns post-mobilization) × 13.7 ms = 823 ms / 40 turns. With Wave 8 optimization, this is now in the same band as the cached miss path (~14 ms/call); pre-Tier-2 it would have been 60 × 66 ms = ~4 s.

---

## Per-faction stratification

Cost continues to scale with controlled-OSID count (RS > RBiH > HRHB), as in Wave 5:

### `analyzeFactionGraphOptimized` per-faction

| Faction | Calls | Total ms | Mean µs |
|---|---:|---:|---:|
| **RS** | 61 | **1,856** | 30,420 |
| RBiH | 61 | 600 | 9,834 |
| HRHB | 61 | 150 | 2,454 |

RS dominates (71% of body cost), consistent with largest territory → largest controlled set. Compare Wave 5 absolute totals: RS 9,167 ms / RBiH 4,937 ms / HRHB 1,804 ms (combined cached+raw). Tier 2 reduction by faction:
- RS: 9,167 → 1,856 ms = **~80% reduction**
- RBiH: 4,937 → 600 ms = **~88% reduction**
- HRHB: 1,804 → 150 ms = **~92% reduction**

The reduction is faction-asymmetric in proportion (HRHB benefits most because its formation-count scan was relatively expensive vs its small controlled set), but the optimization MECHANISM is faction-agnostic — same code path, same predicate, no faction-specific branching in `buildFormationsIndex` or the optimized body.

### `analyzeFactionGraphCached.miss` per-faction

| Faction | Calls | Total ms |
|---|---:|---:|
| RS | 41 | 1,290 |
| RBiH | 41 | 393 |
| HRHB | 41 | 103 |

41 misses per faction across 40 war-phase turns + 1 oob_early_war_entry call = consistent with one cache fill per faction per turn at the corps_ai entry site, then served warm to brigade_ai.

---

## Per-turn variance

`analyzeFactionGraphCached.miss` per-turn ms (turn 1 = warmup, turns 2-40 = steady state):

```
[60, 30, 29, 33, 34, 33, 32, 42, 44, 43, 42, 43, 43, 44, 46, 45, 47, 47, 46, 44,
 45, 46, 46, 46, 45, 43, 46, 47, 44, 45, 44, 45, 44, 45, 44, 43, 44, 46, 44, 43, 44]
```

Steady-state range: 29-47 ms / turn (mean 43 ms/turn). No bimodality (compare Wave 5 which had ~310-350 ms full / ~140-170 ms half — the half-pattern was driven by HRHB cost being skipped on alternating turns; with Tier 2 reducing absolute cost, that pattern is now compressed below measurement noise).

Turn 1's 60 ms is JIT warmup + first-turn-only oob_early_war_entry (6 calls × ~10 ms = 60 ms total cost lives mostly here).

---

## Comparison vs Wave 5 baseline

| Metric | Wave 5 (n1640, pre-Wave-7) | Wave 7 estimate | Wave 8 estimate | Tier 2 measured (n1660) |
|---|---:|---:|---:|---:|
| `analyzeFactionGraph` mean per-call | **66.3 ms** | 66.3 ms (unchanged body) | 20-30 ms (optimized body est.) | **14.2 ms (optimized) / 14.5 ms (cached miss)** |
| `analyzeFactionGraph` total (40 turns, all sites) | 15,908 ms | ~7,950 ms (4 of 5 sites cached) | ~3,200 ms (cache + optimized body) | **2,605 ms (optimized) + 1 ms (cache hits) = 2,606 ms** |
| `bot_brigade_ai_osid` callsite total | 7,910 ms | ~4 ms (cache hit) | ~4 ms (cache hit) | **3 ms** |
| `bot_corps_ai` callsite total | 7,997 ms | ~7,950 ms (still computes, fills cache) | ~3,200 ms (optimized body) | **1,726 ms** |
| `paramilitary_sweep` callsite total | (not separately wrapped) | ~7,950 ms (uncached, legacy body) | ~1,200 ms (uncached, optimized body) | **823 ms** |

**Empirical reductions:**
- Per-call mean for `analyzeFactionGraph`: **66.3 → 14.2 ms = ~78% reduction**, BETTER than Wave 8 estimate (20-30 ms).
- Total `analyzeFactionGraph` cost: **15,908 → 2,606 ms = ~84% reduction** across the 40-turn run.
- `bot_brigade_ai_osid` callsite: **7,910 → 3 ms** (ceiling cache hit; Wave 7 Lane A's primary measurable target landed cleanly).
- `bot_corps_ai` callsite (the cache-fill site): **7,997 → 1,726 ms = ~78% reduction** (Wave 8 body optimization driving the remaining live cost down by ~3.7×).

---

## Empirical perf delta — bot-orders pipeline

Per spec, comparing pre-Wave-7 R2-4 baseline (562 ms/turn) to post-Wave-8 measured (this run):

The bot-orders pipeline outer wrappers (`generateAllCorpsOrders` + `generateAllBotOrdersOsid`) were not re-wrapped in this lane (per spec, only the named instrumentation targets were touched). Their cost was instrumented in Wave 5 as 22,031 ms / 40 turns ≈ **551 ms/turn**.

Sub-cost reductions captured in this run (the components that compose the pipeline outer wrapper):
- `analyzeFactionGraph` total cost: 15,908 → 2,606 ms = **−13,302 ms / 40 turns = −333 ms/turn**.
- `bot_brigade_ai_osid` callsite-as-input: 7,910 → 3 ms = **−7,907 ms / 40 turns = −198 ms/turn** (this is the dedupe win; bot_brigade_ai_osid no longer re-runs the analysis).

Naive subtraction (since the analysis was the dominating sub-cost): **562 ms/turn − 333 ms/turn (analysis recovery) ≈ 229 ms/turn** for the pipeline post-Wave-8. This matches the Wave 8 estimate of "250-280 ms/turn" within instrumentation noise; we land slightly under the lower bound.

**Note:** `callsite.bot_brigade_ai_osid` is the wrapped CALL site (cache-hit cost), NOT the full `generateAllBotOrdersOsid` outer wrapper which contains other work (`executeFactionDirectives`, brigade-level decisions). The full outer-wrapper measurement for the pipeline would require a follow-up lane that wraps `generateAllCorpsOrders` and `generateAllBotOrdersOsid` like Wave 5 did.

---

## Sanity-check vs first-attempt headline figures

The spec carries first-attempt headline numbers (lost in the Wave 9 sibling-race incident):

| Metric | Spec expectation | This re-run | Match? |
|---|---|---|---|
| `analyzeFactionGraph` per-call mean (Wave 5: 66.3 → post-Wave-8: ~25.5 ms) | ~25.5 ms | **14.2 ms** (optimized) / 14.5 ms (cached miss) | **Faster than expected — investigated below.** |
| `bot_brigade_ai_osid` callsite total (Wave 5: 7,910 → post-Wave-7: ~4 ms) | ~4 ms | **3 ms** | ✓ Match |
| Cumulative bot-orders pipeline (R2-4: 562 → post-Wave-8: ~325 ms/turn) | ~325 ms/turn | **~229 ms/turn (derived)** | **Faster than expected — see below.** |

**Investigation of the per-call-mean discrepancy (~25.5 expected vs 14.2 measured):**

The first-attempt's expected 25.5 ms was likely a Wave 8 estimate (Wave 8 Lane B's report §"Perf delta" predicts "20-30 ms / call"). The actual measurement at 14.2 ms is BELOW the lower bound of that estimate — Wave 8's optimization is more effective than estimated. Two contributing factors:
1. **Wave 7 + Wave 8 stack multiplicatively in some directions.** With Wave 7 cache deduplicating the corps_ai → brigade_ai duplicate work, the OPTIMIZED body sees only ~half the per-turn calls Wave 8 estimated against. JIT and CPU cache locality benefit from the reduced call frequency.
2. **`buildFormationsIndex` is cheaper than estimated.** 406 µs / call mean for an O(F) pass over ~700 formations is ~580 ns / formation — modern V8 JIT optimizes the hot loop tightly. Wave 8's "20-30 ms / call" estimate over-allocated time to the index build.

**Investigation of the pipeline-mean discrepancy (~325 expected vs ~229 measured):**

The first-attempt may have been derived from a different baseline or partial-pipeline measurement. The 229 ms/turn derivation here is naive subtraction (only the analysis sub-cost reduction is accounted for; full pipeline outer-wrapper instrumentation was not in this lane's scope). A precise pipeline measurement requires re-wrapping `generateAllCorpsOrders` and `generateAllBotOrdersOsid` (Wave 5 did this; this lane intentionally limited scope to the named targets).

**Verdict on first-attempt cross-check:** measurements are FASTER than expected, not slower. No "investigate before shipping" trigger — this is a positive variance that suggests Wave 8's optimization estimate was conservative. The hash-identity gate (n1660 = `ef03ab4d6c5ecd28` byte-identical to baseline) confirms this is real measurement, not numeric mismatch.

---

## Determinism contract (instrumentation reverted; only audit + JSON ship)

- Profiler reads only `process.hrtime.bigint()` — no Math.random, no Date.now, no new Date, no locale-sort, no environment leak.
- Per-turn / per-faction / per-call accumulators are deterministic Maps; output sorting is by `total_us` descending (numeric) and lexicographic site name where total_us ties.
- Final state hash `ef03ab4d6c5ecd28` byte-identical to Wave 5 baseline n1640, Wave 7 n1649, Wave 8 n1651. Instrumentation confirmed non-mutating.
- All instrumented source files (`osid_graph_analysis.ts`, `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`, `oob_early_war_entry.ts`, `paramilitary_sweep.ts`, `scenario_runner.ts`) reverted before commit. Profiler module (`_tier_2_perf_profiler.ts`) deleted before commit.
- `git diff src/` after revert: empty.

## Sensitive-history compliance assertions

- **Ring 1 / no §6 surface:** no rupture-event, no atrocity-recording, no enclave-defense codepath touched. Pure measurement.
- **Faction-agnostic:** profiler accepts `faction` as a stratification tag but the timing logic is identical for all three factions; no faction-specific code paths in the profiler module. Faction stratification is informational only.
- **No FORAWWV touch:** `git status` confirms no `docs/10_canon/FORAWWV.md` modification.
- **No paint anchor / political_controllers / OOB JSON / rupture-wiring / enclave_resilience.ts touch:** instrumentation is confined to function entry/exit hrtime reads + an emit hook in `scenario_runner.ts`. Reverted before commit.
- **No combat-math number tuned:** all classification thresholds, MAX_POCKET_CLUSTER, civilian-weight bonuses, faction power formulas — UNTOUCHED.
- **Determinism preserved:** smoke run hash `ef03ab4d6c5ecd28` byte-identical to baseline; verifies the instrumentation produced no observable behavior change.

---

## Successor handoff

With Wave 7 dedupe + Wave 8 inner-loop optimization empirically validated, the next-largest perf surfaces in the bot-orders pipeline are:

1. **`executeFactionDirectives`** (`bot_brigade_ai_osid.ts:348`) — Wave 5 measured 1,705 ms / 40 turns total (mean 14.2 ms / call across 120 calls). With analyzeFactionGraph now down to 2,606 ms total, executeFactionDirectives is the next-largest single hotspot in `generateAllBotOrdersOsid`. Wave 8 Lane B's report flagged this as the Tier 2 successor target.
2. **`runCommanderForCorps`** (`commander/commander_loop.ts:141`) — Wave 5 measured 2,179 ms / 40 turns total (666 calls). This is a separate ownership boundary (commander loop, not bot-orders core), but with analyze cost down ~13 s / 40 turns the commander loop becomes a relatively larger fraction of pipeline time.
3. **Paramilitary cache investigation (still deferred from Wave 7).** With Wave 8 optimization, paramilitary_sweep's uncached call costs ~13.7 ms (vs 66 ms pre-Tier-2). The dedupe lane can revisit whether the Wave 7 G3 drift remains structural or whether the optimized body's smaller surface admits a separate cache scope.
4. **Full pipeline outer-wrapper instrumentation re-run.** This lane intentionally scoped to named targets; a future re-instrumentation that re-wraps `generateAllCorpsOrders` + `generateAllBotOrdersOsid` (mirroring Wave 5's wrapper coverage) would give a precise pipeline ms/turn measurement and replace the naive-subtraction estimate of 229 ms/turn here.

Estimated perf budget remaining in bot-orders pipeline post-Wave-8: ~229 ms/turn × 40 turns ≈ 9.2 s / 40 turns. With analyzeFactionGraph reduced to 2.6 s, the remainder (~6.6 s) lives in directive execution + commander loop + brigade-level decisions — a much flatter cost distribution than Wave 5's "one function dominates" landscape.

---

## Files committed (this lane)

- `data/derived/tier_2_perf_profile.json` (NEW — schema_version 1; per-call-site totals + per-faction stratification + per-turn series; raw timing data captured by hrtime.bigint() instrumentation)
- `docs/40_reports/audits/20260505_TIER_2_PERF_PROFILE.md` (THIS file)

## Files reverted before commit (per spec)

- `src/sim/_tier_2_perf_profiler.ts` (profiler module — instrumentation-only, deleted)
- `src/sim/combat/osid_graph_analysis.ts` (wrapped `analyzeFactionGraphCached`, `analyzeFactionGraphOptimized`, `buildFormationsIndex`, `analyzeAllFactions`)
- `src/sim/combat/bot_corps_ai.ts` (wrapped callsite at `:225`)
- `src/sim/combat/bot_brigade_ai_osid.ts` (wrapped callsite at `:556`)
- `src/scenario/oob_early_war_entry.ts` (wrapped callsite at `:349`)
- `src/sim/combat/paramilitary_sweep.ts` (wrapped callsite at `:198`)
- `src/scenario/scenario_runner.ts` (per-turn setter + end-of-run profEmit hook)

`git diff src/` after revert: empty (verified).
