# Gated Item Research Recommendations

**Date:** 2026-05-17
**Scope:** HRHB patron directive scope, Chronicle chapter boundary, telemetry/crash reporting, clean-VM validation, and external playtest dry run.
**Status:** Research/proposal only. No runtime behavior changed.

## Summary Recommendations

| Item | Best solution | Recommendation |
|---|---|---|
| HRHB patron directive scope | Hybrid faction default plus named HVO/OZ exceptions | Approve hybrid. It best balances Zagreb-level patron pressure with historically variable regional HVO behavior. |
| Chronicle chapter boundary | Hybrid phase-first chapters with month sublabels | Approve deterministic player-faction campaign-phase chapters; defer bookmarks. |
| Telemetry/crash reporting | Local-first explicit opt-in crash diagnostics | Approve default-off local crash reports with export/delete/withdrawal; defer upload provider. |
| Clean-VM cosmetic validation | Two-layer release proof | Automate build/package gates, then require manual clean Windows VM evidence for install, SmartScreen, save/load, uninstall, AppData, and registry behavior. |
| External playtest dry run | Separate playtest artifact and tester packet proof | Use the hashed clean-VM-passed artifact, complete the dry-run template, and prefer Steam Playtest for public pre-release testing when available. |

## HRHB Patron Directive Scope

Recommended solution: **hybrid**.

The default should be faction-wide HRHB/Zagreb patron pressure. Named HVO/OZ exceptions should handle Posavina, Central Bosnia, Herzegovina, or other cases only where evidence or calibration requires local behavior.

Why this is best:

- Zagreb-level involvement is real enough to justify a faction default. Source: BB1 p.180.
- Regional HVO behavior varies enough that a flat faction-wide rule would be too blunt. Sources: BB1 p.180, BB1 p.182, BB1 p.219, BB1 p.225.
- Full per-corps patron state expands tests, save/read-model questions, and calibration burden without enough evidence.

Next implementation: red test `tests/hrhb_patron_directive_scope.test.ts`, then deterministic helper for default behavior, named exceptions, non-HRHB no-op behavior, and drift attribution.

## Chronicle Chapter Boundary

Recommended solution: **hybrid phase-first**.

Use player-faction campaign/doctrine windows as primary chapter boundaries, month labels inside long chapters, and no user-authored bookmarks in v1.

Why this is best:

- Pure monthly grouping fragments the war into too many calendar slices.
- Pure "phase" is ambiguous because the repo's high-level lifecycle is war-only; usable boundaries should derive from faction timelines, standing orders, doctrine phases, or existing campaign-plan windows.
- User bookmarks are valuable but require persistence, migration, editing/deletion UX, and save compatibility.

Next implementation: `src/ui/map/data/chronicleChapters.ts` with tests for grouping, stable ordering, month sublabels, source id preservation, player-faction scoping, and sensitive-history guardrails.

## Telemetry And Crash Reporting

Recommended solution: **local-first, explicit opt-in crash diagnostics only**.

Do not implement general analytics in the first pass. Do not upload anything in the first pass. After consent, write local crash reports that the user can inspect, export, delete, and disable.

Why this is best:

- EDPB consent guidance requires real choice/control, granular purpose, clear pre-consent information, affirmative action, and withdrawal as easy as consent.
- FTC guidance emphasizes transparency about app data collection and use.
- AWWV's saves, free-form notes, and historical/political subject matter make broad telemetry an unnecessary trust risk.

External references:

- EDPB consent summary: `https://www.edpb.europa.eu/system/files/2026-04/edpb-summary-consent_en.pdf`
- FTC privacy/security guidance hub: `https://www.ftc.gov/business-guidance/privacy-security/tech`

Next implementation after approval: local report schema, redaction, Settings opt-in/withdraw/export/delete, and tests proving no saves, scenario dumps, local usernames, free-form player text, or deterministic sim fields are captured.

## Clean-VM Validation

Recommended solution: **two-layer release proof**.

Automated gates prove the repo can build and package. Manual clean-VM evidence proves a real Windows user can install, launch, save/load, uninstall, and survive SmartScreen/Defender UX.

Automate:

- `npm.cmd run typecheck`
- `npm.cmd run test:vitest:fast`
- `npm.cmd run test:vitest:scenario`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run desktop:package:win:nsis`
- `npm.cmd run desktop:package:win:nsis:smoke -- --report-only`
- `Get-FileHash "dist-packaged\\*.exe" -Algorithm SHA256`

Keep manual:

- fresh Windows 10/11 VM snapshot identity
- SmartScreen wording and whether "More info -> Run anyway" is available
- Settings -> Apps entry
- Start Menu/shortcut launch
- new campaign, one-turn advance, save, relaunch, load, advance
- `%APPDATA%` persistence
- uninstall cleanup and registry cleanup

External reference:

- Microsoft SmartScreen reputation: `https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation`

Important conclusion: buying EV signing solely to eliminate SmartScreen prompts is not a reliable best solution. Microsoft's current guidance says EV no longer bypasses SmartScreen reputation for new files; Microsoft Store distribution avoids SmartScreen prompts, while non-Store distribution should expect reputation buildup.

## External Playtest Dry Run

Recommended solution: **separate playtest from launch build and keep the tester packet evidence-driven**.

Use the exact clean-VM-passed artifact and hash. Complete `docs/40_reports/playtest/20260517_EXTERNAL_PLAYTEST_DRY_RUN_TEMPLATE.md` before external distribution.

For Steam-based public pre-release testing, prefer Steam Playtest where available because it uses a separate child appID, can gate access, and does not affect the main game's reviews, wishlist, refunds, or playtime.

External references:

- Steam Playtest: `https://partner.steamgames.com/doc/features/playtest`
- Steam review process: `https://partner.steamgames.com/doc/store/review_process`
- Steam release process: `https://partner.steamgames.com/doc/store/releasing`

Next implementation/evidence: artifact SHA, tester packet path, install/first-launch/first-objective/save-load/feedback/crash-log dry-run results, blockers by severity, and explicit external-distribution verdict.
