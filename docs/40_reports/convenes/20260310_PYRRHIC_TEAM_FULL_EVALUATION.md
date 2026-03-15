# Pyrrhic Team Full State-of-the-Game Evaluation

**Date:** 2026-03-10  
**Convener:** Orchestrator  
**Participants:** Technical Architect, Gameplay Programmer, UI/UX Developer, QA Engineer, Canon Compliance Reviewer, Game Designer, Systems Programmer, **War-or-Game (realism auditor)**

## Executive Summary

The Pyrrhic team conducted a **full multi-agent evaluation** of AWWV: each system was graded individually and assessed for interoperability. **War-or-Game** joined as the new realism auditor and was tasked with questioning everything—outcomes, territorial dynamics, force structure, and commander behavior—against the standard: *What would a real Bosnian War commander find absurd?*

**Overall picture:** The engine is **architecturally sound** (partitioned state, deterministic pipeline, strong canon alignment) and **combat is now plausible** after the n482 posture fix. The main gaps are **calibration** (RS over-capture, casualty volume), **realism** (HVO passivity, zero-morale consequence, casualty ratio), **canon hygiene** (Phase I/II remnants, morale doc drift), and **operational maturity** (QA coverage thresholds, warroom placeholders, CI). No single system fails; interoperability is clear (state → adapter → UI, pipeline → runner → baselines). The report below is synthesized from eight parallel subagent evaluations.

---

## Grades at a Glance

| Domain | Grade | One-line justification |
|--------|-------|------------------------|
| 1. Architecture & Data Flow | **B+** | Partition + serialization strong; migration/validation and dual pipeline naming need tightening |
| 2. Simulation Mechanics & Bot AI | **B+** | Combat spec-backed and fixed; calibration and morale gaps keep it short of A |
| 3. UI/UX (Map & Warroom) | **B+** | Map feature-complete and coherent; warroom placeholders and missing modals |
| 4. QA, Determinism & Pipelines | **B+** | Determinism enforced, qa:all unified; no CI, no coverage threshold, script fragmentation |
| 5. Canon Compliance | **A-** | Control, pipeline, OSID, determinism aligned; Phase I/II remnants and stale morale doc |
| 6. Game Design & Mechanics | **B+** | Control/doctrine/supply/exhaustion match design; Phase 3B off, morale/ARBiH/Graz need clarity |
| 7. Core Systems & Determinism | **B+** | Invariants and ordering strong; step-order test and localeCompare in tooling |
| 8. Realism (War-or-Game) | **B** | Outcomes plausible post-n482; RS over-capture, casualties, HVO passivity, zero-morale still absurd |

---

## 1. Architecture & Data Flow

**Grade: B+**  
Single canonical GameState partition (military, political, displacement), deterministic serialization, and a clear war-phase pipeline with documented entrypoints; marked down for migration/validation gaps and dual pipeline naming.

### What works well

1. **GameState partition and single source of truth** — `src/state/game_state.ts` defines `GameState` with required `military`, `political`, and `displacement`; `serializeGameState.ts` allowlists these and rejects wrappers; control is only in `political_controllers`.
2. **War-phase pipeline** — `src/sim/turn_pipeline.ts` is the single war-turn orchestrator; steps live in `war_phases.ts`; REPO_MAP and PIPELINE_ENTRYPOINTS document the step list and canon mapping.
3. **Serialization contract** — `serializeGameState` + `validateGameStateShape`; deterministic key ordering, derived-state denylist, no Map/Set; aligns with Engine Invariants §13.
4. **Scenario runner → runTurn → persistence** — One harness: `runTurn` then `serializeState` (which uses `serializeGameState`); load uses `deserializeState` (parse → migrate → validate).
5. **OSID canonical; AoR/SID phase-out** — War phase uses OSID; migration strips legacy AoR keys; `getLegacyAoR` is the only legacy cast; docs state location_osid-only.

### What needs improvement

1. **Migration vs partition** — `serialize.ts` `migrateState()` still uses **top-level** `candidate.formations`, `candidate.militia_pools`, `candidate.front_posture`, etc., while types put these under `military`. Partition is not enforced on load; round-trip could diverge.
2. **Validation does not enforce partition roots** — `validateGameStateShape` does not require `state.military`, `state.political`, and `state.displacement` to exist as objects.
3. **Two `turn_pipeline.ts` files** — `src/state/turn_pipeline.ts` (peace) and `src/sim/turn_pipeline.ts` (war); naming is easy to confuse.
4. **UI coupling to full state** — GameStateAdapter derives `LoadedGameState` from full GameState; no versioned view schema or ADR that limits UI to adapter output.
5. **Cross-domain access** — Many modules touch both `state.military` and `state.political`; no read-only facade or bounded context.

