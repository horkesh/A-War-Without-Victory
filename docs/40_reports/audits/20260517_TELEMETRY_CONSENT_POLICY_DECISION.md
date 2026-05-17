# Telemetry Consent Policy Decision Memo

**Date:** 2026-05-17
**Lane:** telemetry/crash reporting
**Status:** Privacy-gated; no telemetry capture code enabled.

## Default Policy Recommendation

Telemetry and crash reporting should be **off by default**. Reports should be local, inspectable, exportable, and deletable before any upload provider is selected.

## Proposed Consent Copy

> Share optional crash diagnostics to help improve A War Without Victory. Reports may include app version, platform, UI surface, error category, and redacted stack traces. Reports never include saves, scenario dumps, player notes, or local usernames. You can export or delete local reports at any time.

Selected consent wording: pending user approval

## Approved Data Shape To Implement After Approval

- app version
- platform and OS family
- UI surface
- error category
- redacted stack trace
- anonymized local session id

## Explicit Exclusions

- raw saves
- scenario dumps
- local file paths containing usernames
- free-form player text
- political or historical content notes written by the player
- any field consumed by simulation, RNG, save/load, or scenario diagnostics

## Stop Gate

Do not implement runtime crash capture, upload adapters, or Settings controls until the consent wording and default-off policy are approved.
