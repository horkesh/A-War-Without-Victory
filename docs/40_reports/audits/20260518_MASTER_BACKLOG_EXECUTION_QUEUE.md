# Master Roadmap and Backlog Execution Queue

**Date:** 2026-05-18
**Scope:** Parent-side execution queue for the user request to continue implementing the live `MASTER_ROADMAP.md` and `CONSOLIDATED_BACKLOG.md` backlog without stopping for manual prioritization.

## Completed Batch 39 — Strict-null Phase 3 safe early-war + bot slice

| Lane | Status | Source |
|---|---|---|
| Open Phase 3 of strict-null migration with safe-scope early-war + bot slice | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH39_STRICT_NULL_PHASE3_SAFE_SLICE.md`. 8 inventory-counted Phase 3 escapes eliminated across 4 files: `simple_general_bot.ts` (5 non-null-assertion writes → local-const hoist with shared object identity), `authority_degradation.ts` (redundant `as FactionId` on already-typed `faction.id`), `control_strain.ts:132` + `militia_emergence.ts:157` (redundant `as FactionId[]` on already-typed `.map((f) => f.id).sort()`). 3 files fully CLEAN; `control_strain.ts` partial (1 load-bearing `Object.entries` return cast retained). 40w n1915 hash `b14179d65639860c` byte-identical (type-erasure-only); 18/18 strict-null inventory progress + 18/18 focused early-war tests PASS. Phase 3 remaining: 27 escapes (was 35); concentrated in `Object.entries`/`Object.keys` narrowing patterns + save-shape state inits. `alliance_update.ts` and `war_phases.ts` deliberately untouched per lane bank stop-gate. |

## Completed H1 Evidence Boundary — Watched-operation defender-power review

| Lane | Status | Source |
|---|---|---|
| H1 watched-operation visibility/component evidence | Diagnostic complete / outcome gated | Reports: `docs/40_reports/audits/20260521_H1_TRACE_BACKED_188W_PACKET.md` and `docs/40_reports/audits/20260521_H1_DEFENDER_POWER_COMPONENT_REVIEW.md`. Fresh 188w n1931 hash `3099a5fabaa04d6b` proves Cerska-Kamenica, Krivaja-95, and Stupcanica-95 are catalog-present runtime rows with no AAR and honest `build_defender_power_too_high` blockers. Active defender-power components are attributed; further outcome tuning is gated sensitive-history design under Q-H1-KRIVAJA-OUTCOME. |

## Completed Sector Performance — Build-faction label split

| Lane | Status | Source |
|---|---|---|
| Sector reconstruction `buildFactionSectors` label split | Implemented as instrumentation | Report: `docs/40_reports/implemented/20260521_SECTOR_BUILD_FACTION_LABEL_SPLIT.md`. Sidecar-only labels now distinguish territory Voronoi assign vs repair and split the duplicated post-classification label into rear normalization, truth normalization, and truth-normalization children. Pre/post profiled artifacts are byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. |

## Completed Sector Performance — Multi-source reachability

| Lane | Status | Source |
|---|---|---|
| Sector staffability reachability | Implemented as byte-identical performance reduction | Report: `docs/40_reports/implemented/20260521_SECTOR_MULTI_SOURCE_REACHABILITY.md`. `canAnyBrigadeReachAny(...)` now uses one multi-source BFS per query instead of one BFS per brigade location. The 40w profile stayed byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. Main staffability buckets dropped sharply in the clean sidecar batch. |

## Completed Sector Performance — Recovery setup attribution

| Lane | Status | Source |
|---|---|---|
| `recoverDroppedFrontEdges:faction-front-claim-setup` child attribution | Implemented as instrumentation | Report: `docs/40_reports/implemented/20260521_RECOVERY_SETUP_ATTRIBUTION.md`. Sidecar-only child labels now split setup into isolated-pocket consolidation, OSID-to-corps, cross-corps consolidation, front-edge partition, friendly/component setup, and faction brigade component indexing. Pre/post profiled artifacts are byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. |

## Completed Sector Performance — Isolated-pocket location index

| Lane | Status | Source |
|---|---|---|
| `consolidateIsolatedCorpsPockets(...)` home-location scan | Implemented as byte-identical performance reduction | Report: `docs/40_reports/implemented/20260521_ISOLATED_POCKET_LOCATION_INDEX.md`. The isolated-pocket home-brigade protection check now uses an invocation-local corps-location index instead of scanning every formation per pocket edge. The 40w profile stayed byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. Recovery setup isolated-pocket consolidation dropped 582.834ms -> 197.511ms in the clean sidecar batch. |

## Completed Sector Performance — OSID-to-corps prefilter

| Lane | Status | Source |
|---|---|---|
| `mapOsidsToCorps(...)` repeated brigade filtering | Implemented as byte-identical performance reduction | Report: `docs/40_reports/implemented/20260521_OSID_TO_CORPS_PREFILTER.md`. `mapOsidsToCorps(...)` now reuses one sorted active same-faction combat-formation list and invocation-local corps membership sets. The 40w profile stayed byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. Recovery setup `:osid-to-corps` dropped 333.054ms -> 307.073ms. A byte-identical `ensureMinimumSectorCoverage(...)` set-cache experiment regressed and was reverted. |

## Completed Sector Performance — Cross-corps component index

| Lane | Status | Source |
|---|---|---|
| `consolidateCrossCorpsFronts(...)` component scans | Implemented as byte-identical performance reduction | Report: `docs/40_reports/implemented/20260521_CROSS_CORPS_COMPONENT_INDEX.md`. Cross-corps component traversal now uses an index cursor and a per-component `componentEdgesByCorps` map for protected-corps checks. The 40w profile stayed byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. Recovery setup `:cross-corps-consolidation` dropped 278.967ms -> 272.419ms, while parent recovery setup moved noisily upward and is not claimed as a wall-clock win. |

## Completed Sector Performance — Zero-assigned coverage attribution

| Lane | Status | Source |
|---|---|---|
| `ensureMinimumSectorCoverage(...)` zero-assigned split | Implemented as instrumentation | Report: `docs/40_reports/implemented/20260521_ZERO_ASSIGNED_COVERAGE_ATTRIBUTION.md`. `territory-claim-rescue:zero-assigned` now splits into `:promote-reserve`, `:pull-rear`, `:pull-reserve`, and `:transfer-surplus` labels while preserving early exits. The 40w profile stayed byte-identical at current hash `4368f50c00c464ad`; consistency validation passed. New evidence: `:pull-rear` 275.737ms, `:pull-reserve` 264.345ms, `:promote-reserve` 245.887ms, `:transfer-surplus` 19.009ms. |

## Completed Strict-Null Runtime Non-Null Tail

| Lane | Status | Source |
|---|---|---|
| Runtime dot/index non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_RUNTIME_NONNULL_TAIL.md`. Four runtime files (`anomaly_detector.ts`, `scenario_runner.ts`, `counter_offer_generator.ts`, `displacement_takeover.ts`) now contribute zero inventory-counted dot/index non-null assertions. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 180`, `non_null_assertions_dot 8`, `non_null_assertions_index 32`, `optional_fields_game_state 473`. |
| Runtime dot/index non-null assertion cleanup continuation | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_RUNTIME_NONNULL_TAIL_2.md`. Four more runtime files (`sector_offensive.ts`, `war_phase_negotiation_steps.ts`, `war_stories.ts`, `displacement_state_utils.ts`) now contribute zero inventory-counted dot/index non-null assertions. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 180`, `non_null_assertions_dot 7`, `non_null_assertions_index 29`, `optional_fields_game_state 473`. |
| Runtime assertion cleanup continuation 3 | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_RUNTIME_NONNULL_TAIL_3.md`. Three more runtime files (`commander_march_correction.ts`, `paramilitary_sweep.ts`, `minority_erosion.ts`) now contribute zero inventory-counted `as any` and dot/index non-null assertions. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 7`, `non_null_assertions_index 23`, `optional_fields_game_state 473`. |
| Formation-spawn non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_FORMATION_SPAWN_TAIL.md`. `formation_spawn.ts` now contributes zero inventory-counted index non-null assertions by writing through the initialized formations map local. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 7`, `non_null_assertions_index 20`, `optional_fields_game_state 473`. |
| Recruitment-engine non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_RECRUITMENT_ENGINE_TAIL.md`. `recruitment_engine.ts` now contributes zero inventory-counted index non-null assertions; malformed success-result resource references now fail with an explicit invariant error instead of through `!`. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 7`, `non_null_assertions_index 19`, `optional_fields_game_state 473`. |
| Phase 3C exhaustion-gating non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASE3C_EXHAUSTION_GATING_TAIL.md`. `phase3c_exhaustion_collapse_gating.ts` now contributes zero inventory-counted dot non-null assertions by writing through the initialized local-strain state local. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 5`, `non_null_assertions_index 19`, `optional_fields_game_state 473`. |
| Supply-reserves non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_SUPPLY_RESERVES_TAIL.md`. `supply_reserves.ts` now contributes zero inventory-counted index non-null assertions by writing reserve updates through initialized map locals. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 5`, `non_null_assertions_index 13`, `optional_fields_game_state 473`. |
| Displacement non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_DISPLACEMENT_TAIL.md`. `displacement.ts` now contributes zero inventory-counted index non-null assertions by reusing the initialized displacement-state map local for routing destination lookups. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 5`, `non_null_assertions_index 11`, `optional_fields_game_state 473`. |
| Treaty-apply non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_TREATY_APPLY_TAIL.md`. `treaty_apply.ts` now contributes zero inventory-counted index non-null assertions by writing control override/recognition effects through initialized map locals. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 5`, `non_null_assertions_index 4`, `optional_fields_game_state 473`. |
| War-phases non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_WAR_PHASES_NONNULL_TAIL.md`. `war_phases.ts` now contributes zero inventory-counted dot/index non-null assertions by appending Graz Accords through the already-owned fired-event array and writing smuggling reserve income through narrowed reserve-map locals. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 4`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| UI map non-null assertion cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_UI_MAP_NONNULL_TAIL.md`. `MapContainer.tsx` and `buildCorpsFrontLinesGeoJSON.ts` now contribute zero inventory-counted dot non-null assertions through local narrowing and a defensive segment-stitching branch. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 4`, `as_any_casts 179`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Safe unknown-cast cleanup | Implemented as behavior-equivalent type-safety cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_SAFE_UNKNOWN_TAIL.md`. `scoring.ts` now types no-negotiation verdict capital as nullable instead of double-casting null, and `corps_dialogue.ts` reads compatibility combat summaries through a local structural extension. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 179`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| SupplyIntelligence as-any cleanup | Implemented as UI data-contract correction | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_SUPPLY_INTELLIGENCE_AS_ANY.md`. `SupplyIntelligence.tsx` now contributes zero inventory-counted `as_any_casts` and maps Army HQ mobilization display fields from the current `MobilizationSummaryView` contract instead of stale legacy field names. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 176`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| OpsMap as-any cleanup | Implemented as UI map type-surface cleanup | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_OPS_MAP_AS_ANY.md`. `OpsMap.tsx` now contributes zero inventory-counted `as_any_casts`; the Deck overlay control is passed through its implemented MapLibre control surface and dashed arrow extension props are typed with `PathStyleExtensionProps`. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 174`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Phase D2 reconcile CLI as-any cleanup | Implemented as CLI diagnostic type-shape correction | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASED2_RECONCILE_AS_ANY.md`. `phaseD2_settlement_count_reconcile_audit.ts` now contributes zero inventory-counted `as_any_casts` by reading current top-level settlement/census JSON shapes through local interfaces. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 171`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Phase F0 null-control CLI as-any cleanup | Implemented as CLI diagnostic state-initializer refactor | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASEF0_NULL_CONTROL_AS_ANY.md`. `phaseF0_null_political_control_settlements_report.ts` now contributes zero inventory-counted `as_any_casts` by constructing the audit `GameState` with directly typed military, political, and displacement domains. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 168`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Phase F1 unknown-control CLI as-any cleanup | Implemented as CLI diagnostic state-initializer refactor | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASEF1_UNKNOWN_CONTROL_AS_ANY.md`. `phaseF1_unknown_control_behavior_audit.ts` now contributes zero inventory-counted `as_any_casts` by constructing the audit `GameState` with directly typed military, political, and displacement domains while preserving the legacy-vs-status sample audit. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 165`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Phase F2 control-status CLI as-any cleanup | Implemented as CLI diagnostic state-initializer and static-guard refinement | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASEF2_CONTROLSTATUS_AS_ANY.md`. `phaseF2_controlstatus_migration_audit.ts` now contributes zero inventory-counted `as_any_casts`; its raw-read guard now matches the singular `.political_controller` property without falsely catching the canonical plural `.political_controllers` map. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 162`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Phase F4 unknown-attribution CLI as-any cleanup | Implemented as CLI diagnostic state-initializer refactor | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_PHASEF4_UNKNOWN_ATTRIBUTION_AS_ANY.md`. `phaseF4_unknown_control_attribution_audit.ts` now contributes zero inventory-counted `as_any_casts` by constructing the audit `GameState` with directly typed military, political, and displacement domains while preserving unknown-control reason-bucket attribution. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 159`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |
| Entrypoint initializer as-any cleanup | Implemented as smoke/CLI initializer refactor | Report: `docs/40_reports/implemented/20260521_STRICT_NULL_ENTRYPOINT_INITIALIZER_AS_ANY.md`. `src/cli/sim_run.ts` and `src/index.ts` now contribute zero inventory-counted `as_any_casts`; `src/index.ts` also runs canonical `prepareNewGameState` before the legacy smoke `executeTurn` so the smoke entrypoint serializes a valid state. Global strict-null floor is now `as_factionid_casts 2`, `as_unknown_casts 2`, `as_any_casts 153`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`. |

