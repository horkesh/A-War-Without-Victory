# v0.9.3 Performance Profiling — 40w Baseline

**Date:** 2026-04-22
**Scenario:** `data/scenarios/apr1992_definitive_40w.json` (40 turns, determinism seed)
**Method:** per-step wall-time instrumentation via temporary `warPhases[*].run` wrapper. Source: Lane 4 agent draft; resuscitated and extended after the agent died silently from a read-only ES Module export bug in its original `runTurn` reassignment.

## Summary

| Metric | Value | v0.9.3 target (plan) |
|---|---|---|
| Total wall time (40w) | **80.0s** | n/a — baseline |
| Avg per-turn wall time | ~2.0s | <100ms |
| RSS peak | 506 MB | 208-turn memory audit pending |
| End heap | 175 MB | — |
| Instrumented step coverage | 90% of wall time | — |
| Distinct pipeline steps | 165 | — |

The plan's <100ms/turn target is **20× away** from this baseline. No single change closes that gap; it's a cumulative compression problem.

## Hot paths (top 10 pipeline steps)

| Rank | Step | Total (40w) | % | Avg/turn |
|---|---|---|---|---|
| 1 | `generate-bot-corps-orders` | 11.8s | 16.4% | 295ms |
| 2 | `supply-osid` | 11.3s | 15.7% | 282ms |
| 3 | `partition-corps-front-sectors` | 6.0s | 8.3% | 150ms |
| 4 | `reconcile-final-sector-truth` | 5.8s | 8.0% | 144ms |
| 5 | `reconcile-final-sector-truth-after-ops` | 5.5s | 7.7% | 137ms |
| 6 | `generate-bot-brigade-orders` | 5.2s | 7.2% | 129ms |
| 7 | `phase-f-displacement` | 2.0s | 2.8% | 50ms |
| 8 | `update-displacement` | 1.9s | 2.6% | 46ms |
| 9 | `supply-resolution` | 1.8s | 2.5% | 46ms |
| 10 | `update-sustainability` | 1.8s | 2.5% | 45ms |

**Top 6 steps consume 63% of runtime.** The remaining 155 steps split the other 27%.

## Cross-cutting hotspot

`buildOsidAdjacency(edges)` is called from **26 distinct production files** (grep count). It rebuilds a ~6000-node adjacency `Map<string, string[]>` from edge records every call. It sits inside the sector, supply, movement, and targeting steps — likely dominates several of the top-6 pipeline steps. This is a cache-first candidate before any per-subsystem optimization.

## Optimization candidates (ranked by ROI/risk)

### C1 — Memoize `buildOsidAdjacency` per turn (HIGH ROI, LOW RISK, **S**)

Current behavior: 26 call sites reconstruct the same adjacency map from the same `edges` array every call, every turn. The result is a pure function of the edge set, which changes only on terrain or (rarely) sector-structure events.

Minimal fix: attach a memo keyed by edge-array identity (WeakMap or simple "edges === lastEdges" guard) so the 26 call sites share one build per turn at minimum.

- **Saving estimate:** 5-10% of total runtime if the map build is genuinely pure and called ≥N times/turn where N > 1. Conservative: 3-5s / 40w.
- **Determinism risk:** near-zero — the function is pure on its inputs; a memo doesn't change output.
- **Effort:** S. One file (`osid_adjacency.ts`), one memoization wrapper, no API change.
- **Proof path:** re-run profiler after; expect `supply-osid` + sector steps to drop 10-25%.

### C2 — Cache supply-reachability invalidated on control flips only (HIGH ROI, MEDIUM RISK, **M**)

Current behavior: `supply-osid` runs BFS per OSID per turn. 282ms/turn × 40 = 11.3s. The reachability graph changes only when political_controllers flip (typically <50 OSIDs/turn out of 5822 tracked).

Fix shape: cache per-faction reachability sets; invalidate entries for OSIDs that flipped this turn (or their neighborhood). Recompute only the dirty subset.

- **Saving estimate:** 40-60% of `supply-osid` → 5-8% of total runtime.
- **Determinism risk:** medium — invalidation correctness matters; need tests proving cached-vs-recomputed equivalence over a 40w run.
- **Effort:** M. Isolates to `supply-osid` step and its readers.
- **Proof path:** a property-based test that runs 40w with and without the cache and asserts byte-identical `final_save.json`.

### C3 — Cache per-corps zone-assessment across turns where inputs are stable (MEDIUM ROI, MEDIUM RISK, **L**)

Current behavior: `generate-bot-corps-orders` = 11.8s / 295ms/turn / 10 corps × 40 turns = ~30ms per corps-directive. The commander loop (PERCEIVE-DECIDE-EXECUTE) regenerates zone assessments every turn.

Observation from `src/sim/combat/commander/`: zone assessments are computed from sectors + intel + force balance. Sectors change at turn boundaries; intel ticks; force balance changes on combat. But zone **topology** (which OSIDs a corps considers its zone) is stable for many turns.

