# R5 Phase 2e Pure Full-Solve / Serial-Commit Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the complete current corps-sector build into a referentially transparent full solve over an explicit snapshot, then apply its exact ordered mutations through one prevalidated serial commit without changing sectors, state, reconciliation receipts, diagnostics, saves, or Task 8A behavior.

**Architecture:** Capture every current builder input into a typed immutable `SectorTopologySolveInput`, execute the unchanged faction/global/fixed-point sequence against a detached mutable working projection, and record every live-state write in an ordered mutation journal. Validate the whole journal against current state before applying any entry, then replay it in legacy order and return the solved sectors so `runFullGeometryReconciliation(...)` retains its existing installation, sub-segment, rating, and receipt ownership.

**Tech Stack:** TypeScript, Vitest, fast-check-style deterministic generated fixtures already used by the sector suites, canonical `serializeState(...)`, Node/V8 CPU profiling, phase/sector instrumentation, and the 40-week scenario runner.

---

**Date:** 2026-08-02

**Status:** IMPLEMENTATION IN PROGRESS — Task 1 COMPLETE (mutation recorder threaded through every in-scope live writer; committed). Task 2 COMPLETE (complete immutable snapshot capture; committed). Task 3 (pure full solve on detached working state) — narrow-read-interface groundwork landed (committed); the orchestrator extraction itself has not started; see the Task 3 scoping note below before resuming.

**2026-08-03 session 2 continued — Task 3 scoping + narrow-read-interface groundwork (checkpoint):** Before attempting the orchestrator extraction itself, worked out the actual architecture the plan requires and why it's substantially larger than "extract the orchestrator" reads at first glance.

**The real shape of Task 3:** the plan's section 12 stop rule ("a partial object is cast to `GameState`") forbids the obvious shortcut — cloning `state.military.formations` wholesale into a `Record<FormationId, FormationState>` "detached working projection" and feeding it straight into the EXISTING `buildFactionSectors`/`ensureMinimumSectorCoverage`/`sealMergedSectorTruth`/etc., which all still expect full `FormationState`/`GameState`-shaped arguments. That would satisfy the type checker but silently reopen every field those functions could read beyond the section 6 allow-list — exactly the shape-casting the STOP rule exists to prevent. The compliant path, per section 2's implementation note, is the harder one: every function in the call graph that currently accepts `state: GameState` (not just `getCorpsArmyPriorities`/`buildCorpsCommanderProfiles`/`getCorpsCommander`/the political-controller fallback named explicitly in the plan text) must accept a narrow read type instead, so the pure solver can hand it a `SectorTopologySolveInput`-shaped object without a cast. Task 1's read of the full builder body already showed ~25 named passes; a majority of them (confirmed this session: `commanderReviewAssignment` and its five `apply*` helpers) take no `GameState` at all and are unaffected, but `ensureMinimumSectorCoverage`, `mapOsidsToCorps`, `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, `applyFinalSectorOwnerTruthPass`, `buildFactionSectors`, and `buildCorpsFrontSectors` itself all currently thread `state: GameState` through multiple levels and would each need this treatment before a genuinely pure, cast-free `solveCorpsFrontSectorsPure` is possible. This is a materially larger undertaking than Task 1's or Task 2's own already-substantial scope, comparable to (likely exceeding) the plan's own repeated "Task 8A's own multi-day effort" comparison — not something to rush in a single sitting on top of two already-completed tasks.

**What was actually landed this session as safe, real groundwork:** a narrow structural read type, `SectorTopologyNarrowReadState = Pick<GameState, 'meta' | 'political' | 'military'>` (`src/sim/combat/sector_topology_narrow_reads.ts`), retyped onto the four functions plan section 6 names explicitly by name: `getCorpsArmyPriorities` + its 4 emergent-multiplier helpers (`bot_strategy.ts`), `buildCorpsCommanderProfiles` (`commander_override.ts`), `getCorpsCommander` (`officer_system.ts`), and `mapOsidsToCorps` (`sector_territory.ts`); plus a locally-declared `PoliticalControllerReadState = Pick<GameState, 'political'>` on `getPoliticalControllerOSID` (`settlement_control.ts`, declared in-file rather than imported from `sim/combat` to avoid a state-layer -> sim-layer dependency — caught and reverted once before landing correctly).

**Why this is safe and genuinely non-breaking:** `GameState` structurally satisfies every one of these narrower types (it has all the required fields plus more), so retyping a parameter from `GameState` to the narrow type is transparent to every existing caller — nobody's call site needed to change, and TypeScript type annotations are erased at compile time so there is zero possible runtime behavior change. This is verified, not assumed: `npx tsc --noEmit` clean, and the 7 test files that exercise these five functions (`officer_system`, `commander_driven_brigade_assignment`, `trnovo_kalinovik_sector_fix`, `officer_resentment_receipts`, `free_war_military_priorities`, `sector_topology_snapshot`, `operational_data_osid`) pass 126/126. `determinism_static_scan_r1_5` and `git diff --check` both pass. The expensive `sector_partition_buildCorpsFrontSectors_integration` suite (~20 min) was not re-run — the change is provably type-only, and that suite's one pre-existing failure (the unrelated Task-8A fixed-point-shortcut divergence documented above) is already isolated as unrelated to this Phase 2e work.

**2026-08-03 continued — brigade_assignment.ts full sweep:** Extended the same safe narrowing to every `state: GameState` parameter in `brigade_assignment.ts` (9 total, found via an exhaustive grep, not assumed): `hasActiveEnemyFeintAgainstSector`, `buildOperationParticipantSet`, `isMovementOwnedHomeReturn`, `isMovementOwnedReturnToCorps`, `columnDeploymentDestination`, `isMovementOwnedActiveLoanDeployment`, `classifyBrigadesByTerritory`, `ensureMinimumSectorCoverage` itself, and `recomputeSectorPowerAndThreat`. Every one reads only `meta`/`military` fields (movement orders/state, corps_command, formations-by-faction-lookup, turn) — confirmed by reading each function body, not inferred — so all 9 fit the existing `SectorTopologyNarrowReadState` type with no new type needed. The `GameState` import in this file became fully unused after the sweep and was removed (11 references before: 1 import + 9 signatures + 1 stray match inside the unrelated `validateGameState.js` import path string; 0 after). `npx tsc --noEmit` clean. Ran every test file referencing these 9 function names (14 files, found by grep, not guessed): `army_reserve_system`, `brigade_territory_reconciliation`, `commander_driven_brigade_assignment`, `final_sector_truth_reconciliation`, `loaned_elite_rescue_reserve_cap`, `rear_sector_bucket_truth`, `sector_coverage_truth_preservation`, `sector_frontline_truth`, `sector_partition_instrumentation`, `sector_power_threat_recompute`, `sector_severe_undercoverage_rebalance`, `sector_split_brigade_assignment`, `sector_topology_mutation_journal`, `sector_topology_snapshot` — 237/237 pass. `determinism_static_scan_r1_5` and `git diff --check` both pass.

With this sweep, `ensureMinimumSectorCoverage` — the single most-called function in the whole builder (6 in-scope call sites per Task 1) — is now itself cast-free with respect to `GameState`. The remaining `state: GameState` surface still to narrow before the orchestrator extraction is possible: `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, `applyFinalSectorOwnerTruthPass`, `buildFactionSectors`, and `buildCorpsFrontSectors` itself in `corps_front_sectors.ts` (these mostly PASS `state` through to already-narrowed functions like `mapOsidsToCorps`/`ensureMinimumSectorCoverage`/`getCorpsArmyPriorities`/`buildCorpsCommanderProfiles`, plus their own direct reads of `state.military.war_front_edges_osid`, `state.political.political_controllers` fallback, `state.meta.turn` — all still within `meta|political|military`, so likely narrowable the same way, but each needs the same verify-by-reading treatment before assuming so), plus `sector_territory.ts`'s and `sector_building.ts`'s other `GameState`-typed functions not yet checked (`assignTerritoryVoronoi`, `partitionFrontEdges`, `consolidateCrossCorpsFronts`, `consolidateIsolatedCorpsPockets`, and the sub-segment/sector-construction helpers in `sector_building.ts`).

**2026-08-03 continued — sector_territory.ts + sector_building.ts sweep:** Finished the remaining `GameState` signatures in these two files. `partitionFrontEdges` (`sector_territory.ts`) turned out not to read `state` at all — a genuinely dead parameter (kept, just narrowed the type; removing the parameter is a separate, out-of-scope change touching every call site). `buildMultiSectorsForCorps` (`sector_building.ts`) uses `state` only via the already-narrowed `getPoliticalControllerOSID(state, ...)`. `buildSectorFromSubSegments` (`sector_building.ts`) also does not read `state` anywhere in its body (confirmed by reading the full function, lines 600-693). All three now take `SectorTopologyNarrowReadState`; both files' now-fully-unused `GameState` imports were removed. `npx tsc --noEmit` clean. Ran the direct tests (`commander_driven_brigade_assignment`, `sector_partition_instrumentation`) plus the broader real-save/reconciliation suite (`sector_topology_mutation_journal`, `sector_topology_snapshot`, `final_sector_truth_reconciliation`, `real_save_sector_truth_contracts`, `sector_frontline_truth`, `brigade_territory_reconciliation`) — 146/146 pass. `determinism_static_scan_r1_5` and `git diff --check` both pass.

**Remaining surface, precisely enumerated (grep, not estimated):** `corps_front_sectors.ts` itself has **16** `state: GameState` occurrences left (line numbers as of this checkpoint: 246, 361, 789, 1124, 1174, 1288, 1375, 1421, 1674, 1772, 2395, 2669, 2838, 3030, 3055, 3522) — this is `buildCorpsFrontSectors` itself plus every internal pass function (`_flushInvocation`, `sealWarFrontFactionSideCoverage`, `canonicalizeSameFactionEdgeOwnership`, `rescueUnassignedLoanedElitesInTerritory`, `applyFinalSectorOwnerTruthPass`, `reconcileOperationSensitiveSectorRoster` — confirmed out of scope, do not touch — `normalizeFinalSectorBuckets`, `recoverDroppedFrontEdges`, `sealMergedSectorTruth`, `absorbUnstaffedSiblingFrontSectors`, `relocateMisassignedBrigadesToTruthfulOwners`, `buildFactionSectors`, and others not yet individually verified). Not started this session — each needs the same read-the-actual-body verification as every function narrowed so far (several will likely need genuinely broader access than `meta|political|military` alone, e.g. `buildCorpsFrontSectors` itself reads `state.military.war_front_edges_osid` for its very first line, which fits, but has NOT been individually confirmed field-by-field the way the other 14 functions were this session).

**2026-08-03 continued — corps_front_sectors.ts full sweep, the last big file:** Narrowed all 15 in-scope `state: GameState` signatures (`_flushInvocation`, `buildCorpsFrontSectors` itself, `__buildCorpsFrontSectorsWithoutFixedPointShortcuts`, `collectUnresolvedSectorBrigades`, `recomputeMetricsByFaction`, `isSectorUnstaffableByFaction`, `annotateUnstaffedFrontSectors`, `absorbEmptyStaffableSiblingSectors`, `applyFinalSectorOwnerTruthPass`, `recoverDroppedFrontEdges`, `getRecoveredFrontClaimSetup`, `sealMergedSectorTruth`, `buildFriendlyOsidsFromState`, `relocateMisassignedBrigadesToTruthfulOwners`, `buildFactionSectors`), each verified by reading the body first (several were already fully read during Task 1). The 16th (`reconcileOperationSensitiveSectorRoster`) stayed untouched — out of scope.

**One real gap found and fixed:** `getFactions(state)` (`sector_utils.ts`) — called from 4 of the newly-narrowed functions — is itself still typed to require full `GameState`, so `tsc` correctly failed at those 5 call sites (5, not 4, because `buildCorpsFrontSectors`'s own body calls it too) with "missing `schema_version`, `displacement`". This is exactly what plan section 6 lists as input family #3 ("Factions | `state.factions[].id`") but the earlier `SectorTopologyNarrowReadState` type (created for the smaller Task 3 groundwork commit) only covered `meta|political|military`, not `factions`. Fixed by extending the shared type to `Pick<GameState, 'meta'|'political'|'military'|'factions'>` (backward-compatible — a strict superset, so every already-narrowed function keeps compiling) and narrowing `getFactions` itself the same way. `npx tsc --noEmit` went clean immediately after that one fix — no other gaps surfaced, meaning every other function's read surface really was confined to `meta|political|military` as verified.

Also confirmed `isSectorColdFront` and `buildSectorDefenseByFactionAndOsid` (`sector_utils.ts`, both still `GameState`-typed) are genuinely out of scope: `isSectorColdFront` is imported into `corps_front_sectors.ts` only for re-export (`grep` for an actual invocation found zero), not called anywhere in this call graph.

`npx tsc --noEmit` clean. Ran the full broad sector/brigade/officer suite (22 files, the widest sweep of the session, matching Task 1's rigor since this touches the entire builder core): `sector_topology_mutation_journal`, `sector_topology_snapshot`, `sector_partition_instrumentation`, `final_sector_reconciliation_session`, `final_sector_truth_reconciliation`, `real_save_sector_truth_contracts`, `brigade_territory_reconciliation`, `final_sector_reserve_band_truth`, `rear_sector_bucket_truth`, `sector_frontline_truth`, `army_reserve_system`, `commander_driven_brigade_assignment`, `sector_power_threat_recompute`, `officer_system`, `trnovo_kalinovik_sector_fix`, `officer_resentment_receipts`, `free_war_military_priorities`, `operational_data_osid`, `loaned_elite_rescue_reserve_cap`, `sector_coverage_truth_preservation`, `sector_severe_undercoverage_rebalance`, `sector_split_brigade_assignment` — **361/361 pass**. `determinism_static_scan_r1_5` and `git diff --check` both pass.

**With this, every `GameState`-typed function actually reachable from `buildCorpsFrontSectors` is narrowed and cast-free** — `corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, plus `getFactions`/`buildCorpsCommanderProfiles`/`getCorpsCommander`/`getCorpsArmyPriorities`/`getPoliticalControllerOSID`. The `reconcileOperationSensitiveSectorRoster` exception is deliberate (plan section 7.2, confirmed multiple times this session). The narrow-read-interface prerequisite for Task 3's orchestrator extraction is now complete.

**2026-08-03 continued — the `formations` narrowing sweep is now ALSO complete.** Built `SectorTopologyWorkingFormation` (`src/sim/combat/sector_topology_narrow_formation.ts`) — a DELIBERATELY MUTABLE `Pick<FormationState, ...>` (unlike Task 2's read-only `SectorTopologyFormation` snapshot type), since the sector-building call graph both reads AND writes formation fields directly (`formation.location_osid = target`, etc. — the exact writes Task 1's mutation recorder performs when no recorder is supplied). Retyped every `formations: Record<FormationId, FormationState>` / singular `formation: FormationState` parameter reachable from `buildCorpsFrontSectors`.