### Interoperability

- **(a) Simulation/combat:** `runTurn` clones state and runs `warPhases`; each step gets `TurnContext` and mutates `context.state`; combat code reads/writes `state.military` and `state.political`; single owner, no per-step interface.
- **(b) UI/map:** GameState → GameStateAdapter → `LoadedGameState` → components; adapter is the only boundary; no versioned view contract.
- **(c) Scenario runner and persistence:** createInitialGameState → runTurn loop → serializeState for final_save and checkpoints; load: parse → migrateState → validateState; single JSON format.

### Recommendations

1. **Align migration with partition** — In `migrateState()`, read/write all migrated fields under `candidate.military` / `candidate.political` / `candidate.displacement`; add a test for round-trip and correct partition shape.
2. **Enforce partition in validation** — Require `state.military`, `state.political`, and `state.displacement` to be non-null objects in `validateGameStateShape`; optionally check minimal shape (e.g. `military.formations` is a record).
3. **Clarify pipeline entrypoints** — Rename or document the two pipelines (e.g. "peace" vs "war") so callers and REPO_MAP/PIPELINE_ENTRYPOINTS unambiguously refer to the correct file.

---

## 2. Simulation Mechanics & Bot AI

**Grade: B+** — Combat is spec-backed, deterministic, and recently corrected (posture bug); bot is modular and OSID-native, but calibration (RS over-capture, casualty volume) and morale-consequence gaps keep it short of A.

### What works well

1. **Single source of truth for combat** — `combat_math.ts` is shared by `attack_resolution_osid.ts` and `combat_predictor.ts`; Attack Resolution Formula Spec is followed; deterministic, sorted iteration.
2. **Modular bot corps AI** — `bot_corps_ai.ts` orchestrates stance, operations, corridor, and directives; `CorpsDirective` flows cleanly to brigade execution.
3. **Brigade eval chain and discipline** — Hold → front → attack → movement; brigades only attack `effectiveDirective.offensive_targets`; OSID-native, no AoR/SID in the hot path.
4. **Corps front sectors pipeline** — Full pipeline in `corps_front_sectors.ts`; `sector_offensive.ts` owns operation lifecycle and mech/moto staging; sector intel feeds fog and targeting.
5. **Pipeline and supply/IVP** — `war_phases.ts` orders sectors → corps → brigade → resolve-attack-orders → supply/patron; supply_reserves and patron_pressure are gated and integrated without duplication.

### What needs improvement