## Completed Batch 38 — Scenario runner redundant week-39 serialize/hash cleanup

| Lane | Status | Source |
|---|---|---|
| Remove in-loop week-39 `serializeState`+hash + post-loop `if (!final_state_hash)` fallback + replay JSONL `state_hash` field | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH38_SERIALIZATION_WEEK39_CLEANUP.md`. Closes Batch 33's "smaller byte-identical win" candidate. Two dead-on-arrival serialize+hash blocks removed; the unconditional post-reconciliation block at line ~2503 is now the sole producer of `final_state_hash` and `final_save.json` bytes. `replayLine.state_hash` field dropped (0 consumers in src/tests/tools — verified by grep). 40w n1914 hash `b14179d65639860c` matches baseline; consistency validator PASS; 7/7 serialization contract tests PASS (incl. 4 new pinning the cleanup); `npm run test:baselines` all-match. Expected perf effect (inference, not formally re-instrumented): ≈140 ms saved per 40w run (113.8 ms `final-save-serialize` + 26.8 ms `final-save-hash` redundant calls eliminated). |

## Completed Batch 37 — Sector `:split-pieces` redundant normalize skip

| Lane | Status | Source |
|---|---|---|
| Skip redundant `normalizeSectorSubSegmentsFromEdges(contiguousPiece, edgeMeta)` when `contiguousPiece === sector` (pass-through case from `splitNonContiguousSectors`) | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH37_SECTOR_SPLIT_PIECES_PERF.md`. Targets Batch 32 next-step hypothesis #2 (normalize double-call on single-piece sectors). 1-line `if`-guard in `enforceFinalSectorGeometryInvariants:split-pieces` inner loop. 40w n1913 hash `b14179d65639860c` matches baseline; consistency validator PASS; 53/53 focused sector tests PASS (incl. G1.5 cache ON/OFF byte-equality across ≥100 deterministic state variants). Carried next-step candidates: `splitNonContiguousSectors` BFS reuse across same-corps sectors; `buildSectorSliceFromSubSegment` sort-fold; in-`splitNonContiguousSectors` trailing renumber elision. `:voronoi-repair` (568 ms / 26%) runner-up. |

