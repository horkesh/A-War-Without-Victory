# 2026-06-24 - Directive Card Browser Read-Only State

## Summary

DirectiveCard no longer disappears when the desktop command bridge is unavailable. Browser/dev review now keeps the directive context visible with the same lever label, target caption, command-authority cost, and a read-only bridge-unavailable notice. The command buttons remain absent, so browser mode cannot stage desktop-only orders.

## Verification

- Red/green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\directive_card_stop_op_action.test.ts --pool=forks --reporter=dot` failed before the production change because the component rendered no accessible status, then passed 1 file / 26 tests after the fix.
- Expanded Decision Room proof: `node node_modules\vitest\vitest.mjs run tests\ui\directive_card_stop_op_action.test.ts tests\ui\presidential_decision_room_request_force.test.ts tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` passed 3 files / 79 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed and verified dev-server cleanup.
- `.tmp_live_surface_browser_sweep` was removed after capturing the live-surface evidence.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario source data, event evaluator mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint artifact, baseline manifest, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
