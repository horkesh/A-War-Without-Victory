# External Playtest Readiness Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Prepare a controlled external playtest package with a current build, scenario seed/save, tester instructions, feedback form, known-issues list, and triage workflow.

## Architecture

External playtest readiness is a release-ops and product-validation lane. It packages only verified artifacts and gives testers a narrow task script that exercises the presidential loop without requiring internal repo knowledge.

Research recommendation 2026-05-17: separate testing from gameplay/release distribution. Use only the exact artifact that passed clean-VM validation, record its SHA-256 in the dry-run report, and prefer Steam Playtest for public pre-release testing where available because it isolates the test app from the main game's reviews, wishlist, refunds, and playtime. For confidential testing, use hidden Playtest keys or release-override keys with a separate NDA/intake process.

## Tech Stack

- Existing desktop package artifacts
- Launch/playtest markdown docs
- Existing smoke and build scripts
- Issue or feedback tracker chosen by the project owner

## Implementation Tasks

1. Define playtest objective
   - Start from existing playtest material under `docs/playtesting/v092/` if present; do not fork a second instructions style without a reason.
   - Choose target audience: strategy players, historical-wargame players, internal friends-and-family, or domain reviewers.
   - Define the tested loop: first 30 minutes, one full turn cycle, RS/RBiH/HRHB campaign slice, or endgame/verdict review.
   - Define success metrics and stop conditions.

2. Select build and scenario state
   - Pick exact commit SHA and package artifact.
   - Record `git rev-parse HEAD`, package path, package size, and SHA-256 hash.
   - Confirm the package SHA-256 matches the clean-VM-passed artifact before any external distribution.
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
   - Save dry-run evidence to `docs/40_reports/playtest/YYYYMMDD_EXTERNAL_PLAYTEST_DRY_RUN.md`.

## Blocker Classification

- **P0:** install failure, launch failure, crash during first objective, save/load corruption, sensitive-history misrepresentation, or feedback intake privacy failure.
- **P1:** confusing but recoverable instruction, missing screenshot/log guidance, non-blocking UI friction, or known issue without linked owner.
- **P2:** copy polish, optional hardware metadata, or nonessential packet presentation.

Do not release a tester packet with any open P0.

## Files To Touch

- Existing `docs/playtesting/v092/*` if it remains the active packet source
- `docs/50_launch/playtest/*` only if launch packet material is being split out for external distribution
- `docs/40_reports/playtest/YYYYMMDD_EXTERNAL_PLAYTEST_DRY_RUN.md`
- `docs/40_reports/PLATFORM_TEST_MATRIX.md` if artifact status changes
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Verify package artifact hash and commit SHA:
  - `git rev-parse HEAD`
  - `Get-FileHash <artifact-path> -Algorithm SHA256`
- Run the relevant package smoke test:
  - `npm.cmd run desktop:package:win:nsis`
  - `npm.cmd run desktop:package:win:nsis:smoke -- --report-only`
- Run one instruction-only dry-run.
- Verify every known issue links to a plan, report, or explicit owner decision.
 - Run `git diff --check -- docs/playtesting docs/50_launch docs/40_reports/playtest docs/40_reports/PLATFORM_TEST_MATRIX.md docs/plans/MASTER_ROADMAP.md docs/PROJECT_LEDGER.md`.

## Documentation And Ledger

- Add playtest packet docs and dry-run report.
- Update roadmap status when packet is ready.
- Add ledger entry with tested artifact, build command evidence, and no-sim-change note.

## Stop Gates

- Stop if installer/package validation is not current enough for external testers.
- Stop if a P0 launch/playtest blocker remains unresolved.
- Stop if feedback intake cannot protect sensitive tester information.

## Commit And Closeout

- Before staging, run `git status --short` and stage only playtest packet, evidence, roadmap, and ledger files owned by this plan.
- Commit only after the operator approves external distribution scope.
- Closeout note must include commit SHA, artifact hash, dry-run evidence path, and the P0/P1/P2 blocker count.
