# Commander Read-Model Surface Parity

**Date:** 2026-06-18

## Summary

Closed the remaining turn-0 commander display gap found during the Pyrrhic formation/commander audit. ORBAT, Corps Detail, and Formation Detail now share the same opening-command read model already used by Army HQ commander cards/personnel and the OOB sidebar. When a corps intentionally has no seated active commander at campaign birth, those surfaces show a display-only `Opening command` label instead of looking vacant.

This keeps the existing no-mutation contract intact: Svetozar Andric, Selmo Cikotic, and Midhad Hujdur can be shown as opening read-model commanders without setting `assigned_corps_id` or backdating later historical commanders into turn 0. Synthetic JNA command formations use a display-only command-staff panel.

## Changes

- Added `CommanderDisplayPanel` as a reusable UI component for display-only opening command and command-staff labels.
- Wired ORBAT, Corps Detail, and Formation Detail to fall back to `resolveCorpsCommanderDisplay(...)` when no real active commander is seated.
- Reused the panel in Army HQ `CommanderSection` and removed the old raw `[!] ... // ...` acting-commander banner wording.
- Added ARBiH 3rd/4th Corps utility coverage and render tests for ORBAT, Corps Detail, and Formation Detail.

## Verification

- `npm.cmd exec -- vitest run tests/ui/opening_corps_commander_display.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/commander_read_model_surfaces.test.ts --pool=forks --reporter=dot` passed 11/11.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.

## Scope

UI/read-model presentation and tests only. No simulation logic, officer seating, scenario data, save schema, generated artifacts, calibration floor, golden baselines, randomness, timestamps, persisted output ordering, or packaged installer artifact changed.