**Method, not a repeat of the `state` census:** started with a field census (`grep` every `formation.`/`f.` property access across the 4 core files → 16 fields, only `entrenchment_turns` missing from Task 2's read-only type) but explicitly did NOT trust that census alone — checked every downstream helper `formations` values actually flow into (`computeLocalFrontDefensivePower`/`brigadePower` in `local_front_defense.ts`, `effectivePersonnel` in `tactical_group_personnel.ts` — already itself narrow-typed via `Pick`, confirming this pattern predates this session, `isSectorRosterEligibleFormation`, the 3 enclave functions, `DenseFormationOccupancyIndex`/`countedLocation`) before trusting the field set. Then retyped the parameter across 13 files (`corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, `sector_utils.ts`, `corps_sector_partition.ts`, `sector_roster_eligibility.ts`, `local_front_defense.ts`, `enclave_resilience.ts`, `sector_build_derived_context.ts`, `sector_topology_mutation_journal.ts`, `sector_assertions.ts`, `commander_override.ts`) and let `tsc`'s cascade surface every remaining gap — exactly the `getFactions`-style discovery pattern from the `state` sweep, but at roughly triple the scale (44 initial parameter occurrences vs ~30 for `state`).

**Two real gaps the cascade caught, both fixed:** (1) `name` — `sectorCorpsRegionalEdgeAffinity` (`corps_front_sectors.ts`) reads `corps?.name` for a Posavina/northwest text-match special case that the initial 4-file grep census missed (it matched `formation.`/`f.` prefixes only; this call site uses a differently-named local variable, `corps.name`) — added to `SectorTopologyWorkingFormation`. (2) `sector_topology_mutation_journal.ts` (Task 1's own module) still required full `FormationState` on every `record*` method — narrowing it was the single highest-value fix in this sweep, since it directly serves the *actual purpose* Task 3 needs the recorder for (writing to a detached, non-`FormationState`-shaped working projection). A handful of remaining errors were mechanical: local `FormationState[]`/`Array<{formation: FormationState}>` type annotations that needed the same retyping as their enclosing function's parameter.

**Verification:** `npx tsc --noEmit` clean (converged after 2 iterative `tsc`-guided fix batches, going from ~60 errors → ~17 → 0). Removed now-fully-unused `FormationState` imports from all 4 core files. Ran the widest test sweep of the session — 29 files, 438 tests, covering every touched module (adds `commander_override`, `commander_override_reachability`, `krivaja_roster_and_prestage`, `sector_brigade_status_assertion`, `sector_build_derived_context`, `startup_snapshot_contract`, `tg_effective_personnel` to the earlier `state`-sweep list) — **438/438 pass**. `determinism_static_scan_r1_5` and `git diff --check` both pass.

**With both the `state` and `formations` narrowing sweeps complete, every function in the sector-topology-solve call graph that will need to accept `SectorTopologySolveInput`-derived data instead of live `GameState`/`FormationState` objects now has a type signature that already accepts it** (`GameState`/`FormationState` both structurally satisfy the narrow types, so the transition is purely additive going forward — no further signature churn needed before the orchestrator extraction itself).

**Explicitly NOT done:** the orchestrator extraction itself — `SectorTopologySolveOutput`, `solveCorpsFrontSectorsPure(input: SectorTopologySolveInput): SectorTopologySolveOutput`, the detached mutable working-formation projection (built from `SectorTopologySolveInput.formations`, which is `SectorTopologyFormation`-shaped and read-only — the detached projection needs its OWN mutable clone, likely typed `Record<FormationId, SectorTopologyWorkingFormation>`, seeded from the snapshot plus `entrenchment_turns` defaulted), wiring the pure solve to actually call the now-narrow-typed pass functions against that projection instead of live state, threading a NEW mutation-recorder strategy (not `test-only-imperative-live-state`) that writes to the detached projection instead of live formations, and the RED equivalence test comparing pure-solve output/journal/diagnostics/trace against the `test-only-imperative-live-state` recorder on targeted fixtures (no-move, one-move, multi-pass recovery, demotion, final-pass-warning, final-save-projection) — none of this has started. This remains the genuinely large, separately-budgeted piece the plan itself repeatedly compares to "Task 8A's own multi-day effort." **Next action for whoever resumes:** design and build `solveCorpsFrontSectorsPure`'s orchestration itself, following plan section 9 Task 3 steps 1-6 exactly, now that every function it needs to call already accepts the narrow types.

**2026-08-03 continued — narrowed the third dimension (`spatial: SpatialContext`, 12 sites in `corps_front_sectors.ts` + `spatialFriendlyDistance`/`unboundedGraphDistance`), then hit the real architectural wall while investigating how `solveCorpsFrontSectorsPure` would actually source its data. Recording the finding in full because it changes what "extract the orchestrator" means and rules out a shortcut a future session might otherwise try.**

**The wall:** `buildCorpsFrontSectors` derives `formations` internally via `const formations = state.military.formations ?? {};` (line 444) — it is NOT a separate parameter. All this session's `state`-narrowing did was retype the top-level parameter to `Pick<GameState, 'meta'|'political'|'military'|'factions'>` — but `.military` and `.political` themselves are STILL the full, wide `MilitaryState`/`PoliticalState` interfaces (Pick only restricts which top-level KEYS are required, not the shape of the values behind those keys). Confirmed directly: `MilitaryState.formations: Record<FormationId, FormationState>` is a REQUIRED field, alongside several other unrelated required fields (`front_segments`, `front_posture`, `front_posture_regions`, `front_pressure`, `militia_pools`) that `SectorTopologySolveInput` never captured (correctly — section 6's allow-list never listed them, because nothing in the sector-topology call graph reads them).

**Why this blocks the obvious shortcut:** the natural-seeming next move — build a "detached state" object whose `.military.formations` points at the mutable working-formation clone, and feed that into the ALREADY-NARROWED `buildFactionSectors`/`sealMergedSectorTruth`/`recoverDroppedFrontEdges`/`applyFinalSectorOwnerTruthPass`/`mapOsidsToCorps`/etc. unchanged — does not work without either (a) inventing placeholder values for `front_segments`/`front_posture`/`front_posture_regions`/`front_pressure`/`militia_pools` that have nothing to do with sector building (functionally identical to the forbidden partial-object-cast the plan's own section 12 stop rule names), or (b) narrowing `MilitaryState`/`PoliticalState` themselves via nested `Pick`s. Traced (b) one level further and it does not terminate cleanly either: even a nested-narrowed `.military.corps_command: Record<string, SomeNarrowCorpsCommandType>` requires overriding `CorpsCommandState` itself, which has its own required fields (`command_span`, `subordinate_count`, `og_slots`, etc.) beyond what `SectorTopologyCorpsCommandRow` carries — and the same recursion applies to `NamedOfficerState`. **This is a genuinely recursive nested-narrowing problem, not "one more Pick away."**

**What this means for Task 3's actual architecture:** "Extract the orchestrator in existing statement order" (plan section 9 Task 3 step 4) cannot mean "keep calling the current sub-functions with a reconstructed `state`-shaped object." It has to mean the sub-functions themselves (`mapOsidsToCorps`, `buildFriendlyOsidsFromState`, `getFactions`, `recomputeMetricsByFaction`, `collectUnresolvedSectorBrigades`, `buildCorpsCommanderProfiles`/`getCorpsCommander`, `getCorpsArmyPriorities`, `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, `applyFinalSectorOwnerTruthPass`, `buildFactionSectors`, `buildCorpsFrontSectors` itself) stop taking a bundled `state: SectorTopologyNarrowReadState` parameter at all, and instead take the individual already-captured `SectorTopologySolveInput` fields (`politicalControllers`, `controlEvents`, `lastSupplyStateByOsid`, `corpsCommandByCorpsId`, `namedOfficers`, `namedOfficerData`, `campaignPlansByFaction`, `turn`, `decisionMode`, `factionIds`, etc.) as separate explicit parameters. That is a genuine function-SIGNATURE redesign across ~15-20 functions (not a type-annotation change like this session's three narrowing sweeps), each requiring the caller chain to be updated to pass the individual fields through instead of a `state` bundle — plausibly comparable in size to everything done in this session combined, and squarely the "Task 8A multi-day effort" scale the plan keeps citing.

**Deliberately not attempted this session:** building a fake/placeholder `MilitaryState`/`PoliticalState` object to unblock the existing sub-functions. That would satisfy the type checker only by violating the STOP rule's actual intent (no partial-object shape-casting), and would very likely paper over a real read-surface gap the moment a placeholder field turns out to matter.

**2026-08-03 CORRECTION — the wall above was a reasoning mistake, not a real architectural dead end.** The error was conflating two different narrowing techniques: `Pick<WideType, keys>` selects which TOP-LEVEL keys are required but leaves the VALUE behind each key at its full original width — so `Pick<GameState, 'military'>` still has `.military` typed as the complete, wide `MilitaryState`. A hand-written interface (not derived from `Pick` on the wide type) that only lists the fields actually read does NOT have this problem, and real `MilitaryState`/`PoliticalState`/`CorpsCommandState`/`NamedOfficerState` objects always satisfy such a hand-written interface, because having MORE fields than an interface requires never breaks structural assignability — no matter how many nesting levels deep. This is the exact same trick that already worked for the top-level `state`/`formations`/`spatial` narrowing this session; it just wasn't applied recursively into `.military`/`.political` themselves.

**What was actually built:** `SectorTopologyNarrowReadState` (`sector_topology_narrow_reads.ts`) was rewritten from `Pick<GameState, 'meta'|'political'|'military'|'factions'>` to a fully hand-written nested type — `SectorTopologyNarrowMilitaryState`, `SectorTopologyNarrowPoliticalState`, `SectorTopologyNarrowCorpsCommand`, `SectorTopologyNarrowOperation`, `SectorTopologyNarrowNamedOfficerState`, `SectorTopologyNarrowNamedOfficer`, `SectorTopologyNarrowCampaignPlan`, `SectorTopologyNarrowFrontPriority`, `SectorTopologyNarrowBrigadeMovementState/Order/PostureOrder`, `SectorTopologyNarrowControlEvent`, `SectorTopologyNarrowFrontEdgeRow` — each listing only the fields verified-read this session, with `military.formations` retyped to `Record<FormationId, SectorTopologyWorkingFormation>` (not `FormationState`). Verified with `npx tsc --noEmit` against the entire repo: only 4 small gaps surfaced, all fixed:
1. `SectorTopologyNarrowOperation` was missing `type`/`phase`/`axes`/`objectives` (read by `hasActiveEnemyFeintAgainstSector`'s feint-type/phase check and `operationObjectives` helper) — added.
2. `war_front_edges_osid`'s array type was marked `readonly`, which several call sites' existing (mutable-array-typed) parameters rejected — dropped `readonly` to match the real `MilitaryState` field, which also isn't `readonly`.
3. `getCorpsCommander` (`officer_system.ts`) is now GENERIC over the caller's exact state shape (`<S extends SectorTopologyNarrowReadState>`), with its return type resolving via conditional-type inference to the FULL `NamedOfficer`/`NamedOfficerState` for real-`GameState` callers (`getOfficerCombatMod`, `processOfficerSuccession`, which read fields like `defensive_skill`/`acting_commander` beyond the narrow type) and to the narrow row types for narrow-state callers. A single non-generic return type in either direction would have broken one caller class or the other.
4. `PoliticalControllerReadState` (`settlement_control.ts`, used by `getPoliticalControllerOSID`) was still `Pick<GameState, 'political'>` (full width) — narrowed one level further to `{ political: { political_controllers?: ... } }`.

All fixed via the same `tsc`-cascade-guided discipline as every prior narrowing pass. Ran the full accumulated test sweep (32 files, 458 tests, everything touched across all of this session's R5 work) — one failure was this session's OWN static-inventory test (`sector_topology_snapshot.test.ts`) whose literal marker string `'export function getCorpsCommander('` no longer matched after the generic type parameter was added — fixed the marker to `'export function getCorpsCommander<'`. Final result: **458/458 pass**, `determinism_static_scan_r1_5` and `git diff --check` both clean.

**What this actually unblocks:** with `SectorTopologyNarrowReadState` now a genuine leaf-level narrow interface, a `solveCorpsFrontSectorsPure` implementation CAN legitimately construct a real (non-cast) `{ meta, political, military, factions }` object directly from `SectorTopologySolveInput`'s already-captured fields — reshaping the flattened capture-row types (e.g. `SectorTopologyCorpsCommandRow.directive_priority_sector_id`) back into the nested shape this type expects (`{ directive: { priority_sector_id } }`), and converting `Map`s to `Record`s where the capture used `Map` for deterministic-iteration reasons but the narrow read type uses `Record` (matching real `GameState`'s own shape). **This removes the blocker recorded in the entry above** — the individual-parameter signature redesign is NOT required after all.

**Next action for whoever resumes Task 3's orchestrator step:** write the adapter function that builds a `SectorTopologyNarrowReadState`-shaped object from a `SectorTopologySolveInput` (mechanical but must preserve every field's exact semantics — reshape `corpsCommandByCorpsId`/`campaignPlansByFaction`/`namedOfficers` Maps into Records, wrap flattened `directive_priority_sector_id` back into nested `directive`, build the detached mutable `Record<FormationId, SectorTopologyWorkingFormation>` working-formation clone from `input.formations` with `entrenchment_turns` defaulted), then port `buildCorpsFrontSectors`'s and `buildFactionSectors`'s bodies into `solveCorpsFrontSectorsPure`, threading this adapter's output through the exact same pass sequence in exact statement order, using a NEW mutation-recorder strategy that writes to the detached formations instead of live ones. The orchestration port itself remains the largest remaining piece, but the type-system blocker that made it look architecturally stuck is resolved.

**2026-08-03 session 3 — adapter built and verified (checkpoint):** Built the adapter this note asked for. `src/sim/combat/sector_topology_detached_state.ts` (new): `buildDetachedNarrowReadState(input, workingFormations?)` reshapes every `SectorTopologySolveInput` field into a genuine `SectorTopologyNarrowReadState` — Maps to Records (`corpsCommandByCorpsId`, `campaignPlansByFaction`, `namedOfficers`, `brigadeMovementState`, `brigadeMovementOrders`), `directive_priority_sector_id` un-flattened back into nested `{ directive: { priority_sector_id } }`, and `military.formations` set to a supplied `workingFormations` object BY REFERENCE (not re-cloned) when passed, so a mutation recorder writing to the detached projection and the read-state seen by the pass functions stay the same object. `buildDetachedWorkingFormations(input)` builds the fresh mutable `Record<FormationId, SectorTopologyWorkingFormation>` clone, `entrenchment_turns` defaulted to `0` (write-only field, never read, so any initial value is behavior-inert). Two real type gaps surfaced by `tsc` while building this and fixed: (1) `elite_loan_state` on `SectorTopologyWorkingFormation` was pulling in the FULL `EliteLoanState` type via `Pick<FormationState, 'elite_loan_state'>` (the exact `Pick`-keeps-nested-value-wide mistake documented in the CORRECTION above, caught here in practice) — fixed by overriding it with a hand-written `SectorTopologyWorkingEliteLoanState` (`on_loan`/`loaned_to_corps`/`loan_start_turn` only) in `sector_topology_narrow_formation.ts`; (2) `SectorTopologyOperationAxisRow` (`sector_topology_solver_types.ts`) was missing `objectives?: readonly string[]` even though the real `OperationAxis.objectives: string[]` is a required field genuinely read by `hasActiveEnemyFeintAgainstSector` — added the field to the row type AND fixed `captureOperation` (`sector_topology_snapshot.ts`) to actually populate it per-axis during capture (it had been silently dropping it: parameter type didn't accept it, mapping didn't set it). `npx tsc --noEmit` clean after both fixes.
Wrote `tests/sector_topology_detached_state.test.ts` (new, 6 tests, real-save-gated): compares the detached state's every allow-listed field against the SOURCE `GameState` directly (not against the capture snapshot — a true round-trip check), including two positive guards (`sawDirective`, `sawAxisObjectives`) that fail if the save fixture stops exercising those paths, so the test can't pass vacuously. Also proves `buildDetachedWorkingFormations` produces a genuinely mutable, independent clone (mutating a working formation does not throw and does not affect the frozen capture snapshot), and that `buildDetachedNarrowReadState(input, working)` threads a supplied `working` object through by reference (`toBe`, not `toEqual`). All 6 pass; combined with `sector_topology_snapshot.test.ts` (8) and `sector_topology_mutation_journal.test.ts` (3), 17/17 pass.
**Committed** as `8e04b3aa9`. The broad sweep (7 files that actually exist and cover the touched surface, since several guessed filenames didn't exist — real names are `commander_override`, `officer_system`, `settlement_control`, the three `sector_topology_*` suites, and `sector_partition_buildCorpsFrontSectors_integration`) ran 117 tests: 116 pass, 1 fail — the SAME pre-existing "fixed-point shortcuts preserve every sector field" divergence at "mode war, seed 5, byte 39183" already isolated via `git stash` earlier this session as predating all Phase 2e work; not a regression. Confirmed via grep that neither `captureSectorTopologySolveInput` nor the new adapter functions are called from any production/turn-loop code yet (only from tests) — today's `captureOperation` behavior fix and the two type widenings are compile-time/test-scoped only, zero live blast radius. `determinism_static_scan_r1_5` and `git diff --check` both pass. Roadmap docs (`MASTER_ROADMAP.md`, `COMMAND_BOARD.md`) synced in the same increment.
**Next action:** start the actual orchestrator port — `solveCorpsFrontSectorsPure`, porting `buildCorpsFrontSectors`'s and `buildFactionSectors`'s bodies to call the now-narrow-typed pass functions against `buildDetachedNarrowReadState`'s output plus a NEW mutation-recorder strategy (distinct from `test-only-imperative-live-state`) that writes to the detached formations instead of live ones — per plan section 9 Task 3 steps 1-6. The RED equivalence test (`tests/sector_topology_solver_equivalence.test.ts`) comparing pure-solve output against `test-only-imperative-live-state` on targeted fixtures still has not been started.

**2026-08-03 session 3 continued — orchestrator scoping, a major simplification found, and two real remaining gaps precisely bounded (checkpoint, no code written this pass — read this before writing `solveCorpsFrontSectorsPure`):**

**The "port bodies" framing above is broader than necessary — a key simplification.** `buildCorpsFrontSectors` (`corps_front_sectors.ts:362`) and `buildFactionSectors` (same file, `:3523`) are, as of this session's earlier narrowing sweeps, ALREADY typed to accept `SectorTopologyNarrowReadState`/`SectorTopologyWorkingFormation` exclusively — confirmed by grep: `GameState` appears in `corps_front_sectors.ts` only in the (deliberately out-of-scope) `reconcileOperationSensitiveSectorRoster` signature, which neither orchestrator function calls. `buildCorpsFrontSectors` already accepts an optional `mutationRecorder: SectorTopologyMutationRecorder` parameter (Task 1's threading) as its 12th argument. Since the recorder's own writer methods (`sector_topology_mutation_journal.ts`) mutate whatever `formation`/state object reference they are handed — never a captured "live GameState" reference specifically — calling `buildCorpsFrontSectors` with `buildDetachedNarrowReadState(input, workingFormations)` as `state` and the EXISTING `'test-only-imperative-live-state'` recorder strategy already writes every mutation onto the DETACHED `workingFormations`, not live state, with zero new recorder strategy needed. ("test-only-imperative-live-state" is a misleading name in hindsight — it really means "write directly to whatever formation object you're given," which is exactly what a pure/detached solve also wants.) This means `solveCorpsFrontSectorsPure`'s `sectors` and `mutations` fields (plan section 7.1) can likely be produced by a genuinely THIN wrapper — build the detached state via the adapter, call the existing `buildCorpsFrontSectors` against it with a recorder, return `{ sectors, mutations: recorder.journal }` — NOT a duplicate reimplementation of the ~1,200-line combined body. This should be verified, not assumed: write the RED equivalence test first and let it prove or disprove this hypothesis empirically against real fixtures.

**Two real, unresolved gaps remain before `SectorTopologySolveOutput` (plan section 7.1) is spec-complete:**
1. **`diagnostics: readonly SectorTopologyDiagnostic[]`** — bounded and tractable. Every debug/warn emission reachable from the two orchestrator functions goes through two centralized wrappers, `emitRoutineConsoleDebug`/`emitRoutineConsoleWarn` (`src/utils/routine_console_diagnostics.ts`) — NOT scattered raw `console.*` calls. Exactly 12 call sites total in the reachable graph: 2 in `corps_front_sectors.ts`, 10 in `brigade_assignment.ts` (zero in `sector_territory.ts`/`sector_building.ts`/`commander_override.ts`/`bot_strategy.ts`/`officer_system.ts` — confirmed by grep, not assumed). The `SectorTopologyDiagnostic` type doesn't exist yet. Plan: thread an optional diagnostic-collector parameter through these 12 call sites using the EXACT same optional/no-op/dual-behavior pattern Task 1 already used for the mutation recorder (still calls the console wrapper AND pushes a row when a collector is supplied; behavior-identical when absent).
2. **`trace: SectorTopologyDeterministicTrace`** — NOT yet designed. The plan's own section 7.3 text ("Wall-clock timing remains an observational shell... on/off runs must produce identical output") suggests this is primarily about STAGE NAMES/ORDER rather than timing data, and the mutation journal's existing per-row `stage: string` field may already carry most of what a trace needs — but the exact shape (does it need entries for stages that touch zero formations? is it a flat ordered list of stage-name strings, or richer?) is a genuine open design decision, not something to freehand. Resolve this with a fresh read of plan section 7.3 in full plus the exact stage-label strings already in use across the 12 diagnostic-emission and 5 mutation-journal writer call sites before writing the type.

**Why this session stopped here rather than writing `solveCorpsFrontSectorsPure` itself:** the adapter work already banked and committed this session (`8e04b3aa9`) is fully verified; starting the orchestrator itself without first resolving the `trace` design question risks producing code that has to be walked back, which this session's own established discipline treats as worse than stopping at an honest, precisely-bounded checkpoint. Next session: resolve the `trace` shape, then follow plan section 9 Task 3 steps 1-6 in order, starting with the RED equivalence test (step 1) so the "thin wrapper" hypothesis above is proven or disproven by a real test before more code is written.

**2026-08-03 session 3 continued further — the `diagnostics` gap is now closed (uncommitted, verification in progress):** re-scoped the reachable diagnostic-emission call sites precisely against CURRENT line numbers rather than trusting the earlier count: `warnUnresolvedSectorAssignments` (the one `emitRoutineConsoleWarn` call site originally counted) is dead code, never called from anywhere in `src/`, so it's out of scope; and 2 of `classifyBrigadesByTerritory`'s/`rehomeUnassignedBrigadesToPhysicalSectorOwners`'s call sites (inside `reconcileOperationSensitiveSectorRoster`) are the already-known out-of-scope function, not the pure-solve call graph. True reachable count: 9 emission call sites (5 in `classifyBrigadesByTerritory`, 3 in `rehomeUnassignedBrigadesToPhysicalSectorOwners`, 1 in `emitFinalUnresolvedSectorWarnings`).

Built `src/sim/combat/sector_topology_diagnostic.ts` (new): `SectorTopologyDiagnostic { sequence, stage, level: 'debug'|'warn', message }`, `SectorTopologyDiagnosticCollector { record(level, stage, message) }`, `createSectorTopologyDiagnosticCollector()` — structurally mirrors Task 1's mutation recorder exactly. Threaded an optional trailing `diagnosticCollector?: SectorTopologyDiagnosticCollector` parameter through the full reachable chain, mirroring the EXISTING `mutationRecorder` threading pattern call-for-call (same functions, same call sites, same position in the chain): the 4 leaf/near-leaf functions (`emitFinalUnresolvedSectorWarnings`, `classifyBrigadesByTerritory`, `rehomeUnassignedBrigadesToPhysicalSectorOwners`) plus the 4 intermediate orchestration functions that call them (`applyFinalSectorOwnerTruthPass`, `recoverDroppedFrontEdges`, `sealMergedSectorTruth`, `buildFactionSectors`) plus `buildCorpsFrontSectors` itself — every call site keeps calling `emitRoutineConsoleDebug`/`emitRoutineConsoleWarn` exactly as before; the collector, when supplied, ADDITIONALLY records the identical message. Purely additive/optional at every signature, so no call site anywhere (live turn loop, scenario runner, `final_sector_truth_reconciliation.ts`, tests, or the 2 out-of-scope `reconcileOperationSensitiveSectorRoster` call sites) needed updating — they simply pass `undefined` for the new trailing parameter, matching exactly how Task 1's `mutationRecorder` threading worked.

`npx tsc --noEmit` clean after the full cascade. Verification in progress: the fast subset (`sector_topology_detached_state`/`sector_topology_snapshot`/`sector_topology_mutation_journal`/`commander_override`/`officer_system`/`settlement_control`, 106 tests) and the live-call-site/reconciliation surface (`final_sector_truth_reconciliation` ×2, `scenario_runner_*` ×3, `sector_partition_instrumentation`, `brigade_territory_reconciliation`, `real_save_sector_truth_contracts`, `rear_sector_bucket_truth`, `sector_frontline_truth`, 137 tests) both pass 100%. The 100-real-save-variant `sector_partition_buildCorpsFrontSectors_integration` suite (the one that would actually catch a byte-level regression, ~18-19 minutes) is running in the background — do not commit until its result is confirmed matching the known pre-existing single failure (the unrelated fixed-point-shortcuts issue) with zero NEW failures.

**`trace` (`SectorTopologyDeterministicTrace`) remains the one open design question** — not started. With `diagnostics` now solved via the identical proven pattern, the same approach likely applies: the mutation journal's `stage` field and the new diagnostic collector's `stage` field together may already be sufficient raw material for a trace (e.g., the deduplicated ordered sequence of every `stage` string seen across both streams) rather than needing a third, separate collection mechanism — worth checking before inventing a new concept.

**2026-08-03 session 3 continued yet further — `trace` is now ALSO closed (uncommitted, verification in progress).** The hypothesis above (reuse the `stage` vocabulary) turned out right, but via a cleaner route than merging the mutation/diagnostic streams: `corps_front_sectors.ts`'s existing `_perfTime(label, fn)` wrapper already brackets 100+ stages throughout the ENTIRE solve (`buildFactionSectors`, `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, `applyFinalSectorOwnerTruthPass`, and every sub-stage within them) with the exact same deterministic label vocabulary — a strict superset of the 9 diagnostic-emission stages. `_perfTime` is called ONLY from within `corps_front_sectors.ts` itself (confirmed by grep — zero call sites elsewhere), so no cross-file parameter cascade was needed at all, unlike the diagnostics work.

Design: mirror the file's OWN existing `_activeInvocation` module-level-mutable-set-at-entry precedent (used for perf timing) with a parallel `_activeTraceCollector`, set at `buildCorpsFrontSectors`'s entry (right where `_activeInvocation` is set) and cleared right before its final `return result`. `_perfTime` now calls `_activeTraceCollector?.record(label)` UNCONDITIONALLY as its first statement — NOT gated by `SECTOR_PARTITION_PERF_FLAG` (trace is deterministic solve output, not optional profiling; perf timing itself stays flag-gated as before). `buildCorpsFrontSectors` is documented as never reentrant/recursive (same docstring `_activeInvocation` already relies on), so plain set/clear is safe.

New file `src/sim/combat/sector_topology_trace.ts`: `SectorTopologyDeterministicTrace = readonly string[]`, `SectorTopologyTraceCollector { record(stage) }`, `createSectorTopologyTraceCollector()`. `buildCorpsFrontSectors` gained one new optional trailing `traceCollector?` parameter (14th), after `diagnosticCollector` — additive, so no existing caller needed updating.

New test `tests/sector_topology_trace.test.ts` (1 test, real-save-gated) proves, against a real save: (1) behavior neutrality — byte-identical sectors+state whether or not a trace collector is supplied; (2) the trace is genuinely populated (>20 entries, contains `collectUnresolvedSectorBrigades`, and stage-prefix entries from `buildFactionSectors`/`sealMergedSectorTruth`/`applyFinalSectorOwnerTruthPass`, first entry is `adjacency-build-caseB` which genuinely runs before the per-faction loop — a positive guard against a vacuous pass); (3) no cross-invocation leakage — a second call with a fresh collector produces an IDENTICAL trace (not a merged/longer one), and a subsequent untraced call is unaffected. `npx tsc --noEmit` clean. Fast sector-topology sweep (14 files / 155 tests) passes. The 100-real-save-variant integration suite is running in the background to confirm byte-identical behavior before commit (same discipline as the two prior increments this session).

**All three `SectorTopologySolveOutput` gaps (section 7.1: `mutations` already existed via Task 1; `diagnostics` and `trace` closed this session) are now solved and verified at the collector level.** What remains for `solveCorpsFrontSectorsPure` itself: (1) reshape `SectorTopologySolveInput.edges`/`.reverseMapEntries` back into `buildCorpsFrontSectors`'s expected `EdgeRecord[]`/`Map<string,string[]>|null` parameter shapes (mechanical, already confirmed structurally compatible); (2) write the RED equivalence test comparing the "thin wrapper" hypothesis (call `buildCorpsFrontSectors` against `buildDetachedNarrowReadState`'s output with all three collectors) against the `test-only-imperative-live-state` imperative oracle on real fixtures; (3) build `SectorTopologySolveOutput` and the actual `solveCorpsFrontSectorsPure` function in a new `sector_topology_solver.ts`; (4) the static guard (plan step 6) forbidding `GameState` access inside that new file specifically.

