# Telemetry Crash Reporting Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Add an opt-in telemetry and crash reporting design that helps diagnose launch issues while preserving player privacy, deterministic simulation behavior, and offline play.

## Architecture

Telemetry is a UI/platform-side service. It records only explicitly approved event categories and never feeds back into simulation decisions, RNG, scenario outputs, or save compatibility. Crash reports are locally inspectable and upload only after opt-in.

Research recommendation 2026-05-17: implement **local-first, explicit opt-in crash diagnostics only**. Do not add general gameplay analytics in the first pass. Do not add upload in the first pass. After consent approval, write local reports with export/delete/withdrawal controls; require a second approval before selecting or wiring any upload provider. See `docs/40_reports/audits/20260517_TELEMETRY_CONSENT_POLICY_DECISION.md` and `docs/40_reports/audits/20260517_GATED_ITEM_RECOMMENDATIONS.md`.

## Tech Stack

- Desktop shell or browser runtime error hooks
- TypeScript event schema
- Local queue with opt-in upload placeholder
- Vitest for redaction and schema validation

## Implementation Tasks

1. Define policy and consent model
   - Decide default state: off unless explicitly enabled.
   - Use local-first crash diagnostics only unless the owner approves broader telemetry.
   - Define settings copy and privacy summary.
   - Define data retention and local deletion behavior.
   - Stop here until the product owner approves the consent and privacy wording.

2. Define event schema
   - Include app version, platform, UI surface, error category, and anonymized session ID.
   - Exclude names, file paths containing usernames, raw saves, scenario dumps, and free-form player text.
   - Add redaction helper for stack traces and paths.

3. Implement crash capture
   - Capture unhandled UI errors and rejected promises.
   - Store local reports in a bounded queue.
   - Provide user-visible export/delete controls.

4. Implement local diagnostics queue
   - Add typed event emitter for allowed UI/platform events.
   - Batch locally with size limits.
   - Keep upload disabled/not configured; do not select a provider in this pass.

5. Add settings and diagnostics UI
   - Add opt-in toggle, export report button, clear reports button, and status text.
   - Ensure controls work offline.
   - Keep copy concise and non-marketing.

6. Add tests
   - Test opt-in gate.
   - Test redaction.
   - Test queue bounds.
   - Test upload stub failure behavior.

## Discovery Commands

- Run `rg -n "Settings|settings|diagnostics|localStorage|preload" src/ui/map src/desktop tests`.
- Run `rg -n "crash|telemetry|diagnostic|consent" src docs tests`.
- Record the settings component and persistence owner before writing implementation code.

## Files To Touch

- `src/ui/map/services/telemetry/telemetryQueue.ts`
- `src/ui/map/services/telemetry/telemetryRedaction.ts`
- `src/ui/map/services/telemetry/telemetryUploadAdapter.ts`
- `src/ui/map/components/SettingsScreen.tsx` or the settings component found by discovery
- `tests/telemetry_redaction.test.ts`
- `tests/telemetry_queue.test.ts`
- `tests/ui_settings_telemetry_controls.test.ts`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Run `npx.cmd vitest run tests\telemetry_redaction.test.ts tests\telemetry_queue.test.ts tests\ui_settings_telemetry_controls.test.ts`.
- Run affected settings UI tests.
- Run `npm.cmd run typecheck`.
- Browser-check settings controls in the tactical map shell if UI controls change.
- Manually verify opt-in, export, clear, and offline failure behavior.
- Run `git diff --check` on touched files.

## Upload Adapter Contract

- Default adapter is offline/no-network and returns typed `{ ok: false, reason: "disabled" | "offline" | "not_configured" }`.
- Provider-backed upload is a later implementation detail behind the same typed adapter.
- Gameplay and save/load must never depend on successful upload.

## Documentation And Ledger

- Document privacy constraints and default-off behavior.
- Add implemented report when the service lands.
- Add ledger entry noting telemetry cannot affect sim determinism.

## Stop Gates

- Stop if no privacy policy/consent language is approved.
- Stop if a provider requires collecting data outside the approved schema.
- Stop if crash capture risks leaking raw save data or local usernames.

## Commit And Closeout

- Commit if this session is authorized to commit; otherwise report the staged file list and suggested commit message.
- Suggested commit: `feat(telemetry): add opt-in crash diagnostics substrate`.
- Stage only telemetry source/tests/docs named by this plan.
