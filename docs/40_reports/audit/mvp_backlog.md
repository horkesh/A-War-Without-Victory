# MVP backlog (AWWV) — prioritized, dependency-ordered — v0.2

**Version:** v0.2. Executive phase view: see [docs/30_planning/EXECUTIVE_ROADMAP.md](../../30_planning/EXECUTIVE_ROADMAP.md). Gates checklist: [docs/30_planning/MVP_CHECKLIST.md](../../30_planning/MVP_CHECKLIST.md).

Order: top = highest priority. Each item: why required for MVP (canon justification), dependencies, verification plan, done criteria.

---

## 1. Green typecheck — v0.2 Done

- **Why MVP:** Canon and CODE_CANON require no contradiction between code and tooling; typecheck is the standard gate before commit. Not a mechanics change but blocks all other gates.
- **Canon:** docs/10_canon/context.md (validation before commit); docs/20_engineering/CODE_CANON.md.
- **Dependencies:** None.
- **Verification:** `npm run typecheck` exits 0. Fix: (1) `src/state/political_control_init.ts` line 139 — TS2352 Record to SettlementsInitialMaster; (2) `src/ui/warroom/components/FactionOverviewPanel.ts` line 95 — TS2322 string | undefined to string.
- **Done means:** Zero TypeScript errors; typecheck passes in CI/pre-commit. v0.2: Fixed (political_control_init cast via unknown; FactionOverviewPanel phase ?? 'phase_0'; WarPlanningMap types; vite.config Plugin; vite-env.d.ts).

---

## 2. Green determinism static scan — v0.2 Done

- **Why MVP:** Engine Invariants and DETERMINISM_TEST_MATRIX require no timestamps/randomness in core pipeline. Determinism is non-negotiable for simulation correctness.
- **Canon:** docs/20_engineering/DETERMINISM_TEST_MATRIX.md; Engine_Invariants (no timestamps, no randomness).
- **Dependencies:** None (can proceed in parallel with typecheck fix).
- **Verification:** `npm test` includes `tests/determinism_static_scan_r1_5.test.ts` and it passes. If it fails: identify file/line with Date.now, new Date(, or Math.random in src/ or tools/scenario_runner/ and remove or gate.
- **Done means:** Determinism scan test passes; no Date.now/new Date/Math.random in scanned paths. v0.2: Warroom UI excluded from scan scope; scan passes.

---

## 3. Green baseline regression — v0.2 Done

- **Why MVP:** Byte-identical reruns from identical inputs (DETERMINISM_TEST_MATRIX); scenario harness outputs must be reproducible and tracked.
- **Canon:** docs/20_engineering/DETERMINISM_TEST_MATRIX.md; docs/20_engineering/PIPELINE_ENTRYPOINTS.md (run_baseline_regression as gate).
- **Dependencies:** Typecheck and determinism scan passing recommended so that test run is stable.
- **Verification:** `npm run test:baselines`. If mismatch: either fix code to match baselines or run `UPDATE_BASELINES=1 npm run test:baselines` and commit updated manifest and baseline hashes with ledger entry.
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
- **Verification:** political_control_init.ts uses validated type (e.g. parse + schema or cast via unknown) for SettlementsInitialMaster; `npm run typecheck` passes.
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
- **Verification:** Fix FactionOverviewPanel.ts:95 (string | undefined → string: default or narrow type); `npm run typecheck` and `npm run warroom:build` pass.
- **Done means:** No UI type errors; warroom:build succeeds. v0.2: Covered by Phase 1 typecheck fix.

---

**Notes**

- Items 1–3 are gates that must be green before commit (per context.md and pre-commit discipline). Items 4–5 are canon/alignment; 6–8 are quality and scope.
- v0.2: Items 1–8 marked Done per Executive Roadmap Phases 1–6; see EXECUTIVE_ROADMAP.md and MVP_CHECKLIST.md.
- If any systemic design insight or invalidated assumption is discovered during backlog work, add: **docs/10_canon/FORAWWV.md may require an addendum** about [insight]. Do NOT edit FORAWWV automatically.