**2026-08-03 session 3 — MILESTONE: `solveCorpsFrontSectorsPure` built and proven equivalent to the imperative oracle (uncommitted, verification complete).** The "thin wrapper" hypothesis is CONFIRMED empirically, not just by type-checking: `sector_topology_solver.ts` (new) is genuinely thin — `reshapeEdges`/`reshapeReverseMap` (mechanical `SectorTopologyEdgeRow[]`/`ReadonlyMap` → `EdgeRecord[]`/`Map` conversions) plus a single call to the EXISTING `buildCorpsFrontSectors` against `buildDetachedNarrowReadState`'s output, with fresh `test-only-imperative-live-state` mutation recorder, diagnostic collector, and trace collector all supplied. No reimplementation of any pass logic. `SectorTopologySolveOutput` (section 7.1's exact shape: `sectors`/`mutations`/`diagnostics`/`trace`) added to `sector_topology_solver_types.ts`.

New `tests/sector_topology_solver.test.ts` (3 tests) proves, against a real save:
1. `solveCorpsFrontSectorsPure`'s `sectors` output is byte-identical to an unrecorded, live-state `buildCorpsFrontSectors` call over the SAME save, and its `mutations` journal matches a recorded oracle call's journal exactly (canonicalized JSON comparison, matching this session's established pattern) — **the actual equivalence proof the plan's Task 3 step 3 asked for.**
2. Solving the SAME captured `SectorTopologySolveInput` twice yields identical output both times (idempotent, no hidden mutation of the input).
3. Static guard: `sector_topology_solver.ts` never imports from `game_state.js` (plan step 6) — first attempt used an overly-greedy regex that false-matched across the file's own docstring prose; caught immediately by running the test, fixed to a precise `.not.toContain(...)` substring check.

`npx tsc --noEmit` clean. All 3 new tests pass; the wider 15-file/158-test fast sector-topology sweep passes. **This increment does NOT touch `corps_front_sectors.ts`/`brigade_assignment.ts` runtime code** (only adds new files plus a type-only addition to `sector_topology_solver_types.ts`, erased at compile time) — unlike the three prior increments this session, the 100-real-save-variant integration suite is not required here; there is no production code path for it to catch a regression in.

**Task 3 is now functionally complete per plan section 9's steps 1-4 and 6** (step 5, preserving every specific invariant, is implied by the byte-identical equivalence proof rather than enumerated separately — matches the plan's own intent that equivalence IS the preservation proof). **Not yet done:** Task 3's own explicit multi-fixture matrix (no-move, one-move, multi-pass recovery, demotion, final-pass-warning, final-save-projection — the plan names these as separate targeted fixtures, this session's test used one real-save fixture only) — worth adding for stronger coverage before Task 4 (atomic serial commit) begins, though the single real-save equivalence proof already exercises the full live production pipeline end-to-end. Task 4 itself (serially replaying the mutation journal back onto live state) has not started.

