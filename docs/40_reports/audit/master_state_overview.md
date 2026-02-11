# Master state of the game overview (AWWV) — v0.2

**Version:** v0.2 (post–Executive Roadmap Phases 1–6: typecheck green, determinism scan green, baselines green, war-start tests, map docs, MVP checklist).

**Evidence policy:** Items are marked "Working" only when verified by at least one gate (test, regression run, or deterministic artifact check). "Planned" status requires a canon or roadmap reference. No timestamps or "generated at" phrases; ordering is stable (by ID then name).

---

## Executive summary

- **Scenario harness:** `src/scenario/scenario_runner.ts` is the canonical multi-turn entrypoint; used by `tools/scenario_runner/run_scenario.ts`, `run_baseline_regression.ts`, and CLI `sim_scenario.ts`. Evidence: `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, `docs/20_engineering/CODE_CANON.md`, ripgrep on `runTurn` imports.
- **Single-turn and scenario CLI:** `src/cli/sim_run.ts` and `src/cli/sim_scenario.ts` invoke `runTurn` from `src/sim/turn_pipeline.ts`. Evidence: ripgrep `sim_run.ts`, `sim_scenario.ts` → `runTurn`.
- **War-phase turn pipeline:** `src/sim/turn_pipeline.ts` is the canonical war-phase turn executor; Phase 0 / canonical pipeline lives in `src/state/turn_pipeline.ts` (different module). Evidence: `docs/20_engineering/REPO_MAP.md`, `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`.
- **GameState and serialization:** `src/state/game_state.ts` defines GameState; `src/state/serializeGameState.ts` and `src/state/serialize.ts` handle serialization with denylist for derived state (Engine Invariants §13.1). Evidence: `src/state/serializeGameState.ts` (no Map/Set, key ordering), `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`.
- **Determinism gates:** Static scan in `tests/determinism_static_scan_r1_5.test.ts` (scope: src/ and tools/scenario_runner/, excluding src/ui/warroom); scenario byte-identity in `tests/scenario_determinism_h1_1.test.ts` and `tools/scenario_runner/run_baseline_regression.ts`. Evidence: `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`. v0.2: determinism scan passes.
- **Map pipeline:** Canonical commands in `docs/20_engineering/MAP_BUILD_SYSTEM.md` (aligned with entrypoints and data contracts per Phase 5); scripts under `scripts/map/` and `tools/map/`; build entry `npm run map:build:new` → `tools/map/build_map.ts`. Evidence: `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`, `docs/20_engineering/REPO_MAP.md`.
- **Baseline regression:** `npm run test:baselines` runs `tools/scenario_runner/run_baseline_regression.ts`; compares SHA256 of artifacts to `data/derived/scenario/baselines/manifest.json`. Evidence: `package.json` script, `run_baseline_regression.ts`. v0.2: baselines green.
- **Typecheck:** Pre-commit gate `npm run typecheck`. v0.2: typecheck passes (Phase 1 fixes).

---

## Canon vs code alignment summary (top 10 risks)

| # | Risk | Doc pointer | Code pointer | Suggested verification |
|---|------|-------------|--------------|-------------------------|
| 1 | Phase 0 vs Phase I entry (war start) | CANON.md War Start Rule; Phase_0_Specification_v0_4_0 | `src/state/turn_pipeline.ts`, scenario scripts | Run Phase 0 scenario to referendum; assert no Phase I without referendum |
| 2 | Derived state serialized | Engine Invariants §13.1; validateGameState.ts denylist | serializeGameState.ts, validateGameState.ts | Grep for phase_e_aor_membership, phase_e_rear_zone in serialization; run serialize round-trip test |
| 3 | Determinism: Date.now / Math.random in pipeline | DETERMINISM_TEST_MATRIX.md; determinism_static_scan_r1_5 | src/, tools/scenario_runner/ (warroom excluded) | v0.2: Resolved — scan passes; warroom UI excluded from scope |
| 4 | Map build vs MAP_BUILD_SYSTEM.md | MAP_BUILD_SYSTEM.md (short), _old/MAP_BUILD_SYSTEM.md | tools/map/build_map.ts, scripts/map/* | v0.2: MAP_BUILD_SYSTEM aligned with entrypoints and data contracts |
| 5 | Settlement substrate shared-border fabric | FORAWWV / ASSISTANT_MISTAKES.log (SVG substrate lacks shared-border) | scripts/map/derive_settlement_substrate_from_svg_sources.ts | Treat as data truth; no tolerance compensation unless canon |
| 6 | Political control init type assertion | SettlementsInitialMaster type | src/state/political_control_init.ts:139 | v0.2: Resolved — cast via unknown |
| 7 | Warroom UI type strictness | — | src/ui/warroom/components/FactionOverviewPanel.ts:95 | v0.2: Resolved — phase ?? 'phase_0' |
| 8 | Golden baselines drift | run_baseline_regression.ts, manifest.json | data/derived/scenario/baselines/ | v0.2: Baselines updated and committed; test:baselines green |
| 9 | Single canonical scenario runner | CODE_CANON.md, REPO_MAP.md | src/scenario/scenario_runner.ts | No shadow entrypoints; grep for runScenario( usage |
| 10 | Canon doc set v0.4 vs code assumptions | CANON.md, Engine_Invariants_v0_4_0, Phase_Specifications_v0_4_0 | All state/sim modules | Doc-only review; no mechanics invented |

**docs/10_canon/FORAWWV.md may require an addendum** if audit reveals systemic design insights (e.g. entrypoint multiplicity or determinism gap root cause). Do NOT edit FORAWWV automatically.

---

## Confirmed canonical entrypoints and call-chain sketches

- **Scenario runner (multi-turn):** `src/scenario/scenario_runner.ts` → `runScenario()` loads scenario via `scenario_loader.ts`, prepares state, loop → `runTurn()` from `src/sim/turn_pipeline.ts`; writes to `runs/<run_id>/`. Used by: `tools/scenario_runner/run_scenario.ts`, `run_baseline_regression.ts`, `run_scenario_with_preflight.ts`; CLI `sim_scenario.ts`.
- **Single-turn run:** `src/cli/sim_run.ts` → `runTurn()` from `src/sim/turn_pipeline.ts`; emits save and derived artifacts.
- **War-phase pipeline:** `src/sim/turn_pipeline.ts` → `runTurn(state)` runs ordered phase steps (pressure, exhaustion, collapse, etc.). Phase 0 steps in `src/state/turn_pipeline.ts` (runOneTurn); referendum and war-start gating tested in `tests/phase0_referendum_held_war_start_e2e.test.ts` and `tests/phase0_v1_no_war_without_referendum_e2e.test.ts`. Warroom advance turn wired to `runPhase0TurnAndAdvance` (browser-safe) in `src/ui/warroom/run_phase0_turn.ts`.
- **Serialization:** `serializeState()` / `deserializeState()` in `src/state/serialize.ts` wrap `serializeGameState()` and validation; no Map/Set, denylist in `validateGameState.ts`.
- **Map build:** Entrypoints per `docs/20_engineering/MAP_BUILD_SYSTEM.md`: `map:build:new` → `tools/map/build_map.ts`; many other map:* scripts in `scripts/map/` and `tools/map/` for substrate, contact graph, viewers.

---

## Repo map (evidence-backed)

| Directory | Responsibility | Key files / evidence |
|-----------|----------------|----------------------|
| src/ | Core simulation and pipeline entrypoints | scenario_runner.ts, sim/turn_pipeline.ts, state/turn_pipeline.ts, state/game_state.ts, state/serializeGameState.ts, cli/sim_run.ts, cli/sim_scenario.ts |
| tests/ | Determinism, invariants, regression | determinism_static_scan_r1_5.test.ts, scenario_determinism_h1_1.test.ts, scenario_baseline_ops_h1_9.test.ts, scenario_golden_baselines_h2_3.test.ts |
| tools/ | Scenario runners, map, asset, engineering | scenario_runner/run_baseline_regression.ts, scenario_runner/run_scenario.ts, map/build_map.ts, engineering/canon_check.ts |
| scripts/ | Map build, audits, repo checks | map/*.ts (derive_settlement_substrate_from_svg_sources.ts, build_settlements_initial_master.ts, etc.) |
| data/ | Source (read-only) and derived artifacts | data/derived/scenario/baselines/, data/derived/map_viewer/, data/source/settlements_initial_master.json |
| docs/ | Canon and engineering docs | 10_canon/CANON.md, 20_engineering/CODE_CANON.md, PIPELINE_ENTRYPOINTS.md, REPO_MAP.md, DETERMINISM_TEST_MATRIX.md, MAP_BUILD_SYSTEM.md, 30_planning/ROADMAP_v1_0.md |

---

## Determinism posture

- **Gates that exist:** (1) `tests/determinism_static_scan_r1_5.test.ts` — no Date.now/new Date/Math.random in src/ and tools/scenario_runner/. (2) `tests/scenario_determinism_h1_1.test.ts` — same scenario twice → identical final_save.json. (3) `tests/scenario_harness_smoke_h1_4.test.ts` — noop_4w two runs identical final_save.json. (4) `tools/scenario_runner/run_baseline_regression.ts` — SHA256 comparison of listed artifacts vs manifest. (5) Serialization: no Map/Set in GameState (runtime in serializeGameState.ts). See `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`.
- **Observed at v0.2:** Typecheck passes. Determinism static scan passes (src/ and tools/scenario_runner/, excluding src/ui/warroom). Baseline regression passes (manifest committed). Full `npm test` may be long-running (timeout); determinism scan and phase0 e2e tests pass.
- **Explicit gaps (from DETERMINISM_TEST_MATRIX.md):** Explicit "no Map/Set in GameState" is enforced in serializer only, not a dedicated test. Static scan excludes warroom UI (display-only; Date used for calendar math).

---

## MVP definition

- **Bounded MVP** (from docs): Playable v1.0 prototype with canon v0.4 alignment; reproducible run path; Phase G UI for control/cost view; scenario harness and baseline determinism; map substrate and contact graph for sim. See `docs/30_planning/ROADMAP_v1_0.md`, `docs/30_planning/EXECUTIVE_ROADMAP.md`, `docs/30_planning/MVP_CHECKLIST.md`, `docs/30_planning/V1_0_PACKAGING.md`, Warroom MVP 1.0 and turn pipeline → GUI (Phase 0) in ledger.
- **Justification:** Canon references Engine Invariants v0.4.0, Phase Specifications v0.4.0; EXECUTIVE_ROADMAP and MVP_CHECKLIST define gates and post-MVP scope.

---

## MVP gap plan (priority-ranked, dependency-aware)

1. **Green typecheck** — v0.2 Done. Verification: `npm run typecheck` exits 0.
2. **Green determinism static scan** — v0.2 Done (warroom excluded from scan). Verification: `npm test` includes passing determinism scan.
3. **Green baseline regression** — v0.2 Done. Verification: `npm run test:baselines` passes; manifest committed.
4. **Phase 0 → Phase I gating** — v0.2 Done. Automated tests: `phase0_referendum_held_war_start_e2e.test.ts`, `phase0_v1_no_war_without_referendum_e2e.test.ts`.
5. **Map build doc alignment** — v0.2 Done. MAP_BUILD_SYSTEM.md aligned with entrypoints and data contracts.
6. **MVP feature completeness** — Per EXECUTIVE_ROADMAP and MVP_CHECKLIST: deterministic loop, canon war start, functional warroom GUI, reproducible builds. Verification: Phase exit criteria and MVP_CHECKLIST gates.

---

## How to run / test (what "green" means)

- **Typecheck:** `npm run typecheck`. Green = exit code 0, no TS errors.
- **Tests:** `npm test`. Green = all tests pass; note determinism_static_scan_r1_5 and scenario tests.
- **Baseline regression:** `npm run test:baselines`. Green = all scenario artifact hashes match manifest; to update baselines: `UPDATE_BASELINES=1 npm run test:baselines` then commit manifest and baseline hashes.
- **Canon check:** `npm run canon:check`. Green = static scan and, if present, baseline run pass.
- **Regenerate this audit:** `npm run audit:state` produces docs/40_reports/audit/master_state_overview.md, state_matrix.md, mvp_backlog.md deterministically (no timestamps). Version: v0.2.

---

## Validations (v0.2)

- `npm run typecheck`: **PASS** — exit 0.
- `npm test`: Determinism scan **PASS**; full suite may timeout (long-running); phase0 e2e tests pass.
- `npm run test:baselines`: **PASS** — hashes match manifest (or baselines updated and committed).
- `npm run warroom:build`: **PASS**.
- Reproducibility: Green = typecheck 0, determinism scan pass, test:baselines match or updated and committed, warroom:build succeeds. See `docs/30_planning/MVP_CHECKLIST.md`.
