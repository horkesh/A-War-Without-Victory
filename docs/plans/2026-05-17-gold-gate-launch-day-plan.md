# Gold Gate Launch Day Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Define the final gold gate and launch-day checklist for declaring a build shippable, tagging it, publishing artifacts, and monitoring the first launch window.

## Architecture

Gold status is a release-management decision backed by explicit evidence: builds, tests, scenario diagnostics, UI checks, docs, legal/public copy, and rollback instructions. No item passes by assumption.

## Tech Stack

- Existing npm build/test scripts
- Git tags and release notes
- Scenario diagnostic reports
- Launch docs and store copy

## Implementation Tasks

1. Define gold criteria
   - Builds pass for tactical map, warroom, and desktop sim.
   - Typecheck passes.
   - Focused and smoke test suites pass.
   - Scenario diagnostics meet documented thresholds or have accepted waivers.
   - Accessibility P0 and launch-blocking UI issues are closed.
   - Public copy and screenshots have claim traceability.

2. Define release candidate flow
   - Create RC branch or tag naming convention.
   - Freeze non-blocking feature work.
   - Require changelog and known issues draft.
   - Record exact commit SHA for every candidate.

3. Build release checklist
   - Include clean checkout/build verification.
   - Include installer/package smoke test if packaging exists.
   - Include save/load smoke test.
   - Include first-run and reset-flow smoke test.

4. Define launch-day operations
   - Assign publish order for store page, release notes, binaries, and announcement.
   - Define monitoring window, owner, and escalation path.
   - Define rollback/unpublish criteria.

5. Define post-launch triage
   - Categorize incoming issues by crash, install, save corruption, gameplay blocker, UI blocker, and docs/copy.
   - Define hotfix branch/tag flow.
   - Define minimum verification for hotfix release.

6. Add evidence template
   - Create a release evidence report template with command outputs, artifact paths, hashes, and sign-offs.
   - Link it from roadmap.

## Files To Touch

- `docs/50_launch/*` or release docs folder
- `docs/40_reports/release/*` if release reports are stored there
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Dry-run the checklist against the current build and record missing items.
- Verify every command in the checklist exists.
- Verify release paths and folder names match repo conventions.

## Documentation And Ledger

- Add launch checklist docs.
- Add release evidence template.
- Add ledger entry when checklist is introduced or materially revised.

## Stop Gates

- Stop if a release criterion cannot be measured.
- Stop if packaging or distribution owner is undefined.
- Stop if launch copy, legal/privacy, or crash reporting is unresolved.