## Completed Batch 36 - Fast-suite merge gate repair

| Lane | Status | Source |
|---|---|---|
| Full fast-suite fixture/schema/docs repair | Implemented | Report: `docs/40_reports/implemented/20260518_MERGE_GATE_FAST_SUITE_BATCH36.md`. Full `npm.cmd test` now passes after v14 loaded-state fixtures, migration fixtures, startup snapshot, drift diagnostic, CI guardrail, player-knowledge, sector blocker, and docs-truth repairs. Codex rejected Claude's `it.skip` workaround and kept the docs-truth test active against current contracts. |

## Active Batch 1

| Lane | Status | Owner | Source |
|---|---|---|---|
| Player-faction contract and Codex/event surfacing Phase A/B/B+ | Implemented | Halley | Report: `docs/40_reports/implemented/20260518_player_faction_contract_and_codex_visibility.md`; Phase C/D remain queued. |
| VRS Corridor 92 + ARBiH zero-attack operation stalls | Implemented/diagnosed | Hegel | Report: `docs/40_reports/implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md`; 40w n1872 hash `42607f83870e01d5`. |
| Elite-loan recall/tracker + pressure-system cleanup | Verified stale/already closed | Dalton | `tests/elite_loan_recall.test.ts` and `tests/pressure_system.test.ts` passed; backlog rows reconciled. |