**2026-08-04 session 4 — Task 4 (steps 1-4) complete: `commitSectorTopologySolve` built, all failure modes proven, real-save round-trip and determinism confirmed (uncommitted, ready).** Built `src/sim/combat/sector_topology_commit.ts` per plan section 7.4's exact two-pass contract: `validateSectorTopologyCommit(state, input, mutations)` replays the journal into a tiny in-memory shadow (`Map<FormationId, {location_osid, entrenchment_turns, assigned_sub_segment_id, assignment}>` plus a single `unresolved` value) without touching live state, checking `state.meta.turn === input.turn`, a canonicalized-string comparison of live `war_front_edges_osid` against `input.frontEdges` (exact match, not a hash — simpler and precise since the full front-edge list is already captured), each row's `sequence` against a strict 0-based counter, and each row's `before` against the SHADOW's current value (not the original live value — critical for catching a second stale write on the same formation after a first valid one). `commitSectorTopologySolve` calls validate, then a private `applySectorTopologyCommit` that writes every row to real `state.military.formations`/`.unresolved_sector_brigades` in sequence, then sets `state.military.corps_front_sectors = {...output.sectors}` (matching every existing imperative call site's own final step).

**Deliberate deviation from the plan's literal file-ownership map** (which names `sector_topology_mutation_journal.ts` for this): put it in a new sibling file instead, because `commitSectorTopologySolve` needs `SectorTopologySolveInput`/`SectorTopologySolveOutput` from `sector_topology_solver_types.ts`, which itself already imports `SectorTopologyMutation` FROM `sector_topology_mutation_journal.ts` — importing back would be circular. Same one-concern-per-file convention as this session's other Phase 2e modules.

**Deliberate deviation on diagnostics timing**, documented in the file's own docstring: plan section 7.4 says "emit diagnostics at their declared boundary" during commit, but `output.diagnostics` is already a completed record of messages that fired live (via `emitRoutineConsoleDebug`/`Warn`, which never suppress) during the pure solve itself — the collector observes, it doesn't defer. Making diagnostics genuinely deferred until commit would require changing when `emitRoutineConsoleDebug`/`Warn` actually print, a materially different and riskier change than anything built this session; commit's job here is state mutation only. Flagging this explicitly rather than silently reinterpreting the plan.

New `tests/sector_topology_commit.test.ts` (11 tests): 7 synthetic precondition-failure tests (no fixture needed) covering every failure kind the plan's step 1 names — stale turn, changed front-edge provenance, first-row stale value, later repeated-write stale value (the shadow-vs-live-value distinction above, specifically targeted), malformed sequence, unknown mutation kind, target formation missing — plus a "every rejection leaves live state completely unchanged" test (step 2) and a "valid journal applies every row in sequence" test. Real-save-gated: `commitSectorTopologySolve`'s resulting live state is byte-identical to the imperative oracle's resulting state (the actual business-value proof — capture→solve→commit round-trips correctly), and two independent capture+solve+commit cycles on identical clones produce identical journals AND identical resulting state (step 4's determinism proof). `npx tsc --noEmit` clean; all 11 pass; the wider 6-file/32-test Phase 2e sweep passes. This increment adds only new files — no `corps_front_sectors.ts`/`brigade_assignment.ts` modification — so the 100-real-save-variant integration suite isn't required (same reasoning as the `solveCorpsFrontSectorsPure` commit).

**Plan step 5 ("Make pure-solve/serial-commit the production default; keep `test-only-imperative-live-state` explicit and inaccessible through ordinary callers") is DELIBERATELY NOT DONE.** This is a materially different and higher-risk kind of change than anything built in Tasks 1-4 so far: every prior increment this session was purely additive (new optional parameters, new files, zero existing-call-site changes) and provably behavior-preserving by construction. Switching the actual production call sites (`war_phases.ts`, `scenario_runner.ts`, `final_sector_truth_reconciliation.ts`) to route through `captureSectorTopologySolveInput` → `solveCorpsFrontSectorsPure` → `commitSectorTopologySolve` instead of calling `buildCorpsFrontSectors` directly changes which code path actually runs in production, not just what it's capable of accepting. Per this repo's own standing rules — `docs/life_lessons.md`'s "188w-validate combat changes BEFORE merge" (40w-green + CI-green is a FALSE-GREEN for combat-behavior changes) and CLAUDE.md's "One change per calibration run" — this needs its own dedicated increment: switch ONE call site, run the 188w scenario and diff against the calibration floor, not just the unit-level equivalence proof already built. Do not flip step 5 casually on the strength of the unit tests alone.

**Next action:** either (a) add Task 3's named multi-fixture matrix for stronger coverage, or (b) directly attempt plan step 5 as its own dedicated, 188w-validated increment (switch one production call site, e.g. `final_sector_truth_reconciliation.ts`, and run the full 40w/188w calibration comparison before considering it safe). Given the equivalence proof already exercises a real, active-war save end-to-end, (b) is likely the higher-value next step, but must not skip the 188w gate.

**2026-08-04 session 4 — plan step 5 ATTEMPTED, TWO REAL BUGS FOUND AND FIXED, 188w VALIDATED, production switch landed for one call site.** Switched `final_sector_truth_reconciliation.ts`'s `runFullGeometryReconciliation` (the live turn-loop's own sector-topology entry point, called from `war_phase_reconciliation_steps.ts` every turn and from `scenario_runner.ts` at startup) from calling `buildCorpsFrontSectors` directly to `captureSectorTopologySolveInput` → `solveCorpsFrontSectorsPure` → `commitSectorTopologySolve`.

**Bug 1 (found via the EXISTING `final_sector_truth_reconciliation.test.ts` suite, not a fresh test):** `runFullGeometryReconciliation` can run MULTIPLE times within one turn (the session-based multi-pass reconciliation loop in `reconcileFinalSectorTruth`). `SectorTopologySolveInput` never captured `state.military.unresolved_sector_brigades` at all, and `buildDetachedNarrowReadState` hardcoded the detached state's starting value to `undefined` — correct for a single isolated call, but on any SECOND pass within the same turn the live value is no longer `undefined`, so `commitSectorTopologySolve`'s validation (correctly) rejected the stale `before`. Fixed by adding `unresolvedSectorBrigades` to `SectorTopologySolveInput`, capturing it in `captureSectorTopologySolveInput`, and seeding the detached state from the captured value instead of a hardcoded constant.

**Bug 2 (found via an ACTUAL 188-week production scenario run, not any unit test — `SectorTopologyStaleCommitError: row 1 (formation-entrenchment, arbih_181st_mountain): expected before 0, live shadow has 1.2`):** the exact same class of bug in a second field. `entrenchment_turns` is write-only within the sector-topology call graph itself (`buildCorpsFrontSectors`/callees only ever unconditionally SET it to `0`, never read it for a computation there) — genuinely true, and the reason Task 2's original census correctly excluded it from the read-only `SectorTopologyFormation` capture type. But `buildDetachedWorkingFormations` hardcoded EVERY formation's detached starting value to `0` regardless of the real live value, which the field accumulates to nonzero elsewhere in the engine (outside this call graph) — so the mutation journal's recorded `before` was fabricated (always `0`) whenever a real formation's true entrenchment was already nonzero, which `commitSectorTopologySolve`'s validation correctly caught. Fixed the identical way: added `entrenchment_turns` to `SectorTopologyFormation`, captured it, seeded the detached working formation from the captured value. **Also found and fixed a test that was actively asserting the bug as correct behavior**: `sector_topology_detached_state.test.ts`'s "every field matches the source formation for a sample" test asserted `workingFormation.entrenchment_turns` to `.toBe(0)` unconditionally — a green test that encoded the exact defect. Both bugs are the SAME lesson: "write-only within this call graph" is true for the SECTORS output but false for the mutation journal's `before`-value fidelity, which a real commit-and-validate cycle depends on. Added synthetic non-vacuous regression tests for both (forcing nonzero values so the guard can't pass by coincidence) plus a strengthened multi-pass integration test.

**188-week production validation (via the `scenario-creator-runner-tester` skill, per this session's hook-driven dispatch — first two hook firings on plain `grep` output were spoofed/disregarded, this one was genuine):** `npm run sim:scenario:run:188w` against the candidate (with both fixes) produced `final_state_hash: bfc7e2cbebfbb9bc` — byte-for-byte the SAME hash `docs/40_reports/CALIBRATION_MASTER.md` already records for a "fresh run at current HEAD" baseline (2026-08-03, predating this change entirely): `matched_osids` 638/712, anchors 28/31 (the 3 failures are `op:zvornik:zvornik`/`op:doboj:boljanic_2`/`op:gracanica:petrovo_2` — the already-known, already-routed R6 Task 0.3 regression, root-caused elsewhere and explicitly outside this change's scope), bot benchmarks 6/6. Independently confirmed via `run_summary.json` (not just trusting the hash): identical `matched_osids`/anchor set/failing-anchor identities. **Territory-flat — zero calibration drift from the pipeline switch.**

**A self-inflicted environment-corruption incident, transparently recorded.** While trying to set up an isolated clean-baseline comparison (chasing what turned out to be a false lead — see below), a `cmd /c rmdir` on an NTFS junction pointing FROM a scratch worktree's `node_modules` TO the main repo's `node_modules` deleted the main repo's actual `node_modules` CONTENTS, not just the junction/reparse-point. This fully explained roughly an hour of confusing "2 unexpected new failures" in `sector_partition_buildCorpsFrontSectors_integration.test.ts` across several runs — vitest was failing to even load its own config because its own package was gone, not because of any real code regression. Recovered via `npm install` (user-confirmed via `AskUserQuestion` before running, given the disruption already caused) — 1234 packages restored, `tsc`/vitest confirmed working again. Flagged transparently to the user rather than silently patched over.

**The actual, decisive flake-check, done properly after the environment was fixed:** re-ran the 100-real-save-variant integration suite with git-stashed WIP (true `a0c54ceae` baseline, zero code changes) — **all 11 tests passed**, including BOTH tests that had shown failures in every prior run this session (including runs from BEFORE the node_modules incident, ruling that out as the sole explanation): "fixed-point shortcuts preserve every sector field..." and "invocation-local front-edge relations preserve...". This proves the 100-variant suite's occasional 1-2 failures are genuine PRE-EXISTING, TIMING-DEPENDENT flakiness in the sector-partition caching/fixed-point logic itself (a real latent issue, likely order-of-operations or GC-timing sensitive — worth its own separate investigation, NOT blocking this or prior Phase 2e work) — not something this session's changes caused, and not something the "single known fixed-point failure at byte 39183" pinned earlier in this doc can be trusted as a STABLE signature going forward. `git stash pop` restored the WIP; `tsc` clean, the 12-file/65-test fast Phase 2e + production-call-site sweep passes.

**Correction to this session's own earlier "100-real-save-variant integration suite... confirmed clean" claims** (the adapter/diagnostics/trace increments' commit messages this session): those claims were based on the suite showing "only the same single pre-existing failure" — which this new finding shows is not a stable signature to lean on that hard; the suite can pass 11/11 OR show 1-3 failures at different specific bytes/lines depending on timing, independent of code changes. This does NOT retroactively invalidate those increments (each was ALSO independently verified via focused unit tests with real-save fixtures, tsc, and — for the adapter/diagnostics/trace — zero production-code behavior change was even possible by construction for some of them), but the 100-variant suite's specific pass/fail count should not be over-weighted as a precision signal until its own root cause is investigated separately.

