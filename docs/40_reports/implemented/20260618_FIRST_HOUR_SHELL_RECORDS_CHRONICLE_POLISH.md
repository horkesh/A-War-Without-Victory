# First-Hour Shell, Records, and Chronicle Polish

**Date:** 2026-06-18  
**Scope:** UI/read-model/store presentation and tests only. No simulation logic, scenario data, save schema, calibration floor, golden baseline, generated calibration artifact, or packaged installer artifact changed.

## Summary

- Browser-fallback new campaigns now file resolved foundational decisions into the same fired-decision read model as desktop campaigns, so opening decisions appear immediately in Records and Chronicle during live browser/dev play.
- First-hour shell copy now hides internal calendar/debug labels: toolbar and Army HQ show `Opening week` instead of `Turn 0` / `Week 0`; Records and Chronicle count badges render with visible separators instead of glued text.
- Decision-modal ownership is stricter: top-level shell routes no-op while a required event decision is active, the Warroom staff route goes directly to Army HQ, and browser-preview onboarding dismissal survives shell remounts.
- Army HQ, formation, settlement, operation, sector, and consequence surfaces share player-safe label helpers for readiness/posture/stance/operation phase/effect fallbacks, keeping raw enum/id prose out of first-hour player copy.

## Changes Made

### First-Hour Decision Filing

- `GameStateAdapter` now derives fired decision events from both `fired_event_ids` and `military.event_decision_log`.
- Browser-fallback decisions are marked as decisions and carry safe response/effect detail for the consequence ledger.
- Chronicle generation no longer requires a completed turn summary before decision-ledger entries can render, fixing opening-week Chronicle rows.

### Shell and Modal Ownership

- App-level Warroom/Desk/Command route handlers do not open competing shells while an event decision modal is active.
- Warroom `commander_coatrack`/staff routing now targets Army HQ directly.
- Browser-preview onboarding state is kept in renderer memory across shell remounts so preview dismissal does not reappear over Chronicle, Codex, Records, or Army HQ.

### Player-Safe Copy

- Added `playerSafeText` helpers for operation phases, formation readiness/posture, sector stance/strength, record detail fallbacks, and raw-token detection.
- Replaced shorthand/raw copy such as `EF:`, `BDE/KM`, `RECOMMEND:`, uppercase sector stance enums, generated operation phases, and unsafe decision-effect fallback detail.
- `formatTurnLabel(...)` and Army HQ headers now render `Opening week` for turn 0.

### Records and Chronicle Polish

- Records tab badges now render as `DECISION LOG · 1` instead of `DECISION LOG1`.
- Chronicle filter badges now render as `Political · 1` instead of `Political1`.
- Opening-week presidential decisions now show in Chronicle even before any turn aftermath archive exists.

## Verification

Focused UI/read-model gate:

```powershell
npm.cmd exec -- vitest run tests/ui/chronicle_decision_ledger.test.ts tests/chronicle_entries.test.ts tests/browser_campaign_start_fallback.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts tests/ui/onboarding_automount_edge_cases.test.ts tests/ui/warroom_shell_ownership.test.ts tests/warroom_shell_layer.test.ts tests/ui/event_decision_auto_launch_contract.test.ts tests/ui/game_start_intro.test.ts --pool=forks --reporter=dot
```

Result: 10 files, 123 tests passed.

Broader gates:

```powershell
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run desktop:map:build
```

Results: typecheck passed; `qa:player-journeys` passed 11 files / 106 tests; `desktop:map:build` passed with existing Vite/browser-external and large-chunk warnings.

Live browser verification on `http://127.0.0.1:3002/tactical_map.html?dev=1` confirmed:

- RBiH start -> `WAR HAS STARTED` splash -> `WAR BEGINS` identity brief -> `What Is Bosnia?` foundational decision.
- Clicking `DESK` while the decision modal is open leaves only the decision dialog mounted.
- Resolving the historical response files the decision into Records (`DECISION LOG · 1`) and Chronicle (`Political · 1`).
- Toolbar and Army HQ show `Opening week`; no `Turn 0 (war)` or `Week 0` remains in the checked shell chrome.
- Army HQ checked copy did not contain `EF:`, `BDE/KM`, `RECOMMEND:`, `[!]`, `FORTIFY`, or `DEFEND` shorthand/raw stance text.
- Browser console error count was zero in the checked routes.

## Follow-Up

- Continue broad live-browser sweeps across settlement/sector/formation drilldowns and destructive-command separation.
- Keep Srebrenica/Zepa fall handling on the event-owned receipt path; this branch did not alter that contract.
- Packaging remains paused until live command-map/Warroom/Army HQ first-hour polish is accepted.
