# First-Hour Faction Modal Gate Parity

**Date:** 2026-06-19
**Status:** Implemented
**Scope:** UI/read-model/store route ownership only. No simulation, save schema, scenario data, baseline manifest, generated artifact, calibration floor, or packaging change.

## Summary

The first-hour new-campaign sequence now has faction parity and hard-modal route ownership:

- The two-step war-start intro resets by campaign handoff key, so starting a new faction while the prior intro component remains mounted cannot inherit the previous faction's `WAR BEGINS` briefing step and skip `WAR HAS STARTED`.
- `PresidentialToolbar` accepts `modalLocked` from `App` while `EventDecisionModal` owns focus. Top-level shell routes (`DESK`, `WAR MAP`, `ARMY HQ`, `RECORDS`, `CHRONICLE`, `CODEX`, alert badges, reserve/pressure badges, crest, and advance turn) are disabled and handler-guarded.
- The overlay was extracted to `src/ui/map/components/PeaceWarTransitionOverlay.tsx` so the reset behavior is covered without importing the full MapLibre app shell into jsdom.

## Verification

- Red/green regression: `npx.cmd vitest run tests/ui/shell_navigation_ownership.test.ts tests/ui/onboarding_track_d_consolidation.test.ts` went red on the missing modal-lock/reset path, then green at **24/24**.
- TypeScript: `npm.cmd run typecheck -- --pretty false`.
- Existing browser gate: `npm.cmd run qa:first-hour:browser`.
- Targeted live browser probe: RBiH, RS, and HRHB each verified `WAR HAS STARTED` -> `WAR BEGINS` identity -> opening brief -> foundational `Decision Required` modal, with toolbar routes disabled while the required decision owned focus. The probe also verified strict dev-server cleanup on port 3239.

## Follow-Up

Packaging remains paused. The next D2 polish work should continue broad live-browser surface sweeps and non-operation raw-copy checks rather than reopen this first-hour modal parity unless a new failing proof appears.

