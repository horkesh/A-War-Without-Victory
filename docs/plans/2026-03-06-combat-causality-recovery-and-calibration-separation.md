# Combat Causality Recovery and Calibration Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore a working, trustworthy combat pipeline by separating debugging, calibration, and historical shaping before any further tuning.

**Architecture:** Keep `docs/40_reports/CALIBRATION_MASTER.md` as the control surface, expand scenario reporting into explicit behavioral-health and historical-fit channels, add fail-loud operation invariants, prove the pipeline with a deterministic micro-scenario, and only then resume full-run cadence debugging. The work stays engine-wide and must not rely on controller overrides from `RBiH` to `RS`.

**Tech Stack:** TypeScript simulation engine, scenario harness/reporting pipeline, deterministic scenario tests, markdown control docs.

---

## Summary

Current state:
- Combat causality instrumentation exists and is already wired into the scenario harness.
- Real combat is restored in the 40-week run (`60` attack orders, `51` battles, `invalid_operation_count = 0` in `n114`).
- The remaining blocker is not dead operations; it is cadence-level failure: isolated zero-battle weeks still keep runs invalid for combat calibration.

Success criteria:
- A deterministic proof scenario demonstrates one operation producing at least one attack order, one battle, and one operation-progress update.
- Full-run outputs cleanly separate behavioral health from historical fit.
- Scenario outputs attribute control changes by cause.
- Remaining operation invariants fail loudly instead of hiding behind aggregate map outcomes.
- The 40-week scenario passes the combat-causality gate with no invalidation reasons.

## Implementation Changes

### 1. Lock the process and control surface

- Keep `docs/40_reports/CALIBRATION_MASTER.md` as the sole control file for combat-calibration validity.
- Preserve the current rule set:
  - no combat-calibration claim if a run has `0` battles in any invalidated evaluation window
  - no "improvement" language without non-zero attack orders
  - no territory-delta discussion without causal attribution
- Treat every session in this lane as a single-hypothesis loop:
  - identify one boundary or cadence defect
  - add one diagnostic or one engine fix
  - run one proof check and one scenario verification
  - update calibration docs and ledger immediately after evidence is produced
- Keep this lane engine-wide. No scenario-only hacks, and no controller overrides from `RBiH` to `RS`.

### 2. Finish the behavioral-health dashboard

Expand reporting so behavioral health and historical fit are separate first-class outputs.

Add to the scenario reporting layer in `src/scenario/combat_causality.ts`, `src/scenario/scenario_runner.ts`, and `src/scenario/scenario_reporting.ts`:
- `eligible_attacker_count`
- `objective_attempt_count`
- `objective_capture_count`
- `abort_reason`
- `attempts_before_recovery`
- `idle_execution_turn_streak`
- `movement_only_execution_turns`
- `recovery_without_logged_attempt`
- faction-level `battleless_weeks`
- corps-level and operation-level offensive window summaries

Add a second reporting family for historical fit rather than overloading combat causality:
- final control match
- area-weighted match
- anchor/holdout results
- casualties
- displacement
- control-flip attribution totals

Public reporting shape should separate:
- `behavioral_health`
- `historical_fit`
- `control_flip_attribution`

Do not treat a good historical-fit score as meaningful when behavioral health is invalid.

### 3. Add the missing hard invariants

Add engine/harness invariants for the remaining silent failure modes.

Required invariants:
- operation in `execution` for `N` consecutive turns with neither attack attempt nor movement progress
- non-empty `participating_brigades` with `eligible_attacker_count = 0`
- operation reaches `recovery` with `objective_attempt_count = 0`
- evaluated faction has zero battles across the scenario
- operation has assigned brigades but no brigade ever enters a staging or objective path
- operation-owned brigades re-enter corps logic before operation completion or cancellation

Default `N`: `2` consecutive execution turns. Count movement toward staging/objective as progress; do not count idle order reissuance as progress.

These should appear as explicit invalidation reasons in run outputs and as focused regression tests.

### 4. Build the known-good combat proof scenario

Create one tiny deterministic proof scenario before doing more 40-week debugging.

Requirements:
- one VRS sector attack
- one small, fixed brigade set assigned to the operation
- proper sectors, proper OSIDs, and proper brigade assignments
- no controller overrides from `RBiH` to `RS`
- operation-owned brigades are fully removed from corps chain-of-command until operation ends
- operation may finish early if user/bot ends it, but default scripted conditions should still yield one attack order, one battle, and one progress update

