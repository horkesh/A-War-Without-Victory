# Order Queue Label Copy

## Summary

The staged Order Queue now renders localized command labels instead of raw order ids and hard-coded English chrome.

## Changes

- Added localized labels for staged order types, posture targets, generic target fallbacks, the queue title, and the remove action.
- Resolved sector and settlement targets through player-facing labels, with neutral fallbacks for unsafe raw ids.
- Added focused UI proof that normal queue copy shows `Attack order`, `Posture order`, `Sector assignment`, and readable targets while hiding raw `attack`, `posture`, `sector`, and `sector:...` ids.

## Verification

- Worker focused proof passed: `node node_modules\vitest\vitest.mjs run tests/ui/order_queue_player_copy.test.ts --pool=forks --reporter=dot` (1/1).
- Integrated focused proof passed: `npm.cmd exec -- vitest run tests/ui/event_modal_effect_filter.test.ts tests/ui/event_modal_effect_labels.test.ts tests/ui/order_queue_player_copy.test.ts tests/ui/decision_family_modals.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (22/22).
- Additional gates passed: `npm.cmd run typecheck`; `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
