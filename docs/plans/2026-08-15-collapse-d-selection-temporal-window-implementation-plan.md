# Collapse D-selection Two-turn Window Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement and measure the decided symmetric two-turn municipality combat-incidence window behind the existing default-OFF collapse gate.

**Architecture:** A pure deterministic window-advance helper consumes an optional prior two-turn queue plus the current resolved-battle report, emits this turn's direct and symmetric peer exposure increments, and returns the pruned next queue. Phase 3C applies those increments through the existing monotonic local-strain writer and persists the optional queue only on the enabled OSID path.

**Tech Stack:** TypeScript, Vitest, AWWV War pipeline, JSON GameState serialization, scenario-runner 188-week evidence.

---

### Task 1: Pin the temporal selector contract RED

**Files:**
- Modify: `tests/collapse_d_selection_combat_incidence.test.ts`

**Step 1: Write the failing pure-window tests**

Add cases proving direct `+1`, symmetric `+0.5` pair credit across two turns, no credit at a three-turn distance, no same-target peer credit, target gating, stable ordering, malformed-row rejection, queue pruning, permutation invariance, and the exact Sipovo 3 / Drvar 2 sequence.

**Step 2: Write the failing Phase 3C integration test**

Advance a state through three calls and prove a later peer retroactively increments an earlier target while the optional queue appears only on the enabled OSID path.

**Step 3: Run RED**

Run:

```powershell
npx.cmd vitest run tests/collapse_d_selection_combat_incidence.test.ts --pool=forks --reporter=dot
```

Expected: failure because the window state/type/helper and Phase 3C wiring do not exist.

### Task 2: Implement the minimal state and pure window advance

**Files:**
- Modify: `src/state/game_state.ts`
- Modify: `src/sim/pressure/pressure_exposure.ts`
- Modify: `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts`

**Step 1: Add the optional state contract**

Add `CollapseCombatIncidenceWindowState` containing canonically sorted rows `{ turn, battle_id, target_osid }[]`, and optional `collapse_combat_incidence_window` under `PoliticalState`. Do not change schema version; absence is the old-save/default-OFF form.

**Step 2: Implement the pure helper**

Implement a two-turn inclusive queue advance. Sort numeric turn, target OSID, and battle ID; discard malformed/future/expired rows; add direct current exposure; credit each current/past or current/current different-target same-municipality pair once and symmetrically; return a stably ordered map and queue.

**Step 3: Wire Phase 3C**

On the enabled OSID-native branch, call the window helper with `state.meta.turn`, apply returned exposure, and persist the returned queue. Preserve the legacy settlement path and default-OFF early return.

**Step 4: Run GREEN**

Run the focused test until every new and retained case passes.

### Task 3: Prove save, lifecycle, determinism, and Section 6 safety

**Files:**
- Modify: `tests/collapse_d_selection_combat_incidence.test.ts`
- Modify only if required by a failing real contract: relevant save/lifecycle test

**Step 1: Add round-trip/absence assertions**

Prove the optional queue survives ordinary JSON serialization with stable row order, an absent queue remains absent, and a quiet enabled turn prunes expired rows without inventing exposure.

**Step 2: Run the focused and adjacent pack**

Run the D-selection, collapse, Section 6, flag-lifecycle, save-migration/round-trip, and pipeline-order suites. Then run typecheck and `canon:check`.

**Step 3: Audit determinism and canon**

Confirm explicit sorting, no RNG/clock, optional default-OFF state, unchanged control writers, unchanged Phase 3D, and unchanged Section 6 guard. Do not edit `docs/10_canon/FORAWWV.md`.

### Task 4: Measure twice and disposition

**Files:**
- Transient output: `runs/rc_d_selection_v3_window_measurement_a/`
- Transient output: `runs/rc_d_selection_v3_window_measurement_b/`

**Step 1: Run two fresh collapse-ON 188-week scenarios**

Use identical scenario inputs, build, flags, and environment except output directory.

**Step 2: Compare evidence**

Record final hash, byte comparison, structural fingerprint, exact Sipovo/Drvar main-town exposure, distribution/maxima, 40/55 crossings, Tier-1 entries, damage/capacity writes, 31 anchors, seven health gates, and Section 6 liveness.

**Step 3: Apply the predeclared disposition**

Retain the selector only if Sipovo/Drvar is exactly 3/2 and deterministic/health gates pass. Revert it otherwise. Do not tune scaling in this packet.

### Task 5: Synchronize and commit

**Files:**
- Modify: `docs/plans/2026-08-15-collapse-d-selection-measurement-plan.md`
- Modify: `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md`
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `handoffs/AWWV_AUTONOMOUS_ROADMAP_HEARTBEAT.md`
- Append: `docs/PROJECT_LEDGER.md`
- Append if reusable: `docs/PROJECT_LEDGER_KNOWLEDGE.md`

**Step 1: Record the exact measured disposition**

Separate selector discrimination from scaling/liveness. A 3/2 result may accept selection while leaving scaling and Section 6 work open.

**Step 2: Run final hygiene**

Run `git diff --check`, confirm no unintended canon/baseline/generated diff, and leave `.claude/scheduled_tasks.lock` untouched.

**Step 3: Commit bounded packets**

Commit implementation/evidence and synchronized documentation intentionally. Do not push or publish.