## Completed Batch 2

| Lane | Status | Owner | Source |
|---|---|---|---|
| Catastrophic attack stall guard | Implemented | Wegener | Report: `docs/40_reports/implemented/20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md`; 40w n1873 hash `42607f83870e01d5`. |
| HRHB cohesion floor + 65th Protection Regiment tagging | Verified stale/already correct | Carson | Report: `docs/40_reports/implemented/20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md`. |
| SettingsScreen shell cleanup | Implemented | Singer | Report: `docs/40_reports/implemented/20260518_SETTINGS_SCREEN_SHELL_CLEANUP.md`. |
| Phase pipeline silent-skip diagnostics | Implemented | Godel | Report: `docs/40_reports/implemented/20260518_PHASE_PIPELINE_SKIP_DIAGNOSTICS.md`. |

## Completed Batch 32 — `enforceFinalSectorGeometryInvariants` 5-phase sub-attribution

| Lane | Status | Source |
|---|---|---|
| Split function body into `:setup` / `:split-pieces` / `:replace-sectors` / `:voronoi-repair` / `:seed-buckets` children | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md`. n1909 (flag-on): `:split-pieces` 1198 ms / 55.5% dominates; `:voronoi-repair` 568 ms (26.3%); `:seed-buckets` 329 ms (15.2%); child Σ 2185.8 ms vs outer Σ 2158.2 ms (+1.3%, accounted for by 2-call surplus at un-labeled line-1719 invocation). 40w n1907 (default) + n1909 (flag-on) both hash `b14179d65639860c`. Next target: `:split-pieces` — inspect `splitNonContiguousSectors` BFS reuse + `normalizeSectorSubSegmentsFromEdges` double-call. |

## Completed Batch 27 — :floor-completion hoist attempt + revert (learning-only)

| Lane | Status | Source |
|---|---|---|
| Hoist `countActiveBrigadesByOsid` out of per-recipient loop in `:floor-completion` | Attempted + reverted | Report: `docs/40_reports/implemented/20260518_BATCH27_FLOOR_COMPLETION_HOIST_REVERT.md`. Two confirmation runs showed consistent +30% regression on the targeted label despite byte-identical hash. Hypothesis: V8 Map lookup cost grows with hash-table capacity; the hoisted Map accumulates transient OSID entries via `moveBrigadeToFrontTarget` in-place mutations. Reverted; n1906 hash `b14179d65639860c`. |

## Completed Batch 26 — :severe-rescue sub-attribution

| Lane | Status | Source |
|---|---|---|
| Split `:severe-rescue` into `:quiet-self-relief` + `:floor-completion` + `:severe-relief` | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH26_SEVERE_RESCUE_SUBSPLIT.md`. `:floor-completion` 696ms (65%) is the dominant child. 40w n1903 hash `b14179d65639860c`. |

## Completed Batch 25 — :zero-assigned activeCounts hoist

| Lane | Status | Source |
|---|---|---|
| Hoist `countActiveBrigadesByOsid` out of `.flatMap` in Steps 1b/1c | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH25_ZERO_ASSIGNED_ACTIVECOUNTS_HOIST.md`. `:zero-assigned` 1466.9 ms → 805.0 ms (-45.1%). 40w n1902 hash `b14179d65639860c` matches Batch 17 baseline. Cumulative session wins: Batch 22 + Batch 25 = ~2.5 s saved. |

## Completed Batch 24 — territory-claim-rescue sub-attribution

| Lane | Status | Source |
|---|---|---|
| Sub-split `:territory-claim-rescue` into `:zero-front` + `:zero-assigned` | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH24_TERRITORY_CLAIM_RESCUE_SUBSPLIT.md`. n1901 evidence: `:zero-assigned` 1466.9 ms / 1502 calls (97%) vs `:zero-front` 36.8 ms (2.4%). 40w hash `b14179d65639860c` matches Batch 17 baseline. |

## Completed Batch 23 — ensureMinimumSectorCoverage closure-hoist + 5-phase attribution

| Lane | Status | Source |
|---|---|---|
| `ensureMinimumSectorCoverage` closure-hoist + 5-phase attribution | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH23_ENSURE_COVERAGE_ATTRIBUTION.md`. Hoisted `needed`/`DENSITY_FLOOR_*` from Phase B to function-body scope, then wrapped all 5 phases in `_perfTime` callbacks via injected `perfTime` parameter. 40w n1900 hash `b14179d65639860c` matches Batch 17 baseline. `:territory-claim-rescue` (1505 ms / 56%) + `:severe-rescue` (1054 ms / 39%) are the two dominant children — clear next-target candidates. |

## Completed Batch 22 — Autonomous multi-lane closeout (single-lane + held lane)

| Lane | Status | Source |
|---|---|---|
| Sector `normalizeFinalSectorBuckets` friendlyUniverse hoist | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH22_AUTONOMOUS_MULTI_LANE.md`. Byte-identical optimization; `:friendly-universe` 1897 → 10 ms (–99.5%); parent `:normalize-buckets` 2014 → 295 ms (–85%); 40w n1899 hash `b14179d65639860c` matches Batch 17 baseline. |
| Sector `ensureMinimumSectorCoverage` 5-phase attribution | Held for Batch 23 | Phase wraps broke closure scope (`needed` from `density-floor` used in `severe-rescue`). Cleanly reverted. Re-attempt with explicit closure hoist out to function scope. |

## Completed Batch 21 — Autonomous multi-lane closeout

