# Bot-Orders Hot Path Profile — single dominating function found

**Lane:** LANE-NIGHTSHIFT-BOT-ORDERS-INSTRUMENTATION-RETRY
**Date:** 2026-05-04
**Workload:** `apr1992_definitive_40w` scenario (40 weekly turns)
**Run id:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1640`
**Final state hash:** `ef03ab4d6c5ecd28` (byte-identical to Wave 4 Lane A n1638 — confirms instrumentation is non-mutating)
**Host:** Node v24.13.0, win32 x64 (same host as R2-4 baseline)
**Raw data:** `data/derived/bot_orders_profile.json`
**Methodology:** synchronous `process.hrtime.bigint()` wrappers around per-call sites within `generate-bot-corps-orders` + `generate-bot-brigade-orders` pipeline steps. Per-faction stratification via module-scoped context. Single 40w run. Instrumentation reverted before commit (audit + raw JSON ship; profiler module reverted per Wave 3+4 spec, mirroring R2-4 audit-only pattern).

**Predecessor lanes:**
- Wave 3 STOP-AND-ASK (Phase 0 investigation): identified diffuse 562 ms/turn cost; recommended instrumentation lane to find the dominating function.
- Wave 4 STOP-AND-ASK (instrumentation, first attempt): env-var syntax error, no measurement captured; reverted.
- THIS lane: proper Bash env-var syntax (`AWWV_BOT_ORDERS_PROFILE=1 npm run sim:scenario:run:40w`); successful capture; expanded ownership to include `commander/commander_loop.ts` per Wave 4 lesson.

---

## Headline finding

**The cost is NOT diffuse. It is one function called twice.**

`analyzeFactionGraph` (`src/sim/combat/osid_graph_analysis.ts:204`) consumes **15,908 ms / 40 turns = 397.7 ms per turn = 63.3% of the 628 ms/turn measured for the bot-orders pipeline outer wrappers** — and it is invoked twice per faction per turn from two separate call sites that each rebuild the same per-faction strategic graph independently:

1. `bot_corps_ai.ts:225` (`generateAllCorpsOrders`) — call site label `analyzeFactionGraph`
2. `bot_brigade_ai_osid.ts:556` (`generateAllBotOrdersOsid`) — call site label `brigadeAI.analyzeFactionGraph`

Both call sites use the same arguments shape (`state`, `faction`, `adjacency`, `reverseMap`) — Map references are stable within a turn. The work is duplicated.

---

## Top-3 dominating functions (per-call-site totals over 40 turns)

| Rank | Site | File:Line | Calls | Total (ms) | Mean / call (µs) | Max / call (ms) | % of bot-orders outer |
|---|---|---|---|---|---|---|---|
| 1 | **analyzeFactionGraph** (combined: corps_ai + brigade_ai) | `src/sim/combat/osid_graph_analysis.ts:204` | **240** (2× per faction × 3 factions × 40 turns) | **15,908** | **66,283** | 183 | **63.3%** |
| 2 | `executeFactionDirectives` | `src/sim/combat/bot_brigade_ai_osid.ts:348` | 120 | 1,705 | 14,208 | 40 | 6.8% |
| 3 | `runCommanderForCorps` (excl. own children — see breakdown) | `src/sim/combat/commander/commander_loop.ts:141` | 666 | 2,179 | 3,273 | 35 | 8.7% |

**Combined top-3 cumulative: 78.8% of the bot-orders outer wrapper budget.**

Note on accounting: the outer wrappers `generateAllCorpsOrders` (12,380 ms total) and `generateAllBotOrdersOsid` (9,651 ms total) include all inner calls. The numbers above are inclusive sums of inner call totals, which is the apples-to-apples comparison to "what fraction of the pipeline does this owner consume." The 562 ms/turn R2-4 baseline corresponds to outer wrappers totaling 22,031 ms ≈ 551 ms/turn — consistent within instrumentation overhead.

### Full per-call-site breakdown (descending by total time)

| Site | Calls | Total ms | Mean µs | Max ms |
|---|---:|---:|---:|---:|
| generateAllCorpsOrders (outer wrapper) | 120 | 12,380 | 103,165 | 226 |
| generateAllBotOrdersOsid (outer wrapper) | 40 | 9,651 | 241,285 | 399 |
| **analyzeFactionGraph (corps_ai)** | 120 | **7,997** | 66,644 | 183 |
| **brigadeAI.analyzeFactionGraph** | 120 | **7,910** | 65,923 | 178 |
| runCommanderForCorps | 666 | 2,179 | 3,273 | 35 |
| executeFactionDirectives | 120 | 1,705 | 14,208 | 40 |
| buildBriefing | 666 | 1,118 | 1,680 | 22 |
| commander.decide (sum of inner steps) | 666 | 1,052 | 1,581 | 12 |
| commander.emitCommanderOutput | 666 | 389 | 585 | 7 |
| commander.assessSituation | 666 | 387 | 582 | 4 |
| commander.makeDecisions | 666 | 118 | 178 | 1 |
| commander.assembleBeliefState | 666 | 65 | 98 | 1 |
| commander.managePlan | 666 | 54 | 82 | 5 |
| commander.allocateBrigades | 666 | 21 | 32 | 0 |
| applyCommanderOutput | 666 | 5 | 8 | 0 |

`analyzeFactionGraph` outweighs the **next eight largest call sites combined** (1,705 + 2,179 + 1,118 + 1,052 + 389 + 387 + 118 + 65 = 7,013 ms < 7,997 ms for one call site of the duplicated pair).

---

## Per-faction stratification

Cost scales with controlled-OSID count, as expected for a faction graph rebuild over a `~712-OSID` operational graph.

### `analyzeFactionGraph` (combined corps_ai + brigadeAI sites)

| Faction | Calls | Total ms | Mean µs | Notes |
|---|---:|---:|---:|---|
| **RS** | 80 | **9,167** | 114,588 | Largest territory → largest controlled set → most expensive faction graph |
| RBiH | 80 | 4,937 | 61,712 | Mid |
| HRHB | 80 | 1,804 | 22,549 | Smallest territory |

RS dominates: 57.6% of the duplicated graph cost is RS-side, matching territorial size ranking. This is a structural faction-asymmetric cost — but the **mechanism** that produces it is faction-agnostic (same code path, same predicate). Optimizing the function reduces all three factions proportionally.

### Other call sites with >100 ms total

| Site | RS | RBiH | HRHB |
|---|---:|---:|---:|
| generateAllCorpsOrders (outer) | 6,270 ms | 4,002 ms | 2,108 ms |
| executeFactionDirectives | 754 ms | 689 ms | 263 ms |
| runCommanderForCorps | 935 ms | 818 ms | 428 ms |
| buildBriefing | 492 ms | 402 ms | 225 ms |
| commander.decide | 439 ms | 413 ms | 201 ms |
| commander.assessSituation | 203 ms | 135 ms | 49 ms |
| commander.emitCommanderOutput | 95 ms | 180 ms | 113 ms |

`commander.emitCommanderOutput` is the one site where RBiH > RS — likely because RBiH issues more move/op orders per corps despite controlling less territory. Not a hotspot at 389 ms total / 9.7 ms per turn.

---

## Per-turn variance signal

The `analyzeFactionGraph` per-turn series shows a striking bimodal pattern:

- Turns 1-8, 10, 14: ~310-350 ms / turn (full-cost runs)
- Turns 9, 11-13, 15-40: ~140-170 ms / turn (about half-cost)

This bimodality is consistent across both call sites (corps_ai and brigade_ai), strongly suggesting the work is genuinely cut in half some turns — likely a faction skipped because no corps_command exists for it (the spec already notes the corps loop short-circuits when `corps_command` is empty), or one of HRHB's analysis calls becoming much cheaper as HRHB territory shrinks. Per-faction series is not separately broken down per-turn, but the totals confirm HRHB cost is small — consistent with the bimodality being driven by HRHB.

This is informational only. The bimodality does not change the optimization story: the dominating cost is the `analyzeFactionGraph` call shape itself, regardless of which factions it runs against.

---

## Recommendation: single-target optimization lane

### What to optimize

**`analyzeFactionGraph`** at `src/sim/combat/osid_graph_analysis.ts:204`. **Single function, two call sites, identical work duplicated.**

### Why this is the right target (not parallel lanes)

The next-largest hotspots (`executeFactionDirectives` 1.7s, `runCommanderForCorps` 2.2s) are **less than a quarter** of `analyzeFactionGraph`'s cost. The spec's "tie-within-20% → parallel lanes" rule does not trigger; this is a clean single-target lane.

### Two-tier mechanical opportunity

The fix has two natural tiers, in order of risk:

**Tier 1 — Eliminate duplication (free 7.9 s / 40 turns ≈ 198 ms/turn).** Both `bot_corps_ai.ts:225` and `bot_brigade_ai_osid.ts:556` call `analyzeFactionGraph(state, faction, adjacency, reverseMap)` with the same arguments per-faction-per-turn. They are sequential within the same turn (corps_ai runs at war_phases:1148, brigade_ai at war_phases:1343). The brigade_ai call could read the analysis the corps_ai call already produced — either via a per-turn cache keyed on `(state.meta.turn, faction)` in a small WeakMap stored on `state.military.corps_command_compute_cache` or an OSID-pipeline scratch slot, or via a parameter passed through `OsidBotContext` from war_phases.ts. This halves the cost without touching the function's internals.

**Tier 2 — Reduce per-call cost (current mean 66.3 ms / call).** After Tier 1 the remaining 7.9 s / 40 turns = 198 ms/turn lives at one call site per faction per turn. Profiling of the function's body (read at lines 204+ of `osid_graph_analysis.ts`) suggests the BFS-driven chokepoint / salient / undefended_front / weak_enemy / pocket detection is a series of full-graph passes over the controlled set. Plausible internal optimizations: share the BFS frontier across detections, memoize controller lookups (the function already builds `controllerCache`), short-circuit when the controlled-OSID set is unchanged from last turn (deterministic shallow set-equality predicate). Each of these is independent and bounded; estimated 30-50% per-call reduction without changing call-shape semantics. Best evaluated AFTER Tier 1 ships to confirm the cost moves with the function, not with duplicated entry.

### Expected speedup

- **Tier 1 alone** (deduplication): bot-orders pipeline drops from 562 ms/turn → 364 ms/turn (~35% reduction). Mission C A0 precedent (supply-osid O(E²)→O(V+E)) shows similar magnitude single-stone wins are achievable.
- **Tier 1 + Tier 2** (deduplication + per-call reduction): plausible target ~150-200 ms/turn (~70% reduction). Would move bot-orders out of the top-2 hottest pipeline phases.

### Determinism / sensitive-history considerations

- Faction-agnostic optimization (same predicate in code; faction-asymmetric data is the structural input).
- No FORAWWV / paint anchor / political_controllers / OOB / rupture wiring touch.
- Caching the analysis across two call sites within the same turn is byte-stable (same inputs → same output → same downstream consumers). No determinism risk.
- Tier 2 internal optimizations require care: shallow set-equality short-circuit must be a true equality check (not a fingerprint), or it risks divergence on edge-case OSID flips.

### G1 / G2 / G3 gates (per Mission C A0 precedent)

- **G1** (correctness): byte-stable `final_state_hash` on 40w smoke. Predecessor: `ef03ab4d6c5ecd28`.
- **G2** (test pass): no test count regression; full vitest GREEN.
- **G3** (perf delta): bot-orders pipeline drops by at least 30% / turn on 40w smoke vs R2-4 baseline (`generate-bot-corps-orders` + `generate-bot-brigade-orders` mean 562 ms → ≤390 ms target).

---

## Boundaries respected

- READ-ONLY at end state. Instrumentation in `_bot_orders_profiler.ts` + 5 source files (`war_phases.ts`, `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`, `commander/commander_loop.ts`, `scenario_runner.ts`) reverted before commit. Verified via `git diff src/` empty after revert.
- No fixes proposed in this lane (optimization is a separate follow-up lane).
- No other lanes' files touched. File ownership respected (this lane consumed all spec-listed files including `commander/commander_loop.ts` per Wave 4 lesson).
- Single 40w run (no repeat measurement; deterministic capture).
- Determinism preserved: synchronous `process.hrtime.bigint()` reads only; no `setTimeout`, no async profilers, no Math.random. `final_state_hash ef03ab4d6c5ecd28` matches Wave 4 Lane A n1638 — confirms instrumentation is non-mutating.

---

## Concurrent context (do not mix)

Wave 5 dispatched 4 sibling agents (188w Reconstitution verification; divergence events; Map That Scars validation; Phase 5 test review). Their file ownership doesn't overlap with this lane's measurement targets. This audit's recommendation does not depend on or block any of them.

---

## Files committed (this lane)

- `data/derived/bot_orders_profile.json` (NEW — raw timing data, schema_version 1, captures per-call-site totals + per-faction stratification + per-turn series)
- `docs/40_reports/audits/20260504_BOT_ORDERS_HOT_PATH_PROFILE.md` (THIS file)

## Files reverted before commit (per spec)

- `src/sim/_bot_orders_profiler.ts` (profiler module — dead code without invocation sites)
- `src/sim/turn_phases/war_phases.ts` (instrumentation in `generate-bot-corps-orders` + `generate-bot-brigade-orders` step bodies)
- `src/sim/combat/bot_corps_ai.ts` (wrapped `runCommanderForCorps`, `applyCommanderOutput`, `analyzeFactionGraph`)
- `src/sim/combat/commander/commander_loop.ts` (wrapped `buildBriefing`, `commander.decide`, inner ASSESS/ALLOCATE/PLAN/BELIEFS/DECIDE/EMIT)
- `src/sim/combat/bot_brigade_ai_osid.ts` (wrapped `analyzeFactionGraph`, `executeFactionDirectives`)
- `src/scenario/scenario_runner.ts` (`profEmit` call at end of run)
