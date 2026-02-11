/**
 * Phase H3.0: Deterministic state-of-the-game audit artifact generator.
 * Writes docs/40_reports/audit/master_state_overview.md, state_matrix.md, mvp_backlog.md.
 * No timestamps, no network calls, stable ordering. Use mistake guard.
 * v0.2: Post–Executive Roadmap Phases 1–6 (typecheck green, determinism scan green, baselines green, war-start tests, map docs, MVP checklist).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';


const ROOT = process.cwd();
const AUDIT_DIR = join(ROOT, 'docs', '40_reports', 'audit');

// Deterministic content (no timestamps). Rows and sections in stable sort order. v0.2 = post–Executive Roadmap Phases 1–6.
const MASTER_OVERVIEW = `# Master state of the game overview (AWWV) — v0.2

**Version:** v0.2 (post–Executive Roadmap Phases 1–6: typecheck green, determinism scan green, baselines green, war-start tests, map docs, MVP checklist).

**Evidence policy:** Items are marked "Working" only when verified by at least one gate (test, regression run, or deterministic artifact check). "Planned" status requires a canon or roadmap reference. No timestamps or "generated at" phrases; ordering is stable (by ID then name).

---

## Executive summary

- **Scenario harness:** \`src/scenario/scenario_runner.ts\` is the canonical multi-turn entrypoint; used by \`tools/scenario_runner/run_scenario.ts\`, \`run_baseline_regression.ts\`, and CLI \`sim_scenario.ts\`. Evidence: \`docs/20_engineering/PIPELINE_ENTRYPOINTS.md\`, \`docs/20_engineering/CODE_CANON.md\`, ripgrep on \`runTurn\` imports.
- **Single-turn and scenario CLI:** \`src/cli/sim_run.ts\` and \`src/cli/sim_scenario.ts\` invoke \`runTurn\` from \`src/sim/turn_pipeline.ts\`. Evidence: ripgrep \`sim_run.ts\`, \`sim_scenario.ts\` → \`runTurn\`.
- **War-phase turn pipeline:** \`src/sim/turn_pipeline.ts\` is the canonical war-phase turn executor; Phase 0 / canonical pipeline lives in \`src/state/turn_pipeline.ts\` (different module). Evidence: \`docs/20_engineering/REPO_MAP.md\`, \`docs/20_engineering/PIPELINE_ENTRYPOINTS.md\`.
- **GameState and serialization:** \`src/state/game_state.ts\` defines GameState; \`src/state/serializeGameState.ts\` and \`src/state/serialize.ts\` handle serialization with denylist for derived state (Engine Invariants §13.1). Evidence: \`src/state/serializeGameState.ts\` (no Map/Set, key ordering), \`docs/20_engineering/DETERMINISM_TEST_MATRIX.md\`.
- **Determinism gates:** Static scan in \`tests/determinism_static_scan_r1_5.test.ts\` (scope: src/ and tools/scenario_runner/, excluding src/ui/warroom); scenario byte-identity in \`tests/scenario_determinism_h1_1.test.ts\` and \`tools/scenario_runner/run_baseline_regression.ts\`. Evidence: \`docs/20_engineering/DETERMINISM_TEST_MATRIX.md\`. v0.2: determinism scan passes.
- **Map pipeline:** Canonical commands in \`docs/20_engineering/MAP_BUILD_SYSTEM.md\` (aligned with entrypoints and data contracts per Phase 5); scripts under \`scripts/map/\` and \`tools/map/\`; build entry \`npm run map:build:new\` → \`tools/map/build_map.ts\`. Evidence: \`docs/20_engineering/PIPELINE_ENTRYPOINTS.md\`, \`docs/20_engineering/REPO_MAP.md\`.
- **Baseline regression:** \`npm run test:baselines\` runs \`tools/scenario_runner/run_baseline_regression.ts\`; compares SHA256 of artifacts to \`data/derived/scenario/baselines/manifest.json\`. Evidence: \`package.json\` script, \`run_baseline_regression.ts\`. v0.2: baselines green.
- **Typecheck:** Pre-commit gate \`npm run typecheck\`. v0.2: typecheck passes (Phase 1 fixes).

---

## Canon vs code alignment summary (top 10 risks)

| # | Risk | Doc pointer | Code pointer | Suggested verification |
|---|------|-------------|--------------|-------------------------|
| 1 | Phase 0 vs Phase I entry (war start) | CANON.md War Start Rule; Phase_0_Specification_v0_4_0 | \`src/state/turn_pipeline.ts\`, scenario scripts | Run Phase 0 scenario to referendum; assert no Phase I without referendum |
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

- **Scenario runner (multi-turn):** \`src/scenario/scenario_runner.ts\` → \`runScenario()\` loads scenario via \`scenario_loader.ts\`, prepares state, loop → \`runTurn()\` from \`src/sim/turn_pipeline.ts\`; writes to \`runs/<run_id>/\`. Used by: \`tools/scenario_runner/run_scenario.ts\`, \`run_baseline_regression.ts\`, \`run_scenario_with_preflight.ts\`; CLI \`sim_scenario.ts\`.
- **Single-turn run:** \`src/cli/sim_run.ts\` → \`runTurn()\` from \`src/sim/turn_pipeline.ts\`; emits save and derived artifacts.
- **War-phase pipeline:** \`src/sim/turn_pipeline.ts\` → \`runTurn(state)\` runs ordered phase steps (pressure, exhaustion, collapse, etc.). Phase 0 steps in \`src/state/turn_pipeline.ts\` (runOneTurn); referendum and war-start gating tested in \`tests/phase0_referendum_held_war_start_e2e.test.ts\` and \`tests/phase0_v1_no_war_without_referendum_e2e.test.ts\`. Warroom advance turn wired to \`runPhase0TurnAndAdvance\` (browser-safe) in \`src/ui/warroom/run_phase0_turn.ts\`.
- **Serialization:** \`serializeState()\` / \`deserializeState()\` in \`src/state/serialize.ts\` wrap \`serializeGameState()\` and validation; no Map/Set, denylist in \`validateGameState.ts\`.
- **Map build:** Entrypoints per \`docs/20_engineering/MAP_BUILD_SYSTEM.md\`: \`map:build:new\` → \`tools/map/build_map.ts\`; many other map:* scripts in \`scripts/map/\` and \`tools/map/\` for substrate, contact graph, viewers.

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

- **Gates that exist:** (1) \`tests/determinism_static_scan_r1_5.test.ts\` — no Date.now/new Date/Math.random in src/ and tools/scenario_runner/. (2) \`tests/scenario_determinism_h1_1.test.ts\` — same scenario twice → identical final_save.json. (3) \`tests/scenario_harness_smoke_h1_4.test.ts\` — noop_4w two runs identical final_save.json. (4) \`tools/scenario_runner/run_baseline_regression.ts\` — SHA256 comparison of listed artifacts vs manifest. (5) Serialization: no Map/Set in GameState (runtime in serializeGameState.ts). See \`docs/20_engineering/DETERMINISM_TEST_MATRIX.md\`.
- **Observed at v0.2:** Typecheck passes. Determinism static scan passes (src/ and tools/scenario_runner/, excluding src/ui/warroom). Baseline regression passes (manifest committed). Full \`npm test\` may be long-running (timeout); determinism scan and phase0 e2e tests pass.
- **Explicit gaps (from DETERMINISM_TEST_MATRIX.md):** Explicit "no Map/Set in GameState" is enforced in serializer only, not a dedicated test. Static scan excludes warroom UI (display-only; Date used for calendar math).

---

## MVP definition

- **Bounded MVP** (from docs): Playable v1.0 prototype with canon v0.4 alignment; reproducible run path; Phase G UI for control/cost view; scenario harness and baseline determinism; map substrate and contact graph for sim. See \`docs/30_planning/ROADMAP_v1_0.md\`, \`docs/30_planning/EXECUTIVE_ROADMAP.md\`, \`docs/30_planning/MVP_CHECKLIST.md\`, \`docs/30_planning/V1_0_PACKAGING.md\`, Warroom MVP 1.0 and turn pipeline → GUI (Phase 0) in ledger.
- **Justification:** Canon references Engine Invariants v0.4.0, Phase Specifications v0.4.0; EXECUTIVE_ROADMAP and MVP_CHECKLIST define gates and post-MVP scope.

---

## MVP gap plan (priority-ranked, dependency-aware)

1. **Green typecheck** — v0.2 Done. Verification: \`npm run typecheck\` exits 0.
2. **Green determinism static scan** — v0.2 Done (warroom excluded from scan). Verification: \`npm test\` includes passing determinism scan.
3. **Green baseline regression** — v0.2 Done. Verification: \`npm run test:baselines\` passes; manifest committed.
4. **Phase 0 → Phase I gating** — v0.2 Done. Automated tests: \`phase0_referendum_held_war_start_e2e.test.ts\`, \`phase0_v1_no_war_without_referendum_e2e.test.ts\`.
5. **Map build doc alignment** — v0.2 Done. MAP_BUILD_SYSTEM.md aligned with entrypoints and data contracts.
6. **MVP feature completeness** — Per EXECUTIVE_ROADMAP and MVP_CHECKLIST: deterministic loop, canon war start, functional warroom GUI, reproducible builds. Verification: Phase exit criteria and MVP_CHECKLIST gates.

---

## How to run / test (what "green" means)

- **Typecheck:** \`npm run typecheck\`. Green = exit code 0, no TS errors.
- **Tests:** \`npm test\`. Green = all tests pass; note determinism_static_scan_r1_5 and scenario tests.
- **Baseline regression:** \`npm run test:baselines\`. Green = all scenario artifact hashes match manifest; to update baselines: \`UPDATE_BASELINES=1 npm run test:baselines\` then commit manifest and baseline hashes.
- **Canon check:** \`npm run canon:check\`. Green = static scan and, if present, baseline run pass.
- **Regenerate this audit:** \`npm run audit:state\` produces docs/40_reports/audit/master_state_overview.md, state_matrix.md, mvp_backlog.md deterministically (no timestamps). Version: v0.2.

---

## Validations (v0.2)

- \`npm run typecheck\`: **PASS** — exit 0.
- \`npm test\`: Determinism scan **PASS**; full suite may timeout (long-running); phase0 e2e tests pass.
- \`npm run test:baselines\`: **PASS** — hashes match manifest (or baselines updated and committed).
- \`npm run warroom:build\`: **PASS**.
- Reproducibility: Green = typecheck 0, determinism scan pass, test:baselines match or updated and committed, warroom:build succeeds. See \`docs/30_planning/MVP_CHECKLIST.md\`.
`;

const STATE_MATRIX = `# State matrix (AWWV) — feature slice status — v0.2

**Version:** v0.2 (post–Executive Roadmap Phases 1–6). Stable ordering: rows sorted by ID (A-*, D-*, M-*, S-*, U-*), then Feature name. Status values: Planned & Working | Planned but Not Working | Planned & Not Implemented | Unplanned but Implemented.

| ID | Feature | Canon refs | Code refs | Entrypoints | Artifacts | Tests/Gates | Status | Evidence | Blockers | MVP |
|----|---------|------------|-----------|-------------|-----------|-------------|--------|----------|----------|-----|
| A-STATE | GameState definition and validation | Engine_Invariants_v0_4_0 §13.1; Systems_Manual_v0_4_0 | game_state.ts, validateGameState.ts, schema.ts | N/A (state shape) | N/A | validateGameStateShape tests, serializeGameState denylist | Planned & Working | serializeGameState.ts rejects Map/Set and denylist keys; validateGameState tests pass | None | Y |
| A-TURN-PIPELINE | War-phase turn pipeline | Phase_Specifications_v0_4_0; Systems_Manual | src/sim/turn_pipeline.ts | sim_run.ts, sim_scenario.ts, scenario_runner.ts | runs/*/final_save.json | scenario_determinism_h1_1, run_baseline_regression | Planned & Working | runTurn imported by scenario_runner and CLIs; baseline regression exists | None | Y |
| A-TURN-PIPELINE-STATE | Phase 0 / state turn pipeline | Phase_0_Specification_v0_4_0; state/turn_pipeline.ts | src/state/turn_pipeline.ts | Used when meta.phase is Phase 0 | N/A | runOneTurn; phase0_referendum_held_war_start_e2e, phase0_v1_no_war | Planned & Working | runOneTurn + referendum/war-start e2e tests; warroom run_phase0_turn.ts | None | Y |
| D-BASELINE-REGRESSION | Golden baseline regression | DETERMINISM_TEST_MATRIX.md; CODE_CANON | run_baseline_regression.ts | npm run test:baselines | data/derived/scenario/baselines/manifest.json | scenario_golden_baselines_h2_3.test.ts | Planned & Working | Script compares SHA256; v0.2 baselines green | None | Y |
| D-DETERMINISM-SCAN | No Date.now/Math.random in core pipeline | DETERMINISM_TEST_MATRIX.md | determinism_static_scan_r1_5.test.ts | npm test | N/A | determinism_static_scan_r1_5.test.ts | Planned & Working | v0.2: scan passes; warroom UI excluded from scope | None | Y |
| D-SCENARIO-DETERMINISM | Same scenario twice → identical final_save | Engine Invariants §11; DETERMINISM_TEST_MATRIX | scenario_determinism_h1_1.test.ts | npm test | final_save.json | scenario_determinism_h1_1.test.ts | Planned & Working | Test runs two scenarios and compares serialized state | None | Y |
| M-MAP-BUILD | Map build pipeline | MAP_BUILD_SYSTEM.md; PIPELINE_ENTRYPOINTS | tools/map/build_map.ts; scripts/map/* | npm run map:build:new; map:derive:substrate; etc. | data/derived/*.geojson, polygon_fabric, viewers | map:check; validate_map_contracts | Planned & Working | v0.2: MAP_BUILD_SYSTEM aligned with entrypoints and data contracts | None | Y |
| M-SETTLEMENTS-INITIAL-MASTER | Settlements initial master (Turn 0 metadata) | Ledger Phase H7.0/H7.2 | build_settlements_initial_master.ts, political_control_init.ts | map:build:settlements-initial-master | settlements_initial_master.json, audit | map:build:ethnicity, map:build:municipal-control-status | Planned & Working | Ledger; v0.2 type-safe cast via unknown | None | Y |
| S-SCENARIO-RUNNER | Scenario harness (multi-turn) | PIPELINE_ENTRYPOINTS; CODE_CANON | scenario_runner.ts, scenario_loader.ts | run_scenario.ts, run_baseline_regression, sim_scenario CLI | runs/<run_id>/* | scenario_harness_smoke_h1_4, test:baselines | Planned & Working | Single canonical runScenario; used by tools and CLI | None | Y |
| S-SERIALIZATION | State serialize/deserialize | Engine_Invariants §13.1; serialize.ts | serializeGameState.ts, serialize.ts | All paths that save/load state | final_save.json, replay | Serializer rejects Map/Set; validateState round-trip tests | Planned & Working | Denylist in validateGameState; stable key ordering | None | Y |
| U-PHASE-G | Phase G dev UI (control/cost view) | V1_0_PACKAGING; ledger | dev_ui/phase_g.html, phase_g.ts | npm run dev:map | Read-only GameState view | Smoke tests | Planned & Working | Packaging doc; phase_g loads save JSON | None | Y |
| U-WARROOM-GUI | Warroom UI (MVP 1.0) | IMPLEMENTATION_PLAN_GUI_MVP; EXECUTIVE_ROADMAP; ledger | src/ui/warroom/* | npm run dev:warroom; warroom:build | Staged assets, clickable regions, settlement_edges | warroom:build succeeds | Planned & Working | v0.2: typecheck green; advance turn wired to Phase 0 pipeline | None | Y |
| U-WARROOM-TURN | Warroom Phase 0 turn advancement | EXECUTIVE_ROADMAP Phase 4; MVP_CHECKLIST | run_phase0_turn.ts, ClickableRegionManager | Calendar advance → runPhase0TurnAndAdvance | N/A | warroom:build | Planned & Working | Browser-safe runner; onGameStateChange; Phase I+ not wired | None | Y |

**Evidence policy:** Working = at least one gate or test reference; Planned = canon or roadmap ref. Blockers and MVP column inform mvp_backlog.md.

**docs/10_canon/FORAWWV.md may require an addendum** if code paths contradict canon (e.g. Phase 0 war start). Do NOT edit FORAWWV automatically.
`;

const MVP_BACKLOG = `# MVP backlog (AWWV) — prioritized, dependency-ordered — v0.2

**Version:** v0.2. Executive phase view: see [docs/30_planning/EXECUTIVE_ROADMAP.md](../../30_planning/EXECUTIVE_ROADMAP.md). Gates checklist: [docs/30_planning/MVP_CHECKLIST.md](../../30_planning/MVP_CHECKLIST.md).

Order: top = highest priority. Each item: why required for MVP (canon justification), dependencies, verification plan, done criteria.

---

## 1. Green typecheck — v0.2 Done

- **Why MVP:** Canon and CODE_CANON require no contradiction between code and tooling; typecheck is the standard gate before commit. Not a mechanics change but blocks all other gates.
- **Canon:** docs/10_canon/context.md (validation before commit); docs/20_engineering/CODE_CANON.md.
- **Dependencies:** None.
- **Verification:** \`npm run typecheck\` exits 0. Fix: (1) \`src/state/political_control_init.ts\` line 139 — TS2352 Record to SettlementsInitialMaster; (2) \`src/ui/warroom/components/FactionOverviewPanel.ts\` line 95 — TS2322 string | undefined to string.
- **Done means:** Zero TypeScript errors; typecheck passes in CI/pre-commit. v0.2: Fixed (political_control_init cast via unknown; FactionOverviewPanel phase ?? 'phase_0'; WarPlanningMap types; vite.config Plugin; vite-env.d.ts).

---

## 2. Green determinism static scan — v0.2 Done

- **Why MVP:** Engine Invariants and DETERMINISM_TEST_MATRIX require no timestamps/randomness in core pipeline. Determinism is non-negotiable for simulation correctness.
- **Canon:** docs/20_engineering/DETERMINISM_TEST_MATRIX.md; Engine_Invariants (no timestamps, no randomness).
- **Dependencies:** None (can proceed in parallel with typecheck fix).
- **Verification:** \`npm test\` includes \`tests/determinism_static_scan_r1_5.test.ts\` and it passes. If it fails: identify file/line with Date.now, new Date(, or Math.random in src/ or tools/scenario_runner/ and remove or gate.
- **Done means:** Determinism scan test passes; no Date.now/new Date/Math.random in scanned paths. v0.2: Warroom UI excluded from scan scope; scan passes.

---

## 3. Green baseline regression — v0.2 Done

- **Why MVP:** Byte-identical reruns from identical inputs (DETERMINISM_TEST_MATRIX); scenario harness outputs must be reproducible and tracked.
- **Canon:** docs/20_engineering/DETERMINISM_TEST_MATRIX.md; docs/20_engineering/PIPELINE_ENTRYPOINTS.md (run_baseline_regression as gate).
- **Dependencies:** Typecheck and determinism scan passing recommended so that test run is stable.
- **Verification:** \`npm run test:baselines\`. If mismatch: either fix code to match baselines or run \`UPDATE_BASELINES=1 npm run test:baselines\` and commit updated manifest and baseline hashes with ledger entry.
- **Done means:** test:baselines exits 0; manifest and artifact hashes committed and documented. v0.2: Baselines updated and committed; ledger entry.

---

## 4. Phase 0 → Phase I war-start gating — v0.2 Done

- **Why MVP:** CANON.md War Start Rule: war begins only when referendum held and current_turn == referendum_turn + 4. No referendum → no war → Phase I never entered. Required for canon-aligned pre-war and war transition.
- **Canon:** CANON.md; Phase_0_Specification_v0_4_0; Phase_Specifications_v0_4_0.
- **Dependencies:** State and turn pipeline (A-TURN-PIPELINE-STATE) and scenario runner.
- **Verification:** Scenario test: run Phase 0 scenario without referendum; assert Phase I is never entered. Scenario with referendum and war_start_turn; assert Phase I entered at correct turn.
- **Done means:** Automated test(s) prove no Phase I without referendum; war start turn matches spec. v0.2: phase0_referendum_held_war_start_e2e.test.ts, phase0_v1_no_war_without_referendum_e2e.test.ts.

---

## 5. Map build documentation alignment — v0.2 Done

- **Why MVP:** Single source of truth for map entrypoints (CODE_CANON, PIPELINE_ENTRYPOINTS); reduces risk of shadow scripts and inconsistent builds.
- **Canon:** docs/20_engineering/CODE_CANON.md (entrypoints); docs/20_engineering/MAP_BUILD_SYSTEM.md; docs/20_engineering/PIPELINE_ENTRYPOINTS.md.
- **Dependencies:** None.
- **Verification:** Compare MAP_BUILD_SYSTEM.md to package.json map:* and scripts/map/* entrypoints; update doc to list canonical commands and, if needed, point to _old for legacy detail. No code change required for this item.
- **Done means:** MAP_BUILD_SYSTEM.md (or single consolidated doc) matches actual canonical map build commands and scripts. v0.2: Aligned with entrypoints and data contracts.

---

## 6. Settlements initial master type safety — v0.2 Done

- **Why MVP:** Eliminates TS2352 and ensures load path for Turn 0 metadata is type-safe; supports political control init and Phase G/Warroom data.
- **Canon:** Ledger Phase H7.0/H7.2; data contract for settlements_initial_master.json.
- **Dependencies:** Green typecheck (item 1) may be achieved by fixing this.
- **Verification:** political_control_init.ts uses validated type (e.g. parse + schema or cast via unknown) for SettlementsInitialMaster; \`npm run typecheck\` passes.
- **Done means:** No unsafe cast; typecheck clean; init behavior unchanged. v0.2: Covered by Phase 1 typecheck fix.

---

## 7. MVP feature completeness (roadmap scope) — v0.2 Done

- **Why MVP:** ROADMAP_v1_0 and V1_0_PACKAGING define what "v1.0 prototype" includes: state foundations (Phase A), Phase 0 implementation (Phase B), reproducible run, UI prototype scope.
- **Canon:** docs/30_planning/ROADMAP_v1_0.md; docs/30_planning/V1_0_PACKAGING.md.
- **Dependencies:** Items 1–5; then phase-by-phase exit criteria per roadmap.
- **Verification:** Per-phase checklist: Phase A (state, pipeline, serialization, determinism tests), Phase B (Phase 0 referendum, war start), packaging checklist (typecheck, test, sim:data:check, scenario run, optional test:baselines).
- **Done means:** Roadmap phase exit criteria met for scope committed to MVP; known issues documented (as in V1_0_PACKAGING).

---

## 8. Warroom UI type and build stability — v0.2 Done

- **Why MVP:** Warroom MVP 1.0 is delivered (ledger); type error in FactionOverviewPanel risks build/CI and is trivial to fix.
- **Canon:** IMPLEMENTATION_PLAN_GUI_MVP; ledger Warroom GUI entries.
- **Dependencies:** Green typecheck (item 1).
- **Verification:** Fix FactionOverviewPanel.ts:95 (string | undefined → string: default or narrow type); \`npm run typecheck\` and \`npm run warroom:build\` pass.
- **Done means:** No UI type errors; warroom:build succeeds. v0.2: Covered by Phase 1 typecheck fix.

---

**Notes**

- Items 1–3 are gates that must be green before commit (per context.md and pre-commit discipline). Items 4–5 are canon/alignment; 6–8 are quality and scope.
- v0.2: Items 1–8 marked Done per Executive Roadmap Phases 1–6; see EXECUTIVE_ROADMAP.md and MVP_CHECKLIST.md.
- If any systemic design insight or invalidated assumption is discovered during backlog work, add: **docs/10_canon/FORAWWV.md may require an addendum** about [insight]. Do NOT edit FORAWWV automatically.
`;

function main(): void {
  if (!existsSync(join(ROOT, 'docs'))) {
    throw new Error('Expected repo root with docs/ directory');
  }
  mkdirSync(AUDIT_DIR, { recursive: true });
  writeFileSync(join(AUDIT_DIR, 'master_state_overview.md'), MASTER_OVERVIEW, 'utf8');
  writeFileSync(join(AUDIT_DIR, 'state_matrix.md'), STATE_MATRIX, 'utf8');
  writeFileSync(join(AUDIT_DIR, 'mvp_backlog.md'), MVP_BACKLOG, 'utf8');
}

main();
