# Gold Gate Checklist

**Draft date:** 2026-05-17

## Release Candidate Identity

- RC commit SHA:
- RC tag:
- package version:
- artifact path:
- artifact SHA-256:
- release owner:

## Required Gates

| Gate | Command or Evidence | Status |
|---|---|---|
| Typecheck | `npm.cmd run typecheck` | pending |
| Fast tests | `npm.cmd run test:vitest:fast` | pending |
| Scenario tests | `npm.cmd run test:vitest:scenario` | pending |
| Desktop release guard | `npm.cmd run desktop:release:check` | pending |
| Package probe | `npm.cmd run desktop:package:probe` | pending |
| NSIS smoke | `npm.cmd run desktop:package:win:nsis:smoke -- --report-only` | pending |
| Save/load smoke | release evidence report | pending |
| First-run/reset smoke | release evidence report | pending |
| Accessibility P0 | `docs/40_reports/implemented/20260517_ACCESSIBILITY_P0_CLOSEOUT.md` | evidence exists |
| Marketing claim traceability | `docs/50_launch/marketing/claims_inventory.md` | draft exists |
| Known issues | `docs/50_launch/release/known_issues.md` | draft exists |
| Privacy/telemetry policy | `docs/40_reports/audits/20260517_TELEMETRY_CONSENT_POLICY_DECISION.md` | pending approval |
| Clean VM cosmetic validation | clean-VM report | pending external VM evidence |

## Recommended Gate Policy

- **Telemetry/privacy:** approve only default-off, local-first crash diagnostics with explicit opt-in, export/delete/withdrawal, and no upload provider until a second approval.
- **Clean VM:** treat automated packaging proof and clean-VM proof as separate gates. Automated smoke can prove artifact shape; only a fresh Windows VM can prove SmartScreen, Settings -> Apps, Start Menu, save/load persistence, uninstall cleanup, and registry behavior.
- **External playtest:** distribute only the exact artifact that passed clean-VM validation. Record its SHA-256 in the playtest dry-run report. If using Steam for public testing, prefer Steam Playtest over main-app release override because it isolates the test app from the main game's reviews, wishlist, refunds, and playtime.

## Launch-Day Operations

1. Freeze non-blocking feature work.
2. Build and hash artifacts from a clean checkout.
3. Complete release evidence report.
4. Publish binaries, release notes, store page, and announcement in that order.
5. Monitor the first launch window for install failures, launch failures, save corruption, crashes, and sensitive-history issues.

Operator automation template: `docs/50_launch/release/launch_day_automation_template.md`.

Dry-run command:

```powershell
npm.cmd run launch:artifacts:dry-run -- --artifact dist-packaged\<artifact-name> --format markdown
```

## Rollback / Unpublish Criteria

- installer does not launch or install for a supported target
- save/load corruption
- first-objective crash
- sensitive-history misrepresentation
- privacy failure in logs or feedback intake

## Hotfix Flow

Use a hotfix branch from the released tag. Minimum verification is the failing repro, focused fix test, typecheck, desktop release guard, and package smoke.
