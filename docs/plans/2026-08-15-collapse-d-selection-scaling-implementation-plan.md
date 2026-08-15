# Collapse D-selection Scaling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Measure whether `STRAIN_FRACTION=3.0` makes the accepted two-turn D-selector produce deterministic live HRHB collapse damage without regressions.

**Architecture:** Change one Phase 3C calibration constant behind the existing default-OFF gate. Pin the transform test-first, run focused and adjacent gates, then perform paired 188-week collapse-ON measurement and retain or revert by the design criteria.

**Tech Stack:** TypeScript, Vitest, AWWV War pipeline, scenario-runner evidence tools.

**Outcome:** COMPLETE — FAIL_REVERTED. Tasks 1-4 were executed. The paired runs were deterministic and healthy but produced zero true Tier-1 domains and zero live writes; production and test scale changes were reverted as required. Task 5 records the failed experiment and hands the lane to D-shape.

---

### Task 1: Pin the scale contract RED

**Files:**
- Modify: `tests/collapse_d_selection_combat_incidence.test.ts`

1. Add a focused Phase 3C assertion that one direct exposure produces local strain 3.0 while the accepted Sipovo/Drvar selector stays 3/2.
2. Run the focused test and confirm it fails with actual strain 0.15.

### Task 2: Implement the single calibration change

**Files:**
- Modify: `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`
- Modify expected scale-specific assertions: `tests/collapse_d_selection_combat_incidence.test.ts`

1. Change only `STRAIN_FRACTION` from 0.15 to 3.0 and correct its explanatory comment.
2. Update existing Phase 3C expectations whose sole dependency is the multiplier.
3. Run the focused suite GREEN, then the 11-file collapse/save/pipeline pack and typecheck.

### Task 3: Prove defaults, canon, and determinism

1. Run `canon:check` to prove the default-OFF baseline remains exact.
2. Audit for unchanged selector topology, thresholds, Phase 3D, Section 6, control writers, state schema, ordering, RNG, and clocks.
3. Confirm no canon file changed.

### Task 4: Measure twice and disposition

1. Run two fresh `ENABLE_COLLAPSE=true` 188-week scenarios in separate output roots.
2. Compare all artifacts, final hash, structural fingerprint, Sipovo/Drvar strain, threshold crossings, true Tier-1 domains, damage/capacity writes, geography/faction, anchors, benchmarks, engine health, rupture, and Section 6 full scan.
3. Retain only if live non-enclave HRHB damage exists and all predeclared gates pass; otherwise revert the multiplier.

### Task 5: Synchronize, verify, and commit

1. Update the measurement plan, build spec, roadmap, command board, heartbeat, ledger, and knowledge base with the exact result.
2. Run final focused regression, typecheck, diff hygiene, generated-artifact cleanup, and no-canon-diff checks.
3. Commit only the bounded packet; preserve `.claude/scheduled_tasks.lock`, and do not push or publish.
