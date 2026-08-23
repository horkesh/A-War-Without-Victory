# Test Suite Recovery and Acceleration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Restore a genuinely green, hermetic full test suite and reduce its elapsed time without weakening deterministic or calibration coverage.

**Architecture:** Repair source/test contract drift first. Separate ambient calibration evidence from hermetic tests. Then build a measured hazard inventory and run safe files through isolated, duration-balanced processes while retaining a serial lane for shared-state tests. Optimize repeated work before changing coverage volume.

**Tech Stack:** TypeScript, Vitest 2.1, Node.js scripts, PowerShell/Windows, GitHub Actions.

---

### Task 1: Freeze the baseline and prove ambient-artifact dependence

**Files:**
- Create: `tests/fixtures/collapse_run_selection/`
- Modify: `tests/collapse_s6_run_selection.test.ts`
- Modify: `tests/collapse_s6_criteria_4_7_enclave_outcome.test.ts`
- Modify: `tests/collapse_phase1_g2_section6_invariant.test.ts`

1. Add temporary-fixture tests proving comparable ON/OFF pairs require identical commit, tree, consumed-input digest/path set, scenario, and duration.
2. Add a fixture containing incompatible pairs and verify selection refuses it.
3. Run the new test before implementation and confirm it fails for ambient-directory selection.
4. Move verdict evidence discovery behind explicit environment/path input; ordinary Vitest must never scan repository `runs/`.
5. Run the collapse tests with no evidence, valid fixtures, and invalid fixtures.
6. Confirm an unrelated fake `runs/` directory cannot change ordinary-suite outcomes.
7. Commit only the collapse harness/test change.

### Task 2: Repair player-facing Operational Group terminology contracts

**Files:**
- Modify: `tests/army_reserve_legibility.test.ts`
- Inspect/modify only if canon contradicts current production: `src/ui/map/utils/armyReservePresentation.ts`

1. Trace the player-facing terminology authority and the 2026-08-06 OG design disposition.
2. Add semantic assertions for the requested OG and front role instead of duplicated obsolete `sector` prose.
3. Run the four failing cases and observe their existing failure.
4. Make the minimum contract correction.
5. Run the full file and commit.

### Task 3: Repair structured content integrity contracts

**Files:**
- Modify: `tests/brigade_name_localization.test.ts`
- Modify if missing: the owning localization catalogue containing `rs_visegrad_brigade`
- Modify: `tests/codex_ghost_entries_wave_3.test.ts`
- Modify only if genuinely malformed: four files under `data/codex/ghost_entries/`

1. Prove whether `rs_visegrad_brigade` is an active retained formation and whether its localization row is missing.
2. Add a failing coverage assertion keyed to the canonical formation catalogue.
3. Add the row only when source authority is established; also assert no duplicate IDs.
4. Parse optional Markdown frontmatter and assert exactly one meaningful H1 rather than `startsWith('# ')`.
5. Use malformed/no-H1 fixtures as positive controls.
6. Run both files and commit.

### Task 4: Repair documentation and citation contracts

**Files:**
- Modify: `tests/docs_desktop_v09_truth.test.ts`
- Modify: `tests/hrhb_1992_decision_cadence.test.ts`
- Modify if warranted: `data/scenarios/events/war_1992_hrhb_summer.json`

1. Locate each assertion's owning authority.
2. Replace roadmap prose snapshots with structural workstream/link assertions and test locale truth in its owning document.
3. Validate both printed and PDF page notation for HRHB sources; reject a fixture with missing/malformed page data.
4. Preserve historical meaning and event timing.
5. Run both files and commit.

### Task 5: Repair officer source-to-loader contracts

**Files:**
- Modify: `tests/officer_bio_read_model.test.ts`
- Modify: `tests/officer_state_persistence.test.ts`
- Inspect: `data/scenarios/officers/apr1992_officers.json`

1. Trace the commit and provenance for the 22 added identities.
2. Validate IDs are unique, factions are canonical, referenced corps exist, and authored biography fields survive save/load.
3. Remove hardcoded historical counts and obsolete absence assertions only after source provenance is confirmed.
4. Retain a negative near-name test using an actually absent fabricated ID.
5. Run both files and commit.

### Task 6: Add a deterministic test timing and hazard inventory

**Files:**
- Create: `tools/test/test_suite_inventory.mjs`
- Create: `tests/test_suite_inventory.test.ts`
- Modify: `package.json`

1. Write failing tests for stable file ordering, complete discovery, duration parsing, shared-write/env/fixed-port hazard classification, and longest-processing-time shard balancing.
2. Include deliberately unordered input and a known shared-writer fixture as positive controls.
3. Implement the smallest deterministic inventory tool.
4. Add `test:inventory` and `test:inventory:check` scripts.
5. Run twice and compare emitted bytes.
6. Commit.

### Task 7: Introduce isolated balanced execution

**Files:**
- Create: `tools/test/run_vitest_balanced.mjs`
- Create: `tests/run_vitest_balanced.test.ts`
- Modify: `tools/test/run_vitest_slice.mjs`
- Modify: `package.json`

1. Write tests proving every discovered file appears exactly once, hazardous files remain serial, shard ordering is stable, and worker failure propagates.
2. Use a deliberately failing child fixture as the positive control for exit-code propagation.
3. Spawn separate Vitest processes per balanced manifest; do not enable unsafe shared-process parallelism globally.
4. Preserve existing `fast` and `scenario` entrypoints during migration.
5. Compare serial and balanced file/test counts on a bounded slice.
6. Commit.

### Task 8: Optimize the measured hotspots without reducing coverage

**Files:**
- Modify: `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
- Modify: `tests/strict_null_inventory_progress.test.ts`
- Modify: scenario test helpers identified by timing inventory

1. Record fresh per-file and per-property control timings.
2. For the null inventory, compute the source inventory once and reuse it across assertions; verify identical finding sets.
3. For sector properties, suppress success-path logs, load immutable fixture bytes once, and partition the existing seed/mode cross-product without dropping a case.
4. Add call-count and case-count assertions so optimized tests cannot become vacuous.
5. Change one optimization at a time and retain only measured improvements with identical results.
6. Commit each independent optimization separately.

### Task 9: Update CI lanes and documentation

**Files:**
- Modify: `.github/workflows/full-suite-and-fingerprint.yml`
- Modify: `.github/workflows/baseline-regression.yml`
- Modify: `.github/workflows/README.md`
- Modify: `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`
- Modify: `docs/PROJECT_LEDGER.md`

1. Add deterministic balanced shards with an always-report aggregation job.
2. Keep simulation-sensitive paths on complete required coverage.
3. Keep exhaustive evidence separate from ordinary hermetic Vitest.
4. Document test lanes, shard determinism, failure propagation, and local reproduction.
5. Do not alter baseline manifests or scenario pins.
6. Validate workflow YAML and path-filter positive/negative controls.
7. Commit.

### Task 10: Final verification and review

1. Run each focused repaired file.
2. Run `npm run typecheck`.
3. Run `npm run desktop:map:build` because the branch includes opening-screen work.
4. Run `npm run test:vitest:fast` and `npm run test:vitest:scenario`.
5. Run the complete suite through both serial and balanced entrypoints.
6. Run the balanced suite a second time and compare counts and deterministic outputs.
7. Confirm `git diff --check` and no tracked derived files changed.
8. Run determinism added-line scans for randomness, clocks, unsorted filesystem iteration, and persisted diagnostics.
9. Obtain independent review before promotion.
10. Push only after all required gates are evidenced green; do not publish or refresh pins.

