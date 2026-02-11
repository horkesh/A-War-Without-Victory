# Repo Map (AWWV)

## Repository Map (High-Level)
This doc is a minimal, code-facing map of the repo. It is not a design doc.

**Canonical entry points and pipeline step list:** See [PIPELINE_ENTRYPOINTS.md](PIPELINE_ENTRYPOINTS.md). That doc is the single source for entry point details and turn-pipeline step names; this doc is the high-level "where to look" map.

**External experts:** For a single handover covering project state, what is done, what needs to be done, and rules, see `docs/40_reports/EXTERNAL_EXPERT_HANDOVER.md`.

### Top-Level Directories and Responsibilities
Populate this section from the discovery checklist.
- `src/`: Core simulation code and pipeline entrypoints
- `tests/`: Determinism, invariants, and regression tests
- `tools/`: Scenario runners and utilities
- `scripts/`: One-off or pipeline scripts (map build, audits, repo checks)
- `data/`: Source and derived data artifacts
- `docs/`: Canon and engineering documentation (authoritative references)

## Key Pipelines and Their Code Locations
### Turn/Phase Pipeline
- Canon references: `docs/10_canon/Systems_Manual_v0_5_0.md`, `docs/10_canon/Engine_Invariants_v0_5_0.md`
- Code entrypoints:
  - War phases: `src/sim/turn_pipeline.ts`
  - Phase 0 / canonical pipeline: `src/state/turn_pipeline.ts`
  - Legacy/minimal turn harness: `src/turn/pipeline.ts` (used by `src/index.ts`)
- Militia/brigade formation (Phase I): pool population `src/sim/phase_i/pool_population.ts`, formation spawn `src/sim/formation_spawn.ts`; design: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`. CLI: `src/cli/sim_generate_formations.ts`.
- B1 Events: `src/sim/events/` — `event_types.ts` (trigger/effect types), `event_registry.ts` (historical + random events), `evaluate_events.ts` (deterministic evaluation). Runs first in both Phase I and Phase II pipelines (`evaluate-events` step).

### Scenario Loading/Execution
- Canon references: `docs/10_canon/Rulebook_v0_5_0.md`
- Code entrypoints:
  - Scenario harness: `src/scenario/scenario_runner.ts`
  - Scenario CLI: `src/cli/sim_scenario.ts`
  - Single-turn CLI: `src/cli/sim_run.ts`
  - Scenario loading: `src/scenario/scenario_loader.ts`
  - AoR init (browser-safe): `src/scenario/aor_init.ts` — `populateFactionAoRFromControl`, `ensureFormationHomeMunsInFactionAoR`. Used by scenario_runner, run_phase_ii_browser, and turn_pipeline `phase-ii-aor-init`.

### Map Build Pipeline
- Canon reference: `docs/20_engineering/MAP_BUILD_SYSTEM.md`
- **A1 tactical base map (STABLE):** `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` — canonical substrate for warroom and tactical map
- **1990 municipality boundaries (canonical):** `data/source/boundaries/bih_adm3_1990.geojson` — 110 opštine, WGS84, mun1990_id/mun1990_name; derived by `npm run map:merge:adm3-1990`
- Code entrypoints:
  - Scripts: `scripts/map/` (see MAP_BUILD_SYSTEM for the canonical entry command)
  - Map data loading: `src/map/`

### GUI / Map UIs
- **Tactical Map System (standalone map app):** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` — engineering reference. Code: `src/ui/map/`. Dev server: `npm run dev:map` (port 3001). Canvas 2D; political control, contested, front lines, settlement panel, OOB sidebar, dataset switching; no Leaflet/Mapbox.
- **Warroom (HQ scene + map scene):** `src/ui/warroom/`. Dev server: `npm run dev:warroom`. Full-screen map scene uses WarPlanningMap; staged assets, Phase 0 turn advance. See GUI reports in `docs/40_reports/`.
- **Phase II browser advance:** `src/sim/run_phase_ii_browser.ts` — browser-safe Phase II turn advance (no Node/fs). Used by warroom when advancing a turn in phase_ii. Increments turn; when faction AoRs empty, populates AoR from control + formation home muns via `src/scenario/aor_init.ts`. Does not run supply pressure or exhaustion; for full Phase II use Node `runTurn`.

## Change X → Go Here
Populate with concrete files once confirmed by discovery:
- Scenario changes → `src/scenario/`, `data/scenarios/`
- Phase ordering changes → `src/sim/turn_pipeline.ts`, `src/state/turn_pipeline.ts`, `src/state/turn_phases.ts`
- Authority derivation (municipality control → authority map) → `src/state/formation_lifecycle.ts` (`deriveMunicipalityAuthorityMap`); used by `update-formation-lifecycle` and brigade activation gating.
- Phase I control flip (incl. B4 coercion pressure, capability-weighted flip) → `src/sim/phase_i/control_flip.ts`; coercion reduces flip threshold via `state.coercion_pressure_by_municipality`; capability scales attacker/defender effectiveness (System 10) via `getFactionCapabilityModifier`; profiles updated in Phase I by `phase-i-capability-update` (turn_pipeline.ts).
- Militia pools / formation spawn / pool population → `src/sim/phase_i/pool_population.ts`, `src/sim/formation_spawn.ts`, `src/state/militia_pool_key.ts`, `src/state/formation_constants.ts`, `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`
- Determinism/serialization changes → `src/state/serializeGameState.ts`, `src/state/serialize.ts`, `src/utils/stable_json.ts`
- Map build changes → `scripts/map/`, `src/map/`, `docs/20_engineering/MAP_BUILD_SYSTEM.md`, `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md`
- Tactical map UI changes → `src/ui/map/`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Warroom UI changes → `src/ui/warroom/`, `docs/40_reports/` (GUI handovers)

## Generated vs Source Artifacts
Fill this section with concrete locations and policies:
- Generated artifacts: `data/derived/` (verify against `docs/20_engineering/repo/Tracked_artifacts_policy.md`)
- Source-of-truth artifacts: `data/source/` (verify against `docs/20_engineering/repo/Tracked_artifacts_policy.md`)
- **Historical OOB primary sources:** Brigades: `data/source/oob_brigades.json`. Corps: `data/source/oob_corps.json`. See `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §10.
- Never-edit-by-hand list: see `docs/20_engineering/repo/Tracked_artifacts_policy.md`

## Discovery Checklist (Deterministic)
### Commands / Searches
- `rg --files -g "*.ts" -g "*.js"` (inventory source files)
- `rg -n "main\\(|cli|entry|run|runner|scenario|pipeline"` (entrypoints)
- `rg -n "serialize|determin|random|timestamp|Date\\("` (determinism risks)
- `rg -n "phase|turn|tick|step"` (phase pipeline)
- `rg -n "map|terrain|osm|build"` (map pipeline)

### Evidence to Collect
- Primary entrypoints and their call chains
- Source of truth for phase ordering
- Serialization boundaries and derived-state handling
- Generated artifact locations

### How Findings Map into Docs
- Entry points → `docs/20_engineering/CODE_CANON.md` and this doc
- Pipeline locations → this doc
- Determinism risks → enforcement plan in `docs/engineering/INVARIANTS_IN_CODE.md` (add gates as needed)
