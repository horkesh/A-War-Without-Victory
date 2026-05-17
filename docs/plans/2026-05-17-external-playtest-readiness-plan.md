# External Playtest Readiness Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Prepare a controlled external playtest package with a current build, scenario seed/save, tester instructions, feedback form, known-issues list, and triage workflow.

## Architecture

External playtest readiness is a release-ops and product-validation lane. It packages only verified artifacts and gives testers a narrow task script that exercises the presidential loop without requiring internal repo knowledge.

## Tech Stack

- Existing desktop package artifacts
- Launch/playtest markdown docs
- Existing smoke and build scripts
- Issue or feedback tracker chosen by the project owner

## Implementation Tasks

1. Define playtest objective
   - Choose target audience: strategy players, historical-wargame players, internal friends-and-family, or domain reviewers.
   - Define the tested loop: first 30 minutes, one full turn cycle, RS/RBiH/HRHB campaign slice, or endgame/verdict review.
   - Define success metrics and stop conditions.

2. Select build and scenario state
   - Pick exact commit SHA and package artifact.
   - Choose default faction and save/scenario setup.
   - Record expected first-session path and known blockers.

3. Write tester instructions
   - Include install steps, launch steps, target play duration, feedback prompts, and how to report crashes.
   - Avoid internal terms that testers cannot understand.
   - Include historical content warning and expectation-setting copy.

4. Prepare feedback intake
   - Create structured feedback form or issue template.
   - Capture severity, reproduction steps, screenshot/log attachment, faction, turn, and hardware.
   - Separate crash/install failures from gameplay/UI feedback.

5. Prepare known-issues list
   - List accepted non-blockers and operator-only items.
   - Link each known issue to a roadmap plan or implemented report.
   - Do not hide launch blockers in known issues.

6. Run dry-run
   - Have an internal operator follow only the tester instructions.
   - Confirm install, first launch, first objective, save/load, and feedback submission path.
   - Revise docs until no internal context is required.

## Files To Touch

- `docs/50_launch/playtest/*` or nearest existing launch/playtest docs folder
- `docs/40_reports/PLATFORM_TEST_MATRIX.md` if artifact status changes
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Verify package artifact hash and commit SHA.
- Run the relevant package smoke test.
- Run one instruction-only dry-run.
- Verify every known issue links to a plan, report, or explicit owner decision.

## Documentation And Ledger

- Add playtest packet docs and dry-run report.
- Update roadmap status when packet is ready.
- Add ledger entry with tested artifact, build command evidence, and no-sim-change note.

## Stop Gates

- Stop if installer/package validation is not current enough for external testers.
- Stop if a P0 launch/playtest blocker remains unresolved.
- Stop if feedback intake cannot protect sensitive tester information.