1. **Calibration** — RS over-capture (+104 delta) and casualty volume (21k vs 40–60k) need tuning of aggression/avoided_osids and loss-rate or outcome modifiers.
2. **Morale** — No consequence for zero morale; no victory-based morale boost (REAL_WAR_MASTER #5).
3. **Complexity** — Large files (`corps_front_sectors.ts`, `sector_offensive.ts`, attack resolution) and constants spread across several modules.
4. **Per-formation casualties** — State-level ledger is populated; formation-level `casualty_ledger` is not (REAL_WAR_MASTER #3).
5. **Edge cases** — Some RBiH/HRHB deep-rear brigades remain due to geography; cold fronts/Graz handled but unreachable sectors can still strand brigades.

### Interoperability

- **State/architecture:** GameState holds formations, political_controllers (OSID), corps_command, corps_front_sectors, orders; resolver mutates control/formations/casualty_ledger; supply/IVP read supply state and mutate reserves/IVP; no duplicate combat logic.
- **Calibration/runner:** Runner uses `attack_resolution_osid` and `bot_order_diagnostics` for combat causality; `corps_ai_report` snapshots; run_summary/weekly_report carry control deltas and attribution.
- **UI:** GameStateAdapter derives fog from sector_intel + corps_front_sectors; map/warroom use state surfaces (control, formations, sectors, reports), not bot internals.

### Recommendations

1. **P0 — Calibration:** Tune RS aggression/avoided_osids and casualty constants to bring RS delta toward 0 and casualties into 40–60k; keep hasty defense and soft cap as-is.
2. **P1 — Morale:** Add victory-based morale boost and a consequence for sustained zero morale (e.g. dissolution or order refusal) per REAL_WAR_MASTER #5.
3. **P2 — Observability:** Surface per-formation casualties from `state.military.casualty_ledger.per_formation` for UI/war stories; document combat-causality contract in CALIBRATION_MASTER.

---

## 3. UI/UX (Tactical Map & Warroom)

**Grade: B+** — The tactical map is feature-complete and coherent (panel rail, fog of war, sector click/zoom, settlement tabs, command briefing, AAR, ops modal). The warroom has a clear scene/anchor contract and implemented modals, but still relies on placeholders in some flows and layers and lacks full automation coverage.

### What works well

- **Single panel rail** — One right-side rail with `derivePanelRailState()` gives a single source of truth for primary/secondary panels; drill-down (formation → sector, corps → sector, operation → settlement) is consistent and parent context is preserved.
- **GameStateAdapter → LoadedGameState** — One parse path for the map; fog, sectors, command briefing, and displacement views are derived in the adapter, so the UI stays decoupled from raw engine shape.
- **Fog of war** — Driven by `LoadedGameState.fogOfWar` (from sector intel); map consumes it via `buildFogOfWarGeoJSON` and layer visibility; no use of legacy `recon_intelligence`.
- **Sector visualization** — `osidToSector` map, sector fill/edge layers, sector click-to-select and zoom (`fitBounds` on sector OSIDs), hover highlight; sector selection is integrated with the panel rail.
- **Warroom scene-plate contract** — Fixed 2752×1536, eight physical anchors with a defined anchor→modal mapping, early `desktopBridge` init to avoid "Desktop bridge unavailable," non-fatal region loading with override/faction fallbacks, and flag baked into art per handover.

### What needs improvement

- **Warroom placeholders** — WarPlanningMap layer rows are placeholders (Command Structure, Supply, Exhaustion, Stability, Displacement, Municipality borders with phase badges); SettlementInfoPanel uses "No active units" and "No recent authority changes" placeholders; newspaper uses a photo placeholder string.
- **Proposed modals not implemented** — IVP breakdown (P0 in WARROOM_MASTER and GUI expert advice), Turn-End Intelligence, Enclave Crisis, Honors/Memorials, Commander Register; command briefing and operational situation are in, but IVP causality is still missing.
- **Load Save / Load Replay** — Commented as "placeholder for now" in warroom; flow exists in UI but full runtime path is not complete.
- **Accessibility** — Map has good use of `role`, `aria-label`, `aria-selected`, `aria-controls` on tabs, listboxes, and dialogs; warroom uses `aria-hidden` and some `aria-label`s. Coverage is uneven and Storybook a11y is set to `todo`, not enforced as `error`.
- **Testing** — Little or no render-level testing for map flows (e.g. load save → panel rail, sector click → zoom) and only limited warroom automation (desk_map → map open is unit-tested); full browser/Electron smoke is manual or e2e.

### Interoperability

- **(a) Game state / adapter** — Map: `gameStore.loadedGameState` is set by `loadSave(json)`; JSON comes from IPC (`getCurrentGameState`, `advanceTurn`, `loadStateDialog`). `GameStateAdapter.parseGameState()` turns raw `final_save.json` into `LoadedGameState`. Warroom: holds full `GameState` via `deserializeState(stateJson)` for modals; map iframe receives state via `setGameStateUpdatedCallback` and optional initial `getCurrentGameState()`.
- **(b) Pipeline / engine** — Engine runs in Electron main; UI does not call it directly. State is serialized and sent over IPC; `advanceTurn` runs the turn and returns `stateJson`; load scenario/state use system dialogs and return `stateJson`. Map and warroom are pure consumers of serialized state.
- **(c) Desktop / Electron** — `window.awwv` (preload) exposes campaign lifecycle (`startNewCampaign`, `advanceTurn`), state (`getCurrentGameState`, `setGameStateUpdatedCallback`), dialogs (`loadScenarioDialog`, `loadStateDialog`), and map (`openTacticalMapWindow`, `getMapServerUrl`). Map runs in browser with no bridge (useIPC returns no-ops). Warroom depends on the bridge for New Campaign and advance; bridge is read at init so quick clicks do not race.

### Recommendations

1. **P0 — Implement IVP breakdown modal (warroom)** — Add a dedicated modal or panel that explains IVP level from causes (e.g. civilian casualties, territorial aggression, shelling) so players can see why IVP is high; aligns with WARROOM_MASTER and GUI expert P0.
2. **P1 — Replace or clarify warroom placeholders** — Either wire WarPlanningMap layer toggles to real data or remove/relabel phase-badge placeholders; replace SettlementInfoPanel and newspaper photo placeholders with real content or explicit empty states.
3. **P2 — Harden UI automation** — Add render-level (or shallow) tests for critical map flows (load save → panel rail, sector click → zoom) and warroom smoke (load → desk_map → map opens) in addition to existing unit tests; consider turning Storybook a11y to `error` for high-traffic components.

---

## 4. QA, Determinism & Pipelines

**Grade: B+** — Determinism is enforced (static scan, stableStringify, run_counter, no Math.random in the run path), baseline strategy is governed and hash-based, and `qa:all` unifies the main gates; lack of in-repo CI, no enforced coverage thresholds, and fragmented scripts keep it from A-level.

### What works well

1. **Determinism enforcement** — Static scan disallows `Date.now()`, `new Date()`, and `Math.random()` in `src/` and `tools/scenario_runner/`; scenario runner uses `stableStringify` for all artifacts and monotonic `.run_counter` for run IDs; DETERMINISM_TEST_MATRIX and DETERMINISM_AUDIT document gates and RNG/ordering rules.
2. **Test volume** — Large suite: Vitest (46 files in config), node:test (all other `tests/*.ts`), chunked via `run_node_tests.mjs`; hundreds of unit tests across sim, state, scenario, and UI.
3. **Baseline strategy** — SHA256 hashing of seven artifacts in `run_baseline_regression.ts`; manifest in `data/derived/scenario/baselines/manifest.json`; three scenarios (noop_4w, baseline_ops_4w, apr1992_52w); TEST_BASELINE_STRATEGY.md requires sign-off before refresh; UPDATE_BASELINES=1 for intentional updates only.
4. **Stable ordering and tooling** — `strictCompare` and `stableStringify` in `src/utils/stable_json.ts`; determinism_guard (e.g. stripTimestampKeysForArtifacts, ensureStableSort) for artifact generators; serializer denylist and key ordering in `serializeGameState.ts`.
5. **Unified QA entry point** — `npm run qa:all` runs typecheck → node tests with coverage → vitest with coverage → desktop:map:build → test:baselines in sequence (docs/20_engineering/QA_PIPELINE_AND_COVERAGE.md).

### What needs improvement

1. **Coverage metrics** — No enforced coverage threshold; node and Vitest coverage are separate; no single merged report or "no decrease" gate.
2. **Script fragmentation** — Many test/sim scripts; Vitest uses an explicit `include` list that can drift from new Vitest files; no single documented "fast gate" script.
3. **Missing / known-failure scenarios** — Init-control anchor tests (zvornik, srebrenica, jajce) are documented as known failures in TEST_BASELINE_STRATEGY.md; 40w scenario is not in the default baseline set for a quicker regression option.
4. **Flakiness and long runs** — Full `npm test` (node:test) can timeout; 52w baseline is slow; no documented subset of tests for quick iteration.
5. **No in-repo CI** — No `.github/workflows` under the AWWV repo root; gates rely on manual `qa:all` and the `/awwv_pre_commit_check` skill rather than automated runs on push/PR.

### Interoperability

- **(a) Engine/sim** — Tests import from `src/sim`, `src/state`, `src/scenario`; baseline regression runs full `runScenario()`, so the engine and reporting pipeline are exercised end-to-end; determinism static scan covers the same run path.
- **(b) Calibration runs** — Calibration uses the same scenario runner and artifacts; baseline regression is a separate gate (manifest hashes). CALIBRATION_MASTER.md tracks calibration; baseline refresh requires sign-off.
- **(c) CI / pre-commit** — No automated CI in the repo; pre-commit is the awwv-pre-commit-check skill (canon, determinism, ordering, tests, ledger). There are no git hooks; `qa:all` is the recommended manual gate.

### Recommendations

1. **Add a single CI workflow** — Introduce `.github/workflows/ci.yml` (or equivalent) that runs typecheck, node tests, Vitest, and test:baselines on push/PR so every change is gated automatically.
2. **Single coverage report and threshold** — Merge or publish node and Vitest coverage into one artifact; set a minimum threshold (e.g. "no decrease" or a target like 70%) once a baseline is established and document it in QA_PIPELINE_AND_COVERAGE.md.
3. **Document and use a fast gate** — Define a "fast gate" (e.g. typecheck + determinism static scan + Vitest only, or an optional 4w-only baseline run), document it in the QA doc, and run it in CI and/or recommend it for pre-commit so developers get quick feedback without running the full 52w baseline every time.

---

## 5. Canon Compliance

**Grade: A-**  
Canon is authoritative and well-structured; code and behavior align with Engine Invariants, Phase Specs (Peace/War), and War/Systems Manual on control-change mechanics, pipeline order, determinism, and OSID-keyed state. Residual Phase I/II identifiers in types/modules and one stale canon morale value hold the grade below A.

### What works well

1. **Control change only via authorized mechanisms** — Engine Invariants §9.6, §14.1: political control changes only via attack resolution or corps/frontline operations; no passive pressure flip. Enforced in `attack_resolution_osid.ts`, `war_phases.ts`, and `displace-enemy-territory`; `validateBrigadeLocationControl` enforces formation location-in-control.
2. **War pipeline and phase gating** — War Specification §5: pipeline runs only when `meta.phase === 'war'`; step order matches spec (e.g. osid-column-movement before apply-brigade-movement). Implemented in `turn_pipeline.ts` and `turn_phases/war_phases.ts` with consistent phase guards.
3. **Determinism and stable ordering** — Engine Invariants §11: no randomness in simulation logic; no timestamps in derived artifacts; stable ordering (strictCompare) in iteration and serialization.
4. **Political control init and OSID-only war state** — Invariants §9.2, §9.8: political control initialized before fronts/brigades; war phase uses location_osid only; OSID-keyed state; AoR/ZoC removed per canon.
5. **Supply, exhaustion, displacement alignment** — Reserve logic gated by `supply_reserves_enabled`; exhaustion monotonic; displacement uses per-OSID census and hostile-share cap; takeover war-start seeding fixed (currentTurn === warStartTurn + 1).

### What needs improvement

1. **Phase I/II terminology still present in code** — Phase Specifications v0.6.0 and Engine Invariants §17 state Peace/War only; napkin says "Phase I/II terminology fully removed". **Remaining:** type `PhaseIIFrontStability` and `PhaseIIBattleResolutionLike`; module `phase_ii_adjacency.js`; scenario_runner `createOobFormationsAtPhaseIEntry`; browser runners `runPhaseITurn` / `runPhaseIITurn`; `phase_i_flip` reason in displacement.ts; UI `renderPhaseIPlus`; serialize.ts `hasAnyPhaseI` / `hasAnyPhaseII`; GameStateAdapter accepts `phase === 'phase_ii'`; formation tags `generated_phase_i0`.
2. **Systems Manual morale resist floors out of date** — Systems Manual v0.6.0 §4 states "Per-faction floors: RBiH=62, RS=70, HRHB=65". **Code** (combat_math.ts getMoraleResistFloor): RBiH=50, RS=70, HRHB=60; napkin documents 50/60. Canon doc is stale.
3. **Control-change attribution uses legacy reason** — displacement.ts writes `reason: ['phase_i_flip']` for a control-change path. Engine Invariants §9.6 authorize only attack resolution, corps/frontline ops, authority collapse, or negotiated transfer.
4. **Serialization and adapter keep Phase I/II in contract** — serialize.ts migration preserves phase_i/phase_ii for legacy saves; GameStateAdapter treats `phase_ii` as war. Prolongs Phase I/II in the observable contract.

### Interoperability

- **(a) Pipeline steps** — Canon flows into the pipeline via War Specification §5 and Engine Invariants §14.9; step order and names are defined in canon.
- **(b) Calibration / acceptance criteria** — CALIBRATION_MASTER defines combat-causality gate and area-weighted targets; references canon; acceptance is behavioral health and historical-fit criteria derived from canon.
- **(c) UI and living docs** — GUI_MASTER and CALIBRATION_MASTER point to canon; REAL_WAR_MASTER and War-or-Game provide realism audit that references canon and calibration evidence.

### Recommendations

1. **Complete Phase I/II terminology cleanup (high)** — Rename types and modules to Peace/War or domain names; rename browser runners and types to peace_turn/war_turn; remove `phase_ii` from GameStateAdapter once legacy saves are migrated; replace or remove `phase_i_flip` attribution in displacement.
2. **Reconcile morale resist floors in canon (medium)** — Update Systems_Manual_v0_6_0.md §4 to match implemented and napkin values (RBiH=50, HRHB=60, RS=70), or document an explicit override.
3. **Audit control-change attribution and reasons (medium)** — Map every control-change code path to Engine Invariants §9.6; replace `phase_i_flip` with a canon-aligned reason.

---

## 6. Game Design & Mechanics

**Grade: B+**  
Design intent is clearly documented in Game Bible, Rulebook, and Systems Manual, and most core mechanics (control-only-via-attack, faction doctrines, exhaustion monotonicity, supply gating, displacement) are implemented and consistent with canon. Points off for Phase 3B being off by default (negative-sum coupling underused), unresolved design/realism tensions (ARBiH passivity, morale), and calibration gaps (RS over-capture, HVO passivity) that affect how strongly "negative-sum, constrained agency" is felt in play.

### What works well

1. **Territorial control only via attack or corps ops** — Game Bible §5.1, §7; Rulebook §4.3; Systems Manual §2.1. Political control is a stable substrate; control change happens only through attack resolution or corps/frontline operations. Implemented and enforced.
2. **Faction doctrines and temporal posture** — Rulebook §17; Systems Manual §6.5. RS early/late phases; ARBiH `general_defensive` and corps objective windows to w56; HRHB doctrine phases. Driven by doctrine phases and timeline.
3. **Exhaustion as irreversible strategic currency** — Game Bible §13; Rulebook §11; Systems Manual §7.2, §18. Monotonic exhaustion from static fronts and supply pressure. Matches "narrows options, drives negotiation."
4. **Supply and reserves constraining operations** — Game Bible §12; Systems Manual §14. Supply state and reserves gate combat, bombardment, and bot behavior. Supports "logistics central; interdiction erodes capacity."
5. **Displacement and population as constraint** — Game Bible §10; Systems Manual §12. Per-OSID census, routing, takeover logic. Displacement feeds exhaustion and humanitarian pressure. Implementation matches design.

### What needs improvement

1. **Phase 3B (pressure→exhaustion) off by default** — Systems Manual §7.2 defines pressure→exhaustion as the negative-sum coupling; Phase 3B implements it but is feature-gated (default false). Either enable for canonical runs or document that exhaustion is currently from static fronts + supply pressure only.
2. **ARBiH general_defensive through w56 vs historical counteroffensives** — Canon is implemented; REAL_WAR H6 argues 5th/2nd Corps had counteroffensives and 5th should be `balanced`. Clarify in canon or add an exception.
3. **Morale: no victory boost and no zero-morale consequence** — Rulebook §11 and Systems Manual §4 define morale and retreat resistance; REAL_WAR #5/#10 note no victory-based morale and no consequence at zero morale. Define in canon whether morale may rise on victory and what happens at sustained zero morale; then implement or explicitly defer.
4. **Graz Accords as blanket RS–HRHB truce** — Current implementation is broad truce with fixed exceptions; REAL_WAR #7 says HVO was active in Posavina/Jajce/Mostar. Clarify whether Graz should be region-specific.
5. **Constrained agency visibility** — Friction, supply, and posture limits exist; whether the player feels constrained agency is a UX/feedback question.

### Interoperability

- **(a) Bot behavior and calibration** — Doctrine phases and standing orders drive bot aggression and targeting. CALIBRATION_MASTER holds targets; REAL_WAR_MASTER flags outcomes that contradict design or history.
- **(b) Player-facing UI and feedback** — Exhaustion, supply, and command briefing are exposed in warroom/map. Design intent flows via state; "feel" of constraint depends on how clearly consequences are shown.
- **(c) Realism (REAL_WAR_MASTER / War-or-Game)** — REAL_WAR_MASTER is the realism ledger. Findings drive code fixes or design clarifications; Game Designer evaluates canon vs realism.

### Recommendations

1. **Resolve Phase 3B vs negative-sum design** — Enable Phase 3B for canonical runs or document in canon that exhaustion is from static fronts + supply pressure only and Phase 3B is optional.
2. **Clarify ARBiH defensive posture vs historical counteroffensives** — Either add a canon exception (e.g. 5th Corps balanced from w12) and implement, or document that general_defensive through w56 is the baseline.
3. **Define morale victory coupling and zero-morale consequence** — In Systems Manual §4 (or Rulebook §11), specify (a) whether morale may increase on victory and how, and (b) whether sustained zero morale triggers refusal/dissolution/desertion. Then implement or explicitly defer.

---

## 7. Core Systems & Determinism

**Grade: B+** — Strong invariants, enforced serialization and ordering; minor gaps in test coverage and one tooling locale-dependency.

Core systems and determinism are in good shape: Engine Invariants v0.6 are reflected in code, `strictCompare` and `stableStringify` are used consistently in sim and harness, serialization denylist and Map/Set rejection are enforced, and the formation location-in-control invariant is wired in three places (pipeline step, scenario runner, validation before serialize). The grade is not A because: (1) war-phase pipeline step order is not unit-tested (only the legacy `runOneTurn` phase list is); (2) DETERMINISM_TEST_MATRIX notes "no Map/Set in GameState" is covered by the serializer only, not a dedicated test; (3) `tools/engineering/determinism_guard.ts` uses `localeCompare` for string sort, which conflicts with Engine Invariants §11.3 (strictCompare for stable ordering).

### What works well

1. **Invariant enforcement** — Formation location-in-control is enforced by pipeline step `displace-enemy-territory`, scenario-runner initial displacement after backfill, and `validateBrigadeLocationControl` in `validateState()`; `serializeState()` always runs `validateState()` before `serializeGameState()`. Denylist blocks derived-state keys; `serializeGameState.ts` rejects Map/Set in the state tree.
2. **Stable ordering** — Combat, corps, and movement code consistently use `strictCompare` for sorting; object keys in serialization are sorted with `strictCompare`; scenario runner and baseline tools use `stableStringify` for all emitted JSON.
3. **Serialization contract** — `serializeGameState` uses deterministic deep key ordering, allowlist `GAMESTATE_TOP_LEVEL_KEYS`, shape validation before serialize, and explicit Map/Set rejection. No timestamps in state or in the serializer.
4. **Pipeline step ordering** — War-phase steps are defined in a fixed array in `war_phases.ts`; order is enforced by code structure.
5. **Determinism gates** — DETERMINISM_TEST_MATRIX gates: static scan, scenario determinism tests, turn pipeline order test, phase_e pressure determinism, sandbox slice ordering, and baseline regression for byte-identical reruns.

### What needs improvement

1. **Nondeterminism / ordering risks** — No dedicated test that GameState has no Map/Set beyond the serialize path. Internal step objects built from `Object.entries()` could theoretically vary key order if built inconsistently.
2. **Invariant and pipeline test coverage** — Formation location-in-control has no dedicated unit test. War-phase step order is not asserted by a test; only the legacy `runOneTurn` phase list is tested in `turn_pipeline_order.test.ts`.
3. **Ordering edge cases** — `serialize.ts` migration uses `localeCompare` in a few places; `tools/engineering/determinism_guard.ts` uses `localeCompare` in `ensureStableSort`, inconsistent with canon.
4. **Schema drift** — No automated check that GameState type and allowlist/denylist stay aligned.
5. **Timestamp leakage** — DETERMINISM_AUDIT identified `tools/map/report_hull_inflation.ts`; if still present, it remains an exception to "no timestamps in derived artifacts."

### Interoperability

- **(a) State / architecture** — Serialization is the single gate for persisted state; invariants are enforced at write time. GameState is plain objects/arrays; Map/Set only in local variables.
- **(b) Scenario runner and baselines** — Runner uses `stableStringify` for all written JSON; baseline regression relies on byte-identical reruns; formation location-in-control is established before first serialize via displacement after backfill.
- **(c) Combat / sim** — Combat/sim use `strictCompare` for ordering that affects outputs; pipeline steps run in a fixed order; no randomness or timestamps in combat logic.

### Recommendations

1. **Add an explicit determinism test for war-phase step order** — Assert `osid-column-movement` before `apply-brigade-movement` and `displace-enemy-territory` after `update-sector-offensive-results`. Optionally add a test that expects a throw when a Map/Set is attached to state and `toSerializableGameState` is called.
2. **Use strictCompare everywhere for ordering** — Replace `localeCompare` in `tools/engineering/determinism_guard.ts` with a strictCompare-style comparator; audit `serialize.ts` migration for remaining `localeCompare` and switch to `strictCompare` where output is persisted or compared.
3. **Resolve timestamp leakage** — Confirm whether `tools/map/report_hull_inflation.ts` still writes timestamps to artifacts; if yes, remove or replace with a deterministic identifier.

---

## 8. Realism (War-or-Game)

**Grade: B.** Attack outcomes are now plausible (posture bug fixed in n482: ~25% catastrophic, ~53% decisive; early-war success 77%). A real commander would still find RS over-capture (+104 OSID delta), low total casualties (~17.5k KIA at w40 vs 40–60k target), HVO near-passivity, and zero-morale units fighting at full strength absurd. Until RS territorial gain is reined in and at least one of casualty volume or HVO/morale is fixed, the sim is "recognizable but too gamey" — not yet A-tier.

### What now works (plausible)

1. **Attack outcome distribution (REAL_WAR_MASTER #2, Fixed)** — Formations with attack orders no longer get 0 attack power; `effectivePosture` fix + hasty defense + defense soft cap + artillery suppression. Catastrophic ~25%, decisive ~53%.
2. **Deep-rear brigades (#1, Fixed)** — n473 fixes (territory_osids, column march, reserve march, transit reset). RS deep rear 15→0.
3. **Rear pocket cleanup (H1)** — Paramilitary sweep + rear pocket consolidation; no indefinite rear pockets.
4. **Cold front phantom attrition (H2)** — `isColdFront()` exemptions; no phantom KIA on Graz RS–HRHB fronts.
5. **Victory morale boost (#10, partial)** — `BATTLE_MORALE_DRIFT` and `recent_battle_outcome` in `morale_drift.ts`. Zero-morale *consequence* still open (#5).

### What's still wrong (absurd / gamey)

1. **RS over-capture (+104 delta) — P1** — VRS takes too much territory; needs aggression/target tuning.
2. **Casualty volume (~17.5k vs 40–60k) — P1** — Engagement or base rates too low.
3. **HVO passivity (#7)** — Graz blanket truce; historically active in Posavina, Jajce, Mostar; needs sector exceptions and/or offensive stances.
4. **Zero-morale units still fight (#5)** — No dissolution/surrender/refusal at morale=0.
5. **Attacker:defender ratio (H5)** — 1992 VRS firepower asymmetry not modeled; ratio still favors defender.
6. **Front coverage and stacking (#6, #8)** — ~64% front empty; 4+ brigades on single OSIDs.

### Interoperability

- **(a) Combat outcomes ↔ calibration** — Outcome realism drives calibration; posture fix caused RS over-capture; tune aggression/targets without breaking outcome distribution.
- **(b) Bot behavior ↔ territorial dynamics** — Graz and corps directives drive HVO passivity and RS gains; fix over-capture and HVO in bot/design.
- **(c) Force structure ↔ casualties** — Pools, mobilization, equipment loss set totals; 40–60k KIA needs more battles or higher base rates.

### Recommendations

1. **P1 — RS over-capture (highest priority)** — Reduce RS delta via aggression/target tuning or avoided_osids so w40 control matches painted/historical front.
2. **P1 — HVO passivity** — Sector exceptions to Graz (Posavina, Central Bosnia, Mostar) and/or offensive/balanced HVO corps stances.
3. **P1 — Casualty volume or ratio** — Raise engagement or base rates toward 40–60k KIA; and/or adjust attacker:defender ratio for 1992 VRS firepower (H5).

---

## Interoperation Summary

- **State → Engine → UI:** GameState (partitioned) is the single source of truth. Pipeline steps mutate state in a fixed order; GameStateAdapter derives LoadedGameState for the map and warroom. No versioned view contract; adapter is the only UI boundary.
- **Calibration ↔ Realism ↔ Canon:** CALIBRATION_MASTER defines behavioral health and historical-fit criteria; REAL_WAR_MASTER records what a commander would find absurd; canon (Engine Invariants, Phase Specs, Systems Manual) constrains how control, exhaustion, and supply work. War-or-Game findings feed calibration targets and design clarifications.
- **QA ↔ Engine ↔ Baselines:** Determinism is enforced by static scan and stableStringify; baseline regression hashes lock artifact shape. No CI; qa:all is the manual gate. Coverage is measured but not enforced.
- **Cross-cutting issues:** Phase I/II remnants affect canon, serialization, and UI adapter. Morale (victory boost, zero-morale consequence) spans design, sim, and realism. RS over-capture and HVO passivity span bot AI, calibration, and realism.

---

## Consolidated Top Recommendations

Prioritized across all eight roles:

| Priority | Recommendation | Owner / domain |
|----------|----------------|----------------|
| **P0** | Tune RS over-capture (aggression/avoided_osids, casualty constants toward 40–60k) | Gameplay Programmer + War-or-Game |
| **P0** | Implement IVP breakdown modal in warroom | UI/UX Developer |
| **P1** | Complete Phase I/II terminology cleanup (types, modules, adapter, displacement attribution) | Technical Architect + Canon Compliance |
| **P1** | Add victory-based morale boost and zero-morale consequence (dissolution/refusal) | Gameplay Programmer + Game Designer |
| **P1** | HVO passivity: Graz sector exceptions and/or offensive HVO corps stances | Gameplay Programmer + Game Designer |
| **P1** | Align migration with partition; enforce partition roots in validateGameStateShape | Technical Architect |
| **P2** | Add CI workflow (typecheck, node tests, Vitest, test:baselines) | QA Engineer / DevOps |
| **P2** | Reconcile Phase 3B (pressure→exhaustion) with negative-sum design (enable or document) | Game Designer |
| **P2** | Add war-phase step-order determinism test; replace localeCompare with strictCompare in tooling | Systems Programmer |
| **P2** | Replace or clarify warroom placeholders; document fast gate for QA | UI/UX Developer, QA Engineer |

---

## Document History

- **2026-03-10:** Full Pyrrhic team evaluation with eight subagents; War-or-Game included as realism auditor. Report placed in `docs/40_reports/convenes/`.