| Lane | Status | Source |
|---|---|---|
| Strict-null Phase 2 Batch 20 | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md`. 18 escapes removed across 3 combat files (`attack_resolution_osid`, `commander/emit`, `commander/plan`); Phase 2 remaining 39 → 21. |
| Sector reconstruction `normalizeFinalSectorBuckets` deeper attribution | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md`. 4 sidecar `_perfTime` children; 40w n1898 hash `b14179d65639860c` matches Batch 17 baseline; `:friendly-universe` at 1897ms / 42227 calls (89% of parent) is the clear next optimization target. |
| Sector reconstruction `sealMergedSectorTruth` deeper attribution | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md`. 7 sidecar `_perfTime` children; `:ensure-coverage` at 2666ms / 1502 calls (72% of parent) is the next deeper-attribution or optimization target. |

## Completed Batch 20 — Autonomous multi-lane closeout

| Lane | Status | Source |
|---|---|---|
| Strict-null Phase 2 Batch 19 | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md`. 16 escapes removed across 6 combat files (`bot_brigade_ai_osid`, `bot_brigade_eval_front`, `officer_system`, `operation_preparation`, `osid_column_movement`, `commander_march_correction`); Phase 2 remaining 55 → 39. Two `correctTransitStates` `non_null_assertions_index` deliberately preserved because `brigade_movement_state` is absent from initial save. |
| Sector reconstruction `applyFinalSectorOwnerTruthPass` deeper attribution | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md`. Five sidecar `_perfTime` children added; 40w n1897 hash `b14179d65639860c` matches Batch 17 baseline; `:normalize-buckets` at 2013.9 ms / 335 calls (73% of parent) is the next sector-perf optimization target. |
| `apr1992_52w` baseline regression refresh | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md`. All 4 platform-stable artifact hashes refreshed for `apr1992_52w` plus partial refresh for `baseline_ops_4w` / `noop_4w`; preserved `bf8f6246`'s 4-artifact trim policy. `npm.cmd run test:baselines` now PASSES across all 3 scenarios. |

## Completed Batch 19 — Autonomous multi-lane closeout

| Lane | Status | Source |
|---|---|---|
| GUI Playtest D1 (advance-turn gate + RootErrorBoundary) | Verified-stale | Report: `docs/40_reports/implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md`. 23/23 focused tests pass; surfaces and tests already on disk. |
| GUI Playtest D2 (osid-damage + force-quality coord validity) | Verified-stale | Report: `docs/40_reports/implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md`. Builder guards + coord-validity regressions already on disk. |
| Strict-null Phase 2 Batch 18 | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md`. 11 escapes removed across `battle_resolution.ts`, `combat_predictor.ts`, `commander/force_eval.ts`, `corps_operation_readiness.ts`, `front_emergence.ts`; Phase 2 remaining 66 → 55. |
| Sector reconstruction Batch 19 staffability-filter optimization | Implemented | Report: `docs/40_reports/implemented/20260518_BATCH19_AUTONOMOUS_MULTI_LANE.md`. Byte-identical optimization in `corps_front_sectors.ts`; 40w n1895 hash `b14179d65639860c` matches Batch 17 baseline; new `:staffability-filter:unique-front-counts` sidecar label. |
| `apr1992_52w` baseline drift | Pre-existing | Same actual hash reproduces on clean tree (stashed). Carried forward as a separate scenario-fixture lane. |

## Completed Batch 3

| Lane | Status | Source |
|---|---|---|
| Morale floor + exhaustion/Washington drift audit | Verified / follow-up identified | `docs/40_reports/audits/20260518_BATCH3_MORALE_AND_EXHAUSTION_DRIFT_AUDIT.md` |
| Chronicle hybrid chapters | Implemented | `docs/40_reports/implemented/20260518_CHRONICLE_HYBRID_CHAPTERS.md` |
| Telemetry local-first crash diagnostics | Implemented | `docs/40_reports/implemented/20260518_TELEMETRY_LOCAL_FIRST_CRASH_DIAGNOSTICS.md` |
| Primary Army / Corps quick-select cleanup | Implemented | `docs/40_reports/implemented/20260518_PRIMARY_COMMAND_QUICK_SELECT_CLEANUP.md` |
| Wall-clock target-truth report | Implemented | `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_TARGET_TRUTH_REPORT.md` |
| IVP breakdown modal stale row | Verified closed | `docs/40_reports/implemented/20260518_IVP_BREAKDOWN_MODAL_STALE_ROW_VERIFICATION.md` |
| Two-level event surfacing Phase C | Implemented behind flag | `docs/40_reports/implemented/20260518_TWO_LEVEL_EVENT_SURFACING_PHASE_C.md`; default 40w n1875 hash `42607f83870e01d5`. |

## Completed Batch 4

| Lane | Status | Source |
|---|---|---|
| Strict-null Phase 2 combat leaf slice | Partial implemented | `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`; integrated 40w n1878 stayed hash-stable at `42607f83870e01d5`. |
| Notification dismiss command path + first Phase D content backfill | Implemented / content partial | `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`; dismissal tests and notification projection tests pass. |
| Washington live-state vs narrative milestone reconciliation | Implemented | `docs/40_reports/audits/20260518_WASHINGTON_TIMING_RECONCILIATION.md`; live predicate AAR now uses `rbih_hrhb_framework_activated`, while `washington_agreement_1994` remains the week-102 calendar event. |
| Gold/operator templates, clean-VM evidence templates, external playtest dry-run artifacts | Repo-side implemented | `tools/release/prepare_launch_artifacts.cjs`, `docs/50_launch/release/launch_day_automation_template.md`, `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`, `docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md`. |

## Completed Batch 5

| Lane | Status | Source |
|---|---|---|
| Strict-null Phase 2 combat continuation | Partial implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH5.md`; integrated 40w n1880 stayed hash-stable at `42607f83870e01d5`; 110 combat inventory escapes remain. |
| Phase D London Conference notification content | Implemented / content partial | `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`; `london_conference_1992` moved from 0/4 to 4/4 safe recipient coverage. |

