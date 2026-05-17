# Telemetry Crash Reporting Implementation Plan
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Goal

Add an opt-in telemetry and crash reporting design that helps diagnose launch issues while preserving player privacy, deterministic simulation behavior, and offline play.

## Architecture

Telemetry is a UI/platform-side service. It records only explicitly approved event categories and never feeds back into simulation decisions, RNG, scenario outputs, or save compatibility. Crash reports are locally inspectable and upload only after opt-in.

## Tech Stack

- Desktop shell or browser runtime error hooks
- TypeScript event schema
- Local queue with opt-in upload placeholder
- Vitest for redaction and schema validation

## Implementation Tasks

1. Define policy and consent model
   - Decide default state: off unless explicitly enabled.
   - Define settings copy and privacy summary.
   - Define data retention and local deletion behavior.

2. Define event schema
   - Include app version, platform, UI surface, error category, and anonymized session ID.
   - Exclude names, file paths containing usernames, raw saves, scenario dumps, and free-form player text.
   - Add redaction helper for stack traces and paths.

3. Implement crash capture
   - Capture unhandled UI errors and rejected promises.
   - Store local reports in a bounded queue.
   - Provide user-visible export/delete controls.

4. Implement telemetry queue
   - Add typed event emitter for allowed UI/platform events.
   - Batch locally with size limits.
   - Add upload adapter stub until endpoint/provider is selected.

5. Add settings and diagnostics UI
   - Add opt-in toggle, export report button, clear reports button, and status text.
   - Ensure controls work offline.
   - Keep copy concise and non-marketing.

6. Add tests
   - Test opt-in gate.
   - Test redaction.
   - Test queue bounds.
   - Test upload stub failure behavior.

## Files To Touch

- `src/ui/map/services/telemetry/*` or platform service equivalent
- `src/ui/map/components/settings/*`
- `tests/telemetry*.test.ts`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`

## Verification

- Run telemetry unit tests.
- Run affected settings UI tests.
- Run `npm.cmd run typecheck`.
- Manually verify opt-in, export, clear, and offline failure behavior.

## Documentation And Ledger

- Document privacy constraints and default-off behavior.
- Add implemented report when the service lands.
- Add ledger entry noting telemetry cannot affect sim determinism.

## Stop Gates

- Stop if no privacy policy/consent language is approved.
- Stop if a provider requires collecting data outside the approved schema.
- Stop if crash capture risks leaking raw save data or local usernames.
