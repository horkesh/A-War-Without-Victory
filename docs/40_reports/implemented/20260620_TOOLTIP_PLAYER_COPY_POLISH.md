# Tooltip Player-Copy Polish

## Summary

Formation and front tooltips now render localized player copy instead of raw posture ids and compact staff shorthand.

## Changes

- Mapped formation posture ids to localized labels such as `Defending` / `Odbrana`.
- Replaced front formation summaries like `2nd Tuzla Brigade (defend)` with player-facing posture copy.
- Routed tooltip chrome for personnel, current posture, area of responsibility, current order, readiness, sector, pressure, density, threat, and defense preview counts through i18n.
- Removed visible shorthand such as `AoR`, `THIN`, `DENSE`, `Active Def.`, and `reactive`.

## Verification

- Worker focused proof passed: `node node_modules\vitest\vitest.mjs run tests\ui_map_tooltip_player_visibility.test.ts` (5/5).
- Integrated focused proof passed: `npm.cmd exec -- vitest run tests/ui_map_tooltip_player_visibility.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/settlement_timeline_provenance.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (41/41).
- Additional gates passed: `npm.cmd run typecheck`; `git diff --check`; `npm.cmd run qa:player-journeys` (234/234); `AWWV_LIVE_SURFACE_BROWSER_PORT=3241 npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). The temporary `.tmp_live_surface_browser_sweep` evidence directory was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
