# Event Acknowledgement Effect Label Copy

## Summary

Non-decision event acknowledgement modals now format effect descriptions through player-facing copy before queueing `EventModal` data.

## Changes

- Added `formatAcknowledgementEventEffect(...)` for acknowledgement event-definition enrichment.
- Rendered known effect kinds such as `aggression_modifier` as readable operational copy.
- Collapsed unknown effect kinds to neutral campaign-effect copy instead of exposing raw ids.
- Added focused proof that `aggression_modifier` does not appear in queued player copy.

## Verification

- Red focused proof first failed because `App.tsx` interpolated `eff.kind` into the visible description.
- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/event_modal_effect_filter.test.ts tests/ui/event_modal_effect_labels.test.ts tests/ui/order_queue_player_copy.test.ts tests/ui/decision_family_modals.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (22/22).
- Additional gates passed: `npm.cmd run typecheck`; `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
