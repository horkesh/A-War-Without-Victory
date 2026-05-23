# Localized Crash Diagnostics

**Date:** 2026-05-23

**Scope:** UI observability enhancement. No simulation behavior, scenario data, combat math, operation behavior, save schema, calibration/army-arc tuning, painted targets, event content, turn ordering, or generated scenario output changed.

## Summary

`RootErrorBoundary` now records localized React render failures into the existing opt-in crash diagnostics queue. The report keeps the existing local-first consent model and uses the boundary `zone` as `uiSurface`, so a playtest export can distinguish failures in surfaces such as `right panel`, `army hq`, `map`, `toolbar`, `sidebar`, and decision-room panels.

The existing global crash capture path already handled browser/window `error` and `unhandledrejection` events. This slice closes the gap where React boundaries successfully isolated a failing panel but only wrote a console error, leaving no player-exportable crash artifact.

## Implementation

- Added `recordCrashDiagnostic(...)` and `CRASH_DIAGNOSTICS_APP_VERSION` to `src/ui/map/services/telemetry/crashCapture.ts`.
- Reused that helper from `installCrashDiagnosticsCapture(...)` so global and localized crash capture share the same platform/OS/queue behavior.
- Updated `RootErrorBoundary.componentDidCatch(...)` to record an `unhandled_error` with the boundary zone as `uiSurface`.
- Updated the map entrypoint to use the shared app-version constant.
- Added a regression proving opt-in boundary crashes are stored in the local diagnostics queue.

## Verification

- Red test: `npx.cmd vitest run tests\ui\error_boundary_isolation.test.ts --reporter=dot` failed before implementation because the diagnostics queue stayed empty.
- Green focused suite: `npx.cmd vitest run tests\ui\error_boundary_isolation.test.ts tests\telemetry_queue.test.ts tests\ui_settings_telemetry_controls.test.ts --reporter=dot` passed 9/9.

## Remaining Work

Telemetry/observability is no longer accurately described as having no crash reporter: the game has default-off local-first crash diagnostics with export and now localized UI boundary capture. The remaining AAA+++ gap is still post-launch operations: no upload provider, no anonymized opt-in playtest telemetry stream, and no Sentry-equivalent aggregation.
