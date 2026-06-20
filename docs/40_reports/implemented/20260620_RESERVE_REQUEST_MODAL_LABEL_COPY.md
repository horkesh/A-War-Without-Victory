# Reserve Request Modal Label Copy

## Summary

Reserve request modals now render player-safe purpose and reason labels instead of raw request ids.

## Changes

- Mapped `offensive` and `defensive` request purpose values through localized copy.
- Reused Army Reserve reason labels for `offensive_support`, `defensive_gap`, `exploitation`, and `enclave_relief`.
- Added neutral fallback copy for unknown purpose/reason values.
- Extended decision-family modal coverage for purpose-first and reason-fallback reserve requests.

## Verification

- Worker red proof first failed on raw `offensive`, then passed after the fix.
- Worker focused proof passed: `node node_modules\vitest\vitest.mjs run tests/ui/decision_family_modals.test.ts` (5/5).
- Integrated focused proof passed: `npm.cmd exec -- vitest run tests/ui/event_modal_effect_filter.test.ts tests/ui/event_modal_effect_labels.test.ts tests/ui/order_queue_player_copy.test.ts tests/ui/decision_family_modals.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (22/22).
- Additional gates passed: `npm.cmd run typecheck`; `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
