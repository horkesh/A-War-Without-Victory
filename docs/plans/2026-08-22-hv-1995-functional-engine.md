# HV 1995 Functional Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use systematic-debugging and test-driven-development to execute this plan task-by-task.

**Goal:** Make the coupled 1995 HV expeditionary timing and engine path operationally functional, proven by live-path evidence rather than calibration inference.

**Architecture:** Keep all six `spawn_turn: 174` definitions atomic with admission to both live T3 movement executors. Add a default-off, deterministic lifecycle trace to the existing temporal artifact and join it with spawn, movement, operation-opportunity, and full battle-stack evidence through a permanent diagnostic CLI. Use the first missing live boundary from one instrumented campaign to select exactly one behavioral fix.

**Tech Stack:** TypeScript, Vitest, scenario runner JSON/JSONL artifacts, deterministic CLI diagnostics.

---

### Task 1: Make the expeditionary lifecycle observable

**Files:**
- Modify: `src/sim/combat/reason_code_debug.ts`
- Modify: `src/scenario/brigade_temporal_emit.ts`
- Test: `tests/reason_code_debug.test.ts`
- Test: `tests/brigade_temporal_emit.test.ts`

1. Write tests proving `hv_phantom` is absent by default and present only under `AWWV_DEBUG_REASON_CODES=formation_lifecycle`.
2. Run the focused tests and observe the missing-topic and missing-row failures.
3. Add the topic and the narrow, default-off temporal inclusion.
4. Rerun focused tests and typecheck.

### Task 2: Build the evidence-joining harness

**Files:**
- Create: `tools/diagnostics/hv_1995_lifecycle.ts`
- Create: `tests/hv_1995_lifecycle_diagnostic.test.ts`
- Modify: `package.json`

1. Write synthetic tests with positive controls for temporal population, movement orders, physical moves, operation membership, and battle-stack projection.
2. Verify the tests fail before implementation.
3. Implement deterministic JSONL parsing and artifact joins for all six formations.
4. Mark zero battle participation `NOT_ESTABLISHED` unless a full-stack positive control exists.
5. Expose `npm run diagnose:hv1995 -- <run-dir> [--write]`.

### Task 3: Measure the live failure boundary

**Files:**
- Runtime evidence only under `runs/`; restore `data/derived/latest_run_final_save.json` afterwards.

1. Commit the observation-only harness so the scenario tree is clean and provenance-valid.
2. Run one 188-week scenario with `formation_lifecycle,battle_stack,axis_reject,objective_filter,brigade_state` enabled.
3. Run the diagnostic and require six spawn rows, six traced formations, and positive controls for every quoted absence.
4. Identify the first live boundary not crossed by each formation. Do not infer beyond that boundary.

### Task 4: Fix one measured root cause

**Files:**
- Select only after Task 3 identifies the live failing component.
- Add a focused regression test beside the owning component.

1. Write the smallest failing test reproducing the measured boundary failure.
2. Verify it fails for the measured reason.
3. Implement one minimal, faction-symmetric engine correction consistent with War Specification §5 and §6.8, Systems Manual §6.5/§6.8, Engine Invariants §6.3/§11/§14, and `MOVEMENT_AUTHORITY.md`.
4. Rerun focused tests and typecheck.

### Task 5: Prove functional closure

1. Run a fresh instrumented 188-week campaign for the single behavioral change.
2. Require all six formations to spawn and be traceable; explain every unit’s operation, order, movement, and battle outcome from the harness.
3. Run engine-health, consistency, anchor, baseline, focused, full-suite, typecheck, and build gates. Preserve the existing manifest until its differences have an explicit owner disposition.
4. Restore the tracked latest final save after each campaign.
5. Obtain review independent of the implementer before promotion.

**Done means:** the timing and movement edits remain atomic; the live pipeline gives the expeditionary wave legal strategic intent, routing, physical movement, and combat opportunity; the full-stack trace establishes actual participation or a truthful terminal reason for each formation; hard engine-health gates pass; no unexplained new failure remains.
