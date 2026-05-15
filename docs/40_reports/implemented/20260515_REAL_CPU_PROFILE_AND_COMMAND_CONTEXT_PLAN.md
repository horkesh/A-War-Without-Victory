# Real CPU Profile And Commander Context Plan

**Date:** 2026-05-15
**Scenario:** `data/scenarios/apr1992_definitive_40w.json`
**Retained run:** `data/derived/_debug/cpu_profile_runs/apr1992_definitive_40w__3649b3861a87e6ea__w40`
**Final hash:** `0cb626c032204372`
**Result:** The nested label loop is no longer the main lane selector; real V8 profiling shows larger algorithmic hotspots outside commander micro-labels.

## Summary

- Added deterministic V8 `.cpuprofile` summary tooling under `tools/perf/`.
- Ran a full 40w Node/V8 CPU profile with the old label profiler off.
- Rejected the unfinished n1841 commander officer lookup candidate because the real profile did not justify a new commander-only lookup lane.
- Commander and bot-order reuse should be handled as one coherent read-only decision context, not more one-off cache lanes.
- Performance is parked after this report unless a future real profile exposes an obvious large win.

## Commands

```powershell
node --cpu-prof --cpu-prof-dir data/derived/_debug/cpu_profile --cpu-prof-name awwv_40w_retained.cpuprofile --import tsx tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out data/derived/_debug/cpu_profile_runs
node --import tsx tools/perf/analyze_cpu_profile.ts --profile data/derived/_debug/cpu_profile/awwv_40w_retained.cpuprofile --app-root F:/A-War-Without-Victory --application-only --top 30 --json-out data/derived/_debug/cpu_profile/awwv_40w_retained.summary.json --markdown-out data/derived/_debug/cpu_profile/awwv_40w_retained.summary.md
```

Raw profile and summary artifacts stayed under `data/derived/_debug/` and are not intended for staging.

## Top Self-Time Frames

Sampled time: 119334.695ms. Samples: 76427. Application frames: 1507.

| Rank | Function | Self ms | Total ms | Location |
|---:|---|---:|---:|---|
| 1 | `loadSettlementGraph` | 11126.555 | 11696.176 | `src/map/settlements.ts` |
| 2 | `buildAdjacencyMap` | 4682.158 | 4682.158 | `src/map/adjacency_map.ts` |
| 3 | `computeFrontEdges` | 3751.367 | 6170.281 | `src/map/front_edges.ts` |
| 4 | `streamFinalizeReplaySaveSequenceFromJsonl` | 3111.643 | 4654.159 | `src/scenario/replay_save_emit.ts` |
| 5 | `bfsReachable` | 2536.692 | 2536.692 | `src/sim/combat/osid_graph_analysis.ts` |
| 6 | `getSettlementControlStatus` | 2481.356 | 2481.356 | `src/map/settlements.ts` |
| 7 | `countActiveBrigadesByOsid` | 2266.225 | 2266.225 | `src/sim/combat/corps_front_sectors.ts` |
| 8 | `normalizeFinalSectorBuckets` | 2013.375 | 2142.593 | `src/sim/combat/final_sector_truth_reconciliation.ts` |

## Top Total-Time Frames

| Rank | Function | Total ms | Total % | Location |
|---:|---|---:|---:|---|
| 1 | `runTurn` | 45675.838 | 38.28 | `src/sim/turn_pipeline.ts` |
| 2 | `buildCorpsFrontSectors` | 26072.294 | 21.85 | `src/sim/combat/corps_front_sectors.ts` |
| 3 | `reconcileFinalSectorTruth` | 15082.997 | 12.64 | `src/sim/combat/final_sector_truth_reconciliation.ts` |
| 4 | `runScenario` | 14388.728 | 12.06 | `tools/scenario_runner/run_scenario.ts` |
| 5 | `loadSettlementGraph` | 11696.176 | 9.80 | `src/map/settlements.ts` |
| 6 | `buildFactionSectors` | 8704.332 | 7.29 | `src/sim/combat/corps_front_sectors.ts` |
| 7 | `botOrdersPerfTime` | 8184.640 | 6.86 | `src/sim/combat/bot_orders_perf.ts` |
| 8 | `generateAllCorpsOrders` | 6828.184 | 5.72 | `src/sim/combat/bot_corps_ai.ts` |

`botOrdersPerfTime` is an attribution wrapper in this profile: self time is only 202.028ms. The useful signal is the inclusive work below it, not the wrapper label.

## Algorithmic Hotspots

1. Sector reconstruction and final-sector reconciliation are the largest measured wall-clock boundary. The profile points at `buildCorpsFrontSectors`, `buildFactionSectors`, `reconcileFinalSectorTruth`, `normalizeFinalSectorBuckets`, `countActiveBrigadesByOsid`, `canAnyBrigadeReachAny`, `buildEdgeAdjacency`, floor recovery, and merged-sector sealing.

2. Static map/front graph work is still large. `loadSettlementGraph`, `buildAdjacencyMap`, `computeFrontEdges`, `bfsReachable`, and `analyzeFactionGraphOptimized` indicate repeated loading/reconstruction and graph analysis outweigh commander micro-labels.

3. Replay/final-save serialization is a product-visible wall-clock lane. `toDeterministicJsonValue`, `serializeState`, `serializeGameState`, `buildReplayFrameRow`, and `streamFinalizeReplaySaveSequenceFromJsonl` are not sim decision logic, but they consume meaningful run time.

