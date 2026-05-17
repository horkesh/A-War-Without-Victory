# Marketing Store Launch Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Prepare launch-facing store, press, and public-facing materials that accurately represent the game state, avoid overclaiming unimplemented features, and stay synchronized with the roadmap and implemented reports.

## Architecture

Marketing copy is treated as a documentation surface with traceable claims. Every public claim maps to implemented reports, screenshots, verified builds, or explicitly marked roadmap items.

## Tech Stack

- Markdown launch copy and press kit drafts
- Existing screenshot/export workflow
- Existing build artifacts for validated screenshots
- Docs ledger for public-claim traceability

## Implementation Tasks

1. Establish claims inventory
   - List all proposed public claims: core loop, factions, map scale, historical framing, UI surfaces, diagnostics, accessibility, localization, and audio.
   - Mark each claim as implemented, planned, cut, or needs validation.
   - Link implemented claims to reports or commits.

2. Draft store page copy
   - Write short description, long description, feature bullets, content warning, and historical framing note.
   - Keep the headline literal and product-specific.
   - Avoid terms that imply completeness beyond current build status.

3. Draft press kit
   - Prepare game summary, fact sheet, screenshots list, logo/key-art placeholders, contact block, and embargo/release notes if applicable.
   - Include a clear statement that the game is a historical simulation and not a political endorsement.

4. Produce screenshot plan
   - Identify required screens: map overview, Army HQ, Chronicle, War Room, verdict/endgame, accessibility/settings.
   - Define viewport, scenario seed, and save/setup required for each screenshot.
   - Record any missing UI state needed before final capture.

5. Add review checklist
   - Verify each claim against implemented reports.
   - Run historical sensitivity review.
   - Run accessibility copy review for screenshots and captions.

6. Package launch docs
   - Place drafts in the launch/marketing docs location chosen by the repo.
   - Add README or index if a new folder is introduced.
   - Link launch docs from roadmap when ready.

## Files To Touch

- `docs/50_launch/*` or existing launch/marketing docs folder
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`
- Optional screenshot artifacts only after final visual capture pass

## Verification

- Run link/path checks with `rg` for every referenced report path.
- Verify all feature claims have an implemented report, commit, or explicit future-plan marker.
- If screenshots are captured, verify they match the current build and are not stale.

## Documentation And Ledger

- Add ledger entry for launch copy updates.
- Record which claims are implemented versus planned.
- Keep roadmap launch section synchronized with final copy status.

## Stop Gates

- Stop if a public claim cannot be traced to implemented evidence.
- Stop if historical framing language needs specialist review.
- Stop if screenshots reveal unplanned UI gaps that should be fixed before publication.
