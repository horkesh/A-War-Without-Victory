# Perf Baseline — Round 2 (v0.9.3 opener)

**Lane:** LANE-NIGHTSHIFT-ROUND2-PERF-PROFILING-AUDIT
**Date:** 2026-05-03
**Workload:** `apr1992_definitive_40w` scenario (40 weekly turns)
**Run id:** `apr1992_definitive_40w__3649b3861a87e6ea__w40` (n1626)
**Final state hash:** `876597582e7ae8f7`
**Host:** Node v24.13.0, win32 x64
**Raw data:** `data/derived/perf_baseline_round2.json`
**Methodology:** Per-`step.run()` hrtime.bigint() wrapping of every entry in `warPhases` + `earlyWarPhases`. Per-week loop body bracketed end-to-end. RSS sampled at end of each turn. Single 40w run; instrumentation reverted after capture (no commit).

---

## Headline numbers

| Metric | Value |
|---|---|
| Wall-clock total (40w) | **128.12 s** |
| Startup (load, pre-loop) | 2.92 s |
| **Per-turn mean** | **3,094 ms** |
| Per-turn median | 2,920 ms |
| Per-turn p95 | 3,896 ms |
| Per-turn max (turn 1) | 5,786 ms |
| Per-turn min (turn 22) | 2,647 ms |
| RSS peak (≈ end of run) | **510 MB** |
| RSS minimum | 286 MB |

**Note:** Per-turn time follows a classic warm-start curve — turn 1 is 5.8s (cold caches: settlement graph, derived tables, JIT), then drops to ~2.7–2.9s steady state by turn 20+, then climbs slightly through turn 40 as front complexity grows (turn 40 = 3.47s).

---

## Top-5 phases by total time consumed (40w aggregate)

| Rank | Phase | Total (ms) | Mean / turn | % of turns total | Source |
|---|---|---|---|---|---|
| 1 | `supply-osid` | **22,499** | 562.5 ms | **18.2%** | `src/sim/turn_phases/war_phases.ts:501` → `computeSupplyReachabilityOsid` (`src/state/supply_reachability_osid.ts:60`), `deriveCorridorsOsid` (`src/state/supply_state_derivation.ts:441`), `deriveSupplyStateByOsid` (`src/state/supply_state_derivation.ts:569`) |
| 2 | `generate-bot-corps-orders` | **12,708** | 317.7 ms | 10.3% | `src/sim/turn_phases/war_phases.ts:1148` (calls `initializeCorpsCommand` + per-faction commander loop) |
| 3 | `generate-bot-brigade-orders` | **9,757** | 243.9 ms | 7.9% | `src/sim/turn_phases/war_phases.ts:1343` |
| 4 | `reconcile-final-sector-truth` | **9,235** | 230.9 ms | 7.5% | `src/sim/turn_phases/war_phase_reconciliation_steps.ts:35` → `reconcileFinalSectorTruth` (`src/sim/combat/final_sector_truth_reconciliation.ts:72`) |
| 5 | `partition-corps-front-sectors` | **8,697** | 217.4 ms | 7.0% | `src/sim/turn_phases/war_phases.ts:665` → `buildCorpsFrontSectors` (`src/sim/combat/corps_front_sectors.ts:103`) |

**Top-5 cumulative: 51% of total per-turn budget.**

Honorable mentions (positions 6–10): `update-displacement` 5,023 ms (4.1%), `update-sustainability` 4,836 ms (3.9%), `reconcile-final-sector-truth-after-ops` 4,653 ms (3.8%), `phase-f-displacement` 3,640 ms (2.9%), `paramilitary-detect` 2,921 ms (2.4%).

The sector-reconciliation cluster (`partition-corps-front-sectors` + `reconcile-final-sector-truth` + `reconcile-final-sector-truth-after-ops`) totals **22,585 ms / 18.3% of turns total** — almost identical to `supply-osid`. Per the historical 2026-04-23 ledger entry on C5 content-fingerprint cache work, this cluster has been actively optimized; it remains the second-largest hotspot.

---

## Top-3 phases with high variance (calibration sensitivity)

Variance is informative when (a) total time is non-trivial AND (b) coefficient of variation (std-dev / mean) is high — indicating the phase's cost depends strongly on simulation state, not invariant work.

| Rank | Phase | Total (ms) | Mean | Max | Min | CoV |
|---|---|---|---|---|---|---|
| 1 | `reconcile-final-sector-truth-after-ops` | 4,653 | 116 ms | **520 ms** | 0.4 ms | 1.27 |
| 2 | `paramilitary-detect` | 2,921 | 73 ms | 288 ms | ~0 ms | 1.07 |
| 3 | `partition-corps-front-sectors` | 8,697 | 217 ms | **1,188 ms** | 154 ms | 0.77 |

`paramilitary-detect` and `reconcile-final-sector-truth-after-ops` both have near-zero minima — they short-circuit when there's nothing to do — but still average tens to hundreds of ms when work is needed. `partition-corps-front-sectors` shows a 7.7× max/min spread (1,188 ms vs 154 ms) and a 1.19s spike in at least one turn — sector topology mutations dominate. These three should be re-measured at fixed sim conditions if calibration changes are made.

