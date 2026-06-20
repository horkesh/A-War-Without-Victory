# Opportunity Dossier Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Army HQ opportunity dossiers now render proposal status, staff recommendation, axis state, and force-quality bands through explicit localized labels.
- Raw values such as `approve`, `eligible_pending_review`, and `not_applicable` no longer surface as visible player copy.
- BCS opportunity dossier chrome now uses localized recommendation, axis, and trait labels instead of mixed English/raw enum text.

## Changes Made
### Opportunity Dossier UI
- Added explicit message-key maps for proposal status, recommendation values, prerequisite-axis states, and force-quality trait bands.
- Replaced generic underscore humanization with localized labels.
- Kept unknown/future values behind neutral review fallback copy.

### Tests
- Extended `tests/ui/army_hq_timing_copy.test.ts` with EN and BCS dossier copy regressions.
- Pinned `approve`, `eligible_pending_review`, and `not_applicable` absence in visible opportunity dossier copy.

## Verification
- Red proof: focused test first failed on `Recommend approve`, BCS `Preporuka approve`, `Not Applicable`, and `Adequate` mixed-copy leaks.
- Focused green: `npm.cmd exec -- vitest run tests/ui/army_hq_timing_copy.test.ts --pool=forks --reporter=dot` passed 6/6.
- Typecheck: `npm.cmd run typecheck` passed.
- Diff hygiene: `git diff --check` passed.

## Scope / Determinism
- UI/read-model copy, i18n, focused tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue the Pyrrhic UI scout queue with Records-to-Chronicle focused routing, Operation History weekly-row shorthand, and ops modal brigade-card i18n.
