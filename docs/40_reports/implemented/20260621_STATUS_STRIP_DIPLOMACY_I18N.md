# Status Strip Diplomacy I18n Boundary

**Date:** 2026-06-21

## Summary

Closed the bottom status strip diplomacy residual from the Pyrrhic localization scout. Alliance posture, Zagreb/Belgrade patron labels, patron confidence status, and international-pressure status now render through EN/BCS i18n keys instead of raw English status ids.

## Changed

- `BottomStatusStrip` now maps alliance statuses through `statusStrip.allianceStatus.*` keys.
- Patron labels and patron-confidence statuses now render through `statusStrip.patron.*` and `statusStrip.patronStatus.*` keys.
- RBiH international-pressure statuses now render through `statusStrip.internationalStatus.*` keys.
- EN/BCS dictionaries cover all new status-strip diplomacy keys.
- `tests/ui/bottom_status_strip_labels.test.ts` pins BCS HRHB and RBiH status-strip render paths and rejects stale English `STRAINED`, `WAVERING`, `ALLIED`, and `HIGH` leaks.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/bottom_status_strip_labels.test.ts --pool=forks --reporter=dot` failed 2/7 before implementation on the new BCS status-strip assertions.
- Green focused proof: `npm.cmd exec -- vitest run tests/ui/bottom_status_strip_labels.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 20/20.
- TypeScript: `npm.cmd run typecheck` passed.
- Player journey pack: `npm.cmd run qa:player-journeys` passed 239/239.
- Live browser sweep: `npm.cmd run qa:live-surface:browser` passed, confirming first-hour major surface reachability and dev-server cleanup. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.

## Scope

UI/i18n/test/docs polish only. No status thresholds, colors, player-faction visibility rules, simulation logic, scenario data, route commands, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