(Outside top-3 by CoV but flagged: `osid-column-movement` CoV 1.94 — small absolute time but extremely state-dependent; worth keeping an eye on if calls grow.)

---

## Memory peak

- **RSS peak: 535,048,192 bytes (510.26 MB)**, sampled at end of turn 40 (== run end).
- RSS minimum: 286 MB at turn 1 entry.
- Growth: ~224 MB across the run (~5.6 MB / turn average), monotonic (no GC reclaim drops between turns at end-of-turn sample points).
- Note: `rss_max_bytes == rss_end_bytes` — peak coincides with run-end measurement; intra-turn peaks during heavy steps are NOT captured by this instrumentation, so true peak is somewhat higher than 510 MB.

---

## Comparison vs v0.9.3 plan target

> v0.9.3 stated target: **"<100ms per turn on mid-range hardware"**

| Metric | Target | Measured | Gap |
|---|---|---|---|
| Per-turn mean | <100 ms | **3,094 ms** | **30.9× over budget** |
| Per-turn p95 | <100 ms | 3,896 ms | 38.9× over budget |
| Per-turn max | <100 ms | 5,786 ms | 57.9× over budget |

**Verdict: very large gap.** Even the steady-state minimum (turn 22, 2,647 ms) is 26.5× over target. Closing the gap to <100 ms / turn from 3,094 ms requires ~31× speedup — an order-of-magnitude goal that no single phase optimization will meet.

Useful interim milestones derived from the data:

- **<1,000 ms / turn (3.1× speedup):** removing or 5×-improving the top-2 phases (`supply-osid` 562 ms + `generate-bot-corps-orders` 318 ms = 880 ms / turn) gets close.
- **<500 ms / turn (6.2× speedup):** requires sustained work across the top 8–10 phases.
- **<100 ms / turn (31× speedup):** likely requires architectural change (incremental sector recomputation, supply-cache invalidation by region, deferred bot-order computation, or moving heavy phases to a worker thread).

---

## 5 specific functions to investigate next

Names + paths + line numbers below are the recommended starting points for follow-up profiling lanes (NOT proposed fixes — observation only):

1. **`computeSupplyReachabilityOsid`** — `src/state/supply_reachability_osid.ts:60`. Likely the single biggest target. Called once per turn from `supply-osid`. Profile internal BFS / reachability graph construction; check for repeated Dijkstra/BFS over the full operational graph, and whether faction-by-faction work shares intermediate structures.
2. **`deriveSupplyStateByOsid`** — `src/state/supply_state_derivation.ts:569`. Second half of the `supply-osid` step. Investigate whether per-OSID iteration is O(OSID×factions×something_growing) or if it can be incrementalized.
3. **`buildCorpsFrontSectors`** (when `isFinalPass=true`) — `src/sim/combat/corps_front_sectors.ts:103`. Drives both `partition-corps-front-sectors` (217 ms/turn) AND `reconcile-final-sector-truth-after-ops` (116 ms/turn average, 520 ms max). Investigate the 1,188 ms spike — what state condition triggers it? Look at whether the C5 content-fingerprint cache (PROJECT_LEDGER 2026-04-23) is hitting/missing as expected.
4. **Bot orders pipeline (`generate-bot-corps-orders` + `generate-bot-brigade-orders`)** — `src/sim/turn_phases/war_phases.ts:1148` and `:1343`. Combined 562 ms/turn / 18.2% of total. Investigate the per-corps commander loop in `src/sim/combat/commander/commander_loop.ts:141` (`runCommanderForCorps`) and `src/sim/combat/bot_brigade_ai_osid.ts`. CoV is moderate (0.25 / 0.32) — work scales with corps/brigade count. Check whether briefing builder (`buildBriefing`) or predictor (`estimateForceRatio`) calls are recomputed when inputs are unchanged.
5. **`reconcileFinalSectorTruth`** — `src/sim/combat/final_sector_truth_reconciliation.ts:72`. 231 ms/turn. Per the 2026-04-23 ledger note, this is the final sweep after late writers. Profile the rebuild path: how often does the content fingerprint actually short-circuit it vs. forcing a full rebuild?

---

## Boundaries respected

- READ-ONLY at end state. Instrumentation was added to `src/scenario/scenario_runner.ts` ONLY, then reverted — verified via `git status` / `git diff` after run.
- No fixes proposed in this report.
- No other lanes' files touched.
- Single 40w run (no repeat measurement).
- Determinism preserved: instrumentation uses synchronous `process.hrtime.bigint()` reads inside an `await orig(ctx)` wrapper that preserves the original step's promise semantics. Run `final_state_hash` is consistent with the n1626 lineage.

---

## P0 flag (>1 s per turn)

Flagged — every turn exceeds 1 s by a large margin (mean 3.1 s, min 2.65 s, max 5.8 s). The "P0 if >1 s/turn" rule is met on every single one of the 40 turns measured. Per lane scope, **NOT fixing in this lane**; recorded for v0.9.3 perf-roadmap planning input.