## Completed Batch 6

| Lane | Status | Source |
|---|---|---|
| Presidential campaign-loop validation | Implemented / validated | `docs/40_reports/implemented/20260518_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md`; browser evidence in `docs/40_reports/implemented/visual_validation/20260518_presidential_loop/`. |
| Formation-life packetization FL-A/FL-B | Diagnostic-closed | `docs/40_reports/implemented/20260518_FORMATION_LIFE_PACKETIZATION_FL_A_FL_B.md`; no runtime behavior changed. |
| Wall-clock measured follow-up | Truth-report closed | `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_BATCH6_MEASURED_FOLLOWUP.md`; n1881 kept hash `42607f83870e01d5`, no optimization shipped. |
| Cinematic verdict UI completion | Implemented / visually validated | `docs/40_reports/implemented/20260518_CINEMATIC_VERDICT.md`; screenshots and metrics in `docs/40_reports/implemented/visual_validation/20260518_cinematic_verdict/`. |

## Next Implementable Batches

| Batch | Candidate lanes | Notes |
|---|---|---|
| Batch 7 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH7.md`; Phase 2 remaining inventory reduced `110 -> 105`. |
| Batch 7 notification content continuation | Implemented / content partial | `docs/40_reports/implemented/20260518_EVENT_NOTIFICATION_CONTENT_BATCH7.md`; 1993 strategic posture reviews moved `0/24 -> 24/24`, sensitive-history and late-war diplomacy rows remain gated. |
| Batch 7 endgame small-screen polish | Implemented / visually validated | `docs/40_reports/implemented/20260518_ENDGAME_SMALL_SCREEN_VERDICT_FLOW.md`; mobile Report/Reckoning/Codex/Replay lower-flow controls added. |
| Batch 7 sector performance plan | Implemented as plan | `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`; next implementable task is deeper `recoverDroppedFrontEdges(...)` attribution under `PERF_PROFILE_SECTOR_PARTITION=true`. |
| Batch 8 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH8.md`; Phase 2 remaining inventory reduced `105 -> 103`. |
| Batch 8 notification content continuation | Implemented / content partial | `docs/40_reports/implemented/20260518_EVENT_NOTIFICATION_CONTENT_BATCH8.md`; six 1993 conflict/diplomacy rows moved `0/24 -> 24/24`, sensitive residual rows remain gated. |
| Batch 8 sector performance Task 3 | Implemented as instrumentation | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_ATTRIBUTION_TASK3.md`; next Task 4 target is `recoverDroppedFrontEdges:faction-front-claim-setup`. |
| Batch 9 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH9.md`; Phase 2 remaining inventory reduced `103 -> 102`. |
| Batch 9 sector performance Task 4 | Implemented / hash-stable | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_TASK4_ATTEMPT.md`; build-scoped front-claim setup cache reuses setup across the two recovery passes; timed 40w n1885 stayed hash-stable at `42607f83870e01d5`. |
| Batch 9 notification residual gate audit | Implemented as plan/audit | `docs/40_reports/implemented/20260518_EVENT_NOTIFICATION_RESIDUAL_GATE_AUDIT.md`; `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md` owns 20 rows / 102 blocks of sensitive residual content. |
| Batch 10 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH10.md`; Phase 2 remaining inventory reduced `102 -> 100`. |
| Batch 10 intel extensions first slice | Partial implemented / hash-moving by design | `docs/40_reports/implemented/20260518_INTEL_EXTENSIONS_BATCH10.md`; optional sorted per-OSID confidence/source state is live and feeds commander belief. Integrated 40w n1886 is the new active proof at `bc4e06185d3145aa`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 10 sector performance Task 5 proof | Implemented as proof/report | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_TASK5_PROOF.md`; Task 4 artifacts are byte-identical across n1881/n1885/fresh profile; next measured target is `buildFactionSectors:RS/RBiH`. |
| Batch 11 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH11.md`; Phase 2 remaining inventory reduced `100 -> 92`. |
| Batch 11 intel execution friction | Implemented / hash-moving by design | `docs/40_reports/implemented/20260518_INTEL_EXECUTION_FRICTION_BATCH11.md`; integrated 40w n1887 is the new active proof at `38fcfed23b5b5c11`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 11 sector build-faction attribution | Implemented as instrumentation | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_FACTION_SECTORS_ATTRIBUTION_BATCH11.md`; next probe is inside `buildMultiSectorsForCorps(...)`, especially RBiH 1st/2nd Corps and RS 1st Krajina/Herzegovina/Drina. |
| Batch 12 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH12.md`; Phase 2 remaining inventory reduced `92 -> 87`. |
| Batch 12 intel AAR/read-model annotation | Implemented / hash-moving serialized output | `docs/40_reports/implemented/20260518_INTEL_FRICTION_AAR_ANNOTATION_BATCH12.md`; integrated 40w n1888 is the new active proof at `248202ee4fd13027`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 12 sector build-multi attribution | Implemented as instrumentation | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_MULTI_SECTORS_ATTRIBUTION_BATCH12.md`; next probe is inside `buildSectorFromSubSegments(...)`, especially sector-object construction formation scans. |
| Batch 13 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH13.md`; Phase 2 remaining inventory reduced `87 -> 80`. |
| Batch 13 intel per-OSID target scoring | Implemented / 40w byte-identical in default path | `docs/40_reports/implemented/20260518_INTEL_PER_OSID_TARGET_SCORING_BATCH13.md`; corps offensive launch now prefers higher-confidence public `osid_confidence` targets between otherwise comparable objectives. Parent 40w n1889 kept n1888 hash `248202ee4fd13027`. |
| Batch 13 sector build-sector attribution | Implemented as instrumentation | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_ATTRIBUTION_BATCH13.md`; next probe should use the new child labels before optimizing sector-object construction scans. |
| Batch 14 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH14.md`; Phase 2 remaining inventory reduced `80 -> 75`. |
| Batch 14 sector build-sector optimization | Implemented / 40w byte-identical | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_BATCH14.md`; `buildMultiSectorsForCorps(...)` now reuses an invocation-local active combat formation scan list, reducing repeated scan child labels while preserving n1890 hash `248202ee4fd13027`. |
| Batch 14 Operation AAR Records | Implemented / UI read-only | `docs/40_reports/implemented/20260518_OPERATION_AAR_RECORDS_BATCH14.md`; Army HQ Records operation history now expands completed operations into a compact AAR deep review from existing fields. |
| Batch 15 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH15.md`; Phase 2 remaining inventory reduced `75 -> 71`. |
| Batch 15 sector active-combat index | Implemented / profiled | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BATCH15.md`; `buildFactionSectors(...)` reuses a build-local active-combat index. Fresh profile still leaves `buildFactionSectors:RS/RBiH`, per-corps construction, brigade classification, and `recoverDroppedFrontEdges:*` as candidates. |
| Batch 15 intel ambush hook | Implemented / hash-moving by design | `docs/40_reports/implemented/20260518_INTEL_AMBUSH_BATCH15.md`; low-confidence attacks into OPSEC-defended sectors now get deterministic `ambush_risk` casualty friction. Integrated 40w n1891 is `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 15 Operation AAR Chronicle route | Implemented / UI read-only | `docs/40_reports/implemented/20260518_OPERATION_AAR_CHRONICLE_BATCH15.md`; Chronicle now files player-scoped completed-operation AAR cards and routes to Army HQ Records -> Operation History. |
| Batch 16 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH16.md`; Phase 2 remaining inventory reduced `71 -> 69`. |
| Batch 16 sector attribution | Implemented as instrumentation | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BATCH16.md`; adds `buildFactionSectors:*:brigade-classification:*` child labels. Next sector lane should inspect the larger territory-assignment / minimum-coverage / corps-construction owners, not the tiny children. |
| Batch 16 Operation AAR row focus | Implemented / UI read-only | `docs/40_reports/implemented/20260518_OPERATION_AAR_BATCH16.md`; Chronicle operation AAR dossier actions now carry `operationAarId` into Army HQ Records and expand/highlight the matching completed-operation row. |
| Batch 16 intel defender-casualty hook | Implemented / hash-moving by design | `docs/40_reports/implemented/20260518_INTEL_SURPRISE_BATCH16.md`; low-confidence OPSEC `ambush_risk` now increases attacker losses and reduces defender losses under one public-safe label. Integrated 40w n1893 is `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 17 strict-null continuation | Implemented | `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH17.md`; Phase 2 remaining inventory reduced `69 -> 66`. |
| Batch 17 sector corps-construction attribution | Implemented as instrumentation / profiled | `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BATCH17.md`; adds sidecar-only `multi-sector-build` and `staffability-filter` child labels under `buildFactionSectors:*:corps-sector-construction:*`. Fresh profiled 40w n1894 kept `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks, consistency PASS. |
| Batch 17 Operation AAR per-axis Records review | Implemented / UI read-only | `docs/40_reports/implemented/20260518_OPERATION_AAR_BATCH17.md`; Records now classifies each axis objective as captured by the axis, held elsewhere by operation end, or not held from existing `axis_summaries`. |
| Batch 17 intel confidence-gap ambush friction | Implemented / hash-stable in integrated proof | `docs/40_reports/implemented/20260518_INTEL_SURPRISE_BATCH17.md`; low-confidence OPSEC casualty friction now scales by observed confidence gap inside existing bounds. Integrated 40w n1894 remains `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. |
| Batch 18 Accessibility P0 closeout verification | Verified stale / docs propagated | `docs/40_reports/implemented/20260518_ACCESSIBILITY_P0_BATCH18.md`; source-level implementation already landed in `07163a48` and current HEAD re-verifies 33 static a11y guards across clickable controls, contrast, reduced motion, form labels, lane-E forms/live regions, and shell navigation. Browser/axe remains optional RC evidence, not a reopened v1.0 P0 gate. |
| Batch 40 Supply visibility read-model (UI-1) | Implemented / UI read-only | `docs/40_reports/implemented/20260518_SUPPLY_VISIBILITY_READ_MODEL_BATCH40.md`; presidential Decision Room emits a player-scoped supply visibility card from existing `supplySummaryByFaction[playerFaction]` and `supplyStateByOsid` slices when corridors are brittle/cut or player brigades are isolated at critical OSIDs. No engine change, no new modal, no enemy-truth leakage; 40w not required because no sim-engine or scenario authority changed. |
| Batch 41 Decision Room pushback explanations (UI-2) | Implemented / UI read-only | Commit `b3c01c49`; Decision Room now projects existing player-faction Army CO pushback/refusal/modification rationale into a single inspection card that routes back to Army HQ briefing, while `OrderInterpretationPanel` / `ArmyCoPushbackPanel` remain the canonical acknowledgement surfaces. Focused UI sweep 52/52 pass; typecheck and map build clean; no 40w required because no sim or scenario authority changed. |
| Batch 42 GUI playtest D3-D7 closeout (UI-3) | Implemented / docs + coverage tests | Commit `49bcf5b3`; the GUI playtest defect sheet now has a defect-by-defect status legend, and coverage pins OPS-view right-panel exclusivity plus map-mode duplicate-label prevention. Focused UI sweep 46/46 pass; typecheck and map build clean; no 40w required because the batch did not change sim authority. |
| Batch 43 Army HQ Briefing progressive disclosure (UI-4) | Implemented / UI presentation only | Commit `dd23330a`; Army HQ situation briefing rows and Decision Room references now expose denser command context through progressive disclosure without creating a second owner for command truth. `GAME_STATE_RATING_MASTER.md` rows 20/21 updated. Focused UI sweep 67/67 pass; typecheck and map build clean; no 40w required. |
| Batch 44 Endgame faction report mobile subdivision (UI-5) | Implemented / UI presentation only | Commit `08d1aeb7`; verdict/faction-report presentation now subdivides dense mobile content so the endgame report remains scannable on narrow viewports. `GAME_STATE_RATING_MASTER.md` row 15 updated. Focused UI sweep 114/114 pass; typecheck and map build clean; no 40w required. |
| Batch 45 Onboarding legacy cleanup + persistence coverage (UI-6) | Implemented / dead-code and test migration | Commit `e0d0ef01`; retired the old `FirstTurnOrientationCard` path and replaced persistence coverage with the live onboarding overlay contract. `GAME_STATE_RATING_MASTER.md` row 24 and napkin guidance reflect that onboarding save/tutorial progression stays out of browser storage. Focused UI sweep 30/30 pass; typecheck and map build clean; no 40w required. |
| Batch 46 Accessibility RC browser evidence verification (UI-7) | Verified / report-only | Commit `7e05b967`; authored `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md` and re-ran the static a11y matrix after UI-2..UI-6: 33/33 pass, typecheck clean, map build clean. Live screen-reader, pixel contrast, and manual keyboard/browser evidence remain operator-owned, not engineering blockers. |
| Batch 47 Branch merge / PR evidence packet | Implemented / reviewer documentation | Commit `d70f5516`; authored `docs/40_reports/audits/20260518_BRANCH_MERGE_EVIDENCE_PACKET.md` with branch fingerprint, commit category inventory, evidence matrix, reviewer reading path, draft PR body, and operator-only gate carve-out. Follow-up commits `6a56e36d` and `50312dc8` corrected the live fingerprint and recorded the fresh pre-push engineering gate. |
| Sector performance follow-up | Re-profile measured corps-construction child buckets after Batch 17 | Use the sector reconstruction plan and Batch 17 sidecar evidence; leading measured children include `multi-sector-build` for RBiH 1st/2nd Corps and VRS 1st Krajina/Herzegovina/Drina plus `staffability-filter` for RBiH 2nd/3rd Corps. No optimization without byte-identity proof and focused sector equivalence tests. |
| Strict-null continuation | Continue Phase 2 beyond Batch 17 combat leaves | Batch 17 leaves 66 combat inventory escapes; continue with small verified slices. |
| Intel extensions continuation | Broader ambush/surprise modeling only if deterministic | Per-OSID confidence, execution friction, public annotations, launch target scoring, and bounded low-confidence OPSEC ambush casualty hooks are live; remaining work should not add randomness or hidden-truth UI exposure. |
| Operation AAR continuation | Larger overlay only with a new presentation mandate or richer fields | Records and Chronicle now project all current completed-operation AAR fields, including per-axis objective status. Do not add a second history owner or new schema solely to decorate the compact Records route. |
| Notification content continuation | Historian-reviewed Phase D residuals | Remaining 20 rows / 102 blocks are gated by the sensitive-content review plan; do not author fallback prose. |
| Operator evidence | Execute clean-VM and external playtest evidence outside the repo when an operator has target machines/artifacts | Repo now has templates/scripts; actual SmartScreen, Settings -> Apps, `%APPDATA%`, uninstaller registry, outreach, and response triage remain operator-only. |

## Stale Or Already Closed Rows To Reconcile

| Row | Current evidence | Required parent action |
|---|---|---|
| Brigade dissolution threshold | `docs/40_reports/implemented/20260517_BRIGADE_DISSOLUTION_THRESHOLD.md` exists | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| RBiH-HRHB Phases B/C | Implemented reports exist, but older backlog prose still said Phases B/C not started | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| B3 negotiation counter-offers | Implemented report exists, but old Phase 7 themed prose still said B3 not started | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| Paramilitary flavor/consequences | Implemented report exists, but older prose still said consequence scaling/UI/named units remain | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| RBiH supply constraint | Implemented report exists, but n292 table still showed open | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| Elite-loan recall/tracker and pressure-system cleanup | Current code/tests prove rows are already closed or stale | Reconciled in `CONSOLIDATED_BACKLOG.md`; durable lesson added to `PROJECT_LEDGER_KNOWLEDGE.md`. |

## Operator Or Design-Gated Work

| Lane | Reason not autonomous code-only |
|---|---|
| Clean-VM cosmetic finalization | Requires actual Windows VM evidence for SmartScreen, Settings -> Apps, `%APPDATA%`, and uninstaller registry behavior. Repo can add templates/scripts only. |
| External playtest outreach and weekly digest | Requires operator outreach, form deployment, and incoming-response triage. Repo can maintain templates and manifests. |
| Warroom single-image art pipeline / asset commissioning | Requires visual asset generation/selection and likely user taste gate. |
| Phase D notification content backfill | Requires historian/narrative review for per-recipient event copy before shipping all authored blocks. |

## Batch 1 Done Means

- Agent changes land on disk and are parent-verified, not accepted from summaries alone.
- Focused tests and `npm.cmd run typecheck` pass, or failures are isolated to documented pre-existing/operator-only conditions.
- Scenario-affecting changes record 40w hash/anchor/benchmark evidence.
- `MASTER_ROADMAP.md`, `CONSOLIDATED_BACKLOG.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, and `.claude/napkin.md` are updated before commit.
