# Player Turn Guide And War Termination Spec Lane

**Date:** 2026-05-17
**Lane:** docs/canon-and-focused-test
**Result:** Player Turn Guide and War Termination minimal spec drafted under `docs/10_canon/` with supporting historian notes.

## Summary

- Added `PLAYER_TURN_GUIDE.md` as a Rulebook-adjacent player guide that maps shipped Decision Room / Warroom / pre-advance surfaces to canonical phase-step literals and the six valid tactical levers.
- Added `WAR_TERMINATION_SPEC.md` as the canon-tier minimal contract for war termination, recurring peace initiatives, precondition levers, scoring handoff, and sensitive-history gate compliance.
- Added historian advisory notes for the war-termination spec; no engine, save migration, logistics, supply, paramilitary, UI, roadmap, ledger, or napkin files were edited.

## Changes Made

### Player Turn Guide

- Created a full phase inventory from `early_war_phases.ts`, `war_phases.ts`, `war_phase_briefing_steps.ts`, `war_phase_negotiation_steps.ts`, and `war_phase_reconciliation_steps.ts`.
- Documented player-visible surfaces using existing Decision Room, Warroom priority docket/pulse, pre-advance review, Army HQ BRIEFING, Chronicle, and Turn Aftermath surfaces only.
- Canonized the six tactical levers for player guidance: corps stance, sector stance, ops planning, logistics priority, OPSEC, and sector override.

### War Termination Spec

- Canon-tier home selected: `docs/10_canon/WAR_TERMINATION_SPEC.md`.
- Documented current code-backed termination priority: scenario victory, negotiated peace, faction collapse, turn-limit stalemate.
- Recorded current known drift: `VICTORY_AND_PYRRHIC_SCORING.md` Section 1 omits negotiated peace from its priority list; `peace_plan_data.ts` Dayton week 185 differs from `dayton_negotiation.ts` week 188.
- Added sensitive-history audit confirming no Ring-3 refused surface is introduced.

## Files Changed

| File | Change |
|---|---|
| `docs/10_canon/PLAYER_TURN_GUIDE.md` | New derived player guide. |
| `docs/10_canon/WAR_TERMINATION_SPEC.md` | New canon-tier minimal termination spec. |
| `docs/40_reports/convenes/WAR_TERMINATION_SPEC_HISTORIAN_NOTES_2026-05-17.md` | New historian advisory pack. |
| `docs/40_reports/implemented/20260517_PLAYER_TURN_GUIDE_AND_WAR_TERMINATION_SPEC.md` | This implementation report. |

## Verification

Verification commands and results:

- Step-literal cross-check for `PLAYER_TURN_GUIDE.md`: PASS in worker lane; parent formatting cleanup preserved code-formatted literals.
- Section-presence and sensitive-history audit checks for `WAR_TERMINATION_SPEC.md`: PASS in worker lane.
- `npx.cmd vitest run tests\war_termination.test.ts`: PASS, 1 test file / 20 tests.
- `npm.cmd run canon:check`: attempted in worker lane; existing determinism static scan failed with an internal-state access error unrelated to these Markdown files.

## Follow-Ups / Blockers

- Parent lane must decide whether and when to update `docs/PROJECT_LEDGER.md` and `docs/plans/MASTER_ROADMAP.md`; this lane intentionally did not edit them per user instruction.
- User sign-off remains pending for sensitive-history-touching canon release.
- Follow-on canon amendment should align `VICTORY_AND_PYRRHIC_SCORING.md` Section 1 with code-backed negotiated-peace termination priority.
- Follow-on focused cleanup should reconcile Dayton week 185 in `peace_plan_data.ts` with week 188 in `dayton_negotiation.ts`, or explicitly document why both constants exist.
