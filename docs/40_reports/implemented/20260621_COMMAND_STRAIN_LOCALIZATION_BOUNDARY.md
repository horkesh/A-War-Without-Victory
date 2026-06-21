# Command Strain Localization Boundary

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Added structured copy tokens beside command-strain derivations so rendered player surfaces can localize command interpretation, stance, recovery, and delegation copy.
- Extended the same token boundary to Corps Situation threat context, dominant constraint reason, relief path, and Operation Briefing constraint context copy.
- Updated Army HQ order interpretation, stance interpretation, command-relationship recovery, Corps Situation, and Operation Briefing displays to render through EN/BCS i18n keys.
- Added focused BCS regression tests proving prior English leak strings no longer reach localized command-strain and order-interpretation surfaces.

## Changes Made

### Copy Boundary
- `deriveOrderInterpretation(...)` now returns `cautionNoticeToken`, `categoryLabelKey`, and per-factor `labelToken` metadata while preserving existing fallback strings for compatibility.
- `deriveStanceInterpretation(...)` now returns a `noticeToken`.
- `deriveRecoveryForecastToken(...)` provides a localized recovery forecast token while `deriveRecoveryForecast(...)` remains fallback-compatible.
- `deriveDelegationContext(...)` now returns a localized `labelToken`.
- `deriveCorpsSituationAssessment(...)` now returns localized token metadata for threat context, posture summary, dominant reason, and relief path while preserving existing fallback strings.

### Renderers
- `OrderInterpretationSection` renders category badges, caution notices, drag factors, direct-intervention warning, and stance notices via i18n keys.
- `OrderInterpretationPanel` renders its header, event badges, accept/override chrome, and refused-order relief morale line via i18n keys while preserving authored `event.reason` prose.
- `CommandRelationshipSection` renders recovery forecasts from the token when available.
- `CorpsSituationSection` renders threat context, dominant reason, and relief path from tokens when available.
- `OperationBriefingModal` renders delegation-path labels and constraint-context badges/reasons/relief copy from tokens when available.

### Tests
- Extended `tests/ui/command_strain_i18n_boundary.test.ts` to prove BCS copy does not fall back to English strings such as `STRAIN-SHAPED`, `Offensive posture is unavailable`, `Strain resolving in`, `Enemy offensive`, `Hold defensive positions`, or `Commander recommends abort`.
- Added `tests/ui/order_interpretation_panel_i18n.test.ts` to pin BCS order-interpretation panel chrome while leaving authored reason prose unchanged.

## Verification
- `node node_modules\vitest\vitest.mjs run tests/ui/order_interpretation_panel_i18n.test.ts tests/ui/gui_audit_dead_controls.test.ts tests/ui/command_strain_i18n_boundary.test.ts tests/ui/command_strain_interpretation.test.ts tests/command_authority_interpretation_review.test.ts tests/command_authority_assessment_constraints.test.ts --pool=forks --reporter=dot` passed 169/169.
- `npm.cmd run typecheck` passed.

## Scope
UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
