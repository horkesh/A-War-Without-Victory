# Clean VM Cosmetic Finalization Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Close the remaining v0.9.5 clean-VM cosmetic validation items: SmartScreen UX, Windows Settings -> Apps visibility, `%APPDATA%` persistence, and NSIS uninstaller registry behavior.

## Architecture

This is an operator/environment validation lane over existing package artifacts. Code changes are allowed only if a clean-VM run proves an installer/package defect. Validation evidence must record exact artifact paths, hashes, Windows version, and VM state.

## Tech Stack

- Existing Windows NSIS package artifacts
- `tools/build/win_nsis_smoke.cjs`
- `docs/40_reports/PLATFORM_TEST_MATRIX.md`
- `docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RUNBOOK.md`

## Implementation Tasks

1. Prepare clean VM
   - Use a fresh Windows 10 or Windows 11 VM snapshot.
   - Record OS build, user type, network state, and Defender/SmartScreen defaults.
   - Copy the exact packaged artifact and release-log hash into the VM.

2. Validate SmartScreen UX
   - Launch the installer from a normal user download path.
   - Capture whether SmartScreen appears, the wording, and whether "Run anyway" path is available.
   - Record whether signing status or reputation is the limiting factor.

3. Validate Settings -> Apps visibility
   - Install normally.
   - Confirm app appears under Windows Settings -> Apps with expected name, version, publisher if configured, and uninstall action.
   - Record any missing metadata as package-defect candidates.

4. Validate `%APPDATA%` persistence
   - Launch app, generate a minimal local state change, close app, relaunch, and confirm state persists.
   - Uninstall and confirm whether persistence behavior matches intended policy.
   - Record exact paths without leaking local usernames in public docs.

5. Validate uninstaller registry cleanup
   - Inspect Add/Remove Programs entry before uninstall.
   - Run uninstall through Windows UI and installer uninstaller if both exist.
   - Confirm registry entries and installation directory cleanup.

6. Classify findings
   - Mark each item PASS, cosmetic issue, release blocker, or packaging defect.
   - If code/package changes are needed, open a follow-up implementation plan scoped to the affected packaging files.

## Files To Touch

- `docs/40_reports/PLATFORM_TEST_MATRIX.md`
- `docs/40_reports/implemented/*CLEAN_VM*` report file
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`
- Packaging files only if validation proves a defect

## Verification

- Attach or record VM evidence for each item.
- Re-run `tools/build/win_nsis_smoke.cjs` on the exact artifact if packaging metadata changes.
- Run packaging tests if package files change.

## Documentation And Ledger

- Add a clean-VM validation report with artifact hash, environment, steps, outcomes, and screenshots if available.
- Update platform matrix and roadmap status.
- Add ledger entry with no-sim-determinism note.

## Stop Gates

- Stop if the artifact hash cannot be tied to the tested installer.
- Stop if VM state is not clean enough to trust Settings/AppData/uninstaller results.
- Stop if signing/reputation requires an owner decision rather than code work.
