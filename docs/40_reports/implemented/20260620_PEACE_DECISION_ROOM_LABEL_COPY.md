# Peace and Decision Room Label Copy

## Summary

Peace-phase status and Decision Room priority cards now render typed ids through explicit localized player labels instead of hardcoded English or title-cased enum ids.

## Changes

- Routed PeaceStatusPanel capital, declaration posture, declared-course, advancing, and end-turn chrome through `peace.*` i18n keys.
- Replaced Decision Room elite-deploy reserve reason `humanize(...)` output with explicit Army Reserve reason labels, including `sector_threat`.
- Replaced Decision Room briefing kind/category and proposal-review domain `humanize(...)` output with explicit player-safe label maps and neutral fallbacks.
- Removed the now-unused generic `humanize(...)` helper from `presidentialDecisionRoom.ts`.

## Verification

- Focused proof passed: `npm.cmd exec -- vitest run tests/ui/peace_status_panel_copy.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (51/51).
- Typecheck passed: `npm.cmd run typecheck`.
- Broader gates passed: `npm.cmd run qa:player-journeys` (234/234); `AWWV_LIVE_SURFACE_BROWSER_PORT=3243 npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). The temporary `.tmp_live_surface_browser_sweep` evidence directory was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