4. Commander/bot-order CPU is now second-tier. `generateAllCorpsOrders` is 6828.184ms inclusive, `executeFactionDirectivesImpl` is about 930ms, `runCommanderForCorps` is about 650ms, and `emitCommanderOutput` is about 329ms. That no longer justifies another isolated commander officer-lookup cache.

## n1841 Candidate Disposition

The unfinished n1841 candidate attempted to build a commander pass-level officer lookup and thread it through `runCommanderForCorps(...)` and `emitCommanderOutput(...)`. The retained V8 profile did not show that as a top wall-clock boundary. The candidate was reverted, while the existing direct-probe batch-level `OfficerCombatLookup` remains.

The profile still shows `getThreeTierOfficerMod` at about 524.5ms self across the broader combat math surface, but that is not the same as the commander direct-probe lookup lane. A future change should only revisit officer lookup inside a broader shared decision context or after a real profile identifies a larger officer boundary.

## Repeated Data Construction Map

Current repeated construction spans these boundaries:

| Boundary | Repeated data |
|---|---|
| Faction order pass | adjacency, faction graph analysis, active formation locations, sector assignment, brigade counts, sector-defense lookup, corps-territory sets, lazy officer lookup |
| Commander corps pass | corps subordinate lists, faction corps list, briefing sector slices, adjacent corps summaries, enemy equipment support maps |
| Commander briefing | corps sector lookup, fatigue/intel/enemy-equipment summary, adjacent corps scan, friendly support context |
| Commander emit/predictor | terrain cache, direct target list, sector lookup, officer lookup, front-density lookup, defender lists and powers |
| Brigade evaluator | sector assignment, assigned front OSIDs, same-position counts, adjacent enemies, defender sector coverage, territory membership, officer lookup |
| Direct tests/callers | local fallbacks for isolated `buildBriefing(...)`, `predictCombatOutcome(...)`, `getCorpsSubordinates(...)`, `getFactionCorps(...)`, and `findBrigadeSectorId(...)` |

## Proposed Shared Context

Introduce one bounded read-only `FactionCombatDecisionContext` built once per faction order pass, after sector stance/truth is current and before commander briefing plus bot-order evaluation. It should not be persisted.

The context should own:

- Sorted active formations by faction/corps and `corpsSubordinatesByCorps`.
- Faction corps metadata, including synthetic corps facts currently inferred through fallback scans.
- Sector indexes by faction, corps, sector id, brigade id, friendly front OSID, territory OSID, and defender faction+OSID.
- Active formation locations by faction, adjacent enemy OSIDs by location, brigade counts by OSID, and corps territory OSID sets.
- Existing graph-analysis, adjacency, terrain, supply, ethnic, and population references as read-only inputs.
- Lazy memoized helpers for expensive late branches, especially `getOfficerCombatLookup()` and sector-local front-density lookup.

Consumers:

- `generateAllCorpsOrders(...)` builds the context and passes it to commander and evaluator phases.
- `buildBriefing(...)` consumes subordinates, faction corps, sector slices, adjacent corps summaries, and enemy equipment context.
- `emitCommanderOutput(...)` and `predictCombatOutcome(...)` consume terrain, sector lookup, lazy officer lookup, and optional front-density helpers.
- `executeFactionDirectivesImpl(...)` and brigade evaluators consume the sector assignment/count/location/defense/territory slices through `BrigadeEvaluationContext`.

## Safe To Implement Now

- Extract existing pass-local caches into the shared context without changing formulas or write order.
- Thread the context through optional parameters while preserving direct-call fallbacks.
- Build `getFactionCorps(...)` from indexed subordinate data when available.
- Reuse existing sector-defense and enemy-equipment indexes instead of constructing similar OSID-to-sector maps twice.
- Keep officer lookup and front-density indexes lazy; do not rebuild full-state indexes eagerly.
- Add focused tests that prove stable ordering, fallback compatibility, and no mutation of cached arrays/sets by callers.

## Needs Design Or Canon Review

- Sharing a decision context across turns or across multiple war-phase write steps.
- Treating derived sector truth inside the context as a source of truth.
- Reusing predicted combat outcomes across order issuers or turns.
- Changing sector reconciliation, owner precedence, or physical sector ownership rules.
- Changing replay/final-save emission contracts as a performance optimization rather than an explicit product decision.

## Park Performance

The next high-value lane is formation-life believability, not more CPU work. The real profile says commander/bot-order micro-work is no longer the largest wall-clock boundary, while `MASTER_ROADMAP.md` still marks formation-life believability as partial: drift, far-from-home live ownership, active-never-fights formations, and HRHB/HVO offensive emergence remain player-facing believability debt.

The companion report `docs/40_reports/implemented/20260515_FORMATION_LIFE_WARNING_CLASSIFICATION.md` executes the first bounded formation-life task: classify fresh 40w warning families, assign likely owners, and define the next implementation packet.

## Validation

- Red first: `npm.cmd run test:vitest:fast -- -- tests/cpu_profile_analysis.test.ts` failed before `tools/perf/cpu_profile_analysis.ts` existed.
- Green focused: `npm.cmd run test:vitest:fast -- -- tests/cpu_profile_analysis.test.ts` passed 2/2.
- Green focused after n1841 revert and path-neutral fixture cleanup: `npm.cmd run test:vitest:fast -- -- tests/cpu_profile_analysis.test.ts tests/bot_orders_perf_profile.test.ts` passed 7/7.
- `npm.cmd run typecheck` passed.
- Retained 40w V8 profile kept final hash `0cb626c032204372`.