Proof-scenario acceptance:
- operation is injected
- planning reaches execution
- at least one brigade receives an attack order
- at least one battle resolves
- operation progress updates at least once
- deterministic rerun produces the same result twice

Do not resume broad 40-week diagnosis until this proof scenario is green.

### 5. Fix offensive cadence, not historical outcomes

Once the proof scenario is green, use the full 40-week scenario only to eliminate the remaining zero-battle weeks.

Investigation order:
- recovery duration and re-entry timing
- planning-duration rules after an operation ends
- whether a corps is effectively limited to one long offensive window at a time
- whether multiple corps can sustain overlapping pressure
- whether brigades assigned to an operation reposition aggressively enough to make the next objective possible even if not attacked that same turn
- whether participant eligibility and sector geometry are causing avoidable downtime between objectives

Implementation rule:
- operations should move brigades toward future objective viability automatically
- brigades assigned to operations remain under operation control until the operation ends or is manually terminated
- any cadence fix must apply to all scenarios, not only `apr1992_definitive_40w`

The expected outcome of this phase is not "better map score"; it is "no invalid zero-battle gaps in the offensive windows."

### 6. Add control-flip attribution

Add attribution to scenario outputs so every control delta is classed as one of:
- `combat`
- `consolidation`
- `demographic_drift`
- `initial_override`

Expose attribution weekly and in run summary.
Use those fields in reports and calibration discussion.
Do not infer combat success from control shifts once attribution exists.

### 7. Classify overrides explicitly

Any remaining override-like mechanism used in scenarios or calibration docs must be tagged as:
- `initial_state_correction`
- `bot_compensation`
- `permanent_engine_ceiling_workaround`

Store the classification in the reporting/docs layer first, not as free-text notes only.
The purpose is to stop scenario shaping from being mistaken for AI health.

### 8. Documentation and reporting discipline

After each verified milestone, update:
- `docs/40_reports/CALIBRATION_MASTER.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `.claude/napkin.md`

Allowed milestone language only:
- first failing boundary identified
- attack orders restored, battles still zero
- battles restored, objective tracking broken
- proof scenario passes
- combat-causality gate passed; tuning can resume

Do not use "improved calibration" before the gate passes.

## Public Interfaces and Type Changes

Reporting/API additions should be explicit and stable.

Add or expand output contracts to include:
- `behavioral_health` object at weekly and run-summary level
- `historical_fit` object at run-summary level
- `control_flip_attribution` object at weekly and run-summary level
- operation diagnostics fields for:
  - `eligible_attacker_count`
  - `objective_attempt_count`
  - `objective_capture_count`
  - `abort_reason`
  - `attempts_before_recovery`
  - `idle_execution_turn_streak`
  - `movement_only_execution_turns`

Operational rules to encode explicitly:
- operation-owned brigades are excluded from corps command selection while the operation is active
- operation logic owns repositioning toward future objectives
- early operation termination returns brigades cleanly to corps control with no stranded assignment state

## Test Plan

Required tests:
- proof scenario test proving one attack order, one battle, and one progress update
- determinism rerun of the proof scenario with identical output
- regression for `execution` with participants but zero eligible attackers
- regression for `recovery` with zero logged attempts
- regression for operation-owned brigades being ignored by corps command until operation end
- regression for movement-only execution turns counting as progress, not false stall
- regression for early execution entry once staging is complete
- regression for consecutive idle execution turns invalidating the operation
- scenario-output tests for behavioral-health, historical-fit, and control-flip attribution shapes

Verification sequence for each milestone:
1. targeted test
2. typecheck
3. proof scenario run if the change touches operation flow
4. full 40-week scenario run only after proof scenario stays green

## Assumptions and Defaults

- Keep the current strict calibration gate; do not relax it to accommodate zero-battle weeks.
- Do not change starting controllers from `RBiH` to `RS`.
- It is acceptable to change initial operation targets, brigade assignments, sectors, and OSID-targeting behavior if done through normal scenario/engine data rather than controller overrides.
- Operation behavior must remain general-purpose and usable by the whole game, not this scenario alone.
- The next resumption point for tuning is only after the proof scenario passes and the 40-week run has no combat-causality invalidation reasons.