**Committed and validated: the production switch for `final_sector_truth_reconciliation.ts` is landing.** This is the FIRST change this session that actually flips a live production code path (previously every increment was purely additive/inert). Deliberately scoped to exactly one call site (the plan's own "one change per calibration run" rule) — `war_phase_reconciliation_steps.ts`'s and `scenario_runner.ts`'s calls to `reconcileFinalSectorTruth` now transitively run the pure-solve/commit pipeline; no other call site (`corps_front_sectors.ts`'s live-imperative internal recursion into itself is untouched, `scenario_runner.ts`'s own direct `buildCorpsFrontSectors` call at its other startup site is untouched) was changed.

**2026-08-04 session 4 continued — SECOND call site switched: `scenario_runner.ts`'s own startup-time direct `buildCorpsFrontSectors` call.** This was the one remaining production call site (line ~1942, inside the `state.meta.phase === 'war' && operationalData?.operationalToCanonical` startup block, itself wrapped in a `try {} catch { /* Edges may be missing; sectors will compute on first turn */ }` that already swallows any error uniformly — so a hypothetical `SectorTopologyStaleCommitError` here fails exactly as gracefully as a `buildCorpsFrontSectors` throw always did). Matched the existing local pattern of dynamically importing `buildCorpsFrontSectors` at just this one call site (no static import of `corps_front_sectors.js` exists anywhere else in this file) by dynamically importing `captureSectorTopologySolveInput`/`solveCorpsFrontSectorsPure`/`commitSectorTopologySolve` the same way, rather than introducing a new static import whose safety (circular-import-wise) wasn't already established.

Neither of this session's two capture-fidelity bugs (`unresolved_sector_brigades`, `entrenchment_turns`) could manifest differently here even in principle: this is the very FIRST sector build at scenario startup, before any turn or reconciliation pass has ever run, so both fields are still at their genuine initial values (`undefined`/`0`) regardless of whether they're threaded correctly — the fix is still correct and necessary for consistency/correctness in general, just not distinguishing behavior at THIS specific call site.

`npx tsc --noEmit` clean. `tests/scenario_no_initial_brigades.test.ts` + `tests/scenario_harness_contracts.test.ts` (24 tests, including "H1.1 scenario determinism: same scenario run twice yields identical final_save.json," which directly exercises this exact startup code path) all pass. A 40-week sanity run produced `final_state_hash: 9d2a59dc1097ff3b` — matching the documented Task 8A retention-checkpoint hash exactly (`9d2a59dc...596b4` per `COMMAND_BOARD.md`'s R4 close text). The definitive 188-week run produced `final_state_hash: bfc7e2cbebfbb9bc` — byte-identical to BOTH the documented `CALIBRATION_MASTER.md` baseline AND the first call site's own validation run; `run_summary.json` independently confirms `matched_osids` 638/712, anchors 28/31 with the identical 3 already-known/routed failing anchors, bot benchmarks 6/6. Territory-flat.

**CORRECTION before this was committed: "both call sites" above was WRONG — a re-grep found a THIRD, previously-missed production call site.** `src/sim/turn_phases/war_phases.ts:1571`, the named turn-pipeline phase step `'partition-corps-front-sectors'`, calls `buildCorpsFrontSectors` directly EVERY TURN during the war phase (`context.state.military.corps_front_sectors = buildCorpsFrontSectors(context.state, od.edges, od.opData.operationalToCanonical, od.centroids, spatial?.preCombat)`) — and unlike the two sites already switched (which both passed `undefined` for `spatial`), this one passes a REAL live `SpatialContext` (`getSpatialContextCache(context)`), which the detached-state adapter's spatial-snapshot handling has not yet been exercised against with real data at this exact call site. Given how much ground this session already covered (two call sites, two real bugs, an environment-corruption incident and recovery, and the discovery that the 100-variant suite has its own separate pre-existing flakiness), this third site — likely the MOST heavily-executed of the three, since it's a per-turn phase step, and structurally different from the other two (real spatial context, no try/catch swallowing errors the way `scenario_runner.ts`'s did) — is deliberately left for its own dedicated future increment rather than rushed into now. **Do not repeat the "both call sites are switched" claim until this one is also confirmed and switched.**

Two of three `buildCorpsFrontSectors` production call sites are now switched to the pure-solve/commit pipeline (`final_sector_truth_reconciliation.ts`'s every-turn reconciliation loop, `scenario_runner.ts`'s startup build). The third (`war_phases.ts`'s per-turn `'partition-corps-front-sectors'` phase step) remains on the direct imperative path. What else remains open: Task 3's named multi-fixture matrix (coverage, not correctness), and the separately-tracked pre-existing timing-dependent flakiness in `sector_partition_buildCorpsFrontSectors_integration.test.ts`.

**2026-08-04 session 4 continued — THIRD AND FINAL call site switched: `war_phases.ts`'s per-turn `'partition-corps-front-sectors'` phase step.** This was the structurally different one flagged in the prior checkpoint: it runs EVERY TURN during the war phase (not a one-time startup/reconciliation call), passes a REAL live `SpatialContext` (`spatial?.preCombat` from `getSpatialContextCache(context)`, unlike the two already-switched sites which both pass `undefined`), and has NO surrounding try/catch (unlike `scenario_runner.ts`'s site) — any thrown error propagates exactly as the original `buildCorpsFrontSectors` call would have, no new failure mode introduced. Verified `spatial.preCombat` is a genuine `SpatialContext` (from `SpatialContextCache`'s own type, `turn_pipeline_types.ts`), the exact type `captureSectorTopologySolveInput`'s 5th parameter expects — no adapter gap. Unlike `scenario_runner.ts`, this file already has `buildCorpsFrontSectors` STATICALLY imported (`corps_front_sectors.js`, line ~154) — matched that convention by adding static imports for the three pipeline functions rather than dynamic ones.

`npx tsc --noEmit` clean. `war_phase_step_order.test.ts` + `performance_wall_clock_report.test.ts` + `profile_hotspot_report.test.ts` (9 tests, all specifically naming this phase step) pass. A 40-week sanity run produced `final_state_hash: 9d2a59dc1097ff3b` — the SAME hash as every other 40w sanity run this session (matches the documented Task 8A retention-checkpoint hash exactly). The definitive 188-week run produced `final_state_hash: bfc7e2cbebfbb9bc` — byte-identical to the documented `CALIBRATION_MASTER.md` baseline AND both prior call-site validation runs; `run_summary.json` independently confirms `matched_osids` 638/712, anchors 28/31 with the identical 3 already-known/routed failing anchors, bot benchmarks 6/6. Territory-flat — significant because this is the structurally riskiest of the three sites (real spatial context, every-turn execution) and it STILL landed byte-identical.

**All three known `buildCorpsFrontSectors` production call sites are now switched to the pure-solve/commit pipeline.** Plan step 5 ("make pure-solve/serial-commit the production default") is now genuinely complete for the live engine, not just "2 of 3" as the prior (corrected) checkpoint left it. What remains open for Phase 2e as a whole: Task 3's named multi-fixture matrix (coverage, not correctness — the equivalence proofs already exercise real active-war saves end-to-end at every call site), and the separately-tracked pre-existing timing-dependent flakiness in `sector_partition_buildCorpsFrontSectors_integration.test.ts` (unrelated to this arc, needs its own root-cause investigation). Before declaring Phase 2e itself fully closed, re-grep `buildCorpsFrontSectors(` across `src/` one more time to confirm no fourth call site was missed — the same discipline that caught the third one before an inaccurate "both" claim was published.

**2026-08-03 session 2 continued — Task 2 complete immutable snapshot (checkpoint):** Before writing any type, re-verified the plan's own section 6 allow-list against the ACTUAL current source rather than trusting an inherited summary (the same discipline that mattered for Task 1's scope discovery) — dispatched an Explore agent for first-pass type-shape research only (no code written by the agent), then personally read `commander_override.ts` (627 lines), `officer_system.ts` (1058 lines), and the relevant sections of `bot_strategy.ts` in full before finalizing any type.

**What the verification found (all confirmed by reading function bodies directly, not summaries):**
- `buildCorpsCommanderProfiles` → `getCorpsCommander` reads only 5 officer fields total: `NamedOfficerState.{status, assigned_corps_id, effective_competence_penalty}` and `NamedOfficer.{id, competence, aggressiveness}` — NOT the full ~15-field `NamedOfficer`/`NamedOfficerState` interfaces. This let the officer-profile snapshot family go genuinely narrow (`SectorTopologyNamedOfficerStateRow`/`SectorTopologyNamedOfficerRow`, 4 fields total) rather than a full deep-copy of the officer roster — safer (smaller surface, less can go stale) and matches the plan's own stated intent ("accept narrow read interfaces") more literally than the section 6 table text alone implied.
- `commanderReviewAssignment` and its five `apply*` helpers (`applyMissionCompliance`, `applyNonPriorityExcess`, `applyOffensiveStaging`, `applyDefensiveCoherence`, `applyPositionViability`) take **no `GameState` parameter at all** — they only receive already-derived `CorpsFrontSector[]`/`formations`/`armyPriorities`/`commanderProfile`/`componentOf`/`adjacency`/`friendlyOsids`. This closes a real risk: I had briefly suspected `commanderReviewAssignment` might read `CorpsDirective` fields beyond `priority_sector_id` (offensive_targets/hold_osids/etc.) directly from state — reading the function proved it structurally cannot, since it has no state handle.
- `getCorpsArmyPriorities`'s emergent-mode helpers (`priorityAreaTrend`, `prioritySupplyMultiplier`, `priorityCampaignPlanMultiplier`) read exactly `state.meta.{turn,decision_mode}`, `state.political.{control_events,last_supply_state_by_osid,political_controllers}`, `state.military.campaign_plans[faction].{valid_until_turn,front_priorities[].{corps_id,role}}` — confirmed by reading the full functions, not the plan's prose summary. `isOffensiveObjective`/`isDefensivePriority` (which read `state.military.bot_priority_shifts` via `getActiveBotObjectiveShifts`) looked like a plausible false-positive scope addition from an initial broad grep, but reading the surrounding code showed they're a documented "secondary query surface" NOT called by `getCorpsArmyPriorities` or anything in the sector-builder call graph — correctly excluded from the allow-list.
- `mapOsidsToCorps` (sector_territory.ts) and the two `getPoliticalControllerOSID(...)` call sites (sector_building.ts) read only `state.political.political_controllers` — no new fields.

**Delivered:** `src/sim/combat/sector_topology_solver_types.ts` (the narrow `SectorTopologySolveInput` type and its 15 section-6-family sub-types, each field-level narrowing cited to the consumer that reads it) and `src/sim/combat/sector_topology_snapshot.ts` (`captureSectorTopologySolveInput(state, edges, reverseMap, centroids, spatial, options)` — same positional signature `buildCorpsFrontSectors` already accepts). The SpatialContext-absent fallback (plan: "capture the exact fallback products from edges and political control") is implemented by reusing the existing `buildOsidAdjacency`/`buildSharedBoundaryAdjacency`/`buildFriendlyComponents` exports rather than duplicating their logic, and is normalized into a full `SectorTopologySpatialSnapshot` at capture time regardless of whether `spatial` was supplied — so Task 3's pure solver sees one uniform shape, not an optional-with-fallback branch.

**Freeze contract, stated explicitly in the module docstring:** `Object.freeze` genuinely blocks mutation of plain objects/arrays at runtime (tested), but does NOT block `.set()`/`.add()` on a frozen `Map`/`Set` instance (a V8/spec limitation, not an oversight) — so Map/Set immutability is enforced by TypeScript's `ReadonlyMap`/`ReadonlySet` typing plus the deep-copy-on-capture guarantee (verified by mutate-the-source-after-capture tests), not by a runtime throw on `.set()`.

**Tests:** `tests/sector_topology_snapshot.test.ts`, 8 tests: (a) 3 real-save fidelity tests — every section-6 family present, strict ID/key ordering (`factionIds`/`formationIdsSorted`/officer/corps-command Map keys), preserved authored array order for front edges and control events, mutate-source-after-capture proves no retained identity, `Object.freeze` mutation-throws on plain leaves; (b) 5 fixture-independent static read-inventory tests, each extracting the exact verified consumer-function source region and asserting every `state.political.*`/`state.military.*` access found names a field in the allow-list, plus a positive guard so the test can't silently pass by matching nothing.

**Verification:** `npx tsc --noEmit` clean. `node_modules/.bin/vitest.cmd run tests/sector_topology_snapshot.test.ts tests/commander_driven_brigade_assignment.test.ts tests/sector_power_threat_recompute.test.ts` (the plan's own Task 2 command): 24/24 pass. `determinism_static_scan_r1_5`: pass. `git diff --check`: clean. This task is **purely additive** — `git status` shows only the 2 new `src/` files + 1 new test file, zero existing production files modified — so the regression surface to the rest of the suite is structurally zero (nothing else imports these modules yet); the expensive full-suite re-run done for Task 1 was not repeated here since there is nothing for it to catch.

**Task 2 step 6 scope note (deliberate deferral, not an omission):** the plan's Task 2 step 6 says "Refactor political-controller, commander, priority, and officer readers to narrow interfaces." This session interprets that as Task 3's job, not Task 2's: Task 2's own file-ownership list only creates the 3 files above; actually rewiring `getCorpsArmyPriorities`/`buildCorpsCommanderProfiles`/`getCorpsCommander`/the political-controller fallback to CONSUME `SectorTopologySolveInput` instead of live `GameState` is inseparable from "extract the orchestrator in existing statement order" (Task 3 step 4), since that's the moment those functions actually get called against the new snapshot instead of live state. Recorded here so the next session doesn't rediscover this as a gap.

**2026-08-03 Task 1 scope discovery (WIP checkpoint, read this before resuming):** The plan's section 6/7 writer-mapping table understates the true call frequency of `ensureMinimumSectorCoverage`. It has **8 call sites** in `corps_front_sectors.ts`, not the 1 implied by the narrative:

- `applyFinalSectorOwnerTruthPass` — 1 site, called up to **4 times** per builder invocation (some conditional on `useFixedPointShortcuts`/mutation flags).
- `reconcileOperationSensitiveSectorRoster` — 2 sites. **Confirmed out of scope** per plan section 7.2 ("the separate operation-sensitive roster reconciliation stays outside this extraction and retains its current owner") — do not thread the recorder here.
- `recoverDroppedFrontEdges` — 1 site, called 2-3 times per invocation (the third conditional on `!useFixedPointShortcuts || prunedGhostArtifacts || recoveredDroppedFrontEdges`).
- `sealMergedSectorTruth` — 2 sites, called up to **5 times** per invocation (`sealMergedSectorTruth:1` through `:5`, one conditional).
- `buildFactionSectors` — 2 sites (not 1), once per faction.

Net: one `buildCorpsFrontSectors` invocation can call `ensureMinimumSectorCoverage` **15-20+ times** in a single call, in a data-dependent order gated by several fixed-point-shortcut conditionals. The main function body (`buildCorpsFrontSectors`, `corps_front_sectors.ts` lines ~359-772) is itself a nearly 300-line sequence of ~25 named passes (`mergeSmallAdjacentSectors`, `repairDisconnectedTerritory`, `canonicalizeSiblingFrontOwnership` ×2, `mergeLateSiblingFrontFragments`, `enforceFinalSectorGeometryInvariants` ×2-3, the 5 seal passes, 2-3 recovery passes, `canonicalizeDuplicateFrontOwnershipByPiece`, 2 territory-Voronoi passes, the 4 owner-truth passes, `absorbEmptyStaffableSiblingSectors`, `rescueUnassignedLoanedElitesInTerritory`, `sealWarFrontFactionSideCoverage`, `absorbUnstaffedSiblingFrontSectors`, `canonicalizeSameFactionEdgeOwnership`, plus a `finalSaveGeometryProjection`-only branch not yet read). Characterizing the true write order requires tracing all of this, not just the tail — comparable in scope to Task 8A's own multi-day effort.

**WIP state (uncommitted-then-committed as an honest checkpoint, not a completed Task 1):**

- Created: `src/sim/combat/sector_topology_mutation_journal.ts` — `SectorTopologyMutationRecorder`, the `SectorTopologyMutation` union, `createSectorTopologyMutationRecorder('test-only-imperative-live-state')`. Rejects unknown strategy before any state access. Complete and self-consistent as written; not yet exercised by a test.
- Modified (all backward-compatible — every new parameter is optional, defaults to `undefined`, and behavior is byte-identical to before when no recorder is supplied): `brigade_assignment.ts` (`ensureMinimumSectorCoverage`'s `moveBrigadeToFrontTarget` helper now routes its `location_osid`/`entrenchment_turns` writes through the recorder when present; `syncSectorAssignmentsToFormations`'s clear-and-set sequence likewise); `corps_front_sectors.ts` (`buildCorpsFrontSectors` and `buildFactionSectors` signatures gained an optional `mutationRecorder` parameter and thread it to the one `ensureMinimumSectorCoverage` call and `syncSectorAssignmentsToFormations` call already wired).
- Typecheck is clean at this checkpoint.
- **Not done:** threading the recorder through the other 6 `ensureMinimumSectorCoverage` call sites (`applyFinalSectorOwnerTruthPass`, `recoverDroppedFrontEdges`, `sealMergedSectorTruth` ×2, `buildFactionSectors`'s second call), the `assigned_sub_segment_id = undefined` write in the reachability-demotion loop (`buildFactionSectors`, ~line 3970), the `unresolved_sector_brigades` write at the true tail, and the RED characterization test itself. None of this can be written accurately without first reading the ~300-line main body plus the 3 additional pass functions in full.

**Next action for whoever resumes this:** read `corps_front_sectors.ts` lines 359-772 in full (the actual main-body pass sequence, not just its head and tail) plus `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, and `applyFinalSectorOwnerTruthPass` in full, before writing anything further. Budget this as most of a session on its own.

**2026-08-03 session 2 — Task 1 threading complete + RED/GREEN characterization test written (checkpoint):** Completed the full reading (all four functions read in full, plus `buildFactionSectors` in full) and finished threading `mutationRecorder` through every in-scope live writer.

Additional scope discovery beyond the note above: `syncSectorAssignmentsToFormations` has **3 call sites** in `corps_front_sectors.ts` (line ~761 main body, ~1753 inside `applyFinalSectorOwnerTruthPass`, ~1907 inside `reconcileOperationSensitiveSectorRoster`), not the 1 implied by plan section 7.2's writer-mapping table. The third is inside the confirmed-out-of-scope `reconcileOperationSensitiveSectorRoster` and was left untouched; the other two are now threaded.

Final threaded-site inventory (all confirmed via source read, not the plan's narrative):
- `ensureMinimumSectorCoverage` — 6 of 8 sites now threaded: `applyFinalSectorOwnerTruthPass` (×1), `recoverDroppedFrontEdges` (×1), `sealMergedSectorTruth` (×2), `buildFactionSectors` (×2). The 2 sites inside `reconcileOperationSensitiveSectorRoster` remain untouched (confirmed out of scope).
- `syncSectorAssignmentsToFormations` — 2 of 3 sites now threaded: main body, `applyFinalSectorOwnerTruthPass`. The 1 site inside `reconcileOperationSensitiveSectorRoster` remains untouched (out of scope, same function).
- `buildFactionSectors`'s reachability-demotion `assigned_sub_segment_id = undefined` write (~line 3970) now routes through `recordFormationAssignedSubSegment` when a recorder is present.
- The main body's tail `state.military.unresolved_sector_brigades = _unresolvedBrigades` write now routes through `recordUnresolvedSectorBrigades` when a recorder is present.
- `applyFinalSectorOwnerTruthPass` and `sealMergedSectorTruth` and `recoverDroppedFrontEdges` each gained a new optional trailing `mutationRecorder` parameter. Verified backward-compatible: grepped every external caller (`final_sector_truth_reconciliation.ts`, and all test files calling `applyFinalSectorOwnerTruthPass`/`syncSectorAssignmentsToFormations`) — none pass a trailing arg past the pre-existing parameter count, so the new optional param is a no-op everywhere it isn't explicitly passed.

`npx tsc --noEmit` clean (exit 0).

Wrote `tests/sector_topology_mutation_journal.test.ts` (the plan's Task 1 RED/GREEN spec): (1) a fixture-independent direct-API contract suite (unknown-strategy rejection before any state access; each `record*` method performs its live write immediately and appends a correctly-shaped, sequenced journal row) — 2 tests; (2) an end-to-end characterization suite gated on the real save (`data/derived/latest_run_final_save.json` + `operational_contact_graph.json`) that runs `buildCorpsFrontSectors(..., isFinalPass: true)` twice — once with no recorder (legacy path) and once with a `test-only-imperative-live-state` recorder — and asserts (a) byte-identical canonicalized `{sectors, state}` output between the two runs (behavior neutrality), (b) strict 0-based journal sequencing, (c) every `formation-location` row is immediately followed by its own `formation-entrenchment` row (moveBrigadeToFrontTarget's fixed pair), (d) every `syncSectorAssignmentsToFormations:clear`-staged `formation-assignment` clear is immediately followed by its own `formation-assigned-sub-segment` clear, (e) exactly one `unresolved-sector-brigades` row, and it is the last row in the journal.

**RED→GREEN result:** the direct-API suite went RED once on a genuine test-authoring bug (mis-modeled `recordUnresolvedSectorBrigades`'s append-then-apply order as apply-then-append), fixed, then GREEN. The end-to-end real-save suite passed GREEN on the first run — meaning behavior neutrality and all four order pins held immediately, no drift found. `node_modules/.bin/vitest.cmd run tests/sector_topology_mutation_journal.test.ts tests/sector_partition_instrumentation.test.ts --pool=forks --reporter=dot`: 39/39 pass.

**Full relevant-surface suite result (2026-08-03 session 2):** ran `sector_partition_buildCorpsFrontSectors_integration`, `final_sector_truth_reconciliation`, `final_sector_reserve_band_truth`, `sector_topology_mutation_journal` (new), `real_save_sector_truth_contracts`, `rear_sector_bucket_truth` (plus the earlier `sector_partition_instrumentation` run) — 204 tests, 203 passed, 1 failed: `G1.5 ... fixed-point shortcuts preserve every sector field and direct state side effect across production modes and 100 real-save variants` (`sector_partition_buildCorpsFrontSectors_integration.test.ts`), "fixed-point divergence for mode war, seed 5 at byte 39183".

**Verified pre-existing, not a Task 1 regression:** `git stash push -- src/sim/combat/corps_front_sectors.ts` (isolating only this session's uncommitted threading edits, leaving the already-committed `060eb9b2e` state including its `brigade_assignment.ts` changes intact), then reran only that one test in isolation. Identical failure: same mode (`war`), same seed (`5`), same byte offset (`39183`), byte-identical diff content. `git stash pop` restored the threading work; `npx tsc --noEmit` and `git diff --check` both clean afterward. This proves the divergence exists independently of this session's `mutationRecorder` threading — it compares the Task 8A fixed-point-shortcut path (`useFixedPointShortcuts: true`, the production default) against `__buildCorpsFrontSectorsWithoutFixedPointShortcuts` (the reference sequence), an axis this session never touched (every edit this session only added an optional trailing parameter that is `undefined` throughout that test's entire call graph — behavior-neutral by construction, and the direct-recorder-path GREEN result above independently confirms the threading itself is correct). **Not investigated further and not fixed in this session** — it belongs to the Task 8A / R5 Phase 2d fixed-point-shortcut surface, not Phase 2e's mutation-journal extraction, and per this session's explicit instructions R6/Task-8A-adjacent regression work is out of scope right now. Flagging for whoever next touches Task 8A or the fixed-point-shortcut convergence logic: reproduce with `node_modules/.bin/vitest.cmd run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts -t "fixed-point shortcuts preserve every sector field"`.

**Task 1 commit-readiness:** all gates the plan's own Task 1 verification command lists (`tests/sector_topology_mutation_journal.test.ts tests/sector_partition_instrumentation.test.ts`, `npm run typecheck`, `git diff --check`) pass. The one broader-suite failure found is confirmed pre-existing and unrelated. Tasks 2-10 (snapshot capture, pure solve extraction, atomic commit, 3-mode×100 oracle, measurement) remain fully unstarted.

**Original status line (superseded above):** DESIGN COMPLETE / IMPLEMENTATION NOT STARTED

**Owner lane:** R5 Phase 2e, engine quality/performance/stability

**Related command-board row:** R5

**Design base:** `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`

**Current next action:** Task 1, capture the current imperative writer sequence with RED characterization before extracting any production body.

**Collision rule:** This packet owns the sector-builder and final-sector test surfaces listed below. It must not overlap another branch changing `corps_front_sectors.ts`, `brigade_assignment.ts`, `final_sector_truth_reconciliation.ts`, the real-save sector oracle, or the Phase 2 performance report.
**Runtime rule:** Scenario, baseline, V8, wall-clock, Electron, and package commands require the orchestrator's named exclusive runtime lease. Fast focused tests, TypeScript, static determinism checks, and documentation checks do not.

## 1. Status, authority, and prerequisite result

Task 8A is retained at integrated commit `0fd36157b`. Its exact-parent packet passes all predeclared gates:

- integrated candidate `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`, candidate tree `c92a6a05956bf42a24afd762f5c6815ad65c7d1f`;
- exact parent/control `5987daea518501745bc94be3939589ea5e767c23`, control tree `bf71a0240b010a080824958277e9ce933c3c402e`;
- authoritative manifest `data/derived/_debug/r5_phase2d_task8a_integrated/measurement_manifest.json`, SHA-256 `50b78332ebae96f4dd767da61c89e398c1bead91a246e1a945d657b36cea138d`, disposition `PASS_RETAIN`;

- all 14 final saves are exactly `5,085,892` bytes with SHA-256 `9d2a59dc1097ff3b69d3cec2d19962af32b7199de9f0b311d1dea4c562a596b4`;
- combined adjacency inclusive time falls `81.610253%`;
- `buildCorpsFrontSectors` inclusive time falls `7.075305%` in the paired V8 comparison;
- two of three wall-clock pairs improve, median pair improvement is `2.599063%`, maximum regression is `1.766058%`, and mean improves from `1,106.025` to `1,086.311 ms/turn` (`1.782383%`);
- unexpected canonical relation fallbacks remain zero;
- the retained fresh profile still ranks `buildCorpsFrontSectors` first at `11,834.649 ms` inclusive, `295.866 ms/turn`, and `26.2249%` of sampled application time.

The Task 8A memory movement is a watch item, not a hidden success: phase-boundary sampled peak heap rises from `215.046 MB` in the exact-parent control profile to `291.752 MB` in the candidate profile; the retained fresh owner profile samples `281.242 MB`. Phase 2e therefore has a hard memory ceiling in addition to exact-output and throughput non-regression gates.

This document authorizes only enabling extraction. It does **not** authorize incremental reuse, dirty-component solves, cross-call caching, parallel faction execution, a new reconciliation receipt, a pass skip, or Task 6. Task 6 remains closed until the exact authorization gate in section 11 passes after Phase 2e acceptance.

## 2. Governing contracts and required reading

Read these files before editing:

1. `docs/10_canon/Engine_Invariants_v0_9_0.md` sections 1, 11.1-11.4, 13.1-13.2, 14.2, and 14.4: deterministic handling, stable order, recomputation, and physical `location_osid` truth.
2. `docs/20_engineering/CODE_CANON.md`, especially Determinism Contract and Canonical Turn Pipelines: no new entrypoint and byte-identical output from identical input.
3. `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`, especially stable ordering and byte-identical reruns.
4. `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, war-phase owner and pre-commit checklist.
5. `docs/20_engineering/REPO_MAP.md`, canonical war pipeline and scenario harness.
6. `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`, Persistence Contract: `corps_front_sectors` is a persisted current-turn snapshot and rebuilding it can relocate formations.
7. `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`, especially Tasks 6-8 and rejected shortcuts.
8. `docs/40_reports/implemented/20260801_ENGINE_QUALITY_PHASE2_MEASURED_PERFORMANCE.md` and `data/derived/_debug/r5_phase2d_task8a_integrated/measurement_manifest.json`.
9. `src/sim/combat/corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, `sector_splitting.ts`, `commander_override.ts`, `bot_strategy.ts`, `officer_system.ts`, `final_sector_truth_reconciliation.ts`, and `src/sim/turn_phases/war_phase_reconciliation_steps.ts`.
10. `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests/final_sector_reconciliation_session.test.ts`, `tests/final_sector_truth_reconciliation.test.ts`, and `tests/real_save_sector_truth_contracts.test.ts`.

The determinism skill's `docs/PHASE_A_INVARIANTS.md` reference is stale at this revision; that file does not exist. Do not invent it. The live authority is the set above.

### Architecture assessment

- `CODE_CANON.md` makes `src/sim/turn_pipeline.ts` the sole war runtime and forbids shadow entrypoints. Phase 2e therefore remains an internal builder extraction called by the existing reconciliation owner.
- `ADR-0006` explicitly says sector rebuilding can relocate formations and is not an observational cache rebuild. A delayed commit is safe only if the detached solver observes each local write at the exact point the legacy builder would have written live state.
- Engine Invariants sections 11.3 and 14.2 require stable `strictCompare` ordering for sector construction and brigade operations. Every snapshot collection, journal, diagnostic, and commit traversal therefore has an explicit stable order; no `Object.values` or `Map` iteration may become output-significant without a preceding sort or preserved legacy insertion contract.
- Engine Invariants sections 13.1-13.2 do not permit a new persisted cache. The solve snapshot, working projection, Task 8A relation, dense occupancy, and mutation journal are invocation-local and absent from `GameState` and serialization.
- `DETERMINISM_TEST_MATRIX.md` requires byte-identical reruns. Hash-only comparison is insufficient here because the changed boundary includes reports, sessions, receipts, mutation order, warnings, and direct state writes.

## 3. Purpose and non-goals

### Purpose

Create a narrow architecture boundary with three explicit owners:

1. `captureSectorTopologySolveInput(...)` owns a complete immutable read snapshot.
2. `solveCorpsFrontSectorsPure(...)` owns the full current topology algorithm over detached working state and returns sectors, ordered mutations, deterministic diagnostics, and deterministic instrumentation counters.
3. `commitSectorTopologySolve(...)` owns preflight validation and serial live-state replay.

The production wrapper remains `buildCorpsFrontSectors(...)`. Its default becomes:

```ts
const input = captureSectorTopologySolveInput(state, edges, reverseMap, centroids, spatial, options);
const output = solveCorpsFrontSectorsPure(input);
commitSectorTopologySolve(state, output);
return output.sectors;
```

`runFullGeometryReconciliation(...)` remains unchanged in ownership: it snapshots active locations, calls the builder, installs `state.military.corps_front_sectors`, assigns sub-segments, clears stale ownership, computes ratings, and reports final active-location deltas.

### Non-goals

- No incremental/faction/component solve, dirty identity, cross-call reuse, memoized prior output, `WeakMap`, or module cache.
- No parallel faction execution. Later factions and recovery must see earlier local location writes in exact order.
- No change to Task 8A relation construction/query/fallback behavior, its explicit `test-only-legacy-edge-adjacency` oracle, or dense occupancy.
- No topology rule, threshold, pass count, fixed-point receipt, sector ID, warning text, or gameplay change.
- No save schema, migration, baseline refresh, scenario authoring, UI, Electron, package, version, tag, signing, publication, or release-state change.
- No canon edit and no edit to `docs/10_canon/FORAWWV.md`.
- No claim that the extraction improves performance. It is accepted only if it is exact, bounded in memory, and non-regressing enough to serve as enabling architecture.

## 4. Approaches considered

| Approach | Disposition | Reason |
|---|---|---|
| Explicit typed snapshot + detached working projection + serial journal commit | **Selected** | Makes every read/write reviewable, lets later solve stages see prior local writes, keeps live state unchanged until validation succeeds, and creates the only safe future boundary for incremental research. |
| Clone the complete `GameState`, run the current builder on the clone, then diff | Rejected | Copies unrelated state, worsens the observed Task 8A heap risk, hides the true read contract, produces an unordered semantic diff instead of the exact write sequence, and can silently acquire new inputs. |
| Solve each faction independently or in parallel and merge | Rejected | Current strict-sorted faction construction reads all formations; coverage can relocate a formation before later factions and recovery read it. Independent solves would change behavior before any incremental work begins. |
| Keep direct state mutation and expose a nominal `solve` wrapper | Rejected | Does not create a pure boundary and cannot prove that the caller can defer live writes safely. |

## 5. Current call graph and exact write order

The accepted 40-week profile records 99 builds:

| Caller | Calls | Ownership |
|---|---:|---|
| Scenario startup projection | 1 | `scenario_runner.ts` direct build before turn 1. |
| Pre-combat sector partition | 40 | `war_phases.ts` direct build once per turn. |
| First post-combat reconciliation | 40 | `runFullGeometryReconciliation(...)`. |
| Location-writeback fixed points | 17 | Session geometry receipt after a build changes active locations. |
| Final-save projection | 1 | New reconciliation session with `finalSaveGeometryProjection`. |

Within one build, the observable order is:

1. validate strategies and early-return conditions;
2. build/reuse graph views, edge metadata, Task 8A relations, sorted formation IDs, and pre-recovery setup;
3. for factions in `strictCompare` order, build sectors and immediately expose local coverage writes to later faction reads;
4. run the existing global merge, repair, canonicalization, five seal passes, conditional convergence, recovery, owner-truth, side-coverage, absorption, final-save projection, and metric sequence exactly as written;
5. for each formation ID in stable order, conditionally clear a sector assignment and then unconditionally clear its sub-segment field; afterward traverse sectors in stable order and each authored assigned/reserve/rear brigade list in its existing order to set assignments;
6. set `state.military.unresolved_sector_brigades`;
7. emit ordered final unresolved warnings only when `isFinalPass`;
8. flush optional performance diagnostics and return sectors;
9. the reconciliation caller installs sectors, assigns sub-segments, clears stale sub-segment ownership, computes ratings, and records the final location delta.

The solver must update its detached working formation projection at steps 3-5. The serial commit is delayed relative to live state, not relative to the algorithm's own reads.

## 6. Complete builder input inventory

The following table is the Phase 2e read allow-list. A static test must fail if the solver path reads a `GameState` field not represented here.

| Input family | Current reads | Snapshot field and capture rule |
|---|---|---|
| Invocation modes | `isFinalPass`, `finalSaveGeometryProjection`, fixed-point strategy, dense/legacy occupancy strategy, Task 8A relation strategy/counters | `options`; validate enum values before reading state; counters remain test-only and outside deterministic output. |
| Turn/mode | `meta.turn`, `meta.decision_mode` | Scalars `turn`, `decisionMode`. |
| Factions | `state.factions[].id` | `factionIds`, copied and `strictCompare` sorted. |
| Front truth | `military.war_front_edges_osid` with `edge_id`, `a`, `b`, `side_a`, `side_b` | Deep-copied ordered front-edge rows; preserve the existing array as semantic source and use explicit sorts at current sorted consumers. |
| Operational graph | `edges` fields used by OSID/shared-boundary/Case-B adjacency; optional `reverseMap`; optional centroids | Deep-copied/frozen `edges`, strict-key `reverseMapEntries` with copied SID arrays, and strict-key centroid entries. Do not retain mutable caller maps. |
| Spatial snapshot | adjacency, shared-boundary adjacency, friendly OSIDs by faction, components by faction; phase/turn only for provenance | Deep-copied sorted entry arrays rebuilt into invocation-local read-only maps/sets. If no `SpatialContext` exists, capture the exact fallback products from `edges` and political control. |
| Political control | `political.political_controllers` directly and through `getPoliticalControllerOSID(...)` | Strict-key record copy `politicalControllers`; preserve `null`/`undefined` distinction where the current lookup does. |
| Cold-front exception | `political.graz_east_herzegovina_active_turn` | Scalar/null snapshot. |
| Emergent commander priority | `political.control_events`, `political.last_supply_state_by_osid`, and `military.campaign_plans` when `decision_mode === 'emergent'` | Deep-copied arrays/records with existing event order preserved; strict-key records; only fields read by `getCorpsArmyPriorities(...)`. |
| Formation identity/lifecycle | record key, `id`, `faction`, `status`, `kind`, `readiness`, `lifecycle_status`, `tags`, `corps_id` | One strict-ID ordered `SectorTopologyFormation` record. Preserve `undefined` defaults exactly. |
| Formation geography | `location_osid`, `home_osid`, `hq_osid`, `hq_sid` | Same formation projection; these fields must be locally mutable only where listed in section 7. |
| Formation strength | `personnel`, `personnel_lent_by_tg`, `cohesion`, `experience`, `honor` | Same projection; required by enemy totals and `computeLocalFrontDefensivePower(...)`. |
| Formation assignment/eligibility | `assignment`, `assigned_sub_segment_id`, `posture`, `disrupted`, `disrupted_turns`, `stranded_status` | Same projection; deep-copy assignment objects. |
| Elite/enclave movement | `elite_loan_state.on_loan`, `loaned_to_corps`, `loan_start_turn`; faction/home/origin inference used by enclave guard | Minimal deep copy of the named loan fields plus the formation geography above. |
| Movement ownership | `military.brigade_movement_orders`, `military.brigade_movement_state`, `military.brigade_posture_orders` | Strict-key/deep copies; posture order array order preserved. |
| Player sector direction | `military.brigade_sector_override` | Strict-key deep copy. |
| Corps/operation truth | `military.corps_command`: directive priority, active-operation id/type/phase/sector/preparation subphase, participants, axes/objectives | Strict-key command record with active operation array order and participant/objective array order preserved. |
| Officer profile | `military.named_officers`, `military.named_officer_data` fields used by `getCorpsCommander(...)` | Strict-key officer state and authored officer-data array copy; no lookup may fall through to live state. |
| Static doctrine | faction priority tables, constants, enclave definitions, corps exclusions | Module-owned immutable data; list in solver imports and pin by existing focused tests. Not copied into `GameState` or output. |

Implementation note: change `getCorpsArmyPriorities(...)`, `buildCorpsCommanderProfiles(...)`, and the sector-specific political-controller fallback to accept narrow read interfaces. Do not manufacture a partial object and cast it to `GameState`.

## 7. Complete builder output and mutation inventory

### 7.1 Pure output

```ts
export interface SectorTopologySolveOutput {
    readonly sectors: Readonly<Record<string, CorpsFrontSector>>;
    readonly mutations: readonly SectorTopologyMutation[];
    readonly diagnostics: readonly SectorTopologyDiagnostic[];
    readonly trace: SectorTopologyDeterministicTrace;
}
```

`sectors` contains every current `CorpsFrontSector`/sub-segment field: IDs, owner/faction/opponents, edge and territory lists, assigned/reserve/rear lists, unstaffed flag, density/threat/power, stance/source, optional must-hold/display fields when current logic supplies them, and all sub-segment fields. Sector-local intermediate writes remain inside detached solve state and are represented by final sectors plus deterministic phase trace; they never touch `GameState` during solve.

### 7.2 Ordered live-state mutation journal

The journal is an append-only array in execution order. It has no timestamps and no generated IDs. Each row contains `sequence` equal to its zero-based index, exact before/after values, and the current deterministic stage label.

```ts
export type SectorTopologyMutation =
    | { sequence: number; stage: string; kind: 'formation-location'; formationId: FormationId; before: string | undefined; after: string }
    | { sequence: number; stage: string; kind: 'formation-entrenchment'; formationId: FormationId; before: number | undefined; after: 0 }
    | { sequence: number; stage: string; kind: 'formation-assigned-sub-segment'; formationId: FormationId; before: string | undefined; after: string | undefined }
    | { sequence: number; stage: string; kind: 'formation-assignment'; formationId: FormationId; before: FormationAssignment | null; after: FormationAssignment | null }
    | { sequence: number; stage: string; kind: 'unresolved-sector-brigades'; before: readonly FormationId[] | undefined; after: readonly FormationId[] };
```

Required writer mapping:

| Current writer | Journal requirement |
|---|---|
| `ensureMinimumSectorCoverage(...)` | Update detached dense occupancy first, then append/apply the location row, then append/apply the entrenchment row. This reproduces current `activeCounts.move(...)`, `formation.location_osid = target`, `formation.entrenchment_turns = 0` order. |
| Builder reachability-demotion paths | Append every `assigned_sub_segment_id = undefined` assignment at its current point, including value-preserving writes if the legacy statement executes. The separate operation-sensitive roster reconciliation stays outside this extraction and retains its current owner. |
| `syncSectorAssignmentsToFormations(...)` | For each stable formation ID, append a conditional sector-assignment clear followed immediately by the unconditional sub-segment clear; then append assignment sets in stable sector order and existing assigned/reserve/rear list order. Do not batch the two clear kinds into separate traversals. |
| Final unresolved collection | Append one unresolved-list replacement after assignment synchronization and before warnings. |

No other live-state write is allowed inside the builder. A static test scans the complete reachable solver surface for direct assignments to `GameState` or source formations. If a new writer is discovered, stop and extend the union, snapshot, oracle, and documentation before continuing.

### 7.3 Diagnostics and instrumentation

- Final unresolved warnings become deterministic `SectorTopologyDiagnostic` rows during solve and are emitted only by commit after the unresolved-list mutation.
- Debug/warn/error text and order must equal the imperative oracle byte-for-byte.
- Task 8A relation counters and dense occupancy remain invocation-local.
- Wall-clock timing remains an observational shell. The pure core receives no clock or environment. An optional outer stage runner may time named pure stages only when `PERF_PROFILE_SECTOR_PARTITION=true`; on/off runs must produce identical output, journal, state, warnings, bytes, and deterministic trace.
- The trace contains only stable counts/order labels, never durations.

### 7.4 Commit atomicity

`commitSectorTopologySolve(...)` has two passes:

1. Validation replays the journal into a tiny shadow of only the target fields, checking every `before` value and sequence without mutating live state. It also checks that live turn and front-edge fingerprint still match input provenance.
2. Only after complete validation succeeds, apply every row to live state in sequence, emit diagnostics at their declared boundary, and return.

Any stale precondition throws before the first live write. Do not catch and fall back after a partial commit. A stale commit may rerun the complete capture/solve once only at the caller's explicit same-invocation boundary; production should not normally need this because build/commit is synchronous.

## 8. File ownership and collision map

### Create

- `src/sim/combat/sector_topology_solver_types.ts` — narrow read types, output, mutation and diagnostic unions.
- `src/sim/combat/sector_topology_snapshot.ts` — complete deterministic capture and provenance fingerprint.
- `src/sim/combat/sector_topology_mutation_journal.ts` — detached writer port, preflight validator, serial commit.
- `src/sim/combat/sector_topology_solver.ts` — full extracted core and detached working projection.
- `tests/sector_topology_snapshot.test.ts`.
- `tests/sector_topology_mutation_journal.test.ts`.
- `tests/sector_topology_solver_equivalence.test.ts`.
- `tools/perf/sector_topology_exact_parent_oracle.ts` — committed control/candidate artifact comparator for the exact-parent external oracle.
- `docs/40_reports/implemented/<date>_R5_PHASE2E_PURE_SOLVE_SERIAL_COMMIT.md` at source checkpoint/measurement disposition.

### Modify

- `src/sim/combat/corps_front_sectors.ts` — production wrapper, extracted core ownership, explicit test-only execution strategy, stage labels.
- `src/sim/combat/brigade_assignment.ts` — writer port for location/entrenchment/assignment/sub-segment writes; narrow read context.
- `src/sim/combat/sector_territory.ts` and `sector_building.ts` — narrow political/formation reads; no full-state cast.
- `src/sim/combat/commander_override.ts`, `bot_strategy.ts`, and `officer_system.ts` — narrow topology-specific read interfaces without changing other callers.
- `src/sim/combat/final_sector_truth_reconciliation.ts` only to thread the explicit test strategy/hooks through the existing reconciliation seam; do not change receipt logic or production call order.
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` — three-mode x 100 candidate/legacy/rerun matrix.
- `tests/final_sector_reconciliation_session.test.ts`, `tests/final_sector_truth_reconciliation.test.ts`, `tests/real_save_sector_truth_contracts.test.ts`, and `tests/sector_partition_instrumentation.test.ts`.
- `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`, this plan, `MASTER_ROADMAP.md`, `COMMAND_BOARD.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, and report indices at checkpoint/disposition.

### Must not modify

- `docs/10_canon/FORAWWV.md` or any canon file.
- `src/sim/turn_pipeline.ts`, `war_phases.ts`, or `war_phase_reconciliation_steps.ts` unless a discovered contradiction makes the design invalid; stop instead of changing the pipeline.
- GameState/schema/serializer/migration files.
- Scenarios, approved baselines, package/version/release configuration, or UI.

## 9. Task sequence

Each task is one commit. Do not combine extraction, oracle repair, and measurement in one commit.

### Task 1: RED characterization of the imperative boundary

**Files:**

- Create `tests/sector_topology_mutation_journal.test.ts`.
- Modify `src/sim/combat/corps_front_sectors.ts` only for test-visible writer tracing after RED.
- Modify `src/sim/combat/brigade_assignment.ts` only for test-visible writer tracing after RED.

1. Write a failing test importing `createSectorTopologyMutationRecorder` and requesting `test-only-imperative-live-state` execution.
2. Pin one fixture that moves a formation and require exact location then entrenchment row order.
3. Pin demotion/sub-segment clears, assignment clear/set order, unresolved replacement, and warning order.
4. Pin unknown execution strategy rejection before state inspection.
5. Run RED; expected failure is missing module/export/strategy.
6. Add the smallest writer port around current direct writes without moving algorithm stages.
7. Run GREEN and typecheck.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_mutation_journal.test.ts tests/sector_partition_instrumentation.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Stop:** Any live writer cannot be represented by the section 7 union, or tracing changes bytes/diagnostics. Update the design before extraction.

**Commit:** `test(sectors): characterize topology mutation order`

### Task 2: RED complete immutable snapshot

**Files:**

- Create `src/sim/combat/sector_topology_solver_types.ts`.
- Create `src/sim/combat/sector_topology_snapshot.ts`.
- Create `tests/sector_topology_snapshot.test.ts`.
- Modify narrow-reader files listed in section 8 only after RED.

1. Write a failing test for `captureSectorTopologySolveInput(...)` over the pristine real save.
2. Assert the exact allow-list families in section 6, strict ID/key order, preserved authored array order, and no retained caller `Map`, `Set`, array, object, formation, operation, officer, or assignment identity.
3. Deep-freeze the output and prove read helpers can consume it.
4. Mutate the source state after capture and prove the snapshot is unchanged.
5. Add a static full-state-read inventory test: every `state.*` access reachable from the solver must map to one declared snapshot family.
6. Refactor political-controller, commander, priority, and officer readers to narrow interfaces. Do not cast a partial object to `GameState`.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_snapshot.test.ts tests/commander_driven_brigade_assignment.test.ts tests/sector_power_threat_recompute.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Stop:** A reader needs state outside section 6. Extend and review the inventory explicitly; never reach back to live state from solve.

**Commit:** `refactor(sectors): capture explicit topology solve input`

### Task 3: RED pure full solve on detached working state

**Files:**

- Create `src/sim/combat/sector_topology_solver.ts`.
- Create `tests/sector_topology_solver_equivalence.test.ts`.
- Modify `corps_front_sectors.ts`, `brigade_assignment.ts`, `sector_territory.ts`, `sector_building.ts`, `commander_override.ts`, `bot_strategy.ts`, and `officer_system.ts`.

1. Write a failing test importing `solveCorpsFrontSectorsPure(...)`.
2. Deep-freeze the input; require solve to complete without mutation.
3. Compare its sectors, mutation journal, diagnostics, and trace to `test-only-imperative-live-state` on targeted no-move, one-move, multi-pass recovery, demotion, final-pass-warning, and final-save-projection fixtures.
4. Extract the orchestrator in existing statement order. Use one detached formation projection and update it synchronously through the writer port.
5. Preserve Task 8A relation provider, synthetic fallback receipts, dense occupancy, recovered-front setup lifetime, all fixed-point conditions, and every current stable sort/tie-break.
6. Add a static guard forbidding direct live-state mutation or `GameState` access in the pure solver.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_solver_equivalence.test.ts tests/sector_front_edge_relation.test.ts tests/sector_topology_mutation_journal.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
node_modules\.bin\vitest.cmd run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

**Stop:** Any reordering is needed to make extraction convenient. Preserve the old order or reject the shape.

**Commit:** `refactor(sectors): extract pure full topology solve`

### Task 4: RED atomic serial commit

**Files:**

- Create `src/sim/combat/sector_topology_mutation_journal.ts` if not created in Task 1; otherwise complete it.
- Modify `src/sim/combat/corps_front_sectors.ts`.
- Extend `tests/sector_topology_mutation_journal.test.ts`.

1. Write failing tests for stale turn, changed front-edge provenance, first-row stale value, later repeated-write stale value, malformed sequence, unknown kind, and target formation missing.
2. Prove every failure occurs before any live write or diagnostic emission.
3. Prove a valid commit applies exact rows in sequence and emits exact warning order after unresolved truth.
4. Add deterministic rerun proof: fresh capture + solve + commit on identical clones yields identical journals, state, and bytes.
5. Make pure-solve/serial-commit the production default; keep `test-only-imperative-live-state` explicit and inaccessible through ordinary callers.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_mutation_journal.test.ts tests/sector_topology_solver_equivalence.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
git diff --check
```

**Commit:** `refactor(sectors): commit topology solve serially`

### Task 5: RED full reconciliation oracle, three modes x 100

**Files:**

- Modify `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`.
- Modify `tests/final_sector_reconciliation_session.test.ts` and `tests/final_sector_truth_reconciliation.test.ts`.
- Create `tools/perf/sector_topology_exact_parent_oracle.ts`.

For each of 100 deterministic real-save variants in each mode:

- live war: `isFinalPass=false`, `finalSaveGeometryProjection=false`;
- final turn: `true`, `false`;
- final-save projection: `false`, `true`.

Compare candidate, explicit imperative legacy, and candidate rerun across:

1. complete returned/installed sectors and sub-segments;
2. complete `GameState` after reconciliation;
3. full reconciliation report;
4. complete session, pending/consumed receipts, `last_report`, and exact receipt sequence;
5. explicit candidate/legacy mutation journal including every sequence/stage/before/after row;
6. `geometry_builds` sequence and active-location mutation count, including variants that exercise the extra fixed point;
7. warnings, debug, log, error, and Task 8A construction/query/fallback diagnostics;
8. canonical serialized bytes, size, SHA-256, and deterministic rerun SHA;
9. solve input unchanged before/after;
10. relation and dense-occupancy strategy contracts.

First run the property with an intentionally omitted commit row and preserve the expected RED mismatch. Then repair and run GREEN. The committed exact-parent oracle tool must also be able to compare candidate artifacts with control artifacts generated from `0fd36157b` in a separate worktree; use this in Task 8, not during the fast lane.

```powershell
node_modules\.bin\vitest.cmd run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts -t "pure full solve and serial commit preserve reports, sessions, receipts, mutation order, geometry order, sectors, full state, diagnostics, bytes, and rerun hashes across production modes and 100 real-save variants" --pool=forks --reporter=dot
```

**Stop:** Do not reduce the case count or comparison surface. Improve fixture setup or shard deterministic cases while retaining all 300.

**Commit:** `test(sectors): prove pure solve reconciliation equivalence`

### Task 6: Fast dependent gates and independent review

Run serially without a heavy runtime lease:

```powershell
node_modules\.bin\vitest.cmd run tests/sector_topology_snapshot.test.ts tests/sector_topology_mutation_journal.test.ts tests/sector_topology_solver_equivalence.test.ts tests/sector_front_edge_relation.test.ts tests/sector_partition_instrumentation.test.ts tests/final_sector_reconciliation_session.test.ts tests/final_sector_truth_reconciliation.test.ts tests/real_save_sector_truth_contracts.test.ts tests/sector_territory_contiguity_repair.test.ts tests/sector_power_threat_recompute.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
node_modules\.bin\vitest.cmd run tests/determinism_static_scan_r1_5.test.ts --pool=forks --reporter=dot
git diff --check
```

Independent Technical Architect, Systems/Determinism, and Performance reviewers must each return PASS. Review must explicitly inspect:

- complete input allow-list;
- no partial-`GameState` cast;
- pure input non-mutation;
- local write visibility across factions/recovery;
- journal completeness/order and atomic preflight;
- Task 8A relation/dense occupancy preservation;
- no incremental reuse or Task 6 implementation;
- memory design (no whole-state clone, no sector snapshots per journal row, primitive journal rows only).

Repair findings red-first and rerun affected gates.

**Commit:** `docs(r5): checkpoint pure solve source proof`

### Task 7: Approved baselines without refresh

Acquire the exclusive runtime lease. Verify clean branch/commit, exact Node/platform, no other AWWV heavy process, and absolute script paths. Run:

```powershell
npm.cmd run test:baselines
```

Expected: all approved scenarios match with no refresh. Any drift stops measurement. Find the first weekly/state/journal divergence; do not update a manifest for an enabling refactor.

### Task 8: Exact-parent functional and measurement packet

Use two clean worktrees:

- control detached at exact parent `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141`;
- candidate at the reviewed Phase 2e source commit.

Record cwd, branch/detached status, commit, parent, tree, Node/tsx/OS/CPU/RAM, process preflight, exact commands, exit codes, raw stdout/stderr, and SHA-256 for every artifact in one ignored manifest. Run serially under one uninterrupted lease:

1. exact-parent 3 modes x 100 external oracle artifacts for control and candidate;
2. one excluded warmup per lineage;
3. one phase+sector profile per lineage;
4. one same-process application V8 profile per lineage;
5. three alternating wall-clock pairs in order `control1, candidate1, control2, candidate2, control3, candidate3`;
6. one retained-candidate fresh phase profile and one fresh V8 owner profile only after retention gates pass.

Do not run Electron, package, or any baseline refresh in this lane.

### Task 9: Retain or revert

Phase 2e is retained only if every gate passes:

| Gate | Threshold |
|---|---|
| Functional exactness | All 300 in-process and 300 exact-parent external comparisons exact across every section 9 Task 5 surface. |
| Journal | Candidate and imperative legacy journal sequences exact; commit preflight atomic; no unjournaled live write. |
| Determinism | Every valid run has exact bytes/SHA; candidate rerun exact; static scan green. |
| Baselines | All approved baselines pass without refresh. |
| Whole-run timing | At least two of three candidate pairs no slower; median paired regression no worse than `1.0%`; no pair regresses more than `2.0%`. Improvement is welcome but not required. |
| Builder timing | `buildCorpsFrontSectors` inclusive time does not regress more than `3.0%` against exact-parent control. |
| Heap ceiling | Candidate phase-boundary sampled peak heap is at most both `300.000 MB` and `105%` of the exact-parent retained-fresh control measured in the same packet. Using current evidence, the latter reference is `295.304 MB`; recompute from the actual control and apply the lower threshold. |
| RSS ceiling | Candidate RSS is at most both `512.000 MB` and `110%` of same-packet control. |
| Journal allocation | Journal contains primitive/scalar rows plus copied assignment/list payloads only; no `GameState`, sector record, graph map, operation, or formation object identity; report maximum rows and serialized bytes per invocation. |
| Runtime ownership | No overlapping AWWV heavy process and no invalid lineage. |

If any exactness, journal, baseline, atomicity, or memory gate fails, reject and revert the production default/extraction. If only timing is noisy within the stop bounds, repeat one complete alternating three-pair packet once; do not cherry-pick favorable samples. If the repeat still fails, reject. Preserve the characterization tests and a no-go report only if they remain useful without dead production seams.

**Retained commit:** `perf(sectors): separate pure topology solve from serial commit`

**Rejected commit:** revert production/candidate-only code, then `docs(r5): record pure solve extraction no-go`

### Task 10: Documentation and handoff

For either disposition:

- update this plan and `docs/plans/2026-08-01-r5-phase2c-amortized-sector-topology-plan.md`;
- update `MASTER_ROADMAP.md` and `COMMAND_BOARD.md` only with measured truth;
- append a formal `PROJECT_LEDGER.md` entry;
- add a reusable lesson to `PROJECT_LEDGER_KNOWLEDGE.md` only if accepted or if the no-go establishes a durable boundary;
- write the implementation report and update both report indices;
- record exact commits, hashes, memory, timings, tests, baseline disposition, Task 6 gate result, and next owner.

## 10. Determinism, schema, and canon gates

- No `Math.random`, timestamps, time-derived IDs, locale collation, environment-dependent solve branch, filesystem iteration, or nondeterministic object/map order.
- Snapshot records and journal rows use explicit `strictCompare` ordering wherever current behavior requires sorted traversal; existing authored array order is preserved where it is semantic.
- No snapshot, working projection, journal, relation, dense occupancy, stage trace, or provenance field enters `GameState` or canonical serialization.
- No new GameState field, schema version, migration, default, validator, or fixture change.
- No baseline refresh. Any mismatch is a blocker.
- No canon or FORAWWV edit. If exact behavior cannot be preserved, stop and reject the extraction rather than redefining rules.
- The optional timing observer is outside deterministic semantics and must pass profile-off/profile-on byte/journal/state equality.

## 11. Exact Task 6 authorization gate

Phase 2e acceptance does **not** authorize Task 6. The orchestrator may mark Task 6 authorized only after all of the following are true in one retained-source packet:

1. Tasks 1-10 above pass and Phase 2e is integrated as the production default.
2. Independent architecture, determinism, and performance reviews return PASS with no open blocker.
3. Approved baselines pass without refresh; the three-mode x 100 oracle and exact-parent external oracle are exact.
4. Memory and timing retention gates pass.
5. A fresh retained-source full V8 profile ranks `buildCorpsFrontSectors` as the **largest non-overlapping named causal application owner**, not merely a nested phase, at both at least `100.000 ms/turn` inclusive and at least `10.000%` of sampled application time.
6. The fresh sector sidecar records at least `80` full builder calls over 40 turns (`>=2.0` calls/turn) and at least one postcombat location-writeback fixed-point build, proving repeated full solves remain material.
7. The fresh Amdahl calculation shows at least `10%` theoretical whole-run speedup from perfect removal of the builder.
8. The roadmap, command board, active plan, report, and ledger are updated with the exact profile hash and the explicit words `Task 6 authorized`.

If any item fails, Task 6 stays closed. Reprofile and hand R5 to the largest current owner. Do not treat existence of the pure boundary as permission to implement reuse.

## 12. Stop and revert rules

Stop before proceeding when:

- an input is missing from section 6;
- a live write is missing from section 7;
- solve reads live `GameState` after capture;
- a partial object is cast to `GameState`;
- later solve stages do not see earlier detached location writes;
- journal validation can fail after live replay begins;
- Task 8A fallbacks/construction counts, dense occupancy, receipts, stage order, warnings, bytes, or hashes diverge;
- memory exceeds the ceiling;
- a baseline mismatch appears;
- a canon contradiction is discovered;
- implementation begins incremental reuse, parallel faction work, or a new receipt;
- another branch owns a colliding file;
- the exclusive runtime lease is unavailable for heavy commands.

Revert rather than relaxing thresholds, shrinking the oracle, refreshing baselines, or changing gameplay.

## 13. Commit sequence

1. `test(sectors): characterize topology mutation order`
2. `refactor(sectors): capture explicit topology solve input`
3. `refactor(sectors): extract pure full topology solve`
4. `refactor(sectors): commit topology solve serially`
5. `test(sectors): prove pure solve reconciliation equivalence`
6. `docs(r5): checkpoint pure solve source proof`
7. `perf(sectors): separate pure topology solve from serial commit` **or** a full revert plus no-go docs commit

Do not squash away RED/repair provenance before independent review. The orchestrator may consolidate only after all source and measurement evidence is recorded.

## 14. Completion checklist

- [ ] Current imperative journal is characterized before extraction.
- [ ] Every section 6 input is captured with no retained mutable caller identity.
- [ ] Pure solve mutates neither input nor live state.
- [ ] Every live builder write is journaled in exact order.
- [ ] Detached local writes are visible to later faction/recovery stages.
- [ ] Serial commit preflights the entire journal before any live write.
- [ ] Task 8A relation and dense occupancy contracts are unchanged.
- [ ] Three modes x 100 compare sectors/state/reports/session/receipts/journal/geometry/diagnostics/bytes/SHA/rerun.
- [ ] Exact-parent external oracle passes.
- [ ] Fast/type/static/baseline gates pass without refresh.
- [ ] Exclusive measurement packet passes timing and memory gates or the candidate is reverted.
- [ ] Fresh profile selects the next owner.
- [ ] Task 6 is authorized only if every section 11 item passes; otherwise it remains closed.
- [ ] Report, roadmap, command board, ledger, knowledge, and indices match evidence.
- [ ] No canon/FORAWWV/schema/scenario/baseline/package/version/release change.

## 15. Copy-ready implementation prompt

```text
Role and objective: Act as Technical Architect, Systems/Determinism Engineer, Performance Engineer, and TDD implementer for R5 Phase 2e. Execute docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md one task and one commit at a time. Start with Task 1 RED characterization. Build a complete immutable sector-topology input snapshot, run the exact current full solve over detached working state, and serially commit its prevalidated ordered mutation journal. Do not implement incremental reuse.

Canon and architecture: Read Engine_Invariants_v0_9_0.md sections 1, 11.1-11.4, 13.1-13.2, 14.2, and 14.4; CODE_CANON.md; DETERMINISM_TEST_MATRIX.md; PIPELINE_ENTRYPOINTS.md; REPO_MAP.md; ADR-0006; the R5 Phase 2c/2d plan; the Task 8A measurement report/manifest; and every source/test file listed in the Phase 2e plan. Preserve the canonical war pipeline and reconciliation ownership.

Determinism and ledger constraints: No randomness, timestamps, locale ordering, environment-dependent solve logic, unordered output, persisted cache, new GameState field, schema/migration, baseline refresh, or partial GameState cast. All inputs and writes must appear in the plan's allow-lists. The pure solve must see its detached writes immediately; live state changes only after full journal preflight. Compare complete state and canonical bytes, not hashes alone. Append PROJECT_LEDGER.md and update PROJECT_LEDGER_KNOWLEDGE.md only for a reusable accepted/no-go lesson. Never edit docs/10_canon/FORAWWV.md.

STOP triggers: Missing input/write inventory, live-state read after capture, inability to preserve exact faction/recovery/fixed-point order, non-atomic commit, Task 8A relation or dense-occupancy drift, receipt/diagnostic/byte divergence, unexplained baseline drift, memory ceiling breach, branch collision, canon conflict, or any attempted incremental/cross-call/parallel implementation. Heavy scenario, baseline, V8, wall-clock, Electron, or package work also stops until the orchestrator grants the exclusive runtime lease.

Output and validation: Preserve RED evidence, one task per commit, and exact commands/results. The mandatory oracle is 100 deterministic real-save variants in each of live-war, final-turn, and final-save-projection modes across sectors, full state, reports, session, receipts, mutation journal, geometry order, diagnostics, bytes, SHA, and rerun. Run fast/type/static gates before lease-backed no-refresh baselines and the exact-parent measurement packet. Apply the plan's timing/heap/RSS gates. Phase 2e is enabling architecture only. Task 6 remains unauthorized unless every exact gate in section 11 passes and the roadmap explicitly says Task 6 authorized.
```