Fix shape: split the assessment into a cacheable topology phase and a per-turn evaluation phase. Only the latter needs to re-run every turn.

- **Saving estimate:** 30-40% of commander step → 4-6% of total runtime.
- **Determinism risk:** higher — commander loop is decision-sensitive. Invalidation bugs could produce stale decisions that look plausible but aren't.
- **Effort:** L. Touches commander assess/allocate/plan and requires a full regression (40w calibration comparison, 27/27 anchors, 6/6 benchmarks).
- **Proof path:** baseline manifest hash equality. If the cache is correct, `final_save.json` is byte-identical. If it drifts, the cache is broken.

### C4 — Consolidate 3 displacement passes into one (LOW ROI, LOW RISK, **M**)

`phase-f-displacement` + `update-displacement` + `hostile-takeover-displacement` together take ~5.1s / 7%. They share intermediate state (adjacency, friendly-neighbor sets, settlement-by-mun maps) that each rebuilds.

Fix shape: single displacement pipeline step that runs all three passes against shared precomputed data.

- **Saving estimate:** 20-30% of displacement → 1.5-2% of total.
- **Determinism risk:** low — internally reordering shared computation but preserving the three semantic passes.
- **Effort:** M. Touches 3 files, refactor not new behavior.
- **Proof path:** 40w byte-identity.

### C5 — Rework sector reconciliation to compute once after final writers (MEDIUM ROI, HIGH RISK, **L**)

Current behavior: `partition-corps-front-sectors` + `reconcile-final-sector-truth` + `reconcile-final-sector-truth-after-ops` = 17.3s / 24%. Three separate sector-truth passes, each scanning all 165-step pipeline's worth of late writers.

The napkin explicitly warns sector-truth is a delicate area (multiple recent life lessons on "late writers require final reconciliation"). Any change here must preserve current invariants exactly.

Fix shape: identify the subset of late writers that actually mutate sector identity (as opposed to brigade assignment within a sector). Run full reconciliation only after those specific writers; run a cheap brigade-only rebalance after the rest.

- **Saving estimate:** 30-40% of the 3 sector steps → 7-10% of total runtime.
- **Determinism risk:** HIGH — this is the kind of change that could silently drift sector truth and cost a calibration anchor.
- **Effort:** L. Requires a `/sector-expert` review per napkin.
- **Proof path:** 40w byte-identity + deep sector-truth audit.

## What's missing from this baseline

- **Per-turn heap trajectory.** The original Lane 4 instrumentation tried to wrap `runTurn` for per-turn heap snapshots; ES Module export read-only blocked it. A second pass using `AsyncLocalStorage` or event-based instrumentation is needed to catch heap growth over time (especially for the 208-turn audit the plan calls for).
- **V8 CPU profile.** A `--cpu-prof` capture would show leaf-function hot spots inside the top pipeline steps — e.g., is it `buildOsidAdjacency`, array allocation, JSON stringify, or serialization dominating `supply-osid`? That's a follow-up.
- **Cold-start / startup time.** Plan targets <3s startup; not measured here.
- **Accessibility scope** (keyboard, colorblind, rebinds, text scaling) — orthogonal to this pass; separate work.

## Recommended next steps

1. **Ship C1 first.** Small, safe, likely 3-5% savings for near-zero risk. Prove the harness + proof-path before committing to larger changes.
2. **Ship C2 with a byte-identity regression test.** 5-8% savings; tests protect determinism.
3. **Re-profile after C1+C2.** The ranking shifts once the `buildOsidAdjacency` dominance is removed, and C3/C4/C5 priorities should be re-evaluated against the new distribution.
4. **Defer C3 and C5** pending a `/sector-expert` + `/corps-army-commander` review per napkin protocol. C5 especially should not land without canon sign-off.

## Reproduction

```sh
# Temp harness (should be deleted after this ledger entry; file excluded
# from git via .git/info/exclude during this session, tracked at rest via
# deletion):
npx tsx tools/scenario_runner/run_scenario_profiled.ts \
  --scenario data/scenarios/apr1992_definitive_40w.json \
  --out /tmp/awwv_profile/out \
  > /tmp/awwv_profile/report.json 2> /tmp/awwv_profile/run.stderr

# Report is contaminated with stdout noise from the scenario runner; extract
# the JSON tail:
sed -n '19,$p' /tmp/awwv_profile/report.json > /tmp/awwv_profile/report_clean.json
```

Raw JSON report retained at `/tmp/awwv_profile/report_clean.json` for this session. Not committed — ephemeral measurement artifact.

## Lane 4 status

**Research-phase deliverable only.** No code optimizations in this pass per the Lane 4 brief. The five candidates above are concrete enough that any one of C1–C4 can be landed as a single-commit optimization with its own regression test; C5 needs expert review first.
