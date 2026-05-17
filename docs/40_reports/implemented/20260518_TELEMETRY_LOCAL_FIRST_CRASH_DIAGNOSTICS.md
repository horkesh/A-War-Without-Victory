# Telemetry Local-First Crash Diagnostics

**Date:** 2026-05-18
**Baseline:** `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md` and the accepted local-first recommendation in `docs/40_reports/audits/20260517_TELEMETRY_CONSENT_POLICY_DECISION.md`.
**Result:** Default-off, local-only crash diagnostics substrate implemented with Settings export/delete/withdraw controls and no upload provider.

## Summary
- Added opt-in crash diagnostics only; no gameplay analytics and no network upload.
- Reports are local, bounded, exportable, deletable, and redacted before storage.
- Runtime capture is installed for UI `error` and `unhandledrejection` events, but writes only after explicit local consent.

## Changes Made
### Crash Diagnostics Substrate
- Added a pure redaction helper for stack traces and diagnostic strings, covering local user paths, usernames, and structured save/scenario payload markers.
- Added a storage-backed local queue with consent gating, bounded retention, deterministic sequence numbers, approved report fields, and no wall-clock timestamps.
- Added an upload adapter contract that always returns `{ ok: false, reason: "disabled" }` for this pass.
- Added browser runtime capture wiring in the tactical map entrypoint.

### Settings UI
- Added a real-backed Diagnostics settings tab.
- Added concise consent/privacy copy matching the accepted policy.
- Added local enable/withdraw, export, and clear controls.

### Tests
- Added focused redaction, queue, and Settings UI tests.
- Updated the existing settings shell cleanup test to recognize Diagnostics as a real-backed settings surface.

## Determinism And Privacy Notes
- No report fields are consumed by simulation, RNG, save/load, scenario output, or calibration artifacts.
- Crash reports do not include wall-clock timestamps.
- Reports are not uploaded and no provider is selected.
- Explicit exclusions remain: saves, scenario dumps, player notes/free-form text, and local usernames.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/services/telemetry/telemetryRedaction.ts` | Redacts local paths/usernames and structured payload markers. |
| `src/ui/map/services/telemetry/telemetryQueue.ts` | Local consent-gated crash diagnostics queue. |
| `src/ui/map/services/telemetry/telemetryUploadAdapter.ts` | Disabled upload adapter contract. |
| `src/ui/map/services/telemetry/crashCapture.ts` | Runtime UI error/rejection capture installer. |
| `src/ui/map/main.tsx` | Installs crash capture for the tactical map shell. |
| `src/ui/map/components/SettingsScreen.tsx` | Adds Diagnostics tab and local controls. |
| `src/ui/map/i18n/messages.en.ts` | Adds English diagnostics copy. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS diagnostics copy. |
| `tests/telemetry_redaction.test.ts` | Redaction regression coverage. |
| `tests/telemetry_queue.test.ts` | Default-off, queue-shape, bounds, withdrawal, and disabled-upload coverage. |
| `tests/ui_settings_telemetry_controls.test.ts` | Settings opt-in/export/clear/withdraw coverage. |
| `tests/ui/settings_screen_shell_cleanup.test.ts` | Updates real-backed settings surface expectation. |

## Verification
- Focused telemetry and settings tests were run during implementation.
- Full required verification is recorded in the final session response.

## Next Steps
- Upload remains blocked until a second product approval selects a provider and data contract.
- Broader telemetry/gameplay analytics remain out of scope.
