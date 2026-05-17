# GUI D7 Right Rail And Dev Host Closeout

**Date:** 2026-05-16
**Plan:** `docs/plans/2026-05-16-gui-playtest-defects-plan.md` Track D7

## Summary

Closed the remaining actionable D7 polish gaps after the Phase 0 GUI wave:

- The Presidential Inbox no longer renders under the map-local Field Ops Snapshot when OPS owns the right rail.
- Warroom browser handoff URLs now use `http://127.0.0.1:3002/...`, matching the dev map server and existing Electron/browser smoke convention.
- First-turn orientation has no remaining live `localStorage` dependency; dismissal stays caller/session-owned and progressed-save tutorial replay remains save-backed through `meta.tutorial_state`.

## Changes

- `src/ui/map/components/panelRail.ts` adds `shouldRenderInboxPanel(...)`.
- `src/ui/map/App.tsx` uses that predicate so OPS/right-rail ownership is singular.
- `src/ui/warroom/warroom.ts` standardizes dev handoff URLs on `127.0.0.1`.
- `src/ui/map/components/FirstTurnOrientationCard.tsx` and `src/ui/map/data/firstTurnOrientation.ts` remove stale browser-storage references while preserving session-owned dismissal.
- `tests/ui_map_panel_rail.test.ts` and `tests/ui/dev_host_consistency.test.ts` cover the D7 regressions.

## Verification

- `npx.cmd vitest run tests\ui_map_panel_rail.test.ts tests\ui\dev_host_consistency.test.ts tests\ui\bottom_status_strip_labels.test.ts tests\ui\no_unicode_escapes_in_rendered_text.test.ts tests\ui\first_turn_orientation.test.ts tests\ui\first_turn_orientation_persistence.test.ts tests\ui\tutorial_persistence.test.ts` passed 25/25.
- Combined focused regression with ops planning, convoy, decision-room, D7, and D5 tests passed 125/125.
- `npm.cmd run typecheck` passed.
- `git diff --check` on touched files exited 0 with CRLF normalization warnings only.

## Residual

Browser/operator smoke remains useful: open OPS in the running map and confirm only Field Ops Snapshot occupies the right rail; from live Warroom, open tactical map/sandbox and confirm `127.0.0.1:3002` handoff.
