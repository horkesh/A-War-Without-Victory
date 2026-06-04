# Warroom Diplomacy Escape Close

**Date:** 2026-06-04
**Type:** UI/product shell accessibility fix
**Source:** GitHub Codex review thread on PR #166, `PRRT_kwDORNoPiM6HGaCG`

## Summary

The Warroom Diplomacy telephone now opens the `DiplomacyPanel` / Patron
Relations surface directly, but that route bypassed `WarroomNativeOverlay`, whose
Escape key handler previously supplied keyboard dismissal. The Warroom-level
Escape stack closed the command strip, Decision Room, President's Desk, and
native overlays, but not the direct `diplomacyOpen` panel.

`App.tsx` now closes Warroom Diplomacy on Escape before falling through to the
native-overlay handler. The effect dependency list includes `diplomacyOpen` so
the handler tracks the current modal state.

## Changes

| File | Change |
| --- | --- |
| `src/ui/map/App.tsx` | Added `diplomacyOpen` handling to the Warroom Escape stack and effect dependencies. |
| `tests/ui/warroom_shell_ownership.test.ts` | Added a static shell-ownership contract proving Warroom Diplomacy remains dismissible through the Warroom Escape stack. |

## Verification

| Gate | Result |
| --- | --- |
| Focused UI pack | PASS: `tests/ui/warroom_shell_ownership.test.ts`, `tests/ui/diplomacy_panel.test.ts` (10 tests) |
| Typecheck | PASS: `npm.cmd run typecheck` |
| Baseline regression | PASS: `Baseline regression: all scenarios match.` |

This is UI-only. It does not touch simulation, scenario data, save schema,
calibration, or presidential authority.
