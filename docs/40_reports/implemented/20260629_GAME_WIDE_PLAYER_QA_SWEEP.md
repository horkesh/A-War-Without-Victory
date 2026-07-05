# Game-Wide Player QA Sweep

Date: 2026-06-29

## Summary

This pass followed the first-hour owner reports and widened the coverage target from the opening sequence to player-facing surfaces, production DOM, browser gates, and packaged Electron runtime proof. The sweep focused on the failure classes that had escaped earlier checks: future-knowledge leakage, inert or unexplained controls, raw authoring identifiers reaching player surfaces, and packaged runtime-only gaps.

## Changes

- Sanitized pending event-decision titles at the adapter and modal boundary so raw event ids or raw technical tokens fall back to neutral player copy.
- Removed production-only raw receipt/event ids from Turn Aftermath and Verdict DOM attributes while retaining probe-observable non-secret markers.
- Added an explicit visible/accessible reason when a counter-offer modal has gone stale and its submit action is disabled.
- Hardened the packaged Electron runtime probe to require `/data/derived/settlements_wgs84_1990.geojson` route proof and then ignore only teardown-time abort noise for that verified local data route.
- Updated regression tests around decision history, adapter projection, event-decision modals, stale modal actions, aftermath/verdict DOM output, and packaged runtime route inventory.

## Verification

Passed:

- `npm.cmd exec -- vitest run tests/ui/decision_history_overlay.test.ts tests/ui/decision_history_overlay_dev_gate.test.ts --pool=forks --reporter=dot`
- `npm.cmd run qa:player-journeys`
- `npm.cmd exec -- vitest run tests/ui_adapter_boundary.test.ts tests/ui/event_decision_modal_phase3.test.ts tests/ui/decision_family_modals.test.ts tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/turn_aftermath_modal_i18n.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`
- `npm.cmd run desktop:release:check`
- `npm.cmd run test:vitest:scenario:anchors`
- `npm.cmd exec -- vitest run tests/desktop_packaged_runtime_probe.test.ts --pool=forks --reporter=dot`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run ci:structural-fingerprint:check`

Not completed:

- `npm.cmd run test:vitest:scenario` exceeded a 15-minute local timeout.
- `npm.cmd run test:vitest -- --reporter=dot` and `npm.cmd test -- --reporter=dot` exceeded 10-minute local timeouts; the forced timeout produced Vitest `EPIPE` shutdown noise, not a clean product assertion.

Known non-fatal build warnings remain the existing Vite externalized Node-module, loaders.gl spawn, import.meta/CJS, and chunk-size warnings.

## Scope

UI/read-model projection, player-facing DOM output, modal affordance feedback, packaged runtime probe coverage, tests, and docs only.

No simulation resolver behavior, event evaluator mechanics, event JSON, scenario source data, startup artifact construction, save schema, baseline/golden manifest, structural fingerprint artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
