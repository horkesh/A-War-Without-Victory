## 1. Architecture & Data Flow

**Grade: B+**  
Single canonical GameState partition (military, political, displacement), deterministic serialization, and a clear war-phase pipeline with documented entrypoints; marked down for migration/validation gaps and dual pipeline naming.

---

### What works well

1. **GameState partition and single source of truth** — `src/state/game_state.ts` defines `GameState` with required `military`, `political`, and `displacement`; `serializeGameState.ts` allowlists exactly these plus meta/factions/paramilitary/turn_summaries and rejects wrappers. No duplicate control store (Engine Invariants §9.1).
2. **War-phase pipeline** — `src/sim/turn_pipeline.ts` is the single orchestrator for war turns; `runTurn` clones state, runs `warPhases` from `src/sim/turn_phases/war_phases.ts`, then refreshes front edges. Step list and canon mapping are in `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`.
3. **Serialization contract** — `serializeGameState` uses `validateGameStateShape` before serializing; deterministic key ordering (`strictCompare`), denylist for derived state (`validateGameState.ts`), and rejection of Map/Set keep Engine Invariants §13.1–§13.2 and determinism intact.
4. **Scenario runner → runTurn → persistence** — `src/scenario/scenario_runner.ts` calls `runTurn(state, input)`, then `serializeState(state)` for initial save, checkpoints, and final_save. `serialize.ts` delegates to `serializeGameState` after `validateState`; load path uses `deserializeState` (parse → `migrateState` → `validateState`). Single harness and single save format.
5. **OSID canonical; AoR/SID phase-out** — Control and location use OSID in war phase; `serialize.ts` migration strips legacy AoR keys; `getLegacyAoR` is the only cast for legacy reads; PIPELINE_ENTRYPOINTS and REPO_MAP state location_osid-only and no AoR for war.

---

### What needs improvement

1. **Migration vs partition** — `src/state/serialize.ts` `migrateState()` still uses **top-level** `candidate.formations`, `candidate.militia_pools`, `candidate.front_posture`, `candidate.assignable_front_segments`, `candidate.brigade_front_assignment`, etc. GameState types put these under `military`. So either persisted JSON is still flat in some paths or migration is legacy-flat; either way, partition is not enforced on load and round-trip could diverge (e.g. migration writes `candidate.formations = {}` while real data lives in `candidate.military.formations`).
2. **Validation does not enforce partition roots** — `validateGameStateShape` checks `meta`, denylist, `political.political_controllers`, and various optional top-level fields (e.g. `settlement_displacement`, `displacement.displacement_camp_state`) but does **not** require `state.military`, `state.political`, and `state.displacement` to exist as objects. A malformed payload could pass and then fail later when steps assume partition.
3. **Two `turn_pipeline.ts` files** — `src/state/turn_pipeline.ts` (peace) and `src/sim/turn_pipeline.ts` (war). REPO_MAP and PIPELINE_ENTRYPOINTS document both, but the naming collision is easy to confuse and can lead to importing the wrong entrypoint.
4. **UI coupling to full state** — `src/ui/map/data/GameStateAdapter.ts` takes full GameState and derives `LoadedGameState` (control, formations, sectors, fogOfWar, commandBriefing, etc.). Map and warroom depend on this single adapter; there is no versioned view schema or ADR that bounds UI to “adapter output only,” so UI remains tightly coupled to engine shape.
5. **Cross-domain access** — Many modules touch both `state.military` and `state.political` (e.g. combat, displacement_takeover, scenario_runner); displacement and political are read from combat and early_war. No read-only facade or bounded context; any step can mutate any partition, which makes data flow harder to reason about and refactors riskier.

---

### Interoperability

**(a) Simulation / combat**  
`runTurn(state, input)` in `src/sim/turn_pipeline.ts` clones state and runs `warPhases` in sequence. Each step receives `TurnContext { state, rng, input, report }` and may mutate `context.state`. Combat modules (`attack_resolution_osid.ts`, `bot_brigade_ai_osid.ts`, `corps_front_sectors.ts`, `sector_offensive.ts`, etc.) read `state.military` and `state.political` (e.g. control, formations, sectors) and update state in place. Single owner (pipeline), no formal per-step interface; steps are ordered in `war_phases.ts` and documented in PIPELINE_ENTRYPOINTS.

**(b) UI / map**  
GameState is loaded (e.g. from final_save or IPC) and passed to `GameStateAdapter`, which produces `LoadedGameState` (control lookup, formations, sectors, fogOfWar from `sector_intel` + `corps_front_sectors`, command briefing, etc.). Map app and warroom consume `LoadedGameState`; desktop sends state or save path via IPC. Data flow: state → adapter → view types → components. Adapter is the only boundary; no separate versioned view contract.

**(c) Scenario runner and persistence**  
Scenario runner builds state via `createInitialGameState`, runs `runTurn` in a loop, and writes `final_save.json` (and optional checkpoints) with `serializeState(state)`. Save/load path: `serializeState` → `validateState` → `serializeGameState`; load → `deserializeState` (parse → `migrateState` → `validateState`). Persistence is single JSON file; no partition-specific save/load. Run artifacts (weekly_report.jsonl, run_summary.json) are produced from the same state and reports inside the harness.

---

### Recommendations

1. **Align migration with partition** — In `serialize.ts` `migrateState()`, ensure every migrated field (formations, militia_pools, front_segments, front_posture, assignable_front_segments, brigade_front_assignment, theatres, etc.) is read from and written to `candidate.military`, `candidate.political`, or `candidate.displacement` as per `game_state.ts`. Add a test that loads a save with top-level keys (if any still exist), runs migration, and asserts round-trip and presence of `military.formations` (and no stray top-level `formations`).
2. **Enforce partition in validation** — In `validateGameStateShape`, require `state.military`, `state.political`, and `state.displacement` to be non-null objects; optionally add minimal shape checks (e.g. `military.formations` is a record). Fail fast on load/serialize if partition is missing.
3. **Clarify pipeline entrypoints** — Rename or document so the two turn pipelines are unambiguous (e.g. “peace pipeline” vs “war pipeline” in REPO_MAP/PIPELINE_ENTRYPOINTS, or move peace to `src/state/peace_turn_pipeline.ts`). Ensure all callers (scenario_runner, desktop, CLI) reference the intended file by name in comments or docs.
