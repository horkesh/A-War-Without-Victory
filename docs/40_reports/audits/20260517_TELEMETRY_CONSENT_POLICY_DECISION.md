# Telemetry Consent Policy Decision Memo

**Date:** 2026-05-17
**Lane:** telemetry/crash reporting
**Status:** Default-off local-first policy accepted; runtime capture still starts with local-only implementation and no upload adapter.

## Default Policy Recommendation

Telemetry and crash reporting should be **off by default**. Reports should be local, inspectable, exportable, and deletable before any upload provider is selected.

Recommended decision: approve a **local-first, explicit opt-in crash diagnostics** policy only. Do not add general gameplay analytics in the first pass. Runtime capture may write local reports after consent; upload remains a separate future decision.

Approval status: accepted 2026-05-17 for default-off local-first crash diagnostics. Upload adapters still require a second approval.

## Research Basis

- EDPB consent guidance requires a real choice, granular purpose, clear information before consent, affirmative action, and withdrawal as easy as consent. Source: `https://www.edpb.europa.eu/system/files/2026-04/edpb-summary-consent_en.pdf`.
- FTC privacy guidance emphasizes transparency about app data collection and use. Source: `https://www.ftc.gov/business-guidance/privacy-security/tech`.
- AWWV has sensitive historical/political subject matter and player-created notes/saves; minimizing collection and excluding free-form text, saves, scenario dumps, usernames, and local paths is the safest default.

## Proposed Consent Copy

> Share optional crash diagnostics to help improve A War Without Victory. Reports may include app version, platform, UI surface, error category, and redacted stack traces. Reports never include saves, scenario dumps, player notes, or local usernames. You can export or delete local reports at any time.

Selected consent wording: default-off local-first wording approved as implementation baseline; exact UI copy may be edited during `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md`.

## Approved Data Shape To Implement

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

Implement local-only capture and Settings export/delete/withdrawal first; require a second approval before any network upload provider.
