# SECTOR_MASTER — Corps Front Sector System

**Owner:** Gameplay Programmer / Technical Architect
**Updated:** 2026-06-05 (post-#208 sector floor reconciliation)
**Diagnostic:** `tools/sector_deep_exam.cjs`, `tools/check_sector_split.cjs`, `tools/check_sector_split2.cjs`, `tools/check_sector_contiguity_all.cjs`

---

## 2026-06-05: Coverage BFS target cache (byte-identical)

**Change:** `src/sim/combat/brigade_assignment.ts` `ensureMinimumSectorCoverage(...)` now selects the nearest vacant local front target with one bounded BFS from the brigade location instead of running `bfsDistance(...)` once per candidate target.

**Determinism:** The vacant target set is invocation-local, BFS expands by existing adjacency order, and same-distance targets are sorted with `strictCompare(...)` before selection. No cross-turn cache, save field, sector ordering, scenario data, combat math, or serialized output changed.

**Verification:** Focused sector instrumentation and truth-preservation tests passed 34/34, the broader sector regression pack passed, typecheck passed, strict-null inventory remained total 507, the 40w timed run preserved hash `aa8f7a07962cecaf`, consistency validation passed on `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2021`, and baseline regression reported all scenarios matching.

**Report:** [implemented/20260605_SECTOR_COVERAGE_BFS_TARGET_CACHE.md](implemented/20260605_SECTOR_COVERAGE_BFS_TARGET_CACHE.md)

---

## 2026-06-05: Current hash reconciliation after OOB refloors

**Change:** The active sector/frontline performance floor is reconciled to current `main` after the June 5 OOB calibration refloors. The prior `e086afbefcef01e6` floor remains valid history for the 2026-06-03 coverage-component-cache slice, but it is no longer the pre-change floor for new sector optimization work.

**Current floor:** `d1ace172a29b2353` after PR #208 / commit `74881faf7` corrected HVO Southeast-Herzegovina OZ HQ from Čitluk to Mostar and refloored golden baselines. The PR #208 calibration verdict held 30/30 anchors, 6/6 bot benchmarks, byte-identical net control counts (RS=369/RBiH=254/HRHB=89), 0 critical anomalies, and local SE/central Herzegovina control-delta blast radius. PR #200 `aa8f7a07962cecaf`, PR #199 `2043a49789fa21be`, and PR #180 `41ba34ddfaa02a85` are historical OOB floor lineage.

**Historical evidence:** Pre-#180 40w timed run `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2019` produced final hash `41c72b13ad2e91b9`, passed 30/30 anchors, reported 0 critical anomalies, and passed `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n2019`. The old `e086afbefcef01e6` run `n2017` now fails current consistency validation with an empty contested sector, one wide undefended front subsegment, and adjacent uncontested `op:zavidovici:cardak_2` exposure. This points to accepted mainline final-sector-truth drift, not a sector-performance regression.

**Next gate:** Before any new sector/frontline optimization, re-profile from current `main` against `d1ace172a29b2353`; stop on unexpected hash drift until the new floor is explicitly reconciled.

**Report:** [implemented/20260604_SECTOR_HASH_RECONCILIATION.md](implemented/20260604_SECTOR_HASH_RECONCILIATION.md)

---

## 2026-06-03: Coverage component cache (byte-identical)

**Change:** `src/sim/combat/brigade_assignment.ts` `ensureMinimumSectorCoverage(...)` now caches `getSectorComponent(...)` results inside one coverage invocation and reuses them for donor/recipient filtering.

**Determinism:** The cache is keyed by the live `CorpsFrontSector` object and is discarded before the next invocation. It reads only sector geometry fields that are stable during the coverage pass; brigade assignment mutations continue to use the existing deterministic ordering. No cross-turn cache, save field, scenario data, combat math, sector id ordering, or serialized output changed.

**Verification:** Focused instrumentation passed 26/26, the focused sector regression pack passed, profiled and timed 40w runs preserved hash `e086afbefcef01e6`, and baseline regression reported all scenarios matching. Typecheck in the isolated worktree is blocked by pre-existing UI optional-package declaration gaps.

**Report:** [implemented/20260603_SECTOR_COVERAGE_COMPONENT_CACHE.md](implemented/20260603_SECTOR_COVERAGE_COMPONENT_CACHE.md)

---

## 2026-05-26: Front-edge metadata lookup reuse (byte-identical)

**Change:** `buildCorpsFrontSectors(...)` already builds pass-local `globalEdgeMeta`; `buildFactionSectors(...)` now passes that map into `buildMultiSectorsForCorps(...)`. The builder checks shared metadata first and only constructs the old per-corps `osidFrontEdges` lookup through lazy fallback when shared metadata is absent or missing an edge.

**Determinism:** The shared map is invocation-local and read-only at the API boundary. `buildMultiSectorsForCorps(...)` still iterates per-corps `edgeIds` in writer order, copies selected metadata into a fresh local map, and keeps direct/synthetic caller fallback behavior. No cross-turn cache, save field, sector id ordering, scenario data, random source, or serialized output changed.

**Verification:** Focused sector tests passed 27/27, baseline regression passed with all scenarios matching, and `git diff --check` passed. A comparable safe 40w profile preserved final hash `f219401f4a17f311`; wall time moved 103.310s -> 91.556s and `partition-corps-front-sectors` moved 7122.405ms -> 6503.316ms.

**Report:** [implemented/20260526_SECTOR_EDGE_METADATA_LOOKUP_REUSE.md](implemented/20260526_SECTOR_EDGE_METADATA_LOOKUP_REUSE.md)

---

## 2026-05-23: Sector enemy-personnel index (byte-identical)

**Change:** `src/sim/combat/brigade_assignment.ts` now builds one invocation-local active enemy-personnel-by-OSID index in `classifyBrigadesByTerritory(...)` and `recomputeSectorPowerAndThreat(...)`. Sectors now sum their local `enemy_osids` from the index instead of rescanning all formations per sector.

**Determinism:** The helper iterates formation ids with `strictCompare`, applies the same active enemy combat-formation filters, and keeps the map inside the current function call. No cross-turn cache, save field, combat formula, operation behavior, or output contract changed.

**Verification:** Red static characterization failed before implementation because the reusable index was absent. After implementation, instrumentation/static guard passed 20/20, sector regression pack passed 38/38, brigade assignment pack passed 57/57, `npm.cmd run typecheck` passed, `npm.cmd run sim:scenario:run:40w:timed` preserved hash `30abd0696b9d7e24`, and `npm.cmd run test:baselines` passed with all scenarios matching. Post-change profile reported `partition-corps-front-sectors=6799.566ms` and `reconcile-final-sector-truth=7071.455ms`; normalized child buckets reduced RS territory assignment `430.764ms -> 237.213ms`, RBiH territory assignment `378.724ms -> 244.236ms`, RS recompute-power `107.362ms -> 25.238ms`, and RBiH recompute-power `89.722ms -> 23.900ms`.

**Report:** [implemented/20260523_SECTOR_ENEMY_PERSONNEL_INDEX.md](implemented/20260523_SECTOR_ENEMY_PERSONNEL_INDEX.md)

---

## 2026-05-23: Sector BFS queue cursor (byte-intended)

**Change:** `mergeUndersizedSectors(...)` friendly component precompute and `walkEdgeChain(...)` now use `head` cursor queues instead of `Array.shift()`. FIFO order and neighbor insertion order are unchanged, but repeated array reindexing is avoided.

**Determinism:** No cache or ordering change. Neighbor ordering remains the same; the cursor consumes the same queue entries in the same order as `shift()`.

**Verification:** Red static characterization failed before implementation because both sector split BFS regions still contained `.shift()`. After implementation, focused sector tests passed 31/31, `npm.cmd run typecheck` passed, sector regression pack passed 67/67, profiled 40w hash remained `30abd0696b9d7e24`, and consistency validation passed with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. `git diff --check` passed.

**Report:** [implemented/20260523_SECTOR_BFS_QUEUE_CURSOR.md](implemented/20260523_SECTOR_BFS_QUEUE_CURSOR.md)

---

## 2026-05-23: Sector slice edge sort fold (byte-intended)

**Change:** `buildSectorSliceFromSubSegment(...)` now sorts `subSegment.edge_ids` once, assigns the sorted list to sector-level `edge_ids`, and gives the nested sub-segment a copied version of that same sorted list. This removes a duplicate `strictCompare` sort while preserving separate arrays and existing output shape.

**Determinism:** No cache or ordering change. The one remaining sort still uses `strictCompare`; the nested array copy preserves no-aliasing behavior.

**Verification:** Red static characterization failed before implementation because the helper sorted `subSegment.edge_ids` twice. After the fold, instrumentation/static contract passed 18/18, `npm.cmd run typecheck` passed, sector regression pack passed 66/66, profiled 40w hash remained `30abd0696b9d7e24`, and consistency validation passed with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. `git diff --check` passed.

**Report:** [implemented/20260523_SECTOR_SLICE_EDGE_SORT_FOLD.md](implemented/20260523_SECTOR_SLICE_EDGE_SORT_FOLD.md)

---

## 2026-05-23: Split-pieces renumber elision (byte-intended)

**Change:** `splitNonContiguousSectors(...)` now accepts default-preserving options, with `{ renumberResult: false }` used only by `enforceFinalSectorGeometryInvariants:split-pieces`. Public/default callers still get sorted and renumbered sectors. The final-geometry caller already sorts contiguous pieces and then overwrites every sector/sub-segment id, so the inner sort/renumber was redundant compute in this call path.

**Determinism:** The option is invocation-local and adds no cache. The final-geometry caller owns canonical id assignment after the call, preserving observable sector ids. Focused tests now guard both default renumbering and caller-owned id preservation.

**Verification:** Focused split test passed 12/12. Sector regression pack passed 65/65. `npm.cmd run typecheck` passed. A profiled 40w scenario with `PERF_PROFILE_SECTOR_PARTITION=true` completed at hash `30abd0696b9d7e24`; consistency validation passed with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. `npm.cmd run test:baselines` passed with no manifest update. `git diff --check` passed.

**Report:** [implemented/20260523_SECTOR_SPLIT_PIECES_RENUMBER_ELISION.md](implemented/20260523_SECTOR_SPLIT_PIECES_RENUMBER_ELISION.md)

---

## 2026-05-21: Zero-assigned coverage attribution (byte-identical)

**Change:** `src/sim/combat/brigade_assignment.ts` `ensureMinimumSectorCoverage(...)` now splits `territory-claim-rescue:zero-assigned` into four deterministic child labels: `:promote-reserve`, `:pull-rear`, `:pull-reserve`, and `:transfer-surplus`. The early-exit control flow is preserved by returning booleans from the timed children and continuing the outer loop at the same points.

**Byte-identity:** The post-change 40w profile produced the same deterministic artifacts as the cross-corps component-index baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, `end_report.md`, and `watched_operations.json` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_zero_assigned_subsplit_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** In the clean 94-invocation sidecar batch, `zero-assigned` splits into `:pull-rear` 275.737ms, `:pull-reserve` 264.345ms, `:promote-reserve` 245.887ms, and `:transfer-surplus` 19.009ms. Parent `zero-assigned` is effectively stable at 836.103ms -> 831.096ms. Do not optimize `:transfer-surplus` from this evidence.

**Report:** [implemented/20260521_ZERO_ASSIGNED_COVERAGE_ATTRIBUTION.md](implemented/20260521_ZERO_ASSIGNED_COVERAGE_ATTRIBUTION.md)

---

## 2026-05-21: Cross-corps component edge index (byte-identical)

**Change:** `src/sim/combat/sector_territory.ts` `consolidateCrossCorpsFronts(...)` now traverses connected components with an index cursor instead of `queue.shift()`, and builds one per-component `componentEdgesByCorps` map while counting ownership. Minority-corps zero-edge and brigade-presence protection checks reuse that component edge list instead of rescanning all component edges per corps.

**Byte-identity:** The post-change 40w profile produced the same deterministic artifacts as the OSID-to-corps prefilter baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, `end_report.md`, and `watched_operations.json` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_cross_corps_component_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** In the clean 94-invocation sidecar batch, recovery setup `:cross-corps-consolidation` drops from 278.967ms to 272.419ms. Build-faction front-edge consolidation drops for RS 131.084ms -> 124.293ms and RBiH 120.643ms -> 109.385ms, with HRHB effectively flat at 31.654ms -> 31.815ms. Parent recovery setup moved noisily upward at 873.043ms -> 887.333ms, so this is classified as a narrow child-bucket reduction rather than a total wall-clock win.

**Report:** [implemented/20260521_CROSS_CORPS_COMPONENT_INDEX.md](implemented/20260521_CROSS_CORPS_COMPONENT_INDEX.md)

---

## 2026-05-21: Isolated-pocket location index (byte-identical)

**Change:** `src/sim/combat/sector_territory.ts` `consolidateIsolatedCorpsPockets(...)` now builds one invocation-local corps-location index before processing components. The home-brigade protection check no longer scans every formation for every isolated pocket edge; it reads the same formation facts through the local index.

**Byte-identity:** The post-change 40w profile produced the same deterministic artifacts as the recovery setup attribution baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, `end_report.md`, and `watched_operations.json` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_isolated_pocket_location_index_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** In the clean 94-invocation sidecar batch, `recoverDroppedFrontEdges:faction-front-claim-setup:isolated-pocket-consolidation` drops from 582.834ms to 197.511ms, and the parent `recoverDroppedFrontEdges:faction-front-claim-setup` drops from 1288.512ms to 882.674ms. Main build isolated-pocket labels also drop: RS 258.333ms -> 105.114ms, RBiH 274.059ms -> 101.004ms, HRHB 52.795ms -> 24.928ms.

**Report:** [implemented/20260521_ISOLATED_POCKET_LOCATION_INDEX.md](implemented/20260521_ISOLATED_POCKET_LOCATION_INDEX.md)

---

## 2026-05-21: OSID-to-corps prefilter (byte-identical)

**Change:** `src/sim/combat/sector_territory.ts` `mapOsidsToCorps(...)` now builds one sorted active same-faction combat-formation list plus invocation-local corps membership sets. The function reuses that list across home-vote, home-municipality, current-location, and disconnected-pocket passes instead of repeating the same status/kind/faction/corps checks.

**Byte-identity:** The post-change 40w profile produced the same deterministic artifacts as the isolated-pocket location-index baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, `end_report.md`, and `watched_operations.json` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_osid_to_corps_prefilter_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** In the clean 94-invocation sidecar batch, recovery setup `:osid-to-corps` drops from 333.054ms to 307.073ms. Build-faction OSID-to-corps labels also drop: RS 146.848ms -> 140.660ms, RBiH 131.772ms -> 123.287ms, HRHB 62.519ms -> 53.777ms. Parent recovery setup movement is small/noisy at 882.674ms -> 873.043ms.

**Rejected experiment:** A per-sector front/reserve/territory set cache inside `ensureMinimumSectorCoverage(...)` was byte-identical but slower (`sealMergedSectorTruth:ensure-coverage` 2064.183ms -> 2112.303ms), so it was reverted.

**Report:** [implemented/20260521_OSID_TO_CORPS_PREFILTER.md](implemented/20260521_OSID_TO_CORPS_PREFILTER.md)

---

## 2026-05-21: Recovery setup attribution (byte-identical)

**Change:** `recoverDroppedFrontEdges:faction-front-claim-setup` now records child labels for OSID-to-corps mapping, front-edge partition, cross-corps consolidation, isolated-pocket consolidation, friendly/component setup, and faction brigade component indexing. This is sidecar-only instrumentation under `PERF_PROFILE_SECTOR_PARTITION=true`.

**Byte-identity:** The attribution profile produced the same deterministic artifacts as the multi-source reachability baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, and `end_report.md` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_recovery_setup_attribution_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** In the clean 94-invocation sidecar batch, setup cost splits to isolated-pocket consolidation 582.834ms, OSID-to-corps 317.618ms, and cross-corps consolidation 294.750ms. Front-edge partition, friendly/component setup, and faction brigade component indexing are smaller.

**Report:** [implemented/20260521_RECOVERY_SETUP_ATTRIBUTION.md](implemented/20260521_RECOVERY_SETUP_ATTRIBUTION.md)

---

## 2026-05-21: Multi-source reachability for staffability checks (byte-identical)

**Change:** `src/sim/combat/sector_utils.ts` `canAnyBrigadeReachAny(...)` now performs one multi-source BFS per reachability query instead of one BFS per brigade location. It preserves the same max-hop, friendly-territory, and early-target semantics while avoiding repeated traversal during sector staffability checks.

**Byte-identity:** The post-change 40w profile produced the same deterministic artifacts as the label-split baseline: final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, and `end_report.md` are byte-identical. Consistency validation passed on `runs_perf/sector_reconstruction_multisource_reachability_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** Staffability buckets dropped from 194.482ms to 13.558ms for RBiH 2nd Corps, 185.285ms to 14.109ms for RBiH 3rd Corps, 86.585ms to 14.473ms for HVO Central Bosnia, and 28.312ms to 6.243ms for VRS 1st Krajina in the clean 94-invocation sidecar batch. A broader whole-frontier cache was tested and rejected because it was slower despite byte identity.

**Report:** [implemented/20260521_SECTOR_MULTI_SOURCE_REACHABILITY.md](implemented/20260521_SECTOR_MULTI_SOURCE_REACHABILITY.md)

---

## 2026-05-21: Build-faction post-classification label split (byte-identical)

**Change:** `src/sim/combat/corps_front_sectors.ts` now splits the ambiguous `buildFactionSectors:*:territory-voronoi` and duplicated `buildFactionSectors:*:post-classification-normalization` sidecar labels into deterministic child labels. Territory Voronoi now records `:assign` and `:repair-disconnected`; post-classification now separates rear normalization from truth normalization and splits truth normalization into `:dedup-initial`, `:enforce-ownership`, `:rehome-unassigned`, `:reclassify-rear`, and `:recompute-power`.

**Byte-identity:** Pre-edit current profile and post-edit label-split profile both produced final state hash `4368f50c00c464ad`; `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, and `end_report.md` are byte-identical between the two profiled runs. Consistency validation passed on `runs_perf/sector_reconstruction_label_split_profile/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`.

**New evidence:** The split shows `post-classification-truth-normalization:recompute-power` at 104.846ms (RS) + 87.539ms (RBiH), while `territory-voronoi:assign` is 65.001ms (RS) + 62.165ms (RBiH) and `:repair-disconnected` is lower. The larger current targets remain `corps-sector-construction` and `brigade-classification:territory-assignment`.

**Report:** [implemented/20260521_SECTOR_BUILD_FACTION_LABEL_SPLIT.md](implemented/20260521_SECTOR_BUILD_FACTION_LABEL_SPLIT.md)

---

## 2026-05-18: Batch 37 `:split-pieces` redundant normalize skip (byte-identical)

**Change:** `src/sim/combat/corps_front_sectors.ts` `enforceFinalSectorGeometryInvariants:split-pieces` inner loop now guards the per-piece `normalizeSectorSubSegmentsFromEdges(contiguousPiece, edgeMeta)` call on `contiguousPiece !== sector`. The seven pass-through paths inside `splitNonContiguousSectors` all `result.push(sector); continue;` — same object reference. The function's only mutation on pass-through is the trailing `result[i]!.sector_id = sector:${corpsId}:${i}` renumbering; `edge_ids` and `sub_segments` are untouched. The line-960 normalize (BEFORE `splitNonContiguousSectors`) already canonicalized the sector, and `normalizeSectorSubSegmentsFromEdges` is idempotent on already-normalized input — re-normalizing the pass-through reference is byte-identical compute that produces no observable state change (lines 992-995 then unconditionally overwrite `sub_segment_id`).

**Why byte-identical:** seven enumerated pass-through paths in `sector_splitting.ts` (lines 53, 81-84, 95-97, 103-106, 129-130, 206-209, 264-266) all `result.push(sector)` with the input reference. `normalizeSectorSubSegmentsFromEdges` reads `sector.edge_ids`, `sector.faction`, and `sector.sub_segments[0]`; none of these are mutated by pass-through `splitNonContiguousSectors`. The downstream `splitOversizedSubSegments` and `buildSectorSliceFromSubSegment` calls operate on the line-960-normalized `sub_segments` either way.

**Byte-identity:** 40w n1913 (default) hash `b14179d65639860c` matches baseline literally; consistency validator PASS (0 false owners / 0 disconnected sectors / 0 empty contested / 0 below-floor missed legal donors); per scenario-creator-runner-tester verdict: VERDICT: GO.

**Next target (carried):** `splitNonContiguousSectors` BFS reuse across same-corps sectors; `buildSectorSliceFromSubSegment` sort-fold; `splitNonContiguousSectors` trailing renumber elision in pass-through. After split-pieces hypotheses exhausted, `:voronoi-repair` (568 ms / 26%) is the runner-up perf target.

**Report:** [implemented/20260518_BATCH37_SECTOR_SPLIT_PIECES_PERF.md](implemented/20260518_BATCH37_SECTOR_SPLIT_PIECES_PERF.md)

---

## 2026-05-18: Batch 32 `enforceFinalSectorGeometryInvariants` 5-phase sub-attribution (byte-identical)

**Change:** Split the function body into five nested `_perfTime` children — `:setup`, `:split-pieces`, `:replace-sectors`, `:voronoi-repair`, `:seed-buckets`. Shared state hoisted to function-body scope before any wrapper (standard closure-mutation pattern). Optional `formations` captured into `formationsResolved` for the `:seed-buckets` callback to survive TS narrowing-loss.

**Run evidence (n1909, `PERF_PROFILE_SECTOR_PARTITION=true`):**

| Label | Aggregate ms | Calls | % of outer Σ | ms/call |
|---|---:|---:|---:|---:|
| `:1` outer | 912.79 | 94 | 42.3% | 9.71 |
| `:2` outer | 786.59 | 94 | 36.4% | 8.37 |
| `:3` outer | 458.85 | 53 | 21.3% | 8.66 |
| **outer Σ** | **2158.23** | 241 | 100% | — |
| `:setup` | 65.97 | 243 | 3.1% | 0.27 |
| `:split-pieces` | **1198.22** | 243 | **55.5%** | **4.93** |
| `:replace-sectors` | 24.94 | 243 | 1.2% | 0.10 |
| `:voronoi-repair` | 568.04 | 243 | 26.3% | 2.34 |
| `:seed-buckets` | 328.57 | 243 | 15.2% | 1.35 |
| **child Σ** | **2185.75** | 243 each | 101.3% | — |

Residual +27.5 ms / +1.3% maps to the 2-call surplus at the un-labeled line-1719 invocation (≈13.8 ms/call matches outer average). Clean attribution.

**Byte-identity:** 40w n1907 (default) and n1909 (flag-on) both `b14179d65639860c`; 27/27 anchors, 6/6 benchmarks.

**Next target:** `:split-pieces` (1198 ms / 55%) — inspect `splitNonContiguousSectors` BFS reuse across same-corps sectors and `normalizeSectorSubSegmentsFromEdges` double-call on single-piece sectors.

**Report:** [implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md](implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md)

## 2026-05-18: Batch 27 :floor-completion hoist attempt + revert (learning-only)

**Attempt:** Hoist `countActiveBrigadesByOsid(formations)` out of the per-recipient loop in `:floor-completion` — same pattern as Batch 25's successful -45% hoist on `:zero-assigned`.

**Result:** Byte-identical at the hash level (n1904 / n1905 both `b14179d65639860c`) BUT `:floor-completion` consistently REGRESSED: 696.4 ms (Batch 26 baseline) → 902.5 / 907.5 ms (~+30%, two confirmation runs). Reverted.

**Post-revert n1906:** hash `b14179d65639860c`, `:floor-completion` 710.1 ms (back within Batch 26 baseline variance).

**Hypothesis:** V8 Map lookup cost grows with the hash-table capacity, not just live entry count. The hoisted Map accumulates transient OSID entries across many recipients via in-place `moveBrigadeToFrontTarget` mutations; the per-recipient fresh build produces a tighter Map. The Batch 25 win held because that loop ran ~2-4 moves per recipient (small Map churn). The `:floor-completion` site mutates many more entries per pass and the cumulative sparseness dominates the saved rebuild cost.

**Durable rule:** Map-sparseness check before hoisting per-iteration `Map`-rebuild work in tight loops. Confirm empirically with TWO runs before declaring an optimization win. See `docs/40_reports/implemented/20260518_BATCH27_FLOOR_COMPLETION_HOIST_REVERT.md` for details + revert comment in source at line ~1891.

**Report:** [implemented/20260518_BATCH27_FLOOR_COMPLETION_HOIST_REVERT.md](implemented/20260518_BATCH27_FLOOR_COMPLETION_HOIST_REVERT.md)

## 2026-05-18: Batch 26 :severe-rescue sub-attribution (byte-identical)

**Change:** Phase E (`ensureMinimumSectorCoverage:severe-rescue`, ~290 lines) split into three nested `perfTime` children: `:quiet-self-relief` (~49 lines), `:floor-completion` (~98 lines), `:severe-relief` (~85+ lines).

**Run evidence (n1903):**

| Label | Aggregate ms | Calls | % of parent |
|---|---:|---:|---:|
| `:severe-rescue:floor-completion` | **696.4** | 1502 | 65.5% |
| `:severe-rescue:quiet-self-relief` | 249.7 | 1502 | 23.5% |
| `:severe-rescue:severe-relief` | 114.9 | 1502 | 10.8% |
| Parent `:severe-rescue` | 1063.4 | 1502 | 100% |

Children sum 99.8%; attribution overhead 0.2%.

**Byte-identity:** 40w n1903 hash `b14179d65639860c` matches Batch 17 baseline literally; 27/27 anchors, 6/6 benchmarks.

**Next target:** `:floor-completion` 696ms — line 1891 builds `activeCounts` per recipient; likely byte-identical hoist candidate (same pattern as Batch 25 saved 45%).

**Report:** [implemented/20260518_BATCH26_SEVERE_RESCUE_SUBSPLIT.md](implemented/20260518_BATCH26_SEVERE_RESCUE_SUBSPLIT.md)

## 2026-05-18: Batch 25 :zero-assigned activeCounts hoist (byte-identical optimization)

**Change:** Hoisted `countActiveBrigadesByOsid(formations)` out of the `.flatMap` callbacks in `ensureMinimumSectorCoverage` Step 1b (rear-brigade rescue) and Step 1c (reserve-brigade rescue). The per-donor rebuild was pure waste because `formations` is read-only across donor iterations within the step.

**Run evidence:**

| Label | Batch 24 (n1901) | Batch 25 (n1902) | Delta |
|---|---:|---:|---:|
| `:territory-claim-rescue:zero-assigned` | 1466.9 ms | **805.0 ms** | **-661.9 (-45.1%)** |
| `:territory-claim-rescue` (parent) | 1505.7 ms | ~842 ms | -664 ms |

**Byte-identity proof:** 40w n1902 hash `b14179d65639860c` matches Batch 17 baseline literally. validate_run_consistency PASS (0 violations); anchors 27/27; benchmarks 6/6; same call count (1502) confirms identical control flow.

**Cumulative sector-perf wins this session:** Batch 22 friendlyUniverse hoist (-1808 ms / -85%) + Batch 25 activeCounts hoist (-662 ms / -45%) = ~2.5 s saved on the 40w simulation bucket.

**Next target:** Sub-attribute `:zero-assigned` 805 ms into its 4 internal steps (Step 1/1b/1c/2) to identify the new dominant step, or drill `:severe-rescue` 1054 ms.

**Report:** [implemented/20260518_BATCH25_ZERO_ASSIGNED_ACTIVECOUNTS_HOIST.md](implemented/20260518_BATCH25_ZERO_ASSIGNED_ACTIVECOUNTS_HOIST.md)

## 2026-05-18: Batch 24 territory-claim-rescue sub-attribution (byte-identical)

**Change:** Nested two `perfTime` children inside `ensureMinimumSectorCoverage:territory-claim-rescue` — `:zero-front` (the original zero-front-sector territory rescue, ~57 lines) and `:zero-assigned` (the 4-step rescue Step 1 promote reserve / Step 1b pull rear / Step 1c pull reserve / Step 2 transfer surplus, ~125 lines).

**Run evidence (n1901):**

| Label | Aggregate ms | Calls | % of parent |
|---|---:|---:|---:|
| `:territory-claim-rescue:zero-assigned` | **1466.9** | 1502 | 97.4% |
| `:territory-claim-rescue:zero-front` | 36.8 | 1502 | 2.4% |
| Parent `:territory-claim-rescue` | 1505.7 | 1502 | 100% |

Attribution overhead 2 ms (<0.2%). Phase A cost is concentrated almost entirely in the 4-step `:zero-assigned` block.

**Byte-identity:** 40w n1901 hash `b14179d65639860c` matches Batch 17 baseline literally; 27/27 anchors, 6/6 benchmarks, validate_run_consistency PASS.

**Next target:** Drill `:zero-assigned` into its 4 inner steps OR hoist the per-step `countActiveBrigadesByOsid(formations)` rebuild that fires inside the `flatMap` callbacks at lines 1501/1532.

**Report:** [implemented/20260518_BATCH24_TERRITORY_CLAIM_RESCUE_SUBSPLIT.md](implemented/20260518_BATCH24_TERRITORY_CLAIM_RESCUE_SUBSPLIT.md)

## 2026-05-18: Batch 23 ensureMinimumSectorCoverage closure-hoist + 5-phase attribution (byte-identical)

**Change:** `ensureMinimumSectorCoverage(...)` in `src/sim/combat/brigade_assignment.ts` now records sidecar attribution for its five phases under labels `ensureMinimumSectorCoverage:{territory-claim-rescue, density-floor, idle-equalization, moderate-reinforcement, severe-rescue}`. The Batch 22 attempt blocked on closure scope (`needed` declared in Phase B was referenced from Phase E); Batch 23 resolves it by hoisting `needed` plus `DENSITY_FLOOR_EDGES_PER_BRIGADE` / `DENSITY_FLOOR_THREAT_GATE` to function-body scope BEFORE the phase wrappers begin. Function signature gains an optional `perfTime: EnsureMinimumSectorCoveragePerfTimer = (_label, fn) => fn()` parameter with no-op default; two call sites in `sealMergedSectorTruth` pass module-local `_perfTime`.

**Run evidence (n1900):**

| Label | Aggregate ms / 40w | Calls | % of parent |
|---|---:|---:|---:|
| `ensureMinimumSectorCoverage:territory-claim-rescue` | **1505.50** | 1502 | 56.3% |
| `ensureMinimumSectorCoverage:severe-rescue` | **1054.46** | 1502 | 39.4% |
| `ensureMinimumSectorCoverage:idle-equalization` | 31.14 | 1502 | 1.2% |
| `ensureMinimumSectorCoverage:moderate-reinforcement` | 16.77 | 1502 | 0.6% |
| `ensureMinimumSectorCoverage:density-floor` | 15.43 | 1502 | 0.6% |
| Parent `sealMergedSectorTruth:ensure-coverage` | 2675.67 | 1502 | 100% |

`territory-claim-rescue` + `severe-rescue` together = 2560 ms (95.7%). Attribution overhead 52 ms (~2%). Parent total +10 ms vs Batch 21 baseline 2665.5 ms — within run-to-run noise.

**Byte-identity proof:** 40w n1900 final hash `b14179d65639860c` matches Batch 17 baseline literally. `node tools/validate_run_consistency.cjs runs/.../n1900` PASS (0 violations). Anchors 27/27, benchmarks 6/6. `tests/sector_partition_instrumentation.test.ts` includes new `static contract: ensureMinimumSectorCoverage` test enforcing the 5-label set.

**Next targets:** Drill into `:territory-claim-rescue` (1505 ms) or `:severe-rescue` (1054 ms) for one more level of sub-attribution or a byte-identical optimization. The remaining three phases (~63 ms combined) are not worth optimizing.

**Report:** [implemented/20260518_BATCH23_ENSURE_COVERAGE_ATTRIBUTION.md](implemented/20260518_BATCH23_ENSURE_COVERAGE_ATTRIBUTION.md)

## 2026-05-18: Batch 22 normalizeFinalSectorBuckets friendlyUniverse hoist (byte-identical optimization)

**Change:** Precomputed `friendlyUniverseByFaction: Map<FactionId, Set<string>>` once at the start of `normalizeFinalSectorBuckets(...)` instead of rebuilding the per-faction set inside every per-sector iteration. New sidecar label `normalizeFinalSectorBuckets:friendly-universe-precompute` covers the one-shot build; the existing `normalizeFinalSectorBuckets:friendly-universe` label now covers only the per-sector `Map.get` lookup. Per-sector `:friendly-universe` drops from 1897.3 ms / 42227 calls to 10.0 ms / 42227 calls (–99.5%); the new `:friendly-universe-precompute` adds 78.6 ms; parent `applyFinalSectorOwnerTruthPass:normalize-buckets` drops from 2013.9 ms to 294.7 ms (–85%), a ~1.7 s win on the 40w simulation bucket.

**Why:** Batch 21 attribution flagged `:friendly-universe` as 89% of `:normalize-buckets` cost — the per-sector `Object.entries(politicalControllers).filter(c => c === sector.faction).map(...)` rebuild iterated all ~700 politicalControllers entries 42,227 times per 40w run when only 3 distinct faction values exist. Precomputing once per call collapses the per-sector cost to a `Map.get` + null check.

**Byte-identity proof:** 40w n1899 final hash `b14179d65639860c` matches Batch 17 baseline literally; `node tools/validate_run_consistency.cjs runs/.../n1899` PASS (15/15 invariants); anchors 27/27, benchmarks 6/6. Insertion order preserved across `Object.entries` iteration (declaration order is stable); downstream `.has(...)` reads don't observe Set reference identity.

**Held for later batch:** Attempted 5-phase attribution inside `ensureMinimumSectorCoverage(...)` (the `:ensure-coverage` 72% hotspot from Batch 21). The phase wraps broke closure scope because `needed` (declared in Phase B `density-floor`) is referenced from Phase E `severe-rescue` (10+ sites). Reverted in this batch. Re-attempt path: hoist shared closures out of phase bodies to function scope BEFORE the wrappers begin.

**Next target:** Either hoist-then-attribute `ensureMinimumSectorCoverage`, or pivot to descending into `sealMergedSectorTruth:ensure-coverage` (2666 ms / 1502 calls / 1.78 ms-per-call) via direct source inspection for byte-identical wins.

**Report:** [implemented/20260518_BATCH22_AUTONOMOUS_MULTI_LANE.md](implemented/20260518_BATCH22_AUTONOMOUS_MULTI_LANE.md)

## 2026-05-18: Batch 21 normalizeFinalSectorBuckets + sealMergedSectorTruth deeper attribution (byte-identical)

**Change:** `normalizeFinalSectorBuckets(...)` and `sealMergedSectorTruth(...)` in `src/sim/combat/corps_front_sectors.ts` now record sidecar attribution for their inner phases / helpers under labels `normalizeFinalSectorBuckets:{friendly-universe,reserve-band,brigade-classify,write-back}` (4 phases × 42,227 per-sector iterations) and `sealMergedSectorTruth:{friendly-osids-and-components,dedup-brigades,enforce-ownership,rehome-unassigned,ensure-coverage,reclassify-rear,absorb-unstaffed}` (7 helpers × per-faction × per-pass). Wrappers use the existing `_perfTime` helper; no behavior change. `normalizeFinalSectorBuckets` wrapper uses closure mutation (locals declared outside, mutated inside) so per-sector data structures stay coherent across phase boundaries.

**Why:** After Batch 20 attributed `applyFinalSectorOwnerTruthPass` and identified `:normalize-buckets` as the dominant child (73%), this batch drills into both `normalizeFinalSectorBuckets` and the still-unfactored `sealMergedSectorTruth:1-5` parent (~3700ms aggregate). Two functions in one batch because they are disjoint (different functions, no shared state, separate test contracts).

**Run evidence (n1898 with attribution):**

`normalizeFinalSectorBuckets` parent total = 2131.0ms across 335 calls. Children:

| Label | Aggregate ms | Count | ms/call | % of parent |
|---|---:|---:|---:|---:|
| `normalizeFinalSectorBuckets:friendly-universe` | 1897.3 | 42227 | 0.045 | 89% |
| `normalizeFinalSectorBuckets:brigade-classify` | 110.2 | 42227 | 0.003 | 5% |
| `normalizeFinalSectorBuckets:write-back` | 88.8 | 42227 | 0.002 | 4% |
| `normalizeFinalSectorBuckets:reserve-band` | 86.1 | 42227 | 0.002 | 4% |

`sealMergedSectorTruth:1-5` parent total = 3721.3ms across 470 calls. Children:

| Label | Aggregate ms | Count | ms/call | % of parent |
|---|---:|---:|---:|---:|
| `sealMergedSectorTruth:ensure-coverage` | 2665.5 | 1502 | 1.78 | 72% |
| `sealMergedSectorTruth:rehome-unassigned` | 277.0 | 1502 | 0.18 | 7% |
| `sealMergedSectorTruth:absorb-unstaffed` | 222.4 | 1410 | 0.16 | 6% |
| `sealMergedSectorTruth:enforce-ownership` | 213.7 | 1502 | 0.14 | 6% |
| `sealMergedSectorTruth:reclassify-rear` | 150.9 | 1502 | 0.10 | 4% |
| `sealMergedSectorTruth:friendly-osids-and-components` | 100.6 | 1410 | 0.07 | 3% |
| `sealMergedSectorTruth:dedup-brigades` | 64.1 | 3004 | 0.02 | 2% |

Overhead between parent totals and children sums: ~50ms / ~1.3% — clean attribution.

**Byte-identity proof:** 40w n1898 final hash `b14179d65639860c` matches Batch 17 baseline literally. `node tools/validate_run_consistency.cjs runs/.../n1898` PASS. Anchors 27/27, benchmarks 6/6, validation 13/13 (3 pre-existing below-floor advisories unchanged).

**Next targets (clear optimizations):**
- `normalizeFinalSectorBuckets:friendly-universe` (89% of normalize cost): hoist `friendlyUniverse` construction out of the per-sector loop into a per-faction precompute. Each sector's `friendlyUniverse` is a function of `sector.faction` alone — currently rebuilt 42,227 times when 3 distinct values exist.
- `sealMergedSectorTruth:ensure-coverage` (72% of seal cost): drill into `ensureMinimumSectorCoverage(...)` for one more level of attribution or byte-identical optimization.

**Report:** [implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md](implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md)

## 2026-05-18: Batch 20 applyFinalSectorOwnerTruthPass deeper attribution (byte-identical)

**Change:** `applyFinalSectorOwnerTruthPass(...)` in `src/sim/combat/corps_front_sectors.ts` now records sidecar attribution for its five inner helpers under labels `applyFinalSectorOwnerTruthPass:relocate-misassigned`, `:friendly-osids`, `:rehome-unassigned`, `:rescue-adjacent`, and `:normalize-buckets`. Wrappers use the existing module-local `_perfTime` helper; no new persisted state, no save fields, no behavior change. Pre-existing per-pass parent labels (`applyFinalSectorOwnerTruthPass:1` through `:4`) remain intact for cross-batch comparability.

**Why:** After Batch 19 retired the staffability-filter `O(N²)` sharedPool rebuild, the n1896 profile showed `applyFinalSectorOwnerTruthPass:1–:4` aggregating ~2748ms across the 40w run (4 passes × ~94 turns + pass-3 sparse coverage at 53 turns) and `sealMergedSectorTruth:1–:5` at ~3700ms, both as un-attributed parents. This batch attributes one of the two; the inner helpers reveal a clear single dominant child.

**Run evidence (n1897 with attribution):**

| Label | Aggregate ms | Count | ms/call |
|---|---:|---:|---:|
| `applyFinalSectorOwnerTruthPass:normalize-buckets` | 2013.9 | 335 | 6.01 |
| `applyFinalSectorOwnerTruthPass:relocate-misassigned` | 323.7 | 335 | 0.97 |
| `applyFinalSectorOwnerTruthPass:rehome-unassigned` | 168.0 | 1005 | 0.17 |
| `applyFinalSectorOwnerTruthPass:friendly-osids` | 146.5 | 1005 | 0.15 |
| `applyFinalSectorOwnerTruthPass:rescue-adjacent` | 82.6 | 1005 | 0.08 |
| Sum of children | 2734.7 | — | — |
| Parent sum (`:1`–`:4`) | 2747.9 | 335 | — |

`normalizeFinalSectorBuckets` accounts for 73% of the parent total. Per-faction children (`friendly-osids`, `rehome-unassigned`, `rescue-adjacent`) run 1005 times (335 passes × 3 factions) and are individually small.

**Byte-identity proof:** 40w n1897 final hash `b14179d65639860c` matches Batch 17 baseline literally. `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1897` PASS. Anchors 27/27, benchmarks 6/6, no anomaly violations (three pre-existing sector-floor advisories unchanged from prior runs).

**Next target:** Inspect `normalizeFinalSectorBuckets(...)` for a byte-identical optimization or one more level of attribution before optimizing. `sealMergedSectorTruth:1–:5` (~3700ms aggregate, six inner helpers per faction-loop) remains the other unfactored parent.

**Report:** [implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md](implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md) (planned)

## 2026-05-18: Batch 19 staffability-filter optimization (byte-identical)

**Change:** The staffability-filter loop inside `buildFactionSectors(...)` now precomputes per-OSID distinct-sector counts (`osidSectorCount: Map<string, number>`) once per corps under a new `:staffability-filter:unique-front-counts` sidecar label, and passes each sector's resulting unique-front-OSID set to `canCorpsStaffSectorFront(...)` via a new optional `uniqueFrontOsidsOverride` parameter. The override replaces the per-sector `getSectorUniqueFrontOsids(...)` shared-pool rebuild that was O(sectors × Σ sub_segments × friendly_osids) per corps.

**Why:** Batch 17 evidence flagged `:staffability-filter` as one of the per-corps construction children worth inspecting. The shared-pool rebuild does the same total work as a single distinct-sector count followed by per-sector queries against that map; switching to the precompute is provably byte-identical and shifts the algorithm to O(N) where N is the total OSID-occurrences across the corps.

**Equivalence proof:** An OSID is "unique to S" iff it appears in S's `sub_segments.friendly_osids` and not in any other sector's. Equivalently, only one sector in the corps contains that OSID. The new path queries `osidSectorCount.get(osid) === 1` and produces the same Set with the same insertion order; downstream `canAnyBrigadeReachAny(...)` only reads via `.has(...)`. The recovery caller `recoverDroppedFrontEdges` keeps the legacy path (no override).

**Run evidence:** 40w n1895 final hash `b14179d65639860c` matches Batch 17 baseline literally. 27/27 anchors PASS; 6/6 bot benchmarks PASS; `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1895` PASS. `tests/sector_partition_instrumentation.test.ts` updated to require the new `:unique-front-counts` label and passes 12/12.

**Wall-clock measurement note:** A paired pre/post wall-clock delta was not captured in this batch because the same-machine n1894 timing was not preserved. The next sector-perf batch should pair flag-on `PERF_PROFILE_SECTOR_PARTITION=true` runs against an n1894-equivalent rebuild to quantify the staffability-filter delta.

**Report:** [implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md](implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md)

## 2026-05-18: Batch 17 corps-sector construction attribution

**Change:** `PERF_PROFILE_SECTOR_PARTITION=true` now records child attribution under `buildFactionSectors:*:corps-sector-construction:${corpsId}` for `multi-sector-build` and `staffability-filter`.

**Why:** Batch 16 identified broader corps construction as a remaining measured owner. Batch 17 keeps the parent label intact for profile comparability and splits attribution between the `buildMultiSectorsForCorps(...)` call and the staffability filter loop without changing sector truth, cache lifetime, state, or serialization.

**Run evidence:** Profiled 40w n1894 kept the current integrated hash `b14179d65639860c`; 27/27 anchors, 6/6 bot benchmarks, consistency validation PASS.

**Next measured targets:** Inspect the largest child owners before optimizing: `multi-sector-build` for RBiH 1st/2nd Corps and VRS 1st Krajina/Herzegovina/Drina, plus `staffability-filter` for RBiH 2nd/3rd Corps. Continue sidecar-only attribution if no byte-identical reuse boundary is obvious.

**Report:** [implemented/20260518_SECTOR_RECONSTRUCTION_BATCH17.md](implemented/20260518_SECTOR_RECONSTRUCTION_BATCH17.md)

## 2026-05-18: Batch 16 buildFactionSectors brigade-classification attribution

**Change:** `PERF_PROFILE_SECTOR_PARTITION=true` now records deeper attribution inside `buildFactionSectors:*:brigade-classification` for commander-profile build, territory assignment, cross-corps enclave defense, and minimum-sector coverage.

**Why:** Batch 15 left `buildFactionSectors:RS/RBiH` and brigade-classification labels as remaining measured owners. Batch 16 is attribution-only, so the next sector cut can target the real child owner instead of speculating from the parent label.

**Run evidence:** Timed 40w n1892 kept the then-current hash `0d8d9ccdc477d77a`; parent integrated 40w n1893 moved to `b14179d65639860c` because of the concurrent intel casualty hook, not the sidecar-only sector labels. Both runs kept 27/27 anchors and 6/6 bot benchmarks.

**Next measured targets:** Do not optimize `commander-profile-build` or `cross-corps-enclave-defense` from Batch 16 evidence; they are small attribution children. The next sector-performance lane should inspect larger `territory-assignment`, `minimum-sector-coverage`, or broader `corps-sector-construction` owners and still require byte-identical 40w proof for read-only performance changes.

**Report:** [implemented/20260518_SECTOR_RECONSTRUCTION_BATCH16.md](implemented/20260518_SECTOR_RECONSTRUCTION_BATCH16.md)

## 2026-05-18: Batch 15 faction active-combat index

**Change:** `buildFactionSectors(...)` now builds one invocation-local active-combat formation index before per-corps sector construction and classification setup.

**Why:** Fresh Batch 15 profiling still showed `buildFactionSectors:RS/RBiH` as the top sector reconstruction owner. This cut removes repeated active-combat formation scans for per-corps counts, location/component collections, and faction-wide brigade location/component sets without adding cross-turn or persisted cache state.

**Run evidence:** 40w n1891 produced `0d8d9ccdc477d77a`; 27/27 anchors, 6/6 bot benchmarks, run consistency PASS. The hash move is attributed to the concurrent intel ambush lane; the sector index itself is read-only and invocation-local.

**Next measured targets:** Fresh sidecar aggregation still names `buildFactionSectors:RS` (3268.501ms), `buildFactionSectors:RBiH` (3183.130ms), `recoverDroppedFrontEdges:1` (1639.243ms), `buildFactionSectors:RBiH:corps-sector-construction` (1367.905ms), and `recoverDroppedFrontEdges:faction-front-claim-setup` (1308.836ms) as remaining owners.

**Report:** [implemented/20260518_SECTOR_RECONSTRUCTION_BATCH15.md](implemented/20260518_SECTOR_RECONSTRUCTION_BATCH15.md)

## 2026-05-18: Batch 14 sector-object scan-list reuse

**Change:** `buildMultiSectorsForCorps(...)` now builds one invocation-local, `strictCompare`-sorted active combat formation scan list and passes it into `buildSectorFromSubSegments(...)` sector creation/rebuild calls.

**Why:** Batch 13 attribution showed repeated active-formation scans inside `buildSectorFromSubSegments(...)`. Batch 14 reduced the `assigned-brigade-scan` and `enemy-power-scan` child labels without adding module-level, cross-turn, or persisted cache state.

**Run evidence:** 40w n1890 stayed byte-identical to n1888/n1889 at `248202ee4fd13027`; 27/27 anchors, 6/6 bot benchmarks, run consistency PASS.

**Report:** [implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_BATCH14.md](implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_BATCH14.md)

## 2026-04-03: Physical sector ownership hardening

**Change:** Added a final sector truth pass after late assignment/review phases. `enforcePhysicalSectorOwnership(...)` strips any brigade from a sector unless its current `location_osid` is:
- on the sector frontline,
- inside the sector territory,
- or one hop behind the frontline as reserve.

**Why:** Contiguity and cross-corps rescue were no longer the only sources of false sector truth. Late coverage / commander-review style passes could still leave brigades rostered into sectors they did not physically hold. The engine was then returning those rosters as if they were present frontline truth.

**Related frontline change:** `buildFrontlineAssignedFormationSet(...)` now uses only `assigned_brigade_ids`; sector reserves remain sector-owned but no longer count as line brigades for fatigue, officer-quality updates, or scenario reporting.

**Run evidence:** Fresh run `n1309` kept `cross_corps_sector_assignment = 0` and sharply reduced false final-sector ownership. The remaining unresolved brigades are now largely exposed honestly instead of being paper-washed into sectors.

**Report:** [implemented/20260403_PHYSICAL_SECTOR_OWNERSHIP_AND_FRONTLINE_RESERVE_SPLIT.md](implemented/20260403_PHYSICAL_SECTOR_OWNERSHIP_AND_FRONTLINE_RESERVE_SPLIT.md)

## 2026-04-03: Sector-mandatory means frontline-mandatory, not active-brigade-mandatory

**Change:** Final unresolved-sector collection now only flags brigades that should truthfully have a frontline sector owner.

**Rule:** A brigade is sector-mandatory only when at least one of these is true:
- it stands inside same-corps sector territory,
- it stands on or one hop behind a same-corps sector frontline,
- or it stands on / one hop behind a real hostile faction frontline from `war_front_edges_osid`.

**Why:** `hrhb_travnik_brigade` at `op:novi_travnik:rat_2` exposed the last bad invariant. The brigade had real operational neighbors, but its `HRHB`-`RBiH` contacts were filtered from `war_front_edges_osid` because the alliance gate still treated that local border as allied. No hostile frontline existed there, so no sector was supposed to exist there either. The bug was the collector accusing the engine of being wrong anyway.

**Run evidence:** Fresh run `n1311` finished with:
- `unresolved_sector_brigades = 0`
- no run-summary anomalies
- final hash `8d6e15e371bf8b7d`

**Report:** [implemented/20260403_FRONTLINE_SECTOR_MANDATORY_INVARIANT_REFINEMENT.md](implemented/20260403_FRONTLINE_SECTOR_MANDATORY_INVARIANT_REFINEMENT.md)

## 2026-04-04 — Command Chain Truth Hardening (Waves 1–4)

**Lane:** CLOSED. All 6 plan phases delivered across Waves 1–4 (2026-04-04).

- **Phase 1.5 front-adjacency guard**: BFS ≤30 hops from front required before a brigade enters `assigned_brigade_ids`. Territory match alone is no longer sufficient — disconnected rear brigades stay unresolved rather than getting false sector ownership.
- **assertBrigadeReachability actionable**: returns `string[]` of unreachable brigade IDs; caller demotes them from `assigned_brigade_ids` to `reserve_brigade_ids`. Not a silent logger — a diagnostic contract.
- **assigned_sub_segment_id cleared on demotion**: `corps_front_sectors.ts` demotion loop explicitly sets `formation.assigned_sub_segment_id = undefined` when a brigade is demoted. Stale sub-segment assignments cannot persist after a brigade loses sector membership.
- **Adapter canonical-first sub-segment derivation**: `GameStateAdapter.ts` builds a reverse map from `corps_front_sectors` sub_segments before iterating formations. Canonical sector truth drives the UI sub-segment field; formation field is fallback only.
- **Displacement trigger proxy-fork observable**: `displacement_triggers.ts` emits `console.warn` when `hasLiveSectorFrontlineTruth()` is false and the legacy proxy path fires. Silent fallback is banned — proxy activity is now always surfaced in diagnostics.
- **Activity truth**: `deriveWeeklyActivityCounts` returns explicit zeros (not undefined) when `phase_f_displacement` trigger report is absent. `computeActivitySummary` aggregates min/max/mean/nonzero_weeks correctly.
- **Regression gates**: 29 tests across 4 wave files (`sector_frontline_truth_wave1–4.test.ts`) lock all invariants. Future regressions fail automatically.

**Report:** `docs/40_reports/implemented/20260404_COMMAND_CHAIN_TRUTH_WAVE4.md`

## Current State (n842)

| Metric | Value |
|---|---|
| Total sectors | 107 |
| Contiguous (friendly BFS) | 107 (0 violations) |
| Bending front | 0 |
| Calibration | 5/6 benchmarks, 89.5% area-weighted |
| Non-Sarajevo stacking | 36 (was 46 before distribution) |
| Brigades 3+ hops from front | 29 (was 36) |
| At-front brigades | 187 (was 177) |

### 2026-03-19: Sector Demarcation Lines Re-Enabled

**Change:** Sector demarcation lines (dashed lines showing boundaries between sectors of the same faction) were disabled since 2026-03-10 (`if (false && ...)` gate). Re-enabled with visibility tied to `sectorsVisible` (shows when any corps is selected, not just devMode).

**Layers:** `sector-demarcation-lines` (dark base), `sector-demarcation-lines-stripe` (lighter dash), `sector-demarcation-lines-hit` (invisible wide hitbox for click).

**Builder:** `buildSectorDemarcationGeoJSON()` — finds OSID polygon edges between front-adjacent OSIDs in different sectors of the same faction. Applies Douglas-Peucker simplification + Chaikin smoothing. Front-proximity filter eliminates deep-rear noise.

**Report:** [implemented/20260319_MAP_UI_DEEP_INVESTIGATION_AND_FIXES.md](implemented/20260319_MAP_UI_DEEP_INVESTIGATION_AND_FIXES.md)

### n842 Changes (Brigade Front Distribution)

**Problem:** Brigades were assigned to sub-segments on paper but no code physically distributed them across the sub-segment's `friendly_osids`. This caused stacking (2-6 brigades at same OSID) and rear brigades sitting 3-11 hops behind their assigned sector front.

**Fix — `distribute-brigades-to-front` pipeline step** (`src/sim/combat/brigade_front_distribution.ts`):
1. **Phase A**: Redistributes freshly-arrived (entrenchment < 1 turn) stacked brigades to adjacent empty front OSIDs within their sub-segment. Home OSID preferred. Only moves brigades from OSIDs with 2+ units.
2. **Phase B**: Issues column march orders for brigades NOT at any front OSID. Picks least-stacked target, max 8 hops. Direct move if adjacent.
3. **Exemptions**: Sarajevo siege corps (`arbih_1st_corps`, `vrs_sarajevo_romanija`), active operation participants, disrupted brigades, single-OSID sub-segments.
4. **Entrenchment guard**: Entrenched brigades (≥1 turn) are NOT redistributed — preserves defensive positions.

Constants: `MAX_REDISTRIBUTION_DISTANCE=8`, `ENTRENCHMENT_REDISTRIBUTION_THRESHOLD=1`, `SIEGE_EXEMPT_CORPS`.

### n692 Changes (Case B Split Threshold + Merge Alignment)

**Problem:** n682's strict Case B threshold of 5.5m (`SHARED_BOUNDARY_THRESHOLD`) was too aggressive for the split step, causing over-fragmentation (144 sectors). Many legitimate triple-junction connections with distances in the 6-15m range were being severed.

**Key insight — natural gap in Case B distance distribution:** Analysis of all Case B connections revealed a clean gap between 15.5m and 24.6m with zero connections. Connections below 15.5m are real triple-junction contacts; connections above 24.6m are phantom bridges across enemy pockets. The 16.6m threshold (`CASE_B_SPLIT_THRESHOLD`) sits squarely in this gap.

**Changes:**
1. **Split step (Step 4b):** `splitNonContiguousSectors` now uses `CASE_B_SPLIT_THRESHOLD` (16.6m) instead of `SHARED_BOUNDARY_THRESHOLD` (5.5m) for Case B adjacency. This preserves legitimate short-distance Case B connections while still catching cross-enemy-pocket bridges.
2. **Merge step (Step 4c):** `areSectorsEdgeAdjacent` now uses the same 16.6m threshold for edge adjacency (both Case A and Case B constrained to 16.6m). This prevents the merge from re-bridging connections that the split just broke.
3. **Result:** 144 → 131 sectors. 0 disconnected. 5/6 benchmarks pass. 88.2% area-weighted (+1.1pp from n682).

### n682 Changes (Strict Case B — Cross-Enemy Sector Fix)

**Problem:** Sectors could span front edges on BOTH sides of an enemy pocket (e.g. 3rd Corps Zavidovici sector with white front lines in Ilijas/Breza on the south AND Zavidovici/Olovo on the north, separated by RS Ozren territory). A soldier cannot walk along the front from one segment to the other without crossing enemy territory.

**Root cause:** Case B edge adjacency (same hostile OSID, friendly OSIDs adjacent) bridges front edges facing the same enemy from different directions. Example: `dragoradi` (Ilijas, south of RS pocket) and `olovo_2` (Olovo, north of pocket) both face hostile `krivajevici` — Case B connects them even though the front lines are disconnected. The 33m threshold (`FRONT_EDGE_MAX_GAP`) was too permissive: `olovo_2↔krivajevici` is 16.9m apart (passes 33m but fails 5.5m strict shared boundary).

**Fix — `buildEdgeAdjacencyStrictCaseB`:** New function replaces standard `buildEdgeAdjacency` in the `splitNonContiguousSectors` re-check:
- **Case A** (same friendly, hostile adj): Always allowed — follows front along friendly polygon boundary
- **Case B** (same hostile, friendly adj): Only when BOTH fi-H and fj-H are in strict adjacency (≤5.5m `SHARED_BOUNDARY_THRESHOLD`), ensuring a real polygon triple junction where all three polygons physically share a vertex

**Supporting fix — Municipality guard on `mapOsidsToCorps` Phase 2 BFS:** Prevents BFS race conditions where a corps claims territory in municipalities where another corps has home seeds (e.g. 3rd Corps displaced brigades in Ilijas pulling territory from 1st Corps).

**Files changed:** `corps_front_sectors.ts` (new `buildEdgeAdjacencyStrictCaseB`, call site in `splitNonContiguousSectors`, municipality guard in `mapOsidsToCorps`), `osid_adjacency.ts` (import of `buildSharedBoundaryAdjacency`).

**Verification:** `tools/check_sector_contiguity_all.cjs` — BFS through all friendly territory from each sector's friendly OSIDs confirms 0 disconnected sectors across all ARBiH sectors. No sector spans Zavidovici+Ilijas.

### n664 Changes (Contiguity Fix)

Three changes to ensure sectors are contiguous front **lines**:

1. **`splitNonContiguousSectors` upgraded to triple-junction adjacency** — was shared-OSID (too permissive at triple junctions). Now calls `buildEdgeAdjacency` with faction info. Correctly splits edges facing different directions at the same OSID.
2. **Shared front-edge territory** — front-edge OSIDs can belong to multiple sectors. Rear territory exclusive (BFS first-claim). Fixes single-OSID interruption between adjacent sectors.
3. **Need-based brigade assignment at shared OSIDs** — `frontOsidToSectorIndices` multi-mapping. Brigade at shared front OSID assigned to neediest same-corps sector.

### 2 Residual Bending Front Sectors

Both in Doboj/Maglaj area — friendly polygon borders two non-adjacent hostile polygons:
- `arbih_3rd_corps:1` (13 edges, 2 sub-segments): `kosova_2` faces both `boljanic_2` and `jablanica`
- `vrs_1st_krajina:7` (12 edges, 1 sub-segment): `donja_bocinja_2` faces both `lijesnica` and `cinovici`

Status: under review pending map inspection. Geographically continuous but no triple-junction link.

---

## Architecture

### Pipeline (`corps_front_sectors.ts`)

```
Step 1:  findSubSegments — group front edges by triple-junction connectivity
Step 2:  mergeUndersizedSubSegments — merge segments < MIN_SECTOR_EDGES
Step 3:  splitOversizedSubSegments — split segments > MAX_SECTOR_EDGES at midpoint
Step 3b: buildSectorFromSubSegments — create CorpsFrontSector objects
Step 4:  splitOversized sectors (> MAX_SECTOR_BRIGADES at 4+ edges)
Step 4b: splitNonContiguousSectors — triple-junction split with Case B ≤16.6m threshold (n692, was 5.5m n682)
Step 4c: mergeUndersizedSectors — merge small sectors using same 16.6m edge adjacency (n692)
Step 5:  Filter ghost/orphan sectors (0 front edges)
```

Pre-pipeline (faction-wide in `buildFactionSectors`):
```
Step 2:  mapOsidsToCorps — BFS from brigade home_osids to assign territory to corps
Step 3:  partitionFrontEdges — assign each front edge to its friendly OSID's corps
Step 3b: consolidateCrossCorpsFronts — merge minority-corps edges in connected components
         Protected: brigade presence + osidToCorps mapping (n624)
Step 3c: consolidateIsolatedCorpsPockets — reassign isolated edge pockets to neighbors
```

Post-pipeline (faction-wide in `buildFactionSectors`):
```
Step 5:  assignTerritoryVoronoi — assign territory OSIDs to sectors (respects osidToCorps)
Step 6:  classifyBrigadesByTerritory — assign brigades (Phase 1 front, 2a home-mun, 2b corps pool)
Step 7:  ensureMinimumSectorCoverage — transfer brigades to empty sectors
Step 8:  deduplicateBrigadesAcrossSectors — remove cross-sector duplicates
```

### Key Algorithms

**Triple-junction connectivity** (`buildEdgeAdjacency`): Used for sub-segment construction (Steps 1-3). Two front edges connect iff they meet at a polygon triple junction:
- Case A: same friendly OSID, hostile OSIDs adjacent
- Case B: same hostile OSID, friendly OSIDs adjacent
Uses `sharedBoundaryAdj` when available, falls back to full `osidAdjacency`.

**Strict triple-junction contiguity** (`splitNonContiguousSectors` + `buildEdgeAdjacencyStrictCaseB`, n682→n692): Used for contiguity enforcement (Step 4b) and merge eligibility (Step 4c). After standard edge adjacency finds a single component, re-checks with strict Case B:
- Case A: always allowed (same friendly, hostile adj)
- Case B: only when BOTH fi-H and fj-H distances are ≤16.6m (`CASE_B_SPLIT_THRESHOLD`)

The 16.6m threshold exploits a natural gap in the Case B distance distribution (15.5m → 24.6m with zero connections). This catches phantom connections where Case B bridges front edges on opposite sides of enemy pockets (e.g. 16.9m+ gaps are cross-pocket bridges) while preserving legitimate short-distance triple-junction contacts that the original 5.5m threshold (n682) was incorrectly severing.

The merge step (Step 4c, `areSectorsEdgeAdjacent`) uses the same 16.6m threshold for both Case A and Case B adjacency, ensuring it cannot re-bridge connections that the split step just broke.

Previously (n664) used standard `buildEdgeAdjacency` which didn't distinguish — causing mega-sectors spanning disconnected fronts (Zavidovići↔Ilijas across RS Ozren pocket). n682 fixed this with 5.5m but over-fragmented (144 sectors). n692 found the optimal threshold at 16.6m (131 sectors).

**Shared front-edge territory** (`assignTerritoryVoronoi`, n664): Front-edge OSIDs (on `sub_segments.friendly_osids`) can belong to multiple sectors simultaneously. Rear territory remains exclusive (BFS first-claim). This prevents single-OSID sectors interrupting contiguous fronts at sector boundaries. Brigade assignment at shared OSIDs uses need-based tiebreaking (neediest same-corps sector).

**Cross-corps consolidation** (`consolidateCrossCorpsFronts`): Finds connected components of front edges across corps boundaries. Assigns minority-corps edges to majority corps. **Gotcha (n624):** Without osidToCorps protection, a corps with a large front (Herzegovina) absorbs a smaller connected corps's edges (SRK Sarajevo) via majority rule — even when the BFS home-seed mapping correctly assigns territory to the smaller corps. Two protections prevent this: (1) brigade presence at OSID, (2) osidToCorps mapping from home-based BFS.

**Brigade assignment** (`classifyBrigadesByTerritory`):
- Phase 1: Brigades on sector front OSIDs → assigned to that sector
- Phase 2a: Home-municipality affinity — brigades near their home OSID
- Phase 2b: Corps distributes remaining by need (proportional to edges)
- Connected-component reachability guard (n598): brigade must be able to reach sector through friendly territory

### Constants (`corps_front_sectors_constants.ts`)

| Constant | Value | Purpose |
|---|---|---|
| MAX_SECTOR_EDGES | 25 | Split threshold |
| MIN_SECTOR_EDGES | 5 | Merge threshold |
| MAX_SECTOR_BRIGADES | 12 | Brigade-based split |

---

## Sector Defense Model

### Current: Distance-Weighted Reactive Defense + Sector Stances (n668)

**Full plan:** `docs/40_reports/20260313_DISTANCE_WEIGHTED_REACTIVE_DEFENSE_PLAN.md`

**Layer A (IMPLEMENTED, n666-n667):** Per-brigade reserve contribution weighted by BFS hop distance (decay `0.60^hops`, max 5) + home-municipality motivation (1.3×). Casualty distribution proportional to same weights (replaces 50/50 split). Files: `combat_math.ts`, `attack_resolution_osid.ts`, `combat_predictor.ts`.

**Layer B (IMPLEMENTED, n668):** Five independent sector stances with combat modifiers:

| Stance | Reactive Bonus | Entrenchment Rate | Bot Trigger |
|--------|---------------|-------------------|-------------|
| Fortify | 1.30× | 2.0× | threat > 2.0 + few brigades |
| Defend | 1.15× | 1.2× | default, threat > 1.5 |
| Elastic | 1.00× | 0.8× | staging operation |
| Active Defense | 0.85× | 0.6× | threat < 0.5 + offensive targets |
| Screening | 0.50× | 0.0× | cold front, threat < 0.3 + no targets |

Corps stance ceiling: offensive can't fortify, defensive can't active_defense, balanced allows all, reorganize allows fortify/defend/screening. Player overrides persist (`stance_source: 'player'`).

Bot AI (`evaluateSectorStances` in `bot_corps_directives.ts`): evaluates per-sector based on threat_ratio, cold front status, staging operations, offensive targets. Called in pipeline after sector construction, before directive generation.

Combat integration: reactive bonus multiplies Layer A effective reserves; entrenchment rate modifies per-turn growth in `brigade_movement_orders.ts`.

Files: `game_state.ts` (types), `combat_math.ts` (constants), `bot_corps_directives.ts` (bot AI), `sector_stance_orders.ts` (player orders rework), `attack_resolution_osid.ts` + `combat_predictor.ts` (reactive bonus), `brigade_movement_orders.ts` (entrenchment rate).

**Intel-Defense Integration (KNOWN ISSUE n1194):** Sector stances interact with OPSEC — when OPSEC is active on a sector during operation planning, enemy intel buildup is halved. However, the `offensive_signs` field on SectorIntelRecord (designed to trigger 2x threat weight boost for defensive reinforcement) never fires due to confidence >= 0.8 AND recon_range >= 2 gate. Defenders receive zero warning about staging operations. Planned fix: lower detection threshold to 0.5, enable range-1 detection.

**Layer C (PENDING):** Player visibility — defense heat map, enhanced battle reports, sector stance controls, home defense indicators.

**Calibration:** n668 — 89.0% area-weighted, 6/6 benchmarks, RS w40 0.519, RS delta −22. Zero regression from Layer B.

---

## Corps Sector Geography (n623 w40)

### RBiH

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| 1st Corps | 5 | 73 | 22 | Sarajevo, Gorazde, Visegrad, Pale |
| 2nd Corps | 18 | 142 | 32 | Tuzla corridor, Srebrenica, Zvornik, Doboj |
| 3rd Corps | 6 | 75 | 19 | Zenica, Travnik, Jajce, Tesanj |
| 4th Corps | 2 | 29 | 3 | Konjic, Jablanica, Hadzici |
| 5th Corps | 1 | 13 | 4 | Bihac pocket |

### RS

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| 1st Krajina | 12 | 107 | 35 | Doboj, Teslic, Kotor Varos, Glamoc |
| 2nd Krajina | 1 | 13 | 8 | Bihac perimeter, B. Petrovac |
| Drina | 5 | 63 | 8 | Srebrenica encirclement, Vlasenica |
| East Bosnian | 8 | 65 | 10 | Posavina, Bijeljina, Brcko |
| Herzegovina | 5 | 62 | 5 | Konjic, Trebinje, Bileca, Trnovo |
| Sarajevo-Romanija | 7 | 75 | 5 | Sarajevo siege, Pale, Han Pijesak, Ilijas |

### HRHB

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| Central Bosnia | 4 | 10 | 2 | Zepce, Vares, Jajce |
| Northwest Bosnia | 4 | 16 | 5 | Posavina (Orasje, B. Brod) |
| SE Herzegovina | 2 | 25 | 14 | Mostar, Capljina, Stolac |
| Tomislavgrad | 1 | 11 | 3 | Livno, Duvno, Prozor |

---

## Open Issues

### P2: 10 empty sectors (front edges, 0 brigades)

| Sector | Edges | Corps | Location |
|---|---|---|---|
| arbih_3rd_corps:3 | 7 | ARBiH 3rd | Jajce / Sipovo |
| arbih_3rd_corps:9 | 7 | ARBiH 3rd | Maglaj / Tesanj |
| arbih_4th_corps:2 | 6 | ARBiH 4th | Konjic |
| arbih_4th_corps:3 | 4 | ARBiH 4th | Mostar |
| hvo_central_bosnia:1 | 3 | HVO CB | Jajce |
| hvo_central_bosnia:2 | 4 | HVO CB | Skender Vakuf |
| hvo_central_bosnia:3 | 2 | HVO CB | Konjic |
| hvo_central_bosnia:4 | 1 | HVO CB | Kresevo |
| hvo_central_bosnia:5 | 1 | HVO CB | Vares |
| vrs_sarajevo_romanija:3 | 1 | VRS SRK | Sokolac |

**Impact:** Undefended frontline positions. A real commander would never leave a sector unmanned.
**Root cause:** `ensureMinimumSectorCoverage` can only transfer brigades from sectors with surplus. If no corps brigade has surplus within reachable territory, sector stays empty.
**Analysis:** HVO Central Bosnia has 5 empty sectors — only 2 brigades for 7 sectors (12 total edges). These are tiny isolated HVO enclaves that can't all be manned. ARBiH 3rd/4th Corps are thin in secondary areas. VRS SRK:3 is a 1-edge fragment. These are structural — factions don't have enough troops to man every sector.

### P1: Corridor width used for posture classification only — garrison multiplier not implemented (2026-04-02)

**Gap:** Corridor width data exists (`corridor_analysis.ts`, `corridor_width_by_osid`) and is used in a single place: classifying sectors as `besieged` vs `not-besieged` for stance purposes. There is no garrison multiplier that scales brigade allocation based on corridor width.

**Design proposal:** Proposal 2 (corridor-width garrison multiplier in `allocate.ts`) — narrow corridors (width < 5km) get a 1.5×–2.0× garrison budget multiplier, so the allocation system naturally concentrates brigades at bottlenecks without hardcoding brigade-to-OSID assignments. This is an emergent, data-driven approach (battlefield signal → budget → brigade behavior), not a railroad.

**Status:** Proposal 2 approved in design but not yet implemented. The `false &&` guard in `assess.ts` for engine-derived must_hold (see next issue) is the companion piece. Both should ship together for the Brcko/Doboj corridor defense to emerge structurally.

---

### P1: Engine-derived must_hold detection disabled — `false &&` in assess.ts (2026-04-02)

**Gap:** `assessCorps()` in `src/sim/combat/commander/assess.ts` has a `false &&` guard disabling the engine-computed chokepoint detection path. The detection logic (`osid_graph_analysis.ts` articulation-point algorithm) exists and is imported, but the result is never used to set `is_must_hold` on sectors.

**Why it's disabled:** The current trigger — `MUST_HOLD_MIN_ISOLATED_FRACTION = 0.05` (fraction of total faction territory) — cannot discriminate between RS Brcko (~9% of RS territory, genuine corridor chokepoint) and ARBiH Central Bosnia valley passes (~8% of ARBiH territory, distributed mountain terrain). A size-threshold fires on both or neither; it can't detect structural chokepoints.

**Needed fix:** Replace fraction-of-faction-total with structural/topological signals:
1. **Corps-boundary articulation:** An OSID is a must_hold candidate if removing it disconnects two corps sub-sectors within the same faction's territory (articulation point in the faction graph).
2. **Absolute OSID count:** Isolated sub-graph ≤ 3 OSIDs after removal = chokepoint (Brcko corridor is geometrically narrow; ARBiH CB valleys have many parallel paths).
3. Both conditions AND: must be a corps-graph cut AND leave an isolated sub-graph ≤ 3 OSIDs.

**Current workaround:** Manual `must_hold` overrides in OOB JSON for `vrs_posavina` (Brcko) and `vrs_east_bosnian` (Doboj) with 1.5× garrison budget. These are correct but hardcoded. The engine detection path must be fixed before the manual overrides can be removed.

**Files:** `src/sim/combat/commander/assess.ts` (disabled guard), `src/sim/combat/osid_graph_analysis.ts` (articulation-point logic, correct but under-used), `src/sim/combat/commander/allocate.ts` (reads `is_must_hold` for budget multiplier).

---

### P2: 12 unassigned brigades with personnel

| Brigade | Corps | Location | Personnel |
|---|---|---|---|
| RS 3rd Banja Luka Light | VRS 1st Krajina | Banja Luka | 2,800 |
| RS 1st Guards Motorized | VRS Main Staff | Bileca | 1,741 |
| RS 1st Gradiska Light | VRS 1st Krajina | Teslic | 1,612 |
| RS 1st Celinac Light | VRS 1st Krajina | Celinac | 1,609 |
| ARBiH 283rd East Bosnian | ARBiH 2nd Corps | Srebrenica | 1,481 |
| RS 1st Prnjavor Light | VRS 1st Krajina | Celinac | 1,382 |
| RS 1st Srbac Light | VRS 1st Krajina | Teslic | 1,227 |
| RS 6th Sanske Infantry | VRS 1st Krajina | Banja Luka | 1,227 |
| RS 65th Protection | VRS Main Staff | Han Pijesak | 1,200 |
| RS 5th Kozara Light | VRS 1st Krajina | Banja Luka | 960 |
| RS 22nd Krajina Infantry | VRS 1st Krajina | Mrkonjic Grad | 954 |
| RS 2nd Teslic Light | VRS 1st Krajina | Teslic | 910 |

**Analysis:**
- **RS Main Staff (2 brigades)**: Army-level assets. Not assigned to corps → no sector. Correct behavior — strategic reserves.
- **VRS 1st Krajina (8 brigades, 11,771 pers)**: Deep rear concentration in Banja Luka/Celinac/Teslic. These OSIDs are far from any front edge → no sector covers them. 1KK already has 36 brigades and 12 sectors — these are genuine reserves.
- **ARBiH 283rd at Srebrenica**: Enclave edge case — possibly a sector assignment reachability issue.

### P3: Density imbalance (33:1 ratio)

**Densest:** ARBiH 3rd Corps sector:6 — 5 brigades / 3 edges = 1.67
**Thinnest manned:** VRS Herzegovina sector:3 — 1 brigade / 19 edges = 0.05

Density range improved from 100:1 (n623) to 33:1 (n624) after Herzegovina/SRK fix redistributed edges. Still significant but much less extreme.

---

## Fixed Issues

### Cross-enemy-territory mega-sectors (n682)

**Was:** 3rd Corps Zavidovici sector had front edges on BOTH sides of the RS Ozren/Vares pocket — Ilijas/Breza on the south and Zavidovici/Olovo on the north, separated by RS territory. Visible as two disconnected white front segments with red enemy territory between them.
**Root cause:** Case B edge adjacency (same hostile, friendly adj) bridged front edges facing the same enemy pocket from opposite directions. Example: `dragoradi` (Ilijas) and `olovo_2` (Olovo) both face hostile `krivajevici` — connected by Case B even though 16.9m apart (passes 33m `FRONT_EDGE_MAX_GAP` but NOT a true shared boundary). Additionally, `mapOsidsToCorps` Phase 2 BFS had no municipality guard, allowing displaced 3rd Corps brigades in Ilijas to pull territory from 1st Corps via BFS race.
**Fix:** (1) `buildEdgeAdjacencyStrictCaseB` — Case A always, Case B only when both fi-H and fj-H are in strict adjacency (≤5.5m initially, refined to ≤16.6m in n692). (2) Municipality guard on Phase 2 BFS: skip expansion into municipalities where another corps has home seeds.
**Result:** 0 sectors with disconnected friendly territory (verified by `check_sector_contiguity_all.cjs`). 144 sectors (up from 92), later reduced to 131 (n692 threshold refinement). 6/6 benchmarks pass.
**Key insight:** A sector is a contiguous segment of the front LINE. Case B can lie about front-line connectivity when two friendly polygons touch near an enemy polygon but the front edges face different directions. The Case B distance distribution has a natural gap at 15.5m–24.6m — the 16.6m threshold (n692) exploits this gap to filter phantom bridges without over-fragmenting.

### VRS Herzegovina stealing Sarajevo siege perimeter (n624)

**Was:** Herzegovina Corps owned the Sarajevo siege ring (Centar, Stari Grad, Novo Sarajevo, Ilidza, Vogosca) — should be Sarajevo-Romanija Corps (SRK). SRK was pushed to Ilijas/Pale periphery.
**Root cause:** `consolidateCrossCorpsFronts` (Step 3b) finds connected components of front edges across corps boundaries and reassigns minority edges to the majority corps. The Sarajevo siege front connected to Herzegovina's larger southern front through Trnovo, forming one component. Herzegovina had more edges → majority rule gave it all of Sarajevo.
**Gotcha:** `mapOsidsToCorps` BFS correctly assigned Sarajevo OSIDs to SRK (home_osid seeds in Ilidza/Ilijas). But `consolidateCrossCorpsFronts` overrode this by reassigning SRK's minority edges to Herzegovina. The corps-territory BFS was right, the consolidation was wrong.
**Fix:** Added `osidToCorps` protection to `consolidateCrossCorpsFronts`. Edges whose friendly OSID is mapped to the minority corps by the home-based BFS are now protected from consolidation (same as brigade-presence protection). Applied to both the connected-component pass and the hostile-OSID coherence pass.
**Result:** SRK now owns 7 sectors / 75 edges in Sarajevo area (siege ring, Ilijas, Pale). Herzegovina correctly covers only Konjic/Trnovo southern approaches.
**Verification:** 6/6 benchmarks pass, 83.2% area-weighted, 524 tests pass.

### Srebrenica-Cerska disconnected sector (n620)

**Was:** `sector:arbih_2nd_corps:4` spanned 23 edges across both Srebrenica (9 friendly OSIDs in srebrenica/bratunac) and Cerska/Vlasenica (4 friendly OSIDs in vlasenica). These fronts are physically disconnected — connected only through friendly territory behind the front, not through continuous front-line edges.
**Fix:** `splitNonContiguousSectors` changed from triple-junction connectivity to shared-OSID connectivity. Two front edges are adjacent iff they share at least one OSID endpoint.
**Result:** Srebrenica and Cerska correctly in separate sectors. `bukovica_gornja` (Vlasenica municipality, on the Sreb-Cerska boundary) correctly stays in Srebrenica sector because it shares hostile OSID `bostahovine_2` with Srebrenica-area edges.
**Verification:** Contiguity check shows ALL SECTORS CONTIGUOUS (0 violations).

### parseEdges missing type/min_dist (n620)

**Was:** `settlements_parse.ts` `parseEdges()` only copied `{a, b}` — `type` and `min_dist` fields from the operational contact graph were silently dropped.
**Fix:** Added `type` and `min_dist` field copying to `EdgeRecord` interface and `parseEdges()`.
**Impact:** Independent correctness fix. Enables future use of edge metadata in sector algorithms.

### Contact graph min_dist never existed — ALL adjacency filters were no-ops (n1029, 2026-03-23)

**Was:** The operational contact graph (`operational_contact_graph.json`) had 0/2047 edges with `min_dist`. Three causes: (1) `derive_operational_settlements.ts` computed `min_dist` from the canonical graph but the canonical graph itself lacked it; (2) `merge_micro_osids.cjs` (n982) remapped edges with `return { a, b }`, stripping `type` and `min_dist`; (3) no enrichment step computed `min_dist` from polygon geometry.
**Impact:** ALL threshold-based adjacency filters were identical to full adjacency: `frontEdgeAdj` (33m), `strictAdj` (5.5m), `caseBSplitAdj` (16.6m) all passed every edge. The strict Case B re-check (n682) — designed to split cross-pocket sectors — was a complete no-op. Sectors like "1st Corps - Trnovo, Kalinovik" spanned both sides of RS territory, defending disconnected fronts as one unit. 93.1% calibration was artificially inflated.
**Fix:** (1) `tools/enrich_contact_graph_min_dist.cjs` computes `min_dist` from polygon geometry (vertex-to-vertex minimum). (2) `merge_micro_osids.cjs` preserves `type` and `min_dist` fields. Result: 2025/2047 shared boundary (<5.5m), 22 distant (>33m). Trnovo-Kalinovik sector correctly split.
**Calibration:** 93.1% → 92.0%. Previous number was inflated by broken defense of unreachable territory.
**Diagnostic:** `tools/enrich_contact_graph_min_dist.cjs` — run after any contact graph regeneration.

### Point-Only Polygon Contacts — Phantom Front Edge Discovery (2026-03-28)

**Discovery:** The `operational_contact_graph.json` contains 46 edges with `min_dist=0` that are **point-only contacts** — two OSID polygons share a single snapped vertex but NO actual boundary segment (0 consecutive shared vertices). These are data artifacts from polygon derivation, NOT real geographic adjacency. 12 of them are cross-faction, creating phantom front edges between OSIDs that don't actually touch.

**Stats:** 46 point-only contacts (`shared_segments=0`), 1,979 real segment contacts (`shared_segments >= 1`). 12 of the 46 are cross-faction edges creating phantom front edges.

**Case study — sela_2 and golubici_2:** `op:kalinovik:sela_2` and `op:kalinovik:golubici_2` share exactly 1 vertex at `[18.293588, 43.472983]` but 0 boundary segments. The contact graph says `min_dist=0` (adjacent), but the map shows RS territory (Obalj, Ljuta) between them. This caused sector `arbih_1st_corps:7` to bridge Trnovo and Kalinovik — two geographically separated fronts — into one sector. The sector defense system then treated the combined sector as a single defensive unit, counting reserves from Trnovo as available at Kalinovik (and vice versa).

**The fix:** Enrich the contact graph with `shared_segments` count per edge (consecutive shared vertex pairs). Use `shared_segments >= 1` (not `min_dist === 0`) for all adjacency that matters — sector edge connectivity, territory contiguity, front edge generation. Point-only contacts (`shared_segments === 0`) must be filtered as artifacts.

**Impact:** sela_2 becomes an isolated enclave (no real segment contacts to other RBiH territory). Sector arbih_1st_corps:7 splits into separate Trnovo and Kalinovik components. Expected calibration impact from fixing phantom sector bridging.

### Sector Merge Contiguity Regression (2026-04-01)

**Problem:** Two RS sectors contained geographically isolated sub-segments — unrelated fronts merged into a single sector by the post-split merge logic:

- `sector:vrs_drina:1`: `subseg:vrs_drina:1` (Bratunac/Srebrenica encirclement, 13 edges) + `subseg:sector:vrs_drina:3:split0` (Kalesija/Zvornik/Kladanj front, 10 edges) — ~50km apart, zero shared front-edge OSIDs
- `sector:vrs_herzegovina:0`: `subseg:vrs_herzegovina:0` (Goražde/Foča encirclement, 14 edges) + `subseg:vrs_herzegovina:3` (Kalinovik/Konjic/Trnovo front, 19 edges) — geographically separate arcs, zero shared front-edge OSIDs

All other sectors (26 RBiH, 8 HRHB, remaining 21 RS) passed edge-by-edge contiguity audit. All sub-segments were individually contiguous. This was NOT internal sub-segment fragmentation — it was sector-level isolation after `splitNonContiguousSectors` had already correctly separated these sub-segments (evidenced by `:split0` / `:3` suffixes in sub-segment IDs).

**Root cause:** Two post-split merge paths re-grouped them:

1. **Step 4d** (brigade-ratio merge loop in `buildFactionSectors`): if `corpsBrigadeCount / corpsSectors.length < MIN_SECTOR_BRIGADES (2)`, merges smallest sector into adjacent neighbor using `areSectorsTerritoryAdjacent`
2. **`mergeSmallAdjacentSectors`**: post-build pass using the same criterion

Both used `areSectorsTerritoryAdjacent` — territory polygon contact — as the sole merge gate. The bridge OSIDs that passed this check:

- `vrs_drina:1`: `op:bratunac:polom` ↔ `op:zvornik:novo_selo` — min_dist=0, shared_segments=9 (genuine polygon boundary in the rear interior, not on the front line)
- `vrs_herzegovina:0`: `op:foca:donje_zesce` ↔ `op:foca:izbisno` — min_dist=0, shared_segments=8 (same municipality; donje_zesce faces Goražde east, izbisno faces Kalinovik south — different tactical directions)

**Key insight:** Tightening the adjacency threshold would NOT have fixed this — both bridges are min_dist=0, shared_segments>0, passing every threshold filter including sharedBoundaryAdj (≤5.5m). The merge was being gated on the wrong criterion entirely. Territory polygon contact is necessary but not sufficient for sector merging; front-edge adjacency is the correct gate.

**Downstream damage confirmed:**
- `Operation Cerska-Kamenica` (vrs_drina, t40): `rs_1st_zvornik` (at `op:zvornik:kozluk_2`, Zvornik front) locked into Srebrenica objectives via adjacent-sector attachment. 0 attack attempts — a confirmed ZEA (zero-eligible-attacker) case.
- Stance computation: single sector stance applied across both isolated fronts; a battle on Srebrenica would change posture of Zvornik brigades and vice versa.
- Threat ratio averaging: combined threat picture suppresses correct response on each front independently.
- Briefing/sector intel: one combined threat display for two independent theaters.
- Safe systems (not affected): brigade distribution (sub-segment scoped), zone detection (spatial component level), garrison budget.

**Fix — `areSectorsFrontEdgeAdjacent`** added to `corps_front_sectors.ts`:
- Collects `friendly_osids` from all sub-segments of each candidate sector
- Checks whether any OSID in sector A has a neighbor in sector B via `frontEdgeAdj` (33m threshold — same as `FRONT_EDGE_MAX_GAP` used throughout)
- Returns false if either sector has an empty front-edge OSID set

Guard inserted in both merge paths — after `areSectorsTerritoryAdjacent` passes, must also pass `areSectorsFrontEdgeAdjacent` before merge proceeds. The `frontEdgeAdj` map was already being built correctly in `buildCorpsFrontSectors` (lines 101–112) as a local variable; it is now wired through as a parameter to both `buildFactionSectors` and `mergeSmallAdjacentSectors`.

**Design principle reaffirmed:** Small + isolated = valid sector. Encirclement rings (Srebrenica, Goražde) share the same topology as the Sarajevo siege sector. A sector with low brigade count that is geographically disconnected from its neighbors must NOT be merged — it is a distinct theater. The merge step must never force-merge two sectors whose front-edge OSID sets are not adjacent, regardless of brigade count or territory polygon contact.

**Verification:** `npx tsc --noEmit` passes clean.

### Shared friendly-side merge regression hardening (2026-04-03)

Follow-up root cause: even after the front-edge adjacency guard existed, the merge helper still had a loophole. `areSectorsFrontEdgeAdjacent(...)` short-circuited to `true` when two sectors shared any friendly-side OSID. That is not a valid frontage rule. Two hostile pockets can face the same friendly-side line and still be separate frontlines.

Concrete repro:
- friendly line: `f1/f2`
- hostile pocket A: `e1`
- hostile pocket B: `e2`
- each pocket correctly splits into its own sector during initial sector construction
- the later merge pass re-glued them into one sector because both sectors shared `f1/f2`

Fix:
- removed the shared-friendly fast path from `areSectorsFrontEdgeAdjacent(...)`
- normalized late sector merges so they rebuild one merged frontline component instead of appending sub-segments together

Rule:
- sectors may merge only when the merged edge set is still one contiguous frontline component under the same edge-adjacency rules used for splitting
- shared friendly-side geometry alone is never enough
- a saved sector carrying multiple sub-segments is invalid under the current rule set; sectors are frontlines, not sub-segment bags

### Frontline-anchored commander reassignment leak (2026-04-03)

Follow-up root cause after contiguity hardening: sector truth could still be corrupted after build time by commander review. The builder produced the correct frontline sector, but `commander_override.ts` could immediately paper-transfer a brigade into a different sector if the target looked safer or more efficient, even while the brigade's `location_osid` still sat on the original sector's frontline.

Concrete repro from run `n1306`:
- `rs_skelani_battalion`
- location: `op:sekovici:sekovici_2`
- rostered to: `sector:vrs_drina:0`
- truthful physical owner: `sector:vrs_drina:2` (the location existed in both its `territory_osids` and frontline `friendly_osids`)

Fix:
- commander transfer/viability passes now treat any brigade whose current `location_osid` is on a corps sector frontline as anchored to that sector
- such brigades cannot be re-rostered into another sector until movement changes the physical truth

Rule:
- commander review may rebalance reserves and rear-area brigades
- it may not rewrite frontline ownership without movement
- sectors remain frontlines, not command preference buckets

### Cross-corps enclave rescue must not become same-component sector laundering (2026-04-03)

The enclave-rescue principle is narrower than the old implementation had become.

What is valid:
- a brigade's own corps has no sector in that component
- the brigade is physically on another same-faction sector's frontline or within that sector's territory
- the rescue pass assigns it there because the brigade is actually defending that line

What is invalid:
- the brigade shares only connected-component membership with a same-faction sector
- but its current `location_osid` is on neither that sector's frontline nor its territory
- the rescue pass still assigns it there anyway

Concrete `n1307` repro:
- `hrhb_travnik_brigade`
- location: `op:novi_travnik:rat_2`
- falsely assigned to `sector:hvo_tomislavgrad:0`
- that sector owned neither the location's frontline nor its territory

Fix:
- `assignCrossCorpsEnclaveDefenders(...)` now only rescues into foreign sectors that already truthfully own the brigade's current location by frontline or territory
- the same-component fallback was removed

Rule:
- cross-corps rescue is allowed for real enclave/frontline defense
- it is not allowed as a general same-component catch basin for unresolved brigades

---

## Diagnostic Tools

| Tool | Purpose |
|---|---|
| `tools/sector_deep_exam.cjs` | Full sector audit (contiguity, density, assignments, geography) |
| `tools/check_2nd_corps_sectors.cjs` | 2nd Corps sector listing with SREB/CERSKA tags |
| `tools/check_sreb_cerska.cjs` | Srebrenica/Cerska split verification |
| `tools/check_real_unassigned2.cjs` | Unassigned brigades + real cross-corps check |
| `tools/insanity_check_n620.cjs` | War-or-game insanity check |
| `tools/diag_vrs_sarajevo.cjs` | VRS corps Sarajevo sector/brigade diagnostics |
| `tools/check_sector_contiguity_all.cjs` | Verify ALL ARBiH sectors have contiguous friendly territory (BFS) |
| `tools/diag_bfs_seeds.cjs` | BFS seed tracing for corps territory mapping |

---

## History

| Run | Date | Change | Sectors | Area% |
|---|---|---|---|---|
| n532 | 2026-03-10 | Triple-junction connectivity | 77 | 87.0% |
| n598 | 2026-03-11 | Connected component brigade assignment | ~77 | 86.5% |
| n620 | 2026-03-12 | Shared-OSID sector split | 78 | 82.8% |
| n623 | 2026-03-12 | Fresh run (same code as n620) | 78 | 83.3% |
| n624 | 2026-03-12 | osidToCorps protection in consolidation (Herzegovina/Sarajevo fix) | 85 | 83.2% |
| n653 | 2026-03-12 | Uncontested occupation + Kotor Varos overrides | ~85 | 87.9% |
| n664 | 2026-03-13 | Triple-junction split + shared front-edge territory + need-based assignment | 92 | 88.7% |
| n666 | 2026-03-13 | Layer A: distance-weighted reactive defense | 92 | 89.1% |
| n667 | 2026-03-13 | Layer A tuning: home bonus 1.5→1.3 | 92 | 89.3% |
| n668 | 2026-03-13 | Layer B: independent sector stances (5 stances, bot AI, combat integration) | 92 | 89.0% |
| n682 | 2026-03-13 | Strict Case B contiguity — cross-enemy sector fix + municipality BFS guard | 144 | 87.1% |
| n692 | 2026-03-13 | Case B split threshold 5.5m→16.6m, merge uses same threshold | 131 | 88.2% |
| n1029 | 2026-03-23 | Contact graph min_dist enrichment — all adjacency filters now functional | TBD | 92.0% |
