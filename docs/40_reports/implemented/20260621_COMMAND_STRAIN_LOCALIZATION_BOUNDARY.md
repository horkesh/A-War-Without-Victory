# Command Strain Localization Boundary

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Added structured copy tokens beside command-strain derivations so rendered player surfaces can localize command interpretation, stance, recovery, and delegation copy.
- Updated Army HQ operation-interpretation, stance-interpretation, command-relationship recovery, and Operation Briefing delegation displays to render through EN/BCS i18n keys.
- Added a focused BCS regression test proving prior English leak strings no longer reach the localized command-strain boundary.

## Changes Made

### Copy Boundary
- `deriveOrderInterpretation(...)` now returns `cautionNoticeToken`, `categoryLabelKey`, and per-factor `labelToken` metadata while preserving existing fallback strings for compatibility.
- `deriveStanceInterpretation(...)` now returns a `noticeToken`.
- `deriveRecoveryForecastToken(...)` provides a localized recovery forecast token while `deriveRecoveryForecast(...)` remains fallback-compatible.
- `deriveDelegationContext(...)` now returns a localized `labelToken`.
- `CorpsSituationAssessment` can carry optional posture/dominant/relief copy tokens for future render-edge migration; no behavior depends on these optional fields yet.

### Renderers
- `OrderInterpretationSection` renders category badges, caution notices, drag factors, direct-intervention warning, and stance notices via i18n keys.
- `CommandRelationshipSection` renders recovery forecasts from the token when available.
- `OperationBriefingModal` renders delegation-path labels from the token when available.

### Tests
- Added `tests/ui/command_strain_i18n_boundary.test.ts` to prove BCS copy does not fall back to English strings such as `STRAIN-SHAPED`, `Offensive posture is unavailable`, `Strain resolving in`, or `Commander recommends abort`.

## Verification
- `npm.cmd exec -- vitest run tests/ui/command_strain_i18n_boundary.test.ts --pool=forks --reporter=dot` passed 2/2.
- `npm.cmd exec -- vitest run tests/ui/command_strain_i18n_boundary.test.ts tests/ui/command_strain_interpretation.test.ts tests/command_authority_interpretation_review.test.ts tests/command_authority_assessment_constraints.test.ts --pool=forks --reporter=dot` passed 158/158.
- `npm.cmd exec -- vitest run tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 13/13.
- `npm.cmd exec -- tsc --noEmit --pretty false` passed.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
